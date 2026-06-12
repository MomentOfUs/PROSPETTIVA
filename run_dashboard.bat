@echo off
cd /d "%~dp0"
title * Artisan Renaissance Dashboard 一键启动器
echo ==========================================================
echo    *  文艺复兴手稿风仪表盘 一键双端启动器 (Artisan Cabinet)
echo ==========================================================
echo.
echo  正在启动双端服务，请关注弹出的独立指令窗口：
echo.

:: 1. 启动后端 FastAPI
echo  [1/2] 正在准备 FastAPI 后端服务 (端口 8000)...
start "FastAPI 后端服务器" cmd /k "echo 正在启动 FastAPI 后端服务... && cd backend && pip install -r requirements.txt && uvicorn main:app --reload --port 8000"

:: 2. 启动前端 Vite
echo  [2/2] 正在准备 Vite 前端开发服务器 (端口 5173)...
start "Vite 前端服务器" cmd /k "echo 正在启动 Vite 前端开发服务... && pnpm install && pnpm run dev"

echo.
echo  ----------------------------------------------------------
echo  * 启动命令已送达 *
echo.
echo  后端云 API 接口:  http://localhost:8000
echo  后端 Swagger 文档: http://localhost:8000/docs
echo  前端星盘仪表盘:    http://localhost:5173
echo.
echo  若要关闭服务，直接关闭弹出的那两个独立命令行窗口即可。
echo ==========================================================
pause