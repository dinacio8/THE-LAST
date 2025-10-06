"use client";
import { useEffect } from "react";

export default function SuccessPage() {
  useEffect(() => {
    async function loadStatus() {
      const params = new URLSearchParams(window.location.search);
      const session_id = params.get("session_id");

      if (!session_id) {
        document.getElementById("statusMsg").textContent =
          "❌ Impossible de retrouver les infos de commande.";
        return;
      }

      try {
        const res = await fetch(`/api/order-status?session_id=${session_id}`);
        const data = await res.json();

        if (!res.ok) {
          document.getElementById("statusMsg").textContent =
            "❌ Commande introuvable ou erreur serveur.";
          console.error(data);
          return;
        }

        document.getElementById("statusMsg").classList.add("hidden");
        document.getElementById("details").classList.remove("hidden");

        document.getElementById("name").textContent = `${data.firstName} ${data.lastName}`;
        document.getElementById("type").textContent = data.type;
        document.getElementById("price").textContent = data.price;
        document.getElementById("email").textContent = data.email;
        document.getElementById("invoice").textContent = data.invoice;
        document.getElementById("ticket").textContent = data.ticket;
        document.getElementById("sent").textContent =
          data.status === "sent" ? "✅ Envoyé" : "⏳ En cours d’envoi";
      } catch (err) {
        console.error("Erreur communication API:", err);
        document.getElementById("statusMsg").textContent =
          "⚠️ Erreur de communication avec le serveur.";
      }
    }

    loadStatus();
  }, []);

  return (
    <main className="bg-gray-50 text-gray-900 flex flex-col min-h-screen">
      {/* MAIN */}
      <section className="flex flex-col items-center justify-center flex-1 p-6 text-center">
        <h1 className="text-3xl font-bold text-green-600 mb-6">
          🎉 Paiement confirmé !
        </h1>
        <p id="statusMsg" className="text-lg text-gray-700">
          Chargement des informations...
        </p>

        <div
          id="details"
          className="hidden mt-6 bg-white shadow-lg rounded-lg p-6 max-w-md text-left"
        >
          <p>
            <strong>Nom :</strong> <span id="name"></span>
          </p>
          <p>
            <strong>Type de billet :</strong> <span id="type"></span>
          </p>
          <p>
            <strong>Prix :</strong> <span id="price"></span> CHF
          </p>
          <p>
            <strong>Email :</strong> <span id="email"></span>
          </p>
          <p>
            <strong>Facture :</strong> <span id="invoice"></span>
          </p>
          <p>
            <strong>Ticket :</strong> <span id="ticket"></span>
          </p>
          <p>
            <strong>Statut :</strong> <span id="sent"></span>
          </p>
        </div>

        <a
          href="/"
          className="mt-8 inline-block bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg"
        >
          Retour à l'accueil
        </a>
      </section>
    </main>
  );
}
