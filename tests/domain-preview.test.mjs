import test from 'node:test';
import assert from 'node:assert/strict';
import { initialDomainPreview, normalizeDomain, addPreviewDomain, searchDomainPreview } from '../lib/domain-preview.ts';
import { workspacePolicy } from '../lib/workspace-policy.ts';

test('dominios sólo para administrador Búho identificado por slug y rol', () => {
  assert.equal(workspacePolicy('estudio-ibieta-ip','admin').domainsPreview, true);
  for (const [slug,role] of [['estudio-ibieta-ip','member'], ['estudio-ibieta-ip',undefined], ['fa-abogados','admin'], ['daniel-morales','admin'], ['barros-errazuriz','admin'], [undefined,'admin']]) assert.ok(!workspacePolicy(slug,role).domainsPreview);
});
test('normaliza host, .cl, mayúsculas e IDN, rechaza URL, rutas y etiquetas inválidas', () => {
  assert.equal(normalizeDomain(' MiMarca.CL. '),'mimarca.cl');
  assert.equal(normalizeDomain('mimarca'),'mimarca.cl');
  assert.equal(normalizeDomain('niño.cl'),'xn--nio-8ma.cl');
  for(const value of ['', 'https://marca.cl', 'marca.cl/ruta', 'marca.cl:443', 'correo@marca.cl', '-marca.cl', 'marca-.cl','mar_ca.cl', 'marca..cl', '127.0.0.1', 'a'.repeat(64)+'.cl']) assert.throws(()=>normalizeDomain(value));
});
test('alta independiente sin inventar datos de API y asociación de dominio existente', () => {
  const initial=initialDomainPreview();
  const next=addPreviewDomain(initial,'mi-dominio.cl');
  assert.equal(next.domains.length,5);
  assert.equal(initial.domains.length,4);
  const item=next.domains.at(-1);
  assert.equal(item.createdAt,null); assert.equal(item.holder,null); assert.equal(item.brandId,undefined);
  const linked=addPreviewDomain(next,'MI-DOMINIO.CL','brand-a');
  assert.equal(linked.domains.length,5); assert.equal(linked.domains.at(-1).brandId,'brand-a');
  assert.throws(()=>addPreviewDomain(linked,'mi-dominio.cl','brand-b'),/otra marca/);
  assert.throws(()=>addPreviewDomain(linked,'segundo.cl','brand-a'),/ya tiene/);
  assert.throws(()=>addPreviewDomain(linked,'mi-dominio.cl'),/ya está/);
});
test('buscador exacto y contenga sólo devuelve fixtures; ausencias no indican disponibilidad', () => {
  const {domains}=initialDomainPreview();
  assert.equal(searchDomainPreview(domains,'NOVAFOODS','exact')[0].status,'Inscrito');
  assert.deepEqual(searchDomainPreview(domains,'nova','contains').map(item=>item.name),['novafoods.cl']);
  assert.equal(searchDomainPreview(domains,'nuevamarcaejemplo.cl','exact')[0].status,'Disponible');
  assert.deepEqual(searchDomainPreview(domains,'desconocido.cl','exact'),[]);
  assert.deepEqual(searchDomainPreview(addPreviewDomain(initialDomainPreview(),'nuevo.cl').domains,'nuevo.cl','exact'),[]);
  assert.throws(()=>searchDomainPreview(domains,'','contains'));
});
test('cada sesión recibe datos independientes y fixtures no vinculan marcas reales automáticamente',()=>{
  const first=initialDomainPreview(), second=initialDomainPreview();
  first.notices[0].reviewed=true;
  assert.equal(second.notices[0].reviewed,false);
  assert.ok(second.domains.every(domain=>!domain.brandId));
});
