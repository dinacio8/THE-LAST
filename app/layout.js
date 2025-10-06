export const metadata = {
  title: "The Last @ GVA Paintball",
  description: "Soirée The Last @ GVA Paintball - Samedi 18 octobre 2025",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/terrain_GE_gvapaintball_01.png" type="image/png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
