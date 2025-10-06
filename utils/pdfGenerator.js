import PDFDocument from "pdfkit";
import getStream from "get-stream";
import { pool } from "../lib/db.js";

// Incremente un compteur par type dans la table "counters"
export async function generateNextId(kind) {
  // kind = "invoice" ou "ticket"
  const prefix = kind === "invoice" ? "FAC" : "TICKET";
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");

  const result = await pool.query(
    `INSERT INTO counters (type, value)
     VALUES ($1, 1)
     ON CONFLICT (type) DO UPDATE SET value = counters.value + 1
     RETURNING value`,
    [kind]
  );

  const n = result.rows[0].value;
  const seq = String(n).padStart(4, "0");
  return `${prefix}-${year}-${month}-${seq}`;
}

// Facture A4 simple, claire, sans emojis
export async function generateInvoice(invoiceId, buyer, type, price) {
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const bufferPromise = getStream.buffer(doc);

  doc.fontSize(20).fillColor("black").text("FACTURE", { align: "center" });
  doc.moveDown();

  doc.fontSize(12);
  doc.text(`Numero: ${invoiceId}`);
  doc.text(`Date: ${new Date().toLocaleDateString("fr-CH")}`);
  doc.text(`Client: ${buyer.firstName} ${buyer.lastName}`);
  doc.text(`Adresse: ${buyer.address}`);
  doc.text(`Email: ${buyer.email}`);
  doc.moveDown();

  doc.text("Details:");
  doc.text(`- Type de billet: ${type}`);
  doc.text(`- Montant TTC: CHF ${price.toFixed(2)}`);
  doc.moveDown();

  doc.text("Merci pour votre achat.");
  doc.end();

  return bufferPromise;
}

// Billet A6 horizontal, bandeau vert, sans emojis
export async function generateTicket(ticketId, buyer, type) {
  const doc = new PDFDocument({ size: "A6", layout: "landscape", margin: 16 });
  const bufferPromise = getStream.buffer(doc);

  // Bandeau
  doc.rect(0, 0, doc.page.width, 48).fill("#22a35a");
  doc.fillColor("white").fontSize(18).text("THE LAST", 16, 14);
  doc.fillColor("black");

  doc.moveDown(2);
  doc.fontSize(12);
  doc.text(`Titulaire: ${buyer.firstName} ${buyer.lastName}`);
  doc.text(`Type: ${type}`);
  doc.text(`Numero billet: ${ticketId}`);
  doc.text("Date: 18/10/2025 - 19h");
  doc.text("Lieu: GVA Paintball, Chemin des Coquelicots 29, 1214 Vernier");
  doc.moveDown();
  doc.fontSize(10).text("Present ez ce billet a l'entree. Non remboursable.", { align: "center" });

  doc.end();
  return bufferPromise;
}
