import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Récupère le statut d'une commande Stripe
 */
export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const session_id = searchParams.get("session_id");

    if (!session_id) {
      return new Response(
        JSON.stringify({ error: "Session ID manquant" }),
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["line_items"],
    });

    const line = session.line_items?.data[0];

    const response = {
      firstName: session.metadata.firstName,
      lastName: session.metadata.lastName,
      email: session.customer_details?.email,
      type: session.metadata.type,
      price: line?.price?.unit_amount
        ? line.price.unit_amount / 100
        : null,
      invoice: session.invoice || "En attente",
      ticket: session.id,
      status: session.payment_status === "paid" ? "sent" : "pending",
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
