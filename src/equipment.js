/* Dados dos equipamentos. UMD: funciona no navegador (window.SolarData) e no Node (require). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SolarData = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* Fonte: manual "Hybrid Solar Inverter/Charger 4.2KVA 230Vac" (371-00108-00), tabelas 1-4 e p.3-7 */
  const inverter = {
    id: 'inv-4k2-24v',
    name: 'Inversor/carregador híbrido 4,2 kVA 24 Vdc / 230 Vac',
    ratedVA: 4200,
    ratedW: 4200,
    surgeFactor: 2, // 2x por 5 s
    surgeSeconds: 5,
    dcNominalV: 24,
    dcColdStartV: 23.0,
    dcOverchargeV: 32,
    dcBulkAgmV: 28.2,
    dcBulkFloodedV: 29.2,
    dcFloatV: 27.0,
    lowDcCutoffV: [21.0, 20.4, 19.2], // <20%, 20-50%, >=50% de carga (AGM/Flooded)
    peakEfficiency: 0.94,
    lineEfficiency: 0.95,
    pv: {
      ratedW: 4500,
      vocMax: 500,
      mpptMin: 60,
      mpptMax: 500,
      imax: 15, // "Max. Input Current" (A)
      chargeMaxA: 100 // corrente máx. de carga (PV)
    },
    ac: {
      inNominalV: 230,
      inMinUpsV: 170, // faixa "UPS"
      inMaxV: 280,
      inAbsMaxV: 300,
      freqHz: [50, 60],
      chargeMaxA_AC: 80,
      chargeMaxA_total: 100,
      manualBreakerA: 50, // recomendado pelo manual
      manualCableAWG: 10,
      transferMsUps: 10,
      transferMsAppliance: 20
    },
    dcCable: { manualMaxA: 137, manualAWG: 2, manualMm2: 38, torqueNm: [2, 3] },
    dimensionsMm: { d: 358, w: 295, h: 105 },
    weightKg: 6.2,
    priceBRL: 3200, // ESTIMATIVA - editar
    priceSource: 'estimativa (não consta nos anexos)'
  };

  /* Fonte: página da NeoSolar (kit com 2 painéis) - ZNShine ZXN8-BD132 730 W */
  const panel = {
    id: 'znshine-zxn8-bd132-730',
    name: 'ZNShine ZXN8-BD132 730 W bifacial TOPCon',
    pmax: 730,
    voc: 49.5,
    vmp: 41.7,
    isc: 18.51,
    imp: 17.51,
    lengthMm: 2384,
    widthMm: 1303,
    thicknessMm: 33,
    weightKg: 40.5,
    areaM2: 3.11,
    efficiency: 0.2382,
    // coeficientes NÃO informados na página: valores típicos TOPCon (ASSUMIDOS)
    tcVoc: -0.0025,
    tcVmp: -0.0029,
    tcAssumed: true,
    warrantyYears: 12,
    kitQty: 2,
    priceKitBRL: 1900, // ESTIMATIVA - editar (kit com 2 painéis)
    priceSource: 'estimativa - conferir no link da NeoSolar'
  };

  /* Fonte: captura de tela belenus.com.br (baterias baixa tensão) */
  const batteries = [
    {
      id: 'unipower-uplfp48-100',
      code: 'BATBE-48V-5KWH',
      name: 'Bateria de Lítio Uplfp48-100 4,8 kWh 48 V (Unipower)',
      nominalV: 48,
      kWh: 4.8,
      ip: 'IP21',
      priceBRL: 5425.81,
      priceSource: 'belenus.com.br (captura de tela)'
    },
    {
      id: 'deye-se-f5',
      code: 'BATDE-51V-5.1KWH-BT',
      name: 'Bateria de Lítio Se-F5 5,12 kWh 51,2 V (Deye)',
      nominalV: 51.2,
      kWh: 5.12,
      ip: 'IP21',
      priceBRL: 5754.67,
      priceSource: 'belenus.com.br (captura de tela)'
    },
    {
      id: 'secpower-splfp5e',
      code: 'BATSP-51V-5.12KWH-BT',
      name: 'Bateria de Lítio Splfp 5 E 5,12 kWh 51,2 V (Secpower)',
      nominalV: 51.2,
      kWh: 5.12,
      ip: 'IP20',
      priceBRL: 5425.81,
      priceSource: 'belenus.com.br (captura de tela)'
    }
  ];

  /* Banco de referência compatível com o inversor 24 V (NÃO consta nos anexos) */
  const battery24 = {
    id: 'ref-lifepo4-24v-100',
    name: 'Bateria LiFePO4 25,6 V 100 Ah (8S) com BMS - referência',
    nominalV: 25.6,
    kWh: 2.56,
    ip: 'IP65 (típico)',
    maxChargeV: 29.2, // 8 x 3,65 V
    bmsCutoffV: 20.0, // 8 x 2,5 V (típico)
    bmsMaxContA: 100,
    priceBRL: 3200, // ESTIMATIVA - editar
    priceSource: 'estimativa (não consta nos anexos)'
  };

  /* Cargas típicas de motorhome (AC 230 V). Editável na página. */
  const defaultLoads = [
    { name: 'Geladeira compressor', watts: 90, hoursPerDay: 8 },
    { name: 'Iluminação LED', watts: 40, hoursPerDay: 5 },
    { name: 'Notebook / TV / roteador', watts: 150, hoursPerDay: 5 },
    { name: 'Bomba d’água + exaustor', watts: 80, hoursPerDay: 1 },
    { name: 'Micro-ondas', watts: 1200, hoursPerDay: 0.25 },
    { name: 'Ar-condicionado 9.000 BTU inverter', watts: 800, hoursPerDay: 0 }
  ];

  const accessories = [
    { id: 'dc-breaker', name: 'Disjuntor DC 2P 250 A (bateria)', qty: 1, priceBRL: 380 },
    { id: 'classt', name: 'Fusível Classe T 200 A + porta-fusível', qty: 1, priceBRL: 220 },
    { id: 'busbar', name: 'Barramentos + / − 300 A', qty: 2, priceBRL: 90 },
    { id: 'cable-bat', name: 'Cabo 50 mm² (par, ~2 m) + terminais', qty: 1, priceBRL: 320 },
    { id: 'pv-breaker', name: 'Disjuntor DC 2P 16 A ≥ 250 Vdc (PV)', qty: 1, priceBRL: 140 },
    { id: 'dps', name: 'DPS DC classe II ≥ 150 Vdc', qty: 1, priceBRL: 160 },
    { id: 'mc4', name: 'Cabo solar 6 mm² + conectores MC4 (par ~15 m)', qty: 1, priceBRL: 260 },
    { id: 'transfer', name: 'Chave reversora bipolar 0-I-II 40 A (rede/gerador)', qty: 1, priceBRL: 260 },
    { id: 'ac-protect', name: 'IDR 30 mA + disjuntores AC (entrada e QDC)', qty: 1, priceBRL: 420 },
    { id: 'mount', name: 'Suportes de teto, vedação (sikaflex), passa-cabos', qty: 1, priceBRL: 480 },
    { id: 'shunt', name: 'Monitor de bateria com shunt (opcional)', qty: 1, priceBRL: 450 }
  ];

  return { inverter, panel, batteries, battery24, defaultLoads, accessories };
});
