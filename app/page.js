export const metadata = {
  title: "The Last @ GVA Paintball - 18 octobre 2025",
  description:
    "The Last @ GVA Paintball, Genève — Samedi 18 octobre 2025 dès 19h. Nuit électro avec DJs, bar et dancefloor. Billets en ligne, paiement sécurisé.",
};

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      {/* HEADER */}
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

      {/* HERO */}
      <section className="h-[70vh] flex flex-col items-center justify-center text-center relative">
        <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-yellow-400 opacity-90" />
        <div className="relative z-10 text-white">
          <h1 className="text-5xl font-bold drop-shadow-lg">The Last</h1>
          <p className="mt-4 text-xl">
            Samedi 18 octobre 2025 — dès 19h — GVA Paintball
          </p>
          <a
            href="/checkout"
            className="mt-6 inline-block bg-white text-green-600 hover:bg-green-100 font-bold py-3 px-6 rounded-lg transition-all"
          >
            🎟 Réserver maintenant
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-100 p-6 text-center text-sm text-gray-500">
        © 2025 GVA Paintball — Tous droits réservés
      </footer>
    </main>
  );
}
