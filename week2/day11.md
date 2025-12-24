# Day 11 – Logs API: Structured Logging with Trace Correlation

For the past two days, we've learned the Tracing API ([Day 9](https://github.com/juliafmorgado/30DaysOtel/blob/main/week2/day9.md)) and Metrics API ([Day 10](https://github.com/juliafmorgado/30DaysOtel/blob/main/week2/day10.md)). Today we complete the observability trio with the **Logs API** so we can answer questions like "What exactly happened during this failed order?", "Which user had payment issues?", "What were the exact steps that led to this error?"

> **Working example:** The complete code for this tutorial is available in [`examples/day11-logs-api/`](../examples/day11-logs-api/)
>
> **Note:** This builds on Days 9 & 10. If you haven't done those yet, start there: [`examples/day9-tracing-api/`](../examples/day9-tracing-api/)

---

## What we already know from Week 1

We've already been exposed to logging concepts:

- **[Day 3](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day3.md):** Logs provide detailed event information, traces show request flows
- **[Day 5](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day5.md):** Semantic conventions apply to logs too (structured attributes)
- **[Day 6](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day6.md):** Auto-instrumentation creates some logs automatically

---

## Logs vs Traces vs Metrics: The complete picture

| Traces | Metrics | Logs |
|--------|---------|------|
| Request flows | Aggregate patterns | Detailed events |
| "This order took 1200ms" | "Average order time: 450ms" | "Payment failed: insufficient funds" |
| Spans, attributes, events | Counters, gauges, histograms | Structured messages with attributes |
| "Why did this fail?" | "How often does this fail?" | "What exactly happened?" |
| Debugging flows | Monitoring & Alerting | Debugging details |

---

## Traditional vs Structured Logging

### Traditional Logging (what we used to do)
```javascript
console.log('Payment processed for user user_123 amount 149.99 USD');
```

**Problems:**
- Hard to search and filter
- No correlation with traces
- Difficult to extract specific values
- Not machine-readable

### Structured Logging (OpenTelemetry way)
```javascript
logger.emit({
  severityText: 'INFO',
  body: 'Payment processed successfully',
  attributes: {
    'user.id': 'user_123',
    'payment.amount': 149.99,
    'payment.currency': 'USD'
  }
});
```

**These logs are machine-parseable, queryable, filterable and they automatically includes trace_id and span_id.**

---

## Log severity levels

| Level | Number | When to use | Example |
|-------|--------|-------------|-------------|
| `DEBUG` | 5 | Detailed debugging information for Devs |
| `INFO` | 9 | General informational messages | "Payment processed successfully" |
| `WARN` | 13 | Warning messages (potential issues) | "Payment processing slow (>2s)" |
| `ERROR` | 17 | Error messages (operation failed) | "Payment failed: Card declined"|

---

## How log correlation works

When you emit a log inside an active span, OpenTelemetry automatically adds `trace_id` and `span_id`.

```javascript
tracer.startActiveSpan("process_payment", span => {
  logger.emit({ body: "Payment started" });
});
```
**Now we can:**
- Click a failed trace → see all logs for that request
- See an error log → jump to the exact trace
- Understand what happened, where, and when

> [!NOTE]
> **Mental model**
>
> Metrics → WHEN (failures spiked at 10:30 AM)
> 
> Logs → WHAT (payment declined, insufficient funds)
> 
> Traces → WHERE (in payment span) and WHO (user_42)
> 
> All three together = **observability.**

---

## What we're building today

We'll add structured logging to the order API from Days 9 & 10:

**Logs we'll create:**
1. **Order started** - When processing begins
2. **Payment failed** - When payment processing fails
3. **Order completed** - When order succeeds
4. **Order failed** - When any step fails

All logs will automatically include trace and span IDs for correlation.

---

## Step 1: Install log dependencies

Building on Day 10's project:

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

## Step 2: Configure OpenTelemetry (traces + metrics + logs)

>[!IMPORTANT]
>Important architecture note:
>- Jaeger is primarily a tracing backend
>- Jaeger does not store application logs in a searchable way
>- Logs should be sent to **Dash0** (native OpenTelemetry backend) or another OTEL-native backends** that support OTLP
>  - typically via the OpenTelemetry Collector in production
> For learning purposes, we'll configure log export correctly. The OTLP export works with any compatible backend.

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
    exportIntervalMillis: 5000,  // Export metrics every 5 seconds
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

---

## Step 3: Get a Logger (like we got Tracer and Meter)

Think of it like this:
- Tracer = makes spans (traces)
- Meter = makes instruments (metrics)
- Logger = makes log records (logs)

```javascript
// app.js
const express = require('express');
const { trace, metrics, logs } = require('@opentelemetry/api');

const app = express();
app.use(express.json());

// Get a tracer (from Day 9)
const tracer = trace.getTracer('order-service', '1.0.0');

// Get a meter (from Day 10)
const meter = metrics.getMeter('order-service', '1.0.0');

// Get a logger (NEW for Day 11)
const logger = logs.getLogger('order-service', '1.0.0');

// Next we'll add structured logging throughout our order processing
```

---

## Step 4: Add structured logging to order processing

Here's how we add logs at key points in our order flow:

```javascript
app.post("/orders", async (req, res) => {
  const startTime = Date.now();
  const paymentMethod = req.body?.paymentMethod || "credit_card";

  // UpDownCounter: one more order in progress
  activeOrders.add(1);

  return tracer.startActiveSpan("process_order", async (orderSpan) => {
    const orderData = req.body;
    const orderSubtotal = orderData.total || 100;

    orderSpan.setAttribute("order.item_count", orderData.items?.length || 0);
    orderSpan.setAttribute("user.id", orderData.userId);
    orderSpan.setAttribute("order.subtotal", orderSubtotal);

    // STRUCTURED LOG: Order started (NEW for Day 11)
    logger.emit({
      severityText: "INFO",
      body: "Order processing started",
      attributes: {
        "user.id": orderData.userId,
        "order.item_count": orderData.items?.length || 0,
        "order.subtotal": orderSubtotal,
        "order.payment_method": paymentMethod,
      },
    });

    try {
      // ... validate → inventory → shipping → payment → save
      // (same business logic as Days 9 & 10)

      const durationMs = Date.now() - startTime;

      // SUCCESS METRICS (from Day 10)
      ordersProcessed.add(1, { status: "success", method: paymentMethod });
      orderDuration.record(durationMs, { status: "success" });
      orderTotal.record(totalAmount, { currency: "USD" });

      // STRUCTURED LOG: Order completed successfully (NEW for Day 11)
      logger.emit({
        severityText: "INFO",
        body: "Order processing completed successfully",
        attributes: {
          "order.id": orderId,
          "user.id": orderData.userId,
          "order.total": totalAmount,
          "order.duration_ms": durationMs,
          "payment.method": paymentMethod,
        },
      });

      res.status(201).json({ status: "created", total: totalAmount });
    } catch (error) {
      // FAILURE METRICS (from Day 10)
      const durationMs = Date.now() - startTime;
      ordersProcessed.add(1, { status: "failed", method: paymentMethod });
      orderDuration.record(durationMs, { status: "failed" });

      // STRUCTURED LOG: Order failed (NEW for Day 11)
      logger.emit({
        severityText: "ERROR",
        body: "Order processing failed",
        attributes: {
          "user.id": orderData.userId,
          "order.duration_ms": durationMs,
          "payment.method": paymentMethod,
          "error.message": error.message,
          "error.type": error.constructor.name,
        },
      });

      res.status(400).json({ error: error.message });
    } finally {
      // UpDownCounter: order is no longer in progress
      activeOrders.add(-1);
      orderSpan.end();
    }
  });
});
```

**Where payment failures are logged**

In the `process_payment` span, on error:
```javascript
// STRUCTURED LOG: Payment failed (NEW for Day 11)
logger.emit({
  severityText: "ERROR",
  body: "Payment processing failed",
  attributes: {
    "payment.method": paymentMethod,
    "payment.amount": totalAmount,
    "error.message": error.message,
    "user.id": orderData.userId,
  },
});
```

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
```

---

## Step 7: Generate traffic and see logs

Send multiple requests to generate logs:

```bash
# Send 10 requests (some will fail due to payment simulation)
for i in {1..10}; do
  curl -X POST http://localhost:3000/orders \
    -H "Content-Type: application/json" \
    -d '{"userId":"user'$i'","items":[{"sku":"A","quantity":1}],"total":100,"paymentMethod":"credit_card"}'
  sleep 0.5
done
```

**In your console, you'll see structured logs like:**

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "severityText": "INFO",
  "body": "Order processing started",
  "traceId": "abc123...",
  "spanId": "def456...",
  "attributes": {
    "user.id": "user1",
    "order.item_count": 1,
    "order.subtotal": 100,
    "order.payment_method": "credit_card"
  }
}
```

**Notice the automatic trace correlation:**
- `traceId` - Links this log to the trace
- `spanId` - Links this log to the specific span

---

## What structured logs did we create today?

These logs match our `app.js`:

- **Order Started**: When processing begins
  ```javascript
  {
    severityText: "INFO",
    body: "Order processing started",
    attributes: {
      "user.id": "user_123",
      "order.item_count": 2,
      "order.payment_method": "credit_card"
    }
  }
  ```

- **Payment Failed**: When payment processing fails
  ```javascript
  {
    severityText: "ERROR", 
    body: "Payment processing failed",
    attributes: {
      "payment.method": "credit_card",
      "error.message": "insufficient funds"
    }
  }
  ```

- **Order Completed**: When order succeeds
  ```javascript
  {
    severityText: "INFO",
    body: "Order processing completed successfully", 
    attributes: {
      "order.id": "ord_abc123",
      "order.total": 112.99,
      "order.duration_ms": 850
    }
  }
  ```
---

## Correlating logs with traces

### Workflow: Trace → Logs

1. Open Jaeger: http://localhost:16686
2. Find a failed trace (red)
3. Copy the `trace_id`
4. Search your logs for that `trace_id`

**Result:** You see all logs from that specific request.

### Workflow: Logs → Trace

1. See an ERROR log
2. Copy the `traceId`
3. Search Jaeger for that trace
4. View the complete request flow

**Result:** You see where in the flow the error occurred.

---

## Logs + Traces + Metrics = Complete Observability

**Use metrics to detect problems:**
```
Alert: payment.failures rate > 10/min
```

**Use traces to understand the flow:**
```
Query traces: status=ERROR AND payment.method="credit_card"
→ See the exact request flow that failed
```

**Use logs to get the details:**
```
Query logs: trace_id="abc123" 
→ See all log events for that specific trace
→ Get exact error messages, user IDs, amounts
```

**Example workflow:**
1. Dashboard shows spike in payment failures (metric)
2. Alert fires: "Payment failure rate > 10/min"
3. Query traces for failed payments
4. Find a specific failed trace ID
5. Query logs for that trace ID
6. See exact error: "Payment declined: card expired"
7. Fix the user experience for expired cards

---

## Key logging patterns we learned

### Pattern 1: Structured attributes instead of string interpolation

**Don't do this:**
```javascript
console.log(`Order ${orderId} for user ${userId} failed: ${error.message}`);
```

**Do this:**
```javascript
logger.emit({
  severityText: "ERROR",
  body: "Order processing failed",
  attributes: {
    "order.id": orderId,
    "user.id": userId,
    "error.message": error.message
  }
});
```

### Pattern 2: Consistent attribute naming

Use semantic conventions:
- `order.id`, `user.id`, `order.total`
- `payment.method`, `payment.amount`
- `error.message`, `error.type`

### Pattern 3: Appropriate severity levels

- `INFO` - Normal operations (order started, completed)
- `WARN` - Unusual but not errors (retries, fallbacks)
- `ERROR` - Actual failures (payment declined, validation failed)
- `DEBUG` - Detailed debugging info (usually not in production)

### Pattern 4: Log inside spans for automatic correlation

```javascript
tracer.startActiveSpan('process_payment', async (span) => {
  try {
    await processPayment();
    
    // This log automatically gets the trace_id and span_id
    logger.emit({
      severityText: "INFO",
      body: "Payment processed successfully"
    });
  } catch (error) {
    // This error log is automatically correlated to the trace
    logger.emit({
      severityText: "ERROR", 
      body: "Payment processing failed",
      attributes: { "error.message": error.message }
    });
  }
});
```

---

## What I'm taking into Day 12

Today we learned the **Logs API** which are the methods to create structured, correlated logs, AND the final piece of observability.

**Key skills:**
- Creating structured logs with `logger.emit()`
- Using severity levels (INFO, WARN, ERROR, DEBUG)
- Adding structured attributes for context
- Automatic trace correlation (trace_id and span_id)
- Using logs, traces, and metrics together for complete observability

**The complete observability pattern:**
```javascript
// Traces: Follow the request flow
tracer.startActiveSpan('process_order', async (span) => {
  
  // Logs: Record what happened
  logger.emit({
    severityText: "INFO",
    body: "Order processing started"
  });
  
  // Metrics: Count and measure
  ordersProcessed.add(1);
  
  // All three are automatically correlated!
});
```

**Tomorrow (Day 12):** We'll learn **Context Propagation** and see how trace context flows between services and async operations.

See you on Day 12!
