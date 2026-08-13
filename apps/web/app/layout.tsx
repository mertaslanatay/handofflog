import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Handofflog",
  description: "Figma tasarım değişikliklerini ekibin için nokta atışı changelog'a çevir.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
