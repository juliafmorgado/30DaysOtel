# Guia Rápido de Certificação OpenTelemetry

> **Objetivo**: Consulta rápida para definições, padrões e configurações. Para estratégia de prova e prática, veja o [Guia de Preparação para o Exame](./otca-preparacao-prova.md).

---

## Se Você Não Lembrar de Mais Nada...

1. **service.name é um resource attribute**, não um span attribute
2. **Propagators ≠ Exporters** - Propagators cuidam do contexto (headers), exporters enviam telemetry para os backends
3. **Links ≠ Parent/Child** - Links relacionam spans entre traces diferentes; parent/child é hierárquico dentro de um mesmo trace
4. **Tail sampling geralmente acontece no Collector**, não no SDK (o SDK faz head-based sampling)
5. **Attributes de alta cardinalidade destroem os backends de metric** - Nunca use trace_id, user_id, etc. como labels de metric
6. **Counters são monotônicos** - Use UpDownCounter se os valores podem diminuir
7. **O batch processor está no SDK**, não só no Collector (embora o Collector também tenha o dele)
8. **A context propagation acontece na criação do span**, não no momento do export
9. **Variáveis de ambiente têm prioridade menor** que a configuração programática do resource
10. **Extensions não processam telemetry** - Elas fornecem capacidades operacionais (health checks, pprof, etc.)

---

## Os Três Sinais

### Traces
- Mostram o fluxo de requisições em sistemas distribuídos
- Componentes: Trace ID → Spans → Attributes/Events
- As relações parent-child formam a árvore do trace

### Metrics
- **Counter**: Monotônico, só aumenta (requests_total, bytes_sent)
- **UpDownCounter**: Pode aumentar/diminuir (active_connections, queue_size)
- **Histogram**: Distribuição de valores (request_duration, response_size)
- **Gauge**: Valor atual em um ponto no tempo (cpu_temperature, memory_usage)

### Logs
- Eventos discretos com timestamps
- Podem ser correlacionados com traces via trace_id/span_id

---

## Modelo de Dados Principal

| Componente | Propósito | Exemplo |
|-----------|---------|---------|
| **Resource** | Entidade que produz a telemetry | service.name, host.name, deployment.environment |
| **Escopo De Instrumentação** | Biblioteca que criou a telemetry | name, version |
| **Attributes** | Contexto em formato chave-valor | http.request.method, db.system |
| **Events** | Ocorrências com timestamp | exceptions, cache hits |
| **Links** | Relações entre spans | job em batch → requisições que o disparam |
| **Baggage** | Contexto transversal propagado junto com as requisições | tenant_id, user_tier (só baixa cardinalidade!) |

---

## API vs SDK

- **API**: Interfaces específicas de cada linguagem para instrumentação (estável, agnóstica de vendor)
- **SDK**: Implementação que processa e exporta os dados (configurável, plugável)
- **Separação**: Instrumenta uma vez, troca de backend sem mudar código

---

## Comportamento dos Samplers de Relance

| Sampler | Comportamento | Caso de Uso |
|---------|----------|----------|
| AlwaysOn | Amostra 100% | Desenvolvimento, debugging |
| AlwaysOff | Amostra 0% | Desabilitar tracing |
| TraceIdRatioBased | Probabilístico (ex: 10%) | Controle de custo em produção |
| ParentBased | Herda a decisão do parent | Traces distribuídos consistentes |

**Chave**: Head-based (SDK, na criação do span) vs Tail-based (Collector, depois que o trace termina)

---

## Context Propagation

**Dentro do processo**: Armazenamento thread-local ou async-local
**Entre processos**: HTTP headers (traceparent, tracestate)
**Baggage**: Questões transversais de baixa cardinalidade (tenant_id, user_tier)

**Padrões**: W3C Trace Context (padrão), B3, Jaeger

---

## Esqueleto de Pipeline do Collector

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  memory_limiter:
    limit_mib: 512
    check_interval: 1s
  batch:
    timeout: 1s
    send_batch_size: 1024

exporters:
  otlp:
    endpoint: http://backend:4317
  logging:
    loglevel: debug

extensions:
  health_check:
    endpoint: 0.0.0.0:13133
  zpages:
    endpoint: 0.0.0.0:55679

service:
  extensions: [health_check, zpages]
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp, logging]
```

**Regra de ordem dos processors**: memory_limiter primeiro, batch por último

---

## Padrões de Deployment

| Padrão | Deployment | Benefícios | Caso de Uso |
|---------|-----------|----------|----------|
| **Agent** | Um por host (DaemonSet) | Baixa latência, métricas do host | Apps de alto volume |
| **Gateway** | Instâncias centralizadas | Enforcement de políticas, controle de custo | Transformações complexas |
| **Hybrid** | Agents + Gateway | O melhor dos dois mundos | Recomendado para produção |

---

## Convenções Semânticas

### Resource Attributes (nível de entidade)
- `service.name` (obrigatório)
- `service.version`
- `deployment.environment` (prod, staging, dev)
- `host.name`, `host.id`

### Span Attributes (nível de requisição)
- `http.request.method` (GET, POST) - semconv HTTP estável v1.x
- `http.response.status_code` (200, 404)
- `db.system` (postgresql, mysql)
- `db.statement` (query SQL)
- `server.address`, `server.port` (informação do peer service)
- `network.peer.address` (endereço IP)

**Observação**: Prefira `server.address` quando você souber qual é o serviço remoto lógico (para service graphs)

### Span Kinds
- CLIENT: Requisição de saída
- SERVER: Requisição de entrada
- INTERNAL: Operação interna
- PRODUCER: Produtor de mensagem
- CONSUMER: Consumidor de mensagem

---

## Guia Rápido de OTTL

**Contexts**: resource, scope, span, metric, datapoint, log

**Funções Comuns**:
```yaml
# Definir attribute
set(attributes["key"], "value")

# Deletar attribute
delete_key(attributes, "key")

# Condicional
set(attributes["env"], "prod") where service.name == "api"

# Operações com strings
Concat([attributes["method"], " ", attributes["path"]], "")
```

---

## Cola de Variáveis de Ambiente

```bash
# Identidade do serviço
OTEL_SERVICE_NAME=my-service
OTEL_RESOURCE_ATTRIBUTES=service.version=1.0.0,deployment.environment=prod

# Endpoint OTLP
OTEL_EXPORTER_OTLP_ENDPOINT=http://collector:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_EXPORTER_OTLP_HEADERS="authorization=Bearer token"

# Sampling
OTEL_TRACES_SAMPLER=traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1  # 10%

# Batch processor
OTEL_BSP_SCHEDULE_DELAY=5000  # ms
OTEL_BSP_MAX_QUEUE_SIZE=2048
OTEL_BSP_MAX_EXPORT_BATCH_SIZE=512

# Propagators
OTEL_PROPAGATORS=tracecontext,baggage
```

**Prioridade**: Variáveis de ambiente (mais baixa) < Resource detectors < Configuração programática (mais alta)

---

## Lista do Que Não Fazer

### Matadores de Cardinalidade
❌ **Nunca** use valores de alta cardinalidade como attributes de metric:
- trace_id, span_id
- user_id, session_id
- request_id, transaction_id
- URLs completas com query params

✅ **Faça** use attributes de baixa cardinalidade:
- endpoint (templated: `/users/{id}`)
- http_method (GET, POST)
- status_code (200, 404)
- environment (prod, staging)

### Segredos e PII
❌ **Nunca** coloque na telemetry:
- Senhas, API keys, tokens
- Números de cartão de crédito, CPF/SSN
- Endereços de e-mail completos, números de telefone
- Tokens JWT em baggage

✅ **Faça** a redação (redact) no Collector com o processor attributes/transform

### Context Propagation
❌ **Não faça**:
- Criar novos root spans para chamadas de saída (quebra os traces)
- Colocar dados grandes em baggage (há limites de tamanho, e propaga para todo lugar)
- Esquecer de extrair o contexto nas requisições de entrada

✅ **Faça**:
- Use o contexto atual como parent para os child spans
- Mantenha o baggage pequeno e de baixa cardinalidade
- Verifique a presença do header traceparent

---

## Componentes do Collector

### Receivers (dados entrando)
- **otlp**: Nativo do OpenTelemetry
- **prometheus**: Faz scrape de metrics
- **filelog**: Faz parse de arquivos de log
- **jaeger**: Traces do Jaeger

### Processors (transformação de dados)
- **memory_limiter**: Evita OOM (use primeiro!)
- **batch**: Agrupa para ganhar eficiência (muito usado em produção)
- **attributes**: Adiciona/modifica/deleta attributes
- **filter**: Descarta dados indesejados
- **transform**: Transformações via OTTL

### Exporters (dados saindo)
- **otlp**: Export nativo
- **prometheus**: Endpoint de metrics
- **logging**: Debug para o stdout
- **file**: Exporta para arquivos

### Extensions (operacional)
- **health_check**: Liveness/readiness
- **zpages**: Debugging ao vivo
- **pprof**: Profiling do Go

---

## Problemas Comuns → Soluções Rápidas

| Sintoma | Causa Mais Provável | Correção |
|---------|------------------|-----|
| service.name="unknown_service" | Resource não configurado | Configure OTEL_SERVICE_NAME ou OTEL_RESOURCE_ATTRIBUTES |
| Traces fragmentados | Context propagation quebrada | Verifique a injeção/extração do header traceparent |
| Spans descartados | Overflow na queue ou limite de memória | Aumente o tamanho da queue, verifique a performance do exporter |
| Sem spans de DB (auto-instr) | Biblioteca não suportada | Verifique a compatibilidade da biblioteca de instrumentação |
| Explosão de alta cardinalidade | Attributes de metric errados | Remova labels de alta cardinalidade (user_id, trace_id) |
| Falhas de export | Conectividade com o backend | Verifique o endpoint, a autenticação, a rede |

---

## Checklist de Segurança

✅ Use TLS/mTLS para os endpoints OTLP
✅ Faça a redação de PII no Collector (processor attributes/transform)
✅ Autentique os exporters (API keys, OAuth)
✅ Implemente políticas de retenção de dados
✅ Monitore anomalias
✅ Use network policies no Kubernetes

---

## Boas Práticas para Produção

1. **Sempre use o memory_limiter** (primeiro processor)
2. **Sempre use o batch processor** (último processor, antes do export)
3. **Configure o sending_queue** nos exporters (buffer durante interrupções)
4. **Habilite o retry_on_failure** (lida com falhas transitórias)
5. **Monitore a saúde do Collector** (métricas na porta 8888)
6. **Use o padrão agent + gateway** (recomendado para produção)
7. **Implemente sampling adequado** (controle de custo)
8. **Siga as convenções semânticas** (interoperabilidade)
9. **Teste a context propagation** (distributed tracing)
10. **Planeje para escala** (escalonamento horizontal, load balancing)

---

**Última atualização**: janeiro de 2026
**Versão do exame**: OTCA (OpenTelemetry Certified Associate)
