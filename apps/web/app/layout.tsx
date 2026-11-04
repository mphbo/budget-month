import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Science_Gothic } from "next/font/google";
import { Suspense } from "react";
import { AuthNavigation } from "./components/AuthNavigation";
import Providers from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const scienceGothic = Science_Gothic({
  variable: "--font-science-gothic",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Budget Month",
  description:
    "A simple budget app to track your income, expenses, and equity changes.",
};

const RootLayout = ({ children }: LayoutProps<"/">) => {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${scienceGothic.variable}`}
    >
      <body>
        <AppRouterCacheProvider>
          <Providers>
            <Suspense fallback={null}>
              <AuthNavigation />
            </Suspense>
            {children}
          </Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
};

export default RootLayout;
