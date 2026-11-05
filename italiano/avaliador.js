/* Parla Italiano · avaliador da produção escrita do Teste A1
   Inspirado no CEFR/QECR e nos critérios das provas CILS/CELI (sem equivalência oficial).
   Correção por regras: reconhece o significado (variações e sinônimos), não compara com uma resposta-modelo.
   Mesma entrada → mesma nota (sem sorteio). Mudou a rubrica? Suba RUBRIC. */
(function (root) {
  const RUBRIC = 'A1-escrita-v2 (2026-11)';

  // ---------- utilidades ----------
  const deacc = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '');
  const nrm = s => deacc(String(s).toLowerCase()).replace(/[’`´]/g, "'").replace(/[^a-z0-9' ]/g, ' ').replace(/'/g, "' ").replace(/\s+/g, ' ').trim();
  const words = s => String(s).trim().split(/\s+/).filter(w => /[A-Za-zÀ-ú]/.test(w));
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const COUNTRY = ['brasile', 'italia', 'portogallo', 'argentina', 'stati uniti', 'america', 'spagna', 'francia', 'germania', 'inghilterra', 'giappone', 'cina', 'messico', 'uruguay', 'colombia', 'cile', 'peru', 'canada', 'russia', 'svizzera', 'olanda', 'belgio', 'austria', 'polonia', 'grecia', 'paraguay', 'venezuela', 'bolivia', 'angola', 'mozambico', 'india', 'corea', 'egitto', 'marocco', 'irlanda', 'scozia', 'australia', 'europa'];
  const NAZ = /^(brasilian|italian|argentin|american|portoghes|spagnol|frances|tedesc|ingles|giappones|cines|messican|uruguaian|colombian|cilen|peruvian|canades|russ|svizzer|olandes|belg|austriac|polacc|grec|paraguaian|venezuelan|bolivian|angolan|mozambican|indian|corean|egizian|marocchin|irlandes|scozzes|australian)[aeio]$/;
  const PROF = /^(ingegner|medic|insegnant|impiegat|student|avvocat|commercial|imprenditor|architett|infermier|cuoc|camerier|programmator|giornalist|pensionat|casaling|operai|dentist|farmacist|commess|segretari|musicist|pittor|autist|poliziott|agricoltor|contadin|meccanic|elettricist|disoccupat|manager|consulent|ragionier|venditor|attor|attric|cantant|veterinari|psicolog|professor|maestr|ricercat|economist|tecnic|direttor|amministrator|dirigent|fisioterapist|biolog|chimic|geometr|designer|informatic|sviluppator|barist|parrucchier|estetist|militar|vigil|pompier|pilot|commercialist|imprenditric|avvocatess|dottor|dottoress)\w*$/;

  // vocabulário italiano de base (A1); o jogo acrescenta o das lições
  const CORE = ('ciao caro cara cari care carissimo carissima salve buongiorno buonasera buonanotte gentile mi ti si ci vi chiamo chiami chiama nome io tu lui lei noi voi loro il lo la i gli le un uno una di a ad da in con su per tra fra e ed ma o anche non che chi come dove quando perche molto poco tanto tanti tutto tutti ogni mio mia miei mie tuo tua tuoi tue suo sua nostro nostra vostro questo questa quello quella sono sei e siamo siete ho hai ha abbiamo avete hanno abito abiti abita vivo vivi vive lavoro lavori lavora faccio fai fa studio studi studia parlo parli parla piace piacciono amo ami ama adoro preferisco anni anno citta paese casa famiglia moglie marito figli figlio figlia fratello fratelli sorella sorelle madre padre mamma papa genitori amici amico amica italiano italiana brasiliano brasiliana bene benissimo grazie presto baci bacio abbraccio abbracci saluti saluto vediamo spero scrivimi rispondi domani oggi sempre spesso adesso ora qui li la qua al alla allo ai agli alle del della dello dei degli delle nel nella nello nei nelle sul sulla dal dalla mare montagna cinema musica calcio leggere cantare ballare cucinare viaggiare correre nuotare giocare suonare camminare dormire mangiare bere guardare ascoltare studiare chitarra fisarmonica pianoforte sport libri libro film cibo pizza pasta caffe vino tempo libero weekend fine settimana sabato domenica azienda ufficio scuola universita banca ospedale grande piccolo piccola bello bella nuovo nuova contento contenta felice come stai va tutto tuo tua prossima giornata buona buon dopo allora poi quindi cosi ingegnere medico insegnante impiegato impiegata studente studentessa avvocato professore professoressa architetto infermiere infermiera cuoco cameriere commerciante imprenditore libri viaggi musica serie tv televisione palestra piscina amore insieme lavorare vedere conoscerti conoscere visitare italia brasile san paolo roma milano napoli venezia firenze torino sicilia cosa fare piacere molto tantissimo davvero veramente sempre mai').split(' ');
  // marcas de português (para não dar nota de italiano a texto em português)
  const PT = new Set('eu voce meu minha meus minhas nao moro trabalho gosto sou tchau ola obrigado obrigada abraco beijos beijo tambem muito muita cidade engenheiro em um uma me chamo estou tenho seu sua com isso aqui ate logo bom dia tarde noite filhos esposa marido gostaria'.split(' '));
  const PT_ONLY = new Set('eu voce meu minha meus minhas nao moro trabalho gosto sou tchau ola obrigado obrigada abraco beijos beijo tambem muito muita cidade engenheiro um chamo estou tenho seu isso aqui ate esposa gostaria'.split(' '));

  // erros de grafia frequentes (lista fechada: o avaliador não inventa erro)
  const SPELL = { perche: 'perché', citta: 'città', caffe: 'caffè', piu: 'più', cosi: 'così', gia: 'già', pero: 'però', universita: 'università',
    ingeniere: 'ingegnere', ingegniere: 'ingegnere', ingenere: 'ingegnere', ingegnero: 'ingegnere', ciamo: 'chiamo', chiammo: 'chiamo', piacce: 'piace', piacie: 'piace',
    piaciono: 'piacciono', piaccono: 'piacciono', piacciano: 'piacciono', abbracio: 'abbraccio', abraccio: 'abbraccio', abbito: 'abito', bacci: 'baci', chiao: 'ciao', chao: 'ciao',
    grazzie: 'grazie', familia: 'famiglia', famillia: 'famiglia', molie: 'moglie', mollie: 'moglie', moglia: 'moglie', cozinare: 'cucinare', cucinnare: 'cucinare', balare: 'ballare',
    viaggare: 'viaggiare', viagiare: 'viaggiare', legere: 'leggere', mangare: 'mangiare', italliano: 'italiano', brasilano: 'brasiliano', brasilliano: 'brasiliano', setimana: 'settimana',
    ani: 'anni', ragaza: 'ragazza', belo: 'bello', anke: 'anche', adeso: 'adesso', conoscierti: 'conoscerti', conocerti: 'conoscerti', azzienda: 'azienda', uficio: 'ufficio',
    profesore: 'professore', insegniante: 'insegnante', avocato: 'avvocato', architeto: 'architetto', fisarmonnica: 'fisarmonica', chitara: 'chitarra', musicca: 'musica', sempe: 'sempre', prestto: 'presto' };
  // palavras em português no meio do texto italiano (erro de vocabulário)
  const PTWORD = { eu: 'io', meu: 'mio', minha: 'mia', moro: 'abito', trabalho: 'lavoro', gosto: 'mi piace', muito: 'molto', tambem: 'anche', obrigado: 'grazie', beijos: 'baci', abraco: 'abbraccio', cidade: 'città', engenheiro: 'ingegnere', brasileiro: 'brasiliano', brasileira: 'brasiliana', esposa: 'moglie', filhos: 'figli', tchau: 'ciao', chamo: 'chiamo' };
  const FEM = new Set('famiglia moglie musica citta casa pizza pasta cucina chitarra fisarmonica azienda scuola universita banca figlia sorella mamma madre montagna spiaggia lingua settimana serie televisione palestra piscina bicicletta macchina'.split(' '));
  const MASC = new Set('lavoro marito figlio fratello calcio cinema mare libro film caffe vino papa padre ufficio ospedale gatto cane viaggio sport weekend tempo nome paese'.split(' '));
  const V3 = { abita: 'abito', lavora: 'lavoro', vive: 'vivo', parla: 'parlo', ama: 'amo', adora: 'adoro', studia: 'studio', canta: 'canto', balla: 'ballo', suona: 'suono', legge: 'leggo', fa: 'faccio', ha: 'ho', cucina: 'cucino', viaggia: 'viaggio', preferisce: 'preferisco' };
  const FAM_F = 'moglie|madre|sorella|figlia|mamma', FAM_M = 'marito|padre|fratello|figlio|papa';

  // ---------- requisitos da tarefa (significado, não palavras exatas) ----------
  function requirements(raw) {
    const t = nrm(raw), ws = words(raw), tail = nrm(ws.slice(-7).join(' '));
    const capAfter = re => { const m = raw.match(re); return m ? m[m.length - 1] : null };
    const r = [];
    // 1 · cumprimento no início
    const g = /^(ciao|cara|caro|cari|carissim[oa]|salve|buongiorno|buonasera|gentile|ehi|hey)\b/.test(t);
    r.push({ id: 'saluto', label: 'Cumprimento no início', got: g ? 1 : 0, why: g ? '' : 'Comece cumprimentando: “Ciao Luca!”' });
    // 2 · apresentação com o nome
    const nomeRe = /(?:^|[^\wÀ-ú])(?:[Mm]i chiamo|[Ii]l mio nome [èe]|[Ii]o sono|[Ss]ono)\s+([A-ZÀ-Ú][a-zà-ú]+)/;
    const nm = capAfter(nomeRe) || capAfter(/(?:^|[^\wÀ-ú])(?:mi chiamo|il mio nome [èe])\s+([a-zà-ú]{2,})/i), nmOk = !!nm && !NAZ.test(nrm(nm)) && !PROF.test(nrm(nm)) && !COUNTRY.includes(nrm(nm));
    r.push({ id: 'nome', label: 'Apresentação (nome)', got: nmOk ? 1 : 0, why: nmOk ? '' : 'Diga seu nome: “Mi chiamo …”' });
    // 3 · cidade (nacionalidade ou país não substituem a cidade)
    let city = 0, cityWhy = 'Diga a sua cidade: “Abito a …” ou “Vivo a …”';
    const cm = raw.match(/(?:^|[^\wÀ-ú])(?:[Aa]bit[oa]|[Vv]iv[oe]|[Ss]to|[Ss]ono|[Vv]engo|[Rr]esido)\s+(?:a|ad|in|di|da|nella città di)\s+([A-ZÀ-Ú][\wÀ-ú]+(?:\s+[A-ZÀ-Ú][\wÀ-ú]+)?)/) || raw.match(/(?:^|[^\wÀ-ú])(?:abit[oa]|viv[oe]|resido)\s+(?:a|ad|in)\s+([a-zà-ú]{3,}(?:\s+(?:paolo|paulo|grande|nuova|vecchia))?)/i);
    if (cm) { const place = nrm(cm[1]); if (COUNTRY.includes(place) || COUNTRY.includes(place.split(' ')[0])) { city = .5; cityWhy = 'Você disse o país, mas a tarefa pede a cidade.' } else { city = 1; cityWhy = '' } }
    else if (/\bsono (brasilian|italian|argentin|portoghes|american)\w*/.test(t)) cityWhy = 'Nacionalidade (“sono brasiliano”) não informa a cidade: “Abito a …”';
    r.push({ id: 'citta', label: 'Cidade onde mora', got: city, why: cityWhy });
    // 4 · trabalho
    let job = 0, jobWhy = 'Diga o que faz: “Lavoro come …”, “Sono ingegnere”, “Faccio l’ingegnere”';
    const jt = t.match(/\b(?:lavoro come\s+(?:un |una |uno )?|faccio (?:il |la |lo |l' )?|sono (?:un |una |uno |un' )?|io sono (?:un |una )?)(\w+)/g) || [];
    if (jt.some(x => PROF.test(x.split(' ').pop())) || /\bstudio\b/.test(t)) { job = 1; jobWhy = '' }
    else if (/\blavoro (in|a|per|presso|da|con|nel|nella|all|alla|al)\b/.test(t)) { job = 1; jobWhy = '' }
    else if (/\blavoro\b/.test(t)) { job = .5; jobWhy = 'Diga também em quê: “Lavoro come …” ou “Lavoro in …”' }
    r.push({ id: 'lavoro', label: 'Trabalho', got: job, why: jobWhy });
    // 5 · do que gosta
    const lk = /\b(mi piace|mi piacciono|amo|adoro|preferisco|mi interessa|mi interessano|mi diverte)\s+\w+/.test(t);
    r.push({ id: 'gusti', label: 'Do que gosta', got: lk ? 1 : 0, why: lk ? '' : 'Diga do que gosta: “Mi piace …”' });
    // 6 · despedida no fim
    const bye = /\b(a presto|ciao|baci|un bacio|bacioni|un abbraccio|abbracci|saluti|cari saluti|ci vediamo|a dopo|a domani|alla prossima|buona giornata|buona serata|scrivimi|a risentirci)\b/.test(tail) && !(g && ws.length <= 3);
    r.push({ id: 'saluto2', label: 'Despedida no fim', got: bye ? 1 : 0, why: bye ? '' : 'Termine com uma despedida: “A presto!”' });
    return r;
  }

  // ---------- variações corretas (mostradas como aceitas, nunca como erro) ----------
  function variations(raw) {
    const t = nrm(raw), v = [];
    if (/\bio mi chiamo\b/.test(t)) v.push('“Io mi chiamo” — o pronome “io” é opcional; está certo.');
    if (/\bvivo (a|in)\b/.test(t)) v.push('“Vivo a …” = “Abito a …”.');
    if (/\b(amo|adoro)\b/.test(t)) v.push('“Amo / Adoro …” no lugar de “Mi piace …”.');
    if (/\bsono (un |una )?(ingegner|medic|insegnant|impiegat|avvocat|architett)\w*/.test(t)) v.push('“Sono (un) ingegnere” — tão certo quanto “Lavoro come ingegnere” ou “Faccio l’ingegnere”.');
    if (/\bil mio nome e\b/.test(t)) v.push('“Il mio nome è …” no lugar de “Mi chiamo …”.');
    return v;
  }

  // ---------- erros (lista fechada de regras; cada erro conta uma vez) ----------
  function errors(raw) {
    const out = [], seen = new Set();
    const add = (type, frag, fix, expl, key) => { const k = (key || type) + '|' + nrm(frag); if (seen.has(k)) return; seen.add(k); out.push({ type, frag, fix, expl }) };
    const scan = (re, fn) => { const r = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'); let m; while ((m = r.exec(raw))) { fn(m); if (!m[0]) r.lastIndex++ } };
    const ci = 'giu';
    // gramática
    scan(new RegExp('\\bio\\s+(' + Object.keys(V3).join('|') + ')\\b', ci), m => add('gramatical', m[0], 'io ' + V3[m[1].toLowerCase()], 'Com “io” o verbo termina em -o: ' + V3[m[1].toLowerCase()] + '.', 'io3'));
    scan(/\bmi\s+chiama\b/giu, m => add('gramatical', m[0], 'mi chiamo', 'Eu me chamo = “mi chiamo”.', 'chiama'));
    scan(/\bsono\s+(\w+)\s+anni\b/giu, m => add('gramatical', m[0], 'ho ' + m[1] + ' anni', 'Idade em italiano usa “avere”: ho … anni.', 'anni'));
    scan(/\bmi\s+piace\s+(i|gli|le)\s+(\w+)/giu, m => add('gramatical', m[0], 'mi piacciono ' + m[1] + ' ' + m[2], 'Com coisa no plural: “mi piacciono”.', 'piace-pl'));
    scan(/\bmi\s+piacciono\s+(il|lo|la|l')\s*(\w+)/giu, m => add('gramatical', m[0], 'mi piace ' + m[1] + (m[1].endsWith("'") ? '' : ' ') + m[2], 'Com coisa no singular: “mi piace”.', 'piacciono-sg'));
    scan(/\bmi\s+piacciono\s+(\w+(?:are|ere|ire))\b/giu, m => add('gramatical', m[0], 'mi piace ' + m[1], 'Com verbo no infinitivo: “mi piace” + verbo.', 'piacciono-inf'));
    scan(/\bmi\s+piace\s+di\s+(\w+(?:are|ere|ire))\b/giu, m => add('gramatical', m[0], 'mi piace ' + m[1], 'Sem “di”: mi piace + verbo (em português é “gosto de”).', 'piace-di'));
    scan(/\bcome\s+(un|una|uno)\s+(\w+)/giu, m => add('gramatical', m[0], 'come ' + m[2], 'Depois de “lavoro come” não vai artigo.', 'come-art'));
    scan(/\b([Aa]bit[oia]|[Vv]iv[oie])\s+in\s+([A-ZÀ-Ú][\wÀ-ú]+)/gu, m => { if (!COUNTRY.includes(nrm(m[2]))) add('gramatical', m[0], m[1] + ' a ' + m[2], 'Com cidade usa-se “a”: abito a ' + m[2] + '.', 'prep-citta') });
    scan(/\b([Aa]bit[oia]|[Vv]iv[oie])\s+a\s+([A-ZÀ-Ú][\wÀ-ú]+)/gu, m => { if (COUNTRY.includes(nrm(m[2]))) add('gramatical', m[0], m[1] + ' in ' + m[2], 'Com país usa-se “in”: abito in ' + m[2] + '.', 'prep-paese') });
    scan(/\b[Ss]ono\s+di\s+([A-ZÀ-Ú][\wÀ-ú]+)/gu, m => { if (COUNTRY.includes(nrm(m[1]))) add('gramatical', m[0], 'vengo dal ' + m[1], 'Para país: “vengo dal Brasile” ou “sono brasiliano”.', 'prep-di-paese') });
    scan(/\b(la|il)\s+(mia|mio)\s+(moglie|marito|madre|padre|sorella|fratello|figlia|figlio)\b/giu, m => add('gramatical', m[0], m[2] + ' ' + m[3], 'Com parente no singular, o possessivo vem sem artigo: ' + m[2] + ' ' + m[3] + '.', 'poss-art'));
    scan(new RegExp('\\bmio\\s+(' + FAM_F + '|famiglia)\\b', ci), m => add('gramatical', m[0], 'mia ' + m[1], '“' + m[1] + '” é feminino: mia.', 'poss-g'));
    scan(new RegExp('\\bmia\\s+(' + FAM_M + ')\\b', ci), m => add('gramatical', m[0], 'mio ' + m[1], '“' + m[1] + '” é masculino: mio.', 'poss-g'));
    scan(/\b(il|un|lo)\s+([a-zà-ú]+)/giu, m => { const n = nrm(m[2]); if (FEM.has(n)) add('gramatical', m[0], (m[1].toLowerCase() === 'un' ? 'una ' : 'la ') + m[2], '“' + m[2] + '” é feminino.', 'art-g') });
    scan(/\b(la|una)\s+([a-zà-ú]+)/giu, m => { const n = nrm(m[2]); if (MASC.has(n)) add('gramatical', m[0], (m[1].toLowerCase() === 'una' ? 'un ' : 'il ') + m[2], '“' + m[2] + '” é masculino.', 'art-g') });
    { const m = raw.match(/(?:^|[^\wÀ-ú])(?:mi chiamo|il mio nome [èe])\s+([a-zà-ú]{2,})/i) || raw.match(/(?:^|[^\wÀ-ú])(?:abit[oa]|viv[oe])\s+(?:a|ad|in)\s+([a-zà-ú]{3,})/i);
      if (m && /^[a-zà-ú]/.test(m[1]) && !['un', 'una', 'il', 'la', 'casa', 'centro'].includes(m[1])) add('ortográfico', m[1], m[1][0].toUpperCase() + m[1].slice(1), 'Nomes de pessoas e de cidades começam com maiúscula.', 'cap') }
    // grafia (inclui acentos)
    scan(/[A-Za-zÀ-ú']+/gu, m => { const w = m[0], k = w.toLowerCase(); if (SPELL[k] && k !== SPELL[k]) { const accent = deacc(SPELL[k]) === k; add('ortográfico', w, SPELL[k], accent ? 'Falta o acento: ' + SPELL[k] + '.' : 'Grafia: ' + SPELL[k] + '.', 'sp') } });
    // palavra em português
    scan(/[A-Za-zÀ-ú]+/gu, m => { const k = nrm(m[0]); if (PTWORD[k] && !(k === 'chamo' && /\bmi chiamo\b/i.test(raw))) add('vocabulário', m[0], PTWORD[k], 'Palavra em português; em italiano: ' + PTWORD[k] + '.', 'pt') });
    return out;
  }

  function isPortuguese(raw, vocab) {
    const ws = words(raw).map(nrm).filter(Boolean); if (!ws.length) return { pt: false, ratio: 0 };
    const ptHits = ws.filter(w => PT_ONLY.has(w)).length;
    const V = vocab || CORE_SET, known = words(raw).filter(w => /^[A-ZÀ-Ú]/.test(w) || nrm(w).split(' ').every(x => !x || V.has(x) || SPELL[x])).length;
    const ratio = known / ws.length;
    return { pt: ptHits / ws.length >= .2 || ratio < .45, ratio, ptHits };
  }
  const CORE_SET = new Set(CORE);

  // ---------- nota da mensagem: tarefa 50% · gramática e vocabulário 30% · clareza 20% ----------
  function gradeMsg(raw, extraVocab) {
    raw = String(raw || '');
    const V = new Set(CORE); if (extraVocab) for (const x of extraVocab) V.add(x);
    const ws = words(raw), n = ws.length;
    const res = { rubric: RUBRIC, original: raw, words: n, reqs: [], errors: [], variations: [], dims: {}, total: 0, corrected: '', notes: [] };
    const lang = isPortuguese(raw, V);
    if (!n || lang.pt) {
      res.reqs = requirements('');
      res.errors = n ? [{ type: 'fora do contexto', frag: '', fix: '', expl: 'O texto não está em italiano: a produção escrita em italiano não pode ser pontuada.' }] : [{ type: 'informação ausente', frag: '', fix: '', expl: 'Nenhum texto escrito.' }];
      res.dims = { tarefa: { pts: 0, max: 5 }, gramatica: { pts: 0, max: 3 }, clareza: { pts: 0, max: 2 } };
      res.corrected = '';
      return res;
    }
    // A · tarefa
    res.reqs = requirements(raw);
    const tarefa = 5 * res.reqs.reduce((a, r) => a + r.got, 0) / res.reqs.length;
    res.reqs.filter(r => r.got < 1).forEach(r => res.errors.push({ type: 'informação ausente', frag: '', fix: '', expl: r.label + ': ' + r.why, req: r.id, partial: r.got > 0 }));
    // B · gramática e vocabulário (desconto proporcional, cada erro uma vez)
    const errs = errors(raw); res.errors.push(...errs);
    const g = errs.filter(e => e.type === 'gramatical').length, o = errs.filter(e => e.type === 'ortográfico').length, v = errs.filter(e => e.type === 'vocabulário').length;
    let gram = Math.max(0, 3 - .5 * g - .25 * o - .5 * v);
    const amostra = Math.min(1, n / 15); if (amostra < 1) res.notes.push('Texto curto: com menos de 15 palavras a nota de gramática é proporcional ao que foi escrito.');
    gram *= amostra;
    // C · clareza e organização
    let clar = 2; const cl = [];
    if (n < 12) { clar -= 1; cl.push('Muito curto (' + n + ' palavras; pedido: 20 a 40).') } else if (n < 20) { clar -= .5; cl.push('Curto (' + n + ' palavras; pedido: 20 a 40).') }
    if (n > 50) { clar -= .5; cl.push('Longo demais (' + n + ' palavras; pedido: 20 a 40).') }
    if (lang.ratio < .75) { clar -= .5; cl.push('Há trechos difíceis de entender (palavras que não são italiano).') }
    if (g + v >= 4) { clar -= .5; cl.push('Muitos erros juntos atrapalham a leitura.') }
    if (tarefa === 0) { clar = 0; cl.push('A mensagem não responde ao que foi pedido.') }
    clar = Math.max(0, clar); cl.forEach(x => res.errors.push({ type: 'clareza', frag: '', fix: '', expl: x }));
    res.variations = variations(raw);
    const r1 = x => Math.round(x * 4) / 4;
    res.dims = { tarefa: { pts: r1(tarefa), max: 5 }, gramatica: { pts: r1(gram), max: 3 }, clareza: { pts: r1(clar), max: 2 } };
    res.total = Math.round((res.dims.tarefa.pts + res.dims.gramatica.pts + res.dims.clareza.pts) * 4) / 4;
    // sugestão corrigida: aplica as correções e acrescenta o que faltou
    let fix = raw; for (const e of errs) if (e.frag && e.fix) fix = fix.replace(new RegExp('(^|[^\\wÀ-ú])' + esc(e.frag) + '(?=$|[^\\wÀ-ú])', 'u'), (a, p) => p + (e.frag[0] === e.frag[0].toUpperCase() && e.frag[0] !== e.frag[0].toLowerCase() ? e.fix[0].toUpperCase() + e.fix.slice(1) : e.fix));
    const miss = Object.fromEntries(res.reqs.map(r => [r.id, r.got]));
    const add = { nome: 'Mi chiamo [nome].', citta: 'Abito a [cidade].', lavoro: 'Lavoro come [profissão].', gusti: 'Mi piace [atividade].' };
    let body = fix.trim(); if (!miss.saluto) body = 'Ciao Luca! ' + body;
    const extra = ['nome', 'citta', 'lavoro', 'gusti'].filter(k => miss[k] < 1).map(k => add[k]).join(' ');
    if (extra) body = body.replace(/\s*$/, ' ') + extra;
    if (!miss.saluto2) body += ' A presto!';
    res.corrected = body.replace(/\s+/g, ' ').trim();
    return res;
  }

  // ---------- ficha de inscrição ----------
  function gradeForm(v, numWords) {
    const n = x => nrm(x || ''), f = [];
    const nameOk = s => /^[a-zà-úA-ZÀ-Ú' ]{2,}$/.test((s || '').trim());
    const okN = nameOk(v.nome) && nameOk(v.cognome); f.push([okN, 'Nome e cognome', okN ? '' : 'Escreva nome e sobrenome.']);
    const zt = n(v.naz).split(' '), okZ = zt.some(t => NAZ.test(t));
    const zWhy = okZ ? '' : COUNTRY.includes(n(v.naz)) ? 'Aqui vai a nacionalidade (brasiliano/a), não o país.' : 'Ex.: brasiliano / brasiliana.';
    f.push([okZ, 'Nazionalità', zWhy]);
    const e = n(v.eta).replace(/\banni\b/, '').trim().replace(/ /g, ''), nums = (numWords || []).map(x => nrm(x).replace(/ /g, ''));
    const okE = nums.includes(e), eWhy = okE ? '' : /\d/.test(v.eta || '') ? 'Pedido “in lettere”: escreva o número por extenso.' : 'Ex.: quarantadue.';
    f.push([okE, 'Età in lettere', eWhy]);
    const c = n(v.citta), cIsNaz = c.split(' ').some(t => NAZ.test(t)), cIsCountry = COUNTRY.includes(c);
    const okC = nameOk(v.citta) && !cIsNaz && !cIsCountry;
    f.push([okC, 'Città', okC ? '' : cIsNaz ? 'Aqui vai a cidade, não a nacionalidade.' : cIsCountry ? 'Aqui vai a cidade, não o país.' : 'Escreva a cidade.']);
    const okP = n(v.prof).split(' ').some(t => PROF.test(t)); f.push([okP, 'Professione', okP ? '' : 'Ex.: ingegnere, impiegato, studente.']);
    return { rubric: RUBRIC, pts: f.filter(x => x[0]).length * 2, f };
  }

  const api = { RUBRIC, gradeMsg, gradeForm, requirements, errors, nrm };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.PARLA_AV = api;
})(typeof window !== 'undefined' ? window : globalThis);
