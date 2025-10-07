import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return new Response(
        JSON.stringify({ error: "ID de commande manquant" }),
        { status: 400 }
      );
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
      return new Response(
        JSON.stringify({ error: "Commande introuvable" }),
        { status: 404 }
      );
    }

    const order = rows[0];

    // 🟢 on renvoie des clés au format camelCase
    const response = {
      id: order.id,
      firstName: order.first_name,
      lastName: order.last_name,
      email: order.email,
      type: order.type,
      price: parseFloat(order.price).toFixed(2),
      createdAt: order.created_at,
      status: "sent", // pourra évoluer plus tard
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
