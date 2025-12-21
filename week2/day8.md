# Day 8 – API vs SDK: The Architecture That Makes OpenTelemetry Portable

Week 1 taught us *what* OpenTelemetry does. Week 2 will teach us *how* to use it.

Today is the foundation for everything else this week: understanding the difference between the **OpenTelemetry API** and the **OpenTelemetry SDK**, and why this separation matters.

This might sound dry and architectural, but it's actually the key insight that makes OpenTelemetry different from every proprietary observability tool that came before it.

## The problem this separation solves

Before we explain what the API and SDK are, let's understand why they're separate.

### The vendor lock-in problem (before OpenTelemetry)

Imagine we're using Vendor D for observability. We instrument our code using Vendor D's SDK:

```javascript
// Using Vendor D's SDK (hypothetical example)
const tracer = require('dd-trace').init();

app.get('/users/:id', (req, res) => {
  const span = tracer.startSpan('get_user');
  span.setTag('user.id', req.params.id);
  
  const user = db.getUser(req.params.id);
  
  span.finish();
  res.json(user);
});
```

This works great. We deploy to production. Vendor D collects our traces.

**Then one day:**
- Our company decides to switch to another vendor (cheaper, better for our use case, more functionalities.. whatever)
- Or we want to send traces to our own backend
- Or we want to send to *multiple* backends at once

So now we have to **rewrite all our instrumentation code**. Every `tracer.startSpan()` call. Every `span.setTag()`. Everywhere we import Vendor D's SDK. We're replacing one vendor SDK with another vendor SDK.

**This is vendor lock-in.** Our instrumentation code is tightly coupled to our backend.

### How OpenTelemetry solves this

OpenTelemetry separates concerns:

1. **API (what we write in our code):** A stable, vendor-neutral interface for creating telemetry
2. **SDK (what processes and sends the data):** The implementation that can be swapped without changing our code

If this sounds abstract right now, don’t worry. By the end of this post, it will feel very concrete.

**Our instrumentation code uses the API:**

```javascript
// Using OpenTelemetry API
const { trace } = require('@opentelemetry/api');

app.get('/users/:id', (req, res) => {
  const tracer = trace.getTracer('my-service');
  const span = tracer.startSpan('get_user');
  span.setAttribute('user.id', req.params.id);
  
  const user = db.getUser(req.params.id);
  
  span.end();
  res.json(user);
});
```

**Our SDK configuration (in a separate file) decides where data goes:**

```javascript
// instrumentation.js - SDK configuration
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: 'http://jaeger:4318/v1/traces',  // Send to Jaeger
  }),
});

sdk.start();
```

**Want to switch backends?** Just change the SDK configuration:

```javascript
// instrumentation.js - new configuration
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: process.env.DASH0_ENDPOINT,
    headers: {
      'Authorization': `Bearer ${process.env.DASH0_AUTH_TOKEN}`,
    },
  }),
});

sdk.start();
```

**Our application code didn't change.** That's the power of the API/SDK separation.

## What is the API?

The **OpenTelemetry API** is the interface we use in our application code to create telemetry.

**Key characteristics:**

1. **Stable:** The API rarely changes. Code we write today will work in 5 years.
2. **Vendor-neutral:** Not tied to any backend.
3. **Language-specific but conceptually identical:** The JavaScript API looks different from the Python API, but they do the same things.
4. **Small surface area:** Just enough to create spans, metrics, and logs. Nothing about backends or exporters.

**What the API includes:**

```javascript
// Tracing API
const { trace } = require('@opentelemetry/api');
const tracer = trace.getTracer('service-name');
const span = tracer.startSpan('operation-name');
span.setAttribute('key', 'value');
span.end();

// Metrics API
const { metrics } = require('@opentelemetry/api');
const meter = metrics.getMeter('service-name');
const counter = meter.createCounter('requests_total');
counter.add(1);

// Context API (for propagation)
const { context } = require('@opentelemetry/api');
const activeSpan = trace.getActiveSpan();
```

**What the API does NOT include:**
- Where to send data
- How to format data for backends
- Sampling decisions
- Batching or buffering
- Resource detection

**Those are SDK responsibilities.**

## What is the SDK?

The **OpenTelemetry SDK** is the implementation that processes telemetry and sends it to backends.

**Key characteristics:**

1. **Configurable:** We configure the SDK (what backends, sampling rate, resource attributes, etc.)
2. **Pluggable:** Swap exporters, samplers, processors without changing application code
3. **Heavier:** Does the actual work of batching, formatting, and sending data
4. **Optional:** We can use the API without the SDK (it just won't send data anywhere which is useful for testing)

**What the SDK includes:**

```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { BatchSpanProcessor } = require('@opentelemetry/sdk-trace-base');

const sdk = new NodeSDK({
  // Resource: Who am I?
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'payment-service',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
  }),
  
  // Span Processor: How to process spans
  spanProcessor: new BatchSpanProcessor(
    // Exporter: Where to send spans
    new OTLPTraceExporter({
      url: 'http://localhost:4318/v1/traces',
    })
  ),
  
  // Sampler: Which traces to record
  sampler: new TraceIdRatioBasedSampler(0.1),  // 10% sampling
});

sdk.start();
```

**What the SDK does:**
- Collects spans/metrics/logs from the API
- Adds resource attributes (service name, version, host, etc.)
- Applies sampling decisions
- Batches telemetry for efficiency
- Formats data for the target backend (OTLP, Jaeger, Zipkin, etc.)
- Sends data over the network
- Handles retries and backpressure

## The architecture: how they work together

```
┌─────────────────────────────────────────────────────────────┐
│ Our Application Code                                       │
│                                                              │
│ const span = tracer.startSpan('operation');  ← Uses API    │
│ span.setAttribute('key', 'value');                          │
│ doWork();                                                    │
│ span.end();                                                  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ OpenTelemetry API                                           │
│                                                              │
│ • trace.getTracer()                                         │
│ • tracer.startSpan()                                        │
│ • span.setAttribute()                                       │
│ • span.end()                                                 │
│                                                              │
│ Just interfaces—no actual implementation                    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ OpenTelemetry SDK                                           │
│                                                              │
│ • Receives spans from API                                   │
│ • Adds resource attributes                                  │
│ • Applies sampling                                          │
│ • Batches spans                                             │
│ • Formats spans for backend                                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Exporter                                                    │
│                                                              │
│ • OTLPTraceExporter (sends to OTLP-compatible backends)    │
│ • JaegerExporter (sends to Jaeger)                         │
│ • ZipkinExporter (sends to Zipkin)                         │
│ • ConsoleSpanExporter (prints to console for debugging)    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Backend                                                     │
│                                                              │
│ • Dash0, Jaeger, Tempo etc.      │
│ • Receives and stores telemetry                            │
│ • Provides UI for querying and visualization               │
└─────────────────────────────────────────────────────────────┘
```

**Key insight:** The API and SDK are connected, but **loosely coupled**. The API doesn't know or care what SDK is being used. The SDK doesn't dictate what the API looks like.

>[!NOTE]
> **OpenTelemetry-Native Backends**
>
> Modern observability platforms like **Dash0** are built specifically for OpenTelemetry, which means:
>
> 1. **No vendor-specific exporters needed** - Uses standard OTLP
> 2. **No data transformation required** - Understands OpenTelemetry natively
> 3. **Full support for semantic conventions** - Built around the same standards we're learning
>    
> This is the advantage of the OpenTelemetry ecosystem: backends that embrace the standard make our life easier.

## Why this matters: the no-op implementation

Here's something subtle but powerful: **The API can work without an SDK.**

If we don't configure an SDK, the API uses a **no-op (no operation) implementation**:

```javascript
// Our application code
const { trace } = require('@opentelemetry/api');
const tracer = trace.getTracer('my-service');

const span = tracer.startSpan('operation');
span.setAttribute('key', 'value');
span.end();

// If no SDK is configured, these calls do nothing
// They're essentially:
// startSpan() { return { end: () => {}, setAttribute: () => {} }; }
```

**Why is this useful?**

1. **Testing:** We can test instrumented code without running a backend
2. **Gradual rollout:** Add instrumentation now, enable SDK later
3. **Library instrumentation:** Libraries can use the OpenTelemetry API without forcing users to configure an SDK

**Example:** A library author can instrument their library:

```javascript
// Inside a library (e.g., a database client)
const { trace } = require('@opentelemetry/api');

class DatabaseClient {
  async query(sql) {
    const tracer = trace.getTracer('my-db-library');
    const span = tracer.startSpan('db.query');
    span.setAttribute('db.statement', sql);
    
    const result = await this.executeQuery(sql);
    
    span.end();
    return result;
  }
}
```

**For library users:**
- If they configure an OpenTelemetry SDK, they get traces from the library automatically
- If they don't, the instrumentation is harmless (no-op)

**This is how auto-instrumentation libraries work.** They use the API, and if we've configured an SDK, we get telemetry. If not, they do nothing.

## The separation in practice

Let's see what this looks like in a real application.

### File 1: Our application code (uses API)

```javascript
// app.js
const express = require('express');
const { trace } = require('@opentelemetry/api');

const app = express();

app.get('/users/:id', async (req, res) => {
  const tracer = trace.getTracer('user-service');
  
  // Create a span using the API
  const span = tracer.startSpan('get_user');
  span.setAttribute('user.id', req.params.id);
  
  try {
    const user = await fetchUser(req.params.id);
    span.setAttribute('user.found', !!user);
    res.json(user);
  } catch (error) {
    span.recordException(error);
    res.status(500).json({ error: 'Internal error' });
  } finally {
    span.end();
  }
});

app.listen(3000);
```

**Notice:** This file imports `@opentelemetry/api` only. It has no idea about backends, exporters, or sampling.

### File 2: SDK configuration (separate file)

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
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.ENV || 'development',
  }),
  
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
  }),
  
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

console.log('OpenTelemetry SDK initialized');
```

**Notice:** This file imports SDK packages. It configures where data goes, what resource attributes to add, and what auto-instrumentation to enable.

### Running the application

```bash
# Load the SDK configuration before the app
node --require ./instrumentation.js app.js
```

The `--require` flag loads `instrumentation.js` first, which initializes the SDK. Then our app code runs, and when it calls the API, the SDK handles it.

**Want to switch from Jaeger to Dash0?** Just change `instrumentation.js`:

```javascript
// instrumentation.js - Dash0 version
const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'user-service',
  }),
  
  traceExporter: new OTLPTraceExporter({
    url: process.env.DASH0_ENDPOINT,
    headers: {
      'Authorization': `Bearer ${process.env.DASH0_AUTH_TOKEN}`,
    },
  }),
  
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

**Our `app.js` didn't change at all.**

## API packages vs SDK packages

In most languages, the API and SDK are separate packages:

**Node.js:**
```json
{
  "dependencies": {
    "@opentelemetry/api": "^1.4.0",                    // API (stable)
    "@opentelemetry/sdk-node": "^0.45.0",              // SDK
    "@opentelemetry/exporter-trace-otlp-http": "^0.45.0",  // Exporter
    "@opentelemetry/auto-instrumentations-node": "^0.45.0"  // Auto-instrumentation
  }
}
```

**Python:**
```
opentelemetry-api==1.20.0           # API (stable)
opentelemetry-sdk==1.20.0           # SDK
opentelemetry-exporter-otlp==1.20.0 # Exporter
```

**Java:**
```xml
<dependency>
  <groupId>io.opentelemetry</groupId>
  <artifactId>opentelemetry-api</artifactId>
  <version>1.30.0</version>
</dependency>
<dependency>
  <groupId>io.opentelemetry</groupId>
  <artifactId>opentelemetry-sdk</artifactId>
  <version>1.30.0</version>
</dependency>
```

**Why separate packages?**

1. **API is stable:** Version 1.x has been stable for years. Safe to depend on.
2. **SDK evolves faster:** New exporters, new features, bug fixes—without breaking the API.
3. **Libraries use API only:** Libraries can instrument code without forcing SDK dependencies on users.

## The components of the SDK

The SDK isn't one monolithic thing. It's composed of pluggable pieces:

### 1. Tracer Provider (SDK implementation of the API)

```javascript
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');

const provider = new NodeTracerProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'my-service',
  }),
});
```

This is the SDK's implementation of `trace.getTracer()`.

### 2. Span Processors (how to handle spans)

```javascript
const { BatchSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

const processor = new BatchSpanProcessor(
  new OTLPTraceExporter({ url: 'http://localhost:4318/v1/traces' })
);

provider.addSpanProcessor(processor);
```

**Span processors:**
- **BatchSpanProcessor:** Batches spans before sending (efficient for production)
- **SimpleSpanProcessor:** Sends spans immediately (useful for debugging)
- Custom processors (filter spans, add attributes, etc.)

### 3. Exporters (where to send data)

```javascript
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
const { ConsoleSpanExporter } = require('@opentelemetry/sdk-trace-base');

// OTLP exporter (standard)
const otlpExporter = new OTLPTraceExporter({
  url: 'http://localhost:4318/v1/traces',
});

// Jaeger exporter (legacy)
const jaegerExporter = new JaegerExporter({
  endpoint: 'http://localhost:14268/api/traces',
});

// Console exporter (debugging)
const consoleExporter = new ConsoleSpanExporter();
```

**We can use multiple exporters at once** (send to Jaeger and Dash0 simultaneously).

### 4. Samplers (which traces to record)

```javascript
const { TraceIdRatioBasedSampler, ParentBasedSampler } = require('@opentelemetry/sdk-trace-base');

// Sample 10% of traces
const sampler = new TraceIdRatioBasedSampler(0.1);

// Or respect parent's sampling decision
const sampler = new ParentBasedSampler({
  root: new TraceIdRatioBasedSampler(0.1),
});
```

We'll dive deeper into sampling on Day 13.

### 5. Resource Detectors (who am I?)

```javascript
const { Resource } = require('@opentelemetry/resources');
const { envDetector, hostDetector, processDetector } = require('@opentelemetry/resources');

const resource = await detectResources({
  detectors: [envDetector, hostDetector, processDetector],
});

// Automatically detects:
// - service.name (from OTEL_SERVICE_NAME env var)
// - host.name (from system)
// - process.pid (from runtime)
```

## Language-specific SDKs

Each language has its own SDK implementation, but they follow the same architecture:

**Node.js:** `@opentelemetry/sdk-node`
**Python:** `opentelemetry-sdk`
**Java:** `opentelemetry-sdk`
**Go:** `go.opentelemetry.io/otel/sdk`
**.NET:** `OpenTelemetry`

**They all:**
- Implement the same API spec
- Support the same exporters (OTLP, Jaeger, Zipkin)
- Use the same semantic conventions
- Follow the same sampling and processing model

**This is the power of standardization.** Our Go service and Node.js service produce compatible telemetry.

## A quick hands-on example (just to see it)

**Don't build this yet—just read to see the separation:**

**Step 1: Install packages**

```bash
npm install @opentelemetry/api \
            @opentelemetry/sdk-node \
            @opentelemetry/exporter-trace-otlp-http \
            @opentelemetry/auto-instrumentations-node \
            express
```

**Step 2: Create instrumentation.js (SDK)**

```javascript
// instrumentation.js
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { ConsoleSpanExporter } = require('@opentelemetry/sdk-trace-base');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

const sdk = new NodeSDK({
  traceExporter: new ConsoleSpanExporter(),  // Print spans to console
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

**Step 3: Create app.js (uses API)**

```javascript
// app.js
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

**Step 4: Run**

```bash
node --require ./instrumentation.js app.js
```

**Step 5: Make a request**

```bash
curl http://localhost:3000/hello
```

**We'll see spans printed to the console.** That's the SDK (ConsoleSpanExporter) handling spans created by the API.

**Change the exporter to Jaeger:**

```javascript
// instrumentation.js
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: 'http://localhost:4318/v1/traces',
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

**Our app.js didn't change.** That's the API/SDK separation in action.

## Common misconceptions

### Misconception 1: "The API and SDK are the same thing"

**No.** The API is a thin interface. The SDK is the heavy implementation. We use the API in our code. We configure the SDK separately.

### Misconception 2: "I need to import the SDK in my application code"

**No.** Our application code imports `@opentelemetry/api` only. The SDK is configured in a separate file (usually `instrumentation.js` or similar).

### Misconception 3: "Auto-instrumentation is part of the SDK"

**Kind of, but not exactly.** Auto-instrumentation libraries use the API and work with any SDK. They're plugins that sit between our code and the SDK.

### Misconception 4: "If I switch backends, I need to change my application code"

**No.** That's the whole point. We only change SDK configuration. Application code (which uses the API) stays the same.

## When we'll use each

**We'll interact with the API when:**
- Creating manual spans for business logic (Day 9)
- Adding attributes to spans
- Recording metrics (Day 10)
- Emitting logs (Day 11)
- Working with context (Day 12)

**We'll configure the SDK when:**
- Setting up OpenTelemetry for the first time
- Choosing where to send data (exporters)
- Configuring sampling strategies (Day 13)
- Adding resource attributes
- Tuning performance (batch sizes, timeouts, etc.)

**Most of the time:** We use the API. we configure the SDK once and forget about it.

## What I'm taking into Day 9

Today's core insight: **The OpenTelemetry API and SDK are separate. The API is what we use in our code (stable, vendor-neutral). The SDK is what we configure (pluggable, backend-specific). This separation is why OpenTelemetry is portable, we write instrumentation once and can send data anywhere.**

**The architecture:**
```
Our Code (uses API)
    ↓
OpenTelemetry API (stable interface)
    ↓
OpenTelemetry SDK (configurable implementation)
    ↓
Exporter (backend-specific)
    ↓
Backend (Dash0, Jaeger, etc.)
```

**Key takeaways:**
- The API is for application developers (creating telemetry)
- The SDK is for operators/DevOps (configuring where data goes)
- Separation enables portability and gradual adoption
- Libraries can use the API without forcing SDK choices on users
- We can swap backends by changing SDK configuration, not application code

Tomorrow (Day 9), we'll dive into the **Tracing API**: how to create nested spans, add events, and build rich traces that tell the story of our requests. We'll get properly hands-on with code examples in Node.js and Python.

See you on Day 9!
