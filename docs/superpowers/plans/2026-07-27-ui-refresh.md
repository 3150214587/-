# GokuGoku v1.1 UI Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the original bright, rounded GokuGoku visual language, enlarge the interface, and remove the requested explanatory copy without changing reminder or hydration behavior.

**Architecture:** Add a static UI contract test around the existing Electron HTML/CSS/JS files, then make focused changes to the main renderer, shared design tokens, reminder renderer, and BrowserWindow dimensions. Preserve the existing state and IPC interfaces; automatic interval selection remains available through a compact segmented option.

**Tech Stack:** Electron 43, HTML, CSS, vanilla JavaScript, Node.js built-in test runner, `@electron/packager`.

---

## File Map

- Create `test/ui-contract.test.js`: static contract for required copy, removed copy, font stack, dimensions, and compact interval controls.
- Modify `ui/index.html`: remove redundant copy and enlarge/rebalance the main and onboarding layout.
- Modify `ui/index.js`: replace the standalone “use recommendation” control with an `自动` segmented option.
- Modify `ui/style.css`: preserve the original font stack and bright color tokens while increasing shared control sizes.
- Modify `ui/reminder.html`: enlarge reminder typography, cards, and controls using the same visual language.
- Modify `main.js`: increase main and reminder BrowserWindow sizes and update expand/collapse bounds.
- Regenerate `dist/GokuGoku-win32-x64-v1.1.0`, `dist/GokuGoku-win32-x64-v1.1.0.zip`, and `dist/GokuGoku-src-v1.1.0.zip`.

The workspace is not a Git repository, so commit steps are replaced with test and artifact checkpoints.

### Task 1: Add the UI Contract Test

**Files:**
- Create: `test/ui-contract.test.js`
- Test: `test/ui-contract.test.js`

- [ ] **Step 1: Write a failing static contract test**

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(root, 'ui', 'index.html'), 'utf8');
const indexJs = fs.readFileSync(path.join(root, 'ui', 'index.js'), 'utf8');
const styleCss = fs.readFileSync(path.join(root, 'ui', 'style.css'), 'utf8');
const mainJs = fs.readFileSync(path.join(root, 'main.js'), 'utf8');

test('main UI keeps the original bundled rounded font stack', () => {
  assert.match(styleCss, /--font:\s*'Nunito',\s*'Yuanti SC',\s*'PingFang SC',\s*'Microsoft YaHei UI',\s*'Microsoft YaHei',\s*sans-serif/);
});

test('main UI removes the requested helper copy and uses the new footer', () => {
  for (const removed of [
    '自动按目标均匀排课，也可手动指定',
    '手动指定',
    '推荐 90 分钟',
    '使用推荐',
    '时段之外绝不提示',
    '会议、午休期间不弹窗',
    '容量修改只影响之后的打卡',
    '上班建议',
    '简易饮水参考',
    '非医疗建议',
  ]) {
    assert.equal(indexHtml.includes(removed), false, `unexpected copy: ${removed}`);
  }
  assert.match(indexHtml, /本课对口渴负全部责任 · © 水分補給課/);
});

test('interval selection exposes one compact automatic option', () => {
  assert.match(indexJs, /button\.textContent = '自动'/);
  assert.match(indexJs, /setSetting\('intervalMode', 'auto'\)/);
  assert.doesNotMatch(indexHtml, /id="btnAutoInterval"/);
  assert.doesNotMatch(indexHtml, /id="intervalNote"/);
});

test('main window uses the enlarged fixed width and base height', () => {
  assert.match(mainJs, /width:\s*480/);
  assert.match(mainJs, /height:\s*760/);
  assert.match(mainJs, /width:\s*520/);
  assert.match(mainJs, /height:\s*380/);
});
```

- [ ] **Step 2: Run the new test and verify RED**

Run:

```powershell
node --test test/ui-contract.test.js
```

Expected: failures for old helper copy, missing `自动` segmented option, old `404 × 636` window dimensions, and old reminder dimensions.

### Task 2: Simplify Main UI Copy and Preserve Interval Behavior

**Files:**
- Modify: `ui/index.html`
- Modify: `ui/index.js`
- Test: `test/ui-contract.test.js`

- [ ] **Step 1: Remove the millilitre progress row and helper descriptions**

In `ui/index.html`, remove the `.ml-progress` element, the `.auto-row` element, `btnAutoInterval`, `intervalNote`, and all `<small>` helper text inside the expanded settings panel. Keep labels, controls, input validation, profile summary values, and the add-DND action.

Replace the footer content with:

```html
本课对口渴负全部责任 · © 水分補給課
```

- [ ] **Step 2: Render automatic mode inside the interval segmented control**

Replace `buildIntervalButtons()` and `syncIntervalButtons()` in `ui/index.js` with:

```js
function buildIntervalButtons() {
  const container = $('#segInterval');
  const autoButton = document.createElement('button');
  autoButton.textContent = '自动';
  autoButton.dataset.mode = 'auto';
  autoButton.addEventListener('click', () => {
    Sound.click();
    window.api.setSetting('intervalMode', 'auto');
  });
  container.appendChild(autoButton);

  for (const minutes of INTERVALS) {
    const button = document.createElement('button');
    button.textContent = `${minutes} 分`;
    button.dataset.v = minutes;
    button.addEventListener('click', () => {
      Sound.click();
      window.api.setSetting('intervalMin', minutes);
    });
    container.appendChild(button);
  }
}

function syncIntervalButtons(value, mode) {
  [...$('#segInterval').children].forEach((button) => {
    const selected = button.dataset.mode === 'auto'
      ? mode === 'auto'
      : mode !== 'auto' && Number(button.dataset.v) === Number(value);
    button.classList.toggle('on', selected);
  });
}
```

Update the render call to:

```js
syncIntervalButtons(S.intervalMin, S.intervalMode);
```

Remove all runtime writes and event listeners for `intervalNote` and `btnAutoInterval`. Keep recommendation calculations in the main process unchanged.

- [ ] **Step 3: Run the focused test**

Run:

```powershell
node --test test/ui-contract.test.js
```

Expected: copy and interval tests pass; window-size test still fails.

### Task 3: Restore the Bright, Large Main Visual System

**Files:**
- Modify: `ui/style.css`
- Modify: `ui/index.html`
- Test: `test/ui-contract.test.js`

- [ ] **Step 1: Preserve the exact original font stack and color tokens**

Keep these shared tokens in `ui/style.css`:

```css
--bg: #f8f8f0;
--panel: #f7f3df;
--panel-2: #f0e8d8;
--ink: #794f27;
--text: #725d42;
--sub: #9f927d;
--faint: #c4b89e;
--mint: #19c8b9;
--mint-hi: #3dd4c6;
--mint-lo: #11a89b;
--yellow: #ffcc00;
--font: 'Nunito', 'Yuanti SC', 'PingFang SC', 'Microsoft YaHei UI', 'Microsoft YaHei', sans-serif;
```

Increase shared proportions:

```css
.window { inset: 10px; border-radius: 30px; }
.titlebar { height: 64px; padding: 0 18px 0 24px; }
.brand img { width: 32px; height: 32px; }
.brand .name { font-size: 21px; }
.brand .name small { font-size: 11px; }
.winbtns button { width: 34px; height: 34px; font-size: 16px; }
.content { padding: 6px 24px 0; gap: 16px; }
.card { border-width: 2px; border-radius: 25px; padding: 20px 22px; }
.btn.big { height: 66px; font-size: 22px; }
.seg { gap: 8px; }
.seg button { height: 38px; padding: 0 15px; font-size: 14px; }
select { height: 40px; font-size: 14px; }
input { height: 42px; font-size: 14px; }
```

- [ ] **Step 2: Increase main-page component scale in `ui/index.html`**

Adjust its inline component styles so the old hierarchy remains:

```css
.hero { gap: 18px; padding: 20px 22px 18px; min-height: 174px; }
.bubble { min-height: 88px; padding: 15px 17px; border-radius: 20px; font-size: 16px; }
.stats .label { font-size: 18px; }
.stats .count { font-size: 17px; }
.stats .count b { font-size: 30px; }
.cups { gap: 8px; min-height: 38px; margin: 14px 0; }
.timerline { padding-top: 13px; font-size: 15px; }
.collapse-head { font-size: 17px; }
.collapse-head .arrow { width: 34px; height: 34px; }
.field { padding: 15px 0; }
.field .fname { font-size: 15px; }
.mini-label { gap: 6px; font-size: 12px; }
.summary-strip { gap: 8px; padding: 11px; }
.summary-strip span { font-size: 11px; }
.summary-strip b { font-size: 15px; }
.save-profile { height: 48px; }
.footer { padding: 16px 0 13px; font-size: 12px; }
```

Set the mascot SVG to `138 × 138` and keep the original water-drop artwork and speech bubble.

- [ ] **Step 3: Enlarge and simplify onboarding**

Apply these component dimensions in `ui/index.html`:

```css
.setup-overlay { inset: 64px 0 0; padding: 16px 24px 22px; }
.setup-card { padding: 27px 24px 22px; border-radius: 28px; }
.setup-card h1 { margin: 6px 0 8px; font-size: 28px; }
.setup-card > p { margin-bottom: 18px; font-size: 14px; }
.setup-section { margin-top: 17px; }
.setup-section h2 { margin-bottom: 10px; font-size: 15px; }
.setup-preview { gap: 9px; margin: 16px 0; }
.setup-preview div { padding: 12px 9px; border-radius: 16px; font-size: 11px; }
.setup-preview b { font-size: 18px; }
.setup-submit { height: 58px; font-size: 18px; }
```

Remove the `WELCOME, NEW MEMBER` kicker and the sentence about local-only storage. Preserve the weight and cup fields, multiple DND ranges, four-value goal preview, validation error, save action, and formula disclaimer.

- [ ] **Step 4: Run the focused contract**

Run:

```powershell
node --test test/ui-contract.test.js
```

Expected: font and copy tests pass; only window-size assertions remain failing.

### Task 4: Enlarge Electron and Reminder Windows

**Files:**
- Modify: `main.js`
- Modify: `ui/reminder.html`
- Test: `test/ui-contract.test.js`

- [ ] **Step 1: Update BrowserWindow dimensions**

In `createWindows()` use:

```js
mainWin = new BrowserWindow({
  width: 480,
  height: 760,
  minWidth: 480,
  minHeight: 680,
  // existing options unchanged
});
```

Use `520 × 380` for the reminder window. In the `set-expand` IPC handler, use width `480`, collapsed height `760`, and expanded height:

```js
const target = open ? Math.min(960, workArea.height - 24) : 760;
```

- [ ] **Step 2: Enlarge reminder typography and controls**

In `ui/reminder.html`, use a larger dialog and readable controls:

```css
.stage { padding: 34px 18px 18px; }
.dialog { padding: 36px 28px 20px; border-radius: 28px; }
.text { min-height: 88px; font-size: 18px; line-height: 1.65; }
.meta-chip { height: 29px; padding: 0 12px; font-size: 12px; }
.btns { gap: 12px; margin-top: 14px; }
.btn.mid { height: 48px; font-size: 15px; }
.confirm { min-height: 60px; font-size: 14px; }
```

Do not add a reminder timeout or change reminder actions.

- [ ] **Step 3: Run the focused test and verify GREEN**

Run:

```powershell
node --test test/ui-contract.test.js
```

Expected: all UI contract tests pass.

### Task 5: Full Verification and Visual Inspection

**Files:**
- Verify: all `test/*.test.js`
- Verify: `main.js`, `preload.js`, `lib/*.js`, `ui/*.js`
- Generate: temporary Electron screenshots under a workspace-local shot directory

- [ ] **Step 1: Run the complete test suite**

Run:

```powershell
npm.cmd test
```

Expected: all hydration, data, scheduler, and UI contract tests pass with zero failures.

- [ ] **Step 2: Check JavaScript syntax**

Run Node `--check` against `main.js`, `preload.js`, all `lib/*.js`, and all `ui/*.js`.

Expected: exit code `0`, no syntax errors.

- [ ] **Step 3: Run Electron screenshot mode**

Launch Electron with `SHOT=1`, a workspace-local `SHOT_DIR`, and isolated `GOKUGOKU_DATA_DIR`.

Expected files:

- `shot-onboarding.png`
- `shot-main.png`
- `shot-undo.png`
- `shot-main-open.png`
- `shot-settings-bottom.png`
- `shot-reminder.png`

The screenshot mode must complete its built-in onboarding, drink, undo, settings, reminder, and external-drink assertions before exiting.

- [ ] **Step 4: Inspect all screenshots**

Compare the screenshots against the approved design and original reference:

- bright cream and teal palette
- original font stack
- larger readable Chinese text
- larger cards and action buttons
- no removed helper copy
- no clipping or overlap
- expanded settings scrolls
- reminder actions remain visible

If a visual defect is found, first add an assertion to `test/ui-contract.test.js` for the affected copy, class, or dimension; verify that assertion fails; patch the UI; then repeat Steps 1–4.

### Task 6: Repackage and Verify Release Artifacts

**Files:**
- Regenerate: `dist/GokuGoku-win32-x64-v1.1.0`
- Regenerate: `dist/GokuGoku-win32-x64-v1.1.0.zip`
- Regenerate: `dist/GokuGoku-src-v1.1.0.zip`

- [ ] **Step 1: Build the Windows folder**

Run:

```powershell
npm.cmd run pack:win
```

Rename the packager output folder to `GokuGoku-win32-x64-v1.1.0` without modifying the preserved original app outside `GokuGoku-src`.

- [ ] **Step 2: Build clean ZIP archives**

Create the Windows ZIP from the release folder. Create the source ZIP from a clean staging directory that excludes `node_modules`, `dist`, temporary screenshots, runtime data, and dot-prefixed temporary directories.

- [ ] **Step 3: Verify the packaged app**

Inspect packaged `resources/app.asar` and confirm:

- `package.json` version is `1.1.0`
- the UI contract test exists in the source archive
- required `main.js`, `lib/*`, and `ui/*` files are present
- removed copy is absent from packaged `ui/index.html`
- the packaged EXE starts successfully in isolated screenshot mode

- [ ] **Step 4: Record checksums**

Run:

```powershell
Get-FileHash -Algorithm SHA256 -LiteralPath `
  'dist\GokuGoku-win32-x64-v1.1.0.zip', `
  'dist\GokuGoku-src-v1.1.0.zip'
```

Expected: both artifacts exist and return SHA-256 hashes.
