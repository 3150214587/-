# GokuGoku Direct Number Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace preset hydration settings with direct numeric entry, rename cup capacity to per-drink amount, and stop periodic state rendering from interrupting work-time selection.

**Architecture:** Keep the existing Electron IPC and schema-v2 storage boundaries. Add one pure interval validator, normalize legacy automatic mode to manual on load, remove all runtime automatic-interval paths, and use focus-aware renderer synchronization so server state never overwrites a control while the user is editing it.

**Tech Stack:** Electron 43, CommonJS, vanilla HTML/CSS/JavaScript, Node.js built-in test runner, `@electron/packager`.

---

## File Map

- Modify `test/hydration.test.js`: define the accepted manual interval range and profile validation.
- Modify `lib/hydration.js`: add and export pure `validateIntervalMin()`; use it in profile validation.
- Modify `test/data.test.js`: define the new manual default and legacy-auto normalization.
- Modify `lib/data.js`: default and migrate `intervalMode` to `manual` without changing `intervalMin`.
- Modify `test/ui-contract.test.js`: define direct-number controls, terminology, removal of automatic UI/runtime paths, and focus-safe work-time synchronization.
- Modify `main.js`: accept any integer interval from 1–1440, persist onboarding interval, and remove automatic recalculation.
- Modify `ui/index.html`: add interval number inputs and rename all cup-capacity labels.
- Modify `ui/index.js`: remove interval buttons/recommendation preview logic, validate and save direct input, and synchronize focused controls safely.
- Modify `README.md` and `使用说明.md`: document manual interval input and “每次喝水量”.
- Regenerate and verify the existing v1.1 Windows and source release archives.

The workspace is not a Git repository, so each task ends with an automated verification checkpoint instead of a commit.

### Task 1: Add Manual-Interval Validation and Data Compatibility

**Files:**
- Modify: `test/hydration.test.js`
- Modify: `lib/hydration.js`
- Modify: `test/data.test.js`
- Modify: `lib/data.js`

- [ ] **Step 1: Write failing hydration validation tests**

Add `validateIntervalMin` to the import from `lib/hydration.js` and add:

```js
test('manual reminder interval accepts only whole minutes from 1 to 1440', () => {
  for (const value of [1, 45, 1440, '90']) {
    assert.deepEqual(validateIntervalMin(value), {
      ok: true,
      intervalMin: Number(value),
    });
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
```

Add `intervalMin: 45` to both existing `validateProfileInput()` calls in the non-finite-value test so that each case still isolates weight or per-drink amount.

- [ ] **Step 2: Run hydration tests and verify RED**

Run:

```powershell
node --test test/hydration.test.js
```

Expected: module import or call fails because `validateIntervalMin` does not exist.

- [ ] **Step 3: Implement the pure interval validator**

Add before `validateProfileInput()` in `lib/hydration.js`:

```js
function validateIntervalMin(value) {
  if (value === null || value === undefined || value === '') {
    return { ok: false, error: '催水间隔请输入 1–1440 分钟的整数' };
  }
  const intervalMin = Number(value);
  if (!Number.isInteger(intervalMin) || intervalMin < 1 || intervalMin > 1440) {
    return { ok: false, error: '催水间隔请输入 1–1440 分钟的整数' };
  }
  return { ok: true, intervalMin };
}
```

Update `validateProfileInput()`:

```js
function validateProfileInput(input) {
  const weightKg = Number(input && input.weightKg);
  const cupMl = Number(input && input.cupMl);
  if (!Number.isFinite(weightKg) || weightKg < 30 || weightKg > 300) {
    return { ok: false, error: '体重请输入 30–300kg' };
  }
  if (!Number.isFinite(cupMl) || cupMl < 50 || cupMl > 1000) {
    return { ok: false, error: '每次喝水量请输入 50–1000ml' };
  }
  const intervalValidation = validateIntervalMin(input && input.intervalMin);
  if (!intervalValidation.ok) return intervalValidation;
  const dndValidation = validateDndRanges(input && input.dndRanges);
  if (!dndValidation.ok) return dndValidation;
  return {
    ok: true,
    profile: {
      weightKg,
      cupMl,
      intervalMin: intervalValidation.intervalMin,
      dndRanges: dndValidation.ranges,
    },
  };
}
```

Export `validateIntervalMin` from `module.exports`.

- [ ] **Step 4: Run hydration tests and verify GREEN**

Run:

```powershell
node --test test/hydration.test.js
```

Expected: all hydration tests pass.

- [ ] **Step 5: Write failing data compatibility tests**

In the default-database test, require:

```js
assert.equal(db.settings.intervalMin, 45);
assert.equal(db.settings.intervalMode, 'manual');
```

Add:

```js
test('legacy automatic interval becomes manual without changing its saved minutes', () => {
  const result = migrateDatabase({
    schemaVersion: 2,
    profileCompleted: true,
    settings: {
      weightKg: 60,
      cupMl: 200,
      intervalMin: 75,
      intervalMode: 'auto',
      dndRanges: [],
    },
  }, '2026-07-27');

  assert.equal(result.db.settings.intervalMin, 75);
  assert.equal(result.db.settings.intervalMode, 'manual');
});
```

- [ ] **Step 6: Run data tests and verify RED**

Run:

```powershell
node --test test/data.test.js
```

Expected: default and migrated modes are `auto`, not `manual`.

- [ ] **Step 7: Normalize new and existing data to manual mode**

Change the default in `lib/data.js`:

```js
intervalMode: 'manual',
```

In `migrateDatabase()`, place `intervalMode: 'manual'` after the source settings spread so old `auto` values cannot override it:

```js
db.settings = {
  ...db.settings,
  ...(source.settings || {}),
  intervalMode: 'manual',
  dndRanges: Array.isArray(source.settings && source.settings.dndRanges)
    ? source.settings.dndRanges.map(({ start, end }) => ({ start, end }))
    : db.settings.dndRanges,
};
```

- [ ] **Step 8: Verify Task 1**

Run:

```powershell
node --test test/hydration.test.js test/data.test.js
```

Expected: all hydration and data tests pass.

### Task 2: Remove Automatic Runtime Behavior

**Files:**
- Modify: `test/ui-contract.test.js`
- Modify: `main.js`

- [ ] **Step 1: Replace the old automatic-interval UI contract with a failing runtime contract**

Replace `interval selection exposes one compact automatic option` with:

```js
test('reminder interval is manual-only across renderer and main process', () => {
  assert.doesNotMatch(indexJs, /setSetting\('intervalMode',\s*'auto'\)/);
  assert.doesNotMatch(indexJs, /buildIntervalButtons|syncIntervalButtons/);
  assert.doesNotMatch(mainJs, /INTERVAL_OPTIONS|refreshAutomaticInterval/);
  assert.match(mainJs, /validateIntervalMin\(value\)/);
  assert.match(mainJs, /db\.settings\.intervalMin = validation\.profile\.intervalMin/);
});
```

- [ ] **Step 2: Run the focused contract and verify RED**

Run:

```powershell
node --test test/ui-contract.test.js
```

Expected: the new manual-only contract fails because both renderer and main process still contain automatic interval code.

- [ ] **Step 3: Replace main-process automatic logic with range validation**

Change the hydration imports in `main.js` to:

```js
const {
  calculateTargets,
  getReminderAvailability,
  validateIntervalMin,
  validateProfileInput,
} = require('./lib/hydration.js');
```

Delete `INTERVAL_OPTIONS`, `refreshAutomaticInterval()`, and every call to `refreshAutomaticInterval()`.

Simplify `derived()`:

```js
function derived() {
  return calculateTargets({
    weightKg: Number(db.settings.weightKg) || 60,
    cupMl: Number(db.settings.cupMl) || 200,
    workStart: db.settings.workStart,
    workEnd: db.settings.workEnd,
    consumedMl: db.consumedMl,
    drinkCount: db.drinkCount,
  });
}
```

Remove `intervalMode` and `recommendedIntervalMin` from `snapshot()`; keep `intervalMin`.

In `saveProfile()`, persist the validated interval:

```js
db.settings.weightKg = validation.profile.weightKg;
db.settings.cupMl = validation.profile.cupMl;
db.settings.intervalMin = validation.profile.intervalMin;
db.settings.intervalMode = 'manual';
db.settings.dndRanges = validation.profile.dndRanges;
```

Replace interval branches in `setSetting()` with:

```js
} else if (key === 'intervalMin') {
  const validation = validateIntervalMin(value);
  if (!validation.ok) return { ok: false, error: validation.error, ...snapshot() };
  db.settings.intervalMin = validation.intervalMin;
  db.settings.intervalMode = 'manual';
```

Delete the `intervalMode` branch. Change the reschedule list to:

```js
if (['workStart', 'workEnd', 'weekend', 'intervalMin'].includes(key)) {
  nextAt = null;
}
```

- [ ] **Step 4: Update screenshot-mode setup**

Set the onboarding interval before submitting:

```js
document.getElementById('setupInterval').value = '45';
```

Delete the screenshot-mode `refreshAutomaticInterval()` call after assigning demo data.

- [ ] **Step 5: Run the focused tests**

Run:

```powershell
node --test test/hydration.test.js test/data.test.js test/ui-contract.test.js
```

Expected: hydration and data tests pass; the manual-only runtime assertions pass, while direct-control assertions from Task 3 are not present yet.

### Task 3: Add Direct Numeric Controls and Fix Work-Time Focus Races

**Files:**
- Modify: `test/ui-contract.test.js`
- Modify: `ui/index.html`
- Modify: `ui/index.js`

- [ ] **Step 1: Add failing renderer contracts**

Add:

```js
test('profile and interval settings use direct numeric entry with new terminology', () => {
  assert.match(indexHtml, /id="weightInput"[^>]*type="number"/);
  assert.match(indexHtml, /id="cupInput"[^>]*type="number"/);
  assert.match(indexHtml, /id="intervalInput"[^>]*type="number"[^>]*min="1"[^>]*max="1440"[^>]*step="1"/);
  assert.match(indexHtml, /id="setupInterval"[^>]*type="number"[^>]*min="1"[^>]*max="1440"[^>]*step="1"/);
  assert.doesNotMatch(indexHtml, /id="segInterval"/);
  assert.equal(indexHtml.includes('杯容量'), false);
  assert.equal(indexHtml.includes('每杯容量'), false);
  assert.match(indexHtml, /每次喝水量（ml）/);
});

test('periodic state rendering never overwrites a focused setting control', () => {
  assert.match(indexJs, /function syncControlValue\(control,\s*value\)/);
  assert.match(indexJs, /document\.activeElement !== control/);
  assert.match(indexJs, /syncControlValue\(\$\('#selStart'\),\s*S\.workStart\)/);
  assert.match(indexJs, /syncControlValue\(\$\('#selEnd'\),\s*S\.workEnd\)/);
  assert.match(indexJs, /syncControlValue\(\$\('#intervalInput'\),\s*S\.intervalMin\)/);
});
```

- [ ] **Step 2: Run the focused contract and verify RED**

Run:

```powershell
node --test test/ui-contract.test.js
```

Expected: failures for missing interval inputs, old cup-capacity wording, segmented interval UI, and missing focus guard.

- [ ] **Step 3: Replace segmented controls in `ui/index.html`**

Delete the two `#segInterval` CSS rules. Add:

```css
.numeric-setting { width: 128px; }
.mini-label.full { grid-column: 1 / -1; }
```

Change the main profile labels to:

```html
<label class="mini-label">体重（kg）<input id="weightInput" type="number" inputmode="decimal" min="30" max="300" step="0.1"></label>
<label class="mini-label">每次喝水量（ml）<input id="cupInput" type="number" inputmode="numeric" min="50" max="1000" step="10"></label>
```

Replace the interval field with:

```html
<div class="field">
  <div class="fname">催水间隔（分钟）</div>
  <input class="numeric-setting" id="intervalInput" type="number" inputmode="numeric" min="1" max="1440" step="1">
</div>
```

Change onboarding fields to:

```html
<div class="profile-grid">
  <label class="mini-label">你的体重（kg）<input id="setupWeight" type="number" inputmode="decimal" min="30" max="300" step="0.1" value="60"></label>
  <label class="mini-label">每次喝水量（ml）<input id="setupCup" type="number" inputmode="numeric" min="50" max="1000" step="10" value="200"></label>
  <label class="mini-label full">催水间隔（分钟）<input id="setupInterval" type="number" inputmode="numeric" min="1" max="1440" step="1" value="45"></label>
</div>
```

Keep the onboarding preview card, but initialize its interval text to `45分钟`.

- [ ] **Step 4: Remove renderer recommendation and segmented-button logic**

Delete:

```js
const INTERVALS = [30, 45, 60, 90];
```

In `calculatePreview()`, delete the `usable`, `raw`, and interval-reduction logic. Return:

```js
return { dailyGoalMl, workGoalMl, targetCups };
```

In both preview functions, read the relevant interval input and display it directly:

```js
const interval = Number($('#setupInterval').value);
$('#previewInterval').textContent = `${interval}分钟`;
```

Delete `buildIntervalButtons()` and `syncIntervalButtons()`, their DOMContentLoaded call, and their render call.

- [ ] **Step 5: Add renderer-side numeric validation**

Add:

```js
function validateProfileNumbers(weight, cup, interval) {
  if (!Number.isFinite(weight) || weight < 30 || weight > 300) {
    return '体重请输入 30–300kg';
  }
  if (!Number.isFinite(cup) || cup < 50 || cup > 1000) {
    return '每次喝水量请输入 50–1000ml';
  }
  if (!Number.isInteger(interval) || interval < 1 || interval > 1440) {
    return '催水间隔请输入 1–1440 分钟的整数';
  }
  return '';
}
```

In `updateSetupPreview()` and `updateSettingsPreview()`, combine numeric and DND validation:

```js
const numericError = validateProfileNumbers(weight, cup, interval);
const rangeError = validateRanges(ranges);
errorNode.textContent = numericError || rangeError;
if (numericError) return;
```

In `submitProfile()`, read the matching interval input, check both validators, and send:

```js
const result = await window.api.saveProfile({
  weightKg: weight,
  cupMl: cup,
  intervalMin: interval,
  dndRanges: ranges,
});
```

- [ ] **Step 6: Add focus-safe synchronization**

Add:

```js
function syncControlValue(control, value) {
  if (document.activeElement !== control && String(control.value) !== String(value)) {
    control.value = String(value);
  }
}
```

In `syncProfileDraft()`, initialize `intervalInput` and `setupInterval` from `state.intervalMin || 45`.

Replace the two direct work-time assignments in `render()` and also synchronize the main interval:

```js
syncControlValue($('#intervalInput'), S.intervalMin);
syncControlValue($('#selStart'), S.workStart);
syncControlValue($('#selEnd'), S.workEnd);
```

- [ ] **Step 7: Bind and persist numeric interval changes**

Add:

```js
async function saveManualInterval() {
  const input = $('#intervalInput');
  const interval = Number(input.value);
  const error = validateProfileNumbers(
    Number($('#weightInput').value),
    Number($('#cupInput').value),
    interval,
  );
  if (error) {
    $('#settingsError').textContent = error;
    return;
  }
  const result = await window.api.setSetting('intervalMin', interval);
  if (!result.ok) {
    $('#settingsError').textContent = result.error || '催水间隔保存失败';
    return;
  }
  $('#settingsError').textContent = validateRanges(settingsRanges);
}
```

Bind:

```js
$('#intervalInput').addEventListener('input', updateSettingsPreview);
$('#intervalInput').addEventListener('change', saveManualInterval);
$('#setupInterval').addEventListener('input', updateSetupPreview);
```

- [ ] **Step 8: Run the focused contract and verify GREEN**

Run:

```powershell
node --test test/ui-contract.test.js
```

Expected: all UI contract tests pass.

### Task 4: Update Documentation and Run Full Verification

**Files:**
- Modify: `README.md`
- Modify: `使用说明.md`
- Verify: all `test/*.test.js`
- Verify: all JavaScript source files

- [ ] **Step 1: Update user-facing documentation**

Use “每次喝水量” everywhere in both files. Replace automatic recommendation language with:

```markdown
- **自定催水间隔**：可直接输入 1–1440 分钟；午休、会议、下班后和非工作日仍不会弹窗。
```

State that changing the per-drink amount affects only later check-ins and does not rewrite already accumulated millilitres.

- [ ] **Step 2: Scan for stale visible terminology and auto controls**

Run:

```powershell
rg -n "杯容量|每杯容量|自动按目标|使用推荐|segInterval|intervalMode.*auto|refreshAutomaticInterval" ui README.md 使用说明.md main.js
```

Expected: no matches. Internal `cupMl` and normalized `intervalMode: 'manual'` may remain.

- [ ] **Step 3: Run the complete test suite**

Run:

```powershell
npm.cmd test
```

Expected: all hydration, data, scheduler, and UI contract tests pass with zero failures.

- [ ] **Step 4: Check JavaScript syntax**

Run Node `--check` for `main.js`, `preload.js`, every `lib/*.js`, and every `ui/*.js`.

Expected: exit code `0` with no syntax errors.

- [ ] **Step 5: Run Electron screenshot mode**

Launch Electron with `SHOT=1`, a workspace-local `SHOT_DIR`, and isolated `SHOT_DATA_DIR`.

Expected: screenshot mode completes onboarding, profile save, drink, undo, reset, expanded settings, and reminder assertions, then exits successfully.

- [ ] **Step 6: Inspect interaction states**

Confirm:

- onboarding contains direct inputs for weight, per-drink amount, and interval;
- main settings contain the same direct numeric fields and no automatic/preset interval buttons;
- invalid interval values `0`, `1.5`, and `1441` show the range error and are not saved;
- leaving a work-time dropdown open through at least two one-second state pushes does not reset or close it;
- a completed work-time selection persists after application restart;
- a new drink uses the updated per-drink amount while previous accumulated millilitres remain unchanged.

### Task 5: Repackage and Verify Release Artifacts

**Files:**
- Regenerate: `dist/GokuGoku-win32-x64-v1.1.0`
- Regenerate: `dist/GokuGoku-win32-x64-v1.1.0.zip`
- Regenerate: `dist/GokuGoku-src-v1.1.0.zip`

- [ ] **Step 1: Build the Windows folder**

Run:

```powershell
npm.cmd run pack:win
```

Replace only the task-owned v1.1 release folder under `dist`; do not modify the preserved original app outside `GokuGoku-src`.

- [ ] **Step 2: Build clean ZIP archives**

Create the Windows ZIP from the release folder. Create the source ZIP from a workspace-local staging directory that excludes `node_modules`, `dist`, temporary screenshots, runtime data, and dot-prefixed temporary directories.

- [ ] **Step 3: Verify the packaged app**

Inspect packaged `resources/app.asar` and confirm:

- `package.json` version is `1.1.0`;
- required `main.js`, `lib/*`, and `ui/*` files are present;
- the packaged UI contains both numeric interval inputs and “每次喝水量”;
- automatic and preset interval controls are absent;
- the packaged EXE completes isolated screenshot mode.

- [ ] **Step 4: Record checksums**

Run:

```powershell
Get-FileHash -Algorithm SHA256 -LiteralPath `
  'dist\GokuGoku-win32-x64-v1.1.0.zip', `
  'dist\GokuGoku-src-v1.1.0.zip'
```

Expected: both archives exist and return SHA-256 hashes.
