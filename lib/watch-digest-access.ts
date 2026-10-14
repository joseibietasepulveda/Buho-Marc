import { currentIdentity, organizationId } from './tenant-context';
import { workspacePolicy } from './workspace-policy';
import { z } from 'zod';
/** Only the internal administrator may choose a different portfolio for a preview. */
export function digestReadOrganization(request: Request) {
  const requested = new URL(request.url).searchParams.get('organizationId');
  const identity = currentIdentity();
  if (!requested || requested === organizationId()) return organizationId();
  if (!z.uuid().safeParse(requested).success || !workspacePolicy(identity?.organizationSlug,identity?.role).sourceAdmin) return null;
  return requested;
}
