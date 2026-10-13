# -*- coding: utf-8 -*-
"""
Portale Service di Laboratorio - Toscana Diagnostica (Flask).
Sito pubblico dedicato ai laboratori e alle strutture clienti del Service di Laboratorio (decisione AD 13/10/2026: tutto pubblico).

Pagine:
  /                 Preparazioni e documentazione (prestazioni GIPO con preparazione, documenti di Accettazione,
                    Laboratorio di Analisi e Service di Laboratorio, ricerca full-text)
  /certificazioni   Certificazioni di qualita' di Toscana Diagnostica (certificati PDF)
  /veq              Valutazione Esterna di Qualita' (CRRVEQ Careggi): programmi e documenti
  /contatti         Contatti di Toscana Diagnostica
  /agora, /agora/<slug>          Agora', il blog (articoli in data/blog.json; newsletter Brevo configurabile)
  /in-allestimento/<id>          pagina segnaposto per le voci di menu senza link (data/menu.json)

Link stabili (senza revisione, restano validi quando il documento sale di revisione):
  /p/<codice shortcut>   preparazione della prestazione GIPO (es. /p/ECO003); il codice GIPO numerico e' accettato come alias
  /m/<TD-SGI-CODICE>     versione stampabile corrente del modulo/informativa
  /doc/<TD-SGI-CODICE>   PDF corrente del documento
Il PDF viene consegnato direttamente sotto l'indirizzo richiesto: la barra del browser resta sul dominio ufficiale.

Variabili d'ambiente: CANONICAL_HOST (es. service.toscanadiagnostica.it): se impostato, ogni richiesta arrivata su un altro
host viene reindirizzata (301) al dominio ufficiale. Lasciare vuoto finche' il DNS e il certificato non sono attivi.
"""
import os, json, re, unicodedata
from flask import Flask, send_from_directory, abort, redirect, request, jsonify, make_response

BASE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(BASE, 'data')
app = Flask(__name__, static_folder=os.path.join(BASE, 'static'), static_url_path='/static')
CANONICAL_HOST = os.environ.get('CANONICAL_HOST', '').strip().lower()


@app.before_request
def _canonical():
    if CANONICAL_HOST and request.host.lower() != CANONICAL_HOST and request.path != '/healthz':
        return redirect('https://' + CANONICAL_HOST + request.full_path.rstrip('?'), 301)


def _load(name):
    with open(os.path.join(DATA, name), encoding='utf-8') as f:
        return json.load(f)


DOCS = _load('docs.json')
META = _load('meta.json')
PREP = _load('preparazioni.json')
BY_BASE = {}
for d in DOCS:
    BY_BASE[d['code']] = d
    if not re.search(r'_0[a-z]$', d['code']):      # INF001_0a..0s: il suffisso e' parte del codice
        BY_BASE[d['code'].rsplit('_', 1)[0]] = d


def slug(s):
    s = unicodedata.normalize('NFKD', str(s)).encode('ascii', 'ignore').decode()
    return re.sub(r'[^A-Za-z0-9]+', '-', s).strip('-')


PREP_BY_SLUG = {}
for r in PREP.get('righe', []):
    if r.get('link'):
        PREP_BY_SLUG[slug(r.get('shortcut') or r['codice']).lower()] = r
for r in PREP.get('righe', []):
    if r.get('link'):
        PREP_BY_SLUG.setdefault(slug(r['codice']).lower(), r)


def _pdf_headers(resp):
    resp.headers['Content-Type'] = 'application/pdf'
    resp.headers['X-Content-Type-Options'] = 'nosniff'
    resp.headers['Cache-Control'] = 'public, max-age=3600'
    resp.headers['Content-Disposition'] = 'inline'
    return resp


def _lookup(code):
    c = re.sub(r'\.pdf$', '', code, flags=re.I)
    return BY_BASE.get(c) or BY_BASE.get(c.upper()) or BY_BASE.get(c.upper()[:-1] + c[-1].lower())


def _serve(relpath):
    """Consegna 'stampabili/x.pdf', 'docs/area/x.pdf' o 'certificati/x.pdf' senza redirect."""
    folder, _, fname = relpath.partition('/')
    if folder not in ('stampabili', 'docs', 'certificati'):
        abort(404)
    return _pdf_headers(make_response(send_from_directory(os.path.join(BASE, folder), fname)))


def _page(name):
    resp = make_response(send_from_directory(app.static_folder, name))
    resp.headers['Cache-Control'] = 'no-cache'
    return resp


# ---------- Pagine ----------
@app.route('/')
def index():
    return _page('index.html')


@app.route('/preparazioni')
def preparazioni():
    return redirect('/?' + request.query_string.decode() if request.query_string else '/', 302)


@app.route('/certificazioni')
def certificazioni():
    return _page('certificazioni.html')


@app.route('/veq')
def veq():
    return _page('veq.html')


@app.route('/contatti')
def contatti():
    return _page('contatti.html')


@app.route('/agora')
@app.route('/agora/<slug>')
def agora(slug=None):
    return _page('agora.html')


@app.route('/in-allestimento/<vid>')
def in_allestimento(vid):
    return _page('in-allestimento.html')


# ---------- Link stabili e file ----------
@app.route('/p/<codice>')
def prestazione(codice):
    want_pdf = codice.lower().endswith('.pdf')
    key = slug(codice[:-4] if want_pdf else codice).lower()
    row = PREP_BY_SLUG.get(key)
    if not row:
        return redirect('/?codice=' + codice, 302)
    links = row['link']
    if len(links) == 1 or want_pdf:
        return _serve(links[0]['file'])
    return redirect('/?codice=' + (row.get('shortcut') or row['codice']), 302)


@app.route('/m/<code>')
def modulo(code):
    d = _lookup(code)
    if not d:
        abort(404)
    if d.get('stampabile'):
        return _serve('stampabili/' + d['stampabile'])
    if d.get('pdf'):
        return _serve('docs/' + d['pdf'])
    abort(404)


@app.route('/doc/<code>')
def doc(code):
    d = _lookup(code)
    if not d or not d.get('pdf'):
        abort(404)
    return _serve('docs/' + d['pdf'])


@app.route('/docs/<path:fname>')
def docs(fname):
    return _pdf_headers(make_response(send_from_directory(os.path.join(BASE, 'docs'), fname)))


@app.route('/stampabili/<path:fname>')
def stampabili(fname):
    return _pdf_headers(make_response(send_from_directory(os.path.join(BASE, 'stampabili'), fname)))


@app.route('/certificati/<path:fname>')
def certificati(fname):
    return _pdf_headers(make_response(send_from_directory(os.path.join(BASE, 'certificati'), fname)))


@app.route('/data/<path:fname>')
def data(fname):
    resp = make_response(send_from_directory(DATA, fname))
    resp.headers['Cache-Control'] = 'public, max-age=600'
    return resp


@app.route('/api/preparazioni')
def api_prep():
    return jsonify(PREP)


@app.route('/api/meta')
def api_meta():
    return jsonify(META)


@app.route('/robots.txt')
def robots():
    return send_from_directory(app.static_folder, 'robots.txt')


@app.route('/healthz')
def healthz():
    return 'ok'


@app.errorhandler(404)
def nf(e):
    return send_from_directory(app.static_folder, '404.html'), 404


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8000)), debug=False)
