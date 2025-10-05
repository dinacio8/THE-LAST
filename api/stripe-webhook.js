import Stripe from "stripe";
import { Resend } from "resend";
import { buffer } from "micro";
import { generateTicket, generateInvoice, generateNextId } from "../utils/pdfGenerator.js";
import pkg from "pg";
const { Pool } = pkg;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

const pool = new Pool({
connectionString: process.env.DATABASE_URL,
ssl: { rejectUnauthorized: false },
});

export const config = {
api: { bodyParser: false },
};

export default async function handler(req, res) {
if (req.method !== "POST") {
res.setHeader("Allow", "POST");
return res.status(405).end("Méthode non autorisée");
}

let event;
try {
const sig = req.headers["stripe-signature"];
const buf = await buffer(req);
event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
} catch (err) {
console.error("❌ Erreur vérification Stripe:", err.message);
return res.status(400).send(`Webhook Error: ${err.message}`);
}

// ✅ Paiement réussi
if (event.type === "checkout.session.completed") {
const session = event.data.object;
const { type, firstName, lastName, address } = session.metadata;
const email = session.customer_email;
const price = type === "VIP" ? 15 : 5;

try {
// 🔢 IDs incrémentaux
const ticketId = await generateNextId("ticket");
const invoiceId = await generateNextId("invoice");

const buyer = { firstName, lastName, email, address };

// 🧾 Génération PDF
const ticketBuffer = await generateTicket(ticketId, buyer, type);
const invoiceBuffer = await generateInvoice(invoiceId, buyer, type, price);

// 💾 Enregistrement Neon
const client = await pool.connect();
await client.query(
`INSERT INTO orders (
invoice_id, ticket_id, first_name, last_name, email, address,
ticket_type, price, status, ticket_pdf, invoice_pdf
) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'PAID',$9,$10);`,
[
invoiceId,
ticketId,
firstName,
lastName,
email,
address,
type,
price,
ticketBuffer,
invoiceBuffer,
]
);
client.release();

console.log(`💾 Commande enregistrée pour ${email}`);

// ✉️ Envoi de l'e-mail
await resend.emails.send({
from: "The Last <evenement@gvapaintball.com>",
to: email,
subject: "🎟 Ton billet et ta facture — THE LAST",
html: `
<p>Salut ${firstName},</p>
<p>Merci pour ton achat 🎉</p>
<p>Voici ton billet et ta facture pour <strong>THE LAST</strong>.</p>
<p><strong>Date :</strong> 18 octobre 2025 — dès 19h</p>
<p><strong>Lieu :</strong> GVA Paintball, Chemin des Coquelicots 29, 1214 Vernier</p>
<p>Présente ton billet à l’entrée pour accéder à la soirée.</p>
<p>À très vite 🔥</p>
`,
attachments: [
{
filename: `billet-${ticketId}.pdf`,
content: ticketBuffer.toString("base64"),
},
{
filename: `facture-${invoiceId}.pdf`,
content: invoiceBuffer.toString("base64"),
},
],
});

console.log(`✅ Mail envoyé à ${email}`);
} catch (error) {
console.error("❌ Erreur traitement commande:", error);
}
}

res.status(200).json({ received: true });
}
