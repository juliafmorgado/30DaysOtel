# Day 13 – SDK Pipelines: Understanding Samplers, Processors, and Exporters

Yesterday we learned how context propagation keeps traces connected as they flow through our applications. Today we'll get a **gentle introduction** to SDK pipelines - the basic components that control how your telemetry gets from your code to your observability backend.

> **Working example:** The complete code for this tutorial is available in [`examples/day13-sdk-basics/`](../examples/day13-sdk/)
>
> **Note:** This builds on Days 8-12. If you haven't done those yet, start with [`examples/day9-tracing-api/`](../examples/day9-tracing-api/)

---

## What we already know from previous days

We've been using SDK components without realizing it:

- **[Day 8](https://github.com/juliafmorgado/30DaysOtel/blob/main/week2/day8.md):** The SDK handles telemetry processing → Today we'll see what that means
- **[Day 9-11](https://github.com/juliafmorgado/30DaysOtel/blob/main/week2/day9.md):** Our spans automatically reached Jaeger → An exporter sent them there
- **[Day 12](https://github.com/juliafmorgado/30DaysOtel/blob/main/week2/day12.md):** All our spans were collected → A sampler decided to keep them all

Today's focus is understanding **what these components do** and **seeing them in action** with simple examples.

---

## Study Section (15 minutes)

Before we dive into coding, let's understand the official concepts:

**Read this:** [OpenTelemetry SDK Configuration](https://opentelemetry.io/docs/concepts/sdk-configuration/)

**Focus on these sections:**
- **Sampler types** - Different ways to control which spans get collected
- **Span processors** - How spans are handled before export (simple vs batch)
- **Exporters** - Where spans get sent (console, OTLP, etc.)
- **Resource attributes** - Metadata about your service

**Key takeaway:** The SDK pipeline gives you control over cost (sampling), performance (processing), and destination (exporting) without changing your application code.

---

## What is an SDK Pipeline?

Think of an SDK pipeline like a simple assembly line for your telemetry data:

```
Your Code → Sampler → Processor → Exporter → Backend
    ↓           ↓          ↓          ↓         ↓
  Creates    "Keep it?"  "Package"   "Send"   "Store"
   spans                   spans     spans    spans
```

**Three main jobs:**
1. **Sampler** - "Should we keep this span?" (saves money and storage)
2. **Processor** - "How should we package spans before sending?" (batching for efficiency)
3. **Exporter** - "Where should we send the spans?" (Jaeger, console, etc.)

---

## Samplers: The "Keep It or Drop It?" Decision

A sampler decides whether to create and keep a span. This happens **right when your code tries to create a span**.

### Why do we need samplers?

Imagine your app handles 1000 requests per second:
- **Without sampling:** 1000+ spans per second = expensive storage, slow queries
- **With 10% sampling:** ~100 spans per second = much cheaper, still useful

### The Basic Sampler Types

**1. AlwaysOnSampler (what we've been using)**
```javascript
// Keep 100% of spans - good for learning and development
// This is the default when you don't specify a sampler
const sampler = new AlwaysOnSampler();
```

**2. AlwaysOffSampler**
```javascript
// Keep 0% of spans - useful for disabling tracing
const sampler = new AlwaysOffSampler();
```

**3. TraceIdRatioBasedSampler**
```javascript
// Keep a percentage of spans - good for production
// Example: Keep 10% of spans
const sampler = new TraceIdRatioBasedSampler(0.1);
```

**4. ParentBasedSampler**
```javascript
// Follow parent span's sampling decision - good for distributed systems
const sampler = new ParentBasedSampler({
  root: new TraceIdRatioBasedSampler(0.1), // For root spans (10%)
});
```

### Head-Based Sampling (SDK-Level Decisions)

**Key concept:** Sampling decisions are made **upfront** when the trace starts, not after it completes.

**How TraceIdRatioBasedSampler works:**
- OpenTelemetry looks at the trace ID (a big random number)
- If the number falls in the "keep" range, it keeps the whole trace
- If not, it drops the whole trace
- This ensures complete traces (not partial ones)
- **Decision is made immediately** when `startActiveSpan()` is called

---

## Processors: The "How to Package" Decision

A processor decides how to handle spans before sending them out.

### The Two Basic Processors

**1. SimpleSpanProcessor**
```javascript
// Send each span immediately when it ends
// Good for: Learning, debugging, low-traffic apps
// Bad for: High-traffic apps (too many network calls)
```

**2. BatchSpanProcessor**
```javascript
// Collect spans and send them in batches
// Good for: Production apps (fewer network calls)
// Example: Send 100 spans every 5 seconds
```

**Why batching matters:**
- Sending 1 span = 1 network call
- Sending 100 spans in a batch = 1 network call
- Much more efficient for your app and the backend

---

## Exporters: The "Where to Send" Decision

An exporter decides where to send your telemetry data.

### The Basic Exporters We'll Use

**1. ConsoleSpanExporter**
```javascript
// Print spans to your terminal
// Good for: Learning, debugging, seeing what's happening
```

**2. OTLPTraceExporter**
```javascript
// Send spans to any OTLP-compatible backend (like Jaeger)
// Good for: Real observability backends
```

---

## Resource Attributes: Describing Your Service

Resource attributes describe **who** is producing the telemetry - your service, version, environment, etc.

### Basic Resource Attributes

```javascript
const { Resource } = require("@opentelemetry/resources");
const { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } = require("@opentelemetry/semantic-conventions");

const resource = new Resource({
  [ATTR_SERVICE_NAME]: "my-order-service",
  [ATTR_SERVICE_VERSION]: "1.2.0",
  "deployment.environment": "production",
  "service.team": "checkout",
});
```

**Why resource attributes matter:**
- **Service identification** - Which service created this span?
- **Version tracking** - Which version had the bug?
- **Environment separation** - Is this from dev, staging, or prod?
- **Team ownership** - Who should be notified about issues?

**These attributes appear on ALL spans** from your service, making them easy to filter and search.

---

## What we're building today

We'll create **simple examples** showing:

1. **Console exporter** - See spans printed to terminal
2. **Different sampling rates** - See how sampling affects what gets collected
3. **Batching vs immediate** - See the difference in export timing
4. **Basic configuration** - Learn how to set these up

This is about **understanding the concepts**, not complex production setups.

---

## Step 1: Set up the project

```bash
mkdir day13-sdk-basics
cd day13-sdk-basics
npm init -y
```

**Install dependencies:**

```bash
npm install express \
  @opentelemetry/api \
  @opentelemetry/sdk-node \
  @opentelemetry/resources \
  @opentelemetry/semantic-conventions \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-trace-otlp-http
```

---

## Step 2: Create a console-only setup (see spans in terminal)

Create `instrumentation-console.js`:

```javascript
// instrumentation-console.js - See spans in your terminal
const { NodeSDK } = require("@opentelemetry/sdk-node");
const { ConsoleSpanExporter } = require("@opentelemetry/sdk-trace-node");
const { Resource } = require("@opentelemetry/resources");
const { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } = require("@opentelemetry/semantic-conventions");
const { SimpleSpanProcessor } = require("@opentelemetry/sdk-trace-node");

const sdk = new NodeSDK({
  // Resource attributes - describe your service
  resource: new Resource({
    [ATTR_SERVICE_NAME]: "sdk-basics-demo",
    [ATTR_SERVICE_VERSION]: "1.0.0",
    "deployment.environment": "development",
    "service.team": "platform",
  }),
  
  // Use console exporter so we can see spans in terminal
  spanProcessor: new SimpleSpanProcessor(
    new ConsoleSpanExporter()
  ),
  
  // No auto-instrumentation for now - we want to see our manual spans clearly
  instrumentations: [],
});

sdk.start();
console.log("✅ SDK initialized - spans will print to console");
```

---

## Step 3: Create a simple app to test with

Create `app.js`:

```javascript
// app.js
const express = require("express");
const { trace } = require("@opentelemetry/api");

const app = express();
const tracer = trace.getTracer("sdk-basics", "1.0.0");

// Simple endpoint that creates a span
app.get("/hello", (req, res) => {
  // Create a span - this will be processed by our SDK pipeline
  tracer.startActiveSpan("hello_operation", (span) => {
    span.setAttribute("greeting", "hello world");
    span.setAttribute("timestamp", new Date().toISOString());
    
    // Simulate some work
    setTimeout(() => {
      span.setAttribute("work", "completed");
      span.end();
      
      res.json({ 
        message: "Hello! Check your terminal to see the span." 
      });
    }, 100);
  });
});

// Create multiple spans quickly
app.get("/multiple", (req, res) => {
  const count = 5;
  
  for (let i = 0; i < count; i++) {
    tracer.startActiveSpan(`span_${i}`, (span) => {
      span.setAttribute("span.number", i);
      span.setAttribute("batch", "multiple_test");
      
      // End span after a short delay
      setTimeout(() => {
        span.end();
      }, i * 50); // Stagger the endings
    });
  }
  
  res.json({ 
    message: `Created ${count} spans. Check your terminal!` 
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 App listening on port ${PORT}`);
  console.log("Try: curl http://localhost:3000/hello");
  console.log("Try: curl http://localhost:3000/multiple");
});
```

---

## Step 4: Test the console exporter

**Run the app:**
```bash
node --require ./instrumentation-console.js app.js
```

**Test it:**
```bash
# Create a single span
curl http://localhost:3000/hello

# Create multiple spans
curl http://localhost:3000/multiple
```

**What you'll see in terminal:**
```json
{
  "traceId": "abc123...",
  "spanId": "def456...",
  "name": "hello_operation",
  "attributes": {
    "greeting": "hello world",
    "timestamp": "2024-01-13T10:30:00.000Z",
    "work": "completed"
  },
  "status": { "code": "UNSET" },
  "events": []
}
```

This is what a span looks like! The **console exporter** shows you exactly what data is being created.

---

## Step 5: Add sampling to see the difference

Create `instrumentation-sampled.js`:

```javascript
// instrumentation-sampled.js - Only keep 50% of spans
const { NodeSDK } = require("@opentelemetry/sdk-node");
const { ConsoleSpanExporter } = require("@opentelemetry/sdk-trace-node");
const { Resource } = require("@opentelemetry/resources");
const { ATTR_SERVICE_NAME } = require("@opentelemetry/semantic-conventions");
const { 
  SimpleSpanProcessor,
  TraceIdRatioBasedSampler 
} = require("@opentelemetry/sdk-trace-node");

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: "sdk-basics-demo",
  }),
  
  // Only keep 50% of traces
  sampler: new TraceIdRatioBasedSampler(0.5),
  
  spanProcessor: new SimpleSpanProcessor(
    new ConsoleSpanExporter()
  ),
  
  instrumentations: [],
});

sdk.start();
console.log("✅ SDK initialized with 50% sampling - some spans will be dropped");
```

**Test sampling:**
```bash
# Stop the previous app and run with sampling
node --require ./instrumentation-sampled.js app.js

# Create multiple spans - only about half should appear in terminal
curl http://localhost:3000/multiple
curl http://localhost:3000/multiple
curl http://localhost:3000/multiple
```

You'll notice that some spans don't appear in the terminal - they were **dropped by the sampler**.

---

## Step 6: Compare with Jaeger export

Create `instrumentation-jaeger.js`:

```javascript
// instrumentation-jaeger.js - Send to Jaeger instead of console
const { NodeSDK } = require("@opentelemetry/sdk-node");
const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-http");
const { Resource } = require("@opentelemetry/resources");
const { ATTR_SERVICE_NAME } = require("@opentelemetry/semantic-conventions");
const { 
  BatchSpanProcessor,
  TraceIdRatioBasedSampler 
} = require("@opentelemetry/sdk-trace-node");

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: "sdk-basics-demo",
  }),
  
  // Keep all spans for this demo
  sampler: new TraceIdRatioBasedSampler(1.0), // 100%
  
  // Use batch processor (more efficient for real backends)
  spanProcessor: new BatchSpanProcessor(
    new OTLPTraceExporter({
      url: "http://localhost:4318/v1/traces",
    })
  ),
  
  instrumentations: [],
});

sdk.start();
console.log("SDK initialized - spans will be batched and sent to Jaeger");
```

**Start Jaeger and test:**
```bash
# Start Jaeger
docker run -d --name jaeger \
  -p 16686:16686 \
  -p 4318:4318 \
  jaegertracing/all-in-one:latest

# Run app with Jaeger export
node --require ./instrumentation-jaeger.js app.js

# Create spans
curl http://localhost:3000/multiple

# Check Jaeger UI at http://localhost:16686
```

**Key difference:** With **BatchSpanProcessor**, spans are collected and sent in groups, not one by one.

---

## Step 7: Understanding the differences

### Console vs Jaeger Export

**Console Exporter:**
- ✅ Great for learning - you see exactly what's happening
- ✅ No external dependencies
- ❌ Not useful for real applications

**OTLP Exporter:**
- ✅ Works with real observability backends
- ✅ Industry standard protocol
- ❌ Requires a backend to be running

### Simple vs Batch Processor

**SimpleSpanProcessor:**
- ✅ Immediate export - good for debugging
- ✅ Simple to understand
- ❌ Inefficient for high-traffic apps

**BatchSpanProcessor:**
- ✅ More efficient - fewer network calls
- ✅ Better for production
- ❌ Slight delay before spans appear

### Sampling Rates

**100% Sampling (ratio = 1.0):**
- ✅ Keep all traces - nothing is missed
- ❌ Expensive for high-traffic applications

**Partial Sampling (ratio = 0.1):**
- ✅ Much cheaper storage and processing
- ✅ Still get representative traces
- ❌ Might miss some important traces

---

## Key Concepts for Beginners

### 1. Sampling happens early
```javascript
// When you call startActiveSpan(), the sampler decides immediately:
tracer.startActiveSpan("my_span", (span) => {
  // If sampler said "no", this span won't be created at all
  // If sampler said "yes", this span will be fully processed
});
```

### 2. Processors control timing
```javascript
// SimpleSpanProcessor: span.end() → immediate export
// BatchSpanProcessor: span.end() → add to batch → export later
```

### 3. Exporters control destination
```javascript
// ConsoleSpanExporter → your terminal
// OTLPTraceExporter → Jaeger, Dash0, etc.
// You can even use multiple exporters at once
```

---

## What I'm taking into Day 14

Today we learned the **basic building blocks** of SDK pipelines:

**Key concepts:**
- **Samplers** decide which spans to keep (saves money and storage)
- **Processors** decide how to package spans (immediate vs batched)
- **Exporters** decide where to send spans (console, Jaeger, etc.)

**Practical skills:**
- Using ConsoleSpanExporter to see spans in terminal
- Configuring basic sampling rates
- Understanding the difference between simple and batch processing

**Tomorrow (Day 14):** We'll **put it all together** with a hands-on project that uses everything we've learned in Week 2, plus review all the concepts before moving to the OpenTelemetry Collector in Week 3.
