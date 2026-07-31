# Teste de Conhecimento da Semana 3: OpenTelemetry Collector

Este teste de conhecimento foca em **como você pensa sobre o Collector**, não em decorar termos ou configurações.

Pode haver várias formas válidas de explicar uma resposta.  
Você está testando o *entendimento*, não a perfeição.
---

## Pergunta 1: Centralização

Seu time tem 6 serviços escritos em linguagens diferentes.
Cada um envia telemetry diretamente para o Jaeger.

Um dia, seu gerente pergunta:
> "Dá pra gente também mandar metrics para o Prometheus e logs para outro lugar?"

Que problema isso cria sem um Collector, e por quê?

<details>
<summary>Resposta</summary>

Sem um Collector:
- cada serviço precisa ser reconfigurado e reimplantado
- cada SDK de linguagem precisa de mudanças separadas
- mudanças de observabilidade viram mudanças na aplicação

O Collector centraliza essa decisão para que as aplicações não precisem mudar.
</details>
---

## Pergunta 2: Responsabilidade pela Decisão

Quem deveria decidir:
- quais dados são mantidos
- quais dados são descartados
- para onde os dados são enviados

O time de aplicação ou o time de plataforma?  
Por que o Collector facilita isso?

<details>
<summary>Resposta</summary>

O time de plataforma.

O Collector tira as decisões de observabilidade do código da aplicação e leva para a configuração de infraestrutura, onde podem ser alteradas sem reimplantar as aplicações.
</details>

---
## Pergunta 3: Múltiplas Fontes

Você recebe:
- traces dos SDKs do OpenTelemetry
- metrics de endpoints do Prometheus
- logs de arquivos em disco

Por que é valioso que tudo isso passe por **um único sistema** antes de chegar aos backends?

<details>
<summary>Resposta</summary>

Porque isso:
- normaliza formatos diferentes
- aplica regras de processamento consistentes
- evita ter pipelines de observabilidade separados para cada fonte de dados
</details>

---

## Pergunta 4: Trade-offs de Processamento

Você percebe que sua conta de observabilidade está crescendo rápido.

Você tem duas opções:
1. Fazer sampling dos dados em cada SDK de aplicação
2. Filtrar e otimizar os dados no Collector

Por que a opção 2 geralmente é preferida?

<details>
<summary>Resposta</summary>

Porque:
- mudanças no SDK exigem reimplantações
- filtrar em um lugar central é mais fácil de ajustar
- as mesmas regras se aplicam de forma consistente em todos os serviços
</details>

---

---

## Pergunta 5: Flexibilidade de Exportação

Sua empresa quer avaliar um novo backend de observabilidade por um mês.

Por que o Collector é útil nesse caso, mesmo que você não faça a troca definitiva?

<details>
<summary>Resposta</summary>

Porque você pode:
- adicionar um novo exporter
- enviar os mesmos dados para múltiplos backends
- avaliar sem tocar no código da aplicação
</details>

---

## Pergunta 6: Diferenças entre Signals

Por que traces, metrics e logs podem precisar de **tratamento diferente**, mesmo passando todos pelo mesmo Collector?

<details>
<summary>Resposta</summary>

Porque:
- traces geralmente são filtrados ou passam por sampling
- metrics são agregadas ao longo do tempo
- logs geralmente são parseados ou filtrados por severidade

Cada signal tem objetivos e custos diferentes.
</details>

---

## Pergunta 7: Isolamento de Falhas

O que acontece se um backend cai:
- sem um Collector
- com um Collector

Por que o Collector melhora a resiliência?

<details>
<summary>Resposta</summary>

Sem um Collector:
- as aplicações podem travar ou descartar dados
- falhas afetam o comportamento da aplicação

Com um Collector:
- retries e buffering acontecem de forma centralizada
- o comportamento da aplicação permanece inalterado
</details>

---

## Pergunta 8: Pensando em Crescimento

Sua startup cresce de 3 serviços para 30.

Que problema de observabilidade aparece *mesmo que tudo tecnicamente funcione*?

<details>
<summary>Resposta</summary>

Proliferação de configurações:
- lógica duplicada
- regras inconsistentes
- comportamento de observabilidade difícil de entender

O Collector oferece um único lugar para pensar sobre telemetry.
</details>

---

## Pergunta 9: Reconhecendo Anti-Patterns

Alguém propõe:
> "Vamos fazer toda a filtragem e roteamento dentro do código da aplicação."

Por que isso geralmente é uma má ideia?

<details>
<summary>Resposta</summary>

Porque:
- acopla observabilidade à lógica de negócio
- aumenta o número de reimplantações
- cria inconsistência entre os serviços
</details>

---

## Pergunta 10: Teste da Frase Única

Complete esta frase:

> "O OpenTelemetry Collector existe para que __________."

<details>
<summary>Exemplo de resposta</summary>

"…as aplicações continuem simples enquanto a observabilidade se torna flexível e escalável."
</details>

---

## Pontuação

- **8–10:** Você entende o *porquê* por trás do Collector  
- **6–7:** Bom entendimento, revise algumas ideias  
- **Abaixo de 6:** Releia a Semana 3 com foco em arquitetura

Lembre-se: o Collector é uma ferramenta poderosa, e dominá-la exige prática. Não se preocupe se você não acertou tudo de primeira!