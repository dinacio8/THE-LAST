import mysql from "mysql2/promise";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { session_id } = req.query;

  if (!session_id) {
    return res.status(400).json({ error: "session_id manquant" });
  }

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
    });

    // 🔍 On cherche la commande correspondant à la session Stripe
    const [rows] = await connection.execute(
      "SELECT * FROM orders WHERE session_id = ?",
      [session_id]
    );

    await connection.end();

    if (rows.length === 0) {
      return res.status(404).json({ error: "Commande introuvable" });
    }

    const order = rows[0];

    res.status(200).json({
      status: order.sent_at ? "sent" : "pending",
      firstName: order.first_name,
      lastName: order.last_name,
      type: order.type,
      price: order.price,
      email: order.email,
      invoice: order.invoice_id,
      ticket: order.ticket_id,
      sentAt: order.sent_at,
    });
  } catch (err) {
    console.error("Erreur base de données:", err);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
}

