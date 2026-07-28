'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(root, 'ui', 'index.html'), 'utf8');
const indexJs = fs.readFileSync(path.join(root, 'ui', 'index.js'), 'utf8');
const styleCss = fs.readFileSync(path.join(root, 'ui', 'style.css'), 'utf8');
const hydrationJs = fs.readFileSync(path.join(root, 'lib', 'hydration.js'), 'utf8');
const mainJs = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
const preloadJs = fs.readFileSync(path.join(root, 'preload.js'), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const legacyTerms = {
  segmentedInterval: `seg${'Interval'}`,
  cupCapacity: `杯${'容量'}`,
  perCupCapacity: `每杯${'容量'}`,
  intervalModeAutoSetter: `setSetting('intervalMode', '${['a', 'u', 't', 'o'].join('')}')`,
  supportedIntervals: `SUPPORTED_${'INTERVALS'}`,
  legacyRecommendation: `recommended${'Interval'}`,
  intervalOptions: `INTERVAL_${'OPTIONS'}`,
  legacyRefresh: `refreshAutomatic${'Interval'}`,
};

test('main UI keeps the original bundled rounded font stack', () => {
  assert.match(
    styleCss,
    /--font:\s*'Nunito',\s*'Yuanti SC',\s*'PingFang SC',\s*'Microsoft YaHei UI',\s*'Microsoft YaHei',\s*sans-serif/,
  );
});

test('main window shell has only a crisp outline and no clipped drop shadow', () => {
  const windowRule = styleCss.match(/\.window\s*\{([^}]*)\}/s);
  assert.ok(windowRule, 'main window shell rule must exist');
  assert.match(windowRule[1], /box-shadow:\s*0 0 0 1px rgba\(121,\s*79,\s*39,\s*0\.10\)/);
  assert.doesNotMatch(windowRule[1], /0 10px 28px/);
});

test('main UI removes the requested helper copy and uses the new footer', () => {
  for (const removed of [
    `自动按${'目标均匀排课，也可手动指定'}`,
    '手动指定',
    '推荐 90 分钟',
    `使用${'推荐'}`,
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

test('main footer has no decorative wave', () => {
  assert.doesNotMatch(indexHtml, /class="waves"/);
  assert.doesNotMatch(indexHtml, /\.footer \.waves/);
});

test('profile and interval settings use direct numeric entry with new terminology', () => {
  assert.match(indexHtml, /id="weightInput"\s+type="number"/);
  assert.match(indexHtml, /id="cupInput"\s+type="number"/);
  assert.match(indexHtml, /id="intervalInput"[^>]*type="number"[^>]*min="1"[^>]*max="1440"[^>]*step="1"/);
  assert.match(indexHtml, /id="setupInterval"[^>]*type="number"[^>]*min="1"[^>]*max="1440"[^>]*step="1"/);
  assert.match(indexHtml, /id="intervalInput"[^>]*aria-label="催水间隔（分钟）"/);
  assert.match(indexHtml, /id="selStart"[^>]*aria-label="上班开始时间"/);
  assert.match(indexHtml, /id="selEnd"[^>]*aria-label="上班结束时间"/);
  assert.equal(indexHtml.includes(`id="${legacyTerms.segmentedInterval}"`), false);
  assert.equal(indexHtml.includes(legacyTerms.cupCapacity), false);
  assert.equal(indexHtml.includes(legacyTerms.perCupCapacity), false);
  assert.match(indexHtml, /每次喝水量（ml）/);
  assert.equal(indexJs.includes(legacyTerms.intervalModeAutoSetter), false);
  assert.doesNotMatch(indexJs, /buildIntervalButtons/);
  assert.doesNotMatch(indexJs, /syncIntervalButtons/);
  assert.match(indexJs, /saveProfile\(\{\s*weightKg:\s*weight,\s*cupMl:\s*cup,\s*intervalMin:\s*interval,/s);
});

test('renderer preserves drafts and storage errors across periodic state updates', () => {
  assert.equal((indexJs.match(/settingsDraftReady = false/g) || []).length, 1);
  assert.equal((indexJs.match(/setupDraftReady = false/g) || []).length, 1);
  assert.match(
    indexJs,
    /function updateSetupPreview\(\)\s*\{\s*if \(S && S\.storageError\) \{\s*\$\('#setupError'\)\.textContent = S\.storageError;\s*return;\s*\}/s,
  );
  assert.match(
    indexJs,
    /function updateSettingsPreview\(\)\s*\{\s*if \(S && S\.storageError\) \{\s*\$\('#settingsError'\)\.textContent = S\.storageError;\s*return;\s*\}\s*if \(!S\) return;/s,
  );
});

test('successful onboarding synchronizes the hidden main settings draft', () => {
  assert.match(indexJs, /function populateSettingsDraft\(profile\)/);
  assert.match(indexJs, /if \(!settingsDraftReady\) \{\s*populateSettingsDraft\(state\);/s);
  assert.match(
    indexJs,
    /if \(setup\) \{\s*populateSettingsDraft\(\{\s*weightKg:\s*weight,\s*cupMl:\s*cup,\s*intervalMin:\s*interval,\s*dndRanges:\s*ranges,?\s*\}\);/s,
  );
});

test('removed automatic interval presentation has no library or stylesheet remnants', () => {
  assert.equal(hydrationJs.includes(legacyTerms.supportedIntervals), false);
  assert.equal(hydrationJs.includes(legacyTerms.legacyRecommendation), false);
  assert.doesNotMatch(styleCss, /\.seg\b/);
});

test('periodic state rendering never overwrites a focused setting control', () => {
  assert.match(indexJs, /function syncControlValue\(control, value\)/);
  assert.match(indexJs, /document\.activeElement !== control/);
  assert.match(indexJs, /syncControlValue\(\$\('#selStart'\),\s*S\.workStart\)/);
  assert.match(indexJs, /syncControlValue\(\$\('#selEnd'\),\s*S\.workEnd\)/);
  assert.match(indexJs, /syncControlValue\(\$\('#intervalInput'\),\s*S\.intervalMin\)/);
});

test('interval draft survives stale renders between change and Save', () => {
  assert.match(indexJs, /let intervalDraftDirty = false;/);
  assert.match(
    indexJs,
    /\$\('#intervalInput'\)\.addEventListener\('input', \(\) => \{\s*intervalDraftDirty = true;\s*updateSettingsPreview\(\);\s*\}\);/s,
  );
  assert.match(indexJs, /if \(!intervalDraftDirty\) syncControlValue\(\$\('#intervalInput'\),\s*S\.intervalMin\);/);
  assert.match(
    indexJs,
    /async function saveManualInterval\(\) \{\s*const control = \$\('#intervalInput'\);\s*const submittedValue = control\.value;\s*const interval = Number\(submittedValue\);/s,
  );
  assert.match(indexJs, /if \(control\.value === submittedValue\) intervalDraftDirty = false;/);
  assert.match(
    indexJs,
    /if \(setup\) \{[\s\S]*?\} else \{\s*if \(\$\('#intervalInput'\)\.value === String\(interval\)\) intervalDraftDirty = false;/,
  );
});

test('main process uses only validated manual reminder intervals', () => {
  assert.equal(mainJs.includes(legacyTerms.intervalOptions), false);
  assert.equal(mainJs.includes(legacyTerms.legacyRefresh), false);
  assert.match(mainJs, /validateIntervalMin\(value\)/);
  assert.match(mainJs, /db\.settings\.intervalMin = validation\.profile\.intervalMin/);
});

test('main window uses the compact collapsed height', () => {
  assert.match(mainJs, /width:\s*480/);
  assert.equal((mainJs.match(/height:\s*720/g) || []).length, 1);
  assert.match(mainJs, /const target = open \? Math\.min\(960, workArea\.height - 24\) : 720/);
  assert.match(mainJs, /width:\s*520/);
  assert.match(mainJs, /height:\s*380/);
});

test('daily reset is exposed only through the main settings interface', () => {
  assert.match(indexHtml, /id="resetTodayBtn"/);
  assert.match(indexHtml, />重置今日记录</);
  assert.match(indexJs, /window\.confirm\(/);
  assert.match(indexJs, /window\.api\.resetToday\(\)/);
  assert.match(preloadJs, /resetToday:\s*\(\)\s*=>\s*ipcRenderer\.invoke\('reset-today'\)/);
  assert.match(mainJs, /ipcMain\.handle\('reset-today'/);
  assert.match(mainJs, /fromWindow\(event,\s*mainWin\)/);
});

test('release metadata and license meet the Windows packaging contract', () => {
  const licensePath = path.join(root, 'LICENSE');
  assert.equal(fs.existsSync(licensePath), true, 'source LICENSE must exist');
  const license = fs.readFileSync(licensePath, 'utf8');
  assert.match(license, /Copyright \(c\) 2026 水分補給課/);
  assert.match(license, /Permission is hereby granted, free of charge, to any person obtaining a copy/);

  const packWin = packageJson.scripts['pack:win'];
  for (const required of [
    '--win32metadata.CompanyName=水分補給課',
    '--win32metadata.ProductName=水分補給課',
    '--asar',
  ]) {
    assert.ok(packWin.includes(required), `pack:win must include ${required}`);
  }
  assert.doesNotMatch(packWin, /--(?:app|build)-version=/);
  assert.equal(packageJson.engines.node, '>=22.12');
  for (const excluded of ['dist', 'node_modules', 'test', 'docs']) {
    assert.match(packWin, new RegExp(`--ignore=\\"\\^/${excluded}`), `pack:win must exclude ${excluded}`);
  }
});
