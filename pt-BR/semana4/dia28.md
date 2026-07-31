# Dia 28 – Projeto Final: Construindo uma Stack de Observabilidade Completa

Hoje vamos **construir uma stack de observabilidade simples, mas completa**, que demonstra tudo o que aprendemos nos últimos 27 dias. Com sorte, até o final do dia, vamos ter uma API básica de e-commerce com observabilidade completa -> traces, metrics e logs fluindo para os backends.

> [!NOTE] Os exemplos de configuração desta lição usam o batch processor para fins didáticos. Em produção, considere exporters com batching integrado e armazenamento persistente para uma confiabilidade melhor ([OpenTelemetry issue #8122](https://github.com/open-telemetry/opentelemetry-collector/issues/8122)).

---

## Visão Geral do Projeto: API Simples de E-Commerce

Uma **única API em Node.js** que simula um backend de e-commerce com:

- **Endpoints da API:** Usuários, produtos, pedidos
- **Instrumentação do OpenTelemetry:** Auto + manual
- **Pipeline do Collector:** Processamento e roteamento
- **Backend de Observabilidade:** Dash0 (traces, metrics e logs unificados)

**Arquitetura do Projeto**

```
┌─────────────────────────────────────────────────────────────┐
│                    Our API Application                      │
│  ┌─────────────────────────────────────────────────────────┐│
│  │           Node.js E-Commerce API                        ││
│  │                                                         ││
│  │  GET  /api/users/:id     - Get user                     ││
│  │  GET  /api/products      - List products                ││
│  │  POST /api/orders        - Create order                 ││
│  │  GET  /health            - Health check                 ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────┬───────────────────────────────────┘
                          │ OTLP HTTP
┌─────────────────────────▼───────────────────────────────────┐
│                 OpenTelemetry Collector                     │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Receivers: OTLP                                        ││
│  │  Processors: Batch, Attributes, Filter                  ││
│  │  Exporters: Dash0 OTLP                                  ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────┬───────────────────────────────────┘
                          │ OTLP HTTPS
┌─────────────────────────▼───────────────────────────────────┐
│                        Dash0                                │
│  ┌─────────────────────────────────────────────────────────┐│
│  │     Unified Observabilidade Platform                    ││
│  │   • Traces with business context                        ││
│  │   • Custom metrics and dashboards                       ││
│  │   • Correlated logs and alerts                          ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## Como estamos juntando tudo

### Conceitos da Semana 1 em Ação:
- **Traces:** Veja o fluxo das requisições pela nossa API
- **Metrics:** Counters e histograms customizados
- **Logs:** Logging estruturado com correlação

### Habilidades da Semana 2 Aplicadas:
- **Auto-instrumentação:** Express e HTTP com trace automático
- **Instrumentação manual:** Spans e metrics customizados
- **Context propagation:** Trace IDs nos logs

### Expertise da Semana 3 Demonstrada:
- **Configuração do Collector:** Receivers, processors, exporters
- **Transformação de dados:** Adicionando contexto de negócio
- **Roteamento em produção:** Toda a telemetry para o Dash0

### Padrões de Produção da Semana 4:
- **Segurança:** Removendo headers sensíveis
- **Performance:** Filtrando health checks
- **Monitoramento:** Saúde e metrics do Collector
- **Cloud-native:** Integração direta com o Dash0

---

## Passos de Implementação

### Passo 1: Configurando a Infraestrutura

**Crie o `docker-compose.yml`:**
```yaml
version: '3.8'

services:
  # OpenTelemetry Collector
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    command: ["--config=/etc/otelcol-contrib/config.yaml"]
    volumes:
      - ./collector-config.yaml:/etc/otelcol-contrib/config.yaml
    ports:
      - "4318:4318"   # OTLP HTTP receiver
      - "8888:8888"   # Collector metrics endpoint
    environment:
      - DASH0_API_TOKEN=${DASH0_API_TOKEN}

  # The API
  ecommerce-api:
    build: . # Builds container from Dockerfile in current directory
    ports:
      - "3001:3001" # Exposes the API on localhost:3001
    environment:
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318 # Tells OpenTelemetry SDK where to send data (to the Collector)
      - OTEL_SERVICE_NAME=ecommerce-api # Identifies our service in traces/metrics
      - OTEL_RESOURCE_ATTRIBUTES=service.version=1.0.0,environment=development # Adds metadata (version, environment) to all telemetry
    depends_on:
      - otel-collector # Ensures Collector starts before the API
```

**Crie o arquivo `.env` com o seu token do Dash0:**
```bash
# Get this from your Dash0 account: Settings → Auth Tokens
DASH0_API_TOKEN=your_dash0_token_here
```

### Passo 2: Configurando o Collector

Esse é o pipeline de processamento que recebe, transforma e exporta os dados de telemetry.

**Crie o `collector-config.yaml`:**
```yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:

exporters:
  # Send everything to Dash0 via HTTP
  otlphttp/dash0:
    endpoint: https://ingress.us-west-2.aws.dash0.com
    headers:
      authorization: "Bearer ${env:DASH0_API_TOKEN}"
    compression: gzip

  # Keep debug logging for local debugging
  debug:
    verbosity: detailed

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/dash0, debug]
    
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/dash0, debug]
```

### Passo 3: Construindo sua API

**Crie o `package.json`:**
```json
{
  "name": "ecommerce-api",
  "version": "1.0.0",
  "scripts": {
    "start": "node --require ./instrumentation.js app.js"
  },
  "dependencies": {
    "express": "^4.18.0",
    "@opentelemetry/api": "^1.7.0",
    "@opentelemetry/sdk-node": "^0.45.0",
    "@opentelemetry/sdk-metrics": "^1.17.0",
    "@opentelemetry/auto-instrumentations-node": "^0.40.0",
    "@opentelemetry/exporter-trace-otlp-http": "^0.45.0",
    "@opentelemetry/exporter-metrics-otlp-http": "^0.45.0"
  }
}
```

**Crie o `instrumentation.js`:**
```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT + '/v1/traces',
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT + '/v1/metrics',
    }),
    exportIntervalMillis: 1000,
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

**Crie o `app.js`:**
```javascript
const express = require('express');
const { trace, metrics } = require('@opentelemetry/api');

const app = express();
app.use(express.json());

// Get tracer and meter
const tracer = trace.getTracer('ecommerce-api');
const meter = metrics.getMeter('ecommerce-api');

// Custom metrics
const orderCounter = meter.createCounter('orders_created_total');
const requestDuration = meter.createHistogram('request_duration_ms');

// Mock data
const users = { '123': { id: '123', name: 'John Doe', email: 'john@example.com' } };
const products = [
  { id: '1', name: 'Laptop', price: 999.99 },
  { id: '2', name: 'Phone', price: 599.99 }
];

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Get user (manual tracing)
app.get('/api/users/:id', (req, res) => {
  const startTime = Date.now();
  const span = tracer.startSpan('get_user_details');
  
  const userId = req.params.id;
  const user = users[userId];
  
  if (user) {
    span.setAttributes({
      'user.id': userId,
      'user.found': true
    });
    res.json(user);
  } else {
    span.setAttributes({
      'user.id': userId,
      'user.found': false
    });
    res.status(404).json({ error: 'User not found' });
  }
  
  span.end();
  requestDuration.record(Date.now() - startTime, { endpoint: '/api/users/:id' });
});

// List products
app.get('/api/products', (req, res) => {
  const startTime = Date.now();
  const span = tracer.startSpan('list_products');
  
  span.setAttributes({
    'products.count': products.length
  });
  
  res.json(products);
  span.end();
  requestDuration.record(Date.now() - startTime, { endpoint: '/api/products' });
});

// Create order (business metric)
app.post('/api/orders', (req, res) => {
  const startTime = Date.now();
  const span = tracer.startSpan('create_order');
  
  const { userId, productIds } = req.body;
  
  // Simulate order processing
  const orderId = Math.random().toString(36).substr(2, 9);
  
  span.setAttributes({
    'order.id': orderId,
    'order.user_id': userId,
    'order.product_count': productIds?.length || 0
  });
  
  // Increment order counter
  orderCounter.add(1, { user_id: userId });
  
  res.json({
    orderId,
    userId,
    productIds,
    status: 'created',
    timestamp: new Date().toISOString()
  });
  
  span.end();
  requestDuration.record(Date.now() - startTime, { endpoint: '/api/orders' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`E-commerce API running on port ${PORT}`);
});
```

**O fluxo:**
1. A requisição chega → Auto-instrumentação cria o HTTP span
2. Seu código → Cria um child span customizado com contexto de negócio
3. Metrics → Registra counters e histograms
4. SDK → Envia tudo para o Collector via OTLP
5. Collector → Processa e encaminha para o Dash0

**Crie o `Dockerfile`:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

### Passo 4: Testando Tudo

**Suba a stack:**
```bash
docker-compose up -d
```

**Gere um pouco de tráfego de teste:**
```bash
# Get user
curl http://localhost:3001/api/users/123

# List products  
curl http://localhost:3001/api/products

# Create order
curl -X POST http://localhost:3001/api/orders \
  -H "Content-Type: application/json" \
  -d '{"userId": "123", "productIds": ["1", "2"]}'

# Health check (will be filtered out)
curl http://localhost:3001/health
```

**Confira os resultados:**
- **Dash0 UI:** Acesse sua conta do Dash0 para ver traces e metrics
- **Saúde do Collector:** http://localhost:8888/metrics (mostra que o Collector está funcionando)

---

## O Que Realizamos

**Uma stack de observabilidade completa** com traces, metrics e logs  
**Padrões de produção** como filtering, batching e contexto de negócio  
**Integração cloud-native** com a plataforma de observabilidade do Dash0  
**Instrumentação customizada** junto com auto-instrumentação  
**API do mundo real** que demonstra o uso prático do OpenTelemetry  

---

## Próximos Passos

Essa base pode ser expandida com:
- **Mais serviços** (adicionar um banco de dados, um serviço de pagamento)
- **Processamento avançado** (sampling, classificação de erros)
- **Recursos de segurança** (redação de PII, autenticação)
- **Dashboards do Dash0** (visualizações customizadas e alertas)
- **Colaboração em equipe** (workspace compartilhado no Dash0)

---

## Amanhã: Recapitulação da Semana 4

Hoje construímos uma stack de observabilidade completa e funcional, que reúne tudo o que vimos nos últimos 27 dias. Amanhã vamos recapitular os padrões de produção da Semana 4.

---

*"Simples, completo e funcionando vence complexo e quebrado sempre. Hoje construímos algo real."*
