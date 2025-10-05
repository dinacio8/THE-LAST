import { pool } from "../lib/db.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end("Méthode non autorisée");
  }

  const sessionId = req.query.session_id;

  if (!sessionId) {
    return res.status(400).json({ error: "Paramètre session_id manquant" });
  }

  try {
    const result = await pool.query(
      "SELECT first_name, last_name, email, type, price, status, created_at FROM orders WHERE stripe_session_id = $1",
      [sessionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Commande non trouvée" });
    }

    const order = result.rows[0];
    res.status(200).json({
      status: order.status,
      firstName: order.first_name,
      lastName: order.last_name,
      email: order.email,
      type: order.type,
      price: order.price,
      createdAt: order.created_at,
    });
  } catch (error) {
    console.error("Erreur lecture commande:", error);
    res.status(500).json({ error: "Erreur interne", details: error.message });
  }
}
