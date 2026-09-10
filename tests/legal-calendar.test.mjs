import assert from 'node:assert/strict';
import test from 'node:test';
import { CALENDAR_VERSION, calendarCovered, nationalBusinessDay } from '../lib/legal-calendar.ts';

test('calendar coverage is strict civil ISO and limited to reviewed years', () => {
  assert.match(CALENDAR_VERSION, /2026-2027/);
  for (const day of ['2026-01-01', '2026-12-31', '2027-01-01', '2027-12-31']) assert.equal(calendarCovered(day), true, day);
  for (const day of ['', '2025-12-31', '2028-01-01', '2026-02-29', '2027-02-29', '2027-04-31', '2027-13-01', '2027-00-01', '2027-1-01', '2027-01-01T12:00:00Z']) {
    assert.equal(calendarCovered(day), false, day);
    assert.equal(nationalBusinessDay(day), false, day);
  }
});

test('all published 2026 holidays are excluded without inventing substitute Mondays', () => {
  for (const day of ['01-01', '04-03', '04-04', '05-01', '05-21', '06-21', '06-29', '07-16', '08-15', '09-18', '09-19', '10-12', '10-31', '11-01', '12-08', '12-25']) assert.equal(nationalBusinessDay('2026-' + day), false, day);
  for (const day of ['2026-01-02', '2026-04-06', '2026-06-22', '2026-09-17', '2026-11-02', '2026-12-31']) assert.equal(nationalBusinessDay(day), true, day);
});

test('2027 movable holidays follow Vatican, USNO and statutory transfer rules', () => {
  for (const day of ['2027-03-26', '2027-03-27', '2027-06-21', '2027-06-28', '2027-09-17', '2027-10-11']) assert.equal(nationalBusinessDay(day), false, day);
  for (const day of ['2027-03-25', '2027-03-29', '2027-04-02', '2027-06-22', '2027-06-29', '2027-09-16', '2027-09-20', '2027-10-12']) assert.equal(nationalBusinessDay(day), true, day);
  for (const day of ['01-01', '05-01', '05-21', '07-16', '08-15', '09-18', '09-19', '10-31', '11-01', '12-08', '12-25']) assert.equal(nationalBusinessDay('2027-' + day), false, day);
  assert.equal(nationalBusinessDay('2027-05-03'), true, 'Saturday Labour Day does not add a Monday holiday');
});

test('bounded consumer can cross the year but never treats uncovered dates as endlessly skippable', () => {
  const nextBusinessDay = start => {
    if (!calendarCovered(start)) return undefined;
    const date = new Date(start + 'T12:00:00Z');
    for (;;) {
      date.setUTCDate(date.getUTCDate() + 1);
      const day = date.toISOString().slice(0, 10);
      if (!calendarCovered(day)) return undefined;
      if (nationalBusinessDay(day)) return day;
    }
  };
  assert.equal(nextBusinessDay('2026-12-31'), '2027-01-04');
  assert.equal(nextBusinessDay('2027-03-25'), '2027-03-29');
  assert.equal(nextBusinessDay('2027-09-16'), '2027-09-20');
  assert.equal(nextBusinessDay('2027-12-31'), undefined);
});
