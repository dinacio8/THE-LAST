import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";

// ✅ Fonction pour générer un billet (ticket)
async function generateTicket(ticketId, buyer, type) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: [400, 200],
        margin: 20,
      });

      const filePath = path.join("/tmp", ⁠ ticket-${ticketId}.pdf ⁠);
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Dégradé vert
      const gradient = doc.linearGradient(0, 0, 400, 0);
      gradient.stop(0, "#2ecc71").stop(1, "#27ae60");
      doc.rect(0, 0, 400, 200).fill(gradient);

      // Logo GVA Paintball
      const logoPath = path.join(process.cwd(), "terrain_GE_gvapaintball_01.png");
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 20, 20, { width: 60 });
      }

      // Titre de l’événement
      doc
        .fillColor("white")
        .fontSize(20)
        .font("Helvetica-Bold")
        .text("🎉 THE LAST 🎉", 100, 25);

      // Infos principales
      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("white")
        .text(⁠ Nom : ${buyer.firstName} ${buyer.lastName} ⁠, 20, 100)
        .text(⁠ Type : ${type} ⁠, 20, 115)
        .text(⁠ Adresse : ${buyer.address} ⁠, 20, 130)
        .text("Date : 18 octobre 2025 dès 19h", 20, 145)
        .text("Lieu : GVA Paintball, Vernier (Genève)", 20, 160);

      // QR code
      const qrData = await QRCode.toDataURL(⁠ Ticket ID: ${ticketId} ⁠);
      const qrImage = qrData.replace(/^data:image\/png;base64,/, "");
      const qrBuffer = Buffer.from(qrImage, "base64");
      doc.image(qrBuffer, 300, 90, { width: 70 });

      doc.end();

      stream.on("finish", () => resolve(filePath));
      stream.on("error", reject);
    } catch (err) {
      reject(err);
    }
  });
}

// ✅ Fonction pour générer une facture
async function generateInvoice(invoiceId, buyer, type, price) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40 });
      const filePath = path.join("/tmp", ⁠ invoice-${invoiceId}.pdf ⁠);
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Logo + En-tête
      const logoPath = path.join(process.cwd(), "terrain_GE_gvapaintball_01.png");
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 40, 30, { width: 80 });
      }

      doc
        .fontSize(18)
        .fillColor("#27ae60")
        .font("Helvetica-Bold")
        .text("FACTURE", 400, 40, { align: "right" });

      // Infos société
      doc
        .fontSize(10)
        .fillColor("#333")
        .font("Helvetica")
        .text("GVA Paintball", 40, 120)
        .text("Chemin des Coquelicots 29", 40, 135)
        .text("1214 Vernier, Suisse", 40, 150)
        .moveDown();

      // Infos client
      doc.text(⁠ Facturé à : ⁠, 300, 120, { align: "left" });
      doc.text(⁠ ${buyer.firstName} ${buyer.lastName} ⁠, 300, 135);
      doc.text(buyer.address, 300, 150);
      doc.text(buyer.email, 300, 165);

      // Ligne séparatrice
      doc.moveTo(40, 200).lineTo(550, 200).strokeColor("#ccc").stroke();

      // Détails facture
      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .fillColor("#000")
        .text(⁠ Facture n° : ${invoiceId} ⁠, 40, 220)
        .text(⁠ Date : ${new Date().toLocaleDateString("fr-CH")} ⁠, 40, 240)
        .moveDown();

      // Tableau des articles
      const totalHT = price;
      const tva = totalHT * 0.077;
      const totalTTC = totalHT + tva;

      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#000")
        .text("Description", 40, 280)
        .text("Quantité", 250, 280)
        .text("Prix (CHF)", 350, 280)
        .text("Total (CHF)", 450, 280)
        .moveTo(40, 295)
        .lineTo(550, 295)
        .strokeColor("#ccc")
        .stroke();

      doc
        .text(⁠ Billet ${type} ⁠, 40, 310)
        .text("1", 250, 310)
        .text(price.toFixed(2), 350, 310)
        .text(price.toFixed(2), 450, 310);

      // Totaux
      doc
        .font("Helvetica-Bold")
        .text("Sous-total", 350, 350)
        .text(totalHT.toFixed(2), 450, 350)
        .font("Helvetica")
        .text("TVA (7.7%)", 350, 365)
        .text(tva.toFixed(2), 450, 365)
        .font("Helvetica-Bold")
        .text("TOTAL TTC", 350, 385)
        .text(totalTTC.toFixed(2), 450, 385);

      // Pied de page
      doc
        .fontSize(9)
        .fillColor("#555")
        .text(
          "Merci pour votre confiance ! Le paiement a été reçu via Stripe. Cette facture vaut reçu.",
          40,
          450,
          { width: 500, align: "center" }
        );

      doc.end();

      stream.on("finish", () => resolve(filePath));
      stream.on("error", reject);
    } catch (err) {
      reject(err);
    }
  });
}

// ✅ Export compatible ESM
export { generateTicket, generateInvoice };
