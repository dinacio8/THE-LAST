"use client";

import { useEffect, useState } from "react";
import QrScanner from "qr-scanner";

const ADMIN_PASSWORD = "GvaPaintball2025."; // 🧠 même que ta page admin

export default function ScanPage() {
  const [isLogged, setIsLogged] = useState(false);
  const [password, setPassword] = useState("");
  const [scanner, setScanner] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  // 🔓 Connexion
  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setIsLogged(true);
      setError("");
      localStorage.setItem("isScannerAdmin", "true");
    } else {
      setError("Mot de passe incorrect ❌");
    }
  };

  // 🚪 Déconnexion
  const handleLogout = () => {
    localStorage.removeItem("isScannerAdmin");
    setIsLogged(false);
    if (scanner) scanner.stop();
  };

  // 🧠 Démarre le scanner
  useEffect(() => {
    if (!isLogged) return;

    const videoElem = document.getElementById("video");
    if (!videoElem) return;

    const newScanner = new QrScanner(
      videoElem,
      async (result) => {
        console.log("QR détecté:", result.data);
        await handleScan(result.data);
      },
      { highlightScanRegion: true, highlightCodeOutline: true }
    );

    newScanner.start().then(() => console.log("📷 Scanner actif"));
    setScanner(newScanner);

    return () => {
      newScanner.stop();
    };
  }, [isLogged]);

  // 📡 Appel API pour vérifier le billet
  const handleScan = async (data) => {
    try {
      setResult({ message: "⏳ Vérification en cours...", color: "text-gray-500" });

      // Récupère l'id depuis l'URL dans le QR code
      const url = new URL(data);
      const id = url.searchParams.get("id");

      if (!id) {
        setResult({ message: "❌ QR invalide", color: "text-red-600" });
        return;
      }

      const res = await fetch(`/api/scan-ticket?id=${id}`);
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || "Erreur serveur");

      if (json.valid) {
        setResult({
          message: `✅ Billet valide : ${json.order.first_name} ${json.order.last_name}`,
          color: "text-green-600",
        });
      } else {
        setResult({
          message: json.message,
          color: "text-red-600",
        });
      }
    } catch (err) {
      console.error("Erreur scan:", err);
      setResult({ message: "⚠️ Erreur lors du scan", color: "text-red-600" });
    }
  };

  return (
    <main className="bg-gray-900 text-white min-h-screen flex flex-col items-center justify-center p-6">
      {!isLogged ? (
        <div className="bg-white text-gray-900 p-6 rounded-lg shadow-lg w-full max-w-sm text-center">
          <h1 className="text-2xl font-bold text-green-600 mb-4">
            Accès scanner
          </h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe"
            className="border border-gray-300 rounded-md w-full p-2 mb-3"
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
          <button
            onClick={handleLogin}
            className="bg-green-600 hover:bg-green-700 text-white w-full py-2 rounded-md font-semibold"
          >
            Connexion
          </button>
          {error && <p className="text-red-600 mt-3">{error}</p>}
        </div>
      ) : (
        <div className="w-full max-w-lg text-center">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-green-500">🎫 Scanner de billets</h2>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-md"
            >
              Déconnexion
            </button>
          </div>

          <video id="video" className="w-full rounded-lg border-2 border-green-500 shadow-lg"></video>

          {result && (
            <p className={`mt-4 text-lg font-semibold ${result.color}`}>
              {result.message}
            </p>
          )}
        </div>
      )}
    </main>
  );
}
