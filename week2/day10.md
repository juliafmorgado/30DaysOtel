# Day 10 – Metrics API: Measuring What Matters

Yesterday we learned the Tracing API and created spans to follow individual requests through our system. Today we add metrics so we can answer questions like “How many orders are succeeding vs failing?”, “How long do orders take (p95)?”, “How many orders are being processed right now?”

> **Working example:** The complete code for this tutorial is available in [`examples/day10-metrics-api/`](../examples/day10-metrics-api/)
>
> **Note:** This builds on Day 9. If you haven't done Day 9 yet, start there: [`examples/day9-tracing-api/`](../examples/day9-tracing-api/)

---

## What we already know from Week 1

We’ve already been exposed to metrics concepts:

- **[Day 3](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day3.md):** Metrics show aggregate patterns, traces show individual requests
- **[Day 5](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day5.md):** Semantic conventions apply to metrics too (`http.server.request.duration`)
- **[Day 6](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day6.md):** Auto-instrumentation creates metrics automatically

Today’s focus: creating our **own metrics manually** using the Metrics API.

---

## Metrics vs Traces: The core difference

| Traces | Metrics |
|--------|---------|
| One requests | Many requests |
| "This order took 1200ms" | "Average order time: 450ms" |
| High cardinality (millions) | Low cardinality (thousands) |
| “Why did this fail?” | “How often does this fail?” |
| Debugging | Monitoring & Alerting |
| Spans, attributes, events | Counters, gauges, histograms |

---

## The three metric types we’ll use today

OpenTelemetry defines several metric instruments. For beginners, we only need three.

### 1. **Counter** (only goes up)

Counts events/things that accumulate: requests received, errors, orders processed, bytes sent. Counters only increase (they reset on process restart).

**In our app:**
- `orders.processed.total` → Total orders processed (success + failed)
- `payments.failed.total` → Total payment failures

### 2. **Histogram** (records measurements)

Use it to record values you want percentiles for. The backend can then calculate average, p50 / p95 / p99, min / max that are used for request durations, order amounts, database query time...

**In our app:**
- `order.processing.duration` → Milliseconds
- `order.total` → Distribution of order values

### 3. **UpDownCounter** (goes up and down)

Represents how many things are happening right now. Used for active requests, jobs in progress and items being processsed.

**In our app:**
- `orders.active` → Current number of active orders (increment at request start, decrement in `finally`)

>[!IMPORTANT]
>Although this looks like a “gauge” on dashboards, this is event-driven (“started” +1, “finished” -1) and OpenTelemetry models event-driven state as an `UpDownCounter`, not a Gauge.
>Gauges are for sampling system state (CPU, memory), which we’ll cover later.

---

## What we're building today

We'll add metrics to the order API from Day 9:

**Metrics we'll track:**
1. **Counter:** Total orders processed
2. **Counter:** Total payment failures
3. **Histogram:** Order processing duration
4. **Histogram:** Order total amounts
5. **UpDownCounter:** Active orders being processed

---

## Step 1: Set up the project

If you finished Day 9, reuse that project.

If not:

```bash
mkdir otel-metrics
cd otel-metrics
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
  @opentelemetry/exporter-metrics-otlp-http
```
---

## Step 2: Configure OpenTelemetry (traces + metrics)

>[!IMPORTANT]
>Important architecture note:
>- Jaeger is a tracing backend
>- Jaeger does not store application metrics
>- Metrics should be sent to:
>  - Prometheus (most common)
>  - or an OTEL-native vendor backend (Dash0 etc.)
>  - typically via the OpenTelemetry Collector
> For learning purposes, we’ll still configure metric export correctly. Later days will show proper visualization.

Let's update `instrumentation.js` to export both traces AND metrics:

```javascript
// instrumentation.js
const { NodeSDK } = require("@opentelemetry/sdk-node");
const { getNodeAutoInstrumentations } = require("@opentelemetry/auto-instrumentations-node");
const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-http");
const { OTLPMetricExporter } = require("@opentelemetry/exporter-metrics-otlp-http");
const { PeriodicExportingMetricReader } = require("@opentelemetry/sdk-metrics");
const { Resource } = require("@opentelemetry/resources");
const { SemanticResourceAttributes } = require("@opentelemetry/semantic-conventions");

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: "order-service",
    [SemanticResourceAttributes.SERVICE_VERSION]: "1.0.0",
  }),
  
  // Trace exporter (from Day 9)
  traceExporter: new OTLPTraceExporter({
    url: "http://localhost:4318/v1/traces",
  }),
  
  // Metric exporter (NEW for Day 10)
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: "http://localhost:4318/v1/metrics",
    }),
    exportIntervalMillis: 5000,  // Export metrics every 5 seconds
  }),
  
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
console.log("OpenTelemetry initialized (traces + metrics)");
```

---

## Step 3: Get a Meter (like we got a Tracer on Day 9)

Think of it like this:
- Tracer = makes spans (traces)
- Meter = makes instruments (metrics)

```javascript
// app.js
const express = require('express');
const { trace, metrics } = require('@opentelemetry/api');

const app = express();
app.use(express.json());

// Get a tracer (from Day 9)
const tracer = trace.getTracer('order-service', '1.0.0');

// Get a meter (NEW for Day 10)
const meter = metrics.getMeter('order-service', '1.0.0');

// Next we'll add metrics and define metrics using the meter
```

---

## Step 4: Create metrics (create once, reuse everywhere)

Metrics are like instruments on a car dashboard. We create them once when the app starts, then update them while the app runs.. Create metrics once at startup, not inside the request handler.

Here are the metrics we’ll use today:

```javascript
// Counter: total orders processed (success + failed)
const ordersProcessed = meter.createCounter("orders.processed.total", {
  description: "Total number of orders processed",
  unit: "1",
});

// Counter: payment failures (counts events)
const paymentFailures = meter.createCounter("payments.failed.total", {
  description: "Total number of payment failures",
  unit: "1",
});

// Histogram: order processing duration (records measurements)
const orderDuration = meter.createHistogram("order.processing.duration", {
  description: "Time spent processing an order",
  unit: "ms",
});

// Histogram: order totals (records measurements)
const orderTotal = meter.createHistogram("order.total", {
  description: "Distribution of order totals",
  unit: "1", // keep currency as an attribute instead of putting it in the unit
});

// UpDownCounter: active orders in progress (goes up and down)
const activeOrders = meter.createUpDownCounter("orders.active", {
  description: "Number of orders currently being processed",
  unit: "1",
});

```

**What’s happening here:**
- `meter.createCounter()` → creates a counter (like `tracer.startSpan()` from Day 9) we can only **add** to (`add(1)`)`, `add(5)`, etc
- `meter.createHistogram()` → lets us record values so our backend can calculate p50/p95/p99
- `meter.createUpDownCounter()` → is perfect for “in-flight right now” numbers (increment at start, decrement at end)
- `description` and `unit` → make dashboards readable

>[!NOTE]
>Beginner rule: Avoid high-cardinality attributes (no `userId`, `orderId`, timestamps).
Good attributes look like: `status`, `method`, `currency`.

---
## Step 5: Record metrics inside `/orders`

This is the exact pattern used in your app.js:
- `activeOrders.add(1)` at the start
- record success metrics on success
- record failure metrics on error
- `activeOrders.add(-1)` in `finally`
  
```javascript
// continuation in app.js
app.post("/orders", async (req, res) => {
  const startTime = Date.now();
  const paymentMethod = req.body?.paymentMethod || "credit_card";

  // UpDownCounter: one more order in progress
  activeOrders.add(1);

  return tracer.startActiveSpan("process_order", async (orderSpan) => {
    try {
      // ... validate → inventory → shipping → payment → save
      // totalAmount is calculated in our existing code

      const durationMs = Date.now() - startTime;

      // SUCCESS METRICS
      ordersProcessed.add(1, { status: "success", method: paymentMethod });
      orderDuration.record(durationMs, { status: "success" });
      orderTotal.record(totalAmount, { currency: "USD" });

      res.status(201).json({ status: "created", total: totalAmount });
    } catch (error) {
      // FAILURE METRICS
      const durationMs = Date.now() - startTime;

      ordersProcessed.add(1, { status: "failed", method: paymentMethod });
      orderDuration.record(durationMs, { status: "failed" });

      // Payment failures are counted where payment actually fails (inside process_payment span)
      res.status(400).json({ error: error.message });
    } finally {
      // UpDownCounter: order is no longer in progress
      activeOrders.add(-1);
      orderSpan.end();
    }
  });
});
```

**Where payment failures are counted**

In the `process_payment` span, on error:
```
paymentFailures.add(1, { method: paymentMethod });
```
This ensures we only count failures that truly happened during payment.

--

## Step 6: Run Jaeger (for traces)

```bash
docker run -d --name jaeger \
  -p 16686:16686 \
  -p 4318:4318 \
  jaegertracing/all-in-one:latest
```

Jaeger UI: http://localhost:16686

---

## Step 7: Run the application

```bash
node --require ./instrumentation.js app.js
```

We should see:
```
OpenTelemetry initialized (traces + metrics)
Order service listening on port 3000
```

---

## Step 8: Generate traffic

Send multiple requests to generate metrics:

```bash
# Send 20 requests
for i in {1..20}; do
  curl -X POST http://localhost:3000/orders \
    -H "Content-Type: application/json" \
    -d '{"userId":"user1","items":[{"sku":"A","quantity":1}],"total":100,"paymentMethod":"credit_card"}'
  sleep 0.5
done
```

---

## Step 9: Where do metrics go?

Jaeger is great for traces, but it’s not a metrics dashboard.

In this tutorial we export metrics over OTLP (`/v1/metrics`). In real setups we typically send metrics often through the OpenTelemetry Collector to Prometheus + Grafana, or an OTEL-native backend vendor like Dash0.

For now, the goal is: emit metrics correctly. Visualization comes later.

## What metrics did we record today?

These names match `app.js`:
- **Counter**: `orders.processed.total`
We add `1` for every order, with attributes like `{ status: "success" | "failed", method }`
- **Counter**: `payments.failed.total`
We add `1` only when payment fails, with `{ method }
- **Histogram**: `order.processing.duration` (unit: ms)
We record total request duration, with `{ status }`
- **Histogram**: `order.total` (unit: `1`, currency is an attribute)
We record the order total, with `{ currency: "USD" }`
- **UpDownCounter**: `orders.active`
We `add(1)` at the start of the request and `add(-1)` in `finally`

---

## Metrics + Traces = Powerful combination

**Use metrics to detect problems:**
```
Alert: payment.failures rate > 10/min
```

**Use traces to debug:**
```
Query traces: status=ERROR AND payment.method="credit_card"
→ See exact failures with full context
```

**Example workflow:**
1. Dashboard shows spike in `order.processing.duration` (metric)
2. Alert fires: "P95 latency > 2000ms"
3. Query traces for slow orders: `duration > 2000ms`
4. Find trace showing database query taking 1800ms
5. Fix the slow query

---

## What I'm taking into Day 11

Today we learned the **Metrics API**—the methods to create counters, histograms, and gauges:

**Key skills:**
- Creating counters with `meter.createCounter()`
- Creating histograms with `meter.createHistogram()`
- Creating gauges with `meter.createObservableGauge()`
- Adding attributes (dimensions) to metrics
- Using metrics and traces together

**Tomorrow (Day 11):** We'll learn the **Logs API** and see how to correlate logs with traces and metrics using trace context.

See you on Day 11!
