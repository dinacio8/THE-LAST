import "./globals.css";

export const metadata = {
  title: "The Last @ GVA Paintball - 18 octobre 2025",
  description:
    "The Last @ GVA Paintball, Genève — Samedi 18 octobre 2025 dès 19h. Nuit électro avec DJs, bar et dancefloor. Billets en ligne, paiement sécurisé.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body className="bg-gray-50 text-gray-900">
        <header className="bg-white shadow fixed top-0 w-full z-50">
          <div className="max-w-6xl mx-auto flex justify-between items-center p-4">
            <a href="/" className="flex items-center gap-4">
              <img
                src="/terrain_GE_gvapaintball_01.png"
                alt="Logo GVA Paintball"
                className="h-10 md:h-16 lg:h-20 object-contain"
              />
              <span className="font-bold text-green-600 text-lg md:text-2xl">
                The Last
              </span>
            </a>
          </div>
        </header>

        <main className="pt-28 min-h-screen">{children}</main>

        <footer className="bg-gray-100 p-6 text-center text-sm text-gray-500 mt-10">
          © 2025 GVA Paintball — Tous droits réservés
        </footer>
      </body>
    </html>
  );
}
