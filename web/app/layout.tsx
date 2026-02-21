import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "APEX — F1 Strategy Simulator",
  description: "Real-time F1 strategy & chaos simulator — Hacklytics 2026",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="bg-apex-bg antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
