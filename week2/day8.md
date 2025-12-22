# Day 8 – API vs SDK: The Architecture That Makes OpenTelemetry Portable

Week 1 taught us *what* OpenTelemetry does. Week 2 will teach us *how* to use it.

Today we're learning the difference between the **OpenTelemetry API** and **SDK**, and why this separation is the key to vendor-neutral observability.

## The problem: vendor lock-in

Before OpenTelemetry, instrumenting your code meant committing to a specific vendor:

```javascript
// Using Vendor D's SDK
const tracer = require('dd-trace').init();

app.get('/users/:id', (req, res) => {
  const span = tracer.startSpan('get_user');
  span.setTag('user.id', req.params.id);
  
  const user = db.getUser(req.params.id);
  span.finish();
  res.json(user);
});
```

**Want to switch vendors?** Rewrite all your instrumentation code. Every `tracer.startSpan()` call. Every `span.setTag()`. Every import. That's vendor lock-in.

## The solution: API/SDK separation

OpenTelemetry splits this into two pieces:

1. **API** (in your code) – Stable, vendor-neutral interface for creating telemetry
2. **SDK** (in config) – Pluggable implementation that sends data to backends

**Application code uses the API:**

```javascript
// app.js
const { trace } = require('@opentelemetry/api');

app.get('/users/:id', (req, res) => {
  const tracer = trace.getTracer('user-service');
  const span = tracer.startSpan('get_user');
  span.setAttribute('user.id', req.params.id);
  
  const user = db.getUser(req.params.id);
  span.end();
  res.json(user);
});
```

**SDK configuration decides where data goes:**

```javascript
// instrumentation.js
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: 'http://jaeger:4318/v1/traces',
  }),
});

sdk.start();
```

**Switch backends?** Change one file:

```javascript
// instrumentation.js - now sending to Dash0
const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: process.env.DASH0_ENDPOINT,
    headers: { 'Authorization': `Bearer ${process.env.DASH0_AUTH_TOKEN}` },
  }),
});

sdk.start();
```

**Your application code didn't change.** That's the power of separation.

## The API: what you write in your code

**Responsibilities:**
- Create spans, metrics, logs
- Add attributes
- Manage context

**What it does NOT do:**
- Send data to backends
- Apply sampling
- Batch telemetry
- Detect resources

**Key characteristics:**
- **Stable:** v1.x has been stable for years
- **Vendor-neutral:** No backend logic
- **Lightweight:** Just interfaces, no heavy implementation

**Example API usage:**

```javascript
const { trace } = require('@opentelemetry/api');

// Get a tracer
const tracer = trace.getTracer('service-name');

// Create a span
const span = tracer.startSpan('operation');
span.setAttribute('key', 'value');
span.end();
```

## The SDK: what you configure once

**Responsibilities:**
- Collect telemetry from the API
- Add resource attributes (service name, version, host)
- Apply sampling
- Batch for efficiency
- Format for backends (OTLP, Jaeger, Zipkin)
- Send over the network
- Handle retries and backpressure

**Key characteristics:**
- **Configurable:** Set backends, sampling, resources
- **Pluggable:** Swap components without touching app code
- **Heavier:** Does the real work
- **Optional:** API works without SDK (no-op mode for testing)

**Example SDK configuration:**

```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { BatchSpanProcessor, TraceIdRatioBasedSampler } = require('@opentelemetry/sdk-trace-base');

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'payment-service',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
  }),
  spanProcessor: new BatchSpanProcessor(
    new OTLPTraceExporter({ url: 'http://localhost:4318/v1/traces' })
  ),
  sampler: new TraceIdRatioBasedSampler(0.1),  // 10% sampling
});

sdk.start();
```

## The architecture

```
Your Code (uses API)
    ↓
OpenTelemetry API (stable interface)
    ↓
OpenTelemetry SDK (configurable implementation)
    ↓
Exporter (OTLP, Jaeger, Console)
    ↓
Backend (Dash0, Jaeger, Tempo)
```

**Key insight:** API and SDK are loosely coupled. The API doesn't know what SDK is running. The SDK doesn't dictate the API.

>[!NOTE]
> **OpenTelemetry-Native Backends**
>
> Modern platforms like **Dash0** are built for OpenTelemetry:
> - Use standard OTLP (no vendor-specific exporters)
> - Understand semantic conventions natively
> - No data transformation needed
>
> This is the advantage of the OpenTelemetry ecosystem.

## Why the no-op implementation matters

**The API works without an SDK.** If no SDK is configured, API calls do nothing (no-op):

```javascript
const span = tracer.startSpan('operation');  // Does nothing if no SDK
span.setAttribute('key', 'value');           // No-op
span.end();                                   // No-op
```

**Why this is useful:**

1. **Testing:** Test instrumented code without backends
2. **Gradual rollout:** Add instrumentation now, enable SDK later
3. **Library instrumentation:** Libraries can use the API without forcing SDK dependencies on users

This is how auto-instrumentation works—libraries use the API, and if you configure an SDK, you get telemetry automatically.

## In practice: separate files

**File 1: Application code (uses API only)**

```javascript
// app.js
const express = require('express');
const { trace } = require('@opentelemetry/api');

const app = express();

app.get('/users/:id', async (req, res) => {
  const tracer = trace.getTracer('user-service');
  const span = tracer.startSpan('get_user');
  span.setAttribute('user.id', req.params.id);
  
  try {
    const user = await fetchUser(req.params.id);
    res.json(user);
  } catch (error) {
    span.recordException(error);
    throw error;
  } finally {
    span.end();
  }
});

app.listen(3000);
```

**File 2: SDK configuration (separate file)**

```javascript
// instrumentation.js
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'user-service',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

**Run:**

```bash
node --require ./instrumentation.js app.js
```

## SDK components (pluggable pieces)

The SDK is modular. Key components:

1. **Tracer Provider:** Implements `trace.getTracer()`
2. **Span Processors:** BatchSpanProcessor (batches), SimpleSpanProcessor (immediate)
3. **Exporters:** OTLPTraceExporter, JaegerExporter, ConsoleSpanExporter
4. **Samplers:** TraceIdRatioBasedSampler (sample X%), ParentBasedSampler
5. **Resource Detectors:** Auto-detect service name, host, pod name

You can mix and match these without changing application code.

## Package separation

API and SDK are separate packages:

**Node.js:**
```json
{
  "dependencies": {
    "@opentelemetry/api": "^1.9.0",                    // API (stable)
    "@opentelemetry/sdk-node": "^0.53.0",              // SDK
    "@opentelemetry/exporter-trace-otlp-http": "^0.53.0",
    "@opentelemetry/auto-instrumentations-node": "^0.53.0"
  }
}
```

**Python:**
```
opentelemetry-api==1.27.0
opentelemetry-sdk==1.27.0
opentelemetry-exporter-otlp==1.27.0
```

**Why separate?**
- API is stable (v1.x for years)
- SDK evolves faster (new features, bug fixes)
- Libraries depend on API only, not SDK

## Quick hands-on preview

**Install:**
```bash
npm install @opentelemetry/api \
            @opentelemetry/sdk-node \
            @opentelemetry/exporter-trace-otlp-http \
            @opentelemetry/auto-instrumentations-node \
            express
```

**Create instrumentation.js:**
```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { ConsoleSpanExporter } = require('@opentelemetry/sdk-trace-base');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

const sdk = new NodeSDK({
  traceExporter: new ConsoleSpanExporter(),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

**Create app.js:**
```javascript
const express = require('express');
const { trace } = require('@opentelemetry/api');

const app = express();

app.get('/hello', (req, res) => {
  const tracer = trace.getTracer('demo');
  const span = tracer.startSpan('say_hello');
  span.setAttribute('greeting', 'hello');
  
  res.json({ message: 'Hello, OpenTelemetry!' });
  span.end();
});

app.listen(3000, () => console.log('Server running'));
```

**Run:**
```bash
node --require ./instrumentation.js app.js
curl http://localhost:3000/hello
```

Spans print to console. Change `ConsoleSpanExporter` to `OTLPTraceExporter`, and they go to your backend instead. **App code unchanged.**

## Common misconceptions

**"The API and SDK are the same thing"**  
❌ No. API is a thin interface. SDK is the heavy implementation.

**"I need to import the SDK in my application code"**  
❌ No. Application code imports `@opentelemetry/api` only.

**"Auto-instrumentation is part of the SDK"**  
⚠️ Kind of. Auto-instrumentation uses the API and works with any SDK.

**"If I switch backends, I need to change my application code"**  
❌ No. That's the whole point. Change SDK config only.

## When you'll use each

**API (daily):**
- Day 9: Create manual spans
- Day 10: Record metrics
- Day 11: Emit logs
- Day 12: Work with context

**SDK (once):**
- Day 8: Initial setup
- Day 13: Configure sampling
- Day 13: Tune performance

Most developers write API code constantly and touch SDK config rarely.

## What I'm taking into Day 9

**Core insight:** The API/SDK separation is why OpenTelemetry is portable. Write instrumentation once (API), swap backends anytime (SDK config).

**Key takeaways:**
- API = stable interface for creating telemetry
- SDK = pluggable implementation for sending telemetry
- Separation enables vendor neutrality
- Libraries use API without forcing SDK choices
- Backend changes = config changes, not code changes

Tomorrow we dive into the **Tracing API**: creating nested spans, adding events, building rich traces. We'll get hands-on with Node.js and Python examples.

See you on Day 9!
