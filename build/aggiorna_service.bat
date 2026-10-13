@echo off
REM Portale Service di Laboratorio Toscana Diagnostica - aggiornamento e pubblicazione (routine RSGI, passo 11)
REM Da lanciare dalla cartella del repository clonato. Richiede Python 3 (openpyxl, pymupdf) e Git.
setlocal
set ISO=C:\Users\francesco.epifani\OneDrive - Toscana Diagnostica S.r.l\HQS\ISO 9001
set STAMPABILI=C:\Users\francesco.epifani\OneDrive - Toscana Diagnostica S.r.l\HQS\Documenti Stampabili senza Cover (MOD-DEX-INF)
set PRESTAZIONI=build\Prestazioni_Preparazioni.xlsx
cd /d "%~dp0.."

echo [1/3] Rigenerazione dati del portale Service da REG006 e cartelle OneDrive...
python build\build_service.py --iso "%ISO%" --stampabili "%STAMPABILI%" --prestazioni "%PRESTAZIONI%"
if errorlevel 1 (echo ERRORE nella generazione. Pubblicazione annullata. & pause & exit /b 1)

echo [2/3] Commit...
for /f "tokens=*" %%r in ('python -c "import json;print(json.load(open('data/meta.json',encoding='utf-8'))['reg006_rev'])"') do set REV=%%r
git add -A
git commit -m "Service: aggiornamento portale - REG006 rev. %REV% - %date% %time:~0,5%"
if errorlevel 1 echo       Nessuna modifica da pubblicare.

echo [3/3] Push su GitHub (Render ripubblica in 2-3 minuti)...
git push
echo Fatto. Verificare il footer del portale: revisione REG006 e data di pubblicazione.
pause
