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
  title: "Giapha — Gia phả linh thiêng, tra cứu thông minh",
  description:
    "Nền tảng gia phả số: cây dòng họ tương tác, tìm kiếm mờ thông minh, lịch giỗ âm lịch và xuất infographic in ấn.",
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
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <SwrProvider>
          {children}
          <AppToaster />
        </SwrProvider>
      </body>
    </html>
  );
}
