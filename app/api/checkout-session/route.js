import pkg from "pg";
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

import Stripe from "stripe";

export async function POST(req) {
  try {
    // ✅ Vérifie que la clé Stripe est bien dispo
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("❌ STRIPE_SECRET_KEY manquante");
      return new Response(
        JSON.stringify({ error: "Clé Stripe manquante" }),
        { status: 500 }
      );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const body = await req.json();
    console.log("📦 Données reçues :", body);

    const { firstName, lastName, address, email, type } = body;

    // ✅ Validation basique
    if (!email || !firstName || !lastName) {
      console.warn("⚠️ Champs manquants :", { firstName, lastName, email });
      return new Response(
        JSON.stringify({ error: "Champs manquants" }),
        { status: 400 }
      );
    }

    // ✅ Détermine le prix
    const price = type === "INDIVIDUEL" ? 5 : 5;

    // ✅ Base URL sécurisée
    const baseUrl =
      process.env.BASE_URL?.startsWith("http")
        ? process.env.BASE_URL
        : `https://${process.env.BASE_URL || "evenement.gvapaintball.com"}`;

// Vérifie le nombre total de billets déjà vendus
const { rows } = await pool.query("SELECT COUNT(*) AS total FROM orders");
const total = parseInt(rows[0].total, 10);

if (total >= 3) {
  console.warn("⚠️ Quota de 320 billets atteint, refus de commande");
  return new Response(
    JSON.stringify({ error: "🎫 Événement complet C’était le dernier... The Last, vraiment 😅" }),
    { status: 403 }
  );
}

    // ✅ Création de la session Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card", "twint"], // active Twint + cartes
      mode: "payment",
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/checkout?canceled=true`,
      line_items: [
        {
          price_data: {
            currency: "chf",
            product_data: {
              name: `${type} - The Last @ GVA Paintball`,
            },
            unit_amount: price * 100, // conversion CHF → centimes
          },
          quantity: 1,
        },
      ],
      customer_email: email,
      metadata: {
        firstName,
        lastName,
        address,
        type,
      },
    });

    console.log("✅ Session créée :", session.id);

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("🔥 Erreur Stripe :", err);
    return new Response(
      JSON.stringify({
        error: err.message || "Erreur interne lors de la création de session",
      }),
      { status: 500 }
    );
  }
}
