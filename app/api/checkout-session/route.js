import Stripe from "stripe";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  try {
    const { firstName, lastName, email, address, type = "INDIVIDUEL" } = await req.json();
    const price = 5; // CHF, plus de VIP

    const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "chf",
          product_data: { name: `Billet ${type} - THE LAST` },
          unit_amount: price * 100,
        },
        quantity: 1,
      }],
      customer_email: email,
      metadata: { firstName, lastName, address, type },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cancel`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Erreur création session:", err);
    return NextResponse.json({ error: "checkout-session failed" }, { status: 500 });
  }
}
