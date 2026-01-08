# Day 6 – Instrumentation: How Observability Data Gets Created

For the past three days we learned how to read observability data:
- [**Day 3:**](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day3.md) Three signals: traces (one request's journey), metrics (aggregate patterns), logs (event details)
- [**Day 4:**](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day4.md) Spans = the building blocks of traces (with attributes, timing, parent-child relationships)
- [**Day 5:**](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day5.md) Semantic conventions = standard names so data lines up across services

Today we answer: **Where does observability data actually come from? Who creates the spans, metrics, and logs we've been learning about?**

## The core truth: Observability data doesn't appear, something creates it

When we look at a trace like this:

```
POST /pay (1200ms)
├─ Validate input (5ms)
├─ GET /config/rates (900ms)
│  └─ SELECT * FROM rates (800ms)
└─ Process payment (50ms)
```

Or a metric dashboard showing "requests per second," or log lines saying "payment processed successfully", all of that data exists because **some code decided to record it**.

That recording code is called **instrumentation**.

This data gets created in two fundamentally different ways:

1. **Auto-instrumentation** — Code added at runtime that wraps existing libraries/frameworks to automatically capture observability data without modifying your application code
2. **Manual instrumentation** — You explicitly write code to record observability data

The reason both exist is about **what they can see**:
- **Auto-instrumentation** sees library calls (HTTP, databases, queues)
- **Manual instrumentation** sees your business logic (validate payment, calculate risk, process order)

Let's understand each one clearly.

## Auto-instrumentation: observability you get without touching application code

Auto-instrumentation is when OpenTelemetry installs “sensors” around popular libraries we’re already using (Express, axios, pg, etc.) which watches our app's behavior and automatically creates telemetry for common operations. Think of it like having a security camera system. We don't have to manually take a photo every time someone walks through a door. The camera automatically captures movement at key entry points.

### What auto-instrumentation records

**For traces**, it creates spans for:
- Incoming HTTP requests
- Outgoing HTTP requests  
- Database queries
- Message queue operations
- Cache calls
- gRPC calls

**For metrics**, it records:
- Request counts
- Request durations
- Active requests
- Error counts

**For logs**, it can enrich your existing logs with trace context (trace IDs, span IDs)

All of this happens **automatically** once you enable it.

### A concrete example: Before and after auto-instrumentation

#### **Before (no observability code)**

```javascript
// app.js - just plain application code
const express = require('express');
const { Client } = require('pg');

const app = express();
const db = new Client({ connectionString: 'postgresql://localhost/mydb' });

app.get('/users/:id', async (req, res) => {
  const result = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
  res.json(result.rows[0]);
});

app.listen(3000);
```

**What observability data do you get?** None. No traces, no metrics, no correlation.

#### **After enabling auto-instrumentation:**

You create **one setup file** (separate from your application code):

```javascript
// instrumentation.js
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'user-service',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
  }),
  traceExporter: new OTLPTraceExporter({
    url: 'http://localhost:4318/v1/traces',
  }),
  instrumentations: [getNodeAutoInstrumentations()], // ← The magic line
});

sdk.start();

console.log('OpenTelemetry initialized');
```

**Run your app with this setup file loaded first:**

```bash
node --require ./instrumentation.js app.js
```

The `--require` flag tells Node.js to load the instrumentation file before your application code runs. This gives OpenTelemetry a chance to wrap your libraries before they're used.

> [!IMPORTANT]
>
> OpenTelemetry instrumentation is runtime instrumentation meaning it needs to be active while your app is running.
>
> If any part stops running, the telemetry pipeline breaks.

**As you can see, our application code (`app.js`) hasn't changed at all.** But now when someone calls `GET /users/123`:

**You get traces:**
```
Trace abc123
└─ GET /users/:id (45ms)
   └─ SELECT users (40ms)
```

**With semantic conventions automatically applied:**
```
Span: GET /users/:id
  http.request.method = "GET"
  http.route = "/users/:id"
  http.response.status_code = 200
  http.target = "/users/123"

Span: SELECT users
  db.system = "postgresql"
  db.statement = "SELECT * FROM users WHERE id = $1"
  db.operation = "SELECT"
```

**You get metrics:**
```
http.server.request.duration (histogram)
http.server.active_requests (gauge)
db.client.operation.duration (histogram)
```

**You get correlated logs** (if you're using a logging library):
```
[trace_id=abc123 span_id=def456] GET /users/123 - 200 OK
```

All of this from **zero changes to your application code**. That's the power of auto-instrumentation.

### How does auto-instrumentation work? (no magic, just wrapping)

Auto-instrumentation uses a technique called **monkey-patching** or **wrapping**.

Here's what happens in plain English:

1. Your instrumentation file loads first
2. OpenTelemetry finds the Express library
3. It wraps Express's route handler function:

```javascript
// Simplified: what OpenTelemetry does behind the scenes
const originalRouteHandler = express.Router.handle;

express.Router.handle = function wrappedHandler(req, res, next) {
  // Start a span
  const span = tracer.startSpan(`${req.method} ${req.route.path}`);
  span.setAttribute('http.request.method', req.method);
  span.setAttribute('http.route', req.route.path);
  
  // Call the original function (your code runs)
  const result = originalRouteHandler.call(this, req, res, next);
  
  // End the span
  span.setAttribute('http.response.status_code', res.statusCode);
  span.end();
  
  return result;
};
```

Your code calls Express functions normally. But those functions now have observability built in.

**Same thing happens with database libraries, HTTP clients, everything.**

This is powerful because:
- Your application code stays clean
- Semantic conventions are applied automatically
- You can enable/disable instrumentation without code changes
- Library upgrades give you better observability for free

>[!NOTE]
> Most OpenTelemetry auto-instrumentation packages cover the most common libraries in each language ecosystem. Always check what's available for your language:
> - **Node.js:** https://www.npmjs.com/package/@opentelemetry/auto-instrumentations-node
> - **Python:** https://github.com/open-telemetry/opentelemetry-python-contrib/tree/main/instrumentation
> - **Java:** https://github.com/open-telemetry/opentelemetry-java-instrumentation

### What auto-instrumentation CANNOT see

Auto-instrumentation only sees **library boundaries**. It cannot understand your custom business logic.

**Example payment endpoint:**

```javascript
app.post('/pay', async (req, res) => {
  // ✅ Auto-instrumentation sees this (Express handling HTTP request)
  
  validatePaymentRules(req.body);  // ❌ Not instrumented (your custom function)
  
  const risk = calculateRiskScore(req.body);  // ❌ Not instrumented (your custom function)
  
  await db.query('INSERT INTO payments...');   // ✅ Auto-instrumentation sees this (PostgreSQL)
  
  sendConfirmationEmail(req.body.email);  // ❌ Not instrumented (your custom function)
  
  res.json({ success: true });  // ✅ Auto-instrumentation sees this (Express response)
});
```

**Your trace with ONLY auto-instrumentation:**

```
POST /pay (500ms)
└─ INSERT payments (50ms)
```

**The problem:** The request took 500ms, the database took 50ms. Where did the other 450ms go?

You know it's *somewhere* in your code, but you can't see where. The custom functions (`validatePaymentRules`, `calculateRiskScore`, `sendConfirmationEmail`) are invisible to auto-instrumentation.

**This is the gap that manual instrumentation fills.**

## Manual instrumentation: observability you explicitly create

Manual instrumentation means **you write code that creates observability data for your custom operations**.

This is where you instrument:
- Business logic functions (`validatePayment`, `calculateRisk`)
- Custom algorithms (routing, pricing, recommendations)
- Internal processing steps
- Operations using protocols/libraries that aren't auto-instrumented

Think of auto-instrumentation as cameras at building entrances (external boundaries). Manual instrumentation is adding cameras inside specific rooms to see internal work.

### What does "manual" actually mean?

Manual instrumentation means calling functions from the **OpenTelemetry API**.

> [!IMPORTANT]
> **Wait, what's an "API"?**
> 
> "API" stands for "Application Programming Interface," but that's jargon. Here's what it means in simple terms:
>
>**An API is a set of functions you can call in your code.**
>
>When we say "OpenTelemetry API," we mean: **OpenTelemetry gives you functions you can call to create observability data.**
>
>Examples of these functions:
>- `trace.getTracer()` — Get a tool for creating spans
>- `tracer.startSpan()` — Start recording a timed operation
>- `span.setAttribute()` — Add context to the operation
>- `span.end()` — Stop recording
>- `meter.createCounter()` — Create a metric counter
>- `counter.add(1)` — Increment the counter
>
>**We've actually been learning about these functions all week without realizing it:**
>
>- **Day 4:** When you learned `span.setAttribute('user.id', '12345')` — that's the OpenTelemetry API
>- **Day 5:** When you learned semantic conventions like `http.request.method` — those are used WITH the OpenTelemetry API
>
>**Auto-instrumentation and manual instrumentation both use the same API.** The only difference is:
>- Auto-instrumentation: Libraries call these functions for us
>- Manual instrumentation: We call these functions ourselves

### The same payment example, with manual instrumentation

Let's add manual instrumentation to see those hidden operations:

```javascript
const { trace } = require('@opentelemetry/api');

app.post('/pay', async (req, res) => {
  const tracer = trace.getTracer('payment-service');
  
  // Manual span #1: Validate payment rules
  const validateSpan = tracer.startSpan('validate_payment_rules');
  try {
    validatePaymentRules(req.body);
    validateSpan.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    validateSpan.recordException(error);
    validateSpan.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    throw error;
  } finally {
    validateSpan.end();
  }
  
  // Manual span #2: Calculate risk score
  const riskSpan = tracer.startSpan('calculate_risk_score');
  const risk = calculateRiskScore(req.body);
  riskSpan.setAttribute('payment.risk_score', risk);
  riskSpan.setAttribute('payment.amount', req.body.amount);
  riskSpan.setAttribute('payment.currency', req.body.currency);
  riskSpan.end();
  
  // Auto-instrumented span: Database call (library creates this automatically)
  await db.query('INSERT INTO payments VALUES ...');
  
  // Manual span #3: Send confirmation email
  const emailSpan = tracer.startSpan('send_confirmation_email');
  await sendConfirmationEmail(req.body.email);
  emailSpan.setAttribute('email.recipient', req.body.email);
  emailSpan.end();
  
  res.json({ success: true });
});
```

**Now our trace shows everything:**

```
POST /pay (500ms)
├─ validate_payment_rules (10ms)
├─ calculate_risk_score (5ms)
├─ INSERT payments (50ms)
└─ send_confirmation_email (400ms)  ← Found the bottleneck!
```

The email operation is taking 400ms. You check the email provider's status and see they're having an outage. **Problem identified in seconds.**

### Manual instrumentation for metrics

We can also manually record metrics:

```javascript
const { metrics } = require('@opentelemetry/api');

const meter = metrics.getMeter('payment-service');

// Create a counter
const paymentCounter = meter.createCounter('payments.processed', {
  description: 'Number of payments processed'
});

// Create a histogram for payment amounts
const paymentAmount = meter.createHistogram('payment.amount', {
  description: 'Payment amount distribution'
});

// In your code:
app.post('/pay', async (req, res) => {
  // ... payment processing ...
  
  paymentCounter.add(1, {
    'payment.method': req.body.method,
    'payment.currency': req.body.currency
  });
  
  paymentAmount.record(req.body.amount, {
    'payment.currency': req.body.currency
  });
  
  res.json({ success: true });
});
```

Now we can query: "How many USD credit card payments were processed in the last hour?"

### Manual instrumentation for logs

We can emit structured logs with trace correlation:

```javascript
const { trace } = require('@opentelemetry/api');
const logger = require('winston');

app.post('/pay', async (req, res) => {
  const span = trace.getActiveSpan();
  const traceId = span.spanContext().traceId;
  const spanId = span.spanContext().spanId;
  
  logger.info('Payment processing started', {
    trace_id: traceId,
    span_id: spanId,
    payment_amount: req.body.amount,
    payment_method: req.body.method
  });
  
  // ... payment logic ...
});
```

Now our logs are correlated with traces. We can search logs by trace ID and see exactly what happened in that specific request.

## How auto and manual instrumentation work together

We don't choose one or the other. We use **both**, and they complement each other.

```
┌─────────────────────────────────────────────────────┐
│ Our Application Code                               │
│                                                      │
│ app.post('/pay', async (req, res) => {             │
│   validatePayment(req.body);  ← Manual span needed │
│   await db.query(...);        ← Auto span created  │
│ });                                                  │
└─────────────────────────────────────────────────────┘
                        ↓
        ┌──────────────────────────────────┐
        │                                  │
        ↓                                  ↓
┌──────────────────┐          ┌──────────────────────┐
│ Auto             │          │ Manual               │
│ instrumentation  │          │ instrumentation      │
│                  │          │                      │
│ • HTTP requests  │          │ • Business logic     │
│ • DB queries     │          │ • Custom functions   │
│ • Cache calls    │          │ • Domain operations  │
│ • Message queues │          │ • Your unique code   │
└──────────────────┘          └──────────────────────┘
        │                                  │
        └──────────────┬───────────────────┘
                       ↓
        ┌──────────────────────────────────┐
        │ OpenTelemetry API                │
        │                                  │
        │ Both use the same functions:    │
        │ • startSpan()                   │
        │ • setAttribute()                │
        │ • createCounter()               │
        │ • record()                      │
        └──────────────────────────────────┘
                       ↓
        ┌──────────────────────────────────┐
        │ OpenTelemetry SDK                │
        │                                  │
        │ • Collects all telemetry        │
        │ • Applies sampling              │
        │ • Batches data                  │
        │ • Sends to backend              │
        └──────────────────────────────────┘
                       ↓
              Backend (Jaeger, Dash0, etc.)
```

**The key insight:** Auto-instrumentation and manual instrumentation both use the same OpenTelemetry API. They're not competing systems—they're two ways of calling the same functions.

**The strategy should be:**

1. **Start with auto-instrumentation** — Get 80% coverage with zero code changes
2. **Identify gaps** — Look at traces and find "unexplained time"
3. **Add manual instrumentation** — Fill those gaps with business context
4. **Iterate** — Add more manual instrumentation as we discover what we need to see

## The biggest beginner mistake (and how to avoid it)

It's tempting to instrument *everything*. Don't.

Too many spans:
- Makes traces unreadable (can't see the forest for the trees)
- Adds performance overhead
- Costs money in storage
- Hides the important problems

**Rule of thumb for manual instrumentation:**

**DO instrument:**
- Operations that take meaningful time (>5ms)
- Business-critical logic (payment processing, order fulfillment)
- Operations that fail in interesting ways (external API calls)
- Anything you've had trouble debugging before

**DON'T instrument:**
- Tiny helper functions (<1ms)
- Pure data transformations (formatting, parsing)
- Getters/setters
- Logging operations themselves

**Instead of creating a span for trivial operations, just add an attribute to the parent span:**

```javascript
// Don't do this
const span = tracer.startSpan('calculate_item_count');
const count = items.length;
span.end();

// Do this instead
span.setAttribute('order.item_count', items.length);
```

## What I'm taking into Day 7

Today's core insight: **Observability data (spans, metrics, logs) is created by instrumentation. Auto-instrumentation handles infrastructure automatically. Manual instrumentation handles your business logic. Both use the same OpenTelemetry APIs. Real systems need both.**

Tomorrow we'll do a Week 1 review and tie together everything we've learned.

See you on Day 7!
