import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthGuard from "./auth-guard";
import { FiHome, FiShoppingCart, FiBox, FiCalendar, FiUsers, FiLayers, FiDatabase, FiCreditCard, FiStar } from "react-icons/fi";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BazarChowk Admin",
  description: "BazarChowk Super App — Admin Control Panel",
};

const menuItems = [
  { icon: <FiHome />, label: "Dashboard", href: "/" },
  { icon: <FiShoppingCart />, label: "Orders", href: "/orders" },
  { icon: <FiBox />, label: "Products", href: "/products" },
  { icon: <FiCalendar />, label: "Appointments", href: "/appointments" },
  { icon: <FiUsers />, label: "Shops", href: "/shops" },
  { icon: <FiLayers />, label: "Categories", href: "/categories" },
  { icon: <FiDatabase />, label: "Inventory", href: "/inventory" },
  { icon: <FiCreditCard />, label: "Payments", href: "/payments" },
  { icon: <FiStar />, label: "Reviews", href: "/reviews" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  );
}
