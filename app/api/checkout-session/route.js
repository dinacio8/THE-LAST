import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Crée une session de paiement Stripe
 */
export async function POST(req) {
  try {
    const data = await req.json();
    const { firstName, lastName, address, email, type } = data;

    if (!email || !firstName || !lastName) {
      return new Response(JSON.stringify({ error: "Champs manquants" }), {
        status: 400,
      });
    }

    // Définition du prix selon le type de billet
    const price =
      type === "INDIVIDUEL" ? 5 :
      type === "VIP" ? 15 :
      5;

    // Création de la session Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: email,
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/cancel`,
      line_items: [
        {
          price_data: {
            currency: "chf",
            product_data: {
              name: `Billet ${type} - The Last @ GVA Paintball`,
              description: `Entrée pour l'événement du 18 octobre 2025`,
            },
            unit_amount: price * 100, // montant en centimes
          },
          quantity: 1,
        },
      ],
      metadata: { firstName, lastName, address, type },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Erreur Stripe:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
}
