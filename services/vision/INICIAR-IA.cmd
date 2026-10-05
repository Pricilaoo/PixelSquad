@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Instale o Node.js 22 ou superior e abra este arquivo novamente.
  echo Site oficial: https://nodejs.org/
  pause
  exit /b 1
)
node -e "if(Number(process.versions.node.split('.')[0])<22)process.exit(1)"
if errorlevel 1 (
  echo Atualize o Node.js para a versao 22 ou superior.
  pause
  exit /b 1
)
node setup.mjs
pause
