# Day 7 – Week 1 Review

We've covered a lot in six days. Today is a pause. A chance to connect everything we've learned and see how it all fits together.

We'll revisit the key concepts, add important details we glossed over, and show the complete picture of how OpenTelemetry and observability actually work.

By the end of today, we'll have:
- A clear mental map of Days 1-6
- Understanding of what you've actually been learning (spoiler: the APIs!)
- The missing pieces that connect everything
- Confidence in the foundations
- Readiness for Week 2 (where we get hands-on)

## The journey so far: what we've learned

### [Day 1](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day1.md): Why observability matters

Modern systems are too complex to understand by just looking at code or logs. When something breaks in production, we need visibility into what's actually happening across all our services.

**What we learned:**
- The shift from monoliths to microservices made debugging exponentially harder
- Traditional monitoring (CPU, memory, disk) doesn't answer "why is the checkout flow slow?"
- We can't predict every failure mode, so we need to be able to ask new questions of our production system
- Observability is about being able to understand system behavior from the outside, without deploying new code

**The mental model we built:**
```
Old way (monoliths):
- One codebase, one process
- Add a log line, redeploy, read logs
- Debugging = add print statements

New way (microservices):
- 50+ services, hundreds of instances
- Request touches 10+ services
- Can't redeploy to debug
- Need to understand without changing code
```

### [Day 2](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day2.md): What is OpenTelemetry?

Before OpenTelemetry, every observability vendor had their own proprietary format and SDK. We'd write instrumentation code that locked us into one vendor. OpenTelemetry solved this by creating a vendor-neutral standard.

**What we learned:**
- OpenTelemetry is a set of APIs, SDKs, and tools for collecting telemetry (traces, metrics, logs)
- It's vendor-neutral: write instrumentation once, send data anywhere
- It standardizes how telemetry is created, formatted, and transmitted
- Major cloud providers and observability vendors have adopted it as the standard

**The mental model we built:**
```
Before OpenTelemetry:
- Vendor X SDK → Vendor X backend only
- Want to switch vendors? Rewrite all instrumentation

With OpenTelemetry:
- OpenTelemetry SDK → Any backend
- Write instrumentation once
- Change backends by changing configuration, not code
- Same standards across languages (Go, Node.js, Python, Java, etc.)
```

### [Day 3](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day3.md): The shape of a distributed request

A request in a distributed system isn't one operation. It's a chain of operations across multiple services, each waiting on the next. Observability gives us three different lenses to understand what's happening.

**What we learned:**
- How a single user click becomes multiple network hops
- Why "the request took 1200ms" doesn't tell us much
- The three signals of observability: traces (one request's journey), metrics (aggregate patterns), and logs (event details)
- How each signal answers different questions
- Why context propagation is critical

**The mental model we built:**
```
User clicks "Pay"
    ↓
Payment Service processes request
    ↓ (calls)
Config Service fetches exchange rates
    ↓ (calls)
Database returns rates
    ↓ (returns to)
Config Service
    ↓ (returns to)
Payment Service
    ↓ (returns to)
User

Three ways to observe this:
- Metrics: "Payment latency spiked at 14:35"
- Traces: "This request spent 800ms in the database"
- Logs: "Query timeout: connection pool exhausted"
```

**What we were actually learning:** The data model that OpenTelemetry's APIs work with—traces, metrics, and logs aren't just concepts, they're the three types of telemetry the APIs create.

### [Day 4](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day4.md): Spans=the building blocks

A trace isn't one blob of data. It's a tree of spans, where each span is one timed piece of work.

**What we learned:**
- What a span is (operation name, start time, duration, parent relationship)
- How spans form hierarchies (parent-child relationships)
- What attributes are (key-value context like `http.method = "POST"`)
- What resources are (metadata about the service itself)
- How to read a waterfall chart

**The mental model we built:**
```
Trace = one request's journey
Span = one step in that journey
Attributes = what happened in this step
Resources = who performed this step
Parent-child = how steps connect
```

**What we were actually learning:** The **Tracing API's data model**. When you call `span.setAttribute()` or create a span, you're working with these concepts.

### [Day 5](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day5.md): Semantic conventions=the shared language

Attributes need standard names, or traces from different services become incompatible islands.

**What we learned:**
- Why `http.method` instead of `request_method` or just `method`
- How semantic conventions make cross-service queries possible
- The difference between infrastructure attributes (`http.*`, `db.*`) and business attributes (`payment.*`, `order.*`)
- Why instrumentation libraries apply conventions automatically

**The mental model we built:**
```
Without conventions:
  Service A: request_method = "POST"
  Service B: http.method = "POST"
  Service C: method = "POST"
  → Can't query across services

With conventions:
  All services: http.method = "POST"
  → One query works everywhere
```

**What we were actually learning:** How to use the **OpenTelemetry APIs correctly**. Semantic conventions are the standard way to call `span.setAttribute()`, `counter.add()`, and other API functions with the right names.

### [Day 6](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day6.md): Instrumentation=how telemetry gets created

Telemetry data doesn't appear magically. It's created by instrumentation code, either automatically (wrapping libraries) or manually (code we write).

**What we learned:**
- Auto-instrumentation wraps libraries (Express, PostgreSQL, etc.) to create telemetry automatically
- Manual instrumentation lets us create telemetry for business logic
- How both types work together in the same trace
- When to use each (infrastructure = auto, business logic = manual)
- That both use the same OpenTelemetry APIs

**The mental model we built:**
```
Auto-instrumentation = skeleton (HTTP, DB, queues)
Manual instrumentation = muscles (business logic)
Production systems need both

Both call the same API functions:
- Auto: Libraries call tracer.startSpan() for you
- Manual: You call tracer.startSpan() yourself
```

**What we were actually learning:** **WHO calls the OpenTelemetry APIs**. Auto-instrumentation = libraries call it for you. Manual instrumentation = you call it yourself. But both are using the same API.

## The complete picture: how it all connects

Let's walk through one request end-to-end, connecting everything from Days 3-6.

### Step 1: User action triggers a request

A user clicks "Pay" in our app. This becomes an HTTP POST request to our Payment Service.

### Step 2: Auto-instrumentation creates telemetry

Our Payment Service is running with OpenTelemetry auto-instrumentation enabled.

When the HTTP request arrives, **Express instrumentation** automatically:
1. Generates a new trace ID (`abc123`)
2. Creates a span for the HTTP request
3. Applies semantic conventions
4. Creates a metric for request count
5. Enriches logs with trace context

```
Span (auto-created by Express instrumentation):
  trace_id: abc123
  span_id: span-001
  parent_span_id: null  ← Root span
  name: "POST /pay"
  
  Attributes (semantic conventions applied automatically):
    http.method = "POST"
    http.route = "/pay"
    http.status_code = 200
  
  Resource (configured in our setup):
    service.name = "payment-service"
    service.version = "2.3.1"
```

**We wrote zero code for this.** Auto-instrumentation handled everything.

### Step 3: Our business logic runs (manual instrumentation)

Inside our payment handler, we have custom business logic. We want visibility into this, so we add manual instrumentation.

```javascript
async function processPayment(req, res) {
  // Auto-instrumentation created the HTTP span
  // Now we create our own span for business logic
  
  const span = tracer.startSpan('process_payment');
  
  // Add business context using semantic conventions
  span.setAttribute('payment.amount', req.body.amount);
  span.setAttribute('payment.currency', req.body.currency);
  span.setAttribute('user.id', req.body.userId);
  
  // Record a custom metric
  paymentCounter.add(1, {
    'payment.method': req.body.method,
    'payment.currency': req.body.currency
  });
  
  try {
    await validatePayment(req.body);
    const exchangeRate = await getExchangeRate(req.body.currency);
    span.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR });
    throw error;
  } finally {
    span.end();
  }
}
```

**This creates additional telemetry:**
- A child span for `process_payment` with business attributes
- A counter metric tracking payment processing
- Exception tracking if something fails

### Step 4: Downstream service call (auto-instrumentation again)

When our code calls `getExchangeRate()`, which makes an HTTP request to the Config Service:

**HTTP client instrumentation** automatically:
1. Creates a span for the outbound HTTP call
2. Propagates the trace context (passes `abc123` to Config Service)
3. Records timing and HTTP details
4. Creates metrics for the outbound request

### Step 5: Config Service receives the request

The Config Service also has auto-instrumentation enabled. When it receives the HTTP request with the propagated trace context:

1. It sees the `traceparent` header with trace ID `abc123`
2. It creates a new span that's part of the same trace
3. It continues recording metrics
4. Its logs get the same trace ID

### Step 6: Database query (auto-instrumentation, different type)

Inside Config Service, the code queries PostgreSQL. **PostgreSQL instrumentation** automatically:
1. Creates a span for the database query
2. Records the SQL query
3. Captures timing
4. Creates database-specific metrics

### Step 7: The complete picture

When all the telemetry is collected and sent to our observability backend, we get:

**Traces showing the complete request flow:**
```
Trace abc123:
  
  span-001: POST /pay (Payment Service)         [0ms ────────── 1200ms]
    │
    └─ span-002: process_payment                [10ms ──── 1190ms]
         │
         └─ span-003: GET /exchange-rate        [100ms ─ 1100ms]
              │
              └─ span-004: GET /exchange-rate   [105ms - 1095ms]
                   │       (Config Service)
                   │
                   └─ span-005: SELECT rates    [110ms - 1090ms]
                                (PostgreSQL)
```

**Metrics showing aggregate patterns:**
```
http.server.request.count{service="payment-service", route="/pay"}: 1,247
http.server.request.duration{service="payment-service", route="/pay"}: avg 450ms
payments.processed{method="credit_card", currency="USD"}: 892
db.client.operation.duration{operation="SELECT"}: avg 980ms
```

**Logs with trace correlation:**
```
[trace_id=abc123 span_id=span-002] Payment processing started
[trace_id=abc123 span_id=span-004] Fetching exchange rate for USD
[trace_id=abc123 span_id=span-005] Query executed in 980ms
```

All three signals working together to give us complete visibility.

## What you've actually been learning: The OpenTelemetry APIs

Here's something important that might not have been obvious:

**You haven't been learning random concepts. You've been learning ABOUT the OpenTelemetry APIs all week.**

Let's make this explicit:

### Day 3 = The three APIs (Tracing, Metrics, Logs)

When we learned about traces, metrics, and logs, we were learning about **the three OpenTelemetry APIs**:

```javascript
// These are the three APIs:
const tracer = trace.getTracer('my-service');    // Tracing API
const meter = metrics.getMeter('my-service');    // Metrics API
const logger = logs.getLogger('my-service');     // Logs API
```

### Day 4 = The Tracing API's data model

When we learned about spans, attributes, and relationships, we were learning **what the Tracing API provides**:

```javascript
// These are all Tracing API methods:
const span = tracer.startSpan('operation_name');
span.setAttribute('key', 'value');
span.setStatus({ code: SpanStatusCode.OK });
span.end();
```

The concepts from Day 4 (span name, attributes, parent-child relationships) are the **data model** of the Tracing API.

### Day 5 = How to use ALL the APIs correctly

Semantic conventions aren't a separate thing. They're the **standardized way to use the OpenTelemetry APIs**:

```javascript
// Without semantic conventions:
span.setAttribute('method', 'POST');           // ❌ Non-standard
counter.add(1, { 'type': 'payment' });        // ❌ Non-standard

// With semantic conventions:
span.setAttribute('http.method', 'POST');      // ✅ Standard
counter.add(1, { 'payment.method': 'cc' });   // ✅ Standard
```

Same thing applies to metrics and logs—semantic conventions tell you the right attribute names to use.

### Day 6 = WHO calls the APIs

Instrumentation isn't a different concept. It's about **who's calling the API**:

```javascript
// Auto-instrumentation = library calls the API for you
// (Express library creates spans automatically using the Tracing API)

// Manual instrumentation = you call the API yourself
const span = tracer.startSpan('my_business_logic');
span.setAttribute('order.id', orderId);
span.end();

const counter = meter.createCounter('payments.processed');
counter.add(1, { 'payment.method': 'credit_card' });
```

**Both use the same OpenTelemetry APIs.** The difference is who writes the code that calls it.

## The realization: You already know what the APIs do

Week 1 wasn't just theory. It was learning about the APIs:

- **Day 3:** What the three APIs are (Tracing, Metrics, Logs)
- **Day 4:** What data the Tracing API works with (spans, attributes)
- **Day 5:** How to use all the APIs correctly (semantic conventions)
- **Day 6:** Who calls the APIs (auto-instrumentation vs manual)

**Week 2 is when we'll practice calling these APIs yourself.** But the APIs aren't new, we've been learning what they do all week.

## The mental model: APIs vs Instrumentation

Here's the key mental model to carry forward:

```
OpenTelemetry APIs (what you call in code):
├─ Tracing API: create spans, add attributes
├─ Metrics API: create counters, histograms, gauges
└─ Logs API: emit structured logs

Who calls these APIs:
├─ Auto-instrumentation (libraries call it automatically)
│  ├─ Express → creates HTTP server spans
│  ├─ PostgreSQL client → creates database spans
│  └─ HTTP client → creates outbound request spans
│
└─ Manual instrumentation (you call it explicitly)
   ├─ Business logic spans
   ├─ Custom metrics
   └─ Structured logs with business context
```

**The APIs are the same in both cases.** Auto-instrumentation is just pre-written code that calls the APIs for common operations.

Think of it like security cameras:
- **Auto-instrumentation** = cameras in hallways, entrances, parking lots (infrastructure everyone needs)
- **Manual instrumentation** = cameras in specific rooms for our unique needs (business logic)
- **The APIs** = the camera system itself (same for both types of cameras)

## What's next

**Day 8** is about understanding why the API and SDK are separate. This separation is what makes OpenTelemetry vendor-neutral so we can swap the SDK implementation without changing our instrumentation code.

If you want, test your knowledge with this [quiz](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/knowledge-check.md).

Let's build something! 🚀
