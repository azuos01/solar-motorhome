'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const D = require('../src/equipment.js');
const C = require('../src/calc.js');

const near = (a, b, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `${a} !≈ ${b} (±${tol})`);

test('dados: baterias conferem com a captura da Belenus', () => {
  const byCode = Object.fromEntries(D.batteries.map((b) => [b.code, b]));
  assert.equal(byCode['BATBE-48V-5KWH'].priceBRL, 5425.81);
  assert.equal(byCode['BATDE-51V-5.1KWH-BT'].priceBRL, 5754.67);
  assert.equal(byCode['BATSP-51V-5.12KWH-BT'].priceBRL, 5425.81);
  assert.equal(D.batteries.length, 3);
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

test('compatibilidade: baterias 48/51,2 V são REPROVADAS no inversor 24 V', () => {
  for (const b of D.batteries) {
    const r = C.checkBatteryCompat(b, D.inverter);
    assert.equal(r.compatible, false, b.name);
    assert.ok(r.reasons.length >= 1);
  }
});

test('compatibilidade: banco 24 V de referência é aprovado', () => {
  assert.equal(C.checkBatteryCompat(D.battery24, D.inverter).compatible, true);
});

test('dimensionamento de banco: arredonda unidades para cima', () => {
  const r = C.batterySizing(2600, { autonomyDays: 1, dod: 0.9 });
  near(r.kWhNeeded, 2.6 / (0.9 * 0.94), 0.001);
  assert.equal(r.units, 2);
  assert.equal(r.installedKWh, 5.12);
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
  const c = C.costBreakdown({ nPanels: 2, nBatteries: 2 });
  near(c.total, c.panels + c.inverter + c.batteries + c.accessories);
  const semShunt = C.costBreakdown({ nPanels: 2, nBatteries: 2, withShunt: false });
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
  assert.equal(C.batterySizing(6000, { minUnits: 2 }).units, 3);
});
