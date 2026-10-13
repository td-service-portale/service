# Portale Service di Laboratorio · Toscana Diagnostica

Sito pubblico dedicato ai laboratori e alle strutture clienti del Service di Laboratorio. Dominio ufficiale: `https://service.toscanadiagnostica.it`. Clone del Portale SGI (`td-sgi/portale`) con lo stesso stack (Python 3.12 + Flask + gunicorn, nessun database, stile Cash Management) e quattro sezioni:

1. **Preparazioni e documenti** (`/`): tutte le prestazioni GIPO con la preparazione collegata (link stabile `/p/<codice shortcut>`), le istruzioni di preparazione per il paziente in versione stampabile, e la documentazione del laboratorio (procedure, istruzioni di lavoro, manuali, registri, moduli, informative, documenti esterni) con ricerca full-text sul testo dei PDF.
2. **Certificazioni di qualità** (`/certificazioni`): le norme del Sistema di Gestione Integrato, i certificati EuCI scaricabili (ISO 9001, 14001, 45001, 37001), campo di applicazione, accreditamento SSR, autorizzazione sanitaria, Politica Integrata.
3. **VEQ** (`/veq`): cos'è la Valutazione Esterna di Qualità, il CRRVEQ Careggi, i 23 programmi del ciclo 2026, le procedure SGI collegate, il contratto di adesione.
4. **Contatti** (`/contatti`).

## Perimetro documentale (decisione AD 13/10/2026)

Tutti i documenti attivi in REG006 delle aree **17. Accettazione** e **18. Laboratorio di Analisi**, più tutti i documenti presenti nella cartella **16. Business\Service di Laboratorio** (mostrati con area "16. Service di Laboratorio"). Le informative di preparazione richiamate da GIPO ma appartenenti ad altre aree (es. Diagnostica per Immagini) entrano nel sito solo come istruzioni di preparazione (`prep_only`), non nell'elenco documentale. Tutto pubblico, senza password (decisione AD 13/10/2026). Per escludere documenti: `build_service.py --exclude PRO084,MOD189` (codici senza revisione) oppure modificare la riga `python build\build_service.py ...` nel batch.

## Struttura

```
app.py                      server Flask (pagine, link stabili, CANONICAL_HOST)
requirements.txt, Procfile, render.yaml
build/build_service.py      generatore: legge REG006 e le cartelle OneDrive, produce data/, docs/, stampabili/
build/aggiorna_service.bat  routine Windows: rigenera e pubblica (git push)
build/Prestazioni_Preparazioni.xlsx   mappa prestazioni GIPO -> preparazioni (stesso file del Portale SGI)
data/docs.json, fulltext.json, preparazioni.json, meta.json   generati dal build
data/certificazioni.json    REDAZIONALE: certificazioni (numero, date, PDF, logo, testi)
data/veq.json               REDAZIONALE: programmi VEQ del ciclo, centro, testi
data/contatti.json          REDAZIONALE: contatti
certificati/                PDF dei certificati, Politica Integrata, contratto di adesione CRRVEQ
docs/<Area>/*.pdf, stampabili/*.pdf   generati dal build
static/                     index.html + app.js (pagina 1), certificazioni.html, veq.html, contatti.html, shell.js, app.css, loghi
```

## URL

| URL | Cosa fa |
|---|---|
| `/` | Preparazioni e documenti (`?q=` ricerca, `?codice=` prestazione) |
| `/p/<codice shortcut>` (es. `/p/ECO003`) | PDF della preparazione della prestazione; se più di una, elenco. Codice GIPO numerico accettato come alias. `.pdf` forza il PDF |
| `/m/TD-SGI-INF001` | versione stampabile corrente del modulo/informativa |
| `/doc/TD-SGI-PRO042` | PDF corrente del documento |
| `/certificazioni`, `/veq`, `/contatti` | pagine |
| `/certificati/<file>.pdf`, `/docs/<area>/<file>.pdf`, `/stampabili/<file>.pdf` | file |
| `/api/preparazioni`, `/api/meta`, `/data/*.json`, `/healthz` | dati |

I PDF sono consegnati direttamente sotto l'indirizzo richiesto (nessun redirect): nella barra resta `service.toscanadiagnostica.it/p/ECO003`. Il pulsante busta apre il client di posta con i link e li copia negli appunti anche in HTML; il pulsante catena copia l'URL in doppio formato (testo + collegamento).

## Pubblicazione (una volta sola)

1. GitHub: repository `td-service-portale` (vuoto). Dal PC, nella cartella estratta dallo ZIP: `git init`, `git add -A`, `git commit -m "Portale Service - prima versione"`, `git branch -M main`, `git remote add origin https://github.com/<account>/td-service-portale.git`, `git push -u origin main`.
2. Render: **New + > Blueprint**, selezionare il repo: `render.yaml` crea il servizio `td-service-portale` (piano Starter, Frankfurt). Verificare in Settings > Instance Type che sia Starter.
3. Dominio: Settings > Custom Domains > `service.toscanadiagnostica.it`; nel DNS Artera un record **CNAME** `service` -> `td-service-portale.onrender.com` (non un inoltro). Quando Render mostra Verified e Certificate Issued, impostare in Environment `CANONICAL_HOST=service.toscanadiagnostica.it`. Mai prima: crea un loop di redirect.

## Aggiornamento (routine RSGI, passo 11, applicazione 7)

Dal PC di Francesco, con il repo clonato e OneDrive sincronizzato: `build\aggiorna_service.bat`. Rilegge REG006 corrente, copia PDF e stampabili del perimetro, rigenera l'indice full-text e la mappa delle preparazioni, poi commit e push; Render ripubblica in 2-3 minuti. Il footer mostra revisione REG006 e data di pubblicazione.

I tre file redazionali (`certificazioni.json`, `veq.json`, `contatti.json`) e la cartella `certificati/` si aggiornano a mano quando cambia un certificato, un ciclo VEQ o un contatto: basta modificare il JSON (e caricare il PDF) e rilanciare il batch, oppure caricare il file sul repo via web.
