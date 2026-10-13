/* Portale Service di Laboratorio · pagina principale: prestazioni con preparazione + documentazione del laboratorio */
(function () {
  const { icon, esc, norm, toast, copy, shell, footer, mailtoDoc, copyDocLinks } = window.SGI;
  const FAMIGLIE = [['all', 'Tutte'], ['PRO', 'Procedure'], ['IDL', 'Istruzioni di lavoro'], ['MAN', 'Manuali'], ['REG', 'Registri'], ['PLN', 'Piani'],
    ['MOD', 'Moduli'], ['INF', 'Informative'], ['DEX', 'Doc. esterni']];
  const KPI = {
    prep: { label: 'Prestazioni con preparazione' },
    inf: { label: 'Istruzioni di preparazione per il paziente', fam: ['INF'], withPrepOnly: true },
    moduli: { label: 'Moduli di richiesta e consenso', fam: ['MOD', 'DEX'] },
    operativi: { label: 'Procedure, istruzioni e manuali del laboratorio', fam: ['PRO', 'IDL', 'MAN', 'REG', 'PLN'] },
  };
  const PILLS = ['Curva glicemica', 'Urine 24h', 'Tampone', 'Breath test', 'Feci', 'Sostanze d\'abuso', 'Anatomia patologica', 'Valori critici', 'Trasporto campioni', 'Consenso'];
  const $ = id => document.getElementById(id);
  const slug = s => String(s).normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
  let DOCS = [], META = {}, ROWS = [], FULLTEXT = null, loadingText = false, curDocs = [], ui = null;
  let activeFams = null, activeArea = 'all', kpiMode = null, gruppo = 'all';
  const grp = r => ((r.extra || {})['Gruppo'] || '').replace(/^\s*-\s*/, '').trim();
  const hl = (t, q) => { if (!q) return esc(t); const s = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); return esc(t).replace(new RegExp('(' + s + ')', 'gi'), '<span class="mark">$1</span>'); };

  async function loadFullText() {
    if (FULLTEXT || loadingText) return; loadingText = true;
    try { FULLTEXT = await (await fetch('/data/fulltext.json')).json(); } catch (e) { FULLTEXT = {}; }
    loadingText = false; render($('searchInput').value);
  }

  /* ---- prestazioni ---- */
  function searchPrep(q) {
    const terms = norm(q.trim()).split(/\s+/).filter(Boolean);
    return ROWS.filter(r => (gruppo === 'all' || grp(r) === gruppo) && (!terms.length || terms.every(t =>
      norm(r.codice + ' ' + (r.shortcut || '') + ' ' + r.descrizione + ' ' + Object.values(r.extra || {}).join(' ') + ' ' + (r.link || []).map(l => l.title + ' ' + l.code).join(' ')).includes(t))));
  }
  function prepRow(r, q) {
    const ex = r.extra || {};
    const links = (r.link || []).map(l => `<a class="btn sm" href="${encodeURI('/' + l.file)}" target="_blank">${icon('doc', 14)} ${esc(l.title)}</a>`).join(' ');
    const url = r.url ? location.origin + r.url : null;
    return `<tr>
      <td><span class="doc-code">${hl(r.shortcut || r.codice, q)}</span>${r.shortcut && r.shortcut !== r.codice ? `<div class="small muted">GIPO ${esc(r.codice)}</div>` : ''}</td>
      <td><div class="doc-title">${hl(r.descrizione, q)}</div><div class="doc-sintesi">${esc([grp(r), ex['Specialità']].filter(Boolean).join(' · '))}</div></td>
      <td><div class="doc-actions" style="justify-content:flex-start">${links || '<span class="badge b-grey">nessuna preparazione</span>'}</div></td>
      <td>${url ? `<span class="url" data-url="${esc(url)}" title="Copia il link (incollabile come collegamento cliccabile)">${esc(url)}</span>` : ''}</td>
    </tr>`;
  }

  /* ---- documenti ---- */
  function searchDocs(q) {
    const terms = norm(q.trim()).split(/\s+/).filter(Boolean);
    const anyFilter = terms.length || activeFams || activeArea !== 'all' || kpiMode;
    if (!anyFilter) return [];
    const withPrepOnly = kpiMode && KPI[kpiMode].withPrepOnly;
    return DOCS.filter(d => {
      if (d.prep_only && !withPrepOnly) return false;
      if (activeFams && !activeFams.includes(d.famiglia)) return false;
      if (activeArea !== 'all' && d.area !== activeArea) return false;
      if (!terms.length) return true;
      const hay = norm(d.code + ' ' + d.title + ' ' + d.sintesi + ' ' + d.area + ' ' + d.famiglia_nome);
      const body = FULLTEXT ? norm(FULLTEXT[d.code] || '') : '';
      return terms.every(t => hay.includes(t) || body.includes(t));
    }).sort((a, b) => {
      const qq = norm(q.trim());
      const qa = qq && norm(a.code + ' ' + a.title).includes(qq) ? 0 : 1, qb = qq && norm(b.code + ' ' + b.title).includes(qq) ? 0 : 1;
      return qa - qb || a.code.localeCompare(b.code);
    });
  }
  function docRow(d, i, q) {
    const pdf = d.pdf ? '/docs/' + d.pdf : null, st = d.stampabile ? '/stampabili/' + d.stampabile : null;
    const alleg = (d.allegati || []).map(a => `<a class="btn sm ghost" href="/docs/${encodeURI(a)}" target="_blank" title="${esc(a.split('/').pop())}" data-stop>Allegato</a>`).join('');
    return `<tr class="click" data-idx="${i}">
      <td><span class="doc-code">${hl(d.code, q)}</span><div class="small muted">${esc(d.famiglia_nome)}${d.pagine ? ' · ' + d.pagine + ' pag.' : ''}</div></td>
      <td><div class="doc-title">${hl(d.title, q)}</div>${d.sintesi && d.sintesi !== d.title ? '<div class="doc-sintesi">' + hl(d.sintesi.length > 200 ? d.sintesi.slice(0, 200) + '…' : d.sintesi, q) + '</div>' : ''}</td>
      <td><span class="badge b-blue">${esc(d.area.replace(/^\d+\.\s*/, ''))}</span></td>
      <td class="small muted" style="white-space:nowrap">rev ${esc(d.rev)}<br>${esc(d.data)}</td>
      <td><div class="doc-actions">
        ${pdf ? `<a class="btn sm" href="${encodeURI(pdf)}" target="_blank" data-stop>PDF</a>` : '<span class="badge b-red">PDF assente</span>'}
        ${st ? `<a class="btn sm ghost" href="${encodeURI(st)}" target="_blank" title="Versione stampabile senza cover" data-stop>Stampabile</a>` : ''}${alleg}
        <a class="iconbtn" title="Invia per e-mail (apre il tuo programma di posta con i link al documento; i link vengono anche copiati come collegamenti)" href="${mailtoDoc(d)}" data-mail="${i}" data-stop>${icon('mail', 16)}</a>
        <button class="iconbtn" title="Copia il link stabile (incollabile come collegamento cliccabile)" data-copy="/doc/${esc(d.code.split('_')[0])}" data-stop>${icon('link', 16)}</button>
      </div></td></tr>`;
  }

  function render(query) {
    const q = query.trim();
    const anyDoc = q.length > 0 || activeFams || activeArea !== 'all' || (kpiMode && kpiMode !== 'prep');
    const showPrep = q.length > 0 || gruppo !== 'all' || kpiMode === 'prep';
    const home = !anyDoc && !showPrep;
    document.querySelectorAll('.kpi.clickable').forEach(k => k.classList.toggle('on', k.dataset.kpi === kpiMode));
    document.querySelectorAll('#pills .pill').forEach(p => p.classList.toggle('on', norm(p.textContent) === norm(q)));
    $('infGrid').style.display = home ? '' : 'none';
    $('linksCard').style.display = home ? '' : 'none';
    $('prepSection').style.display = showPrep ? '' : 'none';
    $('docSection').style.display = anyDoc ? '' : 'none';
    if (q && !FULLTEXT) loadFullText();

    if (showPrep) {
      const res = searchPrep(q);
      $('prepCount').textContent = res.length;
      $('prepTitle').textContent = q ? 'Prestazioni per "' + q + '"' : 'Prestazioni con preparazione';
      if (!res.length) { $('prepList').innerHTML = '<tr><td colspan="4" class="empty">Nessuna prestazione corrisponde alla ricerca.</td></tr>'; $('prepMore').innerHTML = ''; }
      else {
        const slice = res.slice(0, 150);
        $('prepList').innerHTML = slice.map(r => prepRow(r, q)).join('');
        $('prepMore').innerHTML = res.length > 150 ? `<div class="empty small">Mostrate le prime 150 prestazioni su ${res.length}. Affina la ricerca.</div>` : '';
        $('prepList').querySelectorAll('.url').forEach(el => el.addEventListener('click', () => copy(el.dataset.url)));
      }
    }
    if (anyDoc) {
      const res = searchDocs(q); curDocs = res;
      const parts = [];
      if (kpiMode && kpiMode !== 'prep') parts.push(KPI[kpiMode].label);
      else if (activeFams) parts.push((FAMIGLIE.find(f => f[0] === activeFams[0]) || [])[1]);
      if (activeArea !== 'all') parts.push(activeArea.replace(/^\d+\.\s*/, ''));
      if (q) parts.push('"' + q + '"');
      $('docTitle').textContent = parts.length ? parts.join(' · ') : 'Documentazione del laboratorio';
      $('docCount').textContent = res.length;
      $('searchStats').textContent = res.length + (res.length === 1 ? ' documento' : ' documenti') + (q && !FULLTEXT ? ' · carico l\'indice full-text…' : '') + (q ? ' · la ricerca opera anche sul testo integrale dei PDF' : '');
      if (!res.length) { $('docList').innerHTML = '<tr><td colspan="5" class="empty">Nessun documento corrisponde ai criteri.</td></tr>'; $('docMore').innerHTML = ''; return; }
      const slice = res.slice(0, 150);
      $('docList').innerHTML = slice.map((d, i) => docRow(d, i, q)).join('');
      $('docMore').innerHTML = res.length > 150 ? `<div class="empty small">Mostrati i primi 150 documenti su ${res.length}. Affina la ricerca.</div>` : '';
      $('docList').querySelectorAll('tr.click').forEach(tr => tr.addEventListener('click', e => {
        if (e.target.closest('[data-stop]')) return;
        const d = curDocs[+tr.dataset.idx]; if (d && d.pdf) window.open(encodeURI('/docs/' + d.pdf), '_blank'); else toast('PDF non disponibile per questo documento.', true);
      }));
      $('docList').querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); copy(location.origin + b.dataset.copy); }));
      $('docList').querySelectorAll('[data-mail]').forEach(a => a.addEventListener('click', e => { e.stopPropagation(); const d = curDocs[+a.dataset.mail]; if (d) copyDocLinks(d); }));
    }
  }

  function setSeg(fam) { $('famSeg').querySelectorAll('button').forEach(x => x.classList.toggle('on', x.dataset.f === fam)); }
  function setArea(a) { activeArea = a; $('areaSelect').value = a; if (ui) ui.setArea(a); if (kpiMode === 'prep') kpiMode = null; render($('searchInput').value); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function setKpi(k) {
    if (kpiMode === k) { kpiMode = null; activeFams = null; setSeg('all'); }
    else { kpiMode = k; activeFams = KPI[k].fam || null; setSeg(activeFams ? '' : 'all'); }
    render($('searchInput').value);
    const target = k === 'prep' ? $('prepSection') : $('docSection');
    if (kpiMode) setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }
  function updClear() { $('searchClear').classList.toggle('on', $('searchInput').value.length > 0); }
  function setQuery(v) { $('searchInput').value = v; updClear(); render(v); }
  function reset() { activeFams = null; activeArea = 'all'; kpiMode = null; gruppo = 'all'; $('gruppoSelect').value = 'all'; $('areaSelect').value = 'all'; if (ui) ui.setArea('all'); setSeg('all'); setQuery(''); $('notice').innerHTML = ''; window.scrollTo({ top: 0, behavior: 'smooth' }); }

  function init() {
    const main = DOCS.filter(d => !d.prep_only);
    const counts = {}; main.forEach(d => counts[d.area] = (counts[d.area] || 0) + 1);
    const aree = META.aree.map(a => ({ name: a, count: counts[a] || 0 }));
    const fam = {}; main.forEach(d => fam[d.famiglia] = (fam[d.famiglia] || 0) + 1);
    const nInf = DOCS.filter(d => d.famiglia === 'INF').length;
    const find = c => DOCS.find(d => d.code.startsWith(c + '_'));
    const idl011 = find('TD-SGI-IDL011'), idl013 = find('TD-SGI-IDL013'), pro042 = find('TD-SGI-PRO042'), inf001 = find('TD-SGI-INF001'), mod252 = find('TD-SGI-MOD252'), idl014 = find('TD-SGI-IDL014');
    ui = shell({
      page: 'home', meta: META, aree, onArea: setArea,
      shortcuts: [
        idl011 && idl011.pdf ? { icon: 'doc', label: 'Prelievo e trasporto campioni', href: encodeURI('/docs/' + idl011.pdf), blank: true } : null,
        pro042 && pro042.pdf ? { icon: 'doc', label: 'Fase preanalitica', href: encodeURI('/docs/' + pro042.pdf), blank: true } : null,
        idl013 && idl013.pdf ? { icon: 'doc', label: 'Tabella valori critici', href: encodeURI('/docs/' + idl013.pdf), blank: true } : null,
        idl014 && idl014.pdf ? { icon: 'doc', label: 'Invio campioni Anatomia Patologica', href: encodeURI('/docs/' + idl014.pdf), blank: true } : null,
        inf001 ? { icon: 'print', label: 'Informativa raccolta campioni', href: '/m/TD-SGI-INF001', blank: true } : null,
        mod252 ? { icon: 'print', label: 'Richiesta materiale', href: '/m/TD-SGI-MOD252', blank: true } : null,
      ].filter(Boolean),
    });
    footer(META);
    const sel = $('areaSelect');
    sel.innerHTML = `<option value="all">Tutte le aree (${aree.length})</option>` + aree.map(a => `<option value="${esc(a.name)}">${esc(a.name.replace(/^\d+\.\s*/, ''))} (${a.count})</option>`).join('');
    sel.addEventListener('change', e => setArea(e.target.value));
    $('famSeg').innerHTML = FAMIGLIE.filter(([k]) => k === 'all' || fam[k]).map(([k, l]) => `<button class="${k === 'all' ? 'on' : ''}" data-f="${k}">${l}${k !== 'all' ? ' <span class="muted">' + fam[k] + '</span>' : ''}</button>`).join('');
    $('famSeg').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { kpiMode = null; activeFams = b.dataset.f === 'all' ? null : [b.dataset.f]; setSeg(b.dataset.f); render($('searchInput').value); }));
    const gruppi = [...new Set(ROWS.map(grp).filter(Boolean))].sort();
    $('gruppoSelect').innerHTML = '<option value="all">Tutti i gruppi</option>' + gruppi.map(g => `<option value="${esc(g)}">${esc(g)}</option>`).join('');
    $('gruppoSelect').addEventListener('change', e => { gruppo = e.target.value; if (!kpiMode && !$('searchInput').value) kpiMode = 'prep'; render($('searchInput').value); });
    const nPrep = ROWS.filter(r => r.link && r.link.length).length;
    $('kpis').innerHTML = `
      <div class="card kpi accent clickable" data-kpi="prep" role="button" tabindex="0"><div class="lbl">Prestazioni con preparazione</div><div class="val">${nPrep}</div><div class="foot">${ROWS.length} prestazioni a catalogo · link stabile per ciascuna</div><div class="act">Sfoglia</div></div>
      <div class="card kpi clickable" data-kpi="inf" role="button" tabindex="0"><div class="lbl">Istruzioni per il paziente</div><div class="val">${nInf}</div><div class="foot">informative di preparazione, versione stampabile</div><div class="act">Mostra</div></div>
      <div class="card kpi clickable" data-kpi="moduli" role="button" tabindex="0"><div class="lbl">Moduli di richiesta e consenso</div><div class="val">${(fam.MOD || 0) + (fam.DEX || 0)}</div><div class="foot">${fam.MOD || 0} moduli · ${fam.DEX || 0} documenti esterni</div><div class="act">Mostra</div></div>
      <div class="card kpi clickable" data-kpi="operativi" role="button" tabindex="0"><div class="lbl">Procedure e istruzioni</div><div class="val">${(fam.PRO || 0) + (fam.IDL || 0) + (fam.MAN || 0) + (fam.REG || 0) + (fam.PLN || 0)}</div><div class="foot">${fam.PRO || 0} PRO · ${fam.IDL || 0} IDL · ${fam.MAN || 0} MAN</div><div class="act">Mostra</div></div>`;
    $('kpis').querySelectorAll('.kpi').forEach(k => { k.addEventListener('click', () => setKpi(k.dataset.kpi)); k.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setKpi(k.dataset.kpi); } }); });
    $('pills').innerHTML = PILLS.map(p => `<button class="pill" type="button">${esc(p)}</button>`).join('');
    $('pills').querySelectorAll('.pill').forEach(p => p.addEventListener('click', () => setQuery(p.classList.contains('on') ? '' : p.textContent)));
    const infs = DOCS.filter(d => d.famiglia === 'INF' && d.stampabile).sort((a, b) => a.title.localeCompare(b.title, 'it'));
    $('prepTiles').innerHTML = infs.map(d => `<a class="tile" href="${encodeURI('/stampabili/' + d.stampabile)}" target="_blank"><div class="code">${esc(d.code.split('_')[0])}${/_0[a-z]$/.test(d.code) ? esc(d.code.slice(-3)) : ''}</div><div class="name">${esc(d.title)}</div></a>`).join('');

    const inp = $('searchInput'), clr = $('searchClear');
    clr.innerHTML = icon('x', 14); $('sb').insertAdjacentHTML('afterbegin', icon('search'));
    inp.addEventListener('input', e => { updClear(); render(e.target.value); });
    inp.addEventListener('focus', loadFullText);
    clr.addEventListener('click', () => { setQuery(''); inp.focus(); });
    inp.addEventListener('keydown', e => { if (e.key === 'Escape') setQuery(''); });
    $('resetBtn').addEventListener('click', reset);
    const qs = new URLSearchParams(location.search); const cod = qs.get('codice'); const q = qs.get('q');
    if (cod) {
      const hit = ROWS.find(r => slug(r.shortcut || r.codice).toLowerCase() === slug(cod).toLowerCase() || slug(r.codice).toLowerCase() === slug(cod).toLowerCase());
      if (!hit) $('notice').innerHTML = `<div class="alert warn">${icon('info', 18)}<div>Il codice <strong>${esc(cod)}</strong> non è presente nell'elenco delle preparazioni pubblicate. Usa la ricerca per nome dell'esame oppure contatta il laboratorio.</div></div>`;
      setQuery(cod);
    } else if (q) setQuery(q);
    else render('');
  }

  Promise.all([fetch('/data/docs.json').then(r => r.json()), fetch('/data/meta.json').then(r => r.json()), fetch('/api/preparazioni').then(r => r.json())])
    .then(([d, m, p]) => { DOCS = d; META = m; ROWS = p.righe || []; init(); })
    .catch(() => { document.querySelector('.page').insertAdjacentHTML('afterbegin', '<div class="alert warn">Errore nel caricamento dei dati del portale.</div>'); });
})();
