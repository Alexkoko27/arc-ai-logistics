import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Arc AI Logistics",
  description:
    "AI logistics agents that coordinate freight decisions and settle work using USDC on Arc.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-black">
        <header className="border-b border-gray-200 px-6 py-3 text-sm">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
            <span className="font-semibold uppercase tracking-wide text-gray-700">
              Live Testnet Demo Project
            </span>
            <a
              className="text-gray-700 underline-offset-4 hover:underline"
              href="https://x.com/AlexandrB27"
              target="_blank"
              rel="noopener noreferrer"
            >
              Founder AlexandrB
            </a>
          </div>
        </header>
        <div className="flex-1">{children}</div>
        <footer className="border-t border-gray-200 px-6 py-5 text-center text-sm text-gray-500">
          Powered by{" "}
          <a
            className="font-medium text-gray-700 underline-offset-4 hover:underline"
            href="https://www.circle.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Circle
          </a>{" "}
          and{" "}
          <a
            className="font-medium text-gray-700 underline-offset-4 hover:underline"
            href="https://www.arc.io/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Arc
          </a>
        </footer>
      </body>
    </html>
  );
}
