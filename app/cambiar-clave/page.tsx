import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, sessionIdentity } from "@/lib/auth";
import { LoginForm } from "../ingresar/session-form";
import "../ingresar/session.css";
export default async function ChangePasswordPage() {
  const identity = await sessionIdentity((await cookies()).get(SESSION_COOKIE)?.value);
  if (!identity) redirect("/ingresar");
  return <LoginForm changePassword />;
}
