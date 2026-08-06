# 公考工作台（网页 + 手机 App）

一个公务员考试备考工作台：刷题、错题、复盘、打卡、试卷、计划，支持**手机安装为 App** 和**跨设备数据同步**。

## 一、在电脑上启动（同时提供前端 + 同步后端）

```powershell
# 方式 A：双击 start.bat（Windows，推荐）
#   会自动从 5173 起检测端口占用并避让，选到空闲端口后启动、放行防火墙、生成二维码
# 方式 B：命令行（手动指定端口，避免冲突）
node server-api.mjs 8080
# 不指定端口时默认 5173
```

> **端口说明**：`start.bat` 现在会**自动避让端口**——从 5173 开始检测，若被占用则自动 +1 递增找到空闲端口，因此不会再遇到 `EADDRINUSE`。实际使用的端口会在启动窗口里显示，请以窗口提示为准。命令行手动启动时，二维码与 `/api/lan` 都会自动跟随你指定的端口。

启动后（以实际端口为准，假设为 5173）：
- 电脑访问 `http://localhost:5173`
- 手机访问 `http://<你电脑局域网IP>:5173`（手机与电脑连同一个 Wi-Fi）
  - **最简单**：启动后会自动生成桌面 `手机访问二维码.png`，用手机相机/微信扫码即可打开。
  - 查电脑 IP：`ipconfig` 看「IPv4 地址」
  - 若手机打不开，多半是 Windows 防火墙拦截，`start.bat` 已自动放行所选端口（需以管理员身份运行 bat 才生效）。手动放行（把 5173 换成实际端口）：
    ```powershell
    netsh advfirewall firewall add rule name="gk" dir=in action=allow protocol=TCP localport=5173
    ```

## 二、手机上"安装成 App"

1. 在电脑浏览器打开 `http://localhost:5173`，进入「设置」页，会看到 **"手机扫码打开"** 卡片，里面有二维码（用电脑局域网地址生成）。
2. 手机相机/微信扫码 → 直接在手机浏览器打开工作台。
3. 点浏览器菜单 → **"添加到主屏幕"**（iPhone 在分享按钮里，安卓在菜单 ⋮ 里）。
4. 桌面上会出现"公考工作台"图标，点开即全屏、像原生 App。
   - 这是 **PWA** 方案：无需应用商店、无需签名，离线也能用。
   - 二维码内置纯 JS 生成（离线可用），也由 `start.bat` 额外生成桌面文件 `手机访问二维码.png`。

## 三、跨设备同步（账号系统）

1. 在手机或电脑的「设置」页，点击 **注册新账号**（用户名+密码，无手机号、无需邮箱）。
2. 注册后自动登录，之后所有数据（刷题/错题/打卡/试卷/计划/考试）会**自动同步到云端**。
3. 在另一台设备「设置」里用同一账号**登录**，即可恢复全部数据。
4. 数据存在你电脑 `.data/accounts.json` 里（本地运行的服务端）。

> 说明：为简单可靠，**错题照片 / 语音条**目前仅存本地、不跨设备同步；结构化数据全部同步。

## 四、打包成真正的安装包（APK / iOS）

> 前置：`npm install`（安装 Capacitor 工具链），需要 Node ≥ 18。
> **本机出 APK 需要**：Java JDK 17 + Android SDK（含 build-tools / platform）。若本机不想装，**直接看下方"云构建 APK"**，零环境依赖。

```powershell
npm install
npm run build          # 把前端构建到 dist/
npm run cap:android   # 生成 android/ 原生工程（仅 Android）
# iOS 需在 Mac 上执行： npm run cap:ios
```

**Android 出 APK（在 Windows 上即可）：**
```powershell
npm run apk           # 生成 android 工程并构建 APK
# 产物： android/app/build/outputs/apk/release/app-release-unsigned.apk
# 安卓手机允许"未知来源"安装即可。
```

**iOS 出 IPA（必须在 Mac 上）：**
```powershell
npm run cap:ios       # 生成 ios/ 工程
npx cap open ios      # 用 Xcode 打开，需登录苹果开发者账号后 Archive 出 IPA
```

### ⚠️ 同步后端的地址

Capacitor 打包出的 App 内部是静态网页，**没有内置后端**。要让 App 也能同步，必须让 App 连到运行中的 `server-api.mjs`：

- 如果你有**公网服务器**：把 `server-api.mjs` 部署上去，并把 `capacitor.config.json` 里的 `server.url` 改成该地址，再打包。
- 如果只在**同一 Wi-Fi 内**用：把 `server.url` 改成 `http://<电脑局域网IP>:<实际端口>`（实际端口见启动窗口，默认 5173 但可能被自动避让），且电脑始终保持运行该服务。
- 若**不配 server.url**：打包出的 App 仍可使用，但只能用本地数据、不跨设备同步（等于纯离线 App）。

### 云构建 APK（推荐，本机无需 Android SDK / JDK）

不想在本机装 Android SDK、Java、Gradle？项目自带 `.github/workflows/build-apk.yml`，**推到 GitHub 后由云端自动编译出签名 Release APK**，本机零环境依赖。

> 原理：GitHub 云端自带 JDK17 + Android SDK，自动生成签名密钥（缓存复用，保证 App 可覆盖更新），编译产物作为 Artifact 供下载。

**步骤：**

1. **创建 GitHub 仓库**（如 `gk-workbench`，Private/Public 均可，不要勾 Add README）。
2. **推送代码**（仓库里已含工作流文件，推送即触发构建）：
   ```powershell
   git init
   git add .
   git commit -m "init"
   git branch -M main
   git remote add origin https://github.com/<你的用户名>/gk-workbench.git
   git push -u origin main
   ```
   > 没有 git 命令行？装 **GitHub Desktop**，Add Local Repository 选 `D:\ai-g`，Commit 后 Publish 即可。
3. **设一个 Secret**（GitHub 仓库 → Settings → Secrets and variables → Actions → New repository secret）：
   - Name：`KEYSTORE_PASSWORD`
   - Secret：你自己定的密码（记好，更新 App 时要用）
   > 注意：密钥别名固定为 `gk`，已在工作流里写死，无需额外设置。
4. **去 Actions 标签**，等构建完成（约 5–10 分钟）。若首次因密钥未设而失败，设好 Secret 后点 **Re-run jobs** 重跑。
5. **下载产物**（构建详情底部 Artifacts）：
   - `gk-workbench-apk` → 解压得 `app-release.apk`（正式签名版，手机允许"未知来源"安装）
   - `signing-keystore-backup` → **务必留存**，以后云端缓存丢了用它恢复同把密钥才能覆盖更新 App

⚠️ 关键提醒：`signing-keystore-backup` 是你 App 的"身份证"，换电脑/重装都要靠它更新 App，请勿泄露、勿进 Git。

## 五、目录说明

```
server-api.mjs      一体化服务：托管前端 + 账号 + 同步 API
server.mjs          原纯静态服务器（保留，仅托管前端）
js/sync.js          新增：账号登录 + 云端状态推拉
js/store.js         扩展：保存后自动后台同步
manifest.webmanifest PWA 清单
sw.js               Service Worker（离线缓存）
build-app.mjs       构建 dist/ 供 Capacitor 使用
start.bat           Windows 一键启动
capacitor.config.json  Capacitor 打包配置（JSON 格式，兼容性好）
.github/workflows/build-apk.yml  云端签名 Release 构建工作流
push.bat / push_token.bat  一键推送脚本（调用 GitHub Desktop 自带 git）
.data/              运行后生成，存放账号与同步数据
```

> 旧的 `server.mjs` 仍可用（仅前端），如需纯本地使用直接 `node server.mjs` 即可。
