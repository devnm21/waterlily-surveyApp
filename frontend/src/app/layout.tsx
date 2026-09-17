import type { Metadata } from "next";
import { Atkinson_Hyperlegible, Fraunces } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-brand",
});

const atkinson = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: {
    default: "Waterlily Survey",
    template: "%s · Waterlily Survey",
  },
  description: "Create and complete surveys with Waterlily.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${atkinson.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
