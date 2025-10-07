import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const dynamic = "force-dynamic";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  // 🟢 on accepte order_number, order, ou id (fallback)
  const orderNumber =
    searchParams.get("order_number") ||
    searchParams.get("order") ||
    searchParams.get("id");

  if (!orderNumber) {
    return new Response(JSON.stringify({ error: "Numéro de billet manquant" }), {
      status: 400,
    });
  }

  const client = await pool.connect();

  try {
    // 🔍 Vérifie si le billet existe (en cherchant via order_number)
    const { rows } = await client.query(
      `SELECT id, order_number, first_name, last_name, type, used, created_at 
       FROM orders 
       WHERE order_number = $1 
       OR id = $1::int 
       LIMIT 1`,
      [orderNumber]
    );

    if (rows.length === 0) {
      return new Response(
        JSON.stringify({ valid: false, message: "❌ Billet introuvable" }),
        { status: 404 }
      );
    }

    const order = rows[0];

    // ⚠️ Si le billet a déjà été utilisé
    if (order.used === true) {
      return new Response(
        JSON.stringify({
          valid: false,
          message: `⚠️ Billet déjà utilisé (${order.first_name} ${order.last_name})`,
          order,
        }),
        { status: 200 }
      );
    }

    // ✅ Si le billet est valide : on le marque comme utilisé
    await client.query(
      `UPDATE orders 
       SET used = true, used_at = NOW() 
       WHERE order_number = $1`,
      [order.order_number]
    );

    return new Response(
      JSON.stringify({
        valid: true,
        message: `✅ Billet valide : ${order.first_name} ${order.last_name}`,
        order,
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error("Erreur scan billet:", err);
    return new Response(
      JSON.stringify({ error: "Erreur serveur" }),
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
