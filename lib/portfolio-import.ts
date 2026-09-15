import ExcelJS from "exceljs";
import { Readable } from "node:stream";
import type { SourceRecord } from "./source-contract";

export const MAX_IMPORT_ROWS = 2000;
export function normalizeApplicationId(value: unknown): string | null {
  const text = String(value ?? "").trim();
  if (!/^\d{1,9}$/.test(text) || Number(text) < 1) return null;
  return String(Number(text));
}
export function portfolioKind(record: SourceRecord): "brand" | "application" {
  return record.registrationNumber && ["registered", "expired", "cancelled"].includes(record.status) ? "brand" : "application";
}
// Check the ZIP directory before decompression, including highly compressed XLSX files.
function checkWorkbookSize(buffer: Buffer) {
  let total = 0, entries = 0;
  for (let i = 0; i + 46 <= buffer.length; i++) {
    if (buffer.readUInt32LE(i) !== 0x02014b50) continue;
    total += buffer.readUInt32LE(i + 24); entries++;
    if (total > 20 * 1024 * 1024 || entries > 500) throw new Error("El Excel es demasiado grande. Usa una hoja simple con números de solicitud.");
    i += 45 + buffer.readUInt16LE(i + 28) + buffer.readUInt16LE(i + 30) + buffer.readUInt16LE(i + 32);
  }
  if (!entries) throw new Error("El archivo no es un Excel .xlsx válido");
}
export async function readImportFile(buffer: Buffer, filename: string) {
  if (buffer.length > 2 * 1024 * 1024) throw new Error("El archivo supera 2 MB");
  const workbook = new ExcelJS.Workbook();
  if (/\.xlsx$/i.test(filename)) {
    checkWorkbookSize(buffer);
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  } else if (/\.csv$/i.test(filename)) {
    const firstLine = buffer.toString("utf8").split(/\r?\n/)[0];
    await workbook.csv.read(Readable.from(buffer), { parserOptions: { delimiter: firstLine.includes(";") ? ";" : "," }, map: value => value });
  } else throw new Error("Usa un archivo .xlsx o .csv. Guarda los archivos .xls como .xlsx.");
  const ids: string[] = [], invalid: { sheet: string; row: number; value: string }[] = [];
  let duplicates = 0, count = 0;
  const seen = new Set<string>();
  for (const sheet of workbook.worksheets) {
    if (!sheet.actualRowCount) continue;
    const header = sheet.getRow(1);
    const labels = (header.values as ExcelJS.CellValue[]).map(v => String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, ""));
    const column = labels.findIndex(v => ["numerosolicitud", "numerodesolicitud", "nsolicitud", "solicitud", "applicationnumber", "applicationid", "idsolicitud", "id"].includes(v));
    if (column < 1 && sheet.actualColumnCount > 1) throw new Error(`La hoja «${sheet.name}» necesita una columna numero_solicitud`);
    if (column < 1 && !normalizeApplicationId(header.getCell(1).value)) throw new Error(`Usa el encabezado numero_solicitud en la hoja «${sheet.name}». Se necesitan números de solicitud, no de registro.`);
    sheet.eachRow((row, n) => {
      if (column > 0 && n === 1) return;
      const value = row.getCell(column > 0 ? column : 1).value;
      if (value == null || value === "") return;
      if (++count > MAX_IMPORT_ROWS) throw new Error(`Máximo ${MAX_IMPORT_ROWS} filas por archivo`);
      const id = normalizeApplicationId(value);
      if (!id) invalid.push({ sheet: sheet.name, row: n, value: String(typeof value === "object" ? "Celda con fórmula o contenido no numérico" : value).slice(0, 100) });
      else if (seen.has(id)) duplicates++;
      else { ids.push(id); seen.add(id); }
    });
  }
  if (!count) throw new Error("El archivo no contiene números de solicitud");
  return { ids, duplicates, invalid };
}
