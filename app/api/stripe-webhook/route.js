import Stripe from "stripe";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function POST(req) {
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("⚠️ Signature Stripe invalide :", err.message);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    console.log("✅ Paiement confirmé :", session.id);
    console.log("📦 Metadata :", session.metadata);

    try {
      // Enregistrement DB
      const result = await pool.query(
        `INSERT INTO orders (session_id, first_name, last_name, email, type, amount)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (session_id) DO NOTHING RETURNING *;`,
        [
          session.id,
          session.metadata.firstName || "N/A",
          session.metadata.lastName || "N/A",
          session.customer_details?.email || "inconnu",
          session.metadata.type || "inconnu",
          session.amount_total ? session.amount_total / 100 : 0,
        ]
      );

      if (result.rowCount === 0) {
        console.warn("⚠️ Aucune ligne insérée (probablement déjà existante).");
      } else {
        console.log("🗃 Commande insérée :", result.rows[0]);
      }

      // Envoi mail
      await resend.emails.send({
        from: "GVA Paintball <noreply@evenement.gvapaintball.com>",
        to: session.customer_details.email,
        subject: "🎟 Confirmation de ton billet - The Last @ GVA Paintball",
        html: `
          <h2>Merci pour ton achat !</h2>
          <p>Bonjour ${session.metadata.firstName},</p>
          <p>Ton billet <b>${session.metadata.type}</b> a bien été enregistré.</p>
          <p>Montant : ${session.amount_total / 100} CHF</p>
          <p>Session : ${session.id}</p>
          <p>⚙️ Les détails seront disponibles sur la page "Succès".</p>
        `,
      });

      console.log("📧 Mail envoyé avec succès !");
    } catch (err) {
      console.error("🔥 Erreur dans le traitement DB ou mail :", err);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
