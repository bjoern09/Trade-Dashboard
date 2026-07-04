import "./globals.css";

export const metadata = {
  title: "Elliott-Wellen & Fundamentaldaten Dashboard",
  description: "Edukatives Analyse-Tool: Elliott-Wellen-Phase kombiniert mit einer Fundamentaldaten-Scorecard."
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
