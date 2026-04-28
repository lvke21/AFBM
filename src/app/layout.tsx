import type { Metadata } from "next";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "AFBM Manager",
  description: "Initiales Web-App-Grundgeruest fuer ein American-Football-Manager-Spiel.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
