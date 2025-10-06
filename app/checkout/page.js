"use client";

import { useState } from "react";

export default function CheckoutPage() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    address: "",
    email: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const API_URL = "https://evenement.gvapaintball.com/api/checkout-session";

  const handleChange = (e) => {
    setForm({ ...form, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const orderData = {
      ...form,
      type: new URLSearchParams(window.location.search).get("type") || "INDIVIDUEL",
    };

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      if (!res.ok) {
        setMessage(`Erreur du serveur (${res.status})`);
        setLoading(false);
        return;
      }

      const session = await res.json();

      if (session && session.url) {
        window.location.href = session.url; // 🔥 redirection Stripe
      } else {
        setMessage("Erreur : URL Stripe introuvable.");
      }
    } catch (err) {
      setMessage("Erreur de communication avec le serveur.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
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
      <main className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="bg-white shadow-xl rounded-xl p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-green-600 text-center mb-4">
            Paiement sécurisé
          </h1>
          <p className="text-center text-gray-500 mb-6">
            💳 Paiement sécurisé par carte, Apple Pay, Google Pay et Twint
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {["firstName", "lastName", "address", "email"].map((id) => (
              <input
                key={id}
                id={id}
                type={id === "email" ? "email" : "text"}
                placeholder={
                  id === "firstName"
                    ? "Prénom"
                    : id === "lastName"
                    ? "Nom"
                    : id === "address"
                    ? "Adresse complète"
                    : "Email"
                }
                value={form[id]}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-md p-2"
              />
            ))}

            <button
              type="submit"
              disabled={loading}
              className={`w-full ${
                loading ? "bg-green-400" : "bg-green-600 hover:bg-green-700"
              } text-white font-bold py-3 rounded-lg transition-all duration-200`}
            >
              {loading ? "Traitement..." : "Confirmer la commande"}
            </button>
          </form>

          {message && (
            <div
              className={`mt-4 text-center text-sm ${
                message.includes("Erreur")
                  ? "text-red-600"
                  : "text-green-600"
              }`}
            >
              {message}
            </div>
          )}
        </div>
      </main>

      {/* FOOTER */}
      <footer className="bg-gray-100 p-6 text-center text-sm text-gray-500">
        © 2025 The Last — Tous droits réservés
      </footer>
    </div>
  );
}
