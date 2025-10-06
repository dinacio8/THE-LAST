import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";

const FONT_FILE = path.join(process.cwd(), "Roboto-Regular.ttf");

// 🔹 Vérifie la présence de la police
if (!fs.existsSync(FONT_FILE)) {
  console.error("⚠️ Police Roboto-Regular.ttf manquante à la racine !");
}

// 🟢 Fonction billet
export async function generateTicket(ticketId, buyer, type) {
  const doc = new PDFDocument({ size: [420, 297], layout: "landscape", margin: 20 });
  const buffers = [];
  doc.on("data", (chunk) => buffers.push(chunk));

  // Fond vert dégradé
  const gradient = doc.linearGradient(0, 0, 420, 297);
  gradient.stop(0, "#00b894").stop(1, "#14532d");
  doc.rect(0, 0, 420, 297).fill(gradient);

  // Logo
  try {
    doc.image("terrain_GE_gvapaintball_01.png", 25, 25, { width: 60 });
  } catch {
    console.warn("⚠️ Logo introuvable (billet)");
  }

  // Texte principal
  doc.font(FONT_FILE).fillColor("#ffffff");
  doc.fontSize(24).text("THE LAST", 120, 25);
  doc.fontSize(12).text("Samedi 18 octobre 2025 — dès 19h", 120, 55);
  doc.fontSize(12).text("GVA Paintball • Vernier", 120, 70);
  doc.moveTo(25, 100).lineTo(400, 100).strokeColor("#ffffff").stroke();

  // Infos acheteur
  doc.fontSize(11);
  doc.text(`Nom : ${buyer.firstName} ${buyer.lastName}`, 25, 120);
  doc.text(`Email : ${buyer.email}`, 25, 140);
  doc.text(`Adresse : ${buyer.address}`, 25, 160);
  doc.text(`Identifiant billet : ${ticketId}`, 25, 180);

  // QR code
  const qrData = await QRCode.toDataURL(`https://evenement.gvapaintball.com/verify?ticket=${ticketId}`);
  const qrBuffer = Buffer.from(qrData.split(",")[1], "base64");
  doc.image(qrBuffer, 320, 120, { width: 70 });

  // Pied de page
  doc.fontSize(9).fillColor("#e5e7eb");
  doc.text("Billet nominatif - Non remboursable - Présentez à l’entrée", 25, 265);

  doc.end();
  return Buffer.concat(buffers);
}

// 🧾 Fonction facture
export async function generateInvoice(invoiceId, buyer, type, price) {
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const buffers = [];
  doc.on("data", (chunk) => buffers.push(chunk));

  doc.font(FONT_FILE).fillColor("#000000");

  // Logo
  try {
    doc.image("terrain_GE_gvapaintball_01.png", 50, 40, { width: 100 });
  } catch {
    console.warn("⚠️ Logo introuvable (facture)");
  }

  // En-tête
  doc.fillColor("#16a34a").fontSize(26).text("FACTURE", 400, 50, { align: "right" });
  doc.fillColor("#000000").fontSize(12);
  doc.text(`N° ${invoiceId}`, 400, 80, { align: "right" });
  doc.text(`Date : ${new Date().toLocaleDateString("fr-CH")}`, 400, 95, { align: "right" });

  // Infos client
  doc.moveDown(3);
  doc.text("Facturé à :", 50);
  doc.text(`${buyer.firstName} ${buyer.lastName}`);
  doc.text(`${buyer.address}`);
  doc.text(`${buyer.email}`);

  // Tableau
  doc.moveDown(2);
  doc.text("Description", 50, 250);
  doc.text("Quantité", 300, 250);
  doc.text("Prix (CHF)", 450, 250);
  doc.moveTo(50, 265).lineTo(540, 265).strokeColor("#16a34a").stroke();

  doc.text(`Billet The Last`, 50, 280);
  doc.text("1", 320, 280);
  doc.text(`${price.toFixed(2)}`, 450, 280);

  doc.moveTo(50, 310).lineTo(540, 310).stroke();
  doc.fontSize(14).text("Total TTC :", 350, 330);
  doc.fontSize(14).text(`${price.toFixed(2)} CHF`, 450, 330);

  // Mentions
  doc.fontSize(10).fillColor("gray").text("TVA incluse. Merci pour votre achat !", 50, 760, { align: "center" });
  doc.text("GVA Paintball - Chemin des Coquelicots 29, 1214 Vernier", 50, 775, { align: "center" });

  doc.end();
  return Buffer.concat(buffers);
}
