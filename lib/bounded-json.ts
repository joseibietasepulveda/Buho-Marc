export class BodyLimitError extends Error {}
export async function boundedJson(request: Request | Response, limit: number): Promise<unknown> {
  if (Number(request.headers.get('content-length')) > limit) throw new BodyLimitError('El contenido supera el tamaño permitido.');
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError('No se recibieron datos.');
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new BodyLimitError('El contenido supera el tamaño permitido.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
