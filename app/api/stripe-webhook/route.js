import Stripe from "stripe";

// 👇 Indique que cette route doit être dynamique (et non statique)
export const dynamic = "force-dynamic";

// Stripe requiert le corps brut du webhook (non parsé)
async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req.body) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function POST(req) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers.get("stripe-signature");

  let event;
  try {
    const rawBody = await readRawBody(req);
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Erreur validation signature :", err.message);
    return new Response(`Webhook error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        console.log("✅ Paiement reçu pour :", session.customer_email);

        // Exemple d’envoi email (si RESEND_API_KEY est configurée)
        await sendConfirmationEmail(session);
        break;
      }
      default:
        console.log("ℹ️ Événement non géré :", event.type);
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("🔥 Erreur interne :", err);
    return new Response("Erreur interne serveur", { status: 500 });
  }
}

// Exemple facultatif : envoi d’un mail de confirmation via Resend
async function sendConfirmationEmail(session) {
  if (!process.env.RESEND_API_KEY) return;

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    const name = `${session.metadata.firstName} ${session.metadata.lastName}`;
    const type = session.metadata.type;
    const email = session.customer_email;

    await resend.emails.send({
      from: "GVA Paintball <noreply@gvapaintball.com>",
      to: email,
      subject: "🎟 Confirmation de ton billet - The Last",
      html: `
        <p>Bonjour ${name},</p>
        <p>Ton paiement pour <strong>The Last @ GVA Paintball</strong> est confirmé.</p>
        <p>Type de billet : <b>${type}</b></p>
        <p>À très bientôt 🎧🔥</p>
        <hr />
        <small>© 2025 GVA Paintball</small>
      `,
    });

    console.log("📧 Mail envoyé à", email);
  } catch (err) {
    console.error("Erreur envoi mail :", err);
  }
}
