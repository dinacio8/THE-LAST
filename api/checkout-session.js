import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { type, buyer } = req.body;
  const price = type === "VIP" ? 15 : 5;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "chf",
            product_data: { name: `Billet ${type} - THE LAST` },
            unit_amount: price * 100,
          },
          quantity: 1,
        },
      ],
      success_url: `${req.headers.origin}/success.html?session_id={CHECKOUT_SESSION_ID}&type=${type}`,
      cancel_url: `${req.headers.origin}/cancel.html`,
      customer_email: buyer.email,
    });

    res.json({ id: session.id, url: session.url });
  } catch (err) {
    console.error("Stripe error:", err);
    res.status(500).json({ error: err.message });
  }
}
