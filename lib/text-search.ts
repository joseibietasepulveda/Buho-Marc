export const TEXT_MATCH_MODES = {
  contains: "Contiene", similar: "Similar", word: "Contiene palabra completa",
  starts: "Empieza con", ends: "Termina con", exact: "Exacto",
} as const;
export type TextMatchMode = keyof typeof TEXT_MATCH_MODES;
export const foldText = (value: string) => value.trim().replace(/\s+/g, " ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");
export const compactRut = (value: string) => foldText(value).replace(/[.\s-]/g, "");
export function textMatches(value: string | undefined, query: string, mode: TextMatchMode = "contains") {
  const wanted = foldText(query), actual = foldText(value ?? "");
  if (!wanted) return true;
  if (!actual) return false;
  if (mode === "exact") return actual === wanted;
  if (mode === "starts") return actual.startsWith(wanted);
  if (mode === "ends") return actual.endsWith(wanted);
  if (mode === "word") {
    const escaped = wanted.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, "u").test(actual);
  }
  if (actual.includes(wanted)) return true;
  if (mode !== "similar" || wanted.length < 3) return false;
  const grams = (text: string) => new Set(Array.from({ length: text.length - 2 }, (_, i) => text.slice(i, i + 3)));
  const a = grams(actual), b = grams(wanted);
  const common = [...b].filter(gram => a.has(gram)).length;
  return 2 * common / (a.size + b.size) >= .45;
}
