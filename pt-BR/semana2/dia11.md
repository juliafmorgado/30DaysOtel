# Dia 11 – Logs API: Logging Estruturado Simples

Nos últimos dois dias, aprendemos a Tracing API ([Dia 9](https://github.com/juliafmorgado/30DaysOtel/blob/main/week2/day9.md)) e a Metrics API ([Dia 10](https://github.com/juliafmorgado/30DaysOtel/blob/main/week2/day10.md)). Hoje completamos o trio da observabilidade com **logging básico**, para conseguirmos responder perguntas como "o que exatamente aconteceu nessa saudação que falhou?"

> **Exemplo prático:** O código completo deste tutorial está disponível em [`examples/day11-logs-api/`](../examples/day11-logs-api/)
>
> **Observação:** Isso é uma continuação dos Dias 9 e 10. Se você ainda não os fez, comece por lá: [`examples/day9-tracing-api/`](../examples/day9-tracing-api/)

---

## O que já sabemos da Semana 1

Já vimos alguns conceitos de logging:

- **[Dia 3](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day3.md):** Logs trazem informações detalhadas sobre eventos, traces mostram o fluxo das requisições
- **[Dia 6](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day6.md):** Auto-instrumentação já cria alguns logs automaticamente

Hoje o foco é criar **nossos próprios logs simples** usando a Logs API.

---

## Logs vs Traces vs Metrics: a diferença simples

| Traces | Metrics | Logs |
|--------|---------|------|
| Fluxo de requisições individuais | Padrões entre requisições | Mensagens detalhadas sobre eventos |
| "A saudação da Alice levou 105ms" | "Enviamos 50 saudações hoje" | "Saudação falhou: nome muito longo" |
| "Por que essa requisição falhou?" | "Quantas requisições estão falhando?" | "O que exatamente deu errado?" |
| Mostra a jornada/história de uma requisição | Mostra as estatísticas | Mostra os detalhes |

---

## Logging Tradicional vs Logging Estruturado

### Logging Tradicional (como fazíamos antes)
```javascript
console.log('Greeting failed for user Alice with error name too long');
```

**Problemas:**
- Difícil de buscar usuários ou erros específicos
- Nenhuma conexão com traces
- Não é legível por máquina

### Logging Estruturado (do jeito OpenTelemetry)
```javascript
logger.emit({
  severityText: 'ERROR',
  body: 'Greeting processing failed',
  attributes: {
    'user.name': 'Alice',
    'error.message': 'name too long'
  }
});
```

**Benefícios:**
- Fácil de buscar e filtrar
- Conectado automaticamente aos traces
- Legível por máquina

---

## A mágica: correlação automática com o trace

Quando você cria um log dentro de um span, o OpenTelemetry adiciona automaticamente o trace ID e o span ID:

```javascript
tracer.startActiveSpan("create_greeting", span => {
  logger.emit({ body: "Greeting started" });
  // This log automatically gets trace_id and span_id!
});
```

**Isso significa que:**
- Vê um trace que falhou → encontra todos os logs daquela requisição
- Vê um log de erro → pula direto para o trace exato
- Entende o que aconteceu, onde e quando

---

## O que vamos construir hoje

Vamos adicionar **logging estruturado simples** à API de saudação dos Dias 9 e 10:

**Logs que vamos criar:**
1. **Saudação iniciada** - Quando o processamento começa
2. **Saudação concluída** - Quando a saudação é bem-sucedida  
3. **Saudação falhou** - Quando alguma etapa falha

É isso! Logging simples para capturar o que está acontecendo.

---

## Etapa 1: Configurando o projeto

Se você terminou o [Dia 10](../examples/day10-metrics-api), copie o projeto:

```bash
cp -r day10-metrics-api day11-logs-api
cd day11-logs-api
```

Se estiver começando do zero:

```bash
mkdir day11-logs-api
cd day11-logs-api
npm init -y
```

**Instale as dependências:**

```bash
npm install express \
  @opentelemetry/api \
  @opentelemetry/sdk-node \
  @opentelemetry/sdk-metrics \
  @opentelemetry/sdk-logs \
  @opentelemetry/resources \
  @opentelemetry/semantic-conventions \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-trace-otlp-http \
  @opentelemetry/exporter-metrics-otlp-http \
  @opentelemetry/exporter-logs-otlp-http
```

---

## Etapa 2: Atualizando a instrumentação para incluir logs

Vamos atualizar o `instrumentation.js` para exportar traces, metrics E logs:

```javascript
// instrumentation.js
const { NodeSDK } = require("@opentelemetry/sdk-node");
const { getNodeAutoInstrumentations } = require("@opentelemetry/auto-instrumentations-node");
const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-http");
const { OTLPLogExporter } = require("@opentelemetry/exporter-logs-otlp-http");
const { ConsoleMetricExporter, PeriodicExportingMetricReader } = require("@opentelemetry/sdk-metrics");
const { BatchLogRecordProcessor } = require("@opentelemetry/sdk-logs");
const { resourceFromAttributes } = require("@opentelemetry/resources");
const { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } = require("@opentelemetry/semantic-conventions");

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: "greeting-service",
    [ATTR_SERVICE_VERSION]: "1.0.0",
  }),
  
  // Traces to Jaeger (from Day 9)
  traceExporter: new OTLPTraceExporter({
    url: "http://localhost:4318/v1/traces",
  }),
  
  // Metrics to console (from Day 10)
  metricReader: new PeriodicExportingMetricReader({
    exporter: new ConsoleMetricExporter(),
    exportIntervalMillis: 10000, // Export every 10 seconds for faster feedback
  }),
  
  // Logs (NEW for Day 11)
  logRecordProcessor: new BatchLogRecordProcessor(
    new OTLPLogExporter({
      url: "http://localhost:4318/v1/logs",
    })
  ),
  
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
console.log("OpenTelemetry initialized (traces + metrics + logs)");
```

**O que mudou:**
- Adicionamos a exportação de logs junto com traces e metrics
- Os logs são enviados para backends que suportam OTLP logs
- Continuamos usando as console metrics do Dia 10 para facilitar o aprendizado

---

## Etapa 3: Obtendo um Logger (assim como fizemos com Tracer e Meter)

Pense assim:
- **Tracer** = cria spans (para traces)
- **Meter** = cria counters (para metrics)
- **Logger** = cria mensagens de log (para logs)

```javascript
// app.js
const express = require('express');
const { trace, metrics } = require('@opentelemetry/api');
const { logs } = require('@opentelemetry/api-logs');

const app = express();

// Get a tracer (from Day 9)
const tracer = trace.getTracer('greeting-service', '1.0.0');

// Get a meter (from Day 10)
const meter = metrics.getMeter('greeting-service', '1.0.0');

// Get a logger (NEW for Day 11)
const logger = logs.getLogger('greeting-service', '1.0.0');

// =========================
// METRICS (from Day 10)
// =========================

// Create counters once at startup
const greetingsTotal = meter.createCounter("greetings_sent_total", {
  description: "Total number of greetings sent",
});

const requestsTotal = meter.createCounter("requests_received_total", {
  description: "Total number of requests received",
});

const popularNames = meter.createCounter("popular_names_total", {
  description: "Count of greetings by name",
});

const greetingErrors = meter.createCounter("greeting_errors_total", {
  description: "Total number of greeting errors",
});

// =========================
// GREETING ENDPOINT (building on Days 9 & 10)
// =========================

app.get('/hello/:name', (req, res) => {
  // Count this request (from Day 10)
  requestsTotal.add(1);
  
  // Create a span for our greeting operation (from Day 9)
  tracer.startActiveSpan('create_greeting', (span) => {
    const name = req.params.name;
    
    // Add attributes to describe what we're doing (from Day 9)
    span.setAttribute('user.name', name);
    span.setAttribute('greeting.type', 'personal');
    
    // LOG: Greeting started (NEW for Day 11)
    logger.emit({
      severityText: "INFO",
      body: "Greeting processing started",
      attributes: {
        "user.name": name,
        "greeting.type": "personal",
      },
    });
    
    // Add an event to mark when we start processing (from Day 9)
    span.addEvent('processing_started');
    
    // Simple validation (NEW - to demonstrate error logging)
    if (name.length > 50) {
      // Count this error (NEW for Day 11)
      greetingErrors.add(1);
      
      // LOG: Greeting failed (NEW for Day 11)
      logger.emit({
        severityText: "ERROR",
        body: "Greeting processing failed",
        attributes: {
          "user.name": name,
          "error.message": "name too long",
          "name.length": name.length,
        },
      });
      
      span.recordException(new Error('Name too long'));
      span.setStatus({ code: 2, message: 'Name exceeds maximum length' }); // ERROR status
      span.end();
      
      return res.status(400).json({ 
        error: 'Name too long. Maximum 50 characters allowed.',
        provided_length: name.length
      });
    }
    
    // Simulate some processing time
    setTimeout(() => {
      // Create a nested span for message formatting (from Day 9)
      tracer.startActiveSpan('format_message', (formatSpan) => {
        const message = `Hello, ${name}! Welcome to OpenTelemetry tracing, metrics, and logs.`;
        
        formatSpan.setAttribute('message.length', message.length);
        formatSpan.addEvent('message_formatted');
        formatSpan.end();
        
        // Count this greeting (from Day 10)
        greetingsTotal.add(1);
        
        // Count this specific name (from Day 10)
        popularNames.add(1, { name: name });
        
        // LOG: Greeting completed successfully (NEW for Day 11)
        logger.emit({
          severityText: "INFO",
          body: "Greeting processing completed successfully",
          attributes: {
            "user.name": name,
            "message.length": message.length,
            "processing.duration_ms": 100, // We know it's ~100ms
          },
        });
        
        // Add final attributes and events to parent span (from Day 9)
        span.setAttribute('response.message', message);
        span.addEvent('processing_completed');
        span.setStatus({ code: 1 }); // OK status
        span.end();
        
        res.json({ 
          message,
          timestamp: new Date().toISOString()
        });
      });
    }, 100);
  });
});

// Health check endpoint (no manual instrumentation)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Greeting service listening on port ${PORT}`);
  console.log('Logs will be sent to OTLP endpoint, metrics shown in console every 10 seconds');
});
```

**O que é novo no Dia 11:**
- **`logger.emit()`** - Cria mensagens de log estruturadas
- **`severityText: "INFO"`** - Operações normais
- **`severityText: "ERROR"`** - Quando algo falha
- **`attributes`** - Dados estruturados (nome do usuário, mensagem de erro etc.)
- **Validação simples** - Adicionamos uma checagem do tamanho do nome para demonstrar o logging de erros

**Padrão importante:** Registramos logs no início, no sucesso e na falha, para capturar os eventos principais.

---

## Etapa 5: Rodando o Jaeger (para traces)

```bash
docker run -d --name jaeger \
  -p 16686:16686 \
  -p 4318:4318 \
  jaegertracing/all-in-one:latest
```

Jaeger UI: http://localhost:16686

---

## Etapa 6: Rodando a aplicação

```bash
node --require ./instrumentation.js app.js
```

Devemos ver:
```
OpenTelemetry initialized (traces + metrics + logs)
Greeting service listening on port 3000
Logs will be sent to OTLP endpoint, metrics shown in console every 10 seconds
```

---

## Etapa 7: Gerando tráfego para ver os logs

Envie várias requisições para gerar logs:

```bash
# Send successful greetings
curl http://localhost:3000/hello/Alice
curl http://localhost:3000/hello/Bob
curl http://localhost:3000/hello/Charlie

# Send a greeting that will fail (name too long)
curl http://localhost:3000/hello/ThisNameIsWayTooLongAndWillCauseAnErrorBecauseItExceedsFiftyCharacters

# Send more successful greetings
curl http://localhost:3000/hello/Alice
curl http://localhost:3000/hello/David

# Generate more data
for i in {1..5}; do
  curl http://localhost:3000/hello/User$i
done
```

> Para onde vão os logs?
> 
> Diferente dos traces (que vemos no Jaeger) e das metrics (que vemos no console), os logs precisam de um backend que suporte OTLP logs:
> 
> **Para aprendizado:** Estamos enviando logs via OTLP, mas não conseguimos vê-los no Jaeger (o Jaeger é focado principalmente em traces).
> 
> **Em produção:** Os logs vão para:
> - **Dash0** - Backend nativo de OpenTelemetry com busca de logs integrada
> - **Outros vendors OTEL-native** - Qualquer backend que suporte OTLP logs
> 
> **Por enquanto:** O objetivo é emitir os logs corretamente. A visualização vem nas próximas semanas.

---

## Etapa 8: Entendendo o que registramos

Depois de enviar as requisições, nossos logs capturam:

**Saudação Iniciada** (nível INFO)
```json
{
  "severityText": "INFO",
  "body": "Greeting processing started",
  "traceId": "abc123...",
  "spanId": "def456...",
  "attributes": {
    "user.name": "Alice",
    "greeting.type": "personal"
  }
}
```

**Saudação Concluída** (nível INFO)
```json
{
  "severityText": "INFO",
  "body": "Greeting processing completed successfully",
  "traceId": "abc123...",
  "spanId": "def456...",
  "attributes": {
    "user.name": "Alice",
    "message.length": 67,
    "processing.duration_ms": 100
  }
}
```

**Saudação Falhou** (nível ERROR)
```json
{
  "severityText": "ERROR",
  "body": "Greeting processing failed",
  "traceId": "abc123...",
  "spanId": "def456...",
  "attributes": {
    "user.name": "ThisNameIsWayTooLong...",
    "error.message": "name too long",
    "name.length": 85
  }
}
```

**Repare na correlação automática:**
- `traceId` - Liga esse log ao trace no Jaeger
- `spanId` - Liga esse log ao span específico

---

## Logs + Traces + Metrics

Veja como os três funcionam juntos:

**Metrics dizem QUANDO:**
```
greeting_errors_total increased by 3 in the last hour
→ "We have a problem!"
```

**Traces dizem ONDE:**
```
Query Jaeger for failed traces in the last hour
→ See exactly which step failed
→ "All failures are in the create_greeting span"
```

**Logs dizem O QUE:**
```
Query logs for those trace IDs
→ See exact error messages
→ "Greeting failed: name too long"
```

**Exemplo de fluxo de trabalho:**
1. Percebe que o counter `greetingErrors` está subindo (metric)
2. Consulta o Jaeger em busca de traces que falharam recentemente (trace)
3. Copia o trace ID de uma falha
4. Busca os logs por esse trace ID (log)
5. Vê o erro exato: "name too long"
6. Corrige a validação ou melhora o tratamento de erro

---

## Principais aprendizados

### 1: Logging estruturado simples

```javascript
// Create structured logs
logger.emit({
  severityText: "INFO",  // or "ERROR"
  body: "What happened",
  attributes: {
    "user.name": name,
    "error.message": error.message
  }
});
```

### 2: Registre logs nos pontos-chave

```javascript
try {
  // Log when starting
  logger.emit({ severityText: "INFO", body: "Greeting started" });
  
  // ... do work ...
  
  // Log when succeeding
  logger.emit({ severityText: "INFO", body: "Greeting completed" });
} catch (error) {
  // Log when failing
  logger.emit({ 
    severityText: "ERROR", 
    body: "Greeting failed",
    attributes: { "error.message": error.message }
  });
}
```

### 3: Use nomes de atributos consistentes

```javascript
// Good attributes
"user.name", "message.length", "processing.duration_ms"
"error.message", "greeting.type"

// Bad attributes  
"userName", "msgLen", "duration"
"errorMsg", "greetType"
```

---

## O que eu levo para o Dia 12

Hoje aprendemos **logging estruturado básico**, a última peça da observabilidade básica:

**Principais habilidades:**
- Criar logs estruturados com `logger.emit()`
- Usar níveis de severidade (INFO para o normal, ERROR para falhas)
- Adicionar atributos estruturados para dar contexto
- Entender a correlação automática com o trace
- Usar logs, traces e metrics juntos

Amanhã (Dia 12) vamos aprender **context propagation básico** e entender como o trace context flui pela nossa aplicação.

Até o Dia 12!