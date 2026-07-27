'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  calculateTargets,
  getReminderAvailability,
  validateIntervalMin,
  validateProfileInput,
  validateDndRanges,
} = require('../lib/hydration.js');

test('60kg over an 8 hour workday produces 1800ml daily and 900ml at work', () => {
  const result = calculateTargets({
    weightKg: 60,
    cupMl: 200,
    workStart: 9,
    workEnd: 17,
    consumedMl: 0,
    drinkCount: 0,
  });

  assert.equal(result.dailyGoalMl, 1800);
  assert.equal(result.workGoalMl, 900);
  assert.equal(result.targetCups, 5);
});

test('work target is rounded to 50ml and clamped to 800-1200ml', () => {
  assert.equal(calculateTargets({
    weightKg: 30,
    cupMl: 200,
    workStart: 9,
    workEnd: 17,
  }).workGoalMl, 800);

  assert.equal(calculateTargets({
    weightKg: 200,
    cupMl: 200,
    workStart: 9,
    workEnd: 18,
  }).workGoalMl, 1200);
});

test('target cups are recalculated from the reference goal and current cup capacity', () => {
  const result = calculateTargets({
    weightKg: 60,
    cupMl: 300,
    workStart: 9,
    workEnd: 17,
    consumedMl: 400,
    drinkCount: 2,
  });

  assert.equal(result.workGoalMl, 900);
  assert.equal(result.targetCups, 3);
});

test('drinking beyond the goal does not increase the target denominator', () => {
  const result = calculateTargets({
    weightKg: 60,
    cupMl: 200,
    workStart: 9,
    workEnd: 17,
    consumedMl: 1400,
    drinkCount: 7,
  });

  assert.equal(result.targetCups, 5);
});

test('DND validation rejects reversed and overlapping time ranges', () => {
  assert.equal(validateDndRanges([{ start: '13:00', end: '12:00' }]).ok, false);
  assert.equal(validateDndRanges([
    { start: '12:00', end: '13:00' },
    { start: '12:30', end: '14:00' },
  ]).ok, false);
  assert.equal(validateDndRanges([
    { start: '12:00', end: '13:00' },
    { start: '13:00', end: '14:00' },
  ]).ok, true);
});

test('profile validation rejects non-finite weight and cup values', () => {
  assert.equal(validateProfileInput({
    weightKg: Number.NaN,
    cupMl: 200,
    intervalMin: 45,
    dndRanges: [],
  }).ok, false);
  assert.equal(validateProfileInput({
    weightKg: 60,
    cupMl: Number.POSITIVE_INFINITY,
    intervalMin: 45,
    dndRanges: [],
  }).ok, false);
});

test('manual reminder interval accepts only whole minutes from 1 to 1440', () => {
  for (const value of [1, 45, 1440, '90']) {
    assert.deepEqual(validateIntervalMin(value), { ok: true, intervalMin: Number(value) });
  }

  for (const value of [0, 1441, 1.5, Number.NaN, Number.POSITIVE_INFINITY, '']) {
    const result = validateIntervalMin(value);
    assert.equal(result.ok, false);
    assert.match(result.error, /1–1440/);
  }
});

test('profile validation returns the manual reminder interval', () => {
  const result = validateProfileInput({
    weightKg: 60,
    cupMl: 250,
    intervalMin: 75,
    dndRanges: [],
  });

  assert.equal(result.ok, true);
  assert.equal(result.profile.intervalMin, 75);
});

test('availability defers reminders to the end of DND', () => {
  const now = new Date(2026, 6, 27, 12, 30, 0, 0);
  const result = getReminderAvailability(now, {
    workStart: 9,
    workEnd: 18,
    weekend: false,
    dndRanges: [{ start: '12:00', end: '13:00' }],
  });

  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'dnd');
  assert.equal(result.resumeAt.getTime(), new Date(2026, 6, 27, 13, 0, 0, 0).getTime());
});

test('availability moves an after-hours Friday reminder to Monday morning', () => {
  const friday = new Date(2026, 6, 31, 19, 0, 0, 0);
  const result = getReminderAvailability(friday, {
    workStart: 9,
    workEnd: 18,
    weekend: false,
    dndRanges: [],
  });

  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'after');
  assert.equal(result.resumeAt.getTime(), new Date(2026, 7, 3, 9, 0, 0, 0).getTime());
});
