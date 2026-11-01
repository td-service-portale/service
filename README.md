# Portale Service di Laboratorio · Toscana Diagnostica

Sito pubblico dedicato ai laboratori e alle strutture clienti del Service di Laboratorio. Dominio ufficiale: `https://service.toscanadiagnostica.it`. Clone del Portale SGI (`td-sgi/portale`) con lo stesso stack (Python 3.12 + Flask + gunicorn, nessun database, stile Cash Management) e quattro sezioni:

1. **Preparazioni e documenti** (`/`): tutte le prestazioni GIPO con la preparazione collegata (link stabile `/p/<codice shortcut>`), le istruzioni di preparazione per il paziente in versione stampabile, e la documentazione del laboratorio (procedure, istruzioni di lavoro, manuali, registri, moduli, informative, documenti esterni) con ricerca full-text sul testo dei PDF.
2. **Certificazioni di qualità** (`/certificazioni`): le norme del Sistema di Gestione Integrato, i certificati EuCI scaricabili (ISO 9001, 14001, 45001, 37001), campo di applicazione, accreditamento SSR, autorizzazione sanitaria, Politica Integrata.
3. **VEQ** (`/veq`): cos'è la Valutazione Esterna di Qualità, il CRRVEQ Careggi, i 23 programmi del ciclo 2026, le procedure SGI collegate, il contratto di adesione.
4. **Agorà** (`/agora`, `/agora/<slug>`): il blog. Articoli in `data/blog.json` (titolo, slug, data, autore, sommario, paragrafi); in fondo il box newsletter: con `newsletter.brevo_url` valorizzato mostra il form Brevo in iframe, altrimenti un pulsante mailto a `fallback_email`.
5. **Servizi** (voci configurabili in `data/menu.json`): Vademecum (`/vademecum`, vedi sotto), Circolari e aggiornamenti operativi, Ordine del materiale e Portale NC (dal 01/11/2026 aprono i widget della Suite TD in nuova scheda: https://suite.toscanadiagnostica.it/circolari, /orders, /nc), Check-up e promozioni mensili (per ora senza link: apre la pagina segnaposto `/in-allestimento/<id>`; quando `href` viene valorizzato il menu punta direttamente al link, in nuova scheda se `blank` è true). Una voce con `box` {url, titolo, testo, icon} mostra nella pagina segnaposto un riquadro cliccabile verso un portale esterno (es. Ordine del materiale -> Suite TD, widget Ordini).
   **Vademecum** (`/vademecum`, richiesta del CEO del 01/11/2026): la pagina incorpora https://referti.toscanadiagnostica.it/vademecum (variabile `VADEMECUM_ONLINE_URL`) in un iframe. Il server verifica prima se il sito lo consente (`/api/vademecum/embeddabile`: X-Frame-Options e Content-Security-Policy frame-ancestors, cache di un'ora); se è vietato o il sito non risponde, la pagina mostra il PDF della cartella `vademecum/` (consultabile, ricercabile, scaricabile) e il pulsante "Apri il Vademecum online" in nuova scheda.
6. **Contatti** (`/contatti`), da `data/contatti.json`.

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
data/blog.json              REDAZIONALE: articoli di Agora' e newsletter (Brevo)
data/menu.json              REDAZIONALE: voci di menu Servizi (link esterni o segnaposto)
certificati/                PDF dei certificati, Politica Integrata, contratto di adesione CRRVEQ firmato, calendario QCMD
vademecum/                  PDF del Vademecum degli esami (pagina /vademecum: visualizzatore, ricerca, download con ?dl=1)
docs/<Area>/*.pdf, stampabili/*.pdf   generati dal build
static/                     index.html + app.js (pagina 1), certificazioni.html, veq.html, contatti.html, agora.html, in-allestimento.html, shell.js, app.css, loghi
```

## URL

| URL | Cosa fa |
|---|---|
| `/` | Preparazioni e documenti (`?q=` ricerca, `?codice=` prestazione) |
| `/p/<codice shortcut>` (es. `/p/ECO003`) | PDF della preparazione della prestazione; se più di una, elenco. Codice GIPO numerico accettato come alias. `.pdf` forza il PDF |
| `/m/TD-SGI-INF001` | versione stampabile corrente del modulo/informativa |
| `/doc/TD-SGI-PRO042` | PDF corrente del documento |
| `/certificazioni`, `/veq`, `/contatti`, `/agora`, `/agora/<slug>`, `/vademecum`, `/in-allestimento/<id>` | pagine |
| `/certificati/<file>.pdf`, `/docs/<area>/<file>.pdf`, `/stampabili/<file>.pdf` | file |
| `/api/preparazioni`, `/api/meta`, `/data/*.json`, `/healthz` | dati |
| `/api/vademecum/embeddabile` | il Vademecum online si può incorporare? (`consentito`, `motivo`, `pdf` di ripiego) |

I PDF sono consegnati direttamente sotto l'indirizzo richiesto (nessun redirect): nella barra resta `service.toscanadiagnostica.it/p/ECO003`. Il pulsante busta apre il client di posta con i link e li copia negli appunti anche in HTML; il pulsante catena copia l'URL in doppio formato (testo + collegamento).

## Pubblicazione (una volta sola)

1. GitHub: repository `td-service-portale` (vuoto). Dal PC, nella cartella estratta dallo ZIP: `git init`, `git add -A`, `git commit -m "Portale Service - prima versione"`, `git branch -M main`, `git remote add origin https://github.com/<account>/td-service-portale.git`, `git push -u origin main`.
2. Render: **New + > Blueprint**, selezionare il repo: `render.yaml` crea il servizio `td-service-portale` (piano Starter, Frankfurt). Verificare in Settings > Instance Type che sia Starter.
3. Dominio: Settings > Custom Domains > `service.toscanadiagnostica.it`; nel DNS Artera un record **CNAME** `service` -> `td-service-portale.onrender.com` (non un inoltro). Quando Render mostra Verified e Certificate Issued, impostare in Environment `CANONICAL_HOST=service.toscanadiagnostica.it`. Mai prima: crea un loop di redirect.

## Aggiornamento (routine RSGI, passo 11, applicazione 7)

Dal PC di Francesco, con il repo clonato e OneDrive sincronizzato: `build\aggiorna_service.bat`. Rilegge REG006 corrente, copia PDF e stampabili del perimetro, rigenera l'indice full-text e la mappa delle preparazioni, poi commit e push; Render ripubblica in 2-3 minuti. Il footer mostra revisione REG006 e data di pubblicazione.

I file redazionali (`certificazioni.json`, `veq.json`, `contatti.json`, `blog.json`, `menu.json`) e la cartella `certificati/` si aggiornano a mano quando cambia un certificato, un ciclo VEQ o un contatto: basta modificare il JSON (e caricare il PDF) e rilanciare il batch, oppure caricare il file sul repo via web.

## Copia conforme nella Suite (01/11/2026)

Richiesta del CEO: "inglobarlo e renderlo parte della suite. Ma continuare ad aggiornare la app separata. Avere cioè copia conforme dei due sistemi". Il Portale Service esiste in due presentazioni identiche: questo sito pubblico, che **resta la fonte dei contenuti**, e il widget "Portale Service" della Suite TD (https://suite.toscanadiagnostica.it/service), che ne è uno **specchio di sola lettura** per gli utenti della Suite (personale e clienti service con accesso).

- La Suite legge da qui `/api/meta` e `/data/*.json` ogni 6 ore (e con "Aggiorna adesso" nelle Impostazioni del widget): se cambia `meta.build` o uno dei JSON (anche un file redazionale caricato via web), sostituisce i contenuti e svuota la propria cache dei PDF. I PDF (`/docs/...`, `/stampabili/...`, `/certificati/...`, `/vademecum/...`) e i loghi di `/static/` li scarica alla prima apertura e li tiene in cache.
- Se dalla rete della Suite il sito non fosse raggiungibile, nelle Impostazioni del widget si carica lo ZIP di questo repository (GitHub > Code > Download ZIP): stessi contenuti.
- **La routine di aggiornamento non cambia**: `build\aggiorna_service.bat` (o la modifica dei JSON redazionali) come sempre. Non serve fare nulla nella Suite.
- Non rinominare né spostare `data/*.json`, `/api/meta` e le cartelle dei PDF: sono il contratto con lo specchio. Una nuova voce in `data/menu.json` compare da sola anche nella Suite; una nuova pagina o un nuovo JSON vanno aggiunti anche alla Suite.
- Nel menu Servizi le voci Circolari, Ordine del materiale e Portale NC puntano ai widget della Suite; la voce Vademecum ha il campo `pdf` (PDF di ripiego, usato anche dalla Suite).
