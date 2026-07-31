# Preparação para o Exame OpenTelemetry Certified Associate (OTCA)

**Está pensando em fazer o exame OTCA?**

Este guia foca no que você precisa saber para o exame e em como os conceitos são cobrados.

> **Links Rápidos:**
> - [Folha de Referência Rápida](./otca-referencia-rapida.md): Definições e conceitos principais
> - [Exame Simulado](./otca-simulado.md): 60 perguntas para testar se você está pronto

**Visão Geral do Exame:**
- **Duração:** 90 minutos
- **Perguntas:** 60 de múltipla escolha
- **Nota de Aprovação:** 75% (45/60 perguntas)
- **Formato:** Online com supervisão (proctored)
- **Custo:** US$ 250
- **Validade:** 2 anos
- **Inclui uma repetição gratuita**

---

## Domínios da Certificação e Cobertura

O exame OTCA cobre 4 domínios principais:

| Domínio | Peso | Cobertura no Seu Aprendizado |
|--------|--------|----------------------|
| **Fundamentos de Observabilidade** | 18% | Semana 1 |
| **A API e o SDK do OpenTelemetry** | 46% | Semanas 1-2 |
| **O OpenTelemetry Collector** | 26% | Semana 3 |
| **Manutenção e Debug de Pipelines de Observabilidade** | 10% | Semana 4 |

---

## Domínio 1: Fundamentos de Observabilidade (18%)

### **O Que o Exame Adora Perguntar**

**Características dos Sinais:**
- Quando usar traces vs metrics vs logs
- Como os sinais se correlacionam (trace_id em logs, exemplars em metrics)
- Trade-offs entre os tipos de sinal
- Tipos de metric: Counter vs UpDownCounter vs Histogram vs Gauge

**Convenções Semânticas:**
- Diferença entre resource attributes e span attributes
- Nomes de atributos comuns (http.request.method, e não http.method)
- Por que convenções semânticas importam para interoperabilidade

**Trace Context:**
- Padrão W3C Trace Context (headers traceparent, tracestate)
- Como o trace context se propaga entre os limites dos serviços
- Diferença entre trace context e baggage

**Abordagens de Instrumentação:**
- Auto-instrumentação vs instrumentação manual: quando usar cada uma
- Limitações de cobertura da auto-instrumentação
- Considerações sobre impacto de performance

**Observabilidade vs Monitoramento:**
- Known unknowns (monitoramento) vs unknown unknowns (observabilidade)
- Capacidades de análise exploratória
- Correlação entre serviços

---

## Domínio 2: A API e o SDK do OpenTelemetry (46%)

### **O Que o Exame Adora Perguntar**

**Resource Attributes vs Span Attributes:**
- Resource: a entidade que produz o telemetry (serviço, host, container)
- Span attributes: dados específicos da requisição
- Quando usar cada um

**Tipos de Sampler:**
- Head-based (no SDK, na criação do span) vs tail-based (no Collector, depois que o trace é concluído)
- Comportamento do ParentBased: os filhos herdam a decisão de sampling do pai

**Context Propagation vs Correlação:**
- Propagation: mover o trace context entre serviços (via headers)
- Correlação: ligar os sinais de telemetry entre si (trace_id em logs, exemplars em metrics)
- São responsabilidades completamente diferentes

**Responsabilidades de Processor vs Exporter:**
- Processors: transformam/filtram dados dentro do pipeline
- Exporters: enviam os dados para os backends
- Span processors: Simple (síncrono, bloqueante) vs Batch (assíncrono, com fila)

**Prioridade de Configuração do SDK:**
- Variáveis de ambiente (prioridade mais baixa)
- Resource detectors
- Configuração programática (prioridade mais alta)

**Mecanismos de Context:**
- Dentro do processo: thread-local/async-local storage
- Entre processos: HTTP headers (traceparent, tracestate)
- Baggage: preocupações transversais (cross-cutting), só para dados de baixa cardinality!

---

## Domínio 3: O OpenTelemetry Collector (26%)

### **O Que o Exame Adora Perguntar**

**Arquitetura do Pipeline:**
- Ordem: Receivers → Processors → Exporters
- Cada tipo de sinal (traces, metrics, logs) tem seu próprio pipeline
- Connectors fazem a ponte entre pipelines (por exemplo, spanmetrics: traces → metrics)

**Padrões de Deployment:**
- Agent: em cada node, processamento local, host metrics
- Gateway: centralizado, aplicação de políticas, reduz o fanout para o backend
- Híbrido: agents + gateway para aproveitar o melhor dos dois mundos

**Ordem dos Processors:**
- O memory limiter deve vir primeiro (proteção contra OOM)
- O batch deve vir por último (antes do export)
- Transformações/filtros ficam no meio

**Batch Processor:**
- Mesmo não sendo mais recomendado, o processor de Batch ainda é muito usado e pode aparecer no exame. Existem discussões sobre promover padrões de batching/queueing do lado do exporter, mas ainda não há um prazo definido para descontinuá-lo.
- O batching melhora o throughput, mas aumenta a latência
- Configuração: max_batch_size, timeout

**Transformações com OTTL:**
- Sintaxe: `set(attributes["key"], "value")`
- Funções comuns: set, delete, truncate_all, replace_pattern
- Contexto: span, resource, scope, metric, datapoint, log

**Considerações sobre Escalabilidade:**
- Horizontal: múltiplas instâncias + load balancer
- Vertical: aumentar CPU/memória por instância
- Dimensionamento de filas e tratamento de backpressure

---

## Domínio 4: Manutenção e Debug de Pipelines de Observabilidade (10%)

### **O Que o Exame Adora Perguntar**

**Debug de Context Propagation:**
- Verifique se o header traceparent está presente nas requisições HTTP
- Confirme se os frameworks estão extraindo/injetando o context corretamente
- Fique atento a traces fragmentados (muitos traces com um único span indicam propagation quebrada)

**Debug de Pipeline:**
- Logging exporter: veja o que está sendo processado
- Metrics do Collector (porta 8888): otelcol_processor_dropped_spans, etc.
- Extensão zpages (porta 55679): inspeção do pipeline em tempo real

**Problemas Comuns:**
- Spans descartados: verifique o tamanho das filas, os limites de memória e a performance do exporter
- Spans faltando: verifique o sampling e a cobertura da instrumentação
- Latência alta: verifique o timeout do batch e a velocidade do exporter
- Cardinality alta: verifique os atributos das metrics

**Tratamento de Erros:**
- sending_queue: buffer usado durante quedas do backend
- retry_on_failure: lida com falhas transitórias
- Memory limiter: evita OOM

---

## Trilha de Labs Práticos

Pratique esses labs na ordem para desenvolver habilidades práticas:

**Lab 1: Pipeline Básico**
- App → Collector → Logging exporter
- Verifique se o telemetry está fluindo corretamente

**Lab 2: Adicionando Confiabilidade**
- Adicione o processor de batch
- Adicione o processor memory_limiter
- Observe o comportamento sob carga

**Lab 3: Adicionando Resiliência**
- Configure o sending_queue no exporter
- Configure o retry_on_failure
- Teste simulando uma queda do backend

**Lab 4: Adicionando Transformação**
- Adicione o processor transform com OTTL
- Modifique atributos, filtre dados
- Verifique se as transformações estão funcionando

**Lab 5: Adicionando Metrics a partir de Traces**
- Adicione o connector spanmetrics
- Gere metrics de contagem de requisições e latência a partir dos spans
- Exporte para um backend de metrics separado

---

## Tópicos de Alta Probabilidade

**Espere Várias Perguntas Sobre:**
- Convenções semânticas e nomenclatura de atributos
- Mecanismos de context propagation e como fazer debug deles
- Arquitetura e ordem do pipeline do Collector
- Padrões de deployment (agent vs gateway)
- Estratégias de sampling e seus trade-offs
- Prioridade de configuração do SDK (variáveis de ambiente vs programático)
- Tipos de metric e quando usar cada um
- Comportamento e configuração do batch processor
- Tratamento de erros e mecanismos de retry

---

## Estratégias para as Perguntas

**Durante o Exame:**
1. **Leia com atenção** - Fique de olho em palavras-chave como "mais provável", "melhor prática", "primeiro passo"
2. **Elimine as respostas erradas** - Muitas vezes 2 respostas já são obviamente erradas
3. **Pense de forma prática** - O que você faria em produção?
4. **Cuidado com as pegadinhas** - Revise os "Top 10 Gotchas" na [folha de referência rápida do OTCA](./otca-referencia-rapida.md)
5. **Não pense demais** - Sua primeira impressão geralmente está certa
6. **Administre bem o tempo** - 90 minutos para 60 perguntas = 1,5 minuto por pergunta

**Padrões Comuns de Pergunta:**
- "Qual é a causa mais provável?" → Pense nas configurações incorretas mais comuns
- "Qual é a melhor prática?" → Pense na confiabilidade em produção
- "O que acontece quando...?" → Pense no fluxo dos dados
- "Qual componente é responsável?" → Conheça bem a arquitetura

---

## Depois do Exame

### Se Você Passar
1. **Comemore essa conquista!**
2. **Atualize seu LinkedIn e currículo**
3. **Compartilhe seu sucesso com a comunidade**
4. **Considere certificações mais avançadas**
5. **Ajude outras pessoas a se prepararem para o exame delas**

### Se Você Não Passar
1. **Não desanime** - Muita gente precisa de mais de uma tentativa
2. **Revise seus pontos fracos** a partir do feedback do exame
3. **Estude esses tópicos com mais profundidade**
4. **Faça outro exame simulado**
5. **Agende sua repetição quando estiver pronto** (você tem uma repetição gratuita)

---

## Boa Sorte!

Você completou 30 dias de treinamento completo em OpenTelemetry. Você tem o conhecimento e as habilidades necessárias para passar no exame de certificação. Confie na sua preparação e vá mostrar tudo o que você aprendeu!

**Lembre-se**: a certificação valida o que você já sabe. Você está pronto!
