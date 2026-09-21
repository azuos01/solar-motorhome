# Memorial do projeto

## Premissas e dados
| Item | Valor | Fonte |
|---|---|---|
| Inversor | 4,2 kVA / 4,2 kW, 24 Vdc, 230 Vac (ajustável 220 V), MPPT 60–500 V, Voc máx. 500 V, 15 A, 4,5 kW PV, carga máx. 100 A | Manual, tabelas 1–4 |
| Módulo | 730 W, Voc 49,5 V, Vmp 41,7 V, Isc 18,51 A, Imp 17,51 A, 2384×1303×33 mm, 40,5 kg | NeoSolar (kit com 2) |
| Baterias (anexo) | Unipower 48 V 4,8 kWh R$ 5.425,81; Deye 51,2 V 5,12 kWh R$ 5.754,67; Secpower 51,2 V 5,12 kWh R$ 5.425,81 | Belenus (captura) |

## Decisões
1. **Barramento 24 V.** Baterias de 48/51,2 V carregam a ≈ 55–58 V; o inversor protege em 32 V. Projeto usa 2 × LiFePO4 25,6 V 100 Ah em paralelo (5,12 kWh).
2. **2 módulos em série (2S1P).** Vmp 83,4 V (> 60 V), Voc a frio ≈ 108 V (< 500 V). 1 módulo não atinge 60 V. Corrente limitada a 15 A: potência utilizável ≈ 1.250 W. Cada módulo extra acrescenta ≈ 625 W, então o mínimo válido que cabe no teto é o melhor custo-benefício.
3. **Mínimo de 2 baterias.** A 4,2 kW o inversor puxa ≈ 175 A (25,6 V, η 94 %); uma bateria de 100 A contínuos limitaria a ≈ 2,3 kW.
4. **Gerador** entra no AC IN por chave reversora bipolar 0–I–II; prog. 03 = GEN; carga limitada pelo prog. 11.
5. **AC IN protegido a 32 A** (cabo 6 mm², 10 AWG) em vez dos 50 A do manual.

## Proteções
- PV: disjuntor DC 2P 16 A ≥ 250 Vdc, DPS DC classe II.
- Bateria: fusível Classe T 200 A no positivo, disjuntor DC 2P 250 A, shunt no negativo, cabo 50 mm² ≤ 1,5 m, torque 2–3 N·m.
- AC: IDR 30 mA, disjuntores por circuito, PE único ao chassi.

## Pontos em aberto
- Isc 18,51 A × entrada de 15 A: confirmação escrita do fabricante.
- Coeficientes de temperatura reais do módulo (assumidos −0,25 %/°C Voc, −0,29 %/°C Vmp).
- Preços do inversor, do kit de módulos, do banco 24 V e dos acessórios (estimativas).
