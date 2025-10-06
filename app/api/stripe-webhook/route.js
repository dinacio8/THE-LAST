import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ⚠ Nécessaire pour lire le corps brut (Stripe envoie du raw JSON signé)
export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req) {
  const sig = req.headers.get("stripe-signature");
  const rawBody = await req.text(); // lecture brute du body
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Signature webhook invalide :", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // 🧾 Analyse de l’événement
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;

        console.log("✅ Paiement reçu pour :", session.customer_email);

        // 🔹 Exemple : on peut stocker la commande dans une base (à adapter)
        // await saveOrderToDatabase(session);

        // 🔹 Exemple : envoyer un mail de confirmation (via Resend ou autre)
        await sendConfirmationEmail(session);

        break;
      }

      default:
        console.log(`ℹ️ Événement non géré : ${event.type}`);
    }

    return new Response("Webhook reçu", { status: 200 });
  } catch (err) {
    console.error("Erreur traitement webhook:", err);
    return new Response("Erreur interne serveur", { status: 500 });
  }
}

/**
 * Exemple d’envoi d’un mail avec Resend
 */
async function sendConfirmationEmail(session) {
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    const email = session.customer_email;
    const name = `${session.metadata.firstName} ${session.metadata.lastName}`;
    const type = session.metadata.type;

    const result = await resend.emails.send({
      from: "GVA Paintball <noreply@gvapaintball.com>",
      to: email,
      subject: "🎟 Confirmation de ton billet - The Last",
      html: `
        <p>Bonjour ${name},</p>
        <p>Ton paiement pour <strong>The Last @ GVA Paintball</strong> est confirmé !</p>
        <p>Type de billet : <strong>${type}</strong></p>
        <p>Tu peux présenter cet email à l’entrée pour valider ton ticket.</p>
        <p>À très bientôt 🎧🔥</p>
        <hr />
        <small>© 2025 GVA Paintball</small>
      `,
    });

    console.log("📧 Mail envoyé à", email, result);
  } catch (err) {
    console.error("Erreur envoi mail Resend:", err);
  }
}
