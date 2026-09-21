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

  /* Fonte: página do produto na Inohouse (lojainohouse.com.br), consultada em 21/09/2026.
     Campos marcados em "assumed" NÃO constam na página e são valores típicos de 8S LiFePO4. */
  const battery = {
    id: 'inohouse-thu24v314',
    name: 'Bateria solar LiFePO4 24 V 314 Ah 8,03 kWh, BMS JK Bluetooth (Inohouse)',
    chemistry: 'LiFePO4 8S',
    nominalV: 25.6,
    capacityAh: 314,
    kWh: 8.03,
    maxChargeA: 100,
    maxDischargeA: 100,
    maxChargeV: 29.2, // 8 x 3,65 V (assumido)
    bmsCutoffV: 20.0, // 8 x 2,5 V (assumido)
    ip: 'IP65',
    weightKg: 52,
    dimensionsMm: { l: 640, w: 245, h: 220 },
    cycles: 5000,
    warrantyYears: 3,
    inmetro: '008996/2026',
    bms: 'JK com balanceador ativo e Bluetooth',
    assumed: ['maxChargeV', 'bmsCutoffV', 'faixa de temperatura de carga (não informada)'],
    priceRegularBRL: 8699.99,
    priceCashBRL: 8499.99,
    pricePixBRL: 8074.99,
    priceBRL: 8499.99, // valor à vista usado no projeto
    priceSource: 'lojainohouse.com.br (consulta em 21/09/2026)'
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

  return { inverter, panel, battery, defaultLoads, accessories };
});
