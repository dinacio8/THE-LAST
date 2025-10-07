import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const dynamic = "force-dynamic";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id"); // id du billet / order_number

  if (!id) {
    return new Response(JSON.stringify({ error: "ID manquant" }), { status: 400 });
  }

  const client = await pool.connect();

  try {
    // Vérifie si le billet existe
    const { rows } = await client.query(
      `SELECT id, first_name, last_name, type, used, created_at 
       FROM orders 
       WHERE id = $1 LIMIT 1`,
      [id]
    );

    if (rows.length === 0) {
      return new Response(
        JSON.stringify({ valid: false, message: "❌ Billet introuvable" }),
        { status: 404 }
      );
    }

    const order = rows[0];

    // Si déjà utilisé
    if (order.used === true) {
      return new Response(
        JSON.stringify({
          valid: false,
          message: "⚠️ Billet déjà utilisé",
          order,
        }),
        { status: 200 }
      );
    }

    // Sinon, on le marque comme utilisé
    await client.query(`UPDATE orders SET used = true, used_at = NOW() WHERE id = $1`, [id]);

    return new Response(
      JSON.stringify({
        valid: true,
        message: "✅ Billet valide ! Accès autorisé",
        order,
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error("Erreur scan billet:", err);
    return new Response(JSON.stringify({ error: "Erreur serveur" }), { status: 500 });
  } finally {
    client.release();
  }
}
