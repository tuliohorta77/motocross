// Testes do avaliador da escrita do Teste A1 — rodar com: node --test italiano/tests/
const test = require('node:test'), assert = require('node:assert');
const A = require('../avaliador.js');
const FULL = 'Ciao Luca! Mi chiamo Tulio e sono brasiliano. Abito a Guarulhos, vicino a San Paolo. Lavoro come ingegnere. Mi piace cantare e suonare la fisarmonica con mia moglie. A presto!';
const g = t => A.gradeMsg(t);

test('1. “Io mi chiamo” e “Mi chiamo” valem o mesmo', () => {
  const a = g(FULL), b = g(FULL.replace('Mi chiamo', 'Io mi chiamo'));
  assert.equal(a.total, b.total); assert.deepEqual(a.dims, b.dims);
  assert.ok(b.variations.some(v => v.includes('Io mi chiamo')), 'aparece como variação aceita');
});
test('2. sinônimos aceitos: vivo/abito, amo/mi piace, sono ingegnere/lavoro come', () => {
  const base = g(FULL).dims.tarefa.pts;
  for (const t of [FULL.replace('Abito a', 'Vivo a'), FULL.replace('Mi piace cantare', 'Amo cantare'), FULL.replace('Lavoro come ingegnere', 'Sono ingegnere'), FULL.replace('Lavoro come ingegnere', "Faccio l'ingegnere")]) {
    const r = g(t); assert.equal(r.dims.tarefa.pts, base, t); assert.equal(r.errors.filter(e => e.type === 'gramatical').length, 0, t);
  }
});
test('3. nacionalidade não substitui a cidade; país vale metade', () => {
  const sem = 'Ciao Luca! Mi chiamo Tulio e sono brasiliano. Lavoro come ingegnere in una grande azienda. Mi piace cantare e ballare con gli amici. A presto!';
  const pais = sem.replace('sono brasiliano', 'abito in Brasile');
  const cid = sem.replace('sono brasiliano', 'abito a San Paolo');
  const c = r => r.reqs.find(x => x.id === 'citta').got;
  assert.equal(c(g(sem)), 0); assert.equal(c(g(pais)), .5); assert.equal(c(g(cid)), 1);
  assert.ok(g(sem).total < g(cid).total);
  // ficha: cidade ≠ nacionalidade
  const f = A.gradeForm({ nome: 'Tulio', cognome: 'Horta', naz: 'brasiliano', eta: 'quarantadue', citta: 'brasiliano', prof: 'ingegnere' }, ['quarantadue']);
  assert.equal(f.f.find(x => x[1] === 'Città')[0], false);
});
test('4. erro pequeno: desconto proporcional (uma vez só)', () => {
  const ok = g(FULL), um = g(FULL.replace('Mi piace cantare e suonare la fisarmonica', 'Mi piace i film e la musica'));
  assert.equal(ok.total - um.total, .5);
  const dois = g(FULL.replace('Mi piace cantare', 'Mi piace i film. Mi piace i film. Amo cantare'));
  assert.equal(dois.errors.filter(e => e.type === 'gramatical').length, 1, 'mesmo erro não conta duas vezes');
  const acento = g(FULL.replace('A presto!', 'Ci vediamo in citta. A presto!'));
  assert.equal(acento.dims.gramatica.pts, 2.75);
  assert.equal(acento.errors.find(e => e.type === 'ortográfico').fix, 'città');
});
test('5. mensagem incompleta perde pontos mesmo sem erro de gramática', () => {
  const r = g('Ciao Luca! Mi chiamo Tulio e sono molto contento di scriverti oggi. Spero che tu stia bene. A presto!');
  assert.equal(r.errors.filter(e => e.type === 'gramatical').length, 0);
  assert.ok(r.dims.tarefa.pts <= 2.5, 'faltam cidade, trabalho e gostos'); assert.ok(r.total < 7.5);
});
test('6. mensagem completa e correta tira nota máxima', () => {
  const r = g(FULL); assert.equal(r.total, 10); assert.equal(r.errors.length, 0);
});
test('7. texto em português não pontua', () => {
  const r = g('Olá Luca! Eu me chamo Tulio e moro em Guarulhos. Trabalho como engenheiro e gosto muito de cantar com a minha esposa. Um abraço!');
  assert.equal(r.total, 0); assert.ok(r.errors.some(e => e.type === 'fora do contexto'));
});
test('8. mesma resposta, mesma nota', () => {
  for (const t of [FULL, 'Ciao! Io abita a Roma. Mi piace i gatti. Ciao']) assert.deepEqual(g(t), g(t));
  assert.ok(A.RUBRIC.startsWith('A1-escrita-v'));
});
test('extra: erros classificados e texto corrigido sugerido', () => {
  const r = g('Ciao Luca! Io mi chiamo Tulio. Io abita in Guarulhos con la mia moglie. Lavoro come un ingegnere. Mi piace di cantare. A presto!');
  const tipos = r.errors.filter(e => e.type === 'gramatical').map(e => e.fix);
  for (const f of ['io abito', 'abita a Guarulhos', 'mia moglie', 'come ingegnere', 'mi piace cantare']) assert.ok(tipos.some(x => x.toLowerCase().includes(f.toLowerCase().replace('abita a', 'a'))), f + ' em ' + tipos);
  assert.ok(r.corrected.includes('mia moglie') && r.corrected.includes('come ingegnere'));
  assert.ok(!r.errors.some(e => /io mi chiamo/i.test(e.frag)), 'pronome opcional não é erro');
});
test('extra: nome e cidade em minúscula contam como informação, com desconto pequeno de grafia', () => {
  const r = g('ciao luca! mi chiamo tulio, abito a guarulhos e lavoro come ingegnere. mi piace cantare con mia moglie e i miei amici. a presto!');
  assert.equal(r.dims.tarefa.pts, 5); assert.equal(r.total, 9.75);
});
test('extra: “lavoro come un ingegnere” cumpre a tarefa; o artigo conta só como gramática', () => {
  const r = g(FULL.replace('Lavoro come ingegnere', 'Lavoro come un ingegnere'));
  assert.equal(r.dims.tarefa.pts, 5); assert.equal(r.dims.gramatica.pts, 2.5);
});
