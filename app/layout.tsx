import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AuthProvider } from "@/context/AuthContext";
import { NarasumberProvider } from "@/context/NarasumberContext";
import { ToastProvider } from "@/context/ToastContext";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PageTransition } from "@/components/PageTransition";
import { AuthGate } from "@/components/AuthGate";

export const metadata: Metadata = {
  title: {
    default: "TVRI Kaltim — Manajemen Narasumber Siaran",
    template: "%s | TVRI Kaltim",
  },
  description:
    "Sistem manajemen narasumber siaran TVRI Kalimantan Timur, Samarinda. Dengan pembatasan jeda penampilan minimal 3 bulan antar siaran.",
};

const themeScript = `
try {
  var t = localStorage.getItem('tvri-kaltim-theme');
  if (t === 'dark') document.documentElement.classList.add('dark');
} catch (e) {}
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-screen flex-col">
        <ToastProvider>
          <AuthProvider>
            <AuthGate>
              <NarasumberProvider>
                <Navbar />
                <div className="flex-1" data-main="true">
                  <PageTransition>{children}</PageTransition>
                </div>
                <Footer />
              </NarasumberProvider>
            </AuthGate>
            </AuthProvider>
          </ToastProvider>
      </body>
    </html>
  );
}
