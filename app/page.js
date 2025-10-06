export default function HomePage() {
  return (
    <section className="flex flex-col items-center justify-center text-center relative h-[70vh]">
      <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-yellow-400 opacity-90" />
      <div className="relative z-10 text-white px-4">
        <h1 className="text-5xl font-bold drop-shadow-lg">The Last</h1>
        <p className="mt-4 text-xl">
          Samedi 18 octobre 2025 — dès 19h — GVA Paintball
        </p>
        <a
          href="/checkout"
          className="mt-6 inline-block bg-white text-green-600 hover:bg-green-100 font-bold py-3 px-6 rounded-lg transition-all duration-200"
        >
          🎟 Réserver maintenant
        </a>
      </div>
    </section>
  );
}
