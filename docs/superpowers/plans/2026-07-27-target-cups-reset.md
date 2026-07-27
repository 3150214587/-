# GokuGoku Target Cups and Daily Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the target-cup denominator fixed to the current reference plan and add a confirmed reset that clears only today’s drinking progress.

**Architecture:** Correct the pure target calculation first, then add a pure `resetToday(db)` mutation with rollback data. Connect that operation through the existing validated Electron IPC boundary and expose one compact settings action; preserve all profile, history, reminder, and persistence behavior.

**Tech Stack:** Electron 43, CommonJS, vanilla HTML/CSS/JavaScript, Node.js built-in test runner, `@electron/asar`.

---

## File Map

- Modify `test/hydration.test.js`: define the fixed-denominator behavior, including `7/5`.
- Modify `lib/hydration.js`: calculate target cups only from work goal and current cup capacity.
- Modify `test/data.test.js`: define daily reset scope and returned rollback snapshot.
- Modify `lib/data.js`: implement and export the pure daily reset.
- Modify `test/ui-contract.test.js`: require the reset button and IPC bridge.
- Modify `main.js`: persist reset, roll back on failure, clear stale undo/reminder state, and reschedule.
- Modify `preload.js`: expose `resetToday()`.
- Modify `ui/index.html`: add the reset action and its bright danger-outline styling.
- Modify `ui/index.js`: unify settings progress with `targetCups`, confirm reset, call IPC, and show feedback.
- Update screenshot-mode assertions and regenerate Windows/source archives.

The workspace is not a Git repository, so each task ends with an automated test checkpoint rather than a commit.

### Task 1: Fix the Target-Cup Denominator

**Files:**
- Modify: `test/hydration.test.js`
- Modify: `lib/hydration.js`

- [ ] **Step 1: Replace the capacity-change expectation and add the over-goal regression**

Use these tests:

```js
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
```

- [ ] **Step 2: Run RED**

Run:

```powershell
node --test test/hydration.test.js
```

Expected: current implementation returns `4` instead of `3` and `7` instead of `5`.

- [ ] **Step 3: Implement the fixed formula**

In `calculateTargets()` replace remaining-progress calculation with:

```js
const targetCups = Math.max(1, Math.ceil(workGoalMl / Number(cupMl)));

return {
  dailyGoalMl,
  workGoalMl,
  targetCups,
};
```

- [ ] **Step 4: Verify GREEN**

Run:

```powershell
node --test test/hydration.test.js
```

Expected: all hydration tests pass.

### Task 2: Add a Pure Daily Reset

**Files:**
- Modify: `test/data.test.js`
- Modify: `lib/data.js`

- [ ] **Step 1: Add a failing reset-scope test**

Import the data module as `data` and add:

```js
test('reset today clears only current progress and returns a rollback snapshot', () => {
  assert.equal(typeof data.resetToday, 'function');
  const db = data.createDefaultDatabase('2026-07-27');
  db.profileCompleted = true;
  db.settings.weightKg = 60;
  db.settings.cupMl = 300;
  db.drinkCount = 7;
  db.consumedMl = 1700;
  db.lastDrinkAt = 123456;
  db.history['2026-07-26'] = { drinkCount: 5, consumedMl: 1000 };
  const settingsBefore = structuredClone(db.settings);
  const historyBefore = structuredClone(db.history);

  const previous = data.resetToday(db);

  assert.deepEqual(previous, {
    drinkCount: 7,
    consumedMl: 1700,
    lastDrinkAt: 123456,
  });
  assert.equal(db.drinkCount, 0);
  assert.equal(db.consumedMl, 0);
  assert.equal(db.lastDrinkAt, null);
  assert.deepEqual(db.settings, settingsBefore);
  assert.deepEqual(db.history, historyBefore);
});
```

- [ ] **Step 2: Run RED**

Run:

```powershell
node --test test/data.test.js
```

Expected: assertion fails because `resetToday` is not exported.

- [ ] **Step 3: Implement and export `resetToday`**

Add to `lib/data.js`:

```js
function resetToday(db) {
  const previous = {
    drinkCount: db.drinkCount,
    consumedMl: db.consumedMl,
    lastDrinkAt: db.lastDrinkAt,
  };
  db.drinkCount = 0;
  db.consumedMl = 0;
  db.lastDrinkAt = null;
  return previous;
}
```

Add `resetToday` to `module.exports`.

- [ ] **Step 4: Verify GREEN**

Run:

```powershell
node --test test/data.test.js
```

Expected: all data tests pass.

### Task 3: Connect Reset Through IPC and UI

**Files:**
- Modify: `test/ui-contract.test.js`
- Modify: `main.js`
- Modify: `preload.js`
- Modify: `ui/index.html`
- Modify: `ui/index.js`

- [ ] **Step 1: Add a failing interface contract**

Load `preload.js` in `test/ui-contract.test.js`, then add:

```js
test('daily reset is exposed only through the main settings interface', () => {
  assert.match(indexHtml, /id="resetTodayBtn"/);
  assert.match(indexHtml, />重置今日记录</);
  assert.match(indexJs, /window\.confirm\(/);
  assert.match(indexJs, /window\.api\.resetToday\(\)/);
  assert.match(preloadJs, /resetToday:\s*\(\)\s*=>\s*ipcRenderer\.invoke\('reset-today'\)/);
  assert.match(mainJs, /ipcMain\.handle\('reset-today'/);
  assert.match(mainJs, /fromWindow\(event,\s*mainWin\)/);
});
```

- [ ] **Step 2: Run RED**

Run:

```powershell
node --test test/ui-contract.test.js
```

Expected: reset button, preload method, renderer call, and IPC handler are absent.

- [ ] **Step 3: Add the preload method**

Add to the exposed API:

```js
resetToday: () => ipcRenderer.invoke('reset-today'),
```

- [ ] **Step 4: Add the transactional main-process action**

Import `resetToday` from `lib/data.js`, then add:

```js
function resetTodayProgress() {
  if (persistenceError) return { ok: false, error: persistenceError, state: snapshot() };
  const previous = resetToday(db);
  const previousUndo = lastUndo;
  const previousNextAt = nextAt;
  lastUndo = null;
  nextAt = null;

  if (!save()) {
    Object.assign(db, previous);
    lastUndo = previousUndo;
    nextAt = previousNextAt;
    return { ok: false, error: persistenceError, state: pushState({ rebuildMenu: true }) };
  }

  if (isReminderVisible()) cancelVisibleReminder();
  reminderActive = false;
  const availability = getReminderAvailability(new Date(), db.settings);
  if (availability.allowed) scheduleNext();
  return { ok: true, state: pushState({ rebuildMenu: true }) };
}
```

Register:

```js
ipcMain.handle('reset-today', (event) => (
  fromWindow(event, mainWin)
    ? resetTodayProgress()
    : { ok: false, error: '无效窗口请求', state: snapshot() }
));
```

- [ ] **Step 5: Add the settings action**

Add a separate settings field in `ui/index.html`:

```html
<div class="field reset-field">
  <div class="fname">今日饮水记录</div>
  <button class="reset-today" id="resetTodayBtn">重置今日记录</button>
</div>
```

Style it:

```css
.reset-today {
  height: 38px;
  padding: 0 16px;
  border: 2px solid #e58a78;
  border-radius: 999px;
  background: #fffdf4;
  color: var(--danger);
  font: 800 13px var(--font);
  cursor: pointer;
}
.reset-today:hover { background: var(--danger); color: #fff; }
```

- [ ] **Step 6: Make settings progress and reset behavior consistent**

In `updateSettingsPreview()` use:

```js
$('#sumCups').textContent = `${S.drinkCount}/${preview.targetCups}杯`;
```

Bind the reset button:

```js
$('#resetTodayBtn').addEventListener('click', async () => {
  const confirmed = window.confirm('确认清空今天的饮水记录吗？此操作不能撤销。');
  if (!confirmed) return;
  const result = await window.api.resetToday();
  if (!result.ok) {
    toast(result.error || '重置失败，请稍后重试。', { duration: 10_000 });
    return;
  }
  toast('今日饮水记录已重置。');
});
```

- [ ] **Step 7: Verify GREEN**

Run:

```powershell
node --test test/ui-contract.test.js
```

Expected: all UI contract tests pass.

### Task 4: Electron Verification and Release

**Files:**
- Modify: `main.js` screenshot-mode assertions
- Verify: all source and release artifacts

- [ ] **Step 1: Extend screenshot mode**

After the existing drink/undo assertions, execute:

```js
await mainWin.webContents.executeJavaScript(`
  window.confirm = () => true;
  document.getElementById('resetTodayBtn').click();
  void 0;
`);
await new Promise((resolve) => setTimeout(resolve, 350));
if (db.drinkCount !== 0 || db.consumedMl !== 0 || db.lastDrinkAt !== null) {
  throw new Error('今日记录重置验证失败');
}
```

- [ ] **Step 2: Run the full suite and syntax checks**

Run:

```powershell
npm.cmd test
```

Then run Node `--check` for `main.js`, `preload.js`, `lib/*.js`, and `ui/*.js`.

Expected: zero test failures and zero syntax failures.

- [ ] **Step 3: Build a clean runtime ASAR and run the existing Windows EXE in isolated screenshot mode**

Use a clean staging directory containing `assets`, `lib`, `ui`, `main.js`, `preload.js`, and `package.json`. Replace only the task-owned v1.1 release folder’s `resources/app.asar`, then run the EXE with isolated `SHOT_DATA_DIR` and `SHOT_DIR`.

Expected: six screenshots are created, all built-in interaction assertions pass, and the process exits `0`.

- [ ] **Step 4: Inspect UI states**

Confirm:

- main denominator reflects the fixed reference target;
- settings “当前进度” uses the same denominator;
- “重置今日记录” is visible and not clipped;
- reset returns progress to `0/目标杯数`;
- reminder controls remain unchanged.

- [ ] **Step 5: Rebuild and verify archives**

Regenerate:

- `dist/GokuGoku-win32-x64-v1.1.0.zip`
- `dist/GokuGoku-src-v1.1.0.zip`

Verify packaged ASAR version/content, required ZIP entries, actual EXE screenshot-mode startup, full tests, and SHA-256 hashes.
