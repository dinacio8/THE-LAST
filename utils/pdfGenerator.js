import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";

const FONT_FILE = path.join(process.cwd(), "public", "Roboto-Regular.ttf");

export async function generateTicket(ticketId, buyer, type = "INDIVIDUEL") {
  const doc = new PDFDocument({ size: [420, 297], layout: "landscape", margin: 20 });
  const chunks = [];
  doc.on("data", d => chunks.push(d));

  // fond dégradé
  const g = doc.linearGradient(0, 0, 420, 297);
  g.stop(0, "#22c55e").stop(1, "#a7f3d0");
  doc.rect(0, 0, 420, 297).fill(g);

  // logo
  const logo = path.join(process.cwd(), "public", "terrain_GE_gvapaintball_01.png");
  if (fs.existsSync(logo)) doc.image(logo, 20, 20, { width: 70 });

  if (fs.existsSync(FONT_FILE)) doc.font(FONT_FILE);
  doc.fillColor("#fff").fontSize(24).text("THE LAST", 120, 25);
  doc.fontSize(12).text("Samedi 18 octobre 2025 — dès 19h", 120, 55);
  doc.text("GVA Paintball, Vernier", 120, 70);

  doc.moveTo(20, 100).lineTo(400, 100).strokeColor("#fff").stroke();
  doc.fontSize(12);
  doc.text(`Nom : ${buyer.firstName} ${buyer.lastName}`, 25, 120);
  doc.text(`Email : ${buyer.email}`, 25, 140);
  doc.text(`Type : ${type}`, 25, 160);
  doc.text(`ID : ${ticketId}`, 25, 180);

  const qr = await QRCode.toDataURL(`https://evenement.gvapaintball.com/verify?ticket=${ticketId}`);
  const qrBuf = Buffer.from(qr.split(",")[1], "base64");
  doc.image(qrBuf, 320, 120, { width: 80 });

  doc.fontSize(9).fillColor("#f3f4f6").text("Billet nominatif • Non remboursable", 25, 265);

  doc.end();
  return Buffer.concat(chunks);
}

export async function generateInvoice(invoiceId, buyer, type, price) {
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const chunks = [];
  doc.on("data", d => chunks.push(d));

  const logo = path.join(process.cwd(), "public", "terrain_GE_gvapaintball_01.png");
  if (fs.existsSync(logo)) doc.image(logo, 50, 40, { width: 100 });

  if (fs.existsSync(FONT_FILE)) doc.font(FONT_FILE);
  doc.fillColor("#16a34a").fontSize(24).text("FACTURE", 400, 50, { align: "right" });
  doc.fillColor("#000").fontSize(12).text(`N° ${invoiceId}`, 400, 80, { align: "right" });
  doc.text(`Date : ${new Date().toLocaleDateString("fr-CH")}`, 400, 95, { align: "right" });

  doc.moveDown(3);
  doc.text("Facturé à :");
  doc.text(`${buyer.firstName} ${buyer.lastName}`);
  doc.text(buyer.address);
  doc.text(buyer.email);

  doc.moveDown(2);
  doc.text("Description", 50, 250);
  doc.text("Qté", 300, 250);
  doc.text("Prix (CHF)", 450, 250);
  doc.moveTo(50, 265).lineTo(540, 265).strokeColor("#16a34a").stroke();

  doc.text(`Billet ${type} - THE LAST`, 50, 280);
  doc.text("1", 310, 280);
  doc.text(`${price.toFixed(2)}`, 450, 280);

  doc.moveTo(50, 310).lineTo(540, 310).stroke();
  doc.fontSize(14).text("Total TTC :", 350, 330);
  doc.fontSize(14).text(`${price.toFixed(2)} CHF`, 450, 330);

  doc.fontSize(10).fillColor("gray").text("TVA comprise • Conditions : billet non remboursable", 50, 760, { align: "center" });

  doc.end();
  return Buffer.concat(chunks);
}
