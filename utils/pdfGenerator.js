import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import path from "path";

function formatCHF(n) {
  return `${Number(n).toFixed(2)} CHF`;
}

/**
 * Génère un billet INDIVIDUEL (style concert)
 */
export async function generateTicketBuffer(ticketIdRaw, buyer = {}, type = "INDIVIDUEL") {
  const ticketId = String(ticketIdRaw || `T-${Date.now()}`);
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: [500, 200], margin: 0 });
      const buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      // Dégradé de fond (vert foncé → vert clair)
      const gradient = doc.linearGradient(0, 0, 500, 200);
      gradient.stop(0, "#0f9d58").stop(1, "#34d399");
      doc.rect(0, 0, 500, 200).fill(gradient);

      // Logo
      try {
        const logoPath = path.join(process.cwd(), "terrain_GE_gvapaintball_01.png");
        doc.image(logoPath, 20, 20, { width: 60 });
      } catch {
        console.warn("⚠️ Logo introuvable pour le billet");
      }

      // Titre
      doc.fillColor("#fff").fontSize(22).font("Helvetica-Bold")
        .text("THE LAST @ GVA Paintball", 100, 25);

      // Infos billet
      doc.fontSize(14).font("Helvetica").fillColor("#fff");
      doc.text(`Billet ${type}`, 100, 60);
      doc.text(`Nom : ${buyer.firstName || "-"} ${buyer.lastName || "-"}`, 100, 85);
      doc.text(`Email : ${buyer.email || "-"}`, 100, 105);
      doc.text(`Date : 18 octobre 2025`, 100, 125);
      doc.text(`Heure : 19h00`, 100, 145);
      doc.text(`Lieu : GVA Paintball, Genève`, 100, 165);

      // QR code
      try {
        const qr = await QRCode.toDataURL(`THELAST-${ticketId}`);
        const qrBuffer = Buffer.from(qr.split(",")[1], "base64");
        doc.image(qrBuffer, 380, 50, { width: 100 });
      } catch {
        doc.fillColor("red").fontSize(10).text("QR code indisponible", 380, 100);
      }

      // Numéro billet
      doc.fontSize(10).fillColor("#fff").text(`N° ${ticketId}`, 380, 160);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Génère une facture PDF (TTC uniquement)
 */
export async function generateInvoiceBuffer(invoiceIdRaw, buyer = {}, type = "INDIVIDUEL", price = 5) {
  const invoiceId = String(invoiceIdRaw || `FAC-${Date.now()}`);
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      // Logo
      try {
        const logoPath = path.join(process.cwd(), "terrain_GE_gvapaintball_01.png");
        doc.image(logoPath, 50, 30, { width: 80 });
      } catch {
        console.warn("⚠️ Logo introuvable pour la facture");
      }

      // En-tête
      doc.fontSize(20).fillColor("#0f9d58").font("Helvetica-Bold")
        .text("FACTURE - THE LAST", 150, 40);
      doc.fontSize(12).fillColor("#000").font("Helvetica")
        .text(`Numéro : ${invoiceId}`, 50, 120)
        .text(`Date : ${new Date().toLocaleDateString("fr-CH")}`, 50, 135);

      // Client
      doc.moveDown(2);
      doc.fontSize(14).fillColor("#0f9d58").font("Helvetica-Bold").text("Facturé à :");
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor("#000").font("Helvetica")
        .text(`${buyer.firstName || ""} ${buyer.lastName || ""}`)
        .text(buyer.address || "")
        .text(buyer.email || "");

      // Tableau
      doc.moveDown(3);
      const tableTop = doc.y;
      doc.fontSize(12).font("Helvetica-Bold").fillColor("#000");
      doc.text("Description", 50, tableTop);
      doc.text("Quantité", 250, tableTop);
      doc.text("Prix unitaire", 330, tableTop);
      doc.text("Total", 430, tableTop);

      doc.moveDown(0.5).font("Helvetica").fontSize(12);
      doc.text(`Billet ${type}`, 50, doc.y);
      doc.text("1", 250, doc.y);
      doc.text(formatCHF(price), 330, doc.y);
      doc.text(formatCHF(price), 430, doc.y);

      // Total final
      doc.moveDown(2);
      doc.font("Helvetica-Bold").text(`Montant total TTC : ${formatCHF(price)}`, 330);

      // Footer
      doc.moveDown(5);
      doc.fontSize(10).fillColor("#555").font("Helvetica")
        .text("Merci pour ton achat !", { align: "center" })
        .text("Présente ton billet le 18 octobre 2025 dès 19h à l’entrée de THE LAST.", { align: "center" });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
