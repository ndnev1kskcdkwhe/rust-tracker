import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { HomeButton } from "./HomeButton";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { getServerLocale } from "@/lib/i18n/serverLocale";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rust Tracker",
  description: "Пошук гравців і серверів Rust + ігрові калькулятори",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getServerLocale();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers locale={locale}>
          <HomeButton />
          {children}
          <LanguageSwitcher />
        </Providers>
      </body>
    </html>
  );
}
