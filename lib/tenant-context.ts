import { AsyncLocalStorage } from "node:async_hooks";

export type Identity = { organizationId: string; userId: string; name: string; organizationName: string; role: string; mustChangePassword: boolean };
export const DEMO_ORGANIZATION = "10000000-0000-4000-8000-000000000001";
export const DEMO_ACTOR = "10000000-0000-4000-8000-000000000101";
const context = new AsyncLocalStorage<Identity>();
export const runAs = <T>(identity: Identity, action: () => T): T => context.run(identity, action);
export const currentIdentity = () => context.getStore();
// The fallback is only for existing offline demo/import scripts. HTTP entrypoints
// must pass through withSession before any portfolio operation.
export const organizationId = () => context.getStore()?.organizationId ?? DEMO_ORGANIZATION;
export const actorId = () => context.getStore()?.userId ?? DEMO_ACTOR;
export const isDemoOrganization = () => organizationId() === DEMO_ORGANIZATION;
