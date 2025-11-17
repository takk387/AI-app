import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthGuard from "../components/AuthGuard";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Personal AI App Builder",
  description: "Build React components and apps using AI - the right way",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900`}>
        <AuthGuard>
          <div className="min-h-screen">
            {children}
          </div>
        </AuthGuard>
      </body>
    </html>
  );
}
