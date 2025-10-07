import { Pool } from "pg";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* -------------------------------------------------------
 🧾 FACTURE A4 PDF
------------------------------------------------------- */
async function generateInvoicePDF({ first_name, last_name, email, type, price, id }) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const { height } = page.getSize();

  // Logo
  const logoUrl = "https://evenement.gvapaintball.com/terrain_GE_gvapaintball_01.png";
  const logoBytes = await fetch(logoUrl).then(r => r.arrayBuffer());
  const logo = await pdfDoc.embedPng(logoBytes);
  const logoDims = logo.scale(0.25);
  page.drawImage(logo, { x: 50, y: height - 110, width: logoDims.width, height: logoDims.height });

  // Titre
  page.drawText("FACTURE", { x: 420, y: height - 70, size: 22, font, color: rgb(0.13, 0.6, 0.27) });

  // Infos société
  page.drawText("No paint no game SARL", { x: 50, y: height - 140, size: 14, font });
  page.drawText("admin@gvapaintball.com", { x: 50, y: height - 155, size: 12, font });

  // Infos client
  page.drawText("Facturé à :", { x: 50, y: height - 230, size: 12, font, color: rgb(0, 0, 0.5) });
  page.drawText(`${first_name} ${last_name}`, { x: 50, y: height - 245, size: 12, font });
  page.drawText(email, { x: 50, y: height - 260, size: 12, font });

  // Ligne séparation
  page.drawLine({ start: { x: 50, y: height - 280 }, end: { x: 545, y: height - 280 }, thickness: 1, color: rgb(0.13, 0.6, 0.27) });

  // Détails facture
  page.drawText("DÉTAILS DE LA COMMANDE", { x: 50, y: height - 310, size: 14, font, color: rgb(0.13, 0.6, 0.27) });
  page.drawText(`Facture n°: ${id}`, { x: 50, y: height - 330, size: 12, font });
  page.drawText(`Type de billet : ${type}`, { x: 50, y: height - 345, size: 12, font });
  page.drawText(`Quantité : 1`, { x: 50, y: height - 360, size: 12, font });
  page.drawText(`Prix unitaire : ${price} CHF`, { x: 50, y: height - 375, size: 12, font });

  // Total
  page.drawText("TOTAL TTC :", { x: 400, y: height - 420, size: 14, font });
  page.drawText(`${price} CHF`, { x: 490, y: height - 420, size: 14, font, color: rgb(0.13, 0.6, 0.27) });

  // Pied de page
  page.drawText("Merci pour votre commande et à bientôt chez GVA Paintball !", {
    x: 50,
    y: 40,
    size: 10,
    font,
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

/* -------------------------------------------------------
 🎫 BILLET A6 HORIZONTAL - STYLE PROPRE
------------------------------------------------------- */
async function generateTicketPDF({ first_name, last_name, type, id }) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([420, 297]);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();

  // --- Dégradé vert -> jaune clair ---
  const steps = 20;
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const r = 0.13 + (1.0 - 0.13) * t;
    const g = 0.6 + (0.98 - 0.6) * t;
    const b = 0.27 * (1 - t);
    page.drawRectangle({
      x: 0,
      y: (height / steps) * i,
      width,
      height: height / steps,
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

  // --- Logo ---
  const logoUrl = "https://evenement.gvapaintball.com/terrain_GE_gvapaintball_01.png";
  const logoBytes = await fetch(logoUrl).then(r => r.arrayBuffer());
  const logo = await pdfDoc.embedPng(logoBytes);
  const logoScale = 0.25;
  const logoDims = logo.scale(logoScale);
  const logoX = (width - logoDims.width) / 2;
  const logoY = height - logoDims.height - 25;
  page.drawImage(logo, { x: logoX, y: logoY, width: logoDims.width, height: logoDims.height });

  const textColor = rgb(0, 0, 0);

  // --- Titre & infos ---
  const titleY = logoY - 25;
  page.drawText("THE LAST", {
    x: (width - font.widthOfTextAtSize("THE LAST", 18)) / 2,
    y: titleY,
    size: 18,
    font,
    color: textColor,
  });

  page.drawText(`Nom : ${first_name} ${last_name}`, { x: 30, y: 120, size: 12, font, color: textColor });
  page.drawText(`Type : ${type}`, { x: 30, y: 100, size: 12, font, color: textColor });
  page.drawText("Samedi 18 octobre 2025 — Dès 19h", { x: 30, y: 80, size: 12, font, color: textColor });
  page.drawText("Entrée valable pour 1 personne", { x: 30, y: 60, size: 12, font, color: textColor });

  // --- QR Code ---
  const qrData = await QRCode.toDataURL(`https://evenement.gvapaintball.com/success?session_id=${id}`);
  const qrImage = await pdfDoc.embedPng(qrData);
  page.drawImage(qrImage, { x: width - 120, y: 40, width: 80, height: 80 });

  // --- Numéro billet ---
  page.drawText(`Billet n°: ${id}`, { x: 30, y: 30, size: 10, font, color: textColor });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

/* -------------------------------------------------------
 📄 ROUTE DOWNLOAD
------------------------------------------------------- */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type"); // ticket | invoice

    if (!id || !type) {
      return new Response(JSON.stringify({ error: "Paramètres manquants" }), { status: 400 });
    }

    const client = await pool.connect();
    const result = await client.query("SELECT * FROM orders WHERE id = $1", [id]);
    client.release();

    if (result.rowCount === 0) {
      return new Response(JSON.stringify({ error: "Commande introuvable" }), { status: 404 });
    }

    const order = result.rows[0];
    let pdfBuffer;

    if (type === "ticket") {
      pdfBuffer = await generateTicketPDF(order);
    } else if (type === "invoice") {
      pdfBuffer = await generateInvoicePDF(order);
    } else {
      return new Response(JSON.stringify({ error: "Type invalide" }), { status: 400 });
    }

    return new Response(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename=${type}_${id}.pdf`,
      },
    });
  } catch (error) {
    console.error("Erreur téléchargement PDF:", error);
    return new Response(JSON.stringify({ error: "Erreur serveur" }), { status: 500 });
  }
}
