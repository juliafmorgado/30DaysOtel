# Dia 10 – Metrics API: Contando o Que Importa

Ontem aprendemos a Tracing API e criamos spans para acompanhar requisições individuais no nosso sistema. Hoje vamos adicionar **metrics básicas** para conseguirmos responder perguntas simples como "Quantos greetings a gente já mandou?" e "Qual é o nome mais popular?"

> **Exemplo funcional:** O código completo deste tutorial está disponível em [`examples/day10-metrics-api/`](../examples/day10-metrics-api/)
>
> **Observação:** Isso é uma continuação do Dia 9. Se você ainda não fez o Dia 9, comece por ele: [`examples/day9-tracing-api/`](../examples/day9-tracing-api/)

---

## O que já sabemos desde a Semana 1

A gente já teve contato com conceitos de metrics:

- **[Dia 3](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day3.md):** Metrics mostram padrões em várias requisições, traces mostram requisições individuais
- **[Dia 6](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day6.md):** Auto-instrumentação cria metrics automaticamente

O foco de hoje: criar as **nossas próprias metrics simples** usando a Metrics API.

---

## Metrics vs Traces: a diferença de forma simples

| Traces | Metrics |
|--------|---------|
| Requisições individuais | Muitas requisições combinadas |
| "O greeting da Alice levou 105ms" | "Mandamos 50 greetings hoje" |
| "Por que essa requisição específica falhou?" | "Quantas requisições estão falhando?" |
| Debugar problemas individuais | Ver padrões gerais |

**Pensa assim:**
- **Traces** = Histórias individuais ("O greeting da Alice foi processado com sucesso")
- **Metrics** = Estatísticas ("Mandamos 1.000 greetings nessa hora")

---

## O único tipo de metric que vamos aprender hoje: Counter

Para quem está começando, só precisamos entender **counters** → números que só sobem.

### Counter (conta coisas que acontecem)

Conta eventos que se acumulam ao longo do tempo: greetings enviados, requisições recebidas, erros que aconteceram.

**Exemplos:**
- `greetings_sent_total` → Quantos greetings a gente já enviou (começa em 0, só sobe)
- `requests_received_total` → Quantas requisições HTTP recebemos (começa em 0, só sobe)
- `popular_names_total` → Contagem de cada nome pedido (Alice: 5, Bob: 3, etc.)

**Regra principal:** Counters só aumentam. Eles voltam pra 0 quando sua aplicação reinicia.

---

## O que vamos construir hoje

Vamos adicionar **metrics simples de contagem** à greeting API do Dia 9:

**Metrics que vamos acompanhar:**
1. **Counter:** Total de greetings enviados
2. **Counter:** Total de requisições recebidas
3. **Counter:** Nomes mais populares (com labels)

É isso! Contagem simples para ver padrões.

---

## Passo 1: Configurar o projeto

Se você terminou o Dia 9, copie aquele projeto:

```bash
cp -r day9-tracing-api day10-metrics-api
cd day10-metrics-api
```

Se estiver começando do zero:

```bash
mkdir day10-metrics-api
cd day10-metrics-api
npm init -y
```

**Instale as dependências:**

```bash
npm install express \
  @opentelemetry/api \
  @opentelemetry/sdk-node \
  @opentelemetry/sdk-metrics \
  @opentelemetry/resources \
  @opentelemetry/semantic-conventions \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-trace-otlp-http \
  @opentelemetry/exporter-metrics-otlp-http
```

---

## Passo 2: Atualizar a instrumentação para incluir metrics

Atualize o `instrumentation.js` para exportar metrics junto com os traces:

```javascript
// instrumentation.js
const { NodeSDK } = require("@opentelemetry/sdk-node");
const { getNodeAutoInstrumentations } = require("@opentelemetry/auto-instrumentations-node");
const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-http");
const { ConsoleMetricExporter, PeriodicExportingMetricReader } = require("@opentelemetry/sdk-metrics");
const { resourceFromAttributes } = require("@opentelemetry/resources");
const { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } = require("@opentelemetry/semantic-conventions");

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: "greeting-service",
    [ATTR_SERVICE_VERSION]: "1.0.0",
  }),
  
  // Traces (from Day 9)
  traceExporter: new OTLPTraceExporter({
    url: "http://localhost:4318/v1/traces",
  }),
  
  // Metrics (NEW for Day 10)
  metricReader: new PeriodicExportingMetricReader({
    exporter: new ConsoleMetricExporter(),
    exportIntervalMillis: 10000, // Export every 10 seconds for faster feedback
  }),
  
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
console.log("OpenTelemetry initialized with traces and metrics");
```

**O que tem de novo:**
- **ConsoleMetricExporter** - Mostra as metrics no seu terminal (para fins de aprendizado)
- **PeriodicExportingMetricReader** - Exporta metrics a cada 10 segundos

> **Observação:** Estamos usando o `ConsoleMetricExporter` só para fins de aprendizado. Em produção, você usaria o `OTLPMetricExporter` para enviar metrics para backends de observabilidade como Dash0, ou Prometheus. Vamos explorar backends de metrics no Dia 15.

---

## Passo 3: Adicionar metrics à aplicação de greeting

Atualize o `app.js` para incluir metrics junto com o tracing do Dia 9:

```javascript
// app.js
const express = require('express');
const { trace, metrics } = require('@opentelemetry/api');

const app = express();

// Get a tracer (from Day 9)
const tracer = trace.getTracer('greeting-service', '1.0.0');

// Get a meter (NEW for Day 10)
const meter = metrics.getMeter('greeting-service', '1.0.0');

// =========================
// METRICS (create once, use everywhere)
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

// =========================
// GREETING ENDPOINT (building on Day 9)
// =========================

app.get('/hello/:name', (req, res) => {
  // Count every request received
  requestsTotal.add(1);
  
  // Create a span for our greeting operation (from Day 9)
  tracer.startActiveSpan('create_greeting', (span) => {
    const name = req.params.name;
    
    // Add attributes to describe what we're doing (from Day 9)
    span.setAttribute('user.name', name);
    span.setAttribute('greeting.type', 'personal');
    
    // Add an event to mark when we start processing (from Day 9)
    span.addEvent('processing_started');
    
    // Simulate some processing time
    setTimeout(() => {
      // Create a nested span for message formatting (from Day 9)
      tracer.startActiveSpan('format_message', (formatSpan) => {
        const message = `Hello, ${name}! Welcome to OpenTelemetry tracing and metrics.`;
        
        formatSpan.setAttribute('message.length', message.length);
        formatSpan.addEvent('message_formatted');
        formatSpan.end();
        
        // Count every greeting sent (NEW for Day 10)
        greetingsTotal.add(1);
        
        // Count this specific name (NEW for Day 10) -> These are counters with labels (dimensions)
        popularNames.add(1, { name: name });
        
        // Add final attributes and events to parent span (from Day 9)
        span.setAttribute('response.message', message);
        span.addEvent('processing_completed');
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
  console.log('Try: curl http://localhost:3000/hello/Alice');
  console.log('Metrics will be exported every 10 seconds');
});
```

**O que tem de novo no Dia 10:**
- **Meter:** Sua fábrica de metrics - `metrics.getMeter()`
- **Counters:** Contam eventos que acontecem - `meter.createCounter()`
- **Adicionando valores:** Incrementa os counters - `counter.add(1)`
- **Labels:** Adicionam dimensões às metrics - `{ name: "Alice" }`
- **Export:** As metrics são enviadas automaticamente a cada 10 segundos

---


---

## Passo 4: Executar e testar

**Inicie o Jaeger (para os traces):**
```bash
docker run -d --name jaeger \
  -p 16686:16686 \
  -p 4318:4318 \
  jaegertracing/all-in-one:latest
```

**Execute a aplicação:**
```bash
node -r ./instrumentation.js app.js
```

**Envie requisições de teste:**
```bash
# Send multiple greetings to generate metrics
curl http://localhost:3000/hello/Alice
curl http://localhost:3000/hello/Bob
curl http://localhost:3000/hello/Alice
curl http://localhost:3000/hello/Charlie
curl http://localhost:3000/hello/Alice

# Generate more data
for i in {1..10}; do
  curl http://localhost:3000/hello/User$i
done
```

**Você deve ver nossas metrics personalizadas no terminal:**

![Terminal Metrics example](images/day10-metrics.png)

**O que isso nos mostra:**
- Enviamos 15 greetings no total - `greetings_sent_total`
- Alice foi o nome mais popular (3 requisições) - `popular_names_total`
- Bob foi pedido uma vez

**Observação:** Você vai ver muito mais metrics no seu terminal (metrics de runtime do Node.js, metrics HTTP, etc.). Elas vêm da auto-instrumentação. Foque em encontrar as metrics com os nomes que você criou: `greetings_sent_total`, `requests_received_total` e `popular_names_total`.

**Você também pode ver o trace no Jaeger em http://localhost:16686**

---

## Exercícios para tentar

### Exercício 1: Adicionar um counter de tamanho de mensagem

Acompanhe o total de caracteres em todas as mensagens enviadas:

<details>
<summary>Clique para ver a solução</summary>

```javascript
// Add this with other counters
const messageChars = meter.createCounter("message_characters_total", {
  description: "Total characters in all messages sent",
});

// In the format_message span
const message = `Hello, ${name}! Welcome to OpenTelemetry tracing and metrics.`;

// Add this line
messageChars.add(message.length);
```

</details>

### Exercício 2: Acompanhar faixas de tempo de processamento

Conte quantas requisições caem em diferentes faixas de tempo:

<details>
<summary>Clique para ver a solução</summary>

```javascript
// Add this counter
const processingTime = meter.createCounter("processing_time_ranges_total", {
  description: "Count of requests by processing time range",
});

// In the setTimeout (after 100ms delay)
const timeRange = "100-200ms"; // Since we know it's ~100ms
processingTime.add(1, { range: timeRange });
```

</details>

---

## O que estou levando para o Dia 11

Hoje aprendemos o básico da **Metrics API**:

**Habilidades principais:**
- Obter um meter com `metrics.getMeter()`
- Criar counters para contar eventos que acontecem com `meter.createCounter()`
- Incrementar counters para adicionar valores com `counter.add()`
- Usar labels para adicionar dimensões - `{ name: "Alice" }`
- Combinar metrics com o tracing do Dia 9

**O padrão básico:**
```javascript
// Setup (once)
const meter = metrics.getMeter('service-name', '1.0.0');
const counter = meter.createCounter('events_total');

// Usage (everywhere)
counter.add(1);                    // Count an event
counter.add(1, { type: 'error' }); // Count with context
```

Amanhã (Dia 11) vamos aprender a **Logs API** para completar o trio básico de traces, metrics e logs.

Te vejo no Dia 11!
