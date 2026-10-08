import ExcelJS from "exceljs";
import { Readable } from "node:stream";
import * as XLSX from "xlsx";

export function checkWorkbookSize(buffer: Buffer) {
 let total=0,entries=0;
 for(let i=0;i+46<=buffer.length;i++) {
  if(buffer.readUInt32LE(i)!==0x02014b50)continue;
  total+=buffer.readUInt32LE(i+24);entries++;
  if(total>20*1024*1024||entries>500)throw new Error("El Excel es demasiado grande. Usa una hoja simple con números de solicitud.");
  i+=45+buffer.readUInt16LE(i+28)+buffer.readUInt16LE(i+30)+buffer.readUInt16LE(i+32);
 }
 if(!entries)throw new Error("El archivo no es un Excel .xlsx válido");
}
export async function loadImportWorkbook(buffer:Buffer,filename:string):Promise<ExcelJS.Workbook> {
 if(buffer.length>2*1024*1024)throw new Error("El archivo supera 2 MB");
 const workbook=new ExcelJS.Workbook();
 if(/\.xlsx$/i.test(filename)) {checkWorkbookSize(buffer);await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);}
 else if(/\.xls$/i.test(filename)) {
  // Only accept an actual BIFF/OLE workbook, rather than HTML renamed as Excel.
  const ole=buffer.subarray(0,8).equals(Buffer.from([0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1]));
  const biff=buffer.length>=4&&[0x0009,0x0209,0x0409,0x0809].includes(buffer.readUInt16LE(0));
  if(!ole&&!biff)throw new Error("El archivo no es un Excel .xls válido.");
  const source=XLSX.read(buffer,{type:"buffer",cellFormula:true,sheetRows:2002});
  for(const name of source.SheetNames) {
   const raw=source.Sheets[name],sheet=workbook.addWorksheet(name);
   const ref=raw["!fullref"]||raw["!ref"];
   if(!ref)continue;
   const range=XLSX.utils.decode_range(ref);
   if(range.e.r>2001||range.e.c>100)throw new Error("Máximo 2.000 filas y 100 columnas por hoja. Usa un archivo simple.");
   for(const [address,cell] of Object.entries(raw)) {
    if(address.startsWith("!"))continue;
    const target=sheet.getCell(address);
    target.value=cell.f?{formula:cell.f}:cell.t==="e"?{error:"#VALUE!"}:cell.v??null;
   }
  }
 } else if(/\.csv$/i.test(filename)) {
  const first=buffer.toString("utf8").split(/\r?\n/)[0];
  await workbook.csv.read(Readable.from(buffer),{parserOptions:{delimiter:first.includes(";")?";":","},map:value=>value});
 } else throw new Error("Usa un archivo .xls, .xlsx o .csv.");
 return workbook;
}
