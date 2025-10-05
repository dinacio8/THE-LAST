import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default async function handler(req, res) {
  const { key } = req.query;

  if (!key || key !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: "Accès refusé" });
  }

  try {
    const result = await pool.query(`
      SELECT id, first_name, last_name, email, type, price, created_at, ticket_id, invoice_id
      FROM orders
      ORDER BY created_at DESC
    `);

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Erreur DB:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

