import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toast";
import { QueryProvider } from "@/providers/query-provider";
import { AuthProvider } from "@/contexts/auth-context";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "LangSync - AI-Powered Translation Management",
    template: "%s | LangSync"
  },
  description: "Add 10 languages in 5 minutes. AI-powered translations that update without redeploying. Stop fighting with JSON files.",
  keywords: ["translation", "i18n", "internationalization", "localization", "AI translation", "translation management"],
  authors: [{ name: "LangSync" }],
  creator: "LangSync",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://langsync.xyz",
    title: "LangSync - AI-Powered Translation Management",
    description: "Add 10 languages in 5 minutes. AI-powered translations that update without redeploying.",
    siteName: "LangSync",
  },
  twitter: {
    card: "summary_large_image",
    title: "LangSync - AI-Powered Translation Management",
    description: "Add 10 languages in 5 minutes. AI-powered translations that update without redeploying.",
    creator: "@langsync",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased flex flex-col min-h-screen`}
      >
        <QueryProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </QueryProvider>
        <Toaster />
      </body>
    </html>
  );
}
