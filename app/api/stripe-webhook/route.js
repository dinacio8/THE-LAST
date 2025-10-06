import Stripe from "stripe";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { Pool } from "pg";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";

// Important pour que Next.js ne tente pas de le rendre statiquement
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

    try {
      // Génère un QR code avec lien vers la page succès
      const qrDataUrl = await QRCode.toDataURL(
        `https://evenement.gvapaintball.com/success?session_id=${session.id}`
      );

      // 🧾 Création du billet PDF
      const pdfBuffer = await new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: "A4", margin: 50 });
        const chunks = [];
        doc.on("data", (chunk) => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", (err) => reject(err));

        // ✅ Empêche PDFKit de tenter de charger Helvetica
        doc.font("Courier");

        // Titre
        doc.fontSize(22).fillColor("#22c55e").text("🎟 The Last @ GVA Paintball", { align: "center" });
        doc.moveDown();

        // Infos générales
        doc.fontSize(12).fillColor("black");
        doc.text(`Billet : ${session.metadata.type}`, { align: "center" });
        doc.text(`Date : Samedi 18 octobre 2025`, { align: "center" });
        doc.text(`Lieu : GVA Paintball, Genève`, { align: "center" });
        doc.moveDown();

        // Client
        doc.text(`Nom : ${session.metadata.firstName} ${session.metadata.lastName}`, { align: "center" });
        doc.text(`Email : ${session.customer_details.email}`, { align: "center" });
        doc.moveDown();

        // Paiement
        doc.text(`Montant payé : ${session.amount_total / 100} CHF`, { align: "center" });
        doc.moveDown(2);

        // QR Code
        doc.image(qrDataUrl, {
          fit: [150, 150],
          align: "center",
          valign: "center",
        });

        doc.moveDown(2);
        doc.fontSize(10).fillColor("#555").text(
          "Présente ce billet avec le QR code à l’entrée. Merci pour ta réservation !",
          { align: "center" }
        );

        doc.end();
      });

      // 📦 Enregistrement en base Neon
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
        console.log("🗃 Commande insérée :", result.rows[0]);
      } else {
        console.warn("⚠️ Ligne déjà existante pour cette session :", session.id);
      }

      // 📧 Envoi du mail avec pièce jointe PDF
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
          <p>Présente ton billet (avec le QR code) à l’entrée.</p>
          <br>
          <p>🎶 À très vite pour une nuit inoubliable !</p>
        `,
        attachments: [
          {
            filename: `Billet_${session.metadata.lastName || "Client"}.pdf`,
            content: pdfBuffer.toString("base64"),
          },
        ],
      });

      console.log("📧 Mail avec billet envoyé à", session.customer_details.email);
    } catch (err) {
      console.error("🔥 Erreur lors de la génération/envoi :", err);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
