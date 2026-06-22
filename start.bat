@echo off
start "GameDeck Backend" cmd /k "cd /d %~dp0backend && mvn spring-boot:run"
start "GameDeck Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
