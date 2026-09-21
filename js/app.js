/* Interface: liga os dados/cálculos à página. Estado apenas em memória. */
(function () {
  'use strict';
  const D = window.SolarData;
  const C = window.SolarCalc;
  const T = window.SolarContent;
  const $ = (id) => document.getElementById(id);
  const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const brl2 = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const num = (v, d = 0) => v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const state = {
    hsp: 5.0, pr: 0.75, nPanels: 2, autonomy: 1, dod: 0.9, tMin: -5, roof: 8, chargeA: 20,
    panelKitBRL: D.panel.priceKitBRL, inverterBRL: D.inverter.priceBRL, batteryUnitBRL: D.battery24.priceBRL,
    loads: D.defaultLoads.map((l) => ({ ...l })),
    checks: T.checklist.map(() => false)
  };

  const fields = [
    ['hsp', 'HSP local (kWh/m²/dia)', 0.1, 1, 8],
    ['pr', 'Desempenho global (0–1)', 0.01, 0.4, 1],
    ['nPanels', 'Módulos em série', 1, 1, 8],
    ['autonomy', 'Autonomia sem sol (dias)', 0.5, 0.5, 5],
    ['dod', 'Profundidade de descarga (0–1)', 0.05, 0.5, 1],
    ['tMin', 'Temperatura mínima (°C)', 1, -20, 25],
    ['roof', 'Área útil do teto (m²)', 0.5, 1, 20],
    ['chargeA', 'Carga AC pelo gerador (A, prog. 11)', 1, 2, 80],
    ['panelKitBRL', 'Preço kit 2 módulos (R$)', 50, 0, 100000],
    ['inverterBRL', 'Preço do inversor (R$)', 50, 0, 100000],
    ['batteryUnitBRL', 'Preço bateria 24 V 100 Ah (R$)', 50, 0, 100000]
  ];

  function buildParams() {
    $('params').innerHTML = fields
      .map(([k, label, step, min, max]) =>
        `<div><label for="p_${k}">${label}</label><input id="p_${k}" type="number" step="${step}" min="${min}" max="${max}" value="${state[k]}"></div>`)
      .join('');
    fields.forEach(([k]) => {
      $('p_' + k).addEventListener('input', (e) => {
        const v = parseFloat(e.target.value);
        if (Number.isFinite(v)) { state[k] = v; update(); }
      });
    });
  }

  function buildLoads() {
    const rows = state.loads.map((l, i) =>
      `<tr><td><input type="text" data-i="${i}" data-k="name" value="${esc(l.name)}" aria-label="Nome da carga"></td>
        <td class="n"><input type="number" min="0" step="10" data-i="${i}" data-k="watts" value="${l.watts}" aria-label="Potência (W)"></td>
        <td class="n"><input type="number" min="0" max="24" step="0.25" data-i="${i}" data-k="hoursPerDay" value="${l.hoursPerDay}" aria-label="Horas por dia"></td>
        <td class="n" id="wh_${i}">${num(l.watts * l.hoursPerDay)}</td>
        <td><button class="btn ghost" type="button" data-del="${i}" aria-label="Remover">×</button></td></tr>`).join('');
    $('loadsTable').innerHTML = `<thead><tr><th>Carga</th><th class="n">W</th><th class="n">h/dia</th><th class="n">Wh/dia</th><th></th></tr></thead><tbody>${rows}</tbody>`;
    $('loadsTable').querySelectorAll('input').forEach((el) =>
      el.addEventListener('input', (e) => {
        const { i, k } = e.target.dataset;
        state.loads[i][k] = k === 'name' ? e.target.value : parseFloat(e.target.value) || 0;
        const l = state.loads[i];
        $('wh_' + i).textContent = num(l.watts * l.hoursPerDay);
        update();
      }));
    $('loadsTable').querySelectorAll('[data-del]').forEach((b) =>
      b.addEventListener('click', () => { state.loads.splice(+b.dataset.del, 1); buildLoads(); update(); }));
  }

  function model() {
    const ls = C.loadsSummary(state.loads);
    const panel = { ...D.panel, priceKitBRL: state.panelKitBRL };
    const str = C.stringElectrical(panel, state.nPanels, { tMinC: state.tMin });
    const chk = C.checkMppt(str, D.inverter);
    const pv = C.dailyPvEnergyWh(str, D.inverter, state.hsp, state.pr);
    const bank = C.batterySizing(ls.dailyWh, { autonomyDays: state.autonomy, dod: state.dod, minUnits: 2 });
    const cost = C.costBreakdown({
      nPanels: state.nPanels, nBatteries: bank.units, panelUnitBRL: state.panelKitBRL / D.panel.kitQty,
      inverterBRL: state.inverterBRL, batteryUnitBRL: state.batteryUnitBRL
    });
    const eff = D.inverter.peakEfficiency;
    const pvToLoadsWh = pv.wh * eff * 0.95;
    const deficitWh = Math.max(0, ls.dailyWh - pvToLoadsWh);
    const chargeDcW = state.chargeA * 28.4;
    const genHours = deficitWh > 0 ? deficitWh / eff / 0.95 / chargeDcW : 0;
    const gen = C.generatorSizing(ls.peakW, state.chargeA);
    const prot = C.dcProtection(D.inverter);
    const sweep = C.panelSweep(state.hsp, { roofAreaM2: state.roof, pr: state.pr, tMinC: state.tMin });
    return { ls, str, chk, pv, bank, cost, pvToLoadsWh, deficitWh, genHours, gen, prot, sweep };
  }

  function kpi(v, l, s) { return `<div class="card kpi"><span class="v">${v}</span><span class="l">${l}</span><span class="s">${s || ''}</span></div>`; }

  function update() {
    const m = model();
    const inv = D.inverter;

    // Compatibilidade
    const reasons = [];
    D.batteries.forEach((b) => {
      const r = C.checkBatteryCompat(b, inv);
      if (!r.compatible) reasons.push(`<li><strong>${esc(b.name)}:</strong> ${esc(r.reasons.join(' '))}</li>`);
    });
    $('compatReasons').innerHTML = reasons.join('');

    const warn = [...m.chk.errors.map((e) => 'ERRO: ' + e), ...m.chk.warnings];
    $('mpptWarnings').className = 'alert ' + (m.chk.errors.length ? 'danger' : 'warn');
    $('mpptWarnings').innerHTML = `<strong>Verificação do arranjo PV (${m.str.n}S: ${num(m.str.pStcW)} Wp, Voc ${num(m.str.vocCold, 1)} V a ${state.tMin} °C, Vmp ${num(m.str.vmpStc, 1)} V):</strong><ul>${warn.map((w) => `<li>${esc(w)}</li>`).join('') || '<li>Arranjo dentro dos limites.</li>'}</ul>`;

    // KPIs
    const pvUsable = C.usablePowerW(m.str, inv);
    $('kpis').innerHTML = [
      kpi(num(m.str.pStcW) + ' Wp', `${m.str.n} × 730 W em série`, `Utilizável ≈ ${num(pvUsable)} W (limite 15 A)`),
      kpi(num(m.pv.wh / 1000, 2) + ' kWh/dia', 'Geração FV média', `Perda por clipping ≈ ${num(m.pv.clippingLossPct, 1)}%`),
      kpi(num(m.ls.dailyWh / 1000, 2) + ' kWh/dia', 'Consumo estimado', `Pico simultâneo ≈ ${num(m.ls.peakW)} W de 4.200 W`),
      kpi(num(m.bank.installedKWh, 2) + ' kWh', `Banco 24 V: ${m.bank.units} × 100 Ah`, `Necessário ${num(m.bank.kWhNeeded, 2)} kWh`),
      kpi(brl(m.cost.total), 'Investimento estimado', `${brl(m.cost.total / (m.str.pStcW / 1000))} por kWp`),
      kpi(brl(state.batteryUnitBRL / D.battery24.kWh), 'R$/kWh da bateria 24 V', 'Referência Secpower 48 V: ' + brl(D.batteries[2].priceBRL / D.batteries[2].kWh))
    ].join('');

    // BOM
    const rows = [
      ['Inversor/carregador híbrido 4,2 kVA 24 V', 1, state.inverterBRL, 'est'],
      [`Módulo ZNShine ZXN8-BD132 730 W (kit de ${D.panel.kitQty})`, m.str.n, state.panelKitBRL / D.panel.kitQty, 'est'],
      ['Bateria LiFePO4 24 V (25,6 V) 100 Ah com BMS', m.bank.units, state.batteryUnitBRL, 'est'],
      ...D.accessories.map((a) => [a.name, a.qty, a.priceBRL, 'est'])
    ];
    $('bomTable').innerHTML = `<thead><tr><th>Item</th><th class="n">Qtd.</th><th class="n">Unitário</th><th class="n">Total</th><th>Preço</th></tr></thead><tbody>${rows
      .map((r) => `<tr><td>${esc(r[0])}</td><td class="n">${r[1]}</td><td class="n">${brl(r[2])}</td><td class="n">${brl(r[1] * r[2])}</td><td><span class="tag est">estimativa</span></td></tr>`).join('')}
      <tr><th colspan="3">Total</th><th class="n">${brl(rows.reduce((s, r) => s + r[1] * r[2], 0))}</th><th></th></tr></tbody>`;

    // Balanço
    const covered = m.ls.dailyWh > 0 ? Math.min(100, (m.pvToLoadsWh / m.ls.dailyWh) * 100) : 100;
    const autonomyDays = m.ls.dailyWh > 0 ? (m.bank.installedKWh * 1000 * state.dod * inv.peakEfficiency) / m.ls.dailyWh : 0;
    $('balance').innerHTML = [
      kpi(num(m.pvToLoadsWh / 1000, 2) + ' kWh', 'FV entregue às cargas (AC)', 'Após eficiência 94% e ciclo da bateria 95%'),
      kpi(num(covered, 0) + '%', 'Cobertura solar do consumo', m.deficitWh > 0 ? `Déficit ${num(m.deficitWh / 1000, 2)} kWh/dia` : 'Sobra energia'),
      kpi(num(m.genHours, 1) + ' h/dia', 'Gerador para fechar o déficit', `A ${state.chargeA} A de carga (≈ ${num(m.gen.chargeAcW)} W AC)`),
      kpi(num(autonomyDays, 1) + ' dias', 'Autonomia sem sol nem gerador', `${num(m.bank.installedKWh, 2)} kWh × DoD ${state.dod}`)
    ].join('');

    // Sweep
    const best = C.bestPanelCount(m.sweep, m.ls.dailyWh);
    $('sweepTable').innerHTML = `<thead><tr><th class="n">Módulos</th><th class="n">Voc a frio</th><th class="n">Potência utilizável</th><th class="n">Energia/dia</th><th class="n">Custo módulos</th><th class="n">R$ por kWh/dia</th><th class="n">Peso</th><th>Situação</th></tr></thead><tbody>${m.sweep
      .map((r) => {
        const status = !r.valid ? '<span class="tag no">inválido (MPPT/Voc)</span>' : !r.fitsRoof ? '<span class="tag no">não cabe no teto</span>' : best && best.n === r.n ? '<span class="tag ok">recomendado</span>' : '<span class="tag ok">válido</span>';
        return `<tr class="${best && best.n === r.n ? 'best' : !r.valid || !r.fitsRoof ? 'bad' : ''}"><td class="n">${r.n}</td><td class="n">${num(r.vocCold, 0)} V</td><td class="n">${num(r.usableW)} W</td><td class="n">${num(r.dailyWh / 1000, 2)} kWh</td><td class="n">${brl(r.costBRL)}</td><td class="n">${isFinite(r.brlPerDailyKWh) ? brl(r.brlPerDailyKWh) : '–'}</td><td class="n">${num(r.weightKg, 0)} kg</td><td>${status}</td></tr>`;
      }).join('')}</tbody>`;

    // Gerador
    $('genOut').innerHTML = `<table><tbody>
      <tr><td>Cargas AC simultâneas (pico)</td><td class="n">${num(m.ls.peakW)} W</td></tr>
      <tr><td>Carregador a ${state.chargeA} A (28,4 V, η 90%)</td><td class="n">${num(m.gen.chargeAcW)} W</td></tr>
      <tr><td>Potência total do gerador</td><td class="n">${num(m.gen.totalW)} W</td></tr>
      <tr><td><strong>Gerador mínimo (FP 0,8, margem 20%)</strong></td><td class="n"><strong>${num(m.gen.kVA / 1000, 1)} kVA</strong></td></tr>
      <tr><td>Corrente de entrada a 220 V</td><td class="n">${num(m.gen.inputCurrentA, 1)} A</td></tr>
      <tr><td>Disjuntor de entrada sugerido</td><td class="n">${m.gen.breakerA} A (máx. 32–40 A pelo cabo 6 mm²)</td></tr></tbody></table>
      <p style="color:var(--muted);font-size:13px;margin-bottom:0">Se o gerador for menor, reduza o programa 11 ou desligue cargas grandes enquanto ele carrega.</p>`;

    // Baterias
    $('batTable').innerHTML = `<thead><tr><th>Bateria</th><th class="n">Tensão</th><th class="n">kWh</th><th class="n">Preço</th><th class="n">R$/kWh</th><th>Inversor 24 V</th></tr></thead><tbody>${[...D.batteries, { ...D.battery24, priceBRL: state.batteryUnitBRL, name: D.battery24.name + ' ×2 (banco)' }]
      .map((b) => {
        const r = C.checkBatteryCompat(b, inv);
        return `<tr class="${r.compatible ? 'best' : 'bad'}"><td>${esc(b.name)}</td><td class="n">${num(b.nominalV, 1)} V</td><td class="n">${num(b.kWh, 2)}</td><td class="n">${brl2(b.priceBRL)}</td><td class="n">${brl(b.priceBRL / b.kWh)}</td><td>${r.compatible ? '<span class="tag ok">compatível</span>' : '<span class="tag no">incompatível</span>'}</td></tr>`;
      }).join('')}</tbody>`;
  }

  function buildStatic() {
    $('cfgTable').innerHTML = `<thead><tr><th>Prog.</th><th>Função</th><th>Ajuste</th><th>Motivo</th></tr></thead><tbody>${T.config.map((c) => `<tr><td><code>${c.prog}</code></td><td>${esc(c.name)}</td><td><strong>${esc(c.value)}</strong></td><td>${esc(c.why)}</td></tr>`).join('')}</tbody>`;
    const label = { high: 'Alto', mid: 'Médio', low: 'Baixo' };
    $('riskTable').innerHTML = `<thead><tr><th>Severidade</th><th>Risco</th><th>Mitigação</th></tr></thead><tbody>${T.risks.map((r) => `<tr><td><span class="sev ${r.sev}">${label[r.sev]}</span></td><td>${esc(r.risk)}</td><td>${esc(r.mitigation)}</td></tr>`).join('')}</tbody>`;
    $('tips').innerHTML = T.tips.map((t) => `<li>${esc(t)}</li>`).join('');
    $('checkList').innerHTML = T.checklist.map((t, i) => `<li><label><input type="checkbox" data-c="${i}"> <span>${esc(t)}</span></label></li>`).join('');
    $('checkList').addEventListener('change', (e) => {
      const i = e.target.dataset.c;
      if (i === undefined) return;
      state.checks[i] = e.target.checked;
      const done = state.checks.filter(Boolean).length;
      $('progBar').style.width = (done / state.checks.length) * 100 + '%';
      $('progTxt').textContent = `${done} de ${state.checks.length} etapas concluídas`;
    });
    $('progTxt').textContent = `0 de ${state.checks.length} etapas concluídas`;
    $('addLoad').addEventListener('click', () => { state.loads.push({ name: 'Nova carga', watts: 100, hoursPerDay: 1 }); buildLoads(); update(); });
    $('themeBtn').addEventListener('click', () => {
      const cur = document.documentElement.dataset.theme;
      const dark = cur ? cur === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.dataset.theme = dark ? 'light' : 'dark';
    });
  }

  buildStatic();
  buildParams();
  buildLoads();
  update();
})();
