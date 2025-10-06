import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const result = await pool.query(`
      SELECT
        id,
        first_name,
        last_name,
        email,
        price,
        status,
        created_at
      FROM orders
      ORDER BY created_at DESC
    `);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("❌ Erreur récupération commandes:", error);
    res.status(500).json({ error: "Erreur récupération commandes", details: error.message });
  }
}
