import test from 'node:test';
import assert from 'node:assert/strict';
import {parseAnalyticsScope,proratedFixedCosts,analyticsScopeKey} from '../db/admin-analytics.ts';

test('analytics dates use Chile, reject invalid calendars, and distinguish user-scoped caches',()=>{
 const scope=parseAnalyticsScope({},new Date('2026-10-15T01:00:00Z'));
 assert.equal(scope.to,'2026-10-14');assert.equal(scope.from,'2026-09-15');
 assert.throws(()=>parseAnalyticsScope({from:'2026-02-30',to:'2026-03-02'}),/Fechas/);
 assert.throws(()=>parseAnalyticsScope({from:'2026-10-15',to:'2026-10-14'}),/rango/);
 assert.throws(()=>parseAnalyticsScope({organizationId:'all;delete'}),/Filtro/);
 assert.notEqual(analyticsScopeKey(scope),analyticsScopeKey({...scope,userId:'10000000-0000-4000-8000-000000000001'}));
});
test('fixed USD subscriptions prorate by actual calendar days and keep shared fees out of an individual study',()=>{
 const rules=[{id:'1',organizationId:null,provider:'dequienes',operation:null,kind:'fixed_monthly',amountUsd:31,label:'Global',effectiveFrom:'2026-10-01',effectiveTo:null},{id:'2',organizationId:'org-1',provider:'railway',operation:null,kind:'fixed_monthly',amountUsd:31,label:'Estudio',effectiveFrom:'2026-10-10',effectiveTo:'2026-10-12'}];
 assert.ok(Math.abs(proratedFixedCosts(rules,{from:'2026-10-01',to:'2026-10-14',organizationId:null,userId:null})-17)<1e-8);
 assert.equal(proratedFixedCosts(rules,{from:'2026-10-01',to:'2026-10-14',organizationId:'org-1',userId:null}),3);
 assert.ok(Math.abs(proratedFixedCosts(rules,{from:'2026-11-01',to:'2026-11-30',organizationId:null,userId:null})-31)<1e-8);
});
