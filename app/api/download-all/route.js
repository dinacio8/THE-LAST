import { Pool } from "pg";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import JSZip from "jszip";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// --- Génération rapide facture ---
async function generateInvoicePDF({ first_name, last_name, email, type, price, id }) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const { height } = page.getSize();

  page.drawText("FACTURE", { x: 250, y: height - 70, size: 22, font, color: rgb(0.13, 0.6, 0.27) });
  page.drawText(`Facture n° ${id}`, { x: 50, y: height - 110, size: 12, font });
  page.drawText(`${first_name} ${last_name}`, { x: 50, y: height - 130, size: 12, font });
  page.drawText(email, { x: 50, y: height - 145, size: 12, font });
  page.drawText(`Type : ${type}`, { x: 50, y: height - 190, size: 12, font });
  page.drawText(`Total : ${price} CHF`, { x: 50, y: height - 205, size: 12, font });
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

// --- Génération rapide billet ---
async function generateTicketPDF({ first_name, last_name, type, id }) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([420, 297]);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();

  page.drawText("THE LAST @ GVA Paintball", { x: 40, y: height - 40, size: 14, font });
  page.drawText(`Nom : ${first_name} ${last_name}`, { x: 40, y: height - 70, size: 12, font });
  page.drawText(`Type : ${type}`, { x: 40, y: height - 90, size: 12, font });
  page.drawText("Samedi 18 octobre 2025 — Dès 19h", { x: 40, y: height - 110, size: 10, font });

  const qrData = await QRCode.toDataURL(`https://evenement.gvapaintball.com/success?session_id=${id}`);
  const qrImage = await pdfDoc.embedPng(qrData);
  page.drawImage(qrImage, { x: width - 120, y: 40, width: 80, height: 80 });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

// --- Route principale ---
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // ticket | invoice

    if (!type)
      return new Response(JSON.stringify({ error: "Paramètre 'type' manquant" }), { status: 400 });

    const client = await pool.connect();
    const result = await client.query("SELECT * FROM orders ORDER BY id ASC");
    client.release();

    if (result.rowCount === 0)
      return new Response(JSON.stringify({ error: "Aucune commande trouvée" }), { status: 404 });

    const orders = result.rows;
    const zip = new JSZip();

    for (const order of orders) {
      const pdf =
        type === "ticket"
          ? await generateTicketPDF(order)
          : await generateInvoicePDF(order);

      const filename =
        type === "ticket"
          ? `billet_${order.id}_${order.first_name}.pdf`
          : `facture_${order.id}_${order.first_name}.pdf`;

      zip.file(filename, pdf);
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    return new Response(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename=all_${type}s.zip`,
      },
    });
  } catch (err) {
    console.error("Erreur téléchargement global:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
