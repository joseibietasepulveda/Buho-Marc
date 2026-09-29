import ExcelJS from "exceljs";
import { Readable } from "node:stream";
import { checkWorkbookSize, normalizeApplicationId, MAX_IMPORT_ROWS } from "./portfolio-import";
export type ProceedingImportRow = { key: string; applicationNumber: string; sheet: string; row: number; type: "opposition" | "nullity" | ""; role: "opponent" | "respondent" | ""; opponent: string };
const clean = (value: unknown) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
function kind(value: unknown): ProceedingImportRow["type"] { const s = clean(value); return ["oposicion", "oposiciones", "opposition"].includes(s) ? "opposition" : ["nulidad", "nulidades", "nullity"].includes(s) ? "nullity" : ""; }
function role(value: unknown): ProceedingImportRow["role"] { const s = clean(value); return ["opponent", "oponente", "demandante", "presenta"].includes(s) ? "opponent" : ["respondent", "demandado", "defiende"].includes(s) ? "respondent" : ""; }
export async function readProceedingFile(buffer: Buffer, filename: string) {
  if (buffer.length > 2 * 1024 * 1024) throw new Error("El archivo supera 2 MB");
  const book = new ExcelJS.Workbook();
  if (/\.xlsx$/i.test(filename)) { checkWorkbookSize(buffer); await book.xlsx.load(buffer as unknown as Parameters<typeof book.xlsx.load>[0]); }
  else if (/\.csv$/i.test(filename)) await book.csv.read(Readable.from(buffer), { parserOptions: { delimiter: buffer.toString("utf8").split(/\r?\n/)[0].includes(";") ? ";" : "," }, map: v => v });
  else throw new Error("Usa un archivo .xlsx o .csv");
  const rows: ProceedingImportRow[] = [], invalid: {sheet:string;row:number;value:string}[] = [];
  const seen = new Set<string>(); let duplicates = 0, count = 0;
  for (const sheet of book.worksheets) {
    if (!sheet.actualRowCount) continue;
    const labels = (sheet.getRow(1).values as ExcelJS.CellValue[]).map(clean);
    const col = labels.findIndex(v => ["solicitud", "numerosolicitud", "numerodesolicitud", "nsolicitud", "applicationnumber", "id"].includes(v));
    if (col < 1) throw new Error(`La hoja «${sheet.name}» necesita una columna Solicitud o numero_solicitud`);
    const typeCol = labels.indexOf("tipo"), roleCol = labels.indexOf("rol"), clientCol = labels.indexOf("cliente");
    sheet.eachRow((row, n) => {
      if (n === 1 || row.getCell(col).value == null) return;
      if (++count > MAX_IMPORT_ROWS) throw new Error(`Máximo ${MAX_IMPORT_ROWS} filas por archivo`);
      const id = normalizeApplicationId(row.getCell(col).value);
      if (!id) { invalid.push({ sheet: sheet.name, row: n, value: "Número de solicitud inválido" }); return; }
      const type = typeCol > 0 ? kind(row.getCell(typeCol).value) : kind(sheet.name);
      const key = `${type || sheet.name}:${id}`;
      if (seen.has(key)) { duplicates++; return; } seen.add(key);
      rows.push({ key, applicationNumber: id, sheet: sheet.name, row: n, type, role: roleCol > 0 ? role(row.getCell(roleCol).value) : "", opponent: clientCol > 0 && typeof row.getCell(clientCol).value === "string" ? String(row.getCell(clientCol).value).trim().slice(0,180) : "" });
    });
  }
  if (!count) throw new Error("El archivo no contiene solicitudes");
  return { rows, invalid, duplicates };
}
