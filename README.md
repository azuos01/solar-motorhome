# Solar Motorhome

Projeto e calculadora de sistema fotovoltaico off-grid para motorhome: inversor híbrido 4,2 kVA (24 Vdc / 220 Vac), 2 módulos ZNShine ZXN8-BD132 730 W em série, bateria LiFePO4 24 V 314 Ah / 8,03 kWh (Inohouse) e gerador auxiliar via chave reversora bipolar.

Abra `index.html` no navegador (não há build nem dependências) ou publique no GitHub Pages.

## Achados principais (v2.0.0)
- Bateria Inohouse 24 V 314 Ah (8,03 kWh) compatível com o inversor (LIb). Limite de 100 A de descarga: ≈ 2,4 kW CA contínuos com 1 unidade.
- Só com os 2 módulos: ≈ 5,3 kWh/dia reais (PR ≈ 0,72); 10% → 100% em ≈ 1,4 dia sem consumo e ≈ 2,5 dias com 2,05 kWh/dia de cargas.
- Geladeira 24 V: possível no barramento da bateria (o inversor não tem saída DC), com fusível próprio, corte por subtensão e faixa de tensão até 29,2 V.
- Módulo bifacial no teto: ganho traseiro ≈ 0%; o nominal frontal se mantém, mas o ganho de catálogo não existe.
- Isc do módulo (18,51 A) > entrada máx. do inversor (15 A): confirmar com o fabricante.
- Preços do inversor, módulos e acessórios são **estimativas editáveis**.

## Estrutura
- `src/equipment.js` dados dos equipamentos · `src/calc.js` cálculos · `js/` interface e conteúdo · `css/` estilos
- `tests/` testes com `node:test` · `docs/PROJETO.md` memorial do projeto

## Desenvolvimento
```bash
npm test        # roda os testes (Node >= 18)
npm start       # servidor local em http://localhost:8080
```
Commits seguem Conventional Commits; releases por tag `vX.Y.Z` e `CHANGELOG.md`.

## Aviso
Trabalho elaborado com IA (Claude, Anthropic; modelo configurado `claude-sonnet-5`) sob supervisão de profissionais da Soluções Solares Ltda, para fins de consultoria teórica. Não há responsabilidade da Soluções Solares Ltda por execução de terceiros. A instalação deve ser feita e validada por profissional habilitado.

Licença MIT.
