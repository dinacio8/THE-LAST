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

/* -------------------------------------------------------
 🧾 FACTURE A4 PDF — modèle pro
------------------------------------------------------- */
async function generateInvoicePDF({ first_name, last_name, email, type, price, id }) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 portrait
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const { width, height } = page.getSize();

  // Logo
  const logoUrl = "https://evenement.gvapaintball.com/terrain_GE_gvapaintball_01.png";
  const logoBytes = await fetch(logoUrl).then((r) => r.arrayBuffer());
  const logoImage = await pdfDoc.embedPng(logoBytes);
  const logoDims = logoImage.scale(0.25);
  page.drawImage(logoImage, { x: 50, y: height - 110, width: logoDims.width, height: logoDims.height });

  // Titre principal
  page.drawText("FACTURE", { x: 420, y: height - 70, size: 22, font, color: rgb(0.13, 0.6, 0.27) });

  // Informations entreprise
  page.drawText("No paint no game SARL", { x: 50, y: height - 140, size: 14, font });
  page.drawText("admin@gvapaintball.com", { x: 50, y: height - 155, size: 12, font });

  // Informations client
  page.drawText("Facturé à :", { x: 50, y: height - 230, size: 12, font, color: rgb(0, 0, 0.5) });
  page.drawText(`${first_name} ${last_name}`, { x: 50, y: height - 245, size: 12, font });
  page.drawText(email || "", { x: 50, y: height - 260, size: 12, font });

  // Ligne de séparation
  page.drawLine({ start: { x: 50, y: height - 280 }, end: { x: 545, y: height - 280 }, thickness: 1, color: rgb(0.13, 0.6, 0.27) });

  // Détails commande
  page.drawText("DÉTAILS DE LA COMMANDE", { x: 50, y: height - 310, size: 14, font, color: rgb(0.13, 0.6, 0.27) });
  page.drawText(`Facture n°: ${id}`, { x: 50, y: height - 330, size: 12, font });
  page.drawText(`Type de billet : ${type}`, { x: 50, y: height - 345, size: 12, font });
  page.drawText("Quantité : 1", { x: 50, y: height - 360, size: 12, font });
  page.drawText(`Prix unitaire : ${price} CHF`, { x: 50, y: height - 375, size: 12, font });

  // Total
  page.drawText("TOTAL TTC :", { x: 400, y: height - 420, size: 14, font });
  page.drawText(`${price} CHF`, { x: 490, y: height - 420, size: 14, font, color: rgb(0.13, 0.6, 0.27) });

  // Pied de page
  page.drawText("Merci pour votre commande et à bientôt chez GVA Paintball !", { x: 50, y: 40, size: 10, font });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

/* -------------------------------------------------------
 🎫 BILLET A6 HORIZONTAL — modèle pro
------------------------------------------------------- */
async function generateTicketPDF({ first_name, last_name, type, id }) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([420, 297]); // A6 horizontal
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();

  // --- Fond dégradé (vert → jaune clair) ---
  const gradientSteps = 20;
  for (let i = 0; i < gradientSteps; i++) {
    const t = i / gradientSteps;
    const r = 0.13 + (1.0 - 0.13) * t;
    const g = 0.6 + (0.98 - 0.6) * t;
    const b = 0.27 * (1 - t);
    page.drawRectangle({
      x: 0,
      y: (height / gradientSteps) * i,
      width,
      height: height / gradientSteps,
      color: rgb(r, g, b),
    });
  }

  // --- Cadre blanc ---
  page.drawRectangle({
    x: 10,
    y: 10,
    width: width - 20,
    height: height - 20,
    borderWidth: 2,
    color: rgb(1, 1, 1),
  });

  // --- Logo centré ---
  const logoUrl = "https://evenement.gvapaintball.com/terrain_GE_gvapaintball_01.png";
  const logoBytes = await fetch(logoUrl).then((r) => r.arrayBuffer());
  const logo = await pdfDoc.embedPng(logoBytes);
  const logoScale = 0.25;
  const logoDims = logo.scale(logoScale);
  const logoX = (width - logoDims.width) / 2;
  const logoY = height - logoDims.height - 25;
  page.drawImage(logo, { x: logoX, y: logoY, width: logoDims.width, height: logoDims.height });

  const textColor = rgb(0, 0, 0);

  // --- Texte principal ---
  const titleY = logoY - 25;
  page.drawText("THE LAST", {
    x: (width - font.widthOfTextAtSize("THE LAST", 18)) / 2,
    y: titleY,
    size: 18,
    font,
    color: textColor,
  });

  // --- Infos ---
  page.drawText(`Nom : ${first_name} ${last_name}`, { x: 30, y: 120, size: 12, font, color: textColor });
  page.drawText(`Type : ${type}`, { x: 30, y: 100, size: 12, font, color: textColor });
  page.drawText("Samedi 18 octobre 2025 — Dès 19h", { x: 30, y: 80, size: 12, font, color: textColor });
  page.drawText("Entrée valable pour 1 personne", { x: 30, y: 60, size: 12, font, color: textColor });

  // --- QR Code ---
  const qrData = await QRCode.toDataURL(`https://evenement.gvapaintball.com/success?session_id=${id}`);
  const qrImage = await pdfDoc.embedPng(qrData);
  const qrSize = 80;
  page.drawImage(qrImage, { x: width - 120, y: 40, width: qrSize, height: qrSize });

  // --- Numéro billet ---
  page.drawText(`Billet n°: ${id}`, { x: 30, y: 30, size: 10, font, color: textColor });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

/* -------------------------------------------------------
 📦 ROUTE ZIP
------------------------------------------------------- */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // ticket | invoice

    if (!type) {
      return new Response(JSON.stringify({ error: "Paramètre 'type' manquant" }), { status: 400 });
    }

    const client = await pool.connect();
    const result = await client.query("SELECT * FROM orders ORDER BY id ASC");
    client.release();

    if (result.rowCount === 0) {
      return new Response(JSON.stringify({ error: "Aucune commande trouvée" }), { status: 404 });
    }

    const orders = result.rows;
    const zip = new JSZip();

    for (const order of orders) {
      const pdfBuffer =
        type === "ticket"
          ? await generateTicketPDF(order)
          : await generateInvoicePDF(order);

      const filename =
        type === "ticket"
          ? `billet_${order.id}_${order.first_name}_${order.last_name}.pdf`
          : `facture_${order.id}_${order.first_name}_${order.last_name}.pdf`;

      zip.file(filename, pdfBuffer);
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    return new Response(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename=${type}s_gvapaintball.zip`,
      },
    });
  } catch (error) {
    console.error("Erreur téléchargement global:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
