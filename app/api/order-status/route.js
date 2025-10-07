import pkg from "pg";

const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id"); // 🟢 On utilise maintenant "id"

    if (!id) {
      return new Response(JSON.stringify({ error: "ID de commande manquant" }), {
        status: 400,
      });
    }

    const client = await pool.connect();
    const { rows } = await client.query(
      `SELECT id, first_name, last_name, email, type, price, created_at 
       FROM orders 
       WHERE id = $1 LIMIT 1`,
      [id]
    );
    client.release();

    if (rows.length === 0) {
      return new Response(JSON.stringify({ error: "Commande introuvable" }), {
        status: 404,
      });
    }

    const order = rows[0];

    const response = {
      first_name: order.first_name,
      last_name: order.last_name,
      email: order.email,
      type: order.type,
      price: order.price,
      created_at: order.created_at,
      status: "sent", // Tu pourras remplacer ça par un champ réel plus tard
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Erreur récupération commande:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
}
