# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/); versionamento semântico.

## [2.0.0] - 2026-09-21
### Alterado
- **BREAKING:** removidas as baterias Belenus 48/51,2 V; `D.batteries`/`D.battery24` substituídos por `D.battery` (Inohouse LiFePO4 24 V 314 Ah, 8,03 kWh, 100 A carga/descarga).
- Banco padrão passa de 2 × 100 Ah para 1 × 314 Ah; limite de 2,4 kW CA por bateria única sinalizado.
- Esquema elétrico: bateria única e derivação opcional para geladeira 24 V.
- Desempenho global passa a vir da cascata de perdas (`realYield`).
### Adicionado
- Tempo de carga só com os 2 módulos, simulação de estado de carga (`chargeSimulation`) e carga por gerador (`chargeHoursAtCurrent`).
- Rendimento real e cenários bifaciais (`realYield`, `bifacialScenarios`).
- Verificação de geladeira 24 V no barramento DC (`dcFridgeCheck`).
- Síntese (Contexto, Objetivo, Método, Resultados, Conclusão), fontes consultadas, pontos de especialista (NBR 5410/16690/16612, NR-10, Lei 14.300, CONTRAN) e aviso de uso de IA e responsabilidade.
- Testes que verificam os números citados na síntese e o texto obrigatório (IA, supervisão, isenção).

## [1.0.0] - 2026-09-21
### Adicionado
- Dados do inversor 4,2 kVA (manual), módulo ZNShine 730 W e baterias Belenus.
- Motor de cálculo (`src/calc.js`): strings PV, janela MPPT, compatibilidade de bateria, banco 24 V, gerador, custos.
- Página web com calculadora, esquema elétrico com gerador auxiliar, configuração do inversor, riscos e checklist.
- Testes automatizados (`npm test`) e CI/Pages no GitHub Actions.
### Decisões
- Baterias de 48/51,2 V reprovadas para o inversor de 24 V; projeto usa banco LiFePO4 24 V 2×100 Ah.
