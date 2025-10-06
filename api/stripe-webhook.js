import Stripe from "stripe";
import { Resend } from "resend";
import { generateTicket, generateInvoice, generateNextId } from "../utils/pdfGenerator.js";
import { pool } from "../lib/db.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

export const config = { api: { bodyParser: false } };

// Collecte le raw body sans "micro"
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  let event;
  try {
    const raw = await getRawBody(req);
    const sig = req.headers["stripe-signature"];
    event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Stripe signature error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    const meta = session.metadata || {};
    const type = meta.type || "INDIVIDUEL";
    const firstName = meta.firstName || "";
    const lastName = meta.lastName || "";
    const address = meta.address || "";
    const email = session.customer_email || "";
    const price = type === "VIP" ? 15 : 5;

    try {
      // IDs incrementaux (FAC-YYYY-MM-0001 / TICKET-YYYY-MM-0001)
      const ticketId = await generateNextId("ticket");
      const invoiceId = await generateNextId("invoice");

      const buyer = { firstName, lastName, email, address };

      // Genere les PDFs en buffer (non vides)
      const ticketBuffer = await generateTicket(ticketId, buyer, type);
      const invoiceBuffer = await generateInvoice(invoiceId, buyer, type, price);

      // Enregistre en base
      await pool.query(
        `INSERT INTO orders (
           invoice_id, ticket_id, first_name, last_name, email, address,
           ticket_type, price, status, ticket_pdf, invoice_pdf
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'PAID',$9,$10)`,
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
          invoiceBuffer
        ]
      );

      // Envoie l'email
      await resend.emails.send({
        from: "The Last <evenement@gvapaintball.com>",
        to: email,
        subject: "Ton billet et ta facture - THE LAST",
        html:
          "<p>Merci pour votre achat.</p>" +
          "<p>Veuillez trouver en pieces jointes votre billet et votre facture.</p>" +
          "<p>Date: 18/10/2025 - 19h - Lieu: GVA Paintball, Vernier</p>",
        attachments: [
          { filename: `billet-${ticketId}.pdf`, content: ticketBuffer.toString("base64") },
          { filename: `facture-${invoiceId}.pdf`, content: invoiceBuffer.toString("base64") }
        ]
      });

      console.log(`OK: stored and mailed to ${email}`);
    } catch (err) {
      console.error("Processing error:", err);
      // On renvoie quand meme 200 a Stripe pour eviter les retries infinis si l'erreur vient du mail
    }
  }

  res.status(200).json({ received: true });
}
