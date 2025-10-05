import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";

// ✅ Génère un billet PDF (format paysage vert dégradé)
async function generateTicket(ticketId, buyer, type) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: [400, 200],
        margin: 20,
      });

      const filePath = path.join("/tmp", `ticket-${ticketId}.pdf`);
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Dégradé vert
      const gradient = doc.linearGradient(0, 0, 400, 0);
      gradient.stop(0, "#2ecc71").stop(1, "#27ae60");
      doc.rect(0, 0, 400, 200).fill(gradient);

      // Logo GVA Paintball (doit exister à la racine du projet)
      const logoPath = path.join(process.cwd(), "terrain_GE_gvapaintball_01.png");
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 20, 20, { width: 60 });
      }

      // Titre
      doc
        .fillColor("white")
        .fontSize(22)
        .font("Helvetica-Bold")
        .text("🎉 THE LAST 🎉", 100, 25);

      // Infos billet
      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("white")
        .text(`Nom : ${buyer.firstName} ${buyer.lastName}`, 20, 100)
        .text(`Type : ${type}`, 20, 115)
        .text(`Adresse : ${buyer.address}`, 20, 130)
        .text("Date : 18 octobre 2025 dès 19h", 20, 145)
        .text("Lieu : GVA Paintball, Vernier (Genève)", 20, 160);

      // QR code
      const qrData = await QRCode.toDataURL(`Ticket ID: ${ticketId}`);
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

// ✅ Génère une facture PDF (propre et professionnelle)
async function generateInvoice(invoiceId, buyer, type, price) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40 });
      const filePath = path.join("/tmp", `invoice-${invoiceId}.pdf`);
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Logo + entête
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
        .text("GVA Paintball", 400, 70, { align: "right" })
        .text("Chemin des Coquelicots 29", { align: "right" })
        .text("1214 Vernier, Suisse", { align: "right" })
        .text("evenement@gvapaintball.com", { align: "right" });

      // Infos client
      doc.fontSize(12).fillColor("#000").text(`${buyer.firstName} ${buyer.lastName}`, 40, 150);
      doc.text(buyer.address);
      doc.text(buyer.email);
      doc.moveDown();

      // Détails facture
      doc
        .fontSize(12)
        .text(`Facture n° : ${invoiceId}`, 400, 150, { align: "right" })
        .text(`Date : ${new Date().toLocaleDateString("fr-CH")}`, { align: "right" });

      doc.moveDown(2);
      doc.fontSize(14).fillColor("#27ae60").text("Détail de la commande", 40, 200);

      // Tableau produits
      doc.fontSize(12).fillColor("#000");
      doc.text("Description", 40, 230);
      doc.text("Quantité", 300, 230);
      doc.text("Prix (CHF)", 400, 230, { align: "right" });

      doc.moveTo(40, 245).lineTo(550, 245).strokeColor("#ccc").stroke();

      doc.text(`Billet ${type}`, 40, 260);
      doc.text("1", 320, 260);
      doc.text(price.toFixed(2), 470, 260, { align: "right" });

      // Total TTC
      doc.moveTo(40, 290).lineTo(550, 290).strokeColor("#ccc").stroke();
      doc.font("Helvetica-Bold").text("Total TTC", 400, 310);
      doc.text(`${price.toFixed(2)} CHF`, 470, 310, { align: "right" });

      // Pied de page
      doc
        .fontSize(10)
        .fillColor("#555")
        .text("Merci pour votre participation à THE LAST !", 40, 400)
        .text("Paiement reçu via Stripe / Twint.", 40, 415)
        .text("Cette facture fait office de reçu officiel.", 40, 430)
        .text("GVA Paintball — TVA CHE-123.456.789", 40, 460, { align: "center" });

      doc.end();

      stream.on("finish", () => resolve(filePath));
      stream.on("error", reject);
    } catch (err) {
      reject(err);
    }
  });
}

// ✅ Export propre et explicite (ESM)
export { generateTicket, generateInvoice };
