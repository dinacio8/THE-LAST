import Stripe from "stripe";

// Initialisation Stripe (clé secrète depuis les variables d'environnement Vercel)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
// On autorise uniquement la méthode POST
if (req.method !== "POST") {
return res.status(405).json({ error: "Méthode non autorisée" });
}

try {
const { firstName, lastName, email, address, type } = req.body;

// --- Vérifications simples ---
if (!email || !type) {
return res.status(400).json({ error: "Champs manquants dans la requête" });
}

// --- Définition du billet ---
const isVIP = type === "VIP";
const price = isVIP ? 15 : 5; // CHF
const description = `Billet ${type} - The Last @ GVA Paintball`;

console.log("🎟 Création session Stripe pour :", email, "-", description);

// --- Création de la session Stripe Checkout ---
const session = await stripe.checkout.sessions.create({
mode: "payment",
payment_method_types: ["card", "twint"], // support TWINT aussi
billing_address_collection: "auto",
customer_email: email,
line_items: [
{
price_data: {
currency: "chf",
product_data: {
name: description,
},
unit_amount: price * 100, // Stripe attend des centimes
},
quantity: 1,
},
],
metadata: {
firstName,
lastName,
address,
type,
},
success_url: "https://evenement.gvapaintball.com/success.html?session_id={CHECKOUT_SESSION_ID}",
cancel_url: "https://evenement.gvapaintball.com/cancel.html",
});

console.log("✅ Session Stripe créée :", session.id);

// --- Réponse côté frontend ---
return res.status(200).json({ url: session.url });

} catch (error) {
console.error("❌ Erreur création session Stripe:", error);
return res.status(500).json({
error: "Erreur création session Stripe",
details: error.message,
});
}
}
