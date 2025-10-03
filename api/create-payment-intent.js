import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { email, type } = req.body;
  const price = type === "VIP" ? 1500 : 500; // ✅ en centimes (15 CHF ou 5 CHF)

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: price,
      currency: "chf",
      receipt_email: email,
      metadata: { type },
    });

    res.status(200).json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Impossible de créer le paiement" });
  }
}
