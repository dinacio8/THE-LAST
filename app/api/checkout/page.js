"use client";

import { useEffect } from "react";

export const metadata = {
  title: "Paiement sécurisé - The Last",
  description:
    "Paiement sécurisé pour The Last, samedi 18 octobre 2025 dès 19h à Genève.",
};

export default function CheckoutPage() {
  useEffect(() => {
    const API_URL = "https://evenement.gvapaintball.com/api/checkout-session";

    const form = document.getElementById("checkoutForm");
    const msgBox = document.getElementById("message");

    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      msgBox.classList.add("hidden");
      msgBox.textContent = "";

      const params = new URLSearchParams(window.location.search);
      const orderData = {
        firstName: document.getElementById("firstName").value.trim(),
        lastName: document.getElementById("lastName").value.trim(),
        address: document.getElementById("address").value.trim(),
        email: document.getElementById("email").value.trim(),
        type: params.get("type") || "INDIVIDUEL",
      };

      console.log("🧾 Données envoyées :", orderData);

      try {
        const response = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(orderData),
        });

        console.log("📡 Statut HTTP :", response.status);

        if (!response.ok) {
          const text = await response.text();
          console.error("⚠️ Erreur du serveur :", text);
          msgBox.textContent = `Erreur du serveur (${response.status})`;
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
      {/* HEADER */}
      <header className="bg-white shadow p-4 flex justify-between items-center">
        <a href="/" className="flex items-center gap-3">
          <img
            src="/terrain_GE_gvapaintball_01.png"
            alt="Logo GVA Paintball"
            className="h-10"
          />
          <span className="text-2xl font-bold text-green-600">The Last</span>
        </a>
      </header>

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
            <input
              type="text"
              id="firstName"
              placeholder="Prénom"
              required
              className="w-full border border-gray-300 rounded-md p-2"
            />
            <input
              type="text"
              id="lastName"
              placeholder="Nom"
              required
              className="w-full border border-gray-300 rounded-md p-2"
            />
            <input
              type="text"
              id="address"
              placeholder="Adresse complète"
              required
              className="w-full border border-gray-300 rounded-md p-2"
            />
            <input
              type="email"
              id="email"
              placeholder="Email"
              required
              className="w-full border border-gray-300 rounded-md p-2"
            />

            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-all duration-200"
            >
              Confirmer la commande
            </button>
          </form>

          <div id="message" className="hidden mt-4 text-center text-sm"></div>
        </div>
      </section>
    </main>
  );
}
