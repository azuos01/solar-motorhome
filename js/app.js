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
    hsp: 5.0, nPanels: 2, autonomy: 1, dod: 0.9, tMin: -5, roof: 8, chargeA: 20, nBatteries: 1, soc0: 0.1, fr_w: 50, fr_vmin: 9.6, fr_vmax: 31.5,
    panelKitBRL: D.panel.priceKitBRL, inverterBRL: D.inverter.priceBRL, batteryUnitBRL: D.battery.priceBRL,
    loads: D.defaultLoads.map((l) => ({ ...l })),
    checks: T.checklist.map(() => false)
  };

  const fields = [
    ['hsp', 'HSP local (kWh/m²/dia)', 0.1, 1, 8],
    ['nPanels', 'Módulos em série', 1, 1, 8],
    ['autonomy', 'Autonomia sem sol (dias)', 0.5, 0.5, 5],
    ['dod', 'Profundidade de descarga (0–1)', 0.05, 0.5, 1],
    ['tMin', 'Temperatura mínima (°C)', 1, -20, 25],
    ['roof', 'Área útil do teto (m²)', 0.5, 1, 20],
    ['chargeA', 'Carga AC pelo gerador (A, prog. 11)', 1, 2, 80],
    ['panelKitBRL', 'Preço kit 2 módulos (R$)', 50, 0, 100000],
    ['inverterBRL', 'Preço do inversor (R$)', 50, 0, 100000],
    ['batteryUnitBRL', 'Preço bateria 24 V 314 Ah (R$)', 50, 0, 100000],
    ['nBatteries', 'Baterias em paralelo', 1, 1, 4],
    ['soc0', 'Estado de carga inicial (0–1)', 0.05, 0, 0.95]
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
    const ry = C.realYield(str, D.inverter, state.hsp);
    const pv = { ...C.dailyPvEnergyWh(str, D.inverter, state.hsp, ry.pr), wh: ry.wh };
    const bank = C.batterySizing(ls.dailyWh, { autonomyDays: state.autonomy, dod: state.dod, minUnits: state.nBatteries });
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
    const sweep = C.panelSweep(state.hsp, { roofAreaM2: state.roof, pr: ry.pr, tMinC: state.tMin });
    const bif = C.bifacialScenarios(state.hsp, str, D.inverter);
    const lim = C.maxAcFromBattery(D.battery, bank.units);
    const chargeA = C.pvChargeCurrentA(C.usablePowerW(str, D.inverter));
    const sims = [
      ['Dia de sol (HSP informado)', [1]],
      ['Misto: 1 dia de sol, 2 fechados', [1, 0.3, 0.3]]
    ].map(([name, weather]) => ({
      name,
      free: C.chargeSimulation(D.battery, { nBatteries: bank.units, pvDailyWh: ry.wh, loadDailyWh: 0, soc0: state.soc0, weather }),
      loaded: C.chargeSimulation(D.battery, { nBatteries: bank.units, pvDailyWh: ry.wh, loadDailyWh: ls.dailyWh, soc0: state.soc0, weather })
    }));
    return { ls, str, chk, pv, bank, cost, pvToLoadsWh, deficitWh, genHours, gen, prot, sweep, ry, bif, lim, chargeA, sims };
  }

  function kpi(v, l, s) { return `<div class="card kpi"><span class="v">${v}</span><span class="l">${l}</span><span class="s">${s || ''}</span></div>`; }

  function update() {
    const m = model();
    const inv = D.inverter;

    // Compatibilidade
    const cb = C.checkBatteryCompat(D.battery, inv);
    $('compatInfo').innerHTML = cb.compatible
      ? `<strong>Bateria compatível:</strong> ${esc(D.battery.name)} — ${num(D.battery.nominalV, 1)} V nominal, carga até ${num(D.battery.maxChargeV, 1)} V (limite do inversor: ${inv.dcOverchargeV} V). Use prog. 05 = LIb.`
      : `<strong>Bateria incompatível:</strong> ${esc(cb.reasons.join(' '))}`;
    $('compatInfo').className = 'alert ' + (cb.compatible ? 'ok' : 'danger');
    const lim = m.lim;
    $('limitWarn').innerHTML = `<strong>Limite da bateria:</strong> ${m.bank.units} × ${D.battery.maxDischargeA} A de descarga ⇒ ≈ ${num(lim.acWNominal)} W CA contínuos (${num(lim.acWLow)} W com a bateria baixa). Pico simultâneo estimado das cargas: ${num(m.ls.peakW)} W. ${m.ls.peakW > lim.acWLow ? '<strong>Atenção: excede o limite; reduza cargas simultâneas ou use mais baterias.</strong>' : 'Dentro do limite.'}`;

    const warn = [...m.chk.errors.map((e) => 'ERRO: ' + e), ...m.chk.warnings];
    $('mpptWarnings').className = 'alert ' + (m.chk.errors.length ? 'danger' : 'warn');
    $('mpptWarnings').innerHTML = `<strong>Verificação do arranjo PV (${m.str.n}S: ${num(m.str.pStcW)} Wp, Voc ${num(m.str.vocCold, 1)} V a ${state.tMin} °C, Vmp ${num(m.str.vmpStc, 1)} V):</strong><ul>${warn.map((w) => `<li>${esc(w)}</li>`).join('') || '<li>Arranjo dentro dos limites.</li>'}</ul>`;

    // KPIs
    const pvUsable = C.usablePowerW(m.str, inv);
    $('kpis').innerHTML = [
      kpi(num(m.str.pStcW) + ' Wp', `${m.str.n} × 730 W em série`, `Utilizável ≈ ${num(pvUsable)} W (limite 15 A)`),
      kpi(num(m.pv.wh / 1000, 2) + ' kWh/dia', 'Geração FV (desempenho informado)', `Perda por clipping ≈ ${num(m.pv.clippingLossPct, 1)}%`),
      kpi(num(m.ls.dailyWh / 1000, 2) + ' kWh/dia', 'Consumo estimado', `Pico simultâneo ≈ ${num(m.ls.peakW)} W de 4.200 W`),
      kpi(num(m.bank.installedKWh, 2) + ' kWh', `Bateria 24 V: ${m.bank.units} × 314 Ah`, `Necessário ${num(m.bank.kWhNeeded, 2)} kWh`),
      kpi(brl(m.cost.total), 'Investimento estimado', `${brl(m.cost.total / (m.str.pStcW / 1000))} por kWp`),
      kpi(brl(state.batteryUnitBRL / D.battery.kWh), 'R$/kWh da bateria 24 V', `Pix: ${brl2(D.battery.pricePixBRL)} · sem desconto: ${brl2(D.battery.priceRegularBRL)}`)
    ].join('');

    // BOM
    const rows = [
      ['Inversor/carregador híbrido 4,2 kVA 24 V', 1, state.inverterBRL, 'est'],
      [`Módulo ZNShine ZXN8-BD132 730 W (kit de ${D.panel.kitQty})`, m.str.n, state.panelKitBRL / D.panel.kitQty, 'est'],
      [D.battery.name, m.bank.units, state.batteryUnitBRL, 'ok'],
      ...D.accessories.map((a) => [a.name, a.qty, a.priceBRL, 'est'])
    ];
    $('bomTable').innerHTML = `<thead><tr><th>Item</th><th class="n">Qtd.</th><th class="n">Unitário</th><th class="n">Total</th><th>Preço</th></tr></thead><tbody>${rows
      .map((r) => `<tr><td>${esc(r[0])}</td><td class="n">${r[1]}</td><td class="n">${brl(r[2])}</td><td class="n">${brl(r[1] * r[2])}</td><td><span class="tag ${r[3] === 'ok' ? 'ok' : 'est'}">${r[3] === 'ok' ? 'loja' : 'estimativa'}</span></td></tr>`).join('')}
      <tr><th colspan="3">Total</th><th class="n">${brl(rows.reduce((s, r) => s + r[1] * r[2], 0))}</th><th></th></tr></tbody>`;

    // Balanço
    const covered = m.ls.dailyWh > 0 ? Math.min(100, (m.pvToLoadsWh / m.ls.dailyWh) * 100) : 100;
    const autonomyDays = m.ls.dailyWh > 0 ? (m.bank.installedKWh * 1000 * state.dod * inv.peakEfficiency) / m.ls.dailyWh : 0;
    $('balance').innerHTML = [
      kpi(num(m.pvToLoadsWh / 1000, 2) + ' kWh', 'FV entregue às cargas (AC)', 'Após eficiência 94% e ciclo da bateria 95%'),
      kpi(num(covered, 0) + '%', 'Cobertura solar do consumo', m.deficitWh > 0 ? `Déficit ${num(m.deficitWh / 1000, 2)} kWh/dia` : 'Sobra energia'),
      kpi(num(m.genHours, 1) + ' h/dia', 'Gerador para fechar o déficit', `A ${state.chargeA} A de carga (≈ ${num(m.gen.chargeAcW)} W AC)`),
      kpi(num(autonomyDays, 1) + ' dias', 'Autonomia sem sol nem gerador', `${num(m.bank.installedKWh, 2)} kWh × DoD ${num(state.dod, 2)}`)
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

    // Bateria
    const B = D.battery;
    const rowsB = [
      ['Química / configuração', `${B.chemistry}, ${num(B.nominalV, 1)} V nominal`],
      ['Capacidade', `${B.capacityAh} Ah · ${num(B.kWh, 2)} kWh`],
      ['Corrente máx. de carga / descarga', `${B.maxChargeA} A / ${B.maxDischargeA} A`],
      ['BMS', B.bms],
      ['Proteção / peso / dimensões', `${B.ip} · ${B.weightKg} kg · ${B.dimensionsMm.l}×${B.dimensionsMm.w}×${B.dimensionsMm.h} mm`],
      ['Ciclos / garantia / Inmetro', `> ${num(B.cycles)} ciclos · ${B.warrantyYears} anos · ${B.inmetro}`],
      ['Preço (sem desconto / à vista / Pix)', `${brl2(B.priceRegularBRL)} / ${brl2(B.priceCashBRL)} / ${brl2(B.pricePixBRL)}`],
      ['Preço por kWh (à vista)', brl(B.priceCashBRL / B.kWh)],
      ['Não informado na página (assumido)', B.assumed.join('; ')]
    ];
    $('batTable').innerHTML = `<tbody>${rowsB.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</tbody>`;
    $('bankKpis').innerHTML = [
      kpi(num(lim.acWNominal) + ' W', `Potência CA contínua (${m.bank.units} bateria${m.bank.units > 1 ? 's' : ''})`, lim.limitsInverter ? 'Limitada pelo BMS (< 4.200 W)' : 'Limitada pelo inversor'),
      kpi(num((m.bank.installedKWh * state.dod * inv.peakEfficiency) / Math.max(m.ls.dailyWh / 1000, 0.001), 1) + ' dias', 'Autonomia sem sol', `DoD ${num(state.dod, 2)} · consumo ${num(m.ls.dailyWh / 1000, 2)} kWh/dia`),
      kpi(num(m.prot.iContA) + ' A', 'Corrente DC a 4,2 kW', `Bateria(s) fornecem ${num(D.battery.maxDischargeA * m.bank.units)} A`)
    ].join('');

    // Comportamento e tempo de carga (2 módulos)
    const first = m.sims[0];
    const per = (x) => (x.fractionalDays === null ? '—' : num(x.fractionalDays, 1) + ' dias');
    $('chargeKpis').innerHTML = [
      kpi(num(m.chargeA) + ' A', 'Corrente de carga no pico', `≈ ${num(m.chargeA / (D.battery.capacityAh * m.bank.units), 2)} C · limite do BMS ${D.battery.maxChargeA * m.bank.units} A`),
      kpi(num(m.ry.wh / 1000, 2) + ' kWh/dia', 'Energia real dos 2 módulos', `PR ${num(m.ry.pr, 2)} · ${num(m.ry.kWhPerKwpDay, 2)} kWh/kWp/dia`),
      kpi(per(first.free), `${Math.round(state.soc0 * 100)}% → 100% sem consumo`, `${num((m.ry.wh * 0.97) / (m.bank.installedKWh * 1000) * 100, 0)}% da bateria por dia de sol`),
      kpi(per(first.loaded), `${Math.round(state.soc0 * 100)}% → 100% com as cargas`, first.loaded.selfSustaining ? `Saldo ${num(first.loaded.netWhPerDay / 1000, 2)} kWh/dia` : 'Consumo maior que a geração')
    ].join('');
    const socDays = [1, 2, 3, 4, 5, 6];
    $('socTable').innerHTML = `<thead><tr><th>Cenário</th><th>Cargas</th>${socDays.map((d) => `<th class="n">Dia ${d}</th>`).join('')}<th class="n">100% em</th></tr></thead><tbody>${m.sims
      .flatMap((sm) => [['sem consumo', sm.free], ['com cargas', sm.loaded]].map(([lbl, r]) =>
        `<tr><td>${esc(sm.name)}</td><td>${lbl}</td>${socDays.map((d) => `<td class="n">${num(r.series[d - 1].soc * 100, 0)}%</td>`).join('')}<td class="n">${r.daysToTarget === null ? 'não atinge (30 d)' : r.daysToTarget + ' d'}</td></tr>`))
      .join('')}</tbody>`;
    const genRows = [20, 40, 60, 80].map((a) => {
      const h = C.chargeHoursAtCurrent(D.battery, a, state.soc0, 1, m.bank.units);
      const g = C.generatorSizing(0, a);
      return `<tr><td class="n">${a} A</td><td class="n">${num(h.hours, 1)} h</td><td class="n">${num(g.chargeAcW)} W</td><td class="n">${num(g.kVA / 1000, 1)} kVA</td></tr>`;
    }).join('');
    $('genChargeTable').innerHTML = `<thead><tr><th class="n">Corrente de carga</th><th class="n">Tempo até 100%</th><th class="n">Potência CA</th><th class="n">Gerador mín. (sem outras cargas)</th></tr></thead><tbody>${genRows}</tbody>`;

    // Rendimento real
    const nameMap = { temperatura: 'Temperatura da célula (52 °C)', sujeira: 'Sujeira', cabosDescasamento: 'Cabos e descasamento', sombraEUso: 'Sombra e uso (estacionamento, orientação)', baixaIrradiancia: 'Baixa irradiância', mppt: 'Eficiência do MPPT', clipping15A: 'Limite de 15 A (clipping)', 'ganho traseiro': 'Ganho do lado traseiro (teto: 0%)' };
    $('yieldTable').innerHTML = `<thead><tr><th>Etapa</th><th class="n">Fator</th><th class="n">Energia/dia</th></tr></thead><tbody>${m.ry.steps
      .map((st, i) => `<tr><td>${esc(nameMap[st.name] || st.name)}</td><td class="n">${i === 0 ? '—' : num(st.factor, 3)}</td><td class="n">${num(st.wh / 1000, 2)} kWh</td></tr>`).join('')}
      <tr><th>Resultado (PR ${num(m.ry.pr, 2)})</th><th></th><th class="n">${num(m.ry.wh / 1000, 2)} kWh</th></tr></tbody>`;
    $('bifTable').innerHTML = `<thead><tr><th>Instalação</th><th class="n">Ganho</th><th class="n">Energia/dia</th></tr></thead><tbody>${m.bif
      .map((b) => `<tr class="${b.id === 'roof' ? 'best' : ''}"><td>${esc(b.name)}</td><td class="n">+${num(b.gainPct, 1)}%</td><td class="n">${num(b.wh / 1000, 2)} kWh</td></tr>`).join('')}</tbody>`;

    // Geladeira 24 V
    const fr = C.dcFridgeCheck({ vMin: state.fr_vmin, vMax: state.fr_vmax, watts: state.fr_w }, D.battery, inv);
    $('fridgeOut').innerHTML = `<div class="alert ${fr.compatible ? (fr.issues.length ? 'warn' : 'ok') : 'danger'}" style="margin:0"><strong>${fr.compatible ? 'Compatível com a faixa da bateria' : 'INCOMPATÍVEL com a faixa da bateria'}</strong>
      <ul>${fr.issues.map((i) => `<li>${esc(i.text)}</li>`).join('')}
      <li>Corrente média ≈ ${num(fr.avgA, 1)} A; partida ≈ ${num(fr.avgA * 3, 1)} A. Fusível sugerido: <strong>${num(fr.fuseA, fr.fuseA % 1 ? 1 : 0)} A</strong> no barramento, cabo ${num(fr.cableMm2, 1)} mm².</li>
      <li>Corte por subtensão (LVD) recomendado em ≈ 22–23 V (o inversor corta em 22 V; o BMS, em ≈ 20 V).</li></ul></div>`;
  }

  function buildFridge() {
    ['fr_w', 'fr_vmin', 'fr_vmax'].forEach((id) =>
      $(id).addEventListener('input', (e) => {
        const v = parseFloat(e.target.value);
        if (Number.isFinite(v)) { state[id] = v; update(); }
      }));
  }

  function buildStatic() {
    $('expertGrid').innerHTML = T.expert.map((e) => `<div class="card"><h3 style="margin-top:0">${esc(e.title)}</h3><p style="margin-bottom:0">${esc(e.text)}</p></div>`).join('');
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
  buildFridge();
  buildParams();
  buildLoads();
  update();
})();
