# Day 12 – Context Propagation: How Trace Context Flows Through Your App

Yesterday we learned the Logs API and saw how logs automatically get trace and span IDs for correlation. Today we dive into **context propagation**, the mechanism that makes this magic happen. We'll understand how trace context flows through async operations, function calls, and even across service boundaries.

> **Working example:** The complete code for this tutorial is available in [`examples/day12-context-propagation/`](../examples/day12-context-propagation/)
>
> **Note:** This builds on Days 9-11. If you haven't done those yet, start there: [`examples/day9-tracing-api/`](../examples/day9-tracing-api/)

---

## What we already know from Week 1

We've been using context propagation without realizing it:

- **[Day 4](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day4.md):** Spans have parent-child relationships → Context propagation creates these relationships
- **[Day 6](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day6.md):** Auto-instrumentation connects spans across HTTP calls → Context propagation makes this work
- **Days 9-11:** Our manual spans automatically became children of the right parents → Context propagation handled this

Today's focus is understanding **how** context flows and **when** we need to manage it manually.

---

## What is Context Propagation?

Context propagation is how OpenTelemetry keeps track of "which trace and span am I currently in?" as our code executes.

**Think of it like this:**
- Our code is like a conversation
- Context is like "who's speaking right now?"
- Propagation is how we remember who's speaking as the conversation continues

**In OpenTelemetry terms:**
- Context contains the current trace ID and span ID
- Propagation ensures child spans know their parent
- This works automatically in most cases, but not always

---

## When Context Propagation Works Automatically

OpenTelemetry automatically propagates context through:

**Synchronous function calls**
```javascript
tracer.startActiveSpan('parent', (span) => {
  doSomething(); // This function "sees" the parent span
  span.end();
});
```

**Most async operations (Promises, async/await)**
```javascript
tracer.startActiveSpan('parent', async (span) => {
  await doAsyncWork(); // This still "sees" the parent span
  span.end();
});
```

**HTTP requests (with auto-instrumentation)**
```javascript
// Express automatically propagates context between middleware
app.use((req, res, next) => {
  // This middleware sees the same trace context
  next();
});
```

---

## When Context Propagation Breaks

Context propagation can break in these scenarios:

**Event emitters and callbacks**
```javascript
tracer.startActiveSpan('parent', (span) => {
  setTimeout(() => {
    // This callback might not see the parent span
    tracer.startActiveSpan('child', (childSpan) => {
      // This might not be a child of 'parent'
      childSpan.end();
    });
  }, 1000);
  span.end();
});
```

**Message queues and workers**
```javascript
// Producer
tracer.startActiveSpan('producer', (span) => {
  queue.send(message); // Context doesn't automatically cross queue boundaries
  span.end();
});

// Consumer (different process)
queue.receive((message) => {
  // This has no knowledge of the producer's trace
  tracer.startActiveSpan('consumer', (span) => {
    // This starts a new trace, not connected to producer
    span.end();
  });
});
```

**Thread pools and worker threads**
```javascript
tracer.startActiveSpan('main', (span) => {
  worker.postMessage(data); // Context doesn't cross thread boundaries
  span.end();
});
```

---

## What we're building today

We'll create examples showing:

1. **Automatic context propagation** (the happy path)
2. **Broken context propagation** (what goes wrong)
3. **Manual context propagation** (how to fix it)
4. **Cross-service context propagation** (HTTP headers)

---

## Step 1: Set up the project

If you finished Day 11, copy that project:

```bash
cp -r day11-logs-api day12-context-propagation
cd day12-context-propagation
```

If starting fresh:

```bash
mkdir day12-context-propagation
cd day12-context-propagation
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
  @opentelemetry/exporter-trace-otlp-http \
  @opentelemetry/exporter-metrics-otlp-http \
  @opentelemetry/exporter-logs-otlp-http \
  @opentelemetry/sdk-logs
```

---

## Step 2: Use the same instrumentation.js from Day 11

```javascript
// instrumentation.js
const { NodeSDK } = require("@opentelemetry/sdk-node");
const { getNodeAutoInstrumentations } = require("@opentelemetry/auto-instrumentations-node");
const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-http");
const { OTLPMetricExporter } = require("@opentelemetry/exporter-metrics-otlp-http");
const { OTLPLogExporter } = require("@opentelemetry/exporter-logs-otlp-http");
const { PeriodicExportingMetricReader } = require("@opentelemetry/sdk-metrics");
const { Resource } = require("@opentelemetry/resources");
const { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } = require("@opentelemetry/semantic-conventions");

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: "context-demo",
    [ATTR_SERVICE_VERSION]: "1.0.0",
  }),
  
  traceExporter: new OTLPTraceExporter({
    url: "http://localhost:4318/v1/traces",
  }),
  
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: "http://localhost:4318/v1/metrics",
    }),
    exportIntervalMillis: 5000,
  }),
  
  logRecordProcessor: new (require("@opentelemetry/sdk-logs").BatchLogRecordProcessor)(
    new OTLPLogExporter({
      url: "http://localhost:4318/v1/logs",
    })
  ),
  
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
console.log("OpenTelemetry initialized (traces + metrics + logs)");
```

---

## Step 3: Create examples showing context propagation

Create `app.js`:

```javascript
// app.js
const express = require("express");
const { trace, context, SpanStatusCode } = require("@opentelemetry/api");

const app = express();
app.use(express.json());

const tracer = trace.getTracer("context-demo", "1.0.0");

// =========================
// EXAMPLE 1: Automatic propagation (works great)
// =========================

async function automaticPropagationExample() {
  return tracer.startActiveSpan("parent_operation", async (parentSpan) => {
    parentSpan.setAttribute("example", "automatic_propagation");
    
    // This works - async/await preserves context
    await tracer.startActiveSpan("child_async", async (childSpan) => {
      childSpan.setAttribute("propagation", "automatic");
      
      // Simulate async work
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // This also works - nested spans
      await tracer.startActiveSpan("grandchild", async (grandchildSpan) => {
        grandchildSpan.setAttribute("level", "grandchild");
        await new Promise(resolve => setTimeout(resolve, 50));
        grandchildSpan.end();
      });
      
      childSpan.end();
    });
    
    parentSpan.end();
    return "Automatic propagation completed";
  });
}

// =========================
// EXAMPLE 2: Broken propagation (context lost)
// =========================

function brokenPropagationExample() {
  return tracer.startActiveSpan("parent_operation", (parentSpan) => {
    parentSpan.setAttribute("example", "broken_propagation");
    
    // This breaks - setTimeout loses context
    setTimeout(() => {
      tracer.startActiveSpan("orphaned_child", (childSpan) => {
        childSpan.setAttribute("propagation", "broken");
        childSpan.setAttribute("problem", "no_parent_context");
        
        // This span will NOT be a child of parent_operation
        // It will start a new trace!
        
        childSpan.end();
      });
    }, 100);
    
    parentSpan.end();
    return "Broken propagation example started";
  });
}

// =========================
// EXAMPLE 3: Manual propagation (fixing the break)
// =========================

function manualPropagationExample() {
  return tracer.startActiveSpan("parent_operation", (parentSpan) => {
    parentSpan.setAttribute("example", "manual_propagation");
    
    // Capture the current context
    const currentContext = context.active();
    
    setTimeout(() => {
      // Restore the context in the callback
      context.with(currentContext, () => {
        tracer.startActiveSpan("fixed_child", (childSpan) => {
          childSpan.setAttribute("propagation", "manual");
          childSpan.setAttribute("solution", "context.with");
          
          // Now this span IS a child of parent_operation!
          
          childSpan.end();
        });
      });
    }, 100);
    
    parentSpan.end();
    return "Manual propagation example started";
  });
}

// =========================
// EXAMPLE 4: Cross-service propagation simulation
// =========================

function simulateCrossServiceCall() {
  return tracer.startActiveSpan("service_a_operation", async (span) => {
    span.setAttribute("service", "service_a");
    
    // Simulate extracting trace context for HTTP headers
    const headers = {};
    
    // In real HTTP calls, auto-instrumentation does this automatically
    // But here's how you'd do it manually:
    trace.setSpanContext(context.active(), span.spanContext());
    
    // Simulate HTTP call to another service
    const response = await simulateServiceBCall(headers);
    
    span.setAttribute("response", response);
    span.end();
    
    return response;
  });
}

async function simulateServiceBCall(headers) {
  // In a real scenario, this would be a different service
  // Auto-instrumentation would extract context from HTTP headers
  
  return tracer.startActiveSpan("service_b_operation", async (span) => {
    span.setAttribute("service", "service_b");
    span.setAttribute("received_headers", Object.keys(headers).length);
    
    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 200));
    
    span.end();
    return "Service B processed request";
  });
}

// =========================
// API ENDPOINTS
// =========================

app.get("/automatic", async (req, res) => {
  try {
    const result = await automaticPropagationExample();
    res.json({ result, message: "Check Jaeger - spans should be properly nested" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/broken", async (req, res) => {
  try {
    const result = brokenPropagationExample();
    res.json({ 
      result, 
      message: "Check Jaeger - orphaned_child will be in a separate trace!" 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/manual", async (req, res) => {
  try {
    const result = manualPropagationExample();
    res.json({ 
      result, 
      message: "Check Jaeger - fixed_child should be properly nested under parent" 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/cross-service", async (req, res) => {
  try {
    const result = await simulateCrossServiceCall();
    res.json({ 
      result, 
      message: "Check Jaeger - service_b_operation should be child of service_a_operation" 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Context propagation demo listening on port ${PORT}`);
  console.log("\nTry these endpoints:");
  console.log("- GET /automatic (context works automatically)");
  console.log("- GET /broken (context gets lost)");
  console.log("- GET /manual (context manually fixed)");
  console.log("- GET /cross-service (simulated service-to-service)");
});
```

---

## Step 4: Run Jaeger and test the examples

**Start Jaeger:**
```bash
docker run -d --name jaeger \
  -p 16686:16686 \
  -p 4318:4318 \
  jaegertracing/all-in-one:latest
```

**Run the app:**
```bash
node --require ./instrumentation.js app.js
```

**Test each example:**

```bash
# 1. Automatic propagation (should work perfectly)
curl http://localhost:3000/automatic

# 2. Broken propagation (child span will be orphaned)
curl http://localhost:3000/broken

# 3. Manual propagation (child span properly connected)
curl http://localhost:3000/manual

# 4. Cross-service simulation (spans connected across "services")
curl http://localhost:3000/cross-service
```

---

## Step 5: Observe the differences in Jaeger

Open http://localhost:16686 and look for traces from the `context-demo` service.

**What we'll see:**

### Automatic Propagation
```
GET /automatic
└─ parent_operation
   └─ child_async
      └─ grandchild
```
Perfect nesting - context flowed automatically.

### Broken Propagation
```
GET /broken
└─ parent_operation

orphaned_child (separate trace!)
```
The `orphaned_child` span started a completely new trace because it lost context.

### Manual Propagation
```
GET /manual
└─ parent_operation
   └─ fixed_child
```
Using `context.with()` restored the parent-child relationship.

### Cross-Service Simulation
```
GET /cross-service
└─ service_a_operation
   └─ service_b_operation
```
Spans properly connected across simulated service boundaries.

---

## Key Context Propagation Patterns

### Pattern 1: Capturing and restoring context

```javascript
// Capture current context
const currentContext = context.active();

// Later, in a callback or different execution context
context.with(currentContext, () => {
  // Code here sees the captured context
  tracer.startActiveSpan('child', (span) => {
    // This span will be a child of the original parent
    span.end();
  });
});
```

### Pattern 2: Binding context to functions

```javascript
const boundFunction = context.bind(context.active(), () => {
  tracer.startActiveSpan('bound_span', (span) => {
    // This span will have the correct parent
    span.end();
  });
});

// Call later - context is preserved
setTimeout(boundFunction, 1000);
```

### Pattern 3: Manual span parenting

```javascript
tracer.startActiveSpan('parent', (parentSpan) => {
  // Get the span context
  const parentContext = trace.setSpanContext(context.active(), parentSpan.spanContext());
  
  setTimeout(() => {
    // Create child with explicit parent
    context.with(parentContext, () => {
      tracer.startActiveSpan('child', (childSpan) => {
        // Properly nested
        childSpan.end();
      });
    });
  }, 1000);
  
  parentSpan.end();
});
```

---

## When do we need manual context propagation?

**We typically need manual propagation for:**

1. **Event emitters and callbacks**
   ```javascript
   emitter.on('event', context.bind(context.active(), handler));
   ```

2. **Message queues** (producer → consumer)
   ```javascript
   // Producer: inject context into message
   const headers = {};
   propagation.inject(context.active(), headers);
   queue.send({ data, headers });
   
   // Consumer: extract context from message
   const extractedContext = propagation.extract(context.active(), message.headers);
   context.with(extractedContext, () => {
     // Process message with correct trace context
   });
   ```

3. **Worker threads and child processes**
   ```javascript
   // Serialize context before sending to worker
   const serializedContext = /* serialize context */;
   worker.postMessage({ data, context: serializedContext });
   ```

4. **Custom async patterns**
   ```javascript
   // Any time you're "jumping" execution contexts
   ```

---

## Cross-service context propagation

For HTTP calls between services, OpenTelemetry automatically:

1. **Injects** trace context into HTTP headers (outgoing requests)
2. **Extracts** trace context from HTTP headers (incoming requests)

**Headers used:**
- `traceparent`: W3C standard trace context
- `tracestate`: Additional vendor-specific context

**This happens automatically with auto-instrumentation**, but we can do it manually:

```javascript
const { propagation } = require('@opentelemetry/api');

// Outgoing request - inject context
const headers = {};
propagation.inject(context.active(), headers);
// headers now contains: { traceparent: "00-abc123...", tracestate: "..." }

// Incoming request - extract context
const extractedContext = propagation.extract(context.active(), req.headers);
context.with(extractedContext, () => {
  // Handle request with proper trace context
});
```

---

## Troubleshooting context propagation

### "My spans aren't connected"

**Check:**
1. Are you using `startActiveSpan` (not `startSpan`)?
2. Are you in a callback or setTimeout? Use `context.with()`
3. Are you crossing async boundaries? Capture context first
4. Are you using auto-instrumentation for HTTP calls?

### "I see multiple traces instead of one"

This usually means context was lost somewhere. Look for:
- Event emitters without bound context
- setTimeout/setInterval without context.with()
- Message queues without manual propagation

### "Context works locally but not across services"

Check:
- HTTP auto-instrumentation is enabled
- Headers aren't being stripped by proxies
- Both services use compatible OpenTelemetry versions

---

## What I'm taking into Day 13

Today we learned that **context propagation** is how trace context flows through your application:

**Key skills:**
- Understanding when context propagates automatically (sync calls, async/await)
- Recognizing when context breaks (callbacks, timeouts, queues)
- Using `context.active()` and `context.with()` for manual propagation
- How cross-service propagation works via HTTP headers
- Debugging broken trace relationships

**Tomorrow (Day 13):** We'll learn **SDK Pipelines** = samplers, processors, and exporters that control how telemetry flows through OpenTelemetry.

See you on Day 13!