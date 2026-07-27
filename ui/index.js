// 水分補給課 · 主面板逻辑
'use strict';

const $ = (selector) => document.querySelector(selector);
const pick = (items) => items[Math.floor(Math.random() * items.length)];

let S = null;
let lastCups = -1;
let toastTimer = null;
let toastUndoId = null;
let settingsRanges = [];
let setupRanges = [{ start: '12:00', end: '13:00' }];
let settingsDraftReady = false;
let setupDraftReady = false;
let intervalDraftDirty = false;

/* ---------- 小杯子 ---------- */
function cupSVG(filled) {
  return `<svg viewBox="0 0 24 28" width="32" height="38" aria-hidden="true">
    <path d="M4,3 L6.2,24 Q6.5,25.8 8.3,25.8 L15.7,25.8 Q17.5,25.8 17.8,24 L20,3"
      fill="#fffdf4" stroke="#9f927d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    ${filled ? `<path d="M6.1,10 L7.5,23.2 Q7.7,24.3 8.8,24.3 L15.2,24.3 Q16.3,24.3 16.5,23.2 L17.9,10 Q14,12 12,10 T6.1,10"
      fill="#3dd4c6" opacity="0.92"/>` : ''}
    <path d="M4,3 L20,3" stroke="#9f927d" stroke-width="2" stroke-linecap="round"/>
  </svg>`;
}

function renderCups() {
  const box = $('#cups');
  const total = Math.max(S.targetCups, S.drinkCount);
  const signature = `${S.drinkCount}/${total}`;
  if (box.dataset.sig === signature) return;
  box.innerHTML = Array.from({ length: total }, (_, index) => cupSVG(index < S.drinkCount)).join('');
  box.dataset.sig = signature;
  if (S.drinkCount > lastCups && lastCups >= 0) {
    const cup = box.children[S.drinkCount - 1];
    if (cup) cup.classList.add('pop');
  }
}

function renderTitle() {
  const percentage = S.workGoalMl ? S.consumedMl / S.workGoalMl : 0;
  let title = COPY.titles[0].text;
  for (const item of COPY.titles) if (percentage >= item.pct) title = item.text;
  $('#title').textContent = title;
  $('#title').classList.toggle('hot', percentage < 1);
}

function renderFace() {
  const mode = S.goalDone ? 'happy' : (S.overdue || S.reminderActive ? 'thirsty' : 'normal');
  $('#mascot').querySelectorAll('.face').forEach((face) => {
    face.style.display = 'none';
  });
  $('#mascot').querySelector(`.f-${mode}`).style.display = '';
}

/* ---------- 状态与倒计时 ---------- */
function fmtClock(timestamp) {
  const date = new Date(timestamp);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function renderTimer() {
  const label = $('#timerLabel');
  const value = $('#timerVal');
  const pulse = $('#pulse');
  value.textContent = '';
  pulse.style.background = 'var(--mint)';

  if (S.profileRequired) {
    label.textContent = '完成入课设置后，本课开始执勤';
    pulse.style.background = 'var(--orange)';
  } else if (S.paused) {
    label.textContent = `静音潜伏中 · ${fmtClock(S.pausedUntil)} 恢复`;
    pulse.style.background = 'var(--faint)';
  } else if (S.goalDone) {
    label.textContent = COPY.status.goalDone;
    pulse.style.background = 'var(--yellow)';
  } else if (S.offReason === 'dnd') {
    label.textContent = `免打扰中 · ${fmtClock(S.resumeAt)} 恢复催水`;
    pulse.style.background = 'var(--blue)';
  } else if (!S.working) {
    label.textContent = S.offReason === 'weekend'
      ? COPY.status.weekend
      : (S.offReason === 'before' ? COPY.status.beforeWork : COPY.status.offDuty);
    pulse.style.background = 'var(--faint)';
  } else if (S.reminderActive) {
    label.textContent = '催水使者已到 · 等你手动确认';
    pulse.style.background = 'var(--orange)';
  } else if (S.nextAt) {
    const remaining = Math.max(0, Math.round((S.nextAt - S.now) / 1000));
    if (remaining <= 0) {
      label.textContent = COPY.status.overdue;
    } else {
      label.textContent = COPY.status.counting;
      const minutes = Math.floor(remaining / 60);
      const seconds = remaining % 60;
      value.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
  } else {
    label.textContent = '本课正在安排下一次巡逻';
  }
}

/* ---------- 目标预览 ---------- */
function parseClock(value) {
  if (!/^\d{2}:\d{2}$/.test(value || '')) return null;
  const [hours, minutes] = value.split(':').map(Number);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function validateRanges(ranges) {
  const parsed = [];
  for (const range of ranges) {
    const start = parseClock(range.start);
    const end = parseClock(range.end);
    if (start === null || end === null || end <= start) return '免打扰结束时间必须晚于开始时间';
    parsed.push({ start, end });
  }
  parsed.sort((a, b) => a.start - b.start);
  for (let index = 1; index < parsed.length; index += 1) {
    if (parsed[index].start < parsed[index - 1].end) return '免打扰时段不能重叠';
  }
  return '';
}

function validateProfileNumbers(weight, cup, interval) {
  if (!Number.isFinite(weight) || weight < 30 || weight > 300) return '体重请输入 30–300kg';
  if (!Number.isFinite(cup) || cup < 50 || cup > 1000) return '每次喝水量请输入 50–1000ml';
  if (!Number.isInteger(interval) || interval < 1 || interval > 1440) return '催水间隔请输入 1–1440 分钟的整数';
  return '';
}

function calculatePreview(weight, cup) {
  const dailyGoalMl = Math.round(Number(weight) * 30);
  const workHours = Math.max(0, Number(S ? S.workEnd : 18) - Number(S ? S.workStart : 9));
  const workGoalMl = Math.min(1200, Math.max(800, Math.round((dailyGoalMl * workHours / 16) / 50) * 50));
  const targetCups = Math.ceil(workGoalMl / Number(cup));
  return { dailyGoalMl, workGoalMl, targetCups };
}

function updateSetupPreview() {
  if (S && S.storageError) {
    $('#setupError').textContent = S.storageError;
    return;
  }
  const weight = Number($('#setupWeight').value);
  const cup = Number($('#setupCup').value);
  const interval = Number($('#setupInterval').value);
  const numericError = validateProfileNumbers(weight, cup, interval);
  $('#setupError').textContent = numericError || validateRanges(setupRanges);
  if (numericError) return;
  const preview = calculatePreview(weight, cup);
  $('#previewDaily').textContent = `${preview.dailyGoalMl}ml`;
  $('#previewWork').textContent = `${preview.workGoalMl}ml`;
  $('#previewCups').textContent = `${preview.targetCups}杯`;
  $('#previewInterval').textContent = `${interval}分钟`;
}

function updateSettingsPreview() {
  if (S && S.storageError) {
    $('#settingsError').textContent = S.storageError;
    return;
  }
  if (!S) return;
  const weight = Number($('#weightInput').value);
  const cup = Number($('#cupInput').value);
  const interval = Number($('#intervalInput').value);
  const numericError = validateProfileNumbers(weight, cup, interval);
  $('#settingsError').textContent = numericError || validateRanges(settingsRanges);
  if (numericError) return;
  const preview = calculatePreview(weight, cup);
  $('#sumDaily').textContent = `${preview.dailyGoalMl}ml`;
  $('#sumWork').textContent = `${preview.workGoalMl}ml`;
  $('#sumCups').textContent = `${S.drinkCount}/${preview.targetCups}杯`;
}

/* ---------- 免打扰编辑器 ---------- */
function renderDndEditor(container, ranges, onChange) {
  container.innerHTML = '';
  ranges.forEach((range, index) => {
    const row = document.createElement('div');
    row.className = 'dnd-row';
    row.innerHTML = `
      <input type="time" step="900" aria-label="免打扰开始" value="${range.start}">
      <span>—</span>
      <input type="time" step="900" aria-label="免打扰结束" value="${range.end}">
      <button class="remove-range" title="删除这一段">×</button>`;
    const inputs = row.querySelectorAll('input');
    inputs[0].addEventListener('input', () => {
      ranges[index].start = inputs[0].value;
      onChange();
    });
    inputs[1].addEventListener('input', () => {
      ranges[index].end = inputs[1].value;
      onChange();
    });
    row.querySelector('button').addEventListener('click', () => {
      ranges.splice(index, 1);
      renderDndEditor(container, ranges, onChange);
      onChange();
    });
    container.appendChild(row);
  });
}

function addRange(ranges, container, onChange) {
  ranges.push({ start: '15:00', end: '16:00' });
  renderDndEditor(container, ranges, onChange);
  onChange();
}

/* ---------- 设置控件 ---------- */
function syncControlValue(control, value) {
  const nextValue = String(value);
  if (document.activeElement !== control && control.value !== nextValue) control.value = nextValue;
}

function buildSelects() {
  for (let hour = 5; hour <= 12; hour += 1) $('#selStart').add(new Option(`${hour}:00`, hour));
  for (let hour = 14; hour <= 23; hour += 1) $('#selEnd').add(new Option(`${hour}:00`, hour));
  $('#selStart').addEventListener('change', () => window.api.setSetting('workStart', Number($('#selStart').value)));
  $('#selEnd').addEventListener('change', () => window.api.setSetting('workEnd', Number($('#selEnd').value)));
}

function bindSwitch(selector, key) {
  $(selector).addEventListener('click', () => {
    Sound.click();
    window.api.setSetting(key, !$(selector).classList.contains('on'));
  });
}

/* ---------- Toast 与撤销 ---------- */
function hideToast() {
  $('#toast').classList.remove('show', 'has-action', 'gold');
  toastUndoId = null;
}

function toast(message, { gold = false, undoId = null, duration = 4200 } = {}) {
  $('#toastText').textContent = message;
  $('#toast').classList.toggle('gold', gold);
  $('#toast').classList.toggle('has-action', !!undoId);
  $('#toast').classList.add('show');
  toastUndoId = undoId;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, duration);
}

async function undoFromToast() {
  if (!toastUndoId) return;
  const result = await window.api.undoDrink(toastUndoId);
  if (result.ok) {
    Sound.womp();
    toast('已撤销刚才一杯，进度已经扣回。');
  } else {
    toast(result.reason === 'expired' ? '撤销时间已过，本课已经归档。' : '只能撤销最新的一杯。');
  }
}

/* ---------- 状态渲染 ---------- */
function newQuote() {
  $('#quote').textContent = pick(COPY.idle);
}

function populateSettingsDraft(profile) {
  $('#weightInput').value = profile.weightKg || 60;
  $('#cupInput').value = profile.cupMl || 200;
  $('#intervalInput').value = profile.intervalMin || 45;
  settingsRanges = (profile.dndRanges || []).map((range) => ({ ...range }));
  renderDndEditor($('#settingsDnd'), settingsRanges, updateSettingsPreview);
  settingsDraftReady = true;
}

function syncProfileDraft(state) {
  if (!settingsDraftReady) {
    populateSettingsDraft(state);
  }
  if (!setupDraftReady) {
    $('#setupWeight').value = state.weightKg || 60;
    $('#setupCup').value = state.cupMl || 200;
    $('#setupInterval').value = state.intervalMin || 45;
    setupRanges = state.dndRanges.map((range) => ({ ...range }));
    renderDndEditor($('#setupDnd'), setupRanges, updateSetupPreview);
    setupDraftReady = true;
  }
}

function render(state) {
  const previousCups = S ? S.drinkCount : -1;
  S = state;
  Sound.setEnabled(S.sound);
  syncProfileDraft(state);

  $('#onboarding').classList.toggle('show', S.profileRequired);
  if (S.storageError) $('#setupError').textContent = S.storageError;
  $('#drinkBtn').disabled = !!S.storageError || S.profileRequired;
  if (S.storageError && window.__shownStorageError !== S.storageError) {
    window.__shownStorageError = S.storageError;
    toast(S.storageError, { duration: 30_000 });
  }
  $('#cupNum').textContent = S.drinkCount;
  $('#goalNum').textContent = S.targetCups;
  $('#drinkBtn').textContent = `喝了喝了！（+${S.cupMl}ml）`;
  renderCups();
  renderTitle();
  renderFace();
  renderTimer();

  if (!intervalDraftDirty) syncControlValue($('#intervalInput'), S.intervalMin);
  syncControlValue($('#selStart'), S.workStart);
  syncControlValue($('#selEnd'), S.workEnd);
  $('#swSedentary').classList.toggle('on', S.sedentaryEnabled);
  $('#swWeekend').classList.toggle('on', S.weekend);
  $('#swSound').classList.toggle('on', S.sound);
  $('#swAuto').classList.toggle('on', S.autoLaunch);
  updateSetupPreview();
  updateSettingsPreview();

  if (previousCups >= 0 && S.drinkCount > previousCups && S.goalDone && !window.__goldShown) {
    window.__goldShown = true;
    Sound.fanfare();
  }
  if (S.drinkCount === 0) window.__goldShown = false;
  lastCups = S.drinkCount;
}

/* ---------- 保存 ---------- */
async function submitProfile(mode) {
  const setup = mode === 'setup';
  const weight = Number($(setup ? '#setupWeight' : '#weightInput').value);
  const cup = Number($(setup ? '#setupCup' : '#cupInput').value);
  const interval = Number($(setup ? '#setupInterval' : '#intervalInput').value);
  const ranges = setup ? setupRanges : settingsRanges;
  const errorNode = $(setup ? '#setupError' : '#settingsError');
  const localError = validateProfileNumbers(weight, cup, interval) || validateRanges(ranges);
  if (localError) {
    errorNode.textContent = localError;
    return;
  }

  const result = await window.api.saveProfile({ weightKg: weight, cupMl: cup, intervalMin: interval, dndRanges: ranges });
  if (!result.ok) {
    errorNode.textContent = result.error;
    return;
  }
  errorNode.textContent = '';
  if (setup) {
    populateSettingsDraft({
      weightKg: weight,
      cupMl: cup,
      intervalMin: interval,
      dndRanges: ranges,
    });
    Sound.fanfare();
    toast('入课手续完成！水滴君正式上岗。', { gold: true });
  } else {
    if ($('#intervalInput').value === String(interval)) intervalDraftDirty = false;
    toast('个人设定已保存，课表重新计算完毕。');
  }
}

async function saveManualInterval() {
  const control = $('#intervalInput');
  const submittedValue = control.value;
  const interval = Number(submittedValue);
  const weight = Number($('#weightInput').value);
  const cup = Number($('#cupInput').value);
  const numericError = validateProfileNumbers(weight, cup, interval);
  if (numericError) {
    $('#settingsError').textContent = numericError;
    return;
  }

  const result = await window.api.setSetting('intervalMin', interval);
  if (!result.ok) {
    $('#settingsError').textContent = result.error || '催水间隔保存失败';
    return;
  }
  if (control.value === submittedValue) intervalDraftDirty = false;
  $('#settingsError').textContent = validateRanges(settingsRanges);
}

/* ---------- 事件 ---------- */
window.addEventListener('DOMContentLoaded', () => {
  buildSelects();
  bindSwitch('#swSedentary', 'sedentaryEnabled');
  bindSwitch('#swWeekend', 'weekend');
  bindSwitch('#swSound', 'sound');
  bindSwitch('#swAuto', 'autoLaunch');
  newQuote();
  setInterval(newQuote, 50_000);

  $('#drinkBtn').addEventListener('click', async () => {
    const result = await window.api.drink('main');
    if (!result.ok) {
      toast(result.error || '本次记录失败，请稍后重试。', { duration: 10_000 });
      return;
    }
    Sound.drink();
    const message = result.goalDone ? pick(COPY.goalDone) : pick(COPY.drinkAck);
    toast(message, { gold: result.goalDone, undoId: result.undoId, duration: 10_000 });
  });
  $('#toastAction').addEventListener('click', undoFromToast);

  $('#mascotBox').addEventListener('click', () => {
    const box = $('#mascotBox');
    box.classList.remove('boing');
    void box.offsetWidth;
    box.classList.add('boing');
    Sound.pop();
    newQuote();
  });

  $('#collapseHead').addEventListener('click', () => {
    Sound.click();
    const open = $('#settings').classList.toggle('open');
    window.api.setExpand(open);
  });
  $('#weightInput').addEventListener('input', updateSettingsPreview);
  $('#cupInput').addEventListener('input', updateSettingsPreview);
  $('#intervalInput').addEventListener('input', () => {
    intervalDraftDirty = true;
    updateSettingsPreview();
  });
  $('#intervalInput').addEventListener('change', saveManualInterval);
  $('#setupWeight').addEventListener('input', updateSetupPreview);
  $('#setupCup').addEventListener('input', updateSetupPreview);
  $('#setupInterval').addEventListener('input', updateSetupPreview);
  $('#settingsAddDnd').addEventListener('click', () => addRange(settingsRanges, $('#settingsDnd'), updateSettingsPreview));
  $('#setupAddDnd').addEventListener('click', () => addRange(setupRanges, $('#setupDnd'), updateSetupPreview));
  $('#saveProfileBtn').addEventListener('click', () => submitProfile('settings'));
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
  $('#setupSubmit').addEventListener('click', () => submitProfile('setup'));

  $('#btnMin').addEventListener('click', () => window.api.winMin());
  $('#btnHide').addEventListener('click', () => window.api.winHide());

  window.api.onState(render);
  window.api.getState().then(render);
});
