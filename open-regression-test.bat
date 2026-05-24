@echo off
cd /d "%~dp0"

start "" "regression-test\current"
start "" "regression-test\expected"

pause