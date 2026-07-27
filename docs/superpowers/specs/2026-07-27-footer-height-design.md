# 主窗口底部收紧设计

## 目标

- 删除主界面 footer 上方的青绿色波纹。
- 将主窗口折叠状态高度从 760px 收紧到 720px，使底部圆角边框整体上移。
- 保留 footer 文案、窗口圆角、细描边及展开设置时的现有自适应高度。

## 实现范围

- `ui/index.html`
  - 删除 footer 内的 `.waves` SVG。
  - 删除仅服务于该 SVG 的 `.footer .waves` 样式。
- `main.js`
  - 初始主窗口高度改为 720px。
  - 设置面板收起时的目标高度改为 720px。
  - 最小高度保持 680px，展开时仍使用 `Math.min(960, workArea.height - 24)`。
- `test/ui-contract.test.js`
  - 约束 footer 不再包含波纹。
  - 约束主窗口初始与收起高度均为 720px。

## 验证

- 先通过失败的 UI 合约测试证明旧波纹和 760px 高度仍存在。
- 实现后运行完整 Node 测试套件。
- 运行 Electron 截图模式，检查折叠主界面的 footer、底部留白和圆角边框。
