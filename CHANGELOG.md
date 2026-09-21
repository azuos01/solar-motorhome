# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/); versionamento semântico.

## [1.0.0] - 2026-09-21
### Adicionado
- Dados do inversor 4,2 kVA (manual), módulo ZNShine 730 W e baterias Belenus.
- Motor de cálculo (`src/calc.js`): strings PV, janela MPPT, compatibilidade de bateria, banco 24 V, gerador, custos.
- Página web com calculadora, esquema elétrico com gerador auxiliar, configuração do inversor, riscos e checklist.
- Testes automatizados (`npm test`) e CI/Pages no GitHub Actions.
### Decisões
- Baterias de 48/51,2 V reprovadas para o inversor de 24 V; projeto usa banco LiFePO4 24 V 2×100 Ah.
