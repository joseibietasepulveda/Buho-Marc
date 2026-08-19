import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Buho Marc | Plataforma demo",
  description: "Mockup navegable para monitorear marcas, revisar coincidencias y gestionar casos.",
  robots: { index: false, follow: false },
};

export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
