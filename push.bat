@echo off
chcp 65001 >nul
echo ============================================
echo   公考工作台 · 一键推送到 GitHub
echo ============================================
echo.

:: 找到 GitHub Desktop 自带的 Git
set "GIT_CMD="
if exist "%LOCALAPPDATA%\GitHubDesktop\app-3.6.3\resources\app\git\cmd\git.exe" (
    set "GIT_CMD=%LOCALAPPDATA%\GitHubDesktop\app-3.6.3\resources\app\git\cmd\git.exe"
) else if exist "%LOCALAPPDATA%\Programs\Git\bin\git.exe" (
    set "GIT_CMD=%LOCALAPPDATA%\Programs\Git\bin\git.exe"
) else if exist "C:\Program Files\Git\cmd\git.exe" (
    set "GIT_CMD=C:\Program Files\Git\cmd\git.exe"
) else if exist "C:\Program Files (x86)\Git\cmd\git.exe" (
    set "GIT_CMD=C:\Program Files (x86)\Git\cmd\git.exe"
)

if not defined GIT_CMD (
    echo [错误] 找不到 Git！请先安装 GitHub Desktop 或 Git for Windows。
    pause
    exit /b 1
)
echo [1/4] 使用 Git: %GIT_CMD%

:: 如果已有旧的 .git（来自 GitHub Desktop 误建），先清理
if exist .git (
    echo [2/4] 清理旧仓库...
    rmdir /s /q .git
) else (
    echo [2/4] 初始化新仓库...
)

:: 初始化
"%GIT_CMD%" init
"%GIT_CMD%" branch -M main

:: 添加所有文件并提交
echo [3/4] 提交文件...
"%GIT_CMD%" add .
"%GIT_CMD%" commit -m "init gk workbench + release workflow"

:: 设置远程地址并推送
echo [4/4] 推送到 GitHub ...
"%GIT_CMD%" remote remove origin >nul 2>&1
"%GIT_CMD%" remote add origin https://github.com/ZhiJin-JJ/gk-workbench.git
"%GIT_CMD%" push -u origin main
if %errorlevel%==0 (
    echo.
    echo ✓ 推送成功！
    echo.
    echo 接下来去 GitHub 做最后一步：
    echo   1. 打开 https://github.com/ZhiJin-JJ/gk-workbench/settings/secrets/actions
    echo   2. New repository secret:
    echo      Name:   KEYSTORE_PASSWORD
    echo      Secret: 你自己定的密码（记好）
    echo   3. 去 Actions 页等待构建完成（约5-10分钟）
    echo   4. 构建完成后下载 Artifacts 里的 gk-workbench-apk
) else (
    echo.
    echo ! 推送失败，可能需要登录 GitHub 授权。
    echo ! 请在弹出的浏览器窗口中用 ZhiJin-JJ 账号登录。
    echo ! 登录后重新运行此脚本即可。
)
echo.
pause
