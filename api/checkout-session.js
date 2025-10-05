import Stripe from "stripe";

export default async function handler(req, res) {
if (req.method !== "POST") {
return res.status(405).json({ error: "Méthode non autorisée" });
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

try {
const { firstName, lastName, email, address, type } = req.body;

const price = type === "VIP" ? 15 : 5; // prix CHF
const description = `Billet ${type} - The Last`;

const session = await stripe.checkout.sessions.create({
payment_method_types: ["card"],
mode: "payment",
line_items: [
{
price_data: {
currency: "chf",
product_data: { name: description },
unit_amount: price * 100,
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
success_url: `${req.headers.origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
cancel_url: `${req.headers.origin}/cancel.html`,
});

res.status(200).json({ url: session.url });
} catch (error) {
console.error("Erreur création session Stripe:", error);
res.status(500).json({ error: "Erreur création session Stripe", details: error.message });
}
}
