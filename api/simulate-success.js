import fs from "fs";
import path from "path";
import QRCode from "qrcode";
import PDFDocument from "pdfkit";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function parseForm(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => (body += chunk.toString()));
    req.on("end", () => {
      try {
        const data = new URLSearchParams(body);
        const obj = {};
        for (const [k, v] of data.entries()) obj[k] = v;
        resolve(obj);
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const form = await parseForm(req);
    const email = form.email || "test@example.com";
    const sessionId = form.session_id || `FAKE-${Date.now()}`;
    const type = form.type || "INDIVIDUEL";

    console.log(`[SIMUL] Paiement reçu pour ${email} (${sessionId}) type=${type}`);

    const filePath = path.join("/tmp", `ticket-${sessionId}.pdf`);
    const qr = await QRCode.toDataURL(sessionId);

    await new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 0 });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      if (type === "VIP") {
        // Fond doré
        const grad = doc.linearGradient(0, 0, doc.page.width, doc.page.height);
        grad.stop(0, "#facc15").stop(1, "#ca8a04");
        doc.rect(0, 0, doc.page.width, doc.page.height).fill(grad);

        doc.fillColor("black").fontSize(28).text("Soirée Rave @ GVA Paintball", 60, 100, {
          align: "center", width: doc.page.width - 120
        });

        const bandY = 280;
        doc.rect(80, bandY, doc.page.width - 160, 50).fill("#000000");
        doc.fillColor("white").fontSize(18).text("VIP - Soirée Rave", 90, bandY + 15, {
          align: "center", width: doc.page.width - 180
        });

        const qrBuffer = Buffer.from(qr.split(",")[1], "base64");
        doc.image(qrBuffer, (doc.page.width - 200) / 2, bandY + 80, { fit: [200, 200] });

        doc.fillColor("black").fontSize(12).text(
          `Email: ${email}\nTransaction: ${sessionId}\nDate: Samedi 18 octobre 2025 • 20:00\nLieu: Chemin des Coquelicots 29, 1214 Vernier\nAccès VIP : backstage + boissons incluses`,
          60, 200, { align: "center", width: doc.page.width - 120 }
        );

      } else {
        // INDIVIDUEL classique
        const grad = doc.linearGradient(0, 0, doc.page.width, doc.page.height);
        grad.stop(0, "#0f172a").stop(0.5, "#581c87").stop(1, "#16a34a");
        doc.rect(0, 0, doc.page.width, doc.page.height).fill(grad);

        doc.fillColor("#22c55e").fontSize(28).text("Soirée Rave @ GVA Paintball", 60, 100, {
          align: "center", width: doc.page.width - 120
        });

        doc.fillColor("#e2e8f0").fontSize(14).text("Billet électronique", { align: "center" });
        doc.fillColor("#cbd5e1").fontSize(12).text(
          `Email: ${email}\nTransaction: ${sessionId}\nDate: Samedi 18 octobre 2025 • 20:00\nLieu: Chemin des Coquelicots 29, 1214 Vernier`,
          { align: "center" }
        );

        const bandY = 280;
        doc.rect(80, bandY, doc.page.width - 160, 50).fill("#16a34a");
        doc.fillColor("white").fontSize(18).text("INDIVIDUEL - Soirée Rave", 90, bandY + 15, {
          align: "center", width: doc.page.width - 180
        });

        const qrBuffer = Buffer.from(qr.split(",")[1], "base64");
        doc.image(qrBuffer, (doc.page.width - 200) / 2, bandY + 80, { fit: [200, 200] });
      }

      // Footer commun
      doc.fillColor("#9ca3af").fontSize(12).text(
        "Sponsorisé par GVA Paintball",
        60,
        doc.page.height - 80,
        { align: "center", width: doc.page.width - 120 }
      );

      try {
        doc.image(path.join(process.cwd(), "terrain_GE_gvapaintball_01.png"),
          doc.page.width / 2 - 50, doc.page.height - 140,
          { fit: [100, 100], align: "center" }
        );
      } catch {}

      doc.end();
      stream.on("finish", resolve);
      stream.on("error", reject);
    });

    const pdfBuffer = fs.readFileSync(filePath);
    const pdfBase64 = pdfBuffer.toString("base64");

    await resend.emails.send({
      from: "Rave@GVAPaintball <confirmation@dias-lab.ch>",
      to: email,
      subject: `Ton billet ${type} - Soirée Rave @ GVA Paintball`,
      html: `
        <p>Merci pour ta réservation.</p>
        <p>Ton billet (${type}) est en pièce jointe (PDF avec QR code).</p>
        <p style="font-size:12px;color:#666">Sponsorisé par GVA Paintball</p>
      `,
      attachments: [
        { filename: `ticket-${sessionId}.pdf`, content: pdfBase64 }
      ],
    });

    console.log(`[MAIL] Billet ${type} envoyé à ${email}`);

    res.writeHead(302, { Location: "/success.html" });
    res.end();
  } catch (err) {
    console.error("[simulate-success] Erreur :", err);
    res.status(500).json({ error: "Erreur interne simulate-success" });
  }
}
