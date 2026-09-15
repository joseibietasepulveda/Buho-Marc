import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, sessionIdentity } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Buho Marc | Mi espacio",
  description: "Marcas, solicitudes y casos de tu organización.",
  robots: { index: false, follow: false },
};

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const identity = await sessionIdentity((await cookies()).get(SESSION_COOKIE)?.value);
  if (!identity) redirect("/ingresar");
  if (identity.mustChangePassword) redirect("/cambiar-clave");
  return children;
}
