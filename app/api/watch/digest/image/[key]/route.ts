import { withSession } from '@/lib/auth';
import { digestReadOrganization } from '@/lib/watch-digest-access';
import { readDigestImages } from '@/db/watch-digest-data';
export const GET = withSession(async request => {
  const org = digestReadOrganization(request);
  if (!org) return new Response(null,{status:404});
  const key = new URL(request.url).pathname.split('/').at(-1) ?? '';
  if (!/^[a-f0-9]{64}$/.test(key)) return new Response(null,{status:404});
  const [image] = await readDigestImages(org,[key]);
  if (!image) return new Response(null,{status:404});
  return new Response(Buffer.from(image.content,'base64'),{headers:{'Content-Type':'image/jpeg','X-Content-Type-Options':'nosniff'}});
});
