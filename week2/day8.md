# Day 8 – API vs SDK: The Architecture That Makes OpenTelemetry Portable

Welcome to Week 2!

Week 1 taught us *what* OpenTelemetry does, now Week 2 will teach us *how* to use it in real applications.

Today we'll understand one of OpenTelemetry's most important design decisions: why the API is separate from the SDK, and why this separation is the secret to vendor-neutral observability.

**Think of it like this:** The API is like a universal language that all applications can speak, while the SDK is like a translator that converts that language into whatever format our observability backend understands. This means we can switch backends without learning a new language!

## What we've already learned (without realizing it)

Here's something that might click now: **We've been learning about the API all week.**

- **[Day 4](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day4.md):** When we learned `span.setAttribute('user.id', '12345')` — that's the API
- **[Day 5](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day5.md):** When we learned semantic conventions like `http.method` — those are used with the API
- **[Day 6](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day6.md):** When we learned auto-instrumentation — those libraries use the API

The API isn't new. What's new today is understanding why it's separate from the SDK.

## The problem this solves

Before OpenTelemetry, instrumenting our code meant making a commitment to a specific vendor and getting locked in. Here's what that looked like:

```javascript
// Using Vendor D's SDK directly in your application code
const tracer = require('dd-trace').init();

app.get('/users/:id', (req, res) => {
  const span = tracer.startSpan('get_user');
  span.setTag('user.id', req.params.id);
  
  const user = db.getUser(req.params.id);
  span.finish();
  res.json(user);
});
```

> **The vendor lock-in problem:**
>
> Want to switch vendors? Rewrite all our instrumentation code. Every `tracer.startSpan()` call. Every `span.setTag()`. Every import.
>
>Companies would spend months rewriting instrumentation code just to switch observability vendors. This made it risky to adopt observability tooling because you might get stuck with a vendor forever.

OpenTelemetry solved this with a brilliant architectural decision: separate the "what" (API) from the "how" (SDK).

## The solution: API/SDK separation

OpenTelemetry's architecture looks like this:

```
Our Application Code (uses API)
         ↓
OpenTelemetry API (stable interface)
         ↓
OpenTelemetry SDK (configurable implementation)
         ↓
Exporter (OTLP, Jaeger, Console)
         ↓
Backend (Dash0, Jaeger, Tempo, Prometheus)
```

OpenTelemetry splits observability into two completely separate concerns:

1. **API** (in our application code) – A stable, vendor-neutral interface for creating telemetry data
2. **SDK** (in configuration files) – A pluggable implementation that handles processing and sending data to backends


## The API: what we write in our code

The OpenTelemetry API is the part that goes in our application code.

**API Responsibilities:**
- Create spans, metrics, and logs
- Add attributes and events to telemetry
- Manage context (which trace am I in?)
- Provide a consistent interface across all languages

**What the API does NOT do:**
- Send data to backends (that's the SDK's job)
- Apply sampling decisions (SDK handles this)
- Batch telemetry for efficiency (SDK responsibility)
- Detect service information like hostname (SDK feature)

**Key characteristics that make it special:**

**Stable:** The API has been stable since v1.0 and follows semantic versioning. Method names and signatures won't change, so your instrumentation code won't break when you upgrade.

**Vendor-neutral:** The API contains zero backend-specific logic. It doesn't know or care whether you're sending data to Jaeger, Datadog, or a custom system.

**Lightweight:** The API is just interfaces and basic data structures. It doesn't include heavy networking code, complex processing logic, or large dependencies.

**Example of API code in our application:**

```javascript
// app.js - This is what we write in our application
const { trace } = require('@opentelemetry/api');

app.get('/users/:id', (req, res) => {
  const tracer = trace.getTracer('user-service'); // Get a tracer (this is the API)
  const span = tracer.startSpan('get_user'); // Create a span (API method)
  span.setAttribute('user.id', req.params.id); // Add attributes (API method)
  
  const user = db.getUser(req.params.id);
  span.end(); // End the span (API method)
  res.json(user);
});
```

**Important insight:** This code looks almost identical to vendor-specific SDKs, but it's completely portable. The same code works whether we're sending data to Jaeger, Dash0, or any other OpenTelemetry-compatible backend.

**Connection to auto-instrumentation:** Remember from Day 6 how auto-instrumentation libraries automatically create spans for Express, database calls, etc.? Those libraries use these exact same API methods. When we use manual instrumentation, we're calling the same methods that auto-instrumentation uses behind the scenes.

## The SDK: what we configure once

The OpenTelemetry SDK is the "engine" that takes API calls and turns them into actual telemetry data sent to backends. It handles all the complex, configurable parts of observability.

**SDK Responsibilities:**
- Collect telemetry data from API calls
- Add resource attributes (service name, version, hostname, environment)
- Apply sampling decisions (keep 100% of traces? 10%? Only errors?)
- Process data efficiently (batch spans together, add metadata)
- Format data for different backends (OTLP, Jaeger, Prometheus formats)
- Handle network communication (send data, retry on failures, handle backpressure)
- Manage performance (buffering, compression, rate limiting)

**Key characteristics that make it powerful:**

**Configurable:** We can completely change how telemetry is processed without touching application code. Want to switch from 100% sampling to 10%? Change one line in the SDK config.

**Pluggable:** The SDK is built from interchangeable components. We can mix and match samplers, processors, and exporters like building blocks.

**Heavy-duty:** The SDK contains all the complex logic for efficient data processing, network communication, and backend integration.

**Optional:** The API works without an SDK (in "no-op" mode), which is perfect for testing and gradual rollouts.

**Example SDK configuration:**

```javascript
// instrumentation.js - You only change this file to switch backends
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

const sdk = new NodeSDK({
  // Resource: Describe this service
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'user-service',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: 'production',
  }),
  
  // Exporter: Where to send data
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
  }),
  
  // Auto-instrumentation: What to instrument automatically
  instrumentations: [getNodeAutoInstrumentations()],
  
  // Sampling: How much data to keep (could add this)
  // sampler: new TraceIdRatioBasedSampler(0.1), // Keep 10%
});

sdk.start();
```

**The magic of loose coupling:** Notice how the API code and SDK configuration are completely separate. The API doesn't know what SDK is running. The SDK doesn't dictate what API methods you can use. This loose coupling is what makes OpenTelemetry so flexible.

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
npm install express \
  @opentelemetry/api \
  @opentelemetry/sdk-node \
  @opentelemetry/resources \
  @opentelemetry/semantic-conventions \
  @opentelemetry/sdk-trace-base \
  @opentelemetry/auto-instrumentations-node
```

**Create instrumentation.js:**
```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { ConsoleSpanExporter } = require('@opentelemetry/sdk-trace-base');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'demo-service',
  }),
  traceExporter: new ConsoleSpanExporter(),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
console.log('🚀 OpenTelemetry SDK initialized');
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

See you on Day 9!
