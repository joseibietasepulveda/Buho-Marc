import assert from 'node:assert/strict';
import { normalizeInapi } from '../../lib/inapi-provider.ts';
import { updatedApplication } from '../../db/source.ts';

export const act = (description, id = '1', date = '2026-07-01', extra = {}) => ({ event_id: id, event_date: date, status_code: null, status_description: description, ...extra });
export function fixture(events = [act('Resolución de observaciones de fondo')]) {
  return normalizeInapi({ application_id: 999001, registration_number: null, name: 'Ejemplo ficticio', status: { code: '016', description: 'En Trámite' }, dates: { filed_at: '2026-01-01', published_at: '2026-03-01', registered_at: null, expires_at: null, last_changed_at: null }, trademark: { sign_type: 'Denominativa' }, holders: [{ name: 'Titular ficticio', country: 'CL' }], representatives: [], classes: [{ nice_class: 35 }], events, annotations: [], source: {} });
}
export const application = record => updatedApplication({ id: 'fixture', applicationNumber: record.applicationNumber, name: record.name, type: record.type, filedAt: '', statusId: record.status, recentEvent: '', niceClasses: '', holderRut: '', holder: '', client: '', history: [] }, record, '');
export function officialFetcher({ extraActs = [], status = 'En Trámite', failAt, wrongId = false } = {}) {
  let calls = 0;
  const fetcher = async (url, init) => {
    calls++;
    assert.equal(init.redirect, 'error');
    assert.equal(init.cache, 'no-store');
    if (calls === failAt) return new Response('outage', { status: 429 });
    if (url.endsWith('.aspx')) return new Response('<input id="hdnHash" value="opaque"><input value="context" id="hdnIDW">', { headers: { 'Set-Cookie': 'session=test; HttpOnly; Secure' } });
    assert.match(init.headers.Cookie, /session=test/);
    const body = JSON.parse(init.body);
    if (url.endsWith('/FindMarcas')) {
      assert.equal(body.param1, '999001'); assert.equal(body.param17, '1'); assert.equal(body.Hash, 'opaque');
      return Response.json({ d: JSON.stringify({ Hash: 'next', ErrorMessage: null, Marcas: [{ cell: ['999001', '', '', '', '', '', 'M', 'A', '999001', '2026'] }] }) });
    }
    assert.equal(body.numeroSolicitud, '999001'); assert.equal(body.Hash, 'next'); assert.equal(body.numeroSerie, '2026');
    return Response.json({ d: JSON.stringify({ ErrorMessage: null, Marca: { NumeroSolicitud: wrongId ? '999002' : '999001', NumeroRegistro: null, Estado: '016', EstadoDescripcion: status, FechaPresentacion: '01/01/2026', FechaPublicacion: '01/03/2026', FechaRegistro: '', FechaVencimiento: '', Instancias: [{ Numero: '1', Fecha: '01/07/2026', EstadoCodigo: '647', EstadoDescripcion: 'Resolución de observaciones de fondo', FechaVencimiento: '', Observacion: '' }, ...extraActs] } }) });
  };
  return { fetcher, calls: () => calls };
}
