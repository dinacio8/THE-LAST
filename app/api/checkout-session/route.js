import Stripe from "stripe";
import pkg from "pg";

const { Pool } = pkg;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req) {
  try {
    const data = await req.json();
    const { firstName, lastName, email, address, type } = data;

    if (!firstName || !lastName || !email || !address) {
      return new Response(JSON.stringify({ error: "Champs manquants" }), { status: 400 });
    }

    // ✅ Crée une session Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card", "apple_pay", "google_pay"],
      line_items: [
        {
          price_data: {
            currency: "chf",
            product_data: { name: `Billet ${type} - THE LAST` },
            unit_amount: 500, // 5 CHF
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `https://evenement.gvapaintball.com/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://evenement.gvapaintball.com/cancel`,
      customer_email: email,
      metadata: { firstName, lastName, address, type },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Erreur création session Stripe:", error);
    return new Response(JSON.stringify({ error: "Erreur Stripe", details: error.message }), {
      status: 500,
    });
  }
}
