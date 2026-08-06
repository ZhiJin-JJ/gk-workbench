@echo off
chcp 65001 >nul
set PORT=5173

echo ============================================
echo   公考工作台 · 启动器
echo ============================================
echo.

:: 0) 自动避让端口：从 5173 起，占用则递增寻找空闲端口
echo [0/4] 检测可用端口 ...
:findport
netstat -ano -p TCP 2>nul | findstr /r /c:":%PORT%[ 	]" >nul
if %errorlevel%==0 (
    echo   端口 %PORT% 被占用，尝试下一个...
    set /a PORT+=1
    goto findport
)
echo   使用端口 %PORT%

:: 1) 放行防火墙（需要管理员权限才生效；失败不影响局域网内已放行的情况）
echo [1/4] 配置防火墙放行端口 %PORT% ...
netsh advfirewall firewall add rule name="gk-workbench" dir=in action=allow protocol=TCP localport=%PORT% >nul 2>&1
if %errorlevel%==0 (echo   ✓ 已放行) else (echo   ! 需以管理员运行才能放行，否则手机可能连不上)

:: 2) 启动后端服务（最小化窗口常驻）
echo [2/4] 启动服务 (端口 %PORT%) ...
start "公考工作台" /min cmd /c "node server-api.mjs %PORT%"
timeout /t 2 >nul

:: 3) 生成手机访问二维码
echo [3/4] 生成二维码 ...
node qrcode.mjs %PORT% >nul 2>&1
if exist "手机访问二维码.png" (echo   ✓ 已生成 手机访问二维码.png) else (echo   ! 二维码生成失败，请先 npm install qrcode)

:: 4) 显示访问信息
echo [4/4] 完成
echo.
echo 本机访问：  http://localhost:%PORT%
echo 手机访问：  请用微信/相机扫描桌面上的「手机访问二维码.png」
echo.
if exist "手机访问二维码.png" start "" "手机访问二维码.png"
echo （关闭此窗口不会停止服务；停止请结束 node 进程）
pause
