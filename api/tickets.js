import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  const { session_id } = req.query;

  if (!session_id) {
    return res.status(400).json({ error: "session_id manquant" });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);

    // Récupère les infos stockées dans metadata au moment du paiement
    const { firstName, lastName, address, type } = session.metadata || {};
    const email = session.customer_email;

    if (!email) {
      return res.status(404).json({ error: "Aucune information trouvée pour cette commande." });
    }

    res.status(200).json({ firstName, lastName, address, type, email });
  } catch (err) {
    console.error("Erreur récupération session Stripe:", err);
    res.status(500).json({ error: "Erreur lors de la récupération de la session Stripe" });
  }
}
