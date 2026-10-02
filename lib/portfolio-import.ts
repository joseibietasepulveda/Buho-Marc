import ExcelJS from "exceljs";
import { Readable } from "node:stream";
import type { SourceRecord } from "./source-contract";
import { foldText, compactRut } from "./text-search";

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
export function checkWorkbookSize(buffer: Buffer) {
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
    if (/oposicion|nulidad/.test(sheet.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase())) throw new Error("Este archivo contiene oposiciones o nulidades. Súbelo desde Solicitudes de registro → Marcas seguidas por oposición o nulidad.");
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

export type AssistedQuery = { key: string; sheet: string; row: number; partyName: string; rut: string; name: string; role: "holder" | "representative" | "any"; clientName: string };
/** Supports mixed identifier/contact sheets; ambiguous matches always require review. */
export async function readAssistedImportFile(buffer: Buffer, filename: string) {
  if (buffer.length > 2 * 1024 * 1024) throw new Error("El archivo supera 2 MB");
  const workbook = new ExcelJS.Workbook();
  if (/\.xlsx$/i.test(filename)) { checkWorkbookSize(buffer); await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]); }
  else if (/\.csv$/i.test(filename)) { const first = buffer.toString("utf8").split(/\r?\n/)[0]; await workbook.csv.read(Readable.from(buffer), { parserOptions: { delimiter: first.includes(";") ? ";" : "," }, map: value => value }); }
  else throw new Error("Usa un archivo .xlsx o .csv.");
  const ids: string[] = [], queries: AssistedQuery[] = [], invalid: { sheet: string; row: number; value: string }[] = [];
  const seen = new Set<string>(); let duplicates = 0, count = 0;
  const aliases = {
    application: ["numerosolicitud", "numerodesolicitud", "nsolicitud", "solicitud", "applicationnumber", "applicationid", "idsolicitud", "id"],
    rut: ["rut", "ruttitular", "rutcliente", "rutsolicitante"], name: ["nombre", "razonsocial", "nombretitular", "titular", "solicitante"],
    representative: ["representante", "nombrerepresentante", "estudio", "abogado"], representativeRut: ["rutrepresentante", "rutestudio", "rutabogado"],
    role: ["rol", "role"], client: ["cliente", "nombrecliente"], brand: ["marca", "nombremarca", "denominacion"],
  };
  for (const sheet of workbook.worksheets) {
    if (!sheet.actualRowCount) continue;
    if (/oposicion|nulidad/.test(foldText(sheet.name))) throw new Error("Las oposiciones y nulidades se cargan desde Solicitudes → Marcas seguidas por oposición o nulidad.");
    const labels = (sheet.getRow(1).values as ExcelJS.CellValue[]).map(value => foldText(String(value ?? "")).replace(/[^a-z0-9]/g, ""));
    const columns = Object.fromEntries(Object.entries(aliases).map(([key, names]) => [key, labels.findIndex(label => names.includes(label))])) as Record<keyof typeof aliases, number>;
    const headerless = sheet.actualColumnCount === 1 && normalizeApplicationId(sheet.getRow(1).getCell(1).value);
    if (!headerless && Object.entries(columns).every(([key, column]) => ["role", "client"].includes(key) || column < 1)) throw new Error(`La hoja «${sheet.name}» necesita numero_solicitud, rut, razon_social, representante o marca.`);
    sheet.eachRow((row, n) => {
      if (!headerless && n === 1) return;
      const values = Object.fromEntries(Object.entries(columns).map(([key, column]) => { const cell = row.getCell(column > 0 ? column : 1).value; return [key, column > 0 ? typeof cell === "object" && cell !== null ? "[celda no válida]" : String(cell ?? "").trim() : ""]; })) as Record<keyof typeof aliases, string>;
      if (headerless) values.application = String(row.getCell(1).value ?? "");
      if (!Object.values(values).some(Boolean)) return;
      if (++count > MAX_IMPORT_ROWS) throw new Error(`Máximo ${MAX_IMPORT_ROWS} filas por archivo`);
      if (Object.values(values).includes("[celda no válida]")) { invalid.push({ sheet: sheet.name, row: n, value: "Usa texto o números; no fórmulas." }); return; }
      if (values.application) {
        const id = normalizeApplicationId(values.application);
        if (!id) invalid.push({ sheet: sheet.name, row: n, value: `Solicitud inválida: ${values.application.slice(0, 80)}` });
        else if (seen.has(`id:${id}`)) duplicates++;
        else { seen.add(`id:${id}`); ids.push(id); }
        return;
      }
      const roleValue = foldText(values.role);
      if (values.role && !/^(titular|solicitante|holder|representante|representative|ambos|any)$/.test(roleValue)) { invalid.push({ sheet: sheet.name, row: n, value: `Rol no reconocido: ${values.role.slice(0, 80)}` }); return; }
      const role = roleValue ? /ambos|any/.test(roleValue) ? "any" : /represent/.test(roleValue) ? "representative" : "holder" : values.representative || values.representativeRut ? "representative" : "holder";
      const partyName = values.representative || values.name || values.client, rut = values.representativeRut || values.rut;
      if (!partyName && !rut && !values.brand) { invalid.push({ sheet: sheet.name, row: n, value: "Falta solicitud, nombre o RUT" }); return; }
      const key = `${role}:${compactRut(rut)}:${foldText(partyName)}:${foldText(values.brand)}`;
      if (seen.has(key)) { duplicates++; return; }
      seen.add(key); queries.push({ key, sheet: sheet.name, row: n, partyName, rut, name: values.brand, role, clientName: values.client });
    });
  }
  if (!count) throw new Error("El archivo no contiene datos para buscar.");
  return { ids, queries, duplicates, invalid };
}
