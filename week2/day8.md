# Day 8 – API vs SDK: The Architecture That Makes OpenTelemetry Portable

Week 1 taught us *what* OpenTelemetry does. Week 2 will teach us *how* to use it.

But first, we need to understand something important: **Remember `span.setAttribute()` from [Day 4](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day4.md)? That's the API.** 

Today we learn why it's separate from the SDK and why this separation is the key to vendor-neutral observability.

## What we've already learned (without realizing it)

Here's something that might click now: **We've been learning about the API all week.**

- **Day 4:** When we learned `span.setAttribute('user.id', '12345')` — that's the API
- **Day 5:** When we learned semantic conventions like `http.method` — those are used with the API
- **Day 6:** When we learned auto-instrumentation — those libraries use the API

The API isn't new. What's new today is understanding why it's separate from the SDK.

## The problem this solves

Before OpenTelemetry, instrumenting our code meant committing to a specific vendor:

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

**Want to switch vendors?** Rewrite all our instrumentation code. Every `tracer.startSpan()` call. Every `span.setTag()`. Every import.

OpenTelemetry solved this with a clean separation.

## The solution: API/SDK separation

```
Our Code (uses API)
    ↓
OpenTelemetry API (stable interface)
    ↓
OpenTelemetry SDK (configurable implementation)
    ↓
Exporter (OTLP, Jaeger, Console)
    ↓
Backend (Dash0, Jaeger, Tempo)
```

OpenTelemetry splits observability into two pieces:

1. **API** (in our code) – Stable, vendor-neutral interface for creating telemetry
2. **SDK** (in config) – Pluggable implementation that sends data to backends

Let's see this in action.

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
// instrumentation.js - SDK configuration (you change this file to switch backends)
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

const sdk = new NodeSDK({
  serviceName: 'user-service',
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
  }),
});

sdk.start();

// To switch backends? Just change the exporter URL above.
// Our application code in app.js doesn't change at all.
```

**Switch backends?** Change the exporter configuration:

```javascript
// instrumentation.js - now sending to Dash0
const sdk = new NodeSDK({
  serviceName: 'user-service',
  traceExporter: new OTLPTraceExporter({
    url: process.env.DASH0_ENDPOINT,
    headers: { 'Authorization': `Bearer ${process.env.DASH0_AUTH_TOKEN}` },
  }),
});

sdk.start();
```

**Our application code didn't change.** That's the power of separation.

## The API: what we write in our code

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

// Get a tracer (this is the API)
const tracer = trace.getTracer('service-name');

// Create a span (API method)
const span = tracer.startSpan('operation');

// Add attributes (API method)
span.setAttribute('key', 'value');

// End the span (API method)
span.end();
```

## The SDK: what we configure once

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

**Key insight:** API and SDK are loosely coupled. The API doesn't know what SDK is running. The SDK doesn't dictate the API.

## Why the no-op implementation matters

**The API works without an SDK.** If no SDK is configured, API calls do nothing (no-op):

```javascript
const span = tracer.startSpan('operation');  // Does nothing if no SDK
span.setAttribute('key', 'value');           // No-op
span.end();                                   // No-op
```

**Why this is useful:**

### 1. Testing
Test instrumented code without backends. Your tests run fast and don't need infrastructure.

### 2. Gradual rollout
Add instrumentation now, enable SDK later. We can instrument your code in development and enable the SDK in production when you're ready.

### 3. Library portability
Libraries can use the API without forcing SDK dependencies on users. This is how auto-instrumentation works. Libraries use the API, and if we configure an SDK, we get telemetry automatically.

## SDK components (pluggable pieces)

The SDK is modular. Key components we can configure:

1. **Tracer Provider:** Implements `trace.getTracer()`
2. **Span Processors:** 
   - `BatchSpanProcessor` (batches spans for efficiency)
   - `SimpleSpanProcessor` (sends immediately, useful for debugging)
3. **Exporters:** 
   - `OTLPTraceExporter` (industry standard)
   - `JaegerExporter` (legacy Jaeger format)
   - `ConsoleSpanExporter` (prints to console for debugging)
4. **Samplers:** 
   - `TraceIdRatioBasedSampler` (sample X% of traces)
   - `ParentBasedSampler` (follow parent's sampling decision)
5. **Resource Detectors:** Auto-detect service name, host, pod name

We can mix and match these without changing application code.

>[!NOTE]
> **OpenTelemetry-Native Backends**
>
> Modern platforms like **Dash0** are built for OpenTelemetry:
> - Use standard OTLP (no vendor-specific exporters needed)
> - Understand semantic conventions natively
> - No data transformation required
>
> This is the advantage of the OpenTelemetry ecosystem—native support means simpler configuration.

## Quick hands-on preview

Let's see it work end-to-end.

**Install:**
```bash
npm install @opentelemetry/api \
            @opentelemetry/sdk-node \
            @opentelemetry/sdk-trace-base \
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
console.log('OpenTelemetry SDK initialized');
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

app.listen(3000, () => console.log('Server running on port 3000'));
```

**Run:**
```bash
node --require ./instrumentation.js app.js
//The `--require` flag loads the SDK configuration before our application code runs.
```

**Test:**
```bash
curl http://localhost:3000/hello
```

Spans print to console. Change `ConsoleSpanExporter` to `OTLPTraceExporter`, and they go to our backend instead. **App code unchanged.**

## Common misconceptions

**"The API and SDK are the same thing"**  
❌ No. API is a thin interface. SDK is the heavy implementation.

**"I need to import the SDK in my application code"**  
❌ No. Application code imports `@opentelemetry/api` only. The SDK is loaded separately.

**"Auto-instrumentation is part of the SDK"**  
⚠️ Kind of. Auto-instrumentation uses the API and works with any SDK.

**"If I switch backends, I need to change my application code"**  
❌ No. Change SDK config only (the `instrumentation.js` file).

**"If the API works without the SDK (no-op mode), the SDK also works without the API"**  
❌ No. The SDK is literally an implementation of the API interface. Otherwise you have nothing to implement.

## What I'm taking into Day 9

**Core insight:** The API/SDK separation is why OpenTelemetry is portable. We write instrumentation code once using the API, and we can change where the data goes by reconfiguring the SDK.

See you on Day 9! 🚀
