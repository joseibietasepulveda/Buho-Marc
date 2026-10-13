export type WorkspacePolicy = { internalExamples?: boolean; sourceAdmin: boolean; about: boolean; changePassword: boolean };
export const DEFAULT_WORKSPACE_POLICY: WorkspacePolicy = { sourceAdmin: false, about: false, changePassword: false };

/** Internal capabilities require both the stable Buho tenant and its administrator role. */
export function workspacePolicy(slug?: string, role?: string): WorkspacePolicy {
  const internalAdmin = slug === "estudio-ibieta-ip" && role === "admin";
  return internalAdmin
    ? { sourceAdmin: true, about: true, changePassword: true, internalExamples: true }
    : { ...DEFAULT_WORKSPACE_POLICY };
}
