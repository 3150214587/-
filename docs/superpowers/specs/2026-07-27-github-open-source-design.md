# GokuGoku GitHub 开源发布设计

## 目标

将现有 `GokuGoku-src` 作为公开源码仓库发布到 GitHub 账号 `mosaic-dng`，仓库名为 `GokuGoku`。仓库首页提供真实界面截图和中英文项目说明，让中文与英文用户都能快速理解、运行和参与项目。

## 发布范围

- 仅发布 `GokuGoku-src` 中的源码、测试、应用资源、MIT 许可证和必要文档。
- 默认分支使用 `main`。
- 不发布 `node_modules`、`dist`、开发数据、截图临时目录、打包暂存目录及其他生成物。
- 保留现有开发设计文档，作为项目演进记录。
- Windows 成品包不纳入首次源码提交；后续可单独通过 GitHub Releases 发布。

## 仓库首页

`README.md` 采用单文件双语结构：

1. 项目标题、应用图标和一句话定位。
2. 中文与 English 快速跳转。
3. 三张真实应用截图：主界面、首次设置或展开设置、催水提醒弹窗。
4. 中文说明：功能、运行方式、数据与隐私、项目结构、测试和打包、免责声明。
5. English description: overview, features, screenshots, getting started, privacy, structure, testing and packaging, disclaimer.
6. MIT 许可证说明。

英文文案解释 `GokuGoku` 是日语中“大口喝水、咕嘟咕嘟”的拟声词，避免项目名含义不明。

## 截图

截图存放在 `docs/screenshots/`，使用 PNG：

- `main-window.png`：正常主界面和今日饮水进度。
- `settings.png`：个性化补水设置及免打扰配置。
- `reminder.png`：催水提醒弹窗。

截图必须来自实际 Electron 应用，不使用效果图。截图中不得包含用户名、文件路径、令牌或其他个人信息。

## Git 与 GitHub

- 在 `GokuGoku-src` 初始化独立 Git 仓库。
- 补全 `.gitignore` 后检查待提交文件和大文件。
- 运行现有测试，并确认截图文件可打开。
- 创建公开仓库 `mosaic-dng/GokuGoku`，描述使用中英文短句。
- 将本地 `main` 分支推送至 GitHub，并核对 README 和截图可在线显示。

## 验证与失败处理

- `npm test` 必须通过。
- `git status` 在提交和推送后应保持干净。
- GitHub 仓库必须是公开可访问状态，默认分支为 `main`。
- README 的中文、英文和三张截图链接必须在 GitHub 页面正确渲染。
- 若网络或 GitHub 授权失败，保留完整本地提交并报告准确阻塞点，不重复创建仓库。
