"use client";

import { useEffect, useState } from "react";

const ADMIN_PASSWORD = "GvaPaintball2025."; // 🔒 change-le si besoin

export default function AdminPage() {
  const [isLogged, setIsLogged] = useState(false);
  const [password, setPassword] = useState("");
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");

  // Vérifie si l'admin est déjà logué
  useEffect(() => {
    if (localStorage.getItem("isAdmin") === "true") {
      setIsLogged(true);
      loadOrders();
    }
  }, []);

  // 🔓 Connexion
  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      localStorage.setItem("isAdmin", "true");
      setIsLogged(true);
      setError("");
      loadOrders();
    } else {
      setError("Mot de passe incorrect ❌");
    }
  };

  // 🚪 Déconnexion
  const handleLogout = () => {
    localStorage.removeItem("isAdmin");
    setIsLogged(false);
    setPassword("");
    setOrders([]);
  };

  // 📦 Chargement des commandes
  const loadOrders = async () => {
    try {
      const res = await fetch("/api/admin-orders");
      if (!res.ok) throw new Error("Erreur API");
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      console.error("Erreur lors du chargement des commandes:", err);
    }
  };

  // 📊 Export Excel
  const exportExcel = () => {
    window.location.href = "/api/export-orders";
  };

  // 🧱 UI
  return (
    <div className="bg-gray-100 text-gray-900 min-h-screen">
      {!isLogged ? (
        // --- PAGE DE CONNEXION ---
        <div className="flex flex-col justify-center items-center h-screen">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-sm w-full text-center">
            <img
              src="/terrain_GE_gvapaintball_01.png"
              alt="logo"
              className="h-16 mx-auto mb-4"
            />
            <h2 className="text-2xl font-bold text-green-600 mb-4">
              Accès administrateur
            </h2>
            <input
              type="password"
              placeholder="Mot de passe"
              className="border border-gray-300 rounded-md w-full p-2 mb-4"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
            <button
              onClick={handleLogin}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-md"
            >
              Connexion
            </button>
            {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
          </div>
        </div>
      ) : (
        // --- PAGE ADMIN ---
        <div>
          <header className="bg-white shadow-md p-4 flex justify-between items-center sticky top-0 z-50">
            <div className="flex items-center gap-3">
              <img
                src="/terrain_GE_gvapaintball_01.png"
                alt="logo"
                className="h-10"
              />
              <h1 className="text-2xl font-bold text-green-600">
                ADMIN - THE LAST
              </h1>
            </div>
<div className="flex items-center gap-3">
  <button
    onClick={exportExcel}
    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
  >
    📊 Export Excel
  </button>
  <button
    onClick={() => window.location.href = "/api/download-all?type=ticket"}
    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
  >
    🎟 Tous les billets
  </button>
  <button
    onClick={() => window.location.href = "/api/download-all?type=invoice"}
    className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-md"
  >
    📄 Toutes les factures
  </button>
  <button
    onClick={handleLogout}
    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
  >
    🚪 Déconnexion
  </button>
</div>

          </header>

          <main className="p-6 overflow-x-auto">
            <h2 className="text-2xl font-bold text-center text-green-600 mb-6">
              Liste des commandes
            </h2>

            <div className="overflow-x-auto bg-white border border-gray-200 rounded-lg shadow-sm">
              <table className="min-w-full text-sm">
                <thead className="bg-green-600 text-white">
                  <tr>
                    <th className="py-2 px-3">ID</th>
                    <th className="py-2 px-3">Nom</th>
                    <th className="py-2 px-3">Email</th>
                    <th className="py-2 px-3">Prix</th>
                    <th className="py-2 px-3">Statut</th>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Billet</th>
                    <th className="py-2 px-3">Facture</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.length === 0 ? (
                    <tr>
                      <td
                        colSpan="8"
                        className="text-center py-6 text-gray-500 italic"
                      >
                        Aucune commande trouvée
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => (
                      <tr key={order.id}>
                        <td className="py-2 px-3 text-center">{order.id}</td>
                        <td className="py-2 px-3">
                          {order.first_name} {order.last_name}
                        </td>
                        <td className="py-2 px-3">{order.email}</td>
<td className="py-2 px-3 text-center">
  {order.price ? Number(order.price).toFixed(2) + " CHF" : "—"}
</td>

                        <td className="py-2 px-3 text-center">
                          {order.status || "—"}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {new Date(order.created_at).toLocaleString("fr-CH")}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <a
                            href={`/api/download-pdf?id=${order.id}&type=ticket`}
                            className="text-green-600 hover:underline"
                          >
                            🎟 Télécharger
                          </a>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <a
                            href={`/api/download-pdf?id=${order.id}&type=invoice`}
                            className="text-yellow-600 hover:underline"
                          >
                            📄 Télécharger
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
