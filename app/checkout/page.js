"use client";
import { useEffect } from "react";

export default function CheckoutPage() {
  useEffect(() => {
    const form = document.getElementById("checkoutForm");
    const msgBox = document.getElementById("message");
    const API_URL = "https://evenement.gvapaintball.com/api/checkout-session";

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      msgBox.classList.add("hidden");
      msgBox.textContent = "";

      const orderData = {
        firstName: document.getElementById("firstName").value.trim(),
        lastName: document.getElementById("lastName").value.trim(),
        address: document.getElementById("address").value.trim(),
        email: document.getElementById("email").value.trim(),
        type: new URLSearchParams(window.location.search).get("type") || "INDIVIDUEL",
      };

      console.log("🧾 Données envoyées :", orderData);

      try {
        const response = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(orderData),
        });

        console.log("📡 Statut HTTP :", response.status);

        // 🧱 Si quota atteint -> popup stylée + effets
        if (response.status === 403) {
          const data = await response.json();

          // 🔊 Petit son “plop”
          const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          const oscillator = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          oscillator.type = "triangle";
          oscillator.frequency.setValueAtTime(480, audioCtx.currentTime);
          gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
          oscillator.connect(gain);
          gain.connect(audioCtx.destination);
          oscillator.start();
          oscillator.stop(audioCtx.currentTime + 0.25);

          // 📳 Vibration sur mobile
          if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

          // 💫 Popup
          const popup = document.createElement("div");
          popup.innerHTML = `
            <div style="
              position:fixed;
              top:50%;
              left:50%;
              transform:translate(-50%,-50%);
              background:white;
              border-radius:14px;
              box-shadow:0 8px 30px rgba(0,0,0,0.2);
              padding:30px 40px;
              font-family:sans-serif;
              text-align:center;
              z-index:9999;
              width:90%;
              max-width:360px;
              animation:fadeIn 0.3s ease;
              border-top:6px solid #22c55e;">
              
              <h2 id="theLastTitle" style="color:#22c55e;margin-top:0;font-size:20px;">
                🎫 Événement complet
              </h2>
              <p style="margin:15px 0;color:#333;font-size:15px;">
                ${data.error || "C’était le dernier... <b>The Last</b>, vraiment 😅"}
              </p>

              <button id="closePopup" style="
                background:#22c55e;
                color:white;
                border:none;
                padding:10px 20px;
                border-radius:6px;
                cursor:pointer;
                font-weight:bold;
                margin-top:10px;">
                OK
              </button>
            </div>
          `;

          // 🌈 Animation lumineuse subtile
          const style = document.createElement("style");
          style.innerHTML = `
            @keyframes fadeIn {
              from {opacity:0; transform:translate(-50%,-60%)}
              to {opacity:1; transform:translate(-50%,-50%)}
            }
            @keyframes glow {
              0%, 100% { text-shadow:0 0 6px #22c55e80; }
              50% { text-shadow:0 0 16px #22c55e; }
            }
          `;
          document.head.appendChild(style);
          document.body.appendChild(popup);

          document.getElementById("theLastTitle").style.animation = "glow 2s ease-in-out infinite";
          document.getElementById("closePopup").addEventListener("click", () => popup.remove());

          return;
        }

        if (!response.ok) {
          const text = await response.text();
          console.error("⚠️ Erreur du serveur :", text);
          msgBox.textContent = "Erreur du serveur (" + response.status + ")";
          msgBox.classList.remove("hidden");
          msgBox.classList.add("text-red-600");
          return;
        }

        const session = await response.json();
        console.log("✅ Réponse Stripe :", session);

        if (session && session.url) {
          console.log("➡️ Redirection vers Stripe :", session.url);
          window.location.href = session.url;
        } else {
          msgBox.textContent = "Erreur : l’URL Stripe est introuvable.";
          msgBox.classList.remove("hidden");
          msgBox.classList.add("text-red-600");
          console.error("Réponse inattendue :", session);
        }
      } catch (err) {
        console.error("❌ Erreur de communication avec le serveur :", err);
        msgBox.textContent = "Erreur de communication avec le serveur.";
        msgBox.classList.remove("hidden");
        msgBox.classList.add("text-red-600");
      }
    });
  }, []);

  return (
    <main className="bg-gray-50 text-gray-900 flex flex-col min-h-screen">
      {/* MAIN */}
      <section className="flex flex-col items-center justify-center flex-1 p-8">
        <div className="bg-white shadow-xl rounded-xl p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-green-600 text-center mb-4">
            Paiement sécurisé
          </h1>
          <p className="text-center text-gray-500 mb-6">
            💳 Paiement sécurisé par carte, Apple Pay, Google Pay et Twint
          </p>

          <form id="checkoutForm" className="space-y-4">
            <input type="text" id="firstName" placeholder="Prénom" required className="w-full border border-gray-300 rounded-md p-2" />
            <input type="text" id="lastName" placeholder="Nom" required className="w-full border border-gray-300 rounded-md p-2" />
            <input type="text" id="address" placeholder="Adresse complète" required className="w-full border border-gray-300 rounded-md p-2" />
            <input type="email" id="email" placeholder="Email" required className="w-full border border-gray-300 rounded-md p-2" />

            <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-all duration-200">
              Confirmer la commande
            </button>
          </form>

          <div id="message" className="hidden mt-4 text-center text-sm"></div>
        </div>
      </section>
    </main>
  );
}
