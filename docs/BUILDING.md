# 从源码运行与打包 / Build from Source

[中文](#中文) · [English](#english)

## 中文

这份教程写给第一次接触源码和命令行的用户。照顺序操作，就可以在 Windows 上运行 GokuGoku，或把它打包成可以分享的免安装便携版。

### 1. 安装准备工具

安装 [Node.js LTS](https://nodejs.org/)。安装时保持默认选项即可，Node.js 会同时安装 `npm`。

安装完成后，关闭并重新打开 PowerShell，然后输入：

```powershell
node --version
npm --version
```

两条命令都显示版本号就说明安装成功。Git 不是必需的：会使用 Git 的用户可以克隆仓库，不会使用也可以直接下载 ZIP。

### 2. 获取源码

方式 A：在 PowerShell 中使用 Git：

```powershell
git clone https://github.com/mosaic-dng/GokuGoku.git
cd GokuGoku
```

方式 B：在 GitHub 仓库页面点击 **Code → Download ZIP**，解压后打开 `GokuGoku-main` 文件夹。

### 3. 在正确位置打开 PowerShell

进入包含 `package.json` 的项目文件夹。在文件夹空白处按住 `Shift` 并单击鼠标右键，选择“在此处打开 PowerShell 窗口”或“在终端中打开”。

如果路径包含空格，使用引号：

```powershell
cd "D:\我的项目\GokuGoku-main"
```

可以用下面的命令确认位置正确：

```powershell
Test-Path package.json
```

结果应为 `True`。

### 4. 安装项目依赖

```powershell
npm install
```

第一次安装需要下载 Electron，耗时取决于网络。完成后会出现 `node_modules` 文件夹。

### 5. 直接运行源码

```powershell
npm start
```

应用窗口出现即表示运行成功。关闭主窗口后应用仍可能留在系统托盘；请在托盘菜单中选择退出。

### 6. 运行测试

```powershell
npm test
```

命令应以 `fail 0` 结束。

### 7. 打包 Windows 便携版

```powershell
npm run pack:win
```

打包完成后，程序位于：

```text
dist\GokuGoku-win32-x64\GokuGoku.exe
```

这是**免安装便携版**，不是带“下一步”安装向导的安装包。`GokuGoku.exe` 依赖同一目录里的 DLL、资源和 `resources` 文件夹，因此不能只复制一个 EXE。运行或分享时，请保留整个 `GokuGoku-win32-x64` 文件夹；需要发送给别人时，可以把整个文件夹压缩成 ZIP。

### 常见问题

- **提示“无法识别 node 或 npm”**：确认已安装 Node.js LTS，关闭并重新打开 PowerShell。
- **`npm install` 下载失败**：确认网络能访问 npm，稍后重试 `npm install`。不要删除已经下载完成的文件。
- **提示找不到 `package.json`**：当前目录不对。先进入解压后的项目目录，再执行命令。
- **没有生成 `dist` 文件夹**：向上查看 `npm run pack:win` 输出的第一条错误；修复后重新运行。
- **单独复制 EXE 后打不开**：恢复完整的 `GokuGoku-win32-x64` 文件夹，所有文件必须放在一起。
- **Windows 安全提示**：自行打包的程序没有商业代码签名。请只运行自己打包或来自可信来源的版本。

---

## English

This guide is for people who are new to source code and command-line tools. Follow the steps in order to run GokuGoku on Windows or package it as a shareable portable application.

### 1. Install the prerequisites

Install [Node.js LTS](https://nodejs.org/) with the default options. Node.js includes `npm`.

Close and reopen PowerShell after installation, then run:

```powershell
node --version
npm --version
```

Both commands should print a version number. Git is optional: clone the repository if you use Git, or download the source ZIP instead.

### 2. Get the source code

Option A — clone with Git in PowerShell:

```powershell
git clone https://github.com/mosaic-dng/GokuGoku.git
cd GokuGoku
```

Option B — select **Code → Download ZIP** on the GitHub repository page, extract it, and open the `GokuGoku-main` folder.

### 3. Open PowerShell in the project directory

Open the folder that contains `package.json`. Shift-right-click an empty area and select “Open PowerShell window here” or “Open in Terminal.”

Quote paths that contain spaces:

```powershell
cd "D:\My Projects\GokuGoku-main"
```

Confirm that you are in the correct directory:

```powershell
Test-Path package.json
```

The result should be `True`.

### 4. Install dependencies

```powershell
npm install
```

The first installation downloads Electron and may take a while. A `node_modules` folder appears when it completes.

### 5. Run from source

```powershell
npm start
```

The source is running when the application window appears. Closing the main window may leave the app in the system tray; use the tray menu to quit it completely.

### 6. Run the tests

```powershell
npm test
```

The command should finish with `fail 0`.

### 7. Package the Windows portable app

```powershell
npm run pack:win
```

The packaged application is created at:

```text
dist\GokuGoku-win32-x64\GokuGoku.exe
```

This is a **portable application**, not an installer with a setup wizard. `GokuGoku.exe` depends on the DLLs, resources, and `resources` folder beside it, so do not copy the EXE by itself. Keep the entire `GokuGoku-win32-x64` folder together. To share it, compress the complete folder as a ZIP.

### Troubleshooting

- **“node or npm is not recognized”**: install Node.js LTS, then close and reopen PowerShell.
- **`npm install` fails while downloading**: make sure npm is reachable on your network and retry `npm install`.
- **`package.json` cannot be found**: change into the extracted repository directory before running the command.
- **No `dist` folder is created**: scroll up to the first error from `npm run pack:win`, fix it, and run the command again.
- **The copied EXE does not start**: restore the complete `GokuGoku-win32-x64` folder; all files must stay together.
- **Windows shows a security warning**: self-built applications are not commercially code-signed. Run only builds you created yourself or obtained from a trusted source.
