# Day 11 – Logs API: Simple Structured Logging

For the past two days, we've learned the Tracing API ([Day 9](https://github.com/juliafmorgado/30DaysOtel/blob/main/week2/day9.md)) and Metrics API ([Day 10](https://github.com/juliafmorgado/30DaysOtel/blob/main/week2/day10.md)). Today we complete the observability trio with **basic logging** so we can answer questions like "What exactly happened during this failed greeting?"

> **Working example:** The complete code for this tutorial is available in [`examples/day11-logs-api/`](../examples/day11-logs-api/)
>
> **Note:** This builds on Days 9 & 10. If you haven't done those yet, start there: [`examples/day9-tracing-api/`](../examples/day9-tracing-api/)

---

## What we already know from Week 1

We've already been exposed to logging concepts:

- **[Day 3](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day3.md):** Logs provide detailed event information, traces show request flows
- **[Day 6](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day6.md):** Auto-instrumentation creates some logs automatically

Today's focus is about creating our **own simple logs** using the Logs API.

---

## Logs vs Traces vs Metrics: The simple difference

| Traces | Metrics | Logs |
|--------|---------|------|
| Individual request flows | Patterns across requests | Detailed messages about events |
| "Alice's greeting took 105ms" | "We sent 50 greetings today" | "Greeting failed: name too long" |
| "Why did this request fail?" | "How many requests are failing?" | "What exactly went wrong?" |
| Shows the journey/story of a request | Shows the statistics | Shows the details |

---

## Traditional vs Structured Logging

### Traditional Logging (what we used to do)
```javascript
console.log('Greeting failed for user Alice with error name too long');
```

**Problems:**
- Hard to search for specific users or errors
- No connection to traces
- Not machine-readable

### Structured Logging (OpenTelemetry way)
```javascript
logger.emit({
  severityText: 'ERROR',
  body: 'Greeting processing failed',
  attributes: {
    'user.name': 'Alice',
    'error.message': 'name too long'
  }
});
```

**Benefits:**
- Easy to search and filter
- Automatically connected to traces
- Machine-readable

---

## The magic: Automatic trace correlation

When you create a log inside a span, OpenTelemetry automatically adds the trace ID and span ID:

```javascript
tracer.startActiveSpan("create_greeting", span => {
  logger.emit({ body: "Greeting started" });
  // This log automatically gets trace_id and span_id!
});
```

**This means:**
- See a failed trace → find all logs for that request
- See an error log → jump to the exact trace
- Understand what happened, where, and when

---

## What we're building today

We'll add **simple structured logging** to the greeting API from Days 9 & 10:

**Logs we'll create:**
1. **Greeting started** - When processing begins
2. **Greeting completed** - When greeting succeeds  
3. **Greeting failed** - When any step fails

That's it! Simple logging to capture what's happening.

---

## Step 1: Set up the project

If you finished [Day 10](../examples/day10-metrics-api), copy that project:

```bash
cp -r day10-metrics-api day11-logs-api
cd day11-logs-api
```

If starting fresh:

```bash
mkdir day11-logs-api
cd day11-logs-api
npm init -y
```

**Install dependencies:**

```bash
npm install express \
  @opentelemetry/api \
  @opentelemetry/sdk-node \
  @opentelemetry/sdk-metrics \
  @opentelemetry/sdk-logs \
  @opentelemetry/resources \
  @opentelemetry/semantic-conventions \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-trace-otlp-http \
  @opentelemetry/exporter-metrics-otlp-http \
  @opentelemetry/exporter-logs-otlp-http
```

---

## Step 2: Update instrumentation to include logs

Let's update `instrumentation.js` to export traces, metrics, AND logs:

```javascript
// instrumentation.js
const { NodeSDK } = require("@opentelemetry/sdk-node");
const { getNodeAutoInstrumentations } = require("@opentelemetry/auto-instrumentations-node");
const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-http");
const { OTLPLogExporter } = require("@opentelemetry/exporter-logs-otlp-http");
const { ConsoleMetricExporter, PeriodicExportingMetricReader } = require("@opentelemetry/sdk-metrics");
const { BatchLogRecordProcessor } = require("@opentelemetry/sdk-logs");
const { resourceFromAttributes } = require("@opentelemetry/resources");
const { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } = require("@opentelemetry/semantic-conventions");

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: "greeting-service",
    [ATTR_SERVICE_VERSION]: "1.0.0",
  }),
  
  // Traces to Jaeger (from Day 9)
  traceExporter: new OTLPTraceExporter({
    url: "http://localhost:4318/v1/traces",
  }),
  
  // Metrics to console (from Day 10)
  metricReader: new PeriodicExportingMetricReader({
    exporter: new ConsoleMetricExporter(),
    exportIntervalMillis: 10000, // Export every 10 seconds for faster feedback
  }),
  
  // Logs (NEW for Day 11)
  logRecordProcessor: new BatchLogRecordProcessor(
    new OTLPLogExporter({
      url: "http://localhost:4318/v1/logs",
    })
  ),
  
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
console.log("OpenTelemetry initialized (traces + metrics + logs)");
```

**What's new:**
- Added log export alongside traces and metrics
- Logs are sent to backends that support OTLP logs
- Using the same console metrics from Day 10 for easy learning

---

## Step 3: Get a Logger (like we got Tracer and Meter)

Think of it like this:
- **Tracer** = creates spans (for traces)
- **Meter** = creates counters (for metrics)
- **Logger** = creates log messages (for logs)

```javascript
// app.js
const express = require('express');
const { trace, metrics } = require('@opentelemetry/api');
const { logs } = require('@opentelemetry/api-logs');

const app = express();

// Get a tracer (from Day 9)
const tracer = trace.getTracer('greeting-service', '1.0.0');

// Get a meter (from Day 10)
const meter = metrics.getMeter('greeting-service', '1.0.0');

// Get a logger (NEW for Day 11)
const logger = logs.getLogger('greeting-service', '1.0.0');

// =========================
// METRICS (from Day 10)
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

const greetingErrors = meter.createCounter("greeting_errors_total", {
  description: "Total number of greeting errors",
});

// =========================
// GREETING ENDPOINT (building on Days 9 & 10)
// =========================

app.get('/hello/:name', (req, res) => {
  // Count this request (from Day 10)
  requestsTotal.add(1);
  
  // Create a span for our greeting operation (from Day 9)
  tracer.startActiveSpan('create_greeting', (span) => {
    const name = req.params.name;
    
    // Add attributes to describe what we're doing (from Day 9)
    span.setAttribute('user.name', name);
    span.setAttribute('greeting.type', 'personal');
    
    // LOG: Greeting started (NEW for Day 11)
    logger.emit({
      severityText: "INFO",
      body: "Greeting processing started",
      attributes: {
        "user.name": name,
        "greeting.type": "personal",
      },
    });
    
    // Add an event to mark when we start processing (from Day 9)
    span.addEvent('processing_started');
    
    // Simple validation (NEW - to demonstrate error logging)
    if (name.length > 50) {
      // Count this error (NEW for Day 11)
      greetingErrors.add(1);
      
      // LOG: Greeting failed (NEW for Day 11)
      logger.emit({
        severityText: "ERROR",
        body: "Greeting processing failed",
        attributes: {
          "user.name": name,
          "error.message": "name too long",
          "name.length": name.length,
        },
      });
      
      span.recordException(new Error('Name too long'));
      span.setStatus({ code: 2, message: 'Name exceeds maximum length' }); // ERROR status
      span.end();
      
      return res.status(400).json({ 
        error: 'Name too long. Maximum 50 characters allowed.',
        provided_length: name.length
      });
    }
    
    // Simulate some processing time
    setTimeout(() => {
      // Create a nested span for message formatting (from Day 9)
      tracer.startActiveSpan('format_message', (formatSpan) => {
        const message = `Hello, ${name}! Welcome to OpenTelemetry tracing, metrics, and logs.`;
        
        formatSpan.setAttribute('message.length', message.length);
        formatSpan.addEvent('message_formatted');
        formatSpan.end();
        
        // Count this greeting (from Day 10)
        greetingsTotal.add(1);
        
        // Count this specific name (from Day 10)
        popularNames.add(1, { name: name });
        
        // LOG: Greeting completed successfully (NEW for Day 11)
        logger.emit({
          severityText: "INFO",
          body: "Greeting processing completed successfully",
          attributes: {
            "user.name": name,
            "message.length": message.length,
            "processing.duration_ms": 100, // We know it's ~100ms
          },
        });
        
        // Add final attributes and events to parent span (from Day 9)
        span.setAttribute('response.message', message);
        span.addEvent('processing_completed');
        span.setStatus({ code: 1 }); // OK status
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
  console.log('Logs will be sent to OTLP endpoint, metrics shown in console every 10 seconds');
});
```

**What's new for Day 11:**
- **`logger.emit()`** - Create structured log messages
- **`severityText: "INFO"`** - Normal operations
- **`severityText: "ERROR"`** - When things fail
- **`attributes`** - Structured data (user name, error message, etc.)
- **Simple validation** - Added name length check to demonstrate error logging

**Key pattern:** We log at the start, success, and failure points to capture the key events.

---

## Step 5: Run Jaeger (for traces)

```bash
docker run -d --name jaeger \
  -p 16686:16686 \
  -p 4318:4318 \
  jaegertracing/all-in-one:latest
```

Jaeger UI: http://localhost:16686

---

## Step 6: Run the application

```bash
node --require ./instrumentation.js app.js
```

We should see:
```
OpenTelemetry initialized (traces + metrics + logs)
Greeting service listening on port 3000
Logs will be sent to OTLP endpoint, metrics shown in console every 10 seconds
```

---

## Step 7: Generate traffic to see logs

Send multiple requests to generate logs:

```bash
# Send successful greetings
curl http://localhost:3000/hello/Alice
curl http://localhost:3000/hello/Bob
curl http://localhost:3000/hello/Charlie

# Send a greeting that will fail (name too long)
curl http://localhost:3000/hello/ThisNameIsWayTooLongAndWillCauseAnErrorBecauseItExceedsFiftyCharacters

# Send more successful greetings
curl http://localhost:3000/hello/Alice
curl http://localhost:3000/hello/David

# Generate more data
for i in {1..5}; do
  curl http://localhost:3000/hello/User$i
done
```

> Where do logs go?
> 
> Unlike traces (which we see in Jaeger) and metrics (which we see in console), logs need a backend that supports OTLP logs:
> 
> **For learning:** We're sending logs over OTLP, but we can't see them in Jaeger (Jaeger is primarily for traces).
> 
> **For production:** Logs go to:
> - **Dash0** - Native OpenTelemetry backend with built-in log search
> - **Other OTEL-native vendors** - Any backend that supports OTLP logs
> 
> **For now:** The goal is to emit logs correctly. Visualization comes in later weeks.

---

## Step 8: Understanding what we logged

After sending requests, our logs capture:

**Greeting Started** (INFO level)
```json
{
  "severityText": "INFO",
  "body": "Greeting processing started",
  "traceId": "abc123...",
  "spanId": "def456...",
  "attributes": {
    "user.name": "Alice",
    "greeting.type": "personal"
  }
}
```

**Greeting Completed** (INFO level)
```json
{
  "severityText": "INFO",
  "body": "Greeting processing completed successfully",
  "traceId": "abc123...",
  "spanId": "def456...",
  "attributes": {
    "user.name": "Alice",
    "message.length": 67,
    "processing.duration_ms": 100
  }
}
```

**Greeting Failed** (ERROR level)
```json
{
  "severityText": "ERROR",
  "body": "Greeting processing failed",
  "traceId": "abc123...",
  "spanId": "def456...",
  "attributes": {
    "user.name": "ThisNameIsWayTooLong...",
    "error.message": "name too long",
    "name.length": 85
  }
}
```

**Notice the automatic correlation:**
- `traceId` - Links this log to the trace in Jaeger
- `spanId` - Links this log to the specific span

---

## Logs + Traces + Metrics

Here's how all three work together:

**Metrics tell you WHEN:**
```
greeting_errors_total increased by 3 in the last hour
→ "We have a problem!"
```

**Traces tell you WHERE:**
```
Query Jaeger for failed traces in the last hour
→ See exactly which step failed
→ "All failures are in the create_greeting span"
```

**Logs tell you WHAT:**
```
Query logs for those trace IDs
→ See exact error messages
→ "Greeting failed: name too long"
```

**Example workflow:**
1. Notice `greetingErrors` counter going up (metric)
2. Query Jaeger for recent failed traces (trace)
3. Copy a failed trace ID
4. Search logs for that trace ID (log)
5. See exact error: "name too long"
6. Fix the validation or improve error handling

---

## Key takeaways

### 1: Simple structured logging

```javascript
// Create structured logs
logger.emit({
  severityText: "INFO",  // or "ERROR"
  body: "What happened",
  attributes: {
    "user.name": name,
    "error.message": error.message
  }
});
```

### 2: Log at key points

```javascript
try {
  // Log when starting
  logger.emit({ severityText: "INFO", body: "Greeting started" });
  
  // ... do work ...
  
  // Log when succeeding
  logger.emit({ severityText: "INFO", body: "Greeting completed" });
} catch (error) {
  // Log when failing
  logger.emit({ 
    severityText: "ERROR", 
    body: "Greeting failed",
    attributes: { "error.message": error.message }
  });
}
```

### 3: Use consistent attribute names

```javascript
// Good attributes
"user.name", "message.length", "processing.duration_ms"
"error.message", "greeting.type"

// Bad attributes  
"userName", "msgLen", "duration"
"errorMsg", "greetType"
```

---

## What I'm taking into Day 12

Today we learned **basic structured logging** and the final piece of basic observability:

**Key skills:**
- Creating structured logs with `logger.emit()`
- Using severity levels (INFO for normal, ERROR for failures)
- Adding structured attributes for context
- Understanding automatic trace correlation
- Using logs, traces, and metrics together

Tomorrow (Day 12) we'll learn **basic context propagation** and understand how trace context flows through our application.

See you on Day 12!