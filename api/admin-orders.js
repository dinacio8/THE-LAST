import { pool } from "../lib/db.js";

export default async function handler(req, res) {
  try {
    const result = await pool.query(`
      SELECT id, ticket_id, invoice_id, first_name, last_name, email, type, price, status, created_at 
      FROM orders 
      ORDER BY id DESC
    `);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Erreur admin:", error);
    res.status(500).json({ error: "Erreur interne", details: error.message });
  }
}
