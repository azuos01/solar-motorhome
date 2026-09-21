/* Conteúdo textual do projeto (riscos, dicas, programas do inversor, checklist). UMD. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SolarContent = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const config = [
    { prog: '01', name: 'Prioridade da saída', value: 'SBU', why: 'Usa sol e bateria primeiro; gerador/rede só quando a bateria cai ao ponto do prog. 12. Nunca use SUF (tenta injetar na rede).' },
    { prog: '02', name: 'Corrente máx. de carga (solar + AC)', value: '60 A (< 100 A do BMS)', why: 'Deve ser menor que a corrente máxima de carga do BMS (100 A na bateria Inohouse; manual p. 22). Limite do inversor: 100 A. Com gerador pequeno, use menos.' },
    { prog: '03', name: 'Faixa de tensão de entrada AC', value: 'GEN', why: 'Faixa 170–280 V compatível com gerador (manual p. 10).' },
    { prog: '05', name: 'Tipo de bateria', value: 'LIb', why: 'Lítio sem comunicação; habilita os programas 26, 27 e 29 (manual p. 21).' },
    { prog: '08', name: 'Tensão de saída', value: '220 V', why: 'Padrão de fábrica é 230 V; 220 V casa com a rede brasileira.' },
    { prog: '09', name: 'Frequência de saída', value: '60 Hz', why: 'Padrão de fábrica é 50 Hz; equipamentos brasileiros usam 60 Hz.' },
    { prog: '11', name: 'Corrente máx. de carga pela rede/gerador', value: '20 A (2–80 A)', why: 'Padrão 30 A. Reduza se o gerador for pequeno (≈ 0,62 kW AC a 20 A).' },
    { prog: '12', name: 'Tensão de retorno à rede/gerador (SBU)', value: '23,0 V', why: 'Deve ser ≥ prog. 29 + 1 V, senão o inversor alarma bateria baixa.' },
    { prog: '13', name: 'Tensão de retorno ao modo bateria', value: 'FUL', why: 'Volta à bateria só quando carregada; máx. = prog. 26 − 0,4 V.' },
    { prog: '16', name: 'Prioridade do carregador', value: 'SNU (padrão)', why: 'Sol e gerador carregam juntos. Use OSO para carregar só com sol.' },
    { prog: '26', name: 'Tensão de carga em bulk/absorção', value: '28,4 V', why: 'Regra do manual: tensão máx. de carga do BMS − 0,5 V (8S LiFePO4: BMS ≤ 29,2 V; confirme o ajuste do BMS JK).' },
    { prog: '27', name: 'Tensão de flutuação', value: '= prog. 26', why: 'O manual manda igualar à tensão C.V para lítio. Faixa 24 V até o valor do prog. 26.' },
    { prog: '29', name: 'Corte por tensão baixa', value: '22,0 V', why: 'Regra do manual: ≥ tensão de proteção de descarga do BMS + 2 V (BMS típico 20,0 V; confirme o valor no aplicativo do BMS JK).' },
    { prog: '33', name: 'Equalização', value: 'Desabilitada', why: 'Nunca equalize LiFePO4. Programas 34–39 ficam sem uso.' }
  ];

  const risks = [
    { sev: 'high', risk: 'Isc do módulo (18,51 A) acima da corrente máx. de entrada do inversor (15 A)', mitigation: 'O manual só cita 15 A de entrada e exemplifica com módulos de Isc ≤ 13,7 A. Peça confirmação por escrito ao fabricante/fornecedor da Isc admissível; se negativa, troque o módulo por outro com Imp ≤ 15 A e Isc ≤ 15 A (ex.: 550 W do manual).' },
    { sev: 'high', risk: 'Bateria única limita a descarga a 100 A (≈ 2,4 kW CA) e o inversor puxa ≈ 175 A a 4,2 kW', mitigation: 'Limite as cargas simultâneas a ≈ 2,4 kW (evite micro-ondas + A/C + chaleira juntos). Se precisar de mais, use 2 baterias em paralelo (confirme o paralelo com a Inohouse). O surge de 2× do inversor pode desarmar o BMS e desligar tudo.' },
    { sev: 'high', risk: 'Gerador funcionando perto do veículo (monóxido de carbono)', mitigation: 'Opere sempre ao ar livre, a favor do vento, com escapamento longe de janelas e ventilações; instale detector de CO no habitáculo.' },
    { sev: 'high', risk: 'Corrente DC de ≈ 175 A a 4,2 kW (o manual cita 137 A / 2 AWG)', mitigation: 'Cabo 50 mm² curto (≤ 1,5 m), terminais crimpados de qualidade, fusível Classe T 200 A junto à bateria e disjuntor DC 2P. Com 1 bateria, o BMS (100 A) atua antes do fusível: o fusível protege contra curto, não contra sobrecarga.' },
    { sev: 'high', risk: 'Geladeira 24 V ligada sem fusível ou com tensão máxima < 29 V', mitigation: 'Derive do barramento da bateria (o inversor não tem saída DC), com fusível 10 A, cabo 2,5–4 mm² e corte por subtensão. Confira que a geladeira aceita 20–29,2 V.' },
    { sev: 'mid', risk: 'Peso e dimensões: 2 módulos de 2384 × 1303 mm e 81 kg; bateria de 52 kg', mitigation: 'Verifique carga útil (PBT), centro de gravidade, altura total e resistência do teto (sanduíche não suporta pisada). Fixe a bateria para os esforços de frenagem/colisão. Use perfis e coxins colados/parafusados em reforços, com Sikaflex e passa-cabos estanques.' },
    { sev: 'mid', risk: 'Sombreamento parcial em série', mitigation: 'Com 2 módulos em série uma sombra forte reduz a string toda. Evite antenas, aerofólios e claraboias na frente dos módulos; posicione lado a lado sem sombra mútua.' },
    { sev: 'mid', risk: 'Tensão DC de 99–108 V no teto', mitigation: 'Use disjuntor DC 2P dimensionado para tensão contínua (≥ 250 Vdc), DPS DC e conectores MC4 do mesmo fabricante. Cubra os módulos ao fazer manutenção; desconecte a bateria e o PV antes de mexer.' },
    { sev: 'mid', risk: 'Carga de LiFePO4 abaixo de 0 °C (a página da bateria não informa a faixa de temperatura)', mitigation: 'Pergunte ao fornecedor sobre a proteção de baixa temperatura do BMS JK (sensor). Instale o banco no habitáculo ou com manta térmica.' },
    { sev: 'mid', risk: 'Lítio sem comunicação: SOC impreciso', mitigation: 'Use o aplicativo do BMS JK (Bluetooth) e um shunt/monitor. Ajuste os programas 26, 27, 29 e 02 conforme o BMS antes de ligar as cargas.' },
    { sev: 'mid', risk: 'Cargas de 127 V ou com partida forte (ar-condicionado, compressores)', mitigation: 'Use equipamentos 220 V (ou bivolt). Ar-condicionado precisa de soft-start ou tecnologia inverter; aguarde 3 min entre desligar e religar. Surge do inversor: 2× por 5 s.' },
    { sev: 'mid', risk: 'Amperagem do disjuntor AC sugerida pelo manual (50 A) acima do cabo 10 AWG', mitigation: 'O projeto usa 32 A na entrada AC (cabo 6 mm²), suficiente para 4,2 kW de bypass + carregador limitado pelo prog. 11.' },
    { sev: 'mid', risk: 'Potência de 730 W pode ser bifacial (BNPI) e não frontal', mitigation: 'Confirme na ficha do fabricante que a potência de placa é a frontal em STC. Se incluir o ganho traseiro, reduza a expectativa de geração no teto.' },
    { sev: 'low', risk: 'Módulo bifacial em teto plano sem ganho traseiro (≈ 0–2%)', mitigation: 'O ganho bifacial só compensa com albedo e afastamento. Para o teto, um módulo monofacial de mesma potência seria mais leve/barato; o kit foi mantido por ser o indicado.' },
    { sev: 'low', risk: 'Regularização do veículo e seguro', mitigation: 'Consulte o DETRAN/Inmetro (CONTRAN 292/2008) e a seguradora sobre alteração de dimensões, peso e instalações elétricas fixas.' },
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
    'Confirmar com a Inohouse: paralelo permitido, proteção de baixa temperatura, ajustes do BMS JK (OVP/UVP) e corrente contínua real',
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
    'Instalar detector de CO e extintor; deixar o diagrama no armário',
    'Se houver geladeira 24 V: derivação com fusível 10 A e corte por subtensão'
  ];

  /* Pontos adicionais de especialista (normas e legislação brasileiras) */
  const expert = [
    { title: 'NBR 16690 e NBR 16612 (lado CC)', text: 'Arranjo FV com cabo solar próprio (NBR 16612, 1,8 kV CC, resistente a UV), seccionamento CC, DPS e proteção contra sobrecorrente dimensionados para a Isc. O cabo de 6 mm² e o disjuntor DC 2P de 16 A do projeto seguem essa lógica; verifique a Isc de 18,51 A × 1,25 nos cálculos de proteção.' },
    { title: 'NBR 5410 e NR-10 (lado CA)', text: 'Dispositivo DR de 30 mA, aterramento único (PE no chassi) e seccionamento de fase e neutro na chave reversora. Neutro do gerador não deve ser aterrado em mais de um ponto. Serviços em instalação elétrica seguem a NR-10 (profissional habilitado).' },
    { title: 'Lei 14.300/2022 não se aplica', text: 'Sistema off-grid não injeta na rede, então não há homologação nem parecer de acesso na distribuidora. Mantenha o inversor em SBU e não ligue à rede pública sem a configuração de proteção adequada; nos campings, a rede entra apenas pela chave reversora.' },
    { title: 'Regularização do veículo', text: 'Módulos no teto e baterias de 52 kg alteram dimensões, peso e distribuição de carga: consulte o DETRAN/Inmetro (CONTRAN 292/2008), confira a altura máxima legal (CONTRAN 210/2006, 4,40 m) e informe a seguradora.' },
    { title: 'Esforços mecânicos e vento', text: 'Dois módulos de 3,11 m² sofrem arrancamento em alta velocidade. Dimensione fixadores e reforços do teto para a velocidade máxima da viagem e use travas nos conectores MC4 contra vibração.' },
    { title: 'Carregamento pelo alternador', text: 'Um carregador DC-DC 12→24 V isolado, ligado à bateria do motor com fusível próprio, repõe energia enquanto o veículo roda e complementa o solar em dias fechados. Precisa ser compatível com LiFePO4 e limitar a corrente ao alternador.' },
    { title: 'Ajuste do BMS JK e SOC', text: 'Configure no aplicativo: sobretensão de célula ≤ 3,65 V, subtensão ≥ 2,5 V, início de balanceamento ≈ 3,4 V e calibração do SOC. Verifique que o prog. 26 (28,4 V) fica abaixo do corte de sobretensão total do BMS.' },
    { title: 'Expansão e paralelo', text: 'Pergunte se a bateria permite paralelo e quantas unidades. Duas unidades dobram a corrente disponível (200 A) e a autonomia; cabos de mesmo comprimento e barramento comum são obrigatórios.' },
    { title: 'Segurança contra incêndio', text: 'Fusível Classe T ≤ 1,5 m da bateria, extintor ABC no habitáculo, detector de fumaça e de CO, e nada inflamável no compartimento do inversor (folgas de 20/50 cm). Lítio: nunca carregar com BMS danificado.' },
    { title: 'Documentação técnica', text: 'Mantenha memorial de cálculo, diagrama unifilar impresso, fotos da instalação e ART/TRT do responsável técnico (CREA/CFT), úteis para seguro e revenda do veículo.' },
    { title: 'Custo-benefício da bateria', text: 'A R$ 8.499,99 à vista a bateria custa ≈ R$ 1,06 por Wh instalado, 50% do orçamento. O Pix (R$ 8.074,99) economiza ≈ R$ 425. Com o teto limitando a área a 2 módulos, o dinheiro extra rende mais em eficiência das cargas (geladeira 24 V, LED) do que em mais bateria.' },
    { title: 'HSP e sazonalidade', text: 'O HSP 5,0 é uma média anual de partida. Em dias de inverno no Sul (HSP ≈ 3) a geração cai para ≈ 3,2 kWh e a carga completa leva ≈ 8 dias com as cargas de exemplo: planeje o gerador. Consulte o SunData/CRESESB para o local.' }
  ];

  return { config, risks, tips, checklist, expert };
});
