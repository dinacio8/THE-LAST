import { NextResponse } from "next/server";
import Stripe from "stripe";
import { Resend } from "resend";
import pkg from "pg";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

const { Pool } = pkg;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ✅ Template HTML email (propre & compatible Gmail)
const emailTemplate = (data) => `
<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Confirmation – The Last @ GVA Paintball</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f6f6f6;color:#333;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
      <td align="center" style="padding:30px 15px;">
        <table width="600" style="background:white;border-radius:10px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.1);">
          <tr>
            <td align="center" style="background:linear-gradient(135deg,#22c55e,#facc15);padding:25px;">
              <img src="https://evenement.gvapaintball.com/terrain_GE_gvapaintball_01.png" alt="GVA Paintball" width="100" style="display:block;border:none;margin-bottom:10px;">
              <h1 style="margin:0;font-size:24px;color:#fff;font-weight:bold;">The Last @ GVA Paintball</h1>
              <p style="color:#fff;margin:10px 0 0 0;font-size:16px;">Samedi 18 octobre 2025</p>
            </td>
          </tr>

          <tr>
            <td style="padding:30px;">
              <h2 style="color:#22c55e;margin-top:0;">🎉 Paiement confirmé !</h2>
              <p>Bonjour <strong>${data.firstName} ${data.lastName}</strong>,</p>
              <p>Merci pour ta commande ! Ton billet est bien enregistré pour <b>The Last</b>.</p>
              
              <table cellspacing="0" cellpadding="6" border="0" width="100%" style="background:#fafafa;border:1px solid #eee;border-radius:8px;margin:20px 0;">
                <tr><td style="font-weight:bold;width:40%;">Type de billet</td><td>${data.type}</td></tr>
                <tr><td style="font-weight:bold;">Montant</td><td>${data.price} CHF</td></tr>
                <tr><td style="font-weight:bold;">Email</td><td>${data.email}</td></tr>
                <tr><td style="font-weight:bold;">N° de commande</td><td>${data.sessionId}</td></tr>
              </table>

              <p>Tu trouveras ci-joint ton <strong>billet PDF</strong> et ta <strong>facture</strong>.</p>
              <p>🎟 Présente ton billet à l’entrée le <b>samedi 18 octobre 2025 dès 19h</b>.</p>

              <div style="text-align:center;margin-top:30px;">
                <a href="https://evenement.gvapaintball.com/success?session_id=${data.sessionId}" 
                   style="display:inline-block;background:#22c55e;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:bold;">
                   Voir ma commande
                </a>
              </div>

              <hr style="margin:40px 0;border:none;border-top:1px solid #eee;">
              <p style="font-size:13px;color:#777;">
                Pour toute question, réponds simplement à ce message ou contacte-nous sur Instagram 
                <a href="https://www.instagram.com/gvapaintball" style="color:#22c55e;text-decoration:none;">@gvapaintball</a>.
              </p>
            </td>
          </tr>

          <tr>
            <td align="center" style="background:#f9fafb;padding:20px;font-size:12px;color:#999;">
              © 2025 GVA Paintball — Tous droits réservés<br>
              <a href="https://evenement.gvapaintball.com" style="color:#22c55e;text-decoration:none;">evenement.gvapaintball.com</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// ✅ Génération de PDF simple (sans Helvetica)
async function generatePdf(title, content) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 400]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const { height } = page.getSize();

  page.drawText(title, { x: 50, y: height - 80, size: 22, font, color: rgb(0.13, 0.6, 0.27) });
  page.drawText(content, { x: 50, y: height - 130, size: 14, font, color: rgb(0, 0, 0) });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes).toString("base64");
}

// ✅ Handler du webhook Stripe
export async function POST(req) {
  try {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
    } catch (err) {
      console.error("❌ Erreur de signature webhook :", err.message);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const customerEmail = session.customer_details?.email;
      const firstName = session.metadata?.firstName || "Client";
      const lastName = session.metadata?.lastName || "";
      const type = session.metadata?.type || "INDIVIDUEL";
      const price = (session.amount_total / 100).toFixed(2);
      const sessionId = session.id;

      console.log("✅ Paiement confirmé :", sessionId);

      // 🔸 Insérer dans la base PostgreSQL
      const client = await pool.connect();
      await client.query(
        `INSERT INTO orders (session_id, first_name, last_name, email, type, price, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [sessionId, firstName, lastName, customerEmail, type, price]
      );
      client.release();

      // 🔸 Génération PDF billet & facture
      const ticketPdf = await generatePdf("🎟 Billet d'entrée – The Last", `Nom: ${firstName} ${lastName}\nType: ${type}\nEmail: ${customerEmail}`);
      const invoicePdf = await generatePdf("📄 Facture – The Last", `Commande: ${sessionId}\nMontant: ${price} CHF`);

      // 🔸 Envoi email via Resend
      await resend.emails.send({
        from: "The Last <evenement@gvapaintball.com>",
        to: customerEmail,
        subject: "🎟 Ton billet pour The Last @ GVA Paintball",
        html: emailTemplate({ firstName, lastName, type, price, email: customerEmail, sessionId }),
        attachments: [
          { filename: "billet.pdf", content: ticketPdf, encoding: "base64" },
          { filename: "facture.pdf", content: invoicePdf, encoding: "base64" },
        ],
      });

      console.log(`📧 Mail billet + facture envoyé à ${customerEmail}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("🔥 Erreur globale du webhook :", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
