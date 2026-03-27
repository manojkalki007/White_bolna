import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/providers/AuthProvider';
import Providers from '@/providers/ReactQueryProvider';
import { ToastProvider } from '@/providers/ToastProvider';
import AppShell from '@/components/layout/AppShell';
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: 'Cogniflow — Voice AI Platform',
  description: 'White-label AI Voice SaaS powered by Bolna API',
  keywords: ['voice ai', 'call campaigns', 'ai agents', 'bolna', 'telephony'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("h-full dark", "font-sans", geist.variable)}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,300;0,14..32,400;0,14..32,500;0,14..32,600;0,14..32,700;0,14..32,800&display=swap" rel="stylesheet" />
      </head>
      <body className="h-full">
        <AuthProvider>
          <Providers>
            <ToastProvider>
              <AppShell>{children}</AppShell>
            </ToastProvider>
          </Providers>
        </AuthProvider>
      </body>
    </html>
  );
}

