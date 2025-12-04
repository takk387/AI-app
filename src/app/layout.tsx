import type { Metadata } from "next";
import "./globals.css";
import AuthGuard from "../components/AuthGuard";
import ErrorBoundary from "../components/ErrorBoundary";
import { AuthProvider } from "../contexts/AuthContext";
import { ThemeProvider } from "../contexts/ThemeContext";
import { SettingsProvider } from "../contexts/SettingsContext";
import { DevTools } from "../components/dev/DevTools";

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
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans">
        <ThemeProvider>
          <SettingsProvider>
            <AuthProvider>
              <ErrorBoundary>
                {/* DevTools outside AuthGuard so it always renders in dev mode */}
                <DevTools />
                <AuthGuard>
                  <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 dark:from-slate-900 dark:via-blue-900 dark:to-slate-900 transition-colors duration-300">
                    {children}
                  </div>
                </AuthGuard>
              </ErrorBoundary>
            </AuthProvider>
          </SettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
