import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  Cormorant_Garamond,
  Plus_Jakarta_Sans,
  JetBrains_Mono,
} from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-serif",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ZARIYA Enterprise | Heritage Silk & Textile Customer Engagement Cloud",
  description:
    "Luxury Customer Engagement, Celebration Reminders, Personalized Coupon & WhatsApp Marketing Platform for multi-branch Indian silk saree and textile showrooms.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${jakarta.variable} ${jetbrains.variable}`}
    >
      <body className="bg-[#FAF7F0] text-[#252323] font-sans antialiased selection:bg-[#541326] selection:text-[#FAF7F0]">
        {children}
      </body>
    </html>
  );
}
