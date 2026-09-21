/* Motor de cálculo do projeto. UMD: window.SolarCalc no navegador, require() no Node. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./equipment.js'));
  else root.SolarCalc = factory(root.SolarData);
})(typeof self !== 'undefined' ? self : this, function (D) {
  'use strict';

  const round = (x, d = 2) => Math.round(x * 10 ** d) / 10 ** d;

  /* ---------- Arranjo fotovoltaico ---------- */

  /** Tensões/correntes de uma string com n módulos em série. */
  function stringElectrical(panel, n, opts = {}) {
    const tMin = opts.tMinC ?? -5; // temperatura ambiente mínima (Voc máx.)
    const tHot = opts.tCellHotC ?? 70; // temperatura de célula quente (Vmp mín.)
    return {
      n,
      pStcW: n * panel.pmax,
      vocStc: n * panel.voc,
      vocCold: n * panel.voc * (1 + panel.tcVoc * (tMin - 25)),
      vmpStc: n * panel.vmp,
      vmpHot: n * panel.vmp * (1 + panel.tcVmp * (tHot - 25)),
      iscA: panel.isc,
      impA: panel.imp
    };
  }

  /** Confere a string contra a janela MPPT e limites do inversor. */
  function checkMppt(str, inv) {
    const errors = [];
    const warnings = [];
    if (str.vocCold > inv.pv.vocMax)
      errors.push(`Voc a frio (${round(str.vocCold, 1)} V) excede o máximo do inversor (${inv.pv.vocMax} V).`);
    else if (str.vocCold > inv.pv.vocMax * 0.9)
      warnings.push(`Voc a frio (${round(str.vocCold, 1)} V) está a menos de 10% do limite de ${inv.pv.vocMax} V.`);
    if (str.vmpHot < inv.pv.mpptMin)
      errors.push(`Vmp a quente (${round(str.vmpHot, 1)} V) abaixo do mínimo MPPT (${inv.pv.mpptMin} V).`);
    if (str.vmpStc < inv.pv.mpptMin)
      errors.push(`Vmp STC (${round(str.vmpStc, 1)} V) abaixo do mínimo MPPT (${inv.pv.mpptMin} V).`);
    if (str.iscA > inv.pv.imax)
      warnings.push(
        `Isc do módulo (${str.iscA} A) é maior que a corrente máx. de entrada informada (${inv.pv.imax} A). Confirme com o fabricante se a entrada suporta essa Isc.`
      );
    if (str.impA > inv.pv.imax)
      warnings.push(
        `Imp (${str.impA} A) > ${inv.pv.imax} A: o MPPT limita a corrente e o módulo opera fora do ponto de máxima potência (perda por clipping).`
      );
    if (str.pStcW > inv.pv.ratedW)
      warnings.push(`Potência STC (${str.pStcW} W) acima da potência PV nominal (${inv.pv.ratedW} W).`);
    return { ok: errors.length === 0, errors, warnings };
  }

  /** Potência utilizável conservadora em irradiância plena: Vmp × Imax (limitada à nominal PV). */
  function usablePowerW(str, inv) {
    const current = Math.min(str.impA, inv.pv.imax);
    return Math.min(str.vmpStc * current, inv.pv.ratedW);
  }

  /** Simula um dia senoidal (06h-18h, passo 0,1 h) para um pico de irradiância gpk (W/m²). */
  function simulateDay(str, inv, gpk, vmp) {
    const steps = 120;
    const dt = 12 / steps;
    let used = 0;
    let free = 0;
    for (let i = 0; i < steps; i++) {
      const t = (i + 0.5) * dt;
      const g = gpk * Math.sin((Math.PI * t) / 12);
      const iFree = str.impA * (g / 1000);
      const iUsed = Math.min(iFree, inv.pv.imax);
      free += Math.min(vmp * iFree, inv.pv.ratedW) * dt;
      used += Math.min(vmp * iUsed, inv.pv.ratedW) * dt;
    }
    return { used, free };
  }

  /**
   * Energia diária média gerada. hsp = horas de sol pleno médias (kWh/m²/dia).
   * O dia médio é uma mistura de dias limpos (pico gpkClear, padrão 900 W/m²) e nublados,
   * de modo que a média respeite o HSP informado. pr = desempenho global (fiação, sujeira, sem inclinação...).
   * Cálculo conservador: com corrente limitada o ponto de operação sobe em tensão, então a perda real tende a ser menor.
   */
  function dailyPvEnergyWh(str, inv, hsp, pr = 0.8, opts = {}) {
    const tCell = opts.tCellAvgC ?? 50;
    const vmp = str.vmpStc * (1 + (opts.tcVmp ?? -0.0029) * (tCell - 25));
    const k = 24 / Math.PI; // ∫ sin ao longo de 12 h
    const gpkClear = opts.gpkClear ?? 900;
    const hspClear = (gpkClear * k) / 1000;
    let parts;
    if (hsp >= hspClear) {
      parts = [{ f: 1, gpk: (hsp * 1000) / k }];
    } else {
      let f = opts.clearFraction ?? 0.5;
      let hspCloudy = (hsp - f * hspClear) / (1 - f);
      if (hspCloudy < 0) {
        f = hsp / hspClear;
        hspCloudy = 0;
      }
      parts = [{ f, gpk: gpkClear }, { f: 1 - f, gpk: (hspCloudy * 1000) / k }];
    }
    let used = 0;
    let free = 0;
    for (const p of parts) {
      const r = simulateDay(str, inv, p.gpk, vmp);
      used += p.f * r.used;
      free += p.f * r.free;
    }
    return {
      wh: used * pr,
      whUnclipped: free * pr,
      clippingLossPct: free > 0 ? ((free - used) / free) * 100 : 0
    };
  }

  /* ---------- Cargas e baterias ---------- */

  function loadsSummary(loads, simultaneity = 0.8) {
    const active = loads.filter((l) => l.hoursPerDay > 0 && l.watts > 0);
    const dailyWh = active.reduce((s, l) => s + l.watts * l.hoursPerDay, 0);
    const sumW = active.reduce((s, l) => s + l.watts, 0);
    return { dailyWh, connectedW: sumW, peakW: sumW * simultaneity };
  }

  /** Verifica se a bateria é compatível com o barramento DC do inversor. */
  function checkBatteryCompat(bat, inv) {
    const reasons = [];
    const maxCharge = bat.maxChargeV ?? bat.nominalV * (3.65 / 3.2); // LiFePO4 típico
    const lo = inv.dcNominalV * 0.9;
    const hi = inv.dcNominalV * 1.2;
    if (bat.nominalV < lo || bat.nominalV > hi)
      reasons.push(
        `Tensão nominal ${bat.nominalV} V fora da classe ${inv.dcNominalV} V do inversor (${round(lo, 1)}–${round(hi, 1)} V).`
      );
    if (maxCharge > inv.dcOverchargeV)
      reasons.push(
        `Tensão de carga ≈ ${round(maxCharge, 1)} V ultrapassa a proteção de sobrecarga do inversor (${inv.dcOverchargeV} V): falha 03.`
      );
    return { compatible: reasons.length === 0, reasons };
  }

  /** Capacidade de banco necessária. */
  function batterySizing(dailyWh, opts = {}) {
    const days = opts.autonomyDays ?? 1;
    const dod = opts.dod ?? 0.9;
    const eff = opts.invEff ?? D.inverter.peakEfficiency;
    const kWhNeeded = (dailyWh * days) / (dod * eff) / 1000;
    const unitKWh = opts.unitKWh ?? D.battery.kWh;
    // minUnits: 1 bateria de 100 A limita o inversor a ≈2,4 kW; use 2 se as cargas passarem disso
    const units = Math.max(opts.minUnits ?? 1, Math.ceil(kWhNeeded / unitKWh - 1e-9));
    return { kWhNeeded, units, installedKWh: units * unitKWh };
  }

  /** Corrente DC no barramento para uma potência AC. */
  function dcCurrentA(powerW, vNom = 25.6, eff = D.inverter.peakEfficiency) {
    return powerW / (vNom * eff);
  }

  /** Cabo/proteção DC sugeridos (potência contínua máxima do inversor). */
  function dcProtection(inv, vNom = 25.6) {
    const iCont = dcCurrentA(inv.ratedW, vNom, inv.peakEfficiency);
    const iLow = dcCurrentA(inv.ratedW, inv.lowDcCutoffV[2], inv.peakEfficiency); // pior caso, 19,2 V
    const stdFuse = [100, 125, 150, 175, 200, 250, 300].find((x) => x >= iCont * 1.05) ?? 300;
    const stdMm2 = iCont <= 137 ? 38 : iCont <= 200 ? 50 : 70;
    return { iContA: iCont, iWorstA: iLow, fuseA: stdFuse, cableMm2: stdMm2, manualMaxA: inv.dcCable.manualMaxA };
  }

  /* ---------- Gerador auxiliar ---------- */

  /**
   * Dimensiona o gerador: cargas AC passando pelo bypass + carregador (limitado por programa 11).
   * pf: fator de potência do gerador (0,8), margem: partida de motores/altitude.
   */
  function generatorSizing(acLoadW, chargeA = 20, opts = {}) {
    const vChg = opts.vChargeV ?? 28.4;
    const chgEff = opts.chargerEff ?? 0.9;
    const pf = opts.pf ?? 0.8;
    const margin = opts.margin ?? 1.2;
    const chargeW = (chargeA * vChg) / chgEff;
    const totalW = acLoadW + chargeW;
    const kVA = (totalW / pf) * margin;
    const inV = opts.acV ?? 220;
    return {
      chargeAcW: chargeW,
      totalW,
      kVA,
      inputCurrentA: totalW / inV,
      // AC IN: cabo 10 AWG (~6 mm²) => proteção prática ≤ 40 A
      breakerA: [10, 16, 20, 25, 32, 40].find((x) => x >= (totalW / inV) * 1.25) ?? 40
    };
  }

  /* ---------- Custos e custo-benefício ---------- */

  function panelUnitPrice(panel) {
    return panel.priceKitBRL / panel.kitQty;
  }

  function costBreakdown(cfg) {
    const { inverter, panel, battery, accessories } = D;
    const panels = cfg.nPanels * (cfg.panelUnitBRL ?? panelUnitPrice(panel));
    const inv = cfg.inverterBRL ?? inverter.priceBRL;
    const bat = cfg.nBatteries * (cfg.batteryUnitBRL ?? battery.priceBRL);
    const acc = accessories.reduce((s, a) => s + a.qty * a.priceBRL, 0) - (cfg.withShunt === false ? 450 : 0);
    const total = panels + inv + bat + acc;
    return { panels, inverter: inv, batteries: bat, accessories: acc, total };
  }

  /** Tabela custo-benefício para n = 2..maxPanels módulos em série (n=1 viola janela MPPT). */
  function panelSweep(hsp, opts = {}) {
    const maxN = opts.maxPanels ?? 6;
    const roof = opts.roofAreaM2 ?? Infinity;
    const rows = [];
    for (let n = 1; n <= maxN; n++) {
      const str = stringElectrical(D.panel, n, opts);
      const chk = checkMppt(str, D.inverter);
      const e = dailyPvEnergyWh(str, D.inverter, hsp, opts.pr ?? 0.8);
      const cost = n * panelUnitPrice(D.panel);
      const usable = usablePowerW(str, D.inverter);
      rows.push({
        n,
        valid: chk.ok,
        fitsRoof: n * D.panel.areaM2 * 1.1 <= roof,
        vocCold: str.vocCold,
        usableW: usable,
        dailyWh: e.wh,
        costBRL: cost,
        brlPerDailyKWh: e.wh > 0 ? cost / (e.wh / 1000) : Infinity,
        weightKg: n * D.panel.weightKg
      });
    }
    return rows;
  }

  /** Escolhe o menor nº de módulos válido e que cabe no teto (melhor custo-benefício fixo: cada módulo adicional rende o mesmo). */
  function bestPanelCount(rows, targetDailyWh) {
    const ok = rows.filter((r) => r.valid && r.fitsRoof);
    if (ok.length === 0) return null;
    const meets = ok.find((r) => r.dailyWh >= targetDailyWh);
    return meets || ok[ok.length - 1];
  }

  /* ---------- v2: comportamento com 2 módulos, tempo de carga, rendimento real, geladeira 24 V ---------- */

  /** Potência CA contínua máxima que n baterias sustentam (limite de descarga do BMS). */
  function maxAcFromBattery(bat, n = 1, inv = D.inverter) {
    const iA = n * bat.maxDischargeA;
    const eff = inv.peakEfficiency;
    const atNominal = iA * bat.nominalV * eff;
    const atLow = iA * 24 * eff; // bateria já descarregada (~24 V)
    return { dcA: iA, acWNominal: Math.min(atNominal, inv.ratedW), acWLow: Math.min(atLow, inv.ratedW), limitsInverter: atNominal < inv.ratedW };
  }

  /** Corrente de carga na bateria (A) para uma potência PV, com eficiência do MPPT. */
  function pvChargeCurrentA(pvW, vBat = 27, mpptEff = 0.95) {
    return (pvW * mpptEff) / vBat;
  }

  /**
   * Cascata de perdas do rendimento real. Todos os fatores são premissas editáveis.
   * rearGainPct = ganho do lado traseiro (0 no teto do veículo). O kWp nominal (STC) já é o lado frontal.
   */
  function realYield(str, inv, hsp, opts = {}) {
    const tCell = opts.tCellC ?? 52; // célula em teto sem ventilação traseira
    const tcPmax = opts.tcPmax ?? -0.003; // ASSUMIDO (TOPCon típico)
    const f = {
      temperatura: 1 + tcPmax * (tCell - 25),
      sujeira: opts.soiling ?? 0.97,
      cabosDescasamento: opts.wiring ?? 0.975,
      sombraEUso: opts.shadeUse ?? 0.9, // estacionamento, árvores, antenas, orientação aleatória
      baixaIrradiancia: opts.lowIrr ?? 0.98,
      mppt: opts.mpptEff ?? 0.95 // ASSUMIDO (não consta no manual)
    };
    const nameplateWh = str.pStcW * hsp;
    const clip = dailyPvEnergyWh(str, inv, hsp, 1, {});
    f.clipping15A = 1 - clip.clippingLossPct / 100;
    let wh = nameplateWh;
    const steps = [{ name: 'Nominal (kWp × HSP)', factor: 1, wh }];
    for (const [k, v] of Object.entries(f)) {
      wh *= v;
      steps.push({ name: k, factor: v, wh });
    }
    const rear = opts.rearGainPct ?? 0;
    wh *= 1 + rear / 100;
    steps.push({ name: 'ganho traseiro', factor: 1 + rear / 100, wh });
    return {
      steps,
      wh,
      pr: wh / nameplateWh,
      kWhPerKwpDay: wh / (str.pStcW / 1000) / 1000,
      rearGainPct: rear
    };
  }

  /** Cenários de ganho bifacial: (bifacialidade × irradiância traseira relativa). */
  function bifacialScenarios(hsp, str, inv, bifaciality = 0.8) {
    const cases = [
      { id: 'roof', name: 'Teto do veículo (sem afastamento, tampado)', rearRatio: 0.0 },
      { id: 'roofGap', name: 'Teto com pequeno vão (~10 cm) sobre superfície clara', rearRatio: 0.03 },
      { id: 'ground', name: 'Solo, inclinado, albedo médio (catálogo)', rearRatio: 0.12 }
    ];
    return cases.map((c) => {
      const gain = bifaciality * c.rearRatio * 100;
      const r = realYield(str, inv, hsp, { rearGainPct: gain });
      return { ...c, gainPct: gain, wh: r.wh, pr: r.pr };
    });
  }

  /**
   * Simulação diária do estado de carga. weather = lista cíclica de fatores sobre a geração média (ex.: [1,1,0.4]).
   * Consumo sai da bateria com eficiência do inversor; carga entra com eficiência da bateria.
   */
  function chargeSimulation(bat, opts = {}) {
    const capWh = (opts.nBatteries ?? 1) * bat.kWh * 1000;
    const soc0 = opts.soc0 ?? 0.1;
    const target = opts.target ?? 1;
    const pv = opts.pvDailyWh ?? 0;
    const load = (opts.loadDailyWh ?? 0) / (opts.invEff ?? D.inverter.peakEfficiency);
    const chEff = opts.chargeEff ?? 0.97;
    const weather = opts.weather ?? [1];
    const maxDays = opts.maxDays ?? 30;
    let soc = soc0;
    const series = [];
    let daysToTarget = null;
    for (let d = 1; d <= maxDays; d++) {
      const gen = pv * weather[(d - 1) % weather.length] * chEff;
      soc = Math.min(1, Math.max(0, soc + (gen - load) / capWh));
      series.push({ day: d, soc });
      if (daysToTarget === null && soc >= target - 1e-9) daysToTarget = d;
    }
    const netWh = pv * chEff - load;
    // dia fracionado (interpolação linear) até a meta
    const fractional = netWh > 0 && weather.length === 1 ? ((target - soc0) * capWh) / netWh : null;
    return { capWh, series, daysToTarget, fractionalDays: fractional, netWhPerDay: netWh, selfSustaining: netWh >= 0 };
  }

  /** Tempo (h) para carregar de soc0 a soc1 com corrente constante (gerador/rede), com 5% de cauda CV. */
  function chargeHoursAtCurrent(bat, chargeA, soc0 = 0.1, soc1 = 1, nBatteries = 1) {
    const cA = Math.min(chargeA, nBatteries * bat.maxChargeA);
    const ah = (soc1 - soc0) * bat.capacityAh * nBatteries;
    return { hours: (ah / cA) * 1.05, currentA: cA, limitedByBms: chargeA > nBatteries * bat.maxChargeA };
  }

  /**
   * Geladeira 24 V ligada direto ao barramento DC (o inversor NÃO tem saída DC própria: os bornes DC são a entrada da bateria).
   * fridge: { vMin, vMax, watts }.
   */
  function dcFridgeCheck(fridge, bat, inv) {
    const issues = [];
    const vBulk = 28.4; // prog. 26 recomendado
    const vTop = bat.maxChargeV;
    const vLow = bat.bmsCutoffV;
    if (fridge.vMax < vBulk)
      issues.push({ sev: 'high', text: `Tensão máx. da geladeira (${fridge.vMax} V) abaixo da carga em bulk (${vBulk} V): danifica o compressor/eletrônica.` });
    else if (fridge.vMax < vTop)
      issues.push({ sev: 'mid', text: `Tensão máx. da geladeira (${fridge.vMax} V) abaixo da tensão de topo possível (${vTop} V).` });
    if (fridge.vMin > inv.lowDcCutoffV[2] + 3)
      issues.push({ sev: 'mid', text: `Tensão mín. da geladeira (${fridge.vMin} V) acima da faixa útil da bateria descarregada.` });
    const avgA = fridge.watts / 25.6;
    const startA = avgA * 3;
    const fuseA = [3, 5, 7.5, 10, 15, 20, 25, 30].find((x) => x >= startA * 1.25) ?? 30;
    return {
      compatible: !issues.some((i) => i.sev === 'high'),
      issues,
      avgA,
      fuseA,
      cableMm2: fuseA <= 10 ? 2.5 : 4,
      lowVoltageDisconnectNeeded: true,
      dailyWh: fridge.watts * (fridge.hoursPerDay ?? 8)
    };
  }

  return {
    round,
    stringElectrical,
    checkMppt,
    usablePowerW,
    dailyPvEnergyWh,
    loadsSummary,
    checkBatteryCompat,
    batterySizing,
    dcCurrentA,
    dcProtection,
    generatorSizing,
    panelUnitPrice,
    costBreakdown,
    panelSweep,
    bestPanelCount,
    maxAcFromBattery,
    pvChargeCurrentA,
    realYield,
    bifacialScenarios,
    chargeSimulation,
    chargeHoursAtCurrent,
    dcFridgeCheck
  };
});
