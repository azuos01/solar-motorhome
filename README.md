# Solar Motorhome

Projeto e calculadora de sistema fotovoltaico off-grid para motorhome: inversor híbrido 4,2 kVA (24 Vdc / 220 Vac), 2 módulos ZNShine ZXN8-BD132 730 W em série, banco LiFePO4 24 V (2 × 100 Ah) e gerador auxiliar via chave reversora bipolar.

Abra `index.html` no navegador (não há build nem dependências) ou publique no GitHub Pages.

## Achados principais
- As baterias de 48/51,2 V da Belenus **não são compatíveis** com o inversor 24 V (proteção de sobrecarga em 32 V, falha 03).
- Isc do módulo (18,51 A) > entrada máx. do inversor (15 A): confirmar com o fabricante.
- Corrente DC a 4,2 kW ≈ 175 A: cabo 50 mm², fusível Classe T 200 A.
- Preços do inversor, módulos, banco 24 V e acessórios são **estimativas editáveis**.

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
Ferramenta de apoio. A instalação deve ser feita e validada por profissional habilitado.

Licença MIT.
