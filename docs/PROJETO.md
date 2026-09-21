# Memorial do projeto

## Premissas e dados
| Item | Valor | Fonte |
|---|---|---|
| Inversor | 4,2 kVA / 4,2 kW, 24 Vdc, 230 Vac (ajustável 220 V), MPPT 60–500 V, Voc máx. 500 V, 15 A, 4,5 kW PV, carga máx. 100 A | Manual, tabelas 1–4 |
| Módulo | 730 W, Voc 49,5 V, Vmp 41,7 V, Isc 18,51 A, Imp 17,51 A, 2384×1303×33 mm, 40,5 kg | NeoSolar (kit com 2) |
| Bateria | Inohouse LiFePO4 25,6 V 314 Ah 8,03 kWh, BMS JK Bluetooth, 100 A carga/descarga, IP65, 52 kg, R$ 8.499,99 à vista (R$ 8.074,99 Pix) | lojainohouse.com.br |
| Baterias descartadas | Belenus 48/51,2 V (Unipower, Deye, Secpower) | captura de tela; incompatíveis com 24 V |

## Decisões
1. **Barramento 24 V.** Baterias de 48/51,2 V carregam a ≈ 55–58 V; o inversor protege em 32 V. Projeto usa 1 × Inohouse LiFePO4 25,6 V 314 Ah (8,03 kWh).
2. **2 módulos em série (2S1P).** Vmp 83,4 V (> 60 V), Voc a frio ≈ 108 V (< 500 V). 1 módulo não atinge 60 V. Corrente limitada a 15 A: potência utilizável ≈ 1.250 W. Cada módulo extra acrescenta ≈ 625 W, então o mínimo válido que cabe no teto é o melhor custo-benefício.
3. **Bateria única com limite de potência.** A 4,2 kW o inversor puxa ≈ 175 A (25,6 V, η 94 %); 100 A contínuos limitam a ≈ 2,4 kW CA. Para mais, 2 baterias em paralelo (confirmar com o fabricante).
4. **Gerador** entra no AC IN por chave reversora bipolar 0–I–II; prog. 03 = GEN; carga limitada pelo prog. 11.
5. **AC IN protegido a 32 A** (cabo 6 mm², 10 AWG) em vez dos 50 A do manual.

## Respostas da v2
- **Comportamento com 2 módulos:** ≈ 1.250 W utilizáveis, ≈ 41 A de carga; rendimento real ≈ 5,3 kWh/dia (HSP 5).
- **Tempo de carga (10% → 100%):** ≈ 1,4 dia sem consumo; ≈ 2,5 dias com 2,05 kWh/dia; gerador: ≈ 5 h a 60 A, ≈ 15 h a 20 A.
- **Geladeira 24 V:** não há saída DC no inversor; ligar no barramento da bateria com fusível, corte por subtensão e tensão máx. ≥ 29,2 V.
- **Bifacial no teto:** ganho traseiro ≈ 0%; PR ≈ 0,72 (≈ 3,6 kWh/kWp/dia). Confirmar que 730 W é potência frontal.

## Proteções
- PV: disjuntor DC 2P 16 A ≥ 250 Vdc, DPS DC classe II.
- Bateria: fusível Classe T 200 A no positivo, disjuntor DC 2P 250 A, shunt no negativo, cabo 50 mm² ≤ 1,5 m, torque 2–3 N·m.
- AC: IDR 30 mA, disjuntores por circuito, PE único ao chassi.

## Pontos em aberto
- Isc 18,51 A × entrada de 15 A: confirmação escrita do fabricante.
- Coeficientes de temperatura reais do módulo (assumidos −0,25 %/°C Voc, −0,29 %/°C Vmp).
- Preços do inversor, do kit de módulos e dos acessórios (estimativas). Dados da Greener e propostas a leads (indicados na skill de especialista) não estavam disponíveis.
- Paralelo, faixa de temperatura de carga e ajustes do BMS JK: confirmar com a Inohouse.

## Autoria
Elaborado com IA (Claude, Anthropic; modelo configurado `claude-sonnet-5`) sob supervisão de profissionais da Soluções Solares Ltda, para fins de consultoria teórica; sem responsabilidade por execução de terceiros.
