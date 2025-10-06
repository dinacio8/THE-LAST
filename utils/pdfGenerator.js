import PDFDocument from "pdfkit";
import getStream from "get-stream";
import pkg from "pg";
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function generateTicket(ticketId, buyer, type) {
  const doc = new PDFDocument({ margin: 40, size: "A6", layout: "landscape" });
  const buffers = [];
  doc.on("data", buffers.push.bind(buffers));

  // Dégradé vert
  const gradient = doc.linearGradient(0, 0, 400, 0);
  gradient.stop(0, "#16a34a").stop(1, "#4ade80");
  doc.rect(0, 0, 600, 300).fill(gradient);

  doc.fillColor("#fff").fontSize(20).font("Helvetica-Bold").text("🎟 THE LAST", 40, 30);
  doc.moveDown();
  doc.fontSize(14).text(`Billet : ${ticketId}`);
  doc.moveDown();
  doc.fontSize(12).text(`Nom : ${buyer.firstName} ${buyer.lastName}`);
  doc.text(`Email : ${buyer.email}`);
  doc.text(`Type : ${type}`);
  doc.text(`Prix : ${type === "VIP" ? "15 CHF" : "5 CHF"}`);
  doc.text(`Date : 18 octobre 2025 — dès 19h`);
  doc.text(`Lieu : GVA Paintball, Vernier`);
  doc.end();

  return Buffer.concat(buffers);
}

export async function generateInvoice(invoiceId, buyer, type, price) {
  const doc = new PDFDocument({ margin: 40, size: "A4" });
  const buffers = [];
  doc.on("data", buffers.push.bind(buffers));

  doc.fillColor("#000").font("Helvetica-Bold").fontSize(18).text("FACTURE", { align: "right" });
  doc.moveDown();
  doc.fontSize(12).text(`N° de facture : ${invoiceId}`, { align: "right" });
  doc.text(`Date : ${new Date().toLocaleDateString("fr-CH")}`, { align: "right" });
  doc.moveDown(2);
  doc.text(`À : ${buyer.firstName} ${buyer.lastName}`);
  doc.text(buyer.address);
  doc.text(buyer.email);
  doc.moveDown(2);
  doc.text(`Description : Billet ${type}`);
  doc.text(`Montant TTC : ${price.toFixed(2)} CHF`);
  doc.moveDown(2);
  doc.text("Merci pour votre achat et à bientôt à l'événement THE LAST !");
  doc.end();

  return Buffer.concat(buffers);
}
