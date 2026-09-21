/* Conteúdo textual do projeto (riscos, dicas, programas do inversor, checklist). UMD. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SolarContent = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const config = [
    { prog: '01', name: 'Prioridade da saída', value: 'SBU', why: 'Usa sol e bateria primeiro; gerador/rede só quando a bateria cai ao ponto do prog. 12. Nunca use SUF (tenta injetar na rede).' },
    { prog: '02', name: 'Corrente máx. de carga (solar + AC)', value: '≤ máx. do BMS (ex.: 60 A)', why: 'Deve ser menor que a corrente máxima de carga do BMS (manual p. 22). Limite do inversor: 100 A.' },
    { prog: '03', name: 'Faixa de tensão de entrada AC', value: 'GEN', why: 'Faixa 170–280 V compatível com gerador (manual p. 10).' },
    { prog: '05', name: 'Tipo de bateria', value: 'LIb', why: 'Lítio sem comunicação; habilita os programas 26, 27 e 29 (manual p. 21).' },
    { prog: '08', name: 'Tensão de saída', value: '220 V', why: 'Padrão de fábrica é 230 V; 220 V casa com a rede brasileira.' },
    { prog: '09', name: 'Frequência de saída', value: '60 Hz', why: 'Padrão de fábrica é 50 Hz; equipamentos brasileiros usam 60 Hz.' },
    { prog: '11', name: 'Corrente máx. de carga pela rede/gerador', value: '20 A (2–80 A)', why: 'Padrão 30 A. Reduza se o gerador for pequeno (≈ 0,62 kW AC a 20 A).' },
    { prog: '12', name: 'Tensão de retorno à rede/gerador (SBU)', value: '23,0 V', why: 'Deve ser ≥ prog. 29 + 1 V, senão o inversor alarma bateria baixa.' },
    { prog: '13', name: 'Tensão de retorno ao modo bateria', value: 'FUL', why: 'Volta à bateria só quando carregada; máx. = prog. 26 − 0,4 V.' },
    { prog: '16', name: 'Prioridade do carregador', value: 'SNU (padrão)', why: 'Sol e gerador carregam juntos. Use OSO para carregar só com sol.' },
    { prog: '26', name: 'Tensão de carga em bulk/absorção', value: '28,4 V', why: 'Regra do manual: tensão máx. de carga do BMS − 0,5 V (8S LiFePO4: BMS ≤ 29,2 V).' },
    { prog: '27', name: 'Tensão de flutuação', value: '= prog. 26', why: 'O manual manda igualar à tensão C.V para lítio. Faixa 24 V até o valor do prog. 26.' },
    { prog: '29', name: 'Corte por tensão baixa', value: '22,0 V', why: 'Regra do manual: ≥ tensão de proteção de descarga do BMS + 2 V (BMS típico 20,0 V).' },
    { prog: '33', name: 'Equalização', value: 'Desabilitada', why: 'Nunca equalize LiFePO4. Programas 34–39 ficam sem uso.' }
  ];

  const risks = [
    { sev: 'high', risk: 'Baterias 48 V / 51,2 V ligadas ao inversor 24 V', mitigation: 'O inversor protege em 32 V (falha 03) e as baterias carregam a ≈ 58 V. Use banco 24 V, ou troque o inversor por um de 48 V. Não existe adaptação segura por conversor barato para 4 kW.' },
    { sev: 'high', risk: 'Isc do módulo (18,51 A) acima da corrente máx. de entrada do inversor (15 A)', mitigation: 'O manual só cita 15 A de entrada e exemplifica com módulos de Isc ≤ 13,7 A. Peça confirmação por escrito ao fabricante/fornecedor da Isc admissível; se negativa, troque o módulo por outro com Imp ≤ 15 A e Isc ≤ 15 A (ex.: 550 W do manual).' },
    { sev: 'high', risk: 'Gerador funcionando perto do veículo (monóxido de carbono)', mitigation: 'Opere sempre ao ar livre, a favor do vento, com escapamento longe de janelas e ventilações; instale detector de CO no habitáculo.' },
    { sev: 'high', risk: 'Corrente DC de ≈ 175 A a 4,2 kW (o manual cita 137 A / 2 AWG)', mitigation: 'Cabo 50 mm² curto (≤ 1,5 m), terminais crimpados de qualidade, fusível Classe T 200 A junto à bateria e disjuntor DC 2P. Confirme com o fornecedor: a potência contínua real pode ser limitada pelo BMS das baterias (2 × 100 A).' },
    { sev: 'mid', risk: 'Peso e dimensões: 2 módulos de 2384 × 1303 mm e 81 kg', mitigation: 'Verifique carga útil (PBT), centro de gravidade, altura total e resistência do teto (sanduíche não suporta pisada). Use perfis e coxins colados/parafusados em reforços, com Sikaflex e passa-cabos estanques.' },
    { sev: 'mid', risk: 'Sombreamento parcial em série', mitigation: 'Com 2 módulos em série uma sombra forte reduz a string toda. Evite antenas, aerofólios e claraboias na frente dos módulos; posicione lado a lado sem sombra mútua.' },
    { sev: 'mid', risk: 'Tensão DC de 99–108 V no teto', mitigation: 'Use disjuntor DC 2P dimensionado para tensão contínua (≥ 250 Vdc), DPS DC e conectores MC4 do mesmo fabricante. Cubra os módulos ao fazer manutenção; desconecte a bateria e o PV antes de mexer.' },
    { sev: 'mid', risk: 'Carga de LiFePO4 abaixo de 0 °C', mitigation: 'Instale o banco no habitáculo ou com manta térmica/aquecimento; bateria com BMS de bloqueio a baixa temperatura reduz o risco.' },
    { sev: 'mid', risk: 'Lítio sem comunicação: SOC impreciso', mitigation: 'Instale shunt/monitor de bateria. Ajuste os programas 26, 27, 29 e 02 conforme o BMS antes de ligar as cargas.' },
    { sev: 'mid', risk: 'Cargas de 127 V ou com partida forte (ar-condicionado, compressores)', mitigation: 'Use equipamentos 220 V (ou bivolt). Ar-condicionado precisa de soft-start ou tecnologia inverter; aguarde 3 min entre desligar e religar. Surge do inversor: 2× por 5 s.' },
    { sev: 'mid', risk: 'Amperagem do disjuntor AC sugerida pelo manual (50 A) acima do cabo 10 AWG', mitigation: 'O projeto usa 32 A na entrada AC (cabo 6 mm²), suficiente para 4,2 kW de bypass + carregador limitado pelo prog. 11.' },
    { sev: 'low', risk: 'Módulo bifacial em teto plano quase sem ganho traseiro', mitigation: 'O ganho bifacial só compensa com albedo e afastamento. Para o teto, um módulo monofacial de mesma potência sai mais barato; aqui o kit foi mantido por ser o indicado.' },
    { sev: 'low', risk: 'Regularização do veículo e seguro', mitigation: 'Consulte o DETRAN/Inmetro e a seguradora sobre alteração de dimensões, peso e instalações elétricas fixas.' },
    { sev: 'low', risk: 'Preços e coeficientes de temperatura estimados', mitigation: 'Atualize preços nos campos da calculadora; obtenha a ficha técnica completa do módulo para os coeficientes reais.' }
  ];

  const tips = [
    'Instale o inversor a menos de 1,5 m do banco, na vertical, com folga de 20 cm nas laterais e 50 cm acima e abaixo (manual p. 2), sobre superfície não combustível.',
    'Sequência de ligação: PE primeiro, bateria (DC), depois PV, e por último AC; para desligar, o inverso. Confira polaridade antes de fechar o disjuntor DC.',
    'Não coloque graxa antioxidante nos terminais antes de apertar e respeite o torque de 2–3 N·m na bateria (manual p. 4).',
    'Ajuste os programas do inversor com ele ligado apenas na tela (sem carga) e reinicie ao fim.',
    'Deixe o gerador para dias nublados: com SBU e prog. 12 correto, ele só é chamado quando necessário. Um gerador inverter de 2–3 kVA basta se limitar a carga pelo prog. 11.',
    'Priorize cargas DC eficientes (LED, geladeira 12/24 V compressor) para reduzir o banco necessário e o custo.',
    'Faça um teste de carga controlado (chaleira ou micro-ondas) e monitore a queda de tensão nos cabos: mais de 2% no DC indica cabo ou terminal insuficiente.',
    'Rotule todos os cabos e disjuntores e deixe o diagrama impresso no armário do quadro.'
  ];

  const checklist = [
    'Confirmar por escrito a Isc admissível na entrada PV com o fabricante do inversor',
    'Confirmar o banco de baterias 24 V (BMS, corrente contínua ≥ 100 A cada, faixa 20–29,2 V)',
    'Verificar carga útil, teto e posição dos módulos (sem sombras)',
    'Fixar os módulos e vedar passagens de cabo',
    'Passar cabo solar 6 mm² e instalar disjuntor DC 2P 16 A + DPS',
    'Instalar barramentos, fusível Classe T 200 A, shunt e disjuntor DC 2P 250 A',
    'Crimpar cabos de 50 mm² e conferir torque (2–3 N·m)',
    'Instalar chave reversora bipolar 0–I–II, disjuntor 32 A e IDR 30 mA',
    'Ligar PE: inversor, DPS, molduras e barramento no chassi',
    'Programar o inversor (01, 02, 03, 05, 08, 09, 11, 12, 26, 27, 29)',
    'Energizar em sequência (bateria, PV, AC) e conferir tensões no LCD',
    'Testar transferência para o gerador e o retorno ao modo bateria',
    'Testar carga de 1 kW por 30 min e medir temperatura de cabos e terminais',
    'Instalar detector de CO e extintor; deixar o diagrama no armário'
  ];

  return { config, risks, tips, checklist };
});
