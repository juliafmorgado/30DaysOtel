# Day 11 – Logs API: Simple Structured Logging

For the past two days, we've learned the Tracing API ([Day 9](https://github.com/juliafmorgado/30DaysOtel/blob/main/week2/day9.md)) and Metrics API ([Day 10](https://github.com/juliafmorgado/30DaysOtel/blob/main/week2/day10.md)). Today we complete the observability trio with **basic logging** so we can answer questions like "What exactly happened during this failed order?"

> **Working example:** The complete code for this tutorial is available in [`examples/day11-logs-api/`](../examples/day11-logs-api/)
>
> **Note:** This builds on Days 9 & 10. If you haven't done those yet, start there: [`examples/day10-metrics-api/`](../examples/day10-metrics-api/)

---

## What we already know from Week 1

We've already been exposed to logging concepts:

- **[Day 3](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day3.md):** Logs provide detailed event information, traces show request flows
- **[Day 6](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day6.md):** Auto-instrumentation creates some logs automatically

Today's focus: creating our **own simple logs** using the Logs API.

---

## Logs vs Traces vs Metrics: The simple difference

| Traces | Metrics | Logs |
|--------|---------|------|
| Individual request flows | Patterns across requests | Detailed messages about events |
| "This order took 1200ms" | "We processed 50 orders today" | "Payment failed: insufficient funds" |
| "Why did this request fail?" | "How many requests are failing?" | "What exactly went wrong?" |
| Shows the journey | Shows the statistics | Shows the details |

**Think of it like this:**
- **Traces** = The story of a request ("John's order went through these steps")
- **Metrics** = The statistics ("10% of orders are failing")  
- **Logs** = The details ("Payment failed because card was declined")

---

## Traditional vs Structured Logging

### Traditional Logging (what we used to do)
```javascript
console.log('Payment failed for user user_123 with error insufficient funds');
```

**Problems:**
- Hard to search for specific users or errors
- No connection to traces
- Not machine-readable

### Structured Logging (OpenTelemetry way)
```javascript
logger.emit({
  severityText: 'ERROR',
  body: 'Payment processing failed',
  attributes: {
    'user.id': 'user_123',
    'error.message': 'insufficient funds'
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
tracer.startActiveSpan("process_payment", span => {
  logger.emit({ body: "Payment started" });
  // This log automatically gets trace_id and span_id!
});
```

**This means:**
- See a failed trace → find all logs for that request
- See an error log → jump to the exact trace
- Understand what happened, where, and when

---

## What we're building today

We'll add **simple structured logging** to the order API from Days 9 & 10:

**Logs we'll create:**
1. **Order started** - When processing begins
2. **Order completed** - When order succeeds  
3. **Order failed** - When any step fails

That's it! Simple logging to capture what's happening.

---

## Step 1: Set up the project

If you finished Day 10, copy that project:

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
  @opentelemetry/resources \
  @opentelemetry/semantic-conventions \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-trace-otlp-http \
  @opentelemetry/exporter-metrics-otlp-http \
  @opentelemetry/exporter-logs-otlp-http \
  @opentelemetry/sdk-logs
```

---

## Step 2: Update instrumentation to include logs

Let's update `instrumentation.js` to export traces, metrics, AND logs:

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
    [ATTR_SERVICE_NAME]: "order-service",
    [ATTR_SERVICE_VERSION]: "1.0.0",
  }),
  
  // Trace exporter (from Day 9)
  traceExporter: new OTLPTraceExporter({
    url: "http://localhost:4318/v1/traces",
  }),
  
  // Metric exporter (from Day 10)
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: "http://localhost:4318/v1/metrics",
    }),
    exportIntervalMillis: 10000,  // Export metrics every 10 seconds
  }),
  
  // Log exporter (NEW for Day 11)
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

**What's new:**
- Added log export alongside traces and metrics
- Logs are sent to backends that support OTLP logs

---

## Step 3: Get a Logger (like we got Tracer and Meter)

Think of it like this:
- **Tracer** = creates spans (for traces)
- **Meter** = creates counters (for metrics)
- **Logger** = creates log messages (for logs)

```javascript
// app.js
const express = require('express');
const { trace, metrics, logs, SpanStatusCode } = require('@opentelemetry/api');

const app = express();
app.use(express.json());

// Get a tracer (from Day 9)
const tracer = trace.getTracer('order-service', '1.0.0');

// Get a meter (from Day 10)
const meter = metrics.getMeter('order-service', '1.0.0');

// Get a logger (NEW for Day 11)
const logger = logs.getLogger('order-service', '1.0.0');

// Next we'll add our counters and logging
```

---

## Step 4: Add simple logging to our order endpoint

Now we'll update our `/orders` endpoint to log key events:

```javascript
// Create counters (from Day 10)
const ordersTotal = meter.createCounter("orders_processed_total", {
  description: "Total number of orders processed (success + failed)",
});

const ordersSuccess = meter.createCounter("orders_success_total", {
  description: "Total number of successful orders",
});

const ordersFailed = meter.createCounter("orders_failed_total", {
  description: "Total number of failed orders",
});

// Helper functions (same as Days 9 & 10)
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

// Our instrumented endpoint (building on Days 9 & 10)
app.post('/orders', async (req, res) => {
  return tracer.startActiveSpan('process_order', async (orderSpan) => {
    const orderData = req.body;
    
    // Add attributes to span (from Day 9)
    orderSpan.setAttribute('order.item_count', orderData.items?.length || 0);
    orderSpan.setAttribute('user.id', orderData.userId);
    
    // LOG: Order started (NEW for Day 11)
    logger.emit({
      severityText: "INFO",
      body: "Order processing started",
      attributes: {
        "user.id": orderData.userId,
        "order.item_count": orderData.items?.length || 0,
      },
    });
    
    try {
      // Step 1: Validate (same as before)
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
      
      // Step 2: Check inventory (same as before)
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
      
      // Step 3: Calculate shipping (same as before)
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
      
      // Step 4: Process payment (same as before)
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
      
      // Step 5: Save order (same as before)
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
      
      // SUCCESS! Count it (from Day 10) and log it (NEW for Day 11)
      ordersTotal.add(1);        
      ordersSuccess.add(1);      
      
      // LOG: Order completed successfully (NEW for Day 11)
      logger.emit({
        severityText: "INFO",
        body: "Order processing completed successfully",
        attributes: {
          "order.id": orderId,
          "user.id": orderData.userId,
          "order.total": totalAmount,
        },
      });
      
      orderSpan.setStatus({ code: SpanStatusCode.OK });
      
      res.status(201).json({
        orderId,
        status: 'created',
        total: totalAmount
      });
      
    } catch (error) {
      // FAILURE! Count it (from Day 10) and log it (NEW for Day 11)
      ordersTotal.add(1);        
      ordersFailed.add(1);       
      
      // LOG: Order failed (NEW for Day 11)
      logger.emit({
        severityText: "ERROR",
        body: "Order processing failed",
        attributes: {
          "user.id": orderData.userId,
          "error.message": error.message,
        },
      });
      
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
  console.log('Send POST requests to /orders to see logs in action');
});
```

**What's new:**
- `logger.emit()` - Create structured log messages
- `severityText: "INFO"` - Normal operations
- `severityText: "ERROR"` - When things fail
- `attributes` - Structured data (user ID, error message, etc.)

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
Order service listening on port 3000
Send POST requests to /orders to see logs in action
```

---

## Step 7: Generate traffic to see logs

Send multiple requests to generate logs:

```bash
# Send 10 requests (some will succeed, some will fail)
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
- All requests increment counters (from Day 10)
- All requests create structured logs (NEW!)

---

## Step 8: Understanding what we logged

After sending requests, our logs capture:

**Order Started** (INFO level)
```json
{
  "severityText": "INFO",
  "body": "Order processing started",
  "traceId": "abc123...",
  "spanId": "def456...",
  "attributes": {
    "user.id": "user1",
    "order.item_count": 1
  }
}
```

**Order Completed** (INFO level)
```json
{
  "severityText": "INFO",
  "body": "Order processing completed successfully",
  "traceId": "abc123...",
  "spanId": "def456...",
  "attributes": {
    "order.id": "ord_xyz789",
    "user.id": "user1",
    "order.total": 111.99
  }
}
```

**Order Failed** (ERROR level)
```json
{
  "severityText": "ERROR",
  "body": "Order processing failed",
  "traceId": "abc123...",
  "spanId": "def456...",
  "attributes": {
    "user.id": "user1",
    "error.message": "Payment declined: insufficient funds"
  }
}
```

**Notice the automatic correlation:**
- `traceId` - Links this log to the trace in Jaeger
- `spanId` - Links this log to the specific span

---

## Step 9: Where do logs go?

Unlike traces (which we see in Jaeger), logs need a backend that supports OTLP logs:

**For learning:** We're sending logs over OTLP, but we can't see them in Jaeger (Jaeger is primarily for traces).

**For production:** Logs go to:
- **Dash0** - Native OpenTelemetry backend with built-in log search
- **Elasticsearch + Kibana** - Traditional log management stack
- **Other OTEL-native vendors** - Any backend that supports OTLP logs

**For now:** The goal is to emit logs correctly. Visualization comes in later weeks.

---

## Logs + Traces + Metrics = Complete observability

Here's how all three work together:

**Metrics tell you WHEN:**
```
orders_failed_total increased by 5 in the last hour
→ "We have a problem!"
```

**Traces tell you WHERE:**
```
Query Jaeger for failed traces in the last hour
→ See exactly which step failed
→ "All failures are in the payment step"
```

**Logs tell you WHAT:**
```
Query logs for those trace IDs
→ See exact error messages
→ "Payment declined: insufficient funds"
```

**Example workflow:**
1. Notice `ordersFailed` counter going up (metric)
2. Query Jaeger for recent failed traces (trace)
3. Copy a failed trace ID
4. Search logs for that trace ID (log)
5. See exact error: "Payment declined: insufficient funds"
6. Fix the payment handling

---

## Key patterns we learned

### Pattern 1: Simple structured logging

```javascript
// Create structured logs
logger.emit({
  severityText: "INFO",  // or "ERROR"
  body: "What happened",
  attributes: {
    "user.id": userId,
    "error.message": error.message
  }
});
```

### Pattern 2: Log at key points

```javascript
try {
  // Log when starting
  logger.emit({ severityText: "INFO", body: "Order started" });
  
  // ... do work ...
  
  // Log when succeeding
  logger.emit({ severityText: "INFO", body: "Order completed" });
} catch (error) {
  // Log when failing
  logger.emit({ 
    severityText: "ERROR", 
    body: "Order failed",
    attributes: { "error.message": error.message }
  });
}
```

### Pattern 3: Use consistent attribute names

```javascript
// Good attributes
"user.id", "order.id", "order.total"
"error.message", "payment.method"

// Bad attributes  
"userId", "orderId", "total"
"errorMsg", "payMethod"
```

---

## What I'm taking into Day 12

Today we learned **basic structured logging** - the final piece of basic observability:

**Key skills:**
- Creating structured logs with `logger.emit()`
- Using severity levels (INFO for normal, ERROR for failures)
- Adding structured attributes for context
- Understanding automatic trace correlation
- Using logs, traces, and metrics together

**The complete pattern:**
```javascript
tracer.startActiveSpan('process_order', async (span) => {
  // Log what's happening
  logger.emit({ severityText: "INFO", body: "Order started" });
  
  try {
    // ... do work ...
    
    // Count successes
    ordersSuccess.add(1);
    
    // Log success
    logger.emit({ severityText: "INFO", body: "Order completed" });
  } catch (error) {
    // Count failures  
    ordersFailed.add(1);
    
    // Log failure
    logger.emit({ 
      severityText: "ERROR", 
      body: "Order failed",
      attributes: { "error.message": error.message }
    });
  }
});
```

**Tomorrow (Day 12):** We'll learn **basic context propagation** and understand how trace context flows through your application.

See you on Day 12!