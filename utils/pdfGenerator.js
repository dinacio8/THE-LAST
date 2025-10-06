import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";

const FONT_FILE = path.join(process.cwd(), "Roboto-Regular.ttf");

// Vérifie si la police existe
if (!fs.existsSync(FONT_FILE)) {
  console.error("❌ Police Roboto introuvable. Place Roboto-Regular.ttf à la racine du projet !");
}

// 🎟️ Génération du billet
export async function generateTicket(ticketId, buyer, type) {
  const doc = new PDFDocument({
    size: [420, 297], // Format A6 paysage
    layout: "landscape",
    margin: 20,
  });
  const buffers = [];
  doc.on("data", (d) => buffers.push(d));

  // Fond dégradé
  const gradient = doc.linearGradient(0, 0, 420, 297);
  if (type === "VIP") gradient.stop(0, "#d4af37").stop(1, "#fff8dc");
  else gradient.stop(0, "#22c55e").stop(1, "#a7f3d0");
  doc.rect(0, 0, 420, 297).fill(gradient);

  // Logo
  try {
    doc.image("terrain_GE_gvapaintball_01.png", 20, 20, { width: 70 });
  } catch {
    console.warn("⚠️ Logo manquant");
  }

  // Texte principal
  doc.font(FONT_FILE).fillColor("#fff");
  doc.fontSize(24).text("🎟 THE LAST", 120, 25);
  doc.fontSize(12).text("Samedi 18 octobre 2025 — dès 19h", 120, 55);
  doc.fontSize(12).text("GVA Paintball, Vernier", 120, 70);

  doc.moveTo(20, 100).lineTo(400, 100).strokeColor("#fff").stroke();

  // Infos billet
  doc.font(FONT_FILE).fontSize(12);
  doc.text(`Nom : ${buyer.firstName} ${buyer.lastName}`, 25, 120);
  doc.text(`Email : ${buyer.email}`, 25, 140);
  doc.text(`Type : ${type}`, 25, 160);
  doc.text(`ID : ${ticketId}`, 25, 180);

  // QR code
  const qr = await QRCode.toDataURL(`https://evenement.gvapaintball.com/verify?ticket=${ticketId}`);
  const qrBase64 = qr.split(",")[1];
  const qrBuffer = Buffer.from(qrBase64, "base64");
  doc.image(qrBuffer, 320, 120, { width: 80 });

  // Footer
  doc.fontSize(9).fillColor("#f3f4f6");
  doc.text("Billet nominatif • Présentez à l’entrée • Non remboursable", 25, 265);

  doc.end();
  return Buffer.concat(buffers);
}

// 🧾 Génération de la facture
export async function generateInvoice(invoiceId, buyer, type, price) {
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const buffers = [];
  doc.on("data", (d) => buffers.push(d));

  doc.font(FONT_FILE).fillColor("#000");

  // Logo
  try {
    doc.image("terrain_GE_gvapaintball_01.png", 50, 40, { width: 100 });
  } catch {
    console.warn("⚠️ Logo manquant facture");
  }

  doc.fillColor("#16a34a").fontSize(24).text("FACTURE", 400, 50, { align: "right" });
  doc.fillColor("#000").fontSize(12);
  doc.text(`N° ${invoiceId}`, 400, 80, { align: "right" });
  doc.text(`Date : ${new Date().toLocaleDateString("fr-CH")}`, 400, 95, { align: "right" });

  // Infos client
  doc.moveDown(3);
  doc.text(`Facturé à :`, 50);
  doc.text(`${buyer.firstName} ${buyer.lastName}`);
  doc.text(`${buyer.address}`);
  doc.text(`${buyer.email}`);

  // Tableau facture
  doc.moveDown(2);
  doc.text("Description", 50, 250);
  doc.text("Quantité", 300, 250);
  doc.text("Prix (CHF)", 450, 250);
  doc.moveTo(50, 265).lineTo(540, 265).strokeColor("#16a34a").stroke();

  doc.text(`Billet ${type} - The Last`, 50, 280);
  doc.text("1", 320, 280);
  doc.text(`${price.toFixed(2)}`, 450, 280);

  doc.moveTo(50, 310).lineTo(540, 310).stroke();
  doc.fontSize(14).text("Total TTC :", 350, 330);
  doc.fontSize(14).text(`${price.toFixed(2)} CHF`, 450, 330);

  // Footer
  doc.fontSize(10).fillColor("gray").text("Merci pour votre confiance !", 50, 760, { align: "center" });

  doc.end();
  return Buffer.concat(buffers);
}
