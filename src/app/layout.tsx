import type { Metadata, Viewport } from "next";
import { Hind_Siliguri, Space_Grotesk } from "next/font/google";
import { Toaster } from "sonner";

import { I18nProvider } from "@/components/providers/i18n-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { getLocale } from "@/lib/i18n/server";

import "./globals.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

/** Bangla needs its own face — the Latin display font has no Bengali glyphs. */
const bangla = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-bangla",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "CoachDesk",
    template: "%s · CoachDesk",
  },
  description: "Coaching centre management — batches, attendance, exams and finance in one place.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdf8ec" },
    { media: "(prefers-color-scheme: dark)", color: "#16150f" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();

  return (
    <html lang={locale} data-locale={locale} suppressHydrationWarning>
      <body className={`${display.variable} ${bangla.variable} antialiased`}>
        <ThemeProvider>
          <I18nProvider locale={locale}>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                className:
                  "!rounded-[0.5rem] !border-2 !border-[var(--color-line)] !bg-[var(--color-surface)] !text-[var(--color-ink)] !shadow-[3px_3px_0_0_var(--color-ink)] !font-medium",
              }}
            />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
