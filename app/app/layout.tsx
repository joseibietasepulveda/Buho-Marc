import type { Metadata } from "next";
import { AnalyticsObserver } from "./analytics-observer";
import { analyticsCaptureEnabled } from "@/lib/analytics-capture";
import { headers } from "next/headers";
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
  if (!identity) redirect((await headers()).get("x-buho-admin-route") === "1" ? "/admin/login" : "/ingresar");
  if (identity.mustChangePassword) redirect((await headers()).get("x-buho-admin-route") === "1" ? "/cambiar-clave?next=admin" : "/cambiar-clave");
  return <><AnalyticsObserver enabled={analyticsCaptureEnabled()}/>{children}</>;
}
