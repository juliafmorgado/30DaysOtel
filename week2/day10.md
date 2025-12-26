# Day 10 – Metrics API: Counting What Matters

Yesterday we learned the Tracing API and created spans to follow individual requests through our system. Today we add **basic metrics** so we can answer simple questions like "How many orders have we processed?" and "How many orders are failing?"

> **Working example:** The complete code for this tutorial is available in [`examples/day10-metrics-api/`](../examples/day10-metrics-api/)
>
> **Note:** This builds on Day 9. If you haven't done Day 9 yet, start there: [`examples/day9-tracing-api/`](../examples/day9-tracing-api/)

---

## What we already know from Week 1

We've already been exposed to metrics concepts:

- **[Day 3](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day3.md):** Metrics show patterns across many requests, traces show individual requests
- **[Day 6](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day6.md):** Auto-instrumentation creates metrics automatically

Today's focus: creating our **own simple metrics** using the Metrics API.

---

## Metrics vs Traces: The simple difference

| Traces | Metrics |
|--------|---------|
| Individual requests | Many requests combined |
| "This order took 1200ms" | "We processed 50 orders today" |
| "Why did this specific order fail?" | "How many orders are failing?" |
| Debugging individual problems | Seeing overall patterns |

**Think of it like this:**
- **Traces** = Individual stories ("John's order failed at payment")
- **Metrics** = Statistics ("10% of orders are failing")

---

## The one metric type we'll learn today: Counter

For beginners, we only need to understand **counters** -> numbers that only go up.

### Counter (counts things that happen)

Counts events that accumulate over time: orders processed, errors that occurred, requests received.

**Examples:**
- `orders_processed_total` → How many orders we've handled (starts at 0, goes up)
- `payment_failures_total` → How many payments failed (starts at 0, goes up)
- `requests_received_total` → How many HTTP requests we got (starts at 0, goes up)

**Key rule:** Counters only increase. They reset to 0 when your app restarts.

---

## What we're building today

We'll add **simple counting metrics** to the order API from Day 9:

**Metrics we'll track:**
1. **Counter:** Total orders processed (success + failed)
2. **Counter:** Total successful orders  
3. **Counter:** Total failed orders

That's it! Simple counting to see patterns.

---

## Step 1: Set up the project

If you finished Day 9, copy that project:

```bash
cp -r day9-tracing-api day10-metrics-basics
cd day10-metrics-basics
```

If starting fresh:

```bash
mkdir day10-metrics-basics
cd day10-metrics-basics
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

## Step 2: Update instrumentation to include metrics

Let's update `instrumentation.js` to export both traces AND metrics:

```javascript
// instrumentation.js
const { NodeSDK } = require("@opentelemetry/sdk-node");
const { getNodeAutoInstrumentations } = require("@opentelemetry/auto-instrumentations-node");
const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-http");
const { OTLPMetricExporter } = require("@opentelemetry/exporter-metrics-otlp-http");
const { PeriodicExportingMetricReader } = require("@opentelemetry/sdk-metrics");
const { Resource } = require("@opentelemetry/resources");
const { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } = require("@opentelemetry/semantic-conventions");

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: "order-service",
    [ATTR_SERVICE_VERSION]: "1.0.0",
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
    exportIntervalMillis: 10000,  // Export metrics every 10 seconds
  }),
  
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
console.log("OpenTelemetry initialized (traces + metrics)");
```

**What's new:**
- Added metrics export alongside traces
- Metrics are sent every 10 seconds (not immediately like traces)

---

## Step 3: Get a Meter (like we got a Tracer on Day 9)

Think of it like this:
- **Tracer** = creates spans (for traces)
- **Meter** = creates counters (for metrics)

```javascript
// app.js
const express = require('express');
const { trace, metrics, SpanStatusCode } = require('@opentelemetry/api');

const app = express();
app.use(express.json());

// Get a tracer (from Day 9)
const tracer = trace.getTracer('order-service', '1.0.0');

// Get a meter (NEW for Day 10)
const meter = metrics.getMeter('order-service', '1.0.0');

// Next we'll create our counters
```

---

## Step 4: Create counters (create once, use everywhere)

Counters are like scoreboards. We create them once when the app starts, then update them as things happen.

```javascript
// Create counters once at startup
const ordersTotal = meter.createCounter("orders_processed_total", {
  description: "Total number of orders processed (success + failed)",
});

const ordersSuccess = meter.createCounter("orders_success_total", {
  description: "Total number of successful orders",
});

const ordersFailed = meter.createCounter("orders_failed_total", {
  description: "Total number of failed orders",
});

// Helper functions (same as Day 9)
async function validateOrder(orderData) {
  await new Promise(resolve => setTimeout(resolve, 50));
  
  if (!orderData.items || orderData.items.length === 0) {
    throw new Error('Order must contain items');
  }
  if (!orderData.userId) {
    throw new Error('Order must have a userId');
  }
}

async function checkInventory(items) {
  await new Promise(resolve => setTimeout(resolve, 200));
  return { allAvailable: true, unavailableItems: [] };
}

async function calculateShipping(orderData) {
  await new Promise(resolve => setTimeout(resolve, 100));
  return 12.99;
}

async function processPayment(amount, method) {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // 20% chance of failure for demo purposes
  if (Math.random() < 0.2) {
    throw new Error('Payment declined: insufficient funds');
  }
  
  return {
    authId: 'auth_' + Math.random().toString(36).substring(2, 11),
    status: 'approved'
  };
}

async function saveOrder(orderData) {
  await new Promise(resolve => setTimeout(resolve, 150));
  return 'ord_' + Math.random().toString(36).substring(2, 11);
}
```

**What's happening here:**
- `meter.createCounter()` creates a counter we can add numbers to
- `description` explains what the counter measures
- We create them once, then use them throughout our app

---

## Step 5: Add counting to our order endpoint

Now we'll update our `/orders` endpoint to count things as they happen:

```javascript
// Our instrumented endpoint (building on Day 9)
app.post('/orders', async (req, res) => {
  return tracer.startActiveSpan('process_order', async (orderSpan) => {
    const orderData = req.body;
    
    // Add attributes to span (from Day 9)
    orderSpan.setAttribute('order.item_count', orderData.items?.length || 0);
    orderSpan.setAttribute('user.id', orderData.userId);
    
    try {
      // Step 1: Validate
      await tracer.startActiveSpan('validate_order', async (span) => {
        try {
          await validateOrder(orderData);
          span.setStatus({ code: SpanStatusCode.OK });
        } catch (error) {
          span.recordException(error);
          span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
          throw error;
        } finally {
          span.end();
        }
      });
      
      // Step 2: Check inventory
      const inventoryResult = await tracer.startActiveSpan('check_inventory', async (span) => {
        try {
          const result = await checkInventory(orderData.items);
          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (error) {
          span.recordException(error);
          span.setStatus({ code: SpanStatusCode.ERROR });
          throw error;
        } finally {
          span.end();
        }
      });
      
      if (!inventoryResult.allAvailable) {
        throw new Error('Some items are out of stock');
      }
      
      // Step 3: Calculate shipping
      const shippingCost = await tracer.startActiveSpan('calculate_shipping', async (span) => {
        try {
          const cost = await calculateShipping(orderData);
          span.setStatus({ code: SpanStatusCode.OK });
          return cost;
        } catch (error) {
          span.recordException(error);
          span.setStatus({ code: SpanStatusCode.ERROR });
          throw error;
        } finally {
          span.end();
        }
      });
      
      // Step 4: Process payment
      const totalAmount = (orderData.total || 100) + shippingCost;
      
      await tracer.startActiveSpan('process_payment', async (span) => {
        try {
          const paymentResult = await processPayment(totalAmount, orderData.paymentMethod);
          span.setStatus({ code: SpanStatusCode.OK });
        } catch (error) {
          span.recordException(error);
          span.setStatus({ code: SpanStatusCode.ERROR, message: 'Payment failed' });
          throw error;
        } finally {
          span.end();
        }
      });
      
      // Step 5: Save order
      const orderId = await tracer.startActiveSpan('save_order', async (span) => {
        try {
          const id = await saveOrder(orderData);
          span.setStatus({ code: SpanStatusCode.OK });
          return id;
        } catch (error) {
          span.recordException(error);
          span.setStatus({ code: SpanStatusCode.ERROR });
          throw error;
        } finally {
          span.end();
        }
      });
      
      // SUCCESS! Count it.
      ordersTotal.add(1);        // One more order processed
      ordersSuccess.add(1);      // One more successful order
      
      orderSpan.setStatus({ code: SpanStatusCode.OK });
      
      res.status(201).json({
        orderId,
        status: 'created',
        total: totalAmount
      });
      
    } catch (error) {
      // FAILURE! Count it.
      ordersTotal.add(1);        // One more order processed
      ordersFailed.add(1);       // One more failed order
      
      orderSpan.recordException(error);
      orderSpan.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      
      res.status(400).json({ error: error.message });
    } finally {
      orderSpan.end();
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Order service listening on port ${PORT}`);
  console.log('Send POST requests to /orders to see metrics in action');
});
```

**What's new:**
- `ordersTotal.add(1)` - Count every order (success or failure)
- `ordersSuccess.add(1)` - Count only successful orders  
- `ordersFailed.add(1)` - Count only failed orders

**Key pattern:** We count in both the success and failure paths, so we capture everything.

---

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
Send POST requests to /orders to see metrics in action
```

---

## Step 8: Generate traffic to create metrics

Send multiple requests to generate both traces and metrics:

```bash
# Send 10 requests (some will succeed, some will fail due to payment simulation)
for i in {1..10}; do
  curl -X POST http://localhost:3000/orders \
    -H "Content-Type: application/json" \
    -d '{"userId":"user'$i'","items":[{"sku":"WIDGET-'$i'","quantity":1}],"total":99,"paymentMethod":"credit_card"}'
  echo ""  # New line
  sleep 1
done
```

**What you'll see:**
- Some requests succeed (201 status)
- Some requests fail (400 status) due to random payment failures
- All requests create traces (visible in Jaeger)
- All requests increment our counters

---

## Step 9: Understanding what we measured

After sending requests, our counters are tracking:

**ordersTotal** = Total orders processed (success + failed)
- Started at 0
- Goes up by 1 for every request
- After 10 requests: should be 10

**ordersSuccess** = Successful orders only  
- Started at 0
- Goes up by 1 only when order succeeds
- After 10 requests: should be ~8 (80% success rate)

**ordersFailed** = Failed orders only
- Started at 0  
- Goes up by 1 only when order fails
- After 10 requests: should be ~2 (20% failure rate)

**Math check:** `ordersSuccess + ordersFailed = ordersTotal` ✅

---

## Step 10: Where do metrics go?

Unlike traces (which we can see in Jaeger), metrics need a different kind of backend:

**For learning:** We're sending metrics over OTLP, but we can't see them in Jaeger (Jaeger is for traces).

**For production:** Metrics go to:
- **Dash0** - Native OpenTelemetry backend with built-in dashboards
- **Prometheus + Grafana** - Traditional open-source monitoring stack
- **Other OTEL-native vendors** - Any backend that supports OTLP metrics

**For now:** The goal is to emit metrics correctly. Visualization comes in later weeks.

---

## Metrics + Traces = Powerful combination

Here's how they work together:

**Metrics tell you WHEN and HOW MUCH:**
```
orders_failed_total increased by 5 in the last hour
→ "We have a problem!"
```

**Traces tell you WHY and WHERE:**
```
Query Jaeger for failed traces in the last hour
→ See exactly which orders failed and why
→ "All failures are in the payment step"
```

**Example workflow:**
1. Notice `ordersFailed` counter going up (metric)
2. Query Jaeger for recent failed traces (trace)
3. See that all failures are payment-related (trace details)
4. Fix the payment issue

---

## Key patterns we learned

### Pattern 1: Create counters once, use everywhere

```javascript
// At startup
const ordersTotal = meter.createCounter("orders_processed_total");

// In request handlers
ordersTotal.add(1);  // Increment by 1
```

### Pattern 2: Count in both success and failure paths

```javascript
try {
  // ... do work ...
  ordersTotal.add(1);
  ordersSuccess.add(1);
} catch (error) {
  ordersTotal.add(1);
  ordersFailed.add(1);
}
```

### Pattern 3: Use descriptive names

```javascript
// Good names
"orders_processed_total"
"payment_failures_total" 
"requests_received_total"

// Bad names
"counter1"
"stuff"
"things"
```

---

## What I'm taking into Day 11

Today we learned **basic metrics** - specifically counters that help us see patterns:

**Key skills:**
- Creating counters with `meter.createCounter()`
- Incrementing counters with `counter.add(1)`
- Counting both successes and failures
- Understanding that metrics show patterns, traces show details

**The simple pattern:**
```javascript
// Create once
const counter = meter.createCounter("things_total");

// Use everywhere
counter.add(1);  // Count one more thing
```

**Tomorrow (Day 11):** We'll learn **basic logging** and see how logs work alongside traces and metrics to give us the complete picture.

See you on Day 11!