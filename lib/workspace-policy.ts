export type WorkspacePolicy = { sourceAdmin: boolean; about: boolean; changePassword: boolean };
export const DEFAULT_WORKSPACE_POLICY: WorkspacePolicy = { sourceAdmin: true, about: true, changePassword: true };

/** Tenant presentation/access choices; never infer them from a mutable display name. */
export function workspacePolicy(slug?: string): WorkspacePolicy {
  return slug === "fa-abogados"
    ? { sourceAdmin: false, about: false, changePassword: false }
    : { ...DEFAULT_WORKSPACE_POLICY };
}
