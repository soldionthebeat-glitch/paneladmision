@echo off
cd /d "%~dp0..\backen"
echo Iniciando backend de Go Beats en http://localhost:5000
echo Deja esta ventana abierta mientras uses la pagina.
echo.
npm start
pause
