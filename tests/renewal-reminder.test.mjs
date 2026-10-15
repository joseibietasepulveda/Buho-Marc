import test from 'node:test';
import assert from 'node:assert/strict';
import {renewalReminder,registrationExpiry} from '../lib/renewal-reminder.ts';
import {isPriorityNotice} from '../lib/notification-policy.ts';
import {noticePresentation} from '../lib/work-priorities.ts';
const record={provider:'inapi',status:'registered',name:'Marca ficticia',applicationNumber:'1200000',registrationNumber:'1000000',registrationDate:'2016-10-28',expirationDate:'2026-10-28'};
const today='2026-10-12';
test('expiry reminders use saved expiry and remain internal, including the exact today/year boundaries',()=>{
 const reminder=renewalReminder(record,today);assert.equal(reminder.date,'2026-10-28');assert.equal(reminder.opens,'2026-04-28');assert.equal(reminder.origin,'source');assert.match(reminder.summary,/ventana.*ya está abierta/);
 assert.ok(renewalReminder({...record,expirationDate:today},today));
 for(const date of ['2026-10-11','2027-10-13','2036-10-28','invalid'])assert.equal(renewalReminder({...record,expirationDate:date},today),undefined);
 assert.equal(renewalReminder({...record,expirationDate:'2027-10-12'},today).milestone,'1y');
 const early=renewalReminder({...record,expirationDate:'2027-09-29'},today);assert.match(early.summary,/se abre el/);assert.equal(early.opens,'2027-03-29');
});
test('ten years are calendar years and source renewal expiry takes priority over the original date',()=>{
 assert.deepEqual(registrationExpiry({...record,expirationDate:null,registrationDate:'2016-02-29'},today),{date:'2026-02-28',origin:'calculated'});
 assert.equal(renewalReminder({...record,expirationDate:null},today).date,'2026-10-28');
 assert.equal(renewalReminder({...record,expirationDate:'2036-10-28'},today),undefined);
 for(const extra of [{provider:'simulated'},{status:'cancelled'},{registrationNumber:null},{expirationDate:null,registrationDate:null},{registrationDate:'2027-01-01'},{expirationDate:'2010-01-01'}])assert.equal(renewalReminder({...record,...extra},today),undefined);
});
test('renewal notices are priority reminders even with no fabricated source changes',()=>{
 const notice={title:'Registro próximo a vencer: Marca ficticia',brand:'Marca ficticia',urgency:'Alta',changeDetail:{kind:'renewal-reminder',changes:[]}};
 assert.equal(isPriorityNotice(notice),true);const display=noticePresentation(notice,'2026-10-28',today);assert.equal(display.kind,'renewal');assert.match(display.label,/28 oct/);assert.equal(display.title,notice.title);
});
