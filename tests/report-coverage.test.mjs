import assert from 'node:assert/strict';
import test from 'node:test';
import {reportCoverage} from '../lib/report-coverage.ts';
test('report lists classes with commas, deduplicates numbers and groups identical coverages without losing text',()=>{
 const rows=reportCoverage([{nice_class:30},{nice_class:35},{nice_class:41,coverage_text:'Servicios de educación.'},{nice_class:42,coverage_text:'Servicios de educación.'},{nice_class:30}]);
 assert.deepEqual(rows,[
  {label:'Clases de Niza',value:'30, 35, 41, 42'},
  {label:'Cobertura · Clases 30, 35',value:'Productos o servicios no informados'},
  {label:'Cobertura · Clases 41, 42',value:'Servicios de educación.'},
 ]);
 assert.deepEqual(reportCoverage([]),[{label:'Clases de Niza',value:'No informadas'}]);
 assert.equal(reportCoverage([{nice_class:30,coverage_text:'Texto largo. '.repeat(1000)}])[1].value,'Texto largo. '.repeat(1000).trim());
});
