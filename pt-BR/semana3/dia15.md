# Dia 15 – Arquitetura do Collector: Entendendo o Pipeline de Processamento de Dados

Bem-vindo à Semana 3! Depois de dominar as APIs e o SDK do OpenTelemetry na Semana 2, agora estamos prontos para explorar o **OpenTelemetry Collector**, um serviço standalone poderoso que consegue receber, processar e exportar telemetry data.

Pense nisso como sair de um **assistente pessoal** (o SDK) para um **centro completo de processamento** (o Collector). Enquanto o SDK cuida da telemetry dentro da sua aplicação, o Collector é como ter uma equipe dedicada especializada em coletar, organizar e distribuir telemetry data de várias aplicações.

> **Foco de hoje:** Só visão geral da arquitetura. Vamos entender O QUE é o Collector e COMO ele é estruturado, sem entrar a fundo nos detalhes de configuração.

---

## O Problema: Limitações do SDK em Escala

Na Semana 2, usamos o SDK para processar telemetry. Isso funciona muito bem para uma única aplicação, mas imagine que estamos rodando uma plataforma de e-commerce com:
- Frontend web (React)
- API server (Node.js)
- Serviço de pagamento (Go)
- Serviço de inventário (Python)

**Com a abordagem só-SDK:**
- Cada serviço precisa da própria configuração de telemetry
- Quer adicionar um novo backend? Atualize e faça redeploy dos 4 serviços
- Quer mudar as taxas de sampling? Atualize e faça redeploy dos 4 serviços
- Cada serviço usa os próprios recursos para processar telemetry

---

## A Solução: OpenTelemetry Collector

O Collector é um **serviço standalone** que atua como um hub centralizado de processamento de telemetry. Pense nele como os correios. Em vez de cada pessoa entregar sua própria correspondência (os dados) direto para os destinatários (os backends), todo mundo deixa a correspondência nos correios, e eles é que recebem, processam e entregam.

**Antes do Collector (só SDK):**
```
Frontend → SDK → Backend
API → SDK → Backend  
Payment → SDK → Backend
Inventory → SDK → Backend
```

**Com o Collector:**
```
Frontend   → SDK →
API        → SDK →        ┌────────────┐
Payment    → SDK → ─────▶ │  Collector │
Inventory  → SDK →        └────────────┘
                               │
                 ┌─────────────┼─────────────┐
                 │             │             │
              Dash0/Jaeger Dash0/Prometheus  Dash0
              (traces)      (metrics)        (logs)

```

**Principais benefícios:**
- **Configuração centralizada**: Muda de backend sem mexer no código da aplicação
- **Processamento avançado**: Filtragem, transformações e roteamento complexos
- **Escalabilidade independente**: Escale o processamento de telemetry separado das aplicações

> [!IMPORTANT]
> O Collector não substitui o SDK. Eles trabalham juntos.
>
> O SDK vive dentro da sua aplicação e faz coisas que o Collector não consegue:
> - Cria spans, metrics e logs
> - Cuida do context propagation
> - Instrumenta bibliotecas (HTTP, DB, mensageria)
> - Sabe o que está acontecendo dentro do código
>
> Sem um SDK, o Collector não teria nada para receber da maioria das aplicações.
>
> O SDK continua criando telemetry e enviando para fora. O Collector recebe, processa e roteia.

---

## Arquitetura do Collector: O Modelo de Pipeline

O Collector processa dados através de **pipelines**. Pense em linhas de montagem onde os dados passam por estágios:

```
Receivers → Processors → Exporters
    ↓           ↓           ↓
  "Receive    "Transform    "Send
   data"       data"       data"
```

### Exemplo de fluxo de dados:
1. O **receiver** recebe telemetry da sua aplicação Node.js
2. O **processor** adiciona labels de ambiente e otimiza os dados para exportação
3. O **exporter** envia traces para o Jaeger e metrics para o Prometheus, ou tudo para o Dash0

---

## Receivers: Como os Dados Entram

Os receivers são o lado de **entrada** do Collector, como diferentes tipos de caixa de correio que aceitam correspondência em formatos diferentes. Cada receiver sabe entender um protocolo ou formato específico.

> Às vezes precisamos de receivers diferentes porque podemos ter aplicações modernas mandando dados via OTLP, aplicações legadas que só sabem expor metrics no formato Prometheus, serviços de terceiros que mandam dados no próprio formato deles, etc. Então, em vez de forçar toda aplicação a falar a mesma língua, o Collector oferece receivers que entendem várias "línguas" diferentes.

### Tipos comuns de receiver:

**OTLP Receiver** (o falante nativo):
```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317 # Port for gRPC protocol
      http:
        endpoint: 0.0.0.0:4318 # Port for HTTP protocol
```
Aceita dados de SDKs do OpenTelemetry usando gRPC (mais rápido, binário -> tipo mandar um arquivo compactado) ou HTTP (mais fácil de debugar -> tipo mandar texto legível).

Nossa aplicação Node.js da Semana 2 pode mandar telemetry tanto para `collector:4317` quanto para `http://collector:4318`.

<details>
<summary><strong>O que é OTLP?</strong></summary>

OTLP é o protocolo padrão do OpenTelemetry. É a forma padrão de transmitir telemetry data entre aplicações, Collectors e observabilidade backends.

**Na prática:**
```
// Week 2: Direct to Jaeger
traceExporter: new OTLPTraceExporter({
  url: "http://localhost:4318/v1/traces"  // Traces sent direct to Jaeger
})

// With Collector: Same code, different URL
traceExporter: new OTLPTraceExporter({
  url: "http://collector:4318/v1/traces"  // Traces sent direct to Collector instead
})
```

O OTLP deixa a sua configuração de telemetry flexível. Você consegue trocar de "direto pro backend" para usar um Collector sem mudar nada no código da sua aplicação. Só a URL do endpoint muda.

</details>

**Prometheus Receiver** (o tradutor):
```yaml
receivers:
  prometheus:
    config:
      scrape_configs:
        - job_name: 'my-app'
          static_configs:
            - targets: ['localhost:8080']
```
Faz scrape de metrics de endpoints Prometheus e converte para o formato OpenTelemetry.

**Filelog Receiver** (o leitor de arquivos):
```yaml
receivers:
  filelog:
    include: [/var/log/*.log]
```
Lê arquivos de logs do disco e converte para o formato OTel.

---

## Processors: Como os Dados São Transformados

Os processors ficam no **meio** do pipeline. Eles podem modificar, filtrar, enriquecer ou reorganizar telemetry data antes de ela ser exportada.

> Telemetry data crua geralmente precisa de um trabalho antes de ficar útil, porque às vezes queremos filtrar traces barulhentos ou sem importância, ou os dados estão sem contexto, ou estão num formato ineficiente, ou tem informação sensível ali.

### Tipos comuns de processor explicados:

**Batch Processor**:
Isso costumava ser amplamente recomendado como a abordagem padrão, mas recentemente isso [começou a mudar](https://github.com/open-telemetry/opentelemetry-collector/issues/13582). O OpenTelemetry está movendo a lógica de batching para dentro dos [exporters](https://github.com/open-telemetry/opentelemetry-collector/issues/8122) para melhorar a confiabilidade, já que exporters modernos conseguem lidar com batching internamente usando armazenamento persistente. Vamos entrar mais a fundo nisso no [Dia 17](./dia17.md).

**Attributes Processor** (o etiquetador):
```yaml
processors:
  attributes:
    actions:
      - key: environment
        value: production
        action: insert # Add the label environment=production to all data
```
Adiciona, modifica ou remove attributes (labels) na telemetry data.

**Filter Processor** (o segurança):
```yaml
processors:
  filter:
    traces:
      span:
        - 'attributes["http.response.status_code"] == 404' # Drop 404 errors to reduce costs
```
Descarta telemetry data indesejada com base em regras que a gente define.

---

## Exporters: Como os Dados Saem

Os exporters são o lado de **saída** do Collector, e eles mandam os dados processados para os backends.

Eles são como serviços de entrega especializados que sabem como entregar pacotes em destinos diferentes, no formato que cada destino espera.

### Tipos comuns de exporter explicados:

**OTLP Exporter** (o padrão moderno):
```yaml
exporters:
  otlp:
    endpoint: https://api.dash0.com:4317
    headers:
      authorization: "Bearer your-token"
```
Manda telemetry data usando o OpenTelemetry Protocol (OTLP), o padrão da indústria.

> **Backends OpenTelemetry-Native**
>
> Plataformas modernas como o **Dash0** são construídas para OpenTelemetry:
>
> - Usam OTLP padrão (não precisa de exporter específico de vendor)
> - Entendem convenções semânticas nativamente
> - Não precisa de transformação de dados
>
> Essa é a vantagem do ecossistema OpenTelemetry — suporte nativo significa configuração mais simples.

**Prometheus Exporter** (o especialista em metrics):
```yaml
exporters:
  prometheus:
    endpoint: "0.0.0.0:8889"
```
Converte metrics do OpenTelemetry para o formato Prometheus e expõe elas num endpoint HTTP que o Prometheus consegue fazer scrape.

**Logging Exporter** (o amigo de quem tá debugando):
```yaml
exporters:
  logging:
    loglevel: debug
```
Imprime a telemetry data no console/logs do Collector (ótimo para debugar).

---

## Pipelines: Conectando Tudo

Pipelines definem como receivers, processors e exporters trabalham juntos. Cada pipeline cuida de um tipo de telemetry, então cada uma pode ter uma lógica de processamento completamente diferente.

> A gente separa cada pipeline porque elas têm necessidades de processamento diferentes (traces podem precisar de filtragem complexa, enquanto metrics precisam de outras otimizações) e destinos diferentes; elas têm necessidades de escala diferentes e isso ajuda a isolar problemas (se o pipeline de traces tiver problema, seus metrics e logs continuam fluindo normalmente).

```yaml
service:
  pipelines:
    traces:                    # This pipeline handles trace data
      receivers: [otlp]        # Get traces from OTLP receiver
      processors: []           # Modern exporters handle batching internally
      exporters: [jaeger]      # Send them to Jaeger
    
    metrics:                   # This pipeline handles metric data
      receivers: [otlp, prometheus]  # Get metrics from two sources
      processors: [attributes] # Apply attributes
      exporters: [prometheus]  # Send them to Prometheus
    
    logs:                      # This pipeline handles log data
      receivers: [otlp, filelog] # Get logs from OTLP and files
      processors: []           # Keep it simple for logs
      exporters: [logging]     # Print them to console
```

---

## Exemplo Completo: Plataforma de E-commerce

**Passo 1: Definir os Componentes**

**Passo 2: Conectá-los em Pipelines**

Pense da seguinte forma:
- Primeiro: "Aqui estão todas as ferramentas que tenho disponíveis" (receivers, processors, exporters)
- Depois: "Aqui está como eu quero conectar essas ferramentas para cada tipo de telemetry" (pipelines)

Aqui está a configuração completa do Collector:

```yaml
receivers: # How data gets in
  otlp:  # Accept OTel data from your app
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317 # Your apps send to this port

processors: # How data gets transformed
  attributes: # Add environment labels to all data
    actions:
      - key: environment
        value: production
        action: insert
  
  filter: # Filter out noisy traces to save money
    traces:
      span:
        - 'name == "GET /health"'  # Remove health checks

exporters: # Exporters: How data gets out
  jaeger: # Send traces to Jaeger
    endpoint: jaeger:14250
  
  prometheus: # Expose metrics for Prometheus to scrape
    endpoint: "0.0.0.0:8889"
  
  otlp/dash0: # Send everything to modern observabilidade platform
    endpoint: https://api.dash0.com:4317
    headers:
      authorization: "Bearer token"

service: # Orchestrating everything
  pipelines: # Data processing pipelines
    traces: # Trace pipeline: Filter noise, add labels, send to multiple destinations
      receivers: [otlp]
      processors: [filter, attributes] # Order matters!
      exporters: [jaeger, otlp/dash0]
    
    metrics: # Metrics pipeline: Simple processing, multiple destinations
      receivers: [otlp]
      processors: [attributes]
      exporters: [prometheus, otlp/dash0]
```

Essa única configuração de Collector cuida da telemetry de dezenas de microsserviços, processa tudo de forma inteligente e entrega para vários backends, tudo isso sem nenhuma mudança no código da sua aplicação.


---

## Por Que Usar o Collector?

Depois de ver a arquitetura, você deve estar se perguntando: "Por que não simplesmente usar o SDK direto?"

Vamos imaginar um cenário em que estamos rodando uma plataforma de e-commerce em crescimento que manda traces para o Jaeger, mas queremos adicionar o Dash0 para ter analytics melhor.

**Com a abordagem só-SDK (o que aprendemos na Semana 2):**
- Atualizar 4 configurações de serviço
- Fazer redeploy de todos os serviços
- Testar cada serviço individualmente
- Risco: problemas de deployment podem quebrar a observabilidade

**Com o Collector (o que estamos aprendendo essa semana):**
- Adicionar um exporter na configuração do Collector
- Reiniciar só o Collector
- Todos os serviços automaticamente passam a mandar para os dois backends
- Risco: mínimo, mudança isolada

> O Collector transforma observabilidade de um problema distribuído (cada serviço se vira sozinho) para uma solução centralizada (um hub inteligente) que escala junto com a nossa organização.

---

## O Que NÃO Estamos Cobrindo Hoje

Hoje é só visão geral da arquitetura (o "o quê" e o "por quê" antes de entrar no "como"). Essa semana vamos mergulhar na implementação detalhada.

---

## O Que Estou Levando Para o Dia 16

**O Collector é um hub de processamento de telemetry:**
- **Cada pipeline cuida de um tipo de telemetry** (traces, metrics, logs) e pode ser configurado de forma independente.
- **Os dados fluem por estágios:** Entrada → Transformação → Saída, cada estágio com uma responsabilidade específica.
- **Os componentes são plugáveis:** Misture e combine receivers, processors e exporters como blocos de montar.
- O Collector transforma o OpenTelemetry de "uma aplicação → um backend" para "várias aplicações → vários backends"

**Amanhã (Dia 16)** vamos mergulhar fundo em **Receivers** e aprender a configurar diferentes fontes de entrada, entendendo os vários protocolos e formatos que o Collector consegue aceitar.

Nos vemos no Dia 16!
