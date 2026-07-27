# 主窗口底部收紧 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 删除主界面底部波纹，并将主窗口折叠高度从 760px 收紧到 720px。

**Architecture:** 保持现有 frameless Electron 窗口和 footer 结构，只删除装饰性 SVG，并同步修改主窗口初始高度与设置面板收起高度。用 UI 合约测试锁定 DOM 与窗口尺寸，再用 Electron 截图模式验证真实渲染。

**Tech Stack:** Electron 43、HTML/CSS、Node.js 内置测试运行器

---

### Task 1: 锁定 footer 与窗口高度契约

**Files:**
- Modify: `test/ui-contract.test.js`
- Test: `test/ui-contract.test.js`

- [ ] **Step 1: 写入失败的 footer 契约测试**

在 footer 相关测试后添加：

```js
test('main footer has no decorative wave', () => {
  assert.doesNotMatch(indexHtml, /class="waves"/);
  assert.doesNotMatch(indexHtml, /\.footer \.waves/);
});
```

- [ ] **Step 2: 将窗口尺寸测试改为精确约束 720px**

把主窗口断言改为：

```js
test('main window uses the compact collapsed height', () => {
  assert.match(mainJs, /width:\s*480/);
  assert.equal((mainJs.match(/height:\s*720/g) || []).length, 1);
  assert.match(mainJs, /const target = open \? Math\.min\(960, workArea\.height - 24\) : 720/);
  assert.match(mainJs, /width:\s*520/);
  assert.match(mainJs, /height:\s*380/);
});
```

- [ ] **Step 3: 运行测试并确认因旧实现失败**

Run:

```powershell
node --test test/ui-contract.test.js
```

Expected: footer 波纹断言和 720px 高度断言失败，其余测试通过。

### Task 2: 删除波纹并收紧折叠窗口

**Files:**
- Modify: `ui/index.html`
- Modify: `main.js`
- Test: `test/ui-contract.test.js`

- [ ] **Step 1: 删除波纹样式和 SVG**

从 `ui/index.html` 删除：

```css
.footer .waves { position: absolute; left: 0; right: 0; bottom: 100%; height: 14px; opacity: 0.5; }
```

以及：

```html
<svg class="waves" viewBox="0 0 400 14" preserveAspectRatio="none">
  <path d="M0,10 Q25,2 50,10 T100,10 T150,10 T200,10 T250,10 T300,10 T350,10 T400,10 L400,14 L0,14 Z" fill="#19c8b9" opacity="0.35"/>
</svg>
```

- [ ] **Step 2: 将初始与收起高度改为 720px**

在 `main.js` 的 `BrowserWindow` 配置中使用：

```js
height: 720,
```

在 `set-expand` IPC 中使用：

```js
const target = open ? Math.min(960, workArea.height - 24) : 720;
```

- [ ] **Step 3: 运行聚焦测试**

Run:

```powershell
node --test test/ui-contract.test.js
```

Expected: 全部 UI 合约测试通过。

- [ ] **Step 4: 运行完整测试**

Run:

```powershell
node --test test/*.test.js
```

Expected: 40 个以上测试全部通过，失败数为 0。

### Task 3: Electron 视觉验证

**Files:**
- Verify: `ui/index.html`
- Verify: `main.js`
- Generate: workspace-local temporary screenshots

- [ ] **Step 1: 用隔离数据目录运行截图模式**

设置 `SHOT=1`、工作区内的 `SHOT_DIR` 与 `SHOT_DATA_DIR`，运行：

```powershell
.\node_modules\.bin\electron.cmd .
```

Expected: Electron 自动完成内置交互断言并以 0 退出，生成六张截图。

- [ ] **Step 2: 检查折叠主界面**

检查 `shot-main.png`：

- footer 上方没有青绿色波纹；
- footer 文案仍完整居中；
- 底部圆角边框比原 760px 版本上移；
- 设置卡片、footer 文案和下边框不重叠；
- 窗口底部不重新出现裁切阴影。

- [ ] **Step 3: 检查展开设置界面**

检查 `shot-main-open.png` 与 `shot-settings-bottom.png`，确认展开高度仍自适应，设置内容可滚动且 footer 没有布局回归。

> 当前目录不是 Git 仓库，因此本计划以测试和截图作为检查点，不包含提交步骤。
