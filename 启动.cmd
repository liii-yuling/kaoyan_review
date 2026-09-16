@echo off
REM =====================================================================
REM  Start the local server and open the app home page.
REM  All logic + Chinese text lives in tools\run.ps1 -- ASCII only here.
REM  See the comment in the push launcher for why this file must stay ASCII.
REM =====================================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\run.ps1" -Task start
pause
