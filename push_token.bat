@echo off
chcp 65001 >nul
echo ============================================
echo   公考工作台 · 用令牌推送到 GitHub
echo ============================================
echo.
set "GIT_CMD=%LOCALAPPDATA%\GitHubDesktop\app-3.6.3\resources\app\git\cmd\git.exe"
cd /d D:\ai-g

set /p TOKEN=粘贴你的 GitHub Personal Access Token 后回车: 
echo.
echo 正在推送（可能需要十几秒）...
"%GIT_CMD%" pull https://ZhiJin-JJ:%TOKEN%@github.com/ZhiJin-JJ/gk-workbench.git main --allow-unrelated-histories -X theirs
"%GIT_CMD%" push https://ZhiJin-JJ:%TOKEN%@github.com/ZhiJin-JJ/gk-workbench.git main

echo.
if %errorlevel%==0 (
    echo ✓ 推送成功！去 GitHub 仓库的 Actions 页看构建进度。
) else (
    echo ! 推送失败，请检查令牌是否正确、是否勾选了 repo 权限。
)
echo.
pause
