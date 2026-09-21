'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const D = require('../src/equipment.js');
const C = require('../src/calc.js');

const near = (a, b, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `${a} !≈ ${b} (±${tol})`);

test('dados: bateria Inohouse conforme a página do produto', () => {
  const b = D.battery;
  assert.equal(b.nominalV, 25.6);
  assert.equal(b.capacityAh, 314);
  assert.equal(b.kWh, 8.03);
  assert.equal(b.maxChargeA, 100);
  assert.equal(b.maxDischargeA, 100);
  assert.equal(b.priceRegularBRL, 8699.99);
  assert.equal(b.priceCashBRL, 8499.99);
  assert.equal(b.pricePixBRL, 8074.99);
  near(b.nominalV * b.capacityAh / 1000, b.kWh, 0.01);
  assert.equal(D.batteries, undefined, 'opções Belenus 48 V removidas');
});

test('dados: inversor conforme manual (24 V, 500 V, 15 A, 4,2 kW)', () => {
  assert.equal(D.inverter.dcNominalV, 24);
  assert.equal(D.inverter.pv.vocMax, 500);
  assert.equal(D.inverter.pv.mpptMin, 60);
  assert.equal(D.inverter.pv.imax, 15);
  assert.equal(D.inverter.ratedW, 4200);
  assert.equal(D.inverter.dcOverchargeV, 32);
});

test('string: 2 módulos em série', () => {
  const s = C.stringElectrical(D.panel, 2);
  near(s.vocStc, 99.0);
  near(s.vmpStc, 83.4);
  assert.ok(s.vocCold > s.vocStc, 'Voc a frio deve ser maior que STC');
  assert.ok(s.vmpHot < s.vmpStc, 'Vmp a quente deve ser menor que STC');
  assert.equal(s.pStcW, 1460);
});

test('MPPT: 1 módulo viola o mínimo de 60 V; 2 é válido', () => {
  assert.equal(C.checkMppt(C.stringElectrical(D.panel, 1), D.inverter).ok, false);
  assert.equal(C.checkMppt(C.stringElectrical(D.panel, 2), D.inverter).ok, true);
});

test('MPPT: 10 módulos estouram Voc máximo de 500 V', () => {
  const r = C.checkMppt(C.stringElectrical(D.panel, 10), D.inverter);
  assert.equal(r.ok, false);
  assert.match(r.errors.join(' '), /excede/);
});

test('MPPT: avisa Isc > 15 A e clipping por Imp > 15 A', () => {
  const r = C.checkMppt(C.stringElectrical(D.panel, 2), D.inverter);
  assert.ok(r.warnings.some((w) => /Isc/.test(w)));
  assert.ok(r.warnings.some((w) => /clipping/.test(w)));
});

test('potência utilizável = Vmp × 15 A', () => {
  const s = C.stringElectrical(D.panel, 2);
  near(C.usablePowerW(s, D.inverter), 83.4 * 15, 0.01);
});

test('energia PV: cresce com HSP e não excede a energia sem clipping', () => {
  const s = C.stringElectrical(D.panel, 2);
  const a = C.dailyPvEnergyWh(s, D.inverter, 4);
  const b = C.dailyPvEnergyWh(s, D.inverter, 5);
  assert.ok(a.wh > 0);
  assert.ok(b.wh > a.wh);
  assert.ok(b.wh <= b.whUnclipped);
  assert.ok(b.clippingLossPct >= 0 && b.clippingLossPct < 5, 'perda pequena em teto plano');
});

test('energia PV: dia muito claro (pico 1100 W/m²) gera clipping mensurável', () => {
  const s = C.stringElectrical(D.panel, 2);
  const r = C.dailyPvEnergyWh(s, D.inverter, 6.5, 0.8, { gpkClear: 1100 });
  assert.ok(r.clippingLossPct > 0.5, `perda=${r.clippingLossPct}`);
});

test('energia PV: sem clipping quando corrente < 15 A (painel 550 W de referência do manual)', () => {
  const p550 = { ...D.panel, imp: 12.95, isc: 13.7, vmp: 42.48, voc: 50.32, pmax: 550 };
  const s = C.stringElectrical(p550, 2);
  assert.equal(C.dailyPvEnergyWh(s, D.inverter, 5).clippingLossPct, 0);
});

test('cargas: consumo diário e pico', () => {
  const r = C.loadsSummary([
    { name: 'a', watts: 100, hoursPerDay: 10 },
    { name: 'b', watts: 1000, hoursPerDay: 0.5 },
    { name: 'off', watts: 800, hoursPerDay: 0 }
  ]);
  assert.equal(r.dailyWh, 1500);
  assert.equal(r.connectedW, 1100);
  near(r.peakW, 880);
});

test('compatibilidade: bateria Inohouse 24 V é aprovada; 48 V seria reprovada', () => {
  assert.equal(C.checkBatteryCompat(D.battery, D.inverter).compatible, true);
  const r = C.checkBatteryCompat({ nominalV: 51.2 }, D.inverter);
  assert.equal(r.compatible, false);
  assert.ok(r.reasons.length >= 1);
});

test('dimensionamento de banco: arredonda unidades para cima', () => {
  const r = C.batterySizing(2600, { autonomyDays: 1, dod: 0.9, unitKWh: 2.56 });
  near(r.kWhNeeded, 2.6 / (0.9 * 0.94), 0.001);
  assert.equal(r.units, 2);
  assert.equal(r.installedKWh, 5.12);
  const b = C.batterySizing(2600);
  assert.equal(b.units, 1);
  assert.equal(b.installedKWh, 8.03);
});

test('dimensionamento: consumo exatamente igual a uma unidade não sobra unidade', () => {
  const r = C.batterySizing(2560 * 0.9 * 0.94, { unitKWh: 2.56 });
  assert.equal(r.units, 1);
});

test('proteção DC: corrente contínua ~175 A exige fusível ≥ 200 A e cabo ≥ 50 mm²', () => {
  const p = C.dcProtection(D.inverter, 25.6);
  near(p.iContA, 4200 / (25.6 * 0.94), 0.01);
  assert.ok(p.iContA > 137, 'excede os 137 A citados no manual');
  assert.equal(p.fuseA, 200);
  assert.equal(p.cableMm2, 50);
});

test('gerador: cargas + carregador, kVA com margem', () => {
  const g = C.generatorSizing(2000, 20);
  near(g.chargeAcW, (20 * 28.4) / 0.9, 0.01);
  near(g.kVA, ((2000 + g.chargeAcW) / 0.8) * 1.2, 0.01);
  assert.ok(g.breakerA <= 40, 'limitado pelo cabo 10 AWG');
});

test('custos: soma dos itens e preço unitário do kit', () => {
  near(C.panelUnitPrice(D.panel), D.panel.priceKitBRL / 2);
  const c = C.costBreakdown({ nPanels: 2, nBatteries: 1 });
  near(c.total, c.panels + c.inverter + c.batteries + c.accessories);
  const semShunt = C.costBreakdown({ nPanels: 2, nBatteries: 1, withShunt: false });
  near(c.total - semShunt.total, 450);
});

test('sweep: n=1 inválido; energia cresce com n; respeita área de teto', () => {
  const rows = C.panelSweep(5, { roofAreaM2: 8 });
  assert.equal(rows[0].valid, false);
  assert.ok(rows[2].dailyWh > rows[1].dailyWh);
  assert.equal(rows.find((r) => r.n === 2).fitsRoof, true);
  assert.equal(rows.find((r) => r.n === 3).fitsRoof, false);
});

test('melhor nº de módulos: o menor que atende a meta, senão o maior que cabe', () => {
  const rows = C.panelSweep(5, { roofAreaM2: 8 });
  assert.equal(C.bestPanelCount(rows, 1000).n, 2);
  assert.equal(C.bestPanelCount(rows, 999999).n, 2); // só 2 cabem
  assert.equal(C.bestPanelCount(C.panelSweep(5, { roofAreaM2: 1 }), 100), null);
});

test('banco: minUnits força 2 baterias para sustentar a corrente do inversor', () => {
  assert.equal(C.batterySizing(1000, { minUnits: 2 }).units, 2);
  assert.equal(C.batterySizing(1000).units, 1);
  assert.equal(C.batterySizing(9000, { minUnits: 2 }).units, 2);
});

/* ---------- v2 ---------- */
const str2 = () => C.stringElectrical(D.panel, 2);

test('bateria única: 100 A de descarga limitam o inversor a ≈ 2,4 kW CA', () => {
  const m = C.maxAcFromBattery(D.battery, 1);
  near(m.acWNominal, 100 * 25.6 * 0.94, 0.5);
  assert.equal(m.limitsInverter, true);
  assert.ok(m.acWNominal < D.inverter.ratedW);
  assert.equal(C.maxAcFromBattery(D.battery, 2).acWNominal, D.inverter.ratedW);
});

test('corrente de carga com 2 módulos fica bem abaixo do limite de 100 A do BMS', () => {
  const a = C.pvChargeCurrentA(C.usablePowerW(str2(), D.inverter));
  assert.ok(a > 35 && a < 50, `corrente=${a}`);
  assert.ok(a < D.battery.maxChargeA);
});

test('rendimento real: PR entre 0,65 e 0,80 e sem ganho traseiro no teto', () => {
  const r = C.realYield(str2(), D.inverter, 5);
  assert.ok(r.pr > 0.65 && r.pr < 0.8, `pr=${r.pr}`);
  assert.equal(r.rearGainPct, 0);
  assert.ok(r.wh < 1460 * 5);
  const nomStep = r.steps[0];
  assert.equal(nomStep.wh, 7300);
  for (let i = 1; i < r.steps.length; i++) assert.ok(r.steps[i].wh <= r.steps[i - 1].wh + 1e-9);
});

test('bifacial: ganho traseiro cresce de teto (0%) para solo e nunca reduz a geração frontal', () => {
  const sc = C.bifacialScenarios(5, str2(), D.inverter);
  assert.equal(sc[0].gainPct, 0);
  assert.ok(sc[0].wh < sc[1].wh && sc[1].wh < sc[2].wh);
  const base = C.realYield(str2(), D.inverter, 5).wh;
  near(sc[0].wh, base, 0.001);
});

test('carga: sem consumo, ≈ 1,4 dia para 10% → 100%; com consumo padrão, > 2 dias', () => {
  const pv = C.realYield(str2(), D.inverter, 5).wh;
  const free = C.chargeSimulation(D.battery, { pvDailyWh: pv, loadDailyWh: 0 });
  assert.ok(free.fractionalDays > 1.2 && free.fractionalDays < 1.7, `dias=${free.fractionalDays}`);
  assert.equal(free.daysToTarget, 2);
  const loaded = C.chargeSimulation(D.battery, { pvDailyWh: pv, loadDailyWh: 2050 });
  assert.ok(loaded.fractionalDays > 2 && loaded.fractionalDays < 3.2);
  assert.equal(loaded.selfSustaining, true);
});

test('carga: consumo maior que a geração nunca atinge a meta e não passa de 0%', () => {
  const r = C.chargeSimulation(D.battery, { pvDailyWh: 1000, loadDailyWh: 4000, soc0: 0.5, maxDays: 10 });
  assert.equal(r.selfSustaining, false);
  assert.equal(r.daysToTarget, null);
  assert.equal(r.series[r.series.length - 1].soc, 0);
});

test('carga: sequência de tempo nublado atrasa a carga completa', () => {
  const pv = C.realYield(str2(), D.inverter, 5).wh;
  const sunny = C.chargeSimulation(D.battery, { pvDailyWh: pv, loadDailyWh: 2050 });
  const mixed = C.chargeSimulation(D.battery, { pvDailyWh: pv, loadDailyWh: 2050, weather: [1, 0.3, 0.3] });
  assert.ok(mixed.daysToTarget > sunny.daysToTarget);
});

test('carga por gerador: corrente limitada pelo BMS e tempo coerente', () => {
  const a = C.chargeHoursAtCurrent(D.battery, 60, 0.1, 1);
  near(a.hours, (0.9 * 314) / 60 * 1.05, 0.01);
  const b = C.chargeHoursAtCurrent(D.battery, 150, 0.1, 1);
  assert.equal(b.currentA, 100);
  assert.equal(b.limitedByBms, true);
});

test('geladeira 24 V no barramento DC: faixa 9,6–31,5 V ok; máx. 28 V é reprovada', () => {
  const ok = C.dcFridgeCheck({ vMin: 9.6, vMax: 31.5, watts: 50 }, D.battery, D.inverter);
  assert.equal(ok.compatible, true);
  assert.equal(ok.lowVoltageDisconnectNeeded, true);
  assert.ok(ok.fuseA <= 15);
  const bad = C.dcFridgeCheck({ vMin: 20, vMax: 28, watts: 50 }, D.battery, D.inverter);
  assert.equal(bad.compatible, false);
  assert.equal(bad.issues[0].sev, 'high');
});

test('síntese: números citados na página conferem com o modelo (premissas padrão)', () => {
  const s = str2();
  const ry = C.realYield(s, D.inverter, 5);
  near(ry.wh / 1000, 5.3, 0.06); // ≈ 5,3 kWh/dia
  near(ry.pr, 0.72, 0.01);
  near(ry.kWhPerKwpDay, 3.6, 0.05);
  near(C.usablePowerW(s, D.inverter), 1250, 1);
  const free = C.chargeSimulation(D.battery, { pvDailyWh: ry.wh, loadDailyWh: 0 });
  near(free.fractionalDays, 1.4, 0.1);
  const loaded = C.chargeSimulation(D.battery, { pvDailyWh: ry.wh, loadDailyWh: 2050 });
  near(loaded.fractionalDays, 2.5, 0.1);
  near(C.pvChargeCurrentA(C.usablePowerW(s, D.inverter)), 41, 6);
  near(C.maxAcFromBattery(D.battery, 1).acWNominal, 2400, 20);
  near(C.chargeHoursAtCurrent(D.battery, 60).hours, 4.9, 0.1);
  near(C.chargeHoursAtCurrent(D.battery, 20).hours, 14.8, 0.1);
  const loads = C.loadsSummary(D.defaultLoads);
  assert.equal(loads.dailyWh, 2050);
  const cost = C.costBreakdown({ nPanels: 2, nBatteries: 1 });
  near(cost.total, 16870, 1);
  const aut = (D.battery.kWh * 0.9 * 0.94) / (loads.dailyWh / 1000);
  near(aut, 3.3, 0.1);
});

test('inverno (HSP 3): geração ≈ 3,2 kWh e ≈ 8 dias para carga completa com as cargas padrão', () => {
  const ry = C.realYield(str2(), D.inverter, 3);
  near(ry.wh / 1000, 3.2, 0.1);
  near(C.chargeSimulation(D.battery, { pvDailyWh: ry.wh, loadDailyWh: 2050 }).fractionalDays, 8.2, 0.3);
});
