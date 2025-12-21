# Day 6 – Instrumentation: How Spans Actually Get Created

For the past three days we learned how to read observability data:
- [**Day 3:**](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day3.md) traces = the journey of a request across services
- [**Day 4:**](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day4.md) spans = the building blocks of traces
- [**Day 5:**](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day5.md) semantic conventions = shared names on spans so data lines up across services

Today we answer: **where do spans come from, and how do you get the ones you actually need?**

Instrumentation is the bridge between “I can interpret a trace” and “I can make traces that explain my system”.

By the end of today, we'll understand:
- What creates spans (and where)
- Auto vs manual instrumentation, and what each can “see”
- How span hierarchy happens without wiring parent/child manually
- What not to instrument (so we don’t create noise)

## The simplest truth: spans don’t appear, someone creates them

When we look at a trace like this:

```
POST /pay (1200ms)
├─ Validate input (5ms)
├─ GET /config/rates (900ms)
│  └─ SELECT * FROM rates (800ms)
└─ Process payment (50ms)
```

Every bar exists because some code decided to:
1. start a span
2. add context (attributes)
3. end the span

That “some code” comes from two places:

1. **Auto-instrumentation** — libraries create spans around known frameworks and clients
2. **Manual instrumentation** — we create spans inside our own business logic

The reason both exist isn't just about preference. It's about **visibility**. 
**Auto-instrumentation** sees the "edges" or our services = library calls (HTTP, databases, queues). 
**Manual instrumentation** sees the "meaning" inside our services = business logic (validate payment, calculate risk, process order).

## Auto-instrumentation: spans we get without touching app code

Auto-instrumentation is when OpenTelemetry installs “sensors” around popular libraries we’re already using (Express, axios, pg, etc.) which watches our app's behavior and automatically creates spans for common operations. Think of it like having a security camera system. We don't have to manually take a photo every time someone walks through a door. The camera automatically captures movement at key entry points.

Auto-instrumentation creates spans for operations like:
- Incoming HTTP requests (someone called our API)
- Outgoing HTTP requests (we called another service)
- Database queries (we read/wrote data)
- Message queue operations (we published/consumed messages)
- Cache calls (we hit Redis or Memcached)
- gRPC calls (we made RPC calls)

These are the places where our service interacts with the outside world, which is why auto-instrumentation gives us so much value so quickly. These operations tell you: **"Where did the request go? What external systems did it touch?"**


### Why auto-instrumentation exists

Let's see a concrete example with a simple Express.js app.

#### **Before (no observability code)**

```javascript
// app.js
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

#### **After (manual instrumentation)**
Now imagine if we had to **manually instrument** every HTTP request and database query. Our code would look like this:

```javascript
app.get('/users/:id', async (req, res) => {
  const httpSpan = tracer.startSpan('GET /users/:id');
  httpSpan.setAttribute('http.method', 'GET');
  httpSpan.setAttribute('http.route', '/users/:id');
  
  const dbSpan = tracer.startSpan('SELECT users');
  dbSpan.setAttribute('db.system', 'postgresql');
  dbSpan.setAttribute('db.statement', 'SELECT * FROM users WHERE id = $1');
  
  const result = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
  
  dbSpan.end();
  httpSpan.setAttribute('http.status_code', 200);
  httpSpan.end();
  
  res.json(result.rows[0]);
});
```

**This is miserable.** Our business logic (4 lines) is buried under observability boilerplate (10+ lines). And we'd have to do this for every single endpoint and database call.

#### **After (OpenTelemetry with auto-instrumentation)**

We only have to create a **separate setup file** (this keeps our business logic clean):

```javascript
// instrumentation.js
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

const sdk = new NodeSDK({
  serviceName: 'user-service',
  traceExporter: new OTLPTraceExporter({
    url: 'http://localhost:4318/v1/traces',
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

console.log('Tracing initialized');
```

This file does four things:
1. Imports the OpenTelemetry SDK
2. Enables auto-instrumentation for all supported libraries
3. Configures where to send traces (the exporter)
4. Starts the SDK

**Run our app with this setup file loaded:**

```bash
node --require ./instrumentation.js app.js
```

The `--require` flag tells Node.js to load the instrumentation file before our app code runs. This gives OpenTelemetry a chance to wrap our libraries before we use them.

**That's it.** Our application code (`app.js`) hasn't changed at all. But now when someone calls `GET /users/123`, we get a trace:

```
Trace abc123
└─ GET /users/:id (45ms)
   └─ SELECT users (40ms)
```

And we’ll see standard attributes (semantic conventions) applied automatically, like:
```
Span: GET /users/:id
  http.method = "GET"
  http.route = "/users/:id"
  http.status_code = 200
  http.target = "/users/123"
  http.scheme = "http"
  http.host = "localhost:3000"

Span: SELECT users
  db.system = "postgresql"
  db.statement = "SELECT * FROM users WHERE id = $1"
  db.operation = "SELECT"
  db.name = "mydb"
```

**We wrote zero instrumentation code in our application logic.** The observability is completely separated from our business logic.

### How does it work? (no magic, just wrapping)

Auto-instrumentation typically works by **wrapping library functions** (often called monkey-patching). In plain terms: it loads early, takes the original function, and swaps it with a “wrapped” version that does a little extra work before and after the real call.

That wrapped version usually:
- starts a span
- calls the original function
- records metadata (attributes, status, errors)
- ends the span

This is powerful because:
1. We don't have to modify your application code
2. We get semantic conventions applied automatically
3. Upgrades to instrumentation libraries gives us better observability without code changes
4. We can enable/disable instrumentation by changing one configuration file

>[!NOTE]
>Most OpenTelemetry auto-instrumentation packages cover the most common libraries in each language ecosystem but always **check what's available for your language.**
> 
>These lists are constantly growing as the community adds support for more libraries.

### What auto-instrumentation cannot do

Auto-instrumentation does not understand your business logic (custom application logic) only **library calls**.

**Example for a payment endpoint:**

```javascript
app.post('/pay', async (req, res) => {  // ✅ Auto-instrumentation sees this (Express handling the HTTP request)
  
  validatePaymentRules(req.body);  // ❌ Not instrumented (custom function)
  
  const risk = calculateRiskScore(req.body);  // ❌ Not instrumented (custom function)
  
  await db.query('INSERT INTO payments VALUES ...');   // ✅ Auto-instrumentation sees this (PostgreSQL db call)
  
  sendConfirmationEmail(req.body.email);  // ❌ Not instrumented (custom function)
  
  res.json({ success: true });   // ✅ Auto-instrumentation sees this (Express sending the HTTP response)

});
```

**Result:** With only auto instrumentation, our trace might look like:

```
POST /pay (500ms)
└─ INSERT payments (50ms)
```

**The problem:** We can see the request took 500ms and the database took 50ms. But where did the other 450ms go? The problem must be somewhere else in the code. But we can't see *where* in our code.

**This is the gap that manual instrumentation fills.**

## Manual instrumentation: spans we create to explain the code

Manual instrumentation means: **we write code that explicitly creates spans** for our custom operations like business logic functions, custom algorithms, internal processing steps, operations that don't use instrumented libraries.

Think of auto-instrumentation as security cameras at doors and windows (external boundaries). Manual instrumentation is like adding cameras inside specific rooms to see what happens internally.

### The same example, with manual instrumentation

Let's add manual instrumentation to the payment endpoint:

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
  
  // Auto-instrumented span: Database call
  await db.query('INSERT INTO payments VALUES ...');
  
  // Manual span #3: Send confirmation email
  const emailSpan = tracer.startSpan('send_confirmation_email');
  await sendConfirmationEmail(req.body.email);
  emailSpan.setAttribute('email.recipient', req.body.email);
  emailSpan.end();
  
  res.json({ success: true });
});
```

**Now our trace looks like:**

```
POST /pay (500ms)
├─ validate_payment_rules (10ms)
├─ calculate_risk_score (5ms)
├─ INSERT payments (50ms)
└─ send_confirmation_email (400ms)  ← Aha! Email is the slow part. The bottleneck is obvious
```

You see the problem instantly: the email service is timing out. You check your email provider's status page and see they're having an outage. **Problem identified in 30 seconds.**

This is why manual instrumentation isn't optional for production systems. Auto-instrumentation gets you 80% of the way there. Manual instrumentation covers the critical 20% that auto-instrumentation can't see (your business logic).

### When to use manual instrumentation
Use manual spans when:
- you want visibility into business steps
- a request is “slow somewhere” and auto spans don’t show where
- you want domain context (order id, tier, experiment group)
- you’re calling something that isn’t instrumented (custom protocol, legacy client)


## How auto and manual instrumentation work together

You don’t pick one. You layer them.
- Auto gives you the skeleton: HTTP, DB, RPC, queues
- Manual adds the muscles and organs: the meaningful steps that explain your product

Always **start with auto-instrumentation** and **add manual instrumentation where it matters**.

## The biggest beginner mistake

It’s tempting to create spans for every helper function. Don’t.

Too many spans makes traces unreadable, add overhead, cost money in storage, hide the important parts.

A simple rule of thumb:
- If it’s fast (less than 1ms) and boring, don’t span it
- If it’s slow, risky, business-critical, or confusing, span it

If you just want to attach context (like counts, ids, flags), add an attribute on the existing span.

## The instrumentation stack (how it all connects)

Let's zoom out and see the full picture of how instrumentation fits into the OpenTelemetry architecture:

```
┌─────────────────────────────────────────────────────────┐
│ Your Application Code                                   │
│                                                          │
│ app.post('/pay', async (req, res) => {                 │
│   validatePayment(req.body);  ← Not instrumented        │
│   await db.query(...);        ← Auto-instrumented       │
│ });                                                      │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ Auto-Instrumentation Libraries                          │
│                                                          │
│ • @opentelemetry/instrumentation-express                │
│ • @opentelemetry/instrumentation-pg                     │
│ • @opentelemetry/instrumentation-http                   │
│                                                          │
│ These wrap your libraries and create spans              │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ Manual Instrumentation (Your Code)                      │
│                                                          │
│ const span = tracer.startSpan('validate_payment');     │
│ validatePayment(req.body);                              │
│ span.end();                                             │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ OpenTelemetry API                                       │
│                                                          │
│ • trace.getTracer()                                     │
│ • tracer.startSpan()                                    │
│ • span.setAttribute()                                   │
│ • span.end()                                            │
│                                                          │
│ This is the interface you use in your code              │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ OpenTelemetry SDK                                       │
│                                                          │
│ • Collects spans from all sources (auto + manual)      │
│ • Adds resource attributes (service.name, etc.)         │
│ • Applies sampling decisions                            │
│ • Batches spans for efficiency                          │
│ • Manages context propagation                           │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ Exporter                                                │
│                                                          │
│ • OTLPTraceExporter (sends to collectors)              │
│ • JaegerExporter (sends to Jaeger)                     │
│ • ZipkinExporter (sends to Zipkin)                     │
│ • ConsoleSpanExporter (prints to console for debugging)│
│                                                          │
│ Converts spans to wire format and sends to backend      │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ Observability Backend                                   │
│                                                          │
│ • Jaeger, Tempo, Dash0, Lightstep, Honeycomb, etc.    │
│ • Stores spans                                          │
│ • Lets you query and visualize traces                   │
└─────────────────────────────────────────────────────────┘
```

**Key insight:** We'll learn more about this next week but the API (what we use in our code) is separate from the SDK (what processes the data). This separation means:

1. **We can write instrumentation code once:** Our manual instrumentation uses the OpenTelemetry API, which is stable and language-agnostic.

2. **We can swap backends without changing our code:** Want to switch from Jaeger to Tempo? Just change the exporter configuration. Our application code doesn't change.

3. **We can use different exporters in different environments:** Send traces to a local Jaeger instance in development, and to a production backend in production. Same application code.

This is why OpenTelemetry won the observability standards war. It separates the concerns: **how we create telemetry** (API) vs **where it goes** (SDK + exporters).

## What I'm taking into Day 7

Today's core insight: **Instrumentation is what creates spans. Auto-instrumentation handles infrastructure operations (HTTP, databases, queues). Manual instrumentation handles your custom business logic. Real systems need both.**

Tomorrow we’ll do a quick recap and walk through a few extra details to make everything click.

See you on Day 7!
