'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const T = require('../js/content.js');

test('index.html referencia scripts e CSS existentes', () => {
  const refs = [...html.matchAll(/(?:src|href)="((?:src|js|css)\/[^"]+)"/g)].map((m) => m[1]);
  assert.ok(refs.length >= 5);
  for (const r of refs) assert.ok(fs.existsSync(path.join(root, r)), `arquivo ausente: ${r}`);
});

test('todos os ids usados por app.js existem no HTML ou são gerados', () => {
  const used = new Set([...app.matchAll(/\$\('([A-Za-z_]+)'\)/g)].map((m) => m[1]));
  const generated = /^(wh_|p_)/;
  for (const id of used) {
    if (generated.test(id)) continue;
    assert.ok(html.includes(`id="${id}"`), `id ausente no HTML: ${id}`);
  }
});

test('esquema elétrico contém os componentes de segurança e o gerador', () => {
  const svg = html.slice(html.indexOf('<svg'), html.indexOf('</svg>'));
  for (const s of ['GERADOR', 'CHAVE REVERSORA', 'T 200 A', 'Disj. DC 2P', 'DPS DC', 'Shunt', 'BARRAMENTO PE', 'QDC AC', 'IDR 30 mA', 'INVERSOR', 'INOHOUSE', 'GELADEIRA 24 V', 'Fusível 10 A']) {
    assert.ok(svg.includes(s), `faltando no esquema: ${s}`);
  }
  assert.match(svg, /<title id="dt">/);
});

test('seções esperadas presentes', () => {
  for (const id of ['sintese', 'alerta', 'resumo', 'calc', 'baterias', 'carga', 'bifacial', 'geladeira', 'esquema', 'gerador', 'config', 'riscos', 'especialista', 'checklist', 'fontes', 'aviso']) {
    assert.ok(html.includes(`id="${id}"`), id);
  }
});

test('sem armazenamento no navegador e sem recursos externos', () => {
  assert.doesNotMatch(app, /localStorage|sessionStorage/);
  assert.doesNotMatch(html, /src="https?:/);
});

test('conteúdo: risco crítico 24/48 V e Isc; programas essenciais do inversor', () => {
  assert.ok(T.risks.some((r) => r.sev === 'high' && /100 A/.test(r.risk)));
  assert.ok(T.risks.some((r) => r.sev === 'high' && /Geladeira 24 V/.test(r.risk)));
  assert.ok(T.risks.some((r) => /Isc/.test(r.risk)));
  const progs = T.config.map((c) => c.prog);
  for (const p of ['01', '03', '05', '08', '09', '11', '12', '26', '27', '29']) assert.ok(progs.includes(p), p);
  assert.equal(T.config.find((c) => c.prog === '03').value, 'GEN');
  assert.equal(T.config.find((c) => c.prog === '05').value, 'LIb');
});

test('regras do manual: prog. 12 ≥ prog. 29 + 1 V', () => {
  const v = (p) => parseFloat(T.config.find((c) => c.prog === p).value.replace(',', '.'));
  assert.ok(v('12') >= v('29') + 1);
  assert.ok(v('26') <= 29.2 - 0.5);
});

test('v2: sem opções Belenus no conteúdo dinâmico e nas seções; bateria Inohouse citada', () => {
  assert.doesNotMatch(app, /Belenus|Secpower|D\.batteries|battery24/);
  assert.match(html, /Inohouse/);
  assert.doesNotMatch(html, /Secpower/);
});

test('v2: síntese com Contexto, Objetivo, Método, Resultados e Conclusão', () => {
  const sec = html.slice(html.indexOf('id="sintese"'), html.indexOf('id="alerta"'));
  for (const h of ['1. Contexto', '2. Objetivo', '3. Método', '4. Resultados', '5. Conclusão']) assert.ok(sec.includes(h), h);
});

test('v2: aviso de IA (nome e modelo), supervisão, consultoria teórica e isenção', () => {
  const sec = html.slice(html.indexOf('id="aviso"'));
  for (const t of ['Claude', 'Anthropic', 'claude-sonnet-5', 'Soluções Solares Ltda', 'consultoria teórica', 'não se responsabiliza', 'terceiros']) {
    assert.ok(sec.includes(t), t);
  }
  assert.match(html, /<footer>[\s\S]*Soluções Solares Ltda[\s\S]*<\/footer>/);
});

test('v2: fontes citam manual, Inohouse, NeoSolar, Belenus e normas', () => {
  const sec = html.slice(html.indexOf('id="fontes"'), html.indexOf('id="aviso"'));
  for (const t of ['InversorHibrido.pdf', 'lojainohouse.com.br', 'neosolar.com.br', 'belenus.com.br', 'NBR 5410', 'NBR 16690', 'NBR 16612', 'NR-10', '14.300', 'CRESESB', 'Greener']) {
    assert.ok(sec.includes(t), t);
  }
});

test('v2: pontos de especialista e respostas às 3 perguntas presentes', () => {
  assert.ok(T.expert.length >= 10);
  assert.ok(T.expert.some((e) => /NBR 16690/.test(e.title)));
  assert.ok(T.expert.every((e) => e.title && e.text.length > 40));
  assert.match(html, /não tem saída DC/);
  assert.match(html, /Rendimento real com módulos bifaciais/);
  assert.match(html, /tempo de carga/);
});
