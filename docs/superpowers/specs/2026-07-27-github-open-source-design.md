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
6. 面向零基础用户的源码运行与 Windows 打包教程入口。
7. MIT 许可证说明。

英文文案解释 `GokuGoku` 是日语中“大口喝水、咕嘟咕嘟”的拟声词，避免项目名含义不明。

## 零基础构建教程

新增 `docs/BUILDING.md`，使用中英文双语编写，并在 README 的“从源码运行 / Build from source”部分显著链接。教程按 Windows 新手可逐项照做的形式编排：

1. 安装 Node.js LTS，并确认 `node` 与 `npm` 命令可用。
2. 使用 Git 克隆仓库，或从 GitHub 下载源码 ZIP 并解压。
3. 在项目目录打开 PowerShell。
4. 执行 `npm install` 安装依赖。
5. 执行 `npm start` 直接运行源码。
6. 执行 `npm test` 验证功能。
7. 执行 `npm run pack:win` 生成 Windows x64 便携版。
8. 在 `dist/GokuGoku-win32-x64/` 中找到 `GokuGoku.exe`，整个目录需一起保留或压缩分享。

教程必须明确当前产物是免安装便携版，而不是带安装向导的安装包；不能只复制单个 EXE。补充 PowerShell 执行位置、路径包含空格、依赖下载失败、构建目录不存在等常见问题。

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
