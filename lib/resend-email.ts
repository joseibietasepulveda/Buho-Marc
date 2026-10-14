import {analyticsFetcher} from "./analytics-telemetry";
import { boundedJson } from "./bounded-json";
import { DIGEST_PILOT_TO } from "./watch-digest";
import type { DigestAttachment } from "./watch-digest-email";

export type ResendEmail = { from: string; to: string[]; reply_to: string; subject: string; html: string; text: string; attachments: DigestAttachment[] };
export class ResendDeliveryError extends Error {
  status: number | null;
  uncertain: boolean;
  constructor(status: number | null, uncertain: boolean) { super(status ? `Resend no aceptó el envío (HTTP ${status})` : "No se pudo confirmar la aceptación del correo"); this.status = status; this.uncertain = uncertain; }
}
export async function sendResendEmail(email: ResendEmail, apiKey: string, idempotencyKey: string, fetcher: typeof fetch = fetch) {
  if (!apiKey) throw new Error("Falta clave de Resend");
  if (email.to.length !== 1 || email.to[0] !== DIGEST_PILOT_TO || email.reply_to !== DIGEST_PILOT_TO || email.from !== `Buho Marc <${DIGEST_PILOT_TO}>`) throw new Error("El piloto solo permite correo a hola@rcirculo.com");
  if (!idempotencyKey || idempotencyKey.length > 256) throw new Error("Identificador de envío inválido");
  let response: Response;
  try { response = await analyticsFetcher({provider:'resend',operation:'send',sourceRef:idempotencyKey,properties:{billing_source:'unknown'}},fetcher)("https://api.resend.com/emails", { method: "POST", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(20000), headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey }, body: JSON.stringify(email) }); }
  catch { throw new ResendDeliveryError(null, true); }
  if (!response.ok) { await response.body?.cancel(); throw new ResendDeliveryError(response.status, response.status >= 500 || response.status === 409); }
  let data: { id?: unknown };
  try { data = await boundedJson(response, 65536) as { id?: unknown }; }
  catch { throw new ResendDeliveryError(null, true); }
  if (typeof data.id !== "string" || !data.id.length || data.id.length > 180) throw new ResendDeliveryError(null, true);
  return data.id;
}
