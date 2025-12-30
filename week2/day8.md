# Day 8 – API vs SDK

Welcome to Week 2!

Week 1 taught us *what* OpenTelemetry does, now Week 2 will teach us *how* to use it in real applications.

Today we’ll look at one of OpenTelemetry’s most important design decisions: why the API is separate from the SDK, and how this lets us keep our application code stable while changing how observability is implemented underneath.

**Think of it like this:** our application speaks one language (the API). The SDK is the translator. There can be different translators, some optimized for performance, others provided by vendors, but our application keeps speaking the same language.

## What we've already learned

**We've been learning about the API during week 1**

- **[Day 4](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day4.md):** When we learned `span.setAttribute('user.id', '12345')` — that's the API
- **[Day 5](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day5.md):** When we learned semantic conventions like `http.method` — those are used with the API
- **[Day 6](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day6.md):** When we learned auto-instrumentation — those libraries use the API

The API isn't new. What's new today is understanding why it's separate from the SDK.

## The problem this solves

Before OpenTelemetry, instrumenting our code meant making a commitment to a specific vendor and getting locked in. Here's what that looked like:

```javascript
// Using Vendor D's SDK directly in our application code
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
> Want to switch vendors? You have to rewrite all your instrumentation code. Every `tracer.startSpan()` call. Every `span.setTag()`. Every import.
>
>Companies would spend months rewriting instrumentation code just to switch observability vendors. This made it risky to adopt observability tooling because you might get stuck with a vendor forever.

OpenTelemetry solved this with a brilliant architectural decision: separate the "what" (API) from the "how" (SDK).

## The solution: Separating instrumentation from implementation

OpenTelemetry splits observability into two completely separate concerns:

1. **API**: This is what our application code uses. It’s the set of functions we call to describe what’s happening in our app (for example, “a request started”, “this operation took 200ms”). This part is stable and does not depend on any vendor.
2. **SDK**: This is the part that runs behind the scenes. It listens to those API calls and decides what to do with them: whether to keep the data, how much to collect, how to process it, and where to send it. Different SDKs or vendor distributions can do this differently, without requiring changes to our application code.

> [!TIP]
> **Don't get confused by the terminology:**
>
> **Instrumentation** = The activity of adding observability code to our app
> **API** = The specific methods and functions we use to do that instrumentation
>
> **Implementation** = The concept of how telemetry gets processed behind the scenes  
> **SDK** = The actual software package that does that processing
>
> So we add instrumentation (using the API) and the SDK provides the implementation. They're related concepts but not identical. You'll encounter both terms as you learn OpenTelemetry.

<details>
<summary>If the terminology is still confusing, click here for a concrete example</summary>

Let’s say we want to observe what happens when a user is loaded from the database.

**Step 1: We add instrumentation (using the API)**

```
const { trace } = require('@opentelemetry/api');

const tracer = trace.getTracer('user-service');

function getUser(id) {
  const span = tracer.startSpan('get_user'); // API call
  span.setAttribute('user.id', id);           // API call

  const user = db.getUser(id);

  span.end();                                 // API call
  return user;
}
````

What’s happening here?

- We are instrumenting our code
- We are calling API methods
- We are only describing what happens
- Nothing is sent anywhere yet

At this point, we’ve added observability signals, but we haven’t decided what to do with them.

**Step 2: The SDK provides the implementation**

Somewhere else (usually in `instrumentation.js`), we configure the SDK:
```
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: 'http://localhost:4318/v1/traces',
  }),
});

sdk.start();
````

Now, when our code calls `tracer.startSpan('get_user');`, the SDK implementation:

- creates an actual span object
- decides whether to keep or drop it
- batches it
- formats it
- sends it somewhere

All of that behavior lives in the SDK and not in our application code.
</details>

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

**Stable:** The API has been stable since v1.0 and follows semantic versioning. Method names and signatures won't change, so our instrumentation code won't break when you upgrade.

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

**Important insight:** This code looks similar to vendor-specific SDK usage, but it’s portable *across SDK implementations*. The same instrumentation works with the standard OpenTelemetry SDK, vendor distributions (like Dash0’s), or any other SDK implementation that conforms to the OpenTelemetry API.

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

**Pluggable:** The SDK is built from interchangeable components. We can mix and match samplers, processors, and exporters like building blocks (we'll study that on Week 3).

**Heavy-duty:** The SDK contains all the complex logic for efficient data processing, network communication, and backend integration.

**Optional:** The API works without an SDK (in "no-op" mode), which is perfect for testing and gradual rollouts.

**Example SDK configuration:**

```javascript
// instrumentation.js - You change this file to switch SDK implementations
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

> [!WARNING]
> **Confusing file naming alert!**
>
> The file is commonly called `instrumentation.js`, but it's actually configuring the **SDK** (implementation), not writing instrumentation code.
>
> Remember: Your **application code** does instrumentation. This file configures the **SDK implementation**.

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

The SDK is modular. Key components we can configure (we'll go deeper on [Day 13](./day13.md)):

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

## Quick hands-on preview

Let's see it work end-to-end.

**Install:**
```bash
npm install express @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/sdk-trace-node @opentelemetry/resources @opentelemetry/semantic-conventions
```

**Create instrumentation.js:**
```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { ConsoleSpanExporter } = require('@opentelemetry/sdk-trace-node');
const { resourceFromAttributes } = require('@opentelemetry/resources');
const { ATTR_SERVICE_NAME } = require('@opentelemetry/semantic-conventions');

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'demo-service',
  }),
  traceExporter: new ConsoleSpanExporter(),
  instrumentations: [],
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
OTEL_SERVICE_NAME=demo-service node --require ./instrumentation.js app.js
//The `--require` flag loads the SDK configuration before our application code runs.
```

**Test:**
```bash
curl http://localhost:3000/hello
```

Spans print to console. If we change `ConsoleSpanExporter` to `OTLPTraceExporter`, they go to our observability platform instead. **App code unchanged.**

## Common misconceptions

**"The API and SDK are the same thing"**  
❌ No. API is a thin interface. SDK is the heavy implementation.

**"I need to import the SDK in my application code"**  
❌ No. Application code imports `@opentelemetry/api` only. The SDK is loaded separately.

**"Auto-instrumentation is part of the SDK"**  
⚠️ Kind of. Auto-instrumentation uses the API and works with any SDK.

**"The API/SDK split means I can easily switch observability backends"**  
❌ Not exactly. The split keeps your application code stable when you change SDK implementations. Backend switching depends on exporters and protocols like OTLP. (We'll learn more in Week 3)

**"If I switch observability platforms, I need to change my application code"**  
❌ No. Your application code (API calls) stays the same. You only change SDK configuration like exporters and endpoints.

**"If the API works without the SDK (no-op mode), the SDK also works without the API"**  
❌ No. The SDK is literally an implementation of the API interface. Otherwise you have nothing to implement.

## What I'm taking into Day 9

**Core insight:** By separating the API from the SDK, OpenTelemetry decouples how telemetry is created from how it’s implemented. Application code depends only on the API, while different SDK implementations or vendor distributions can be swapped in without changing that code.

> If you remember just one thing:
> **The API/SDK split is about keeping your application code stable.**
> Everything else (vendors, backends, exporters) comes later.

See you on Day 9!
