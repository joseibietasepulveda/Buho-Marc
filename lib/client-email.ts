export type EmailBrand = { name: string; logo?: string; type?: string; classes: string };
const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
export function absoluteEmailLogo(logo: string | undefined, origin: string): string | null {
  if (!logo) return null;
  try { const url = new URL(logo, origin); return ["https:", "http:"].includes(url.protocol) ? url.href : null; } catch { return null; }
}
export function oppositionEmail(watched: EmailBrand, requested: EmailBrand, lawyer: string, reference: string, origin: string) {
  const subject = `Se recomienda presentar oposición · ${watched.name} / ${requested.name}`;
  const introduction = `Estimado/a cliente:\n\nEn la vigilancia de su marca ${watched.name}, identificamos la solicitud ${requested.name}, que presenta similitudes que podrían generar riesgo de confusión. A continuación encontrará una comparación de ambas marcas.`;
  const recommendation = `Se recomienda presentar oposición. Agradeceremos confirmar su autorización para preparar y presentar la oposición dentro del plazo aplicable.\n\nReferencia: ${reference}.\n\nSaludos cordiales,\n${lawyer}`;
  const noLogo = (brand: EmailBrand) => brand.type === "Denominativa" ? "Marca denominativa (sin logo)" : "Logo no disponible";
  const image = (brand: EmailBrand) => { const url = absoluteEmailLogo(brand.logo, origin); return url ? `<img src="${escape(url)}" alt="${escape(brand.name)}" width="180" height="140" style="max-width:100%;object-fit:contain;" />` : `<span>${noLogo(brand)}</span>`; };
  const cell = 'style="width:50%;padding:16px;border:1px solid #d9d0e2;vertical-align:top;text-align:center;"';
  const html = `<div style="font-family:Arial,sans-serif;color:#251b31;font-size:15px;line-height:1.6;"><p>${escape(introduction).replaceAll("\n", "<br />")}</p><table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;border-collapse:collapse;table-layout:fixed;"><tr><th ${cell}>Marca vigilada</th><th ${cell}>Marca solicitada</th></tr><tr><td ${cell}><strong>${escape(watched.name)}</strong></td><td ${cell}><strong>${escape(requested.name)}</strong></td></tr><tr><td ${cell}>${image(watched)}</td><td ${cell}>${image(requested)}</td></tr><tr><td ${cell}>Clases Niza: ${escape(watched.classes)}</td><td ${cell}>Clases Niza: ${escape(requested.classes)}</td></tr></table><p>${escape(recommendation).replaceAll("\n", "<br />")}</p></div>`;
  const text = `${introduction}\n\nMARCA VIGILADA: ${watched.name}\nClases Niza: ${watched.classes}\nLogo: ${absoluteEmailLogo(watched.logo, origin) ?? noLogo(watched)}\n\nMARCA SOLICITADA: ${requested.name}\nClases Niza: ${requested.classes}\nLogo: ${absoluteEmailLogo(requested.logo, origin) ?? noLogo(requested)}\n\n${recommendation}`;
  return { subject, html, text };
}
