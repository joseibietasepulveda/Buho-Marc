import test from 'node:test';
import assert from 'node:assert/strict';
import { legalText, legalFieldLabel, auditAction } from '../lib/legal-language.ts';

test('historical provider labels become readable without altering brand names or registration numbers',()=>{
  assert.equal(legalText('Se actualizó FAST SOLUCIONES: image_url, registration_id'),'Se actualizó FAST SOLUCIONES: imagen de la marca, número de registro');
  assert.equal(legalText('Solicitud 1678909 · CASA NUBE'),'Solicitud 1678909 · CASA NUBE');
  assert.equal(legalFieldLabel('inapi.image_url'),'imagen de la marca');
  assert.equal(legalFieldLabel('future_provider_field'),'Antecedente del expediente');
});
test('audit distinguishes activation and pause and retains existing readable descriptions',()=>{
  assert.equal(auditAction('brand.monitoring_changed',{enabled:false}),'Vigilancia de la marca pausada');
  assert.equal(auditAction('brand.monitoring_changed',{enabled:true}),'Vigilancia de la marca activada');
  assert.equal(auditAction('Vigilancia clasificada'),'Vigilancia clasificada');
  assert.equal(auditAction('future.internal_action'),'Actualización registrada en la plataforma');
});
