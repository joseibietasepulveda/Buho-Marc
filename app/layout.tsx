import type { Metadata } from "next";
import { headers } from "next/headers";
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

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.includes("localhost") ? "http" : "https");

  return {
    metadataBase: new URL(`${protocol}://${host}`),
    title: "Image Watch | Inteligencia visual",
    description: "Trackeo de la propiedad intelectual visual de tus clientes.",
    icons: {
      icon: "/favicon.svg",
    },
    openGraph: {
      title: "Image Watch",
      description: "Trackeo de la propiedad intelectual visual de tus clientes.",
      images: [{ url: "/og.png", width: 1730, height: 909 }],
      type: "website",
      locale: "es_CL",
    },
    twitter: {
      card: "summary_large_image",
      title: "Image Watch",
      description: "Trackeo de la propiedad intelectual visual de tus clientes.",
      images: ["/og.png"],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
