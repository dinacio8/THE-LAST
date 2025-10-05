import PDFDocument from "pdfkit";
import getStream from "get-stream";
import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// 🔢 Génère un ID incrémental qui part de 1
export async function generateNextId(type) {
  const prefix = type === "invoice" ? "FAC" : "TICKET";
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  // Met à jour le compteur et récupère le nouveau numéro
  const result = await pool.query(
    `UPDATE counters
     SET last_number = last_number + 1
     WHERE type = $1
     RETURNING last_number`,
    [type]
  );

  // Si le compteur n'existe pas encore (cas rare)
  if (result.rows.length === 0) {
    await pool.query(
      "INSERT INTO counters (type, last_number) VALUES ($1, 1)",
      [type]
    );
    return ⁠ ${prefix}-${year}-${month}-001 ⁠;
  }

  const next = result.rows[0].last_number;
  const formatted = String(next).padStart(3, "0");

  return ⁠ ${prefix}-${year}-${month}-${formatted} ⁠;
}

// 🧾 Génère une facture PDF complète
export async function generateInvoice(invoiceId, buyer, type, price) {
  const doc = new PDFDocument({ margin: 50 });
  const stream = getStream.buffer(doc);

  doc.fontSize(20).text("FACTURE", { align: "center" });
  doc.moveDown(1);

  doc.fontSize(12).text(⁠ Numéro : ${invoiceId} ⁠);
  doc.text(⁠ Nom : ${buyer.firstName} ${buyer.lastName} ⁠);
  doc.text(⁠ Adresse : ${buyer.address} ⁠);
  doc.text(⁠ Email : ${buyer.email} ⁠);
  doc.moveDown();

  doc.text(⁠ Type de billet : ${type} ⁠);
  doc.text(⁠ Montant TTC : CHF ${price.toFixed(2)} ⁠);
  doc.text("TVA incluse (7.7%)");
  doc.moveDown();

  doc.text("Merci pour votre achat !");
  doc.moveDown(2);

  doc.fontSize(10).text("The Last — GVA Paintball");
  doc.text("Chemin des Coquelicots 29, 1214 Vernier", { align: "center" });

  doc.end();
  return stream;
}

// 🎟 Génère un ticket PDF complet
export async function generateTicket(ticketId, buyer, type) {
  const doc = new PDFDocument({ margin: 50 });
  const stream = getStream.buffer(doc);

  doc.fontSize(20).text("🎫 THE LAST — Billet d'entrée", { align: "center" });
  doc.moveDown(1);

  doc.fontSize(12).text(⁠ Numéro de billet : ${ticketId} ⁠);
  doc.text(⁠ Nom : ${buyer.firstName} ${buyer.lastName} ⁠);
  doc.text(⁠ Type : ${type} ⁠);
  doc.moveDown();

  doc.text("📍 Lieu : GVA Paintball — Chemin des Coquelicots 29, 1214 Vernier");
  doc.text("📅 Date : 18 octobre 2025 — dès 19h");
  doc.moveDown(2);

  doc.text("Présentez ce billet à l'entrée pour accéder à la soirée.", {
    align: "center",
  });
  doc.moveDown(2);

  doc.text("Merci et bon fun 🔥", { align: "center" });

  doc.end();
  return stream;
}
