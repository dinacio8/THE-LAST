import Stripe from "stripe";

export async function POST(req) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("❌ STRIPE_SECRET_KEY manquante");
      return new Response(
        JSON.stringify({ error: "Clé Stripe manquante" }),
        { status: 500 }
      );
    }

    const body = await req.json();
    console.log("📦 Données reçues :", body);

    const { firstName, lastName, address, email, type } = body;

    if (!email || !firstName || !lastName) {
      console.warn("⚠️ Champs manquants :", { firstName, lastName, email });
      return new Response(JSON.stringify({ error: "Champs manquants" }), {
        status: 400,
      });
    }

    const price = type === "INDIVIDUEL" ? 5 : 5;

const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card', 'twint'], // ✅ ajoute TWINT ici
  mode: 'payment',
  success_url: `${process.env.BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${process.env.BASE_URL}/checkout?canceled=true`,
  line_items: [
    {
      price_data: {
        currency: 'chf',
        product_data: { name: `${type} - The Last ` },
        unit_amount: 500, // 5 CHF → en centimes
      },
      quantity: 1,
    },
  ],
  customer_email: email,
});

    console.log("✅ Session créée :", session.id);

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("🔥 Erreur Stripe :", err);
    return new Response(
      JSON.stringify({ error: err.message || "Erreur interne" }),
      { status: 500 }
    );
  }
}
