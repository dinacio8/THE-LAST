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
      mode: "payment",
      payment_method_types: ["card"],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/cancel`,
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: "chf",
            product_data: {
              name: `Billet ${type} - The Last @ GVA Paintball`,
            },
            unit_amount: price * 100,
          },
          quantity: 1,
        },
      ],
      metadata: { firstName, lastName, address, type },
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
