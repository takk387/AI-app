import type { Metadata } from 'next';
import './globals.css';
import ErrorBoundary from '../components/ErrorBoundary';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { SettingsProvider } from '../contexts/SettingsContext';
import { DevTools } from '../components/dev/DevTools';

export const metadata: Metadata = {
  title: 'AI App Builder',
  description: 'Build React components and apps using AI - the right way',
  manifest: '/manifest.json',
  themeColor: '#1e40af',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'AI Builder',
  },
  icons: {
    icon: [
      { url: '/icons/icon-72x72.svg', sizes: '72x72', type: 'image/svg+xml' },
      { url: '/icons/icon-96x96.svg', sizes: '96x96', type: 'image/svg+xml' },
      { url: '/icons/icon-192x192.svg', sizes: '192x192', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/icons/icon-152x152.svg', sizes: '152x152', type: 'image/svg+xml' },
      { url: '/icons/icon-192x192.svg', sizes: '192x192', type: 'image/svg+xml' },
    ],
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans">
        <ThemeProvider>
          <SettingsProvider>
            <AuthProvider>
              <ErrorBoundary>
                {/* DevTools outside AuthGuard so it always renders in dev mode */}
                <DevTools />
                {children}
              </ErrorBoundary>
            </AuthProvider>
          </SettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
