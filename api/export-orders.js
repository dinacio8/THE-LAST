import ExcelJS from "exceljs";
import { pool } from "../lib/db.js";

export const config = {
  api: { responseLimit: "10mb" },
};

export default async function handler(req, res) {
  try {
    const result = await pool.query(`
      SELECT id, ticket_id, invoice_id, first_name, last_name, email, type, price, status, created_at 
      FROM orders 
      ORDER BY id DESC
    `);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Commandes");

    sheet.columns = [
      { header: "ID", key: "id", width: 6 },
      { header: "Ticket ID", key: "ticket_id", width: 20 },
      { header: "Facture ID", key: "invoice_id", width: 20 },
      { header: "Nom", key: "last_name", width: 15 },
      { header: "Prénom", key: "first_name", width: 15 },
      { header: "Email", key: "email", width: 25 },
      { header: "Type", key: "type", width: 10 },
      { header: "Prix (CHF)", key: "price", width: 12 },
      { header: "Statut", key: "status", width: 10 },
      { header: "Date", key: "created_at", width: 20 },
    ];

    result.rows.forEach((r) => sheet.addRow(r));

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", ⁠ attachment; filename="commandes.xlsx" ⁠);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Erreur export Excel:", err);
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
}
