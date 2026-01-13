# Day 28 – Final Project: Build a Complete Observability Stack

Today we **build a simple but complete observability stack** that demonstrates everything we learned over the past 27 days. Hopefully by the end of the day we'll have a basic e-commerce API with full observability -> traces, metrics, and logs flowing to backends.

> [!NOTE] Configuration examples in this lesson use batch processor for educational purposes. In production, consider exporters with built-in batching and persistent storage for better reliability ([OpenTelemetry issue #8122](https://github.com/open-telemetry/opentelemetry-collector/issues/8122)).

> **Production-Ready Code Available:** This lesson provides working code for learning the concepts. For a more comprehensive, production-ready implementation with advanced patterns, error handling, and detailed documentation, see [`examples/day28-final-project/`](../examples/day28-final-project/) folder.
---

## Project Overview: Simple E-Commerce API

A **single Node.js API** that simulates an e-commerce backend with:

- **API Endpoints:** Users, products, orders
- **OpenTelemetry Instrumentation:** Auto + manual
- **Collector Pipeline:** Processing and routing
- **Observability Backend:** Dash0 (unified traces, metrics, and logs)

**Project Architecture**

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
│  │     Unified Observability Platform                      ││
│  │   • Traces with business context                        ││
│  │   • Custom metrics and dashboards                       ││
│  │   • Correlated logs and alerts                          ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## How we're putting everything together

### Week 1 Concepts in Action:
- **Traces:** See request flows through our API
- **Metrics:** Custom counters and histograms
- **Logs:** Structured logging with correlation

### Week 2 Skills Applied:
- **Auto-instrumentation:** Express, HTTP automatically traced
- **Manual instrumentation:** Custom spans and metrics
- **Context propagation:** Trace IDs in logs

### Week 3 Expertise Demonstrated:
- **Collector configuration:** Receivers, processors, exporters
- **Data transformation:** Adding business context
- **Production routing:** All telemetry to Dash0

### Week 4 Production Patterns:
- **Security:** Remove sensitive headers
- **Performance:** Filter health checks
- **Monitoring:** Collector health and metrics
- **Cloud-native:** Direct integration with Dash0

---

## Implementation Steps

### Step 1: Set Up Infrastructure

**Create `docker-compose.yml`:**
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

**Create `.env` file for your Dash0 token:**
```bash
# Get this from your Dash0 account: Settings → Auth Tokens
DASH0_API_TOKEN=your_dash0_token_here
```

### Step 2: Configure the Collector

This is the processing pipeline that receives, transforms, and exports telemetry data.

**Create `collector-config.yaml`:**
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

### Step 3: Build Your API

**Create `package.json`:**
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

**Create `instrumentation.js`:**
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

**Create `app.js`:**
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

**The flow:**
1. Request comes in → Auto-instrumentation creates HTTP span
2. Your code → Creates custom child span with business context
3. Metrics → Records counters and histograms
4. SDK → Sends everything to Collector via OTLP
5. Collector → Processes and forwards to Dash0

**Create `Dockerfile`:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

### Step 4: Test Everything

**Start the stack:**
```bash
docker-compose up -d
```

**Generate some test traffic:**
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

**Check your results:**
- **Dash0 UI:** Log into your Dash0 account to see traces and metrics
- **Collector health:** http://localhost:8888/metrics (shows Collector is working)

---

## What We've Accomplished

**A complete observability stack** with traces, metrics, and logs  
**Production patterns** like filtering, batching, and business context  
**Cloud-native integration** with Dash0 observability platform  
**Custom instrumentation** alongside auto-instrumentation  
**Real-world API** that demonstrates practical OpenTelemetry usage  

---

## Next Steps

This foundation can be extended with:
- **More services** (add a database, payment service)
- **Advanced processing** (sampling, error classification)
- **Security features** (PII redaction, authentication)
- **Dash0 dashboards** (custom visualizations and alerts)
- **Team collaboration** (shared Dash0 workspace)

---

## Tomorrow: Week 4 Recap

Today we built a complete, working observability stack that brings together everything from the past 27 days. Tomorrow we'll recap Week 4's production patterns.

---

*"Simple, complete, and working beats complex and broken every time. We built something real today."*