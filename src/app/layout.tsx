import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0f172a",
};

export const metadata: Metadata = {
  title: "AEVAN Cleaning CRM | Mobile Enterprise Portal",
  description: "Secure, mobile-first CRM and Inventory Management System exclusively for AEVAN Cleaning and GOOD TOUCH Formulations.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AEVAN CRM",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-slate-50 text-slate-900 antialiased selection:bg-brand-600 selection:text-white flex flex-col">
        {children}
      </body>
    </html>
  );
}
