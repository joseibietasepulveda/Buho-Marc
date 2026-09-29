import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { readProceedingFile } from '../lib/proceeding-import.ts';
import { readImportFile } from '../lib/portfolio-import.ts';
import { proceedingLabel } from '../lib/opposition.ts';
test('mixed workbook preserves action, requires explicit role, omits only same-action duplicates and reports invalid IDs', async () => {
 const book=new ExcelJS.Workbook();
 book.addWorksheet('Oposiciones').addRows([['Solicitud'],[100],[101],[100],['=100']]);
 book.addWorksheet('Nulidades').addRows([['Solicitud'],[100],[102]]);
 const buffer=Buffer.from(await book.xlsx.writeBuffer());
 const parsed=await readProceedingFile(buffer,'ejemplo.xlsx');
 assert.deepEqual(parsed.rows.map(r=>[r.applicationNumber,r.type,r.role]),[['100','opposition',''],['101','opposition',''],['100','nullity',''],['102','nullity','']]);
 assert.equal(parsed.duplicates,1);assert.equal(parsed.invalid.length,1);
 await assert.rejects(readImportFile(buffer,'ejemplo.xlsx'),/Marcas seguidas/);
});
test('CSV role and type are explicit; unrecognized values remain for review',async()=>{
 const parsed=await readProceedingFile(Buffer.from('Solicitud;tipo;rol;cliente\n123;Nulidad;defiende;Cliente A\n124;oposicion;presenta;Cliente B\n125;otra;desconocido;\n'),'ejemplo.csv');
 assert.equal(parsed.rows[0].role,'respondent');assert.equal(parsed.rows[0].type,'nullity');assert.equal(parsed.rows[1].role,'opponent');assert.equal(parsed.rows[2].type,'');assert.equal(parsed.rows[2].role,'');
 assert.equal(proceedingLabel({role:'opponent'}),'Oposición presentada');assert.equal(proceedingLabel({type:'nullity',role:'respondent'}),'Nulidad recibida');
});
