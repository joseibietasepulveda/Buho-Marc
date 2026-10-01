import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, sessionIdentity } from "@/lib/auth";
import { workspacePolicy } from "@/lib/workspace-policy";
import { LoginForm } from "../ingresar/session-form";
import "../ingresar/session.css";
export default async function ChangePasswordPage() {
  const identity = await sessionIdentity((await cookies()).get(SESSION_COOKIE)?.value);
  if (!identity) redirect("/ingresar");
  if (!workspacePolicy(identity.organizationSlug).changePassword) redirect("/app");
  return <LoginForm changePassword />;
}
