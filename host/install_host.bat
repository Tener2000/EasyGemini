@echo off
chcp 65001 > nul
set "DIR=%~dp0"
set "JSON_PATH=%DIR%easy_gemini_codex_host.json"

echo { > "%JSON_PATH%"
echo   "name": "easy_gemini_codex_host", >> "%JSON_PATH%"
echo   "description": "Codex App Server Host for Easy Gemini", >> "%JSON_PATH%"
echo   "path": "host.bat", >> "%JSON_PATH%"
echo   "type": "stdio", >> "%JSON_PATH%"
echo   "allowed_origins": [ >> "%JSON_PATH%"
echo     "chrome-extension://pnejoifhikbohejmophmcegoelnnapfj/" >> "%JSON_PATH%"
echo   ] >> "%JSON_PATH%"
echo } >> "%JSON_PATH%"

REG ADD "HKCU\Software\Google\Chrome\NativeMessagingHosts\easy_gemini_codex_host" /ve /t REG_SZ /d "%JSON_PATH%" /f

echo インストールが完了しました。
echo 何かキーを押すと終了します。
pause >nul
