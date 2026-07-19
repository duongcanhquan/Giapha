import type { Metadata } from "next";
import { Be_Vietnam_Pro, Literata } from "next/font/google";
import { SwrProvider } from "@/lib/swr/provider";
import { AppToaster } from "@/components/ui/toaster";
import "./globals.css";

const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

const literata = Literata({
  variable: "--font-literata",
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Giapha — Dòng họ & cây gia phả",
  description:
    "Landing kể chuyện dòng họ, cây gia phả tương tác, lịch giỗ âm lịch và xuất PDF in ấn.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${beVietnam.variable} ${literata.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#e9eef3] text-[#1c1410]">
        <SwrProvider>
          {children}
          <AppToaster />
        </SwrProvider>
      </body>
    </html>
  );
}
