# Portale Service · patch del 01/11/2026 (sito di origine, repo `td-service-portale`)

Richiesta del CEO (01/11/2026): "In portale service: cambia la pagina Vademecum. Ingloba questa pagina: https://referti.toscanadiagnostica.it/vademecum.
Se non ce la fai, aprila in _blank. Inoltre, Circolari e aggiornamenti, apri il widget Circolari. Ordine del materiale, apri il widget orders.
Portale NC apri il widget NC." e "inglobarlo e renderlo parte della suite. Ma continuare ad aggiornare la app separata".

Questa cartella contiene **solo i file modificati**, nella stessa struttura del repository, più `patch.diff` (diff unificato rispetto alla
versione attuale). Nessun file di dati generato dal build (docs.json, preparazioni.json, fulltext.json, meta.json) e nessun PDF cambia.

## File
| File | Cosa cambia |
| --- | --- |
| `data/menu.json` | Circolari → `https://suite.toscanadiagnostica.it/circolari`, Ordine del materiale → `https://suite.toscanadiagnostica.it/orders` (riquadro `box` aggiornato verso il widget Ordini), Portale NC → `https://suite.toscanadiagnostica.it/nc`, tutti con `blank: true`. Voce Vademecum: nuovi campi `pdf` (PDF di ripiego, letto anche dalla Suite) e `online` (indirizzo del Vademecum online, informativo). `_nota` aggiornata. Check-up e promozioni invariata (segnaposto). |
| `app.py` | Nuovo endpoint `GET /api/vademecum/embeddabile`: richiesta di prova al Vademecum online (timeout 8 s, cache 1 ora), lettura di `X-Frame-Options` e `Content-Security-Policy: frame-ancestors` (stesse regole della Suite: frame-ancestors prevale; DENY, SAMEORIGIN di un'altra origine, `'none'`, sorgenti che non comprendono il dominio del sito vietano; nessuna intestazione consente; errore di rete o risposta non 2xx = non incorporabile). Risponde `{url, consentito, motivo, pdf, verificato_at}`. Variabile facoltativa `VADEMECUM_ONLINE_URL` (predefinita https://referti.toscanadiagnostica.it/vademecum). Docstring aggiornata. Solo libreria standard (urllib): `requirements.txt` invariato. |
| `static/vademecum.html` | La pagina chiede `/api/vademecum/embeddabile`: se consentito incorpora il Vademecum online in un iframe a tutta altezza; altrimenti avviso con il motivo, il PDF della cartella `vademecum/` (visualizzatore con ricerca, come prima) e il pulsante **"Apri il Vademecum online"** (nuova scheda), sempre presente. "Scarica il PDF", "Apri il PDF a schermo intero" e "Copia il link" restano. Se l'endpoint non risponde vale il ripiego PDF. |
| `README.md` | Voce Servizi aggiornata (widget della Suite, Vademecum incorporato), riga `/api/vademecum/embeddabile` nella tabella URL, nuova sezione **"Copia conforme nella Suite"**: la Suite specchia il sito (JSON ogni 6 ore + PDF in cache, ZIP del repo come ripiego), la routine di aggiornamento resta invariata. |

## Come applicarla
1. Nel repo clonato sul PC (lo stesso di `build\aggiorna_service.bat`): copiare i quattro file sopra al loro posto (oppure `git apply patch.diff`
   dalla radice del repo).
2. Pubblicare come sempre: `build\aggiorna_service.bat` (commit e push; Render ripubblica in 2-3 minuti). Il batch rigenera solo docs,
   preparazioni, fulltext e meta: `menu.json` e le pagine non vengono toccati.
3. Facoltativo, su Render: `VADEMECUM_ONLINE_URL` solo se l'indirizzo del Vademecum online cambia.
4. Nella Suite non serve nulla: lo specchio riprende `menu.json` entro 6 ore (o subito con Portale Service > Impostazioni > Aggiorna adesso).

## Collaudo fatto (01/11/2026, in locale)
Sito patchato avviato con Flask 3.1.3 su una copia con i file del repo, Vademecum online simulato da un server locale:
- `X-Frame-Options: DENY` → `consentito: false, motivo "X-Frame-Options: DENY"`; la pagina mostra l'avviso, il PDF locale e il pulsante in nuova scheda (target `_blank`).
- `Content-Security-Policy: frame-ancestors 'self' http://127.0.0.1:7042` (il sito stesso) → `consentito: true`, iframe del Vademecum online.
- `frame-ancestors 'self' https://*.toscanadiagnostica.it` visto da un sito su `http://127.0.0.1` → `consentito: false` (corretto: il dominio non coincide).
- `/data/menu.json` servito con le nuove voci; nessun errore JavaScript nella pagina.

## Da verificare dopo la pubblicazione
- Dalla rete di Render, `https://referti.toscanadiagnostica.it/vademecum` risponde e con quali intestazioni (la decisione iframe/PDF dipende
  da questo: se il sito referti invia `X-Frame-Options: DENY/SAMEORIGIN` o una CSP che non comprende service.toscanadiagnostica.it, resta il
  ripiego PDF + pulsante; per incorporarlo davvero va aggiunto sul sito referti `Content-Security-Policy: frame-ancestors
  https://service.toscanadiagnostica.it https://suite.toscanadiagnostica.it`).
- I link verso la Suite richiedono un account: i clienti senza accesso alla Suite trovano la pagina di login (Circolari, Ordini, NC).


## 01/11/2026 (2)
- `data/menu.json`: nuova voce Servizi "Referti di Laboratorio" → https://referti.toscanadiagnostica.it/ in scheda nuova (richiesta del CEO). La Suite la mostra comunque anche se il sito non è aggiornato.
