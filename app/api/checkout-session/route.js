import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Crée une session de paiement Stripe
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { firstName, lastName, email, address, type } = body;

    // 💰 Prix unique : 5 CHF
    const price = 5;
    const description = `Billet ${type || "INDIVIDUEL"} - The Last`;

    // ✅ Création de la session Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "chf",
            product_data: { name: description },
            unit_amount: price * 100, // Stripe attend des centimes
          },
          quantity: 1,
        },
      ],
      customer_email: email,
      metadata: { firstName, lastName, address, type },
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/cancel`,
    });

    return Response.json({ url: session.url });
  } catch (err) {
    console.error("❌ Erreur création session Stripe :", err);
    return Response.json(
      { error: "Erreur lors de la création de la session Stripe" },
      { status: 500 }
    );
  }
}
