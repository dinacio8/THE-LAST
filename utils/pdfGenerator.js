import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";

const FONT_FILE = path.join(process.cwd(), "Roboto-Regular.ttf");

if (!fs.existsSync(FONT_FILE)) {
  console.warn("⚠️ Police Roboto introuvable à la racine du projet.");
}

// ----------------------------
// 🎟 Génération du ticket PDF
// ----------------------------
export async function generateTicket(ticketId, buyer, type) {
  const doc = new PDFDocument({ size: [420, 297], layout: "landscape", margin: 20 });
  const buffers = [];
  doc.on("data", (d) => buffers.push(d));

  const gradient = doc.linearGradient(0, 0, 420, 297);
  gradient.stop(0, "#22c55e").stop(1, "#a7f3d0");
  doc.rect(0, 0, 420, 297).fill(gradient);

  try {
    doc.image("terrain_GE_gvapaintball_01.png", 20, 20, { width: 70 });
  } catch {
    console.warn("⚠️ Logo manquant");
  }

  doc.font(FONT_FILE).fillColor("#fff");
  doc.fontSize(24).text("🎟 THE LAST", 120, 25);
  doc.fontSize(12).text("Samedi 18 octobre 2025 — dès 19h", 120, 55);
  doc.fontSize(12).text("GVA Paintball, Vernier", 120, 70);
  doc.moveTo(20, 100).lineTo(400, 100).strokeColor("#fff").stroke();

  doc.font(FONT_FILE).fontSize(12);
  doc.text(`Nom : ${buyer.firstName} ${buyer.lastName}`, 25, 120);
  doc.text(`Email : ${buyer.email}`, 25, 140);
  doc.text(`Type : ${type}`, 25, 160);
  doc.text(`ID : ${ticketId}`, 25, 180);

  const qr = await QRCode.toDataURL(`https://evenement.gvapaintball.com/verify?ticket=${ticketId}`);
  const qrBase64 = qr.split(",")[1];
  const qrBuffer = Buffer.from(qrBase64, "base64");
  doc.image(qrBuffer, 320, 120, { width: 80 });

  doc.fontSize(9).fillColor("#f3f4f6");
  doc.text("Billet nominatif • Présentez à l’entrée • Non remboursable", 25, 265);

  doc.end();
  return Buffer.concat(buffers);
}

// ----------------------------
// 📄 Génération de la facture PDF
// ----------------------------
export async function generateInvoice(invoiceId, buyer, type, price) {
  const doc = new PDFDocument({ margin: 50 });
  const buffers = [];
  doc.on("data", (d) => buffers.push(d));

  doc.font(FONT_FILE).fontSize(20).fillColor("#22c55e").text("FACTURE", { align: "center" });
  doc.moveDown();

  doc.fontSize(12).fillColor("black");
  doc.text(`Numéro de facture : ${invoiceId}`);
  doc.text(`Date : ${new Date().toLocaleDateString("fr-CH")}`);
  doc.moveDown();

  doc.text(`Client : ${buyer.firstName} ${buyer.lastName}`);
  doc.text(`Adresse : ${buyer.address}`);
  doc.text(`Email : ${buyer.email}`);
  doc.moveDown(2);

  doc.text(`Type de billet : ${type}`);
  doc.text(`Prix : ${price.toFixed(2)} CHF`);
  doc.moveDown(2);

  doc.text("Merci pour votre achat et votre participation à THE LAST !");
  doc.moveDown(2);
  doc.text("GVA Paintball — Chemin des Coquelicots 29, 1214 Vernier");

  doc.end();
  return Buffer.concat(buffers);
}
