import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      const { firstName, lastName, email, address, type } = req.body;
      const price = type === "VIP" ? 15 : 5;

      console.log("💳 Création session Stripe pour", email, "type:", type);

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "chf",
              product_data: {
                name: `Billet ${type} - THE LAST`,
                description: `Accès à l'événement THE LAST, samedi 18 octobre 2025 dès 19h`,
              },
              unit_amount: price * 100, // montant en centimes
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
        success_url: `${process.env.BASE_URL}/success.html`,
        cancel_url: `${process.env.BASE_URL}/cancel.html`,
      });

      res.status(200).json({ url: session.url });
    } catch (err) {
      console.error("❌ Erreur création session Stripe:", err);
      res.status(500).json({ error: err.message });
    }
  } else {
    res.setHeader("Allow", "POST");
    res.status(405).end("Méthode non autorisée");
  }
}
