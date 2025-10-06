import Stripe from "stripe";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { Pool } from "pg";
import QRCode from "qrcode";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// Empêche la mise en cache statique
export const dynamic = "force-dynamic";

// 🔑 Initialisation des modules externes
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * Génère un billet PDF pour l'événement
 */
async function generateTicketPDF(session, qrDataUrl) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { height } = page.getSize();

  const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Titre
  page.drawText("🎟 THE LAST @ GVA Paintball", {
    x: 80,
    y: height - 100,
    size: 22,
    font: titleFont,
    color: rgb(0.13, 0.77, 0.37),
  });

  // Détails
  const info = [
    `Billet : ${session.metadata.type}`,
    `Date : Samedi 18 octobre 2025`,
    `Lieu : GVA Paintball, Genève`,
    `Nom : ${session.metadata.firstName} ${session.metadata.lastName}`,
    `Email : ${session.customer_details.email}`,
    `Montant payé : ${session.amount_total / 100} CHF`,
  ];

  let y = height - 150;
  for (const line of info) {
    page.drawText(line, { x: 80, y, size: 13, font: bodyFont, color: rgb(0, 0, 0) });
    y -= 20;
  }

  // QR Code
  const qrImageBytes = Buffer.from(qrDataUrl.split(",")[1], "base64");
  const qrImage = await pdfDoc.embedPng(qrImageBytes);
  const qrDims = qrImage.scale(0.4);
  page.drawImage(qrImage, {
    x: 220,
    y: height - 400,
    width: qrDims.width,
    height: qrDims.height,
  });

  page.drawText("Présente ce billet à l’entrée.", {
    x: 180,
    y: height - 440,
    size: 12,
    font: bodyFont,
    color: rgb(0.3, 0.3, 0.3),
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

/**
 * Webhook Stripe
 */
export async function POST(req) {
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("⚠️ Signature Stripe invalide :", err.message);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  // Gestion du paiement réussi
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    console.log("✅ Paiement confirmé :", session.id);

    try {
      // 🔗 QR Code vers la page success
      const qrDataUrl = await QRCode.toDataURL(
        `https://evenement.gvapaintball.com/success?session_id=${session.id}`
      );

      // 🧾 Génération du PDF
      const pdfBuffer = await generateTicketPDF(session, qrDataUrl);

      // 💾 Insertion en base
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

      if (result.rowCount > 0) {
        console.log("🗃 Commande enregistrée :", result.rows[0]);
      } else {
        console.warn("⚠️ Commande déjà existante :", session.id);
      }

      // 📧 Envoi du mail
      await resend.emails.send({
        from: "GVA Paintball <noreply@evenement.gvapaintball.com>",
        to: session.customer_details.email,
        subject: "🎟 Ton billet pour The Last @ GVA Paintball",
        html: `
          <h2>Merci pour ton achat !</h2>
          <p>Bonjour ${session.metadata.firstName},</p>
          <p>Voici ton billet pour <b>The Last</b> à GVA Paintball.</p>
          <p><b>Type :</b> ${session.metadata.type}</p>
          <p><b>Montant :</b> ${session.amount_total / 100} CHF</p>
          <p>📍 <b>Lieu :</b> GVA Paintball, Genève<br>📅 Samedi 18 octobre 2025 dès 19h</p>
          <p>Présente ton billet avec le QR code à l’entrée.</p>
          <br><p>🎶 À très vite pour une nuit inoubliable !</p>
        `,
        attachments: [
          {
            filename: `Billet_${session.metadata.lastName || "Client"}.pdf`,
            content: pdfBuffer.toString("base64"),
          },
        ],
      });

      console.log("📧 Mail envoyé à :", session.customer_details.email);
    } catch (err) {
      console.error("🔥 Erreur lors du traitement :", err);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
