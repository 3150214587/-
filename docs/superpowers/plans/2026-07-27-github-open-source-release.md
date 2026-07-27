# GokuGoku GitHub Open-Source Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish GokuGoku as a clean public GitHub repository with real interface screenshots, a bilingual README, and a beginner-friendly bilingual Windows build guide.

**Architecture:** Keep the existing Electron application unchanged and add only release-facing documentation and screenshots. Treat generated packages, dependency folders, user data, and temporary capture/build directories as local artifacts; publish the source tree on `main` after tests and repository-content checks pass.

**Tech Stack:** Electron 43, Node.js built-in test runner, npm, PowerShell, Git, GitHub

---

### Task 1: Protect the public source tree

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Add generated-artifact exclusions**

Add these entries while preserving the existing rules:

```gitignore
.release-work/
.tmp-*/
*.log
```

- [ ] **Step 2: Verify large generated files are ignored**

Run:

```powershell
git status --short --ignored
git ls-files --others --exclude-standard
```

Expected: temporary `.tmp-*` directories, `.release-work`, `dist`, and `node_modules` appear only as ignored entries; source, tests, assets, and documentation remain eligible for commit.

- [ ] **Step 3: Commit**

```powershell
git add .gitignore
git commit -m "chore: protect public source tree"
```

### Task 2: Add the beginner build guide

**Files:**
- Create: `docs/BUILDING.md`

- [ ] **Step 1: Write the Chinese guide**

Document the exact Windows flow: install Node.js LTS, verify `node --version` and `npm --version`, clone or download ZIP, open PowerShell in the project directory, run `npm install`, `npm start`, `npm test`, and `npm run pack:win`, then locate `dist/GokuGoku-win32-x64/GokuGoku.exe`.

- [ ] **Step 2: Write the matching English guide**

Include the same commands and outcomes. State in both languages that the output is a portable application folder, not an installer, and that the entire folder must stay together.

- [ ] **Step 3: Add concrete troubleshooting**

Cover:

```text
'node' or 'npm' is not recognized -> install/reopen terminal
npm install network failure -> retry on a working network
package.json not found -> cd into the extracted repository directory
dist folder missing -> read the first error from npm run pack:win
EXE copied alone -> restore the complete GokuGoku-win32-x64 folder
```

- [ ] **Step 4: Check the guide**

Run:

```powershell
rg -n "npm install|npm start|npm test|npm run pack:win|portable|便携版" docs/BUILDING.md
```

Expected: every required command and the portable-build warning appear in both language sections.

- [ ] **Step 5: Commit**

```powershell
git add docs/BUILDING.md
git commit -m "docs: add bilingual beginner build guide"
```

### Task 3: Capture real application screenshots

**Files:**
- Create: `docs/screenshots/main-window.png`
- Create: `docs/screenshots/settings.png`
- Create: `docs/screenshots/reminder.png`

- [ ] **Step 1: Launch a clean application profile**

Run the Electron app with a temporary user-data directory so no personal data appears:

```powershell
npm start
```

Use only sample values: 60 kg, 200 ml per cup, 45-minute reminders, and 12:00–13:00 quiet hours.

- [ ] **Step 2: Capture the three states**

Capture the normal main window, expanded settings, and reminder popup as PNG files at their native window sizes. Exclude desktop notifications, account names, paths, terminal windows, and unrelated applications.

- [ ] **Step 3: Inspect each image**

Open all three PNGs and confirm that text is readable, the application is not clipped, and no personal information is present.

- [ ] **Step 4: Commit**

```powershell
git add docs/screenshots
git commit -m "docs: add application screenshots"
```

### Task 4: Replace the repository README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Write the bilingual landing content**

Structure the file with language jump links, a short explanation that “GokuGoku” is the Japanese gulping sound, three screenshot images, Chinese and English feature lists, privacy/data location, source run commands, test/package commands, project structure, disclaimer, and MIT license.

Use repository-relative image references:

```markdown
![主界面 / Main window](docs/screenshots/main-window.png)
![设置 / Settings](docs/screenshots/settings.png)
![催水提醒 / Hydration reminder](docs/screenshots/reminder.png)
```

Link the guide from both language sections:

```markdown
[零基础源码运行与打包教程](docs/BUILDING.md)
[Beginner-friendly build guide](docs/BUILDING.md#english)
```

- [ ] **Step 2: Verify README references**

Run:

```powershell
$paths = @(
  'docs/screenshots/main-window.png',
  'docs/screenshots/settings.png',
  'docs/screenshots/reminder.png',
  'docs/BUILDING.md',
  'LICENSE'
)
$paths | ForEach-Object { if (-not (Test-Path $_)) { throw "Missing README target: $_" } }
rg -n "中文|English|GokuGoku|docs/screenshots|docs/BUILDING.md|MIT" README.md
```

Expected: no missing target exception; both languages, all screenshots, build guide, project-name explanation, and license are referenced.

- [ ] **Step 3: Commit**

```powershell
git add README.md
git commit -m "docs: add bilingual project README"
```

### Task 5: Verify and publish

**Files:**
- Track: all remaining source, test, asset, and project documentation files

- [ ] **Step 1: Run project verification**

Run:

```powershell
npm test
npm run pack:win
```

Expected: all Node tests pass; packaging completes and creates `dist/GokuGoku-win32-x64/GokuGoku.exe`.

- [ ] **Step 2: Audit the commit set**

Run:

```powershell
git add LICENSE assets docs lib test ui main.js preload.js package.json package-lock.json 使用说明.md
git status --short
git diff --cached --check
```

Expected: only intended source, test, asset, and documentation files are staged; no `node_modules`, `dist`, `.tmp-*`, `.release-work`, user-data JSON, or files over GitHub's 100 MB limit are staged.

- [ ] **Step 3: Commit the source**

```powershell
git commit -m "feat: publish GokuGoku source"
```

- [ ] **Step 4: Create and push the repository**

Create public repository `mosaic-dng/GokuGoku` with default branch `main` and description:

```text
咕嘟咕嘟——动森风 Windows 喝水提醒器 / A playful Windows hydration reminder
```

Add the remote and push:

```powershell
git remote add origin https://github.com/mosaic-dng/GokuGoku.git
git push -u origin main
```

- [ ] **Step 5: Verify GitHub**

Confirm that `https://github.com/mosaic-dng/GokuGoku` is public, `main` is the default branch, the README renders both languages, all three screenshots display, and `docs/BUILDING.md` opens.

- [ ] **Step 6: Confirm clean local state**

Run:

```powershell
git status --short --branch
git log --oneline --decorate -8
```

Expected: branch tracks `origin/main`, with no uncommitted non-ignored files.
