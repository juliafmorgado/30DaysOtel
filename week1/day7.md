# Day 7 – Week 1 Review

We've covered a lot in six days. Today is a pause. A chance to connect everything we've learned and see how it all fits together.

We'll revisit the key concepts, add important details we glossed over, and show us the complete picture of how OpenTelemetry and observability actually work.

Hopefully by the end of today, we'll have:
- A clear mental map of Days 1-6
- The missing pieces that connect everything
- Confidence that we understand the foundations
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
- It's the merger of OpenTracing (tracing) and OpenCensus (metrics/tracing)

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

A request in a distributed system isn't one operation. It's a chain of operations across multiple services, each waiting on the next. And observability gives us three different lenses to understand what's happening.

**What we learned:**
- How a single user click becomes multiple network hops
- Why "the request took 1200ms" doesn't tell us much
- The three signals of observability: traces (one request's journey), metrics (aggregate patterns), and logs (event details)
- How each signal answers different questions (metrics = when, traces = where, logs = what)
- Why context propagation is critical (how the system knows pieces belong together)

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

This is the "stack of waiting" that makes distributed systems slow. Each service is doing a little work, then waiting for downstream responses.

### [Day 4](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day4.md): Spans—the building blocks

A trace isn't one blob of data. It's a tree of spans, where each span is one timed piece of work.

**What we learned:**
- What a span is (operation name, start time, duration, parent relationship)
- How spans form hierarchies (parent-child relationships)
- What attributes are (key-value context like `http.method = "POST"`)
- What resources are (metadata about the service itself)
- How to read a waterfall chart (the visual representation of a trace)

**The mental model we built:**
```
Trace = one request's journey
Span = one step in that journey
Attributes = what happened in this step
Resources = who performed this step
Parent-child = how steps connect
```

### [Day 5](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day5.md): Semantic conventions—the shared language

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

### [Day 6](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day6.md): Instrumentation—how spans get created

**Core insight:** Spans don't appear magically. They're created by instrumentation code, either automatically (wrapping libraries) or manually (code we write).

**What we learned:**
- Auto-instrumentation wraps libraries (Express, PostgreSQL, etc.) to create spans automatically
- Manual instrumentation lets us create spans for business logic
- How both types work together in the same trace
- When to use each (service boundaries = auto, business logic = manual)

**The mental model we built:**
```
Auto-instrumentation = skeleton (HTTP, DB, queues)
Manual instrumentation = muscles (business logic)
Production systems need both
```

## The complete picture: how it all connects

Let's walk through one request end-to-end, connecting everything from Days 3-6.

### Step 1: User action triggers a request

A user clicks "Pay" in our app. This becomes an HTTP POST request to our Payment Service.

```http
POST /pay HTTP/1.1
Host: payment-service
Content-Type: application/json

{
  "amount": 49.99,
  "currency": "USD",
  "userId": "user_12345"
}
```

### Step 2: Auto-instrumentation creates the root span

Our Payment Service is running with OpenTelemetry auto-instrumentation enabled.

When the HTTP request arrives, **Express instrumentation** automatically:
1. Generates a new trace ID (`abc123`)
2. Creates a span for the HTTP request
3. Applies semantic conventions
4. Makes this span the "active span"

```
Span (auto-created by Express):
  trace_id: abc123
  span_id: span-001
  parent_span_id: null  ← Root span
  name: "POST /pay"
  
  Attributes (semantic conventions applied automatically):
    http.method = "POST"
    http.route = "/pay"
    http.target = "/pay"
    http.scheme = "https"
  
  Resource (configured in our setup):
    service.name = "payment-service"
    service.version = "2.3.1"
    deployment.environment = "production"
```

**We wrote zero code for this.** Auto-instrumentation handled everything.

### Step 3: Our application code runs (with manual instrumentation)

Inside our handler, we have business logic:

```javascript
app.post('/pay', async (req, res) => {
  const tracer = trace.getTracer('payment-service');
  
  // Manual span: Validate payment
  await tracer.startActiveSpan('validate_payment_rules', async (span) => {
    span.setAttribute('payment.amount', req.body.amount);
    span.setAttribute('payment.currency', req.body.currency);
    
    try {
      validatePaymentRules(req.body);
      span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  });
  
  // Manual span: Calculate risk
  await tracer.startActiveSpan('calculate_risk_score', async (span) => {
    const risk = calculateRiskScore(req.body);
    span.setAttribute('payment.risk_score', risk);
    span.end();
  });
  
  // Auto-instrumented: HTTP client call to Config Service
  const rates = await axios.get('http://config-service/rates?currency=USD');
  
  // Auto-instrumented: Database insert
  await db.query('INSERT INTO payments VALUES ($1, $2, $3)', 
    [req.body.userId, req.body.amount, rates.data.rate]);
  
  res.json({ success: true });
});
```

**What spans are created:**

```
POST /pay (1200ms)                           ← AUTO (Express)
├─ validate_payment_rules (10ms)             ← MANUAL (our code)
│  ├─ payment.amount = 49.99
│  └─ payment.currency = "USD"
├─ calculate_risk_score (5ms)                ← MANUAL (our code)
│  └─ payment.risk_score = 0.23
├─ GET http://config-service/rates (900ms)   ← AUTO (axios)
│  └─ (continues in Config Service...)
└─ INSERT payments (50ms)                    ← AUTO (PostgreSQL)
```

### Step 4: Context propagates to Config Service

When `axios.get('http://config-service/rates')` executes, **axios instrumentation** automatically:

1. Creates a span for the outbound HTTP request
2. **Injects trace context into HTTP headers:**

```http
GET /rates?currency=USD HTTP/1.1
Host: config-service
traceparent: 00-abc123-span-003-01
            └──┬──┘ └──┬──┘ └──┬─┘
          version trace_id parent_span_id
```

The `traceparent` header carries:
- `abc123`: The trace ID (same as the root span)
- `span-003`: The axios span ID (becomes the parent for Config Service's span)
- `01`: Sampling flag (this trace is being recorded)

### Step 5: Config Service receives the request

Config Service is also running with auto-instrumentation.

When the request arrives, **Express instrumentation** automatically:

1. **Extracts trace context from headers:**
   - Sees `trace_id: abc123`
   - Sees `parent_span_id: span-003`

2. **Creates a span that continues the trace:**

```
Span (auto-created by Express in Config Service):
  trace_id: abc123              ← Same trace!
  span_id: span-004             ← New span ID
  parent_span_id: span-003      ← Parent is the axios span from Payment Service
  name: "GET /rates"
  
  Attributes:
    http.method = "GET"
    http.route = "/rates"
    http.query = "currency=USD"
  
  Resource:
    service.name = "config-service"
    service.version = "1.2.0"
    deployment.environment = "production"
```

**This is distributed tracing in action:** Spans from two different services, possibly on different machines, connected into one trace—automatically.

### Step 6: Config Service queries the database

Config Service's handler runs:

```javascript
app.get('/rates', async (req, res) => {
  // Auto-instrumented: Database query
  const rates = await db.query(
    'SELECT rate FROM exchange_rates WHERE currency = $1',
    [req.query.currency]
  );
  
  res.json({ rate: rates.rows[0].rate });
});
```

**PostgreSQL instrumentation** automatically creates a span:

```
Span (auto-created by PostgreSQL instrumentation):
  trace_id: abc123              ← Still the same trace
  span_id: span-005             ← New span ID
  parent_span_id: span-004      ← Parent is Config Service's HTTP span
  name: "SELECT exchange_rates"
  
  Attributes (semantic conventions):
    db.system = "postgresql"
    db.name = "config_db"
    db.statement = "SELECT rate FROM exchange_rates WHERE currency = $1"
    db.operation = "SELECT"
```

### Step 7: Responses flow back up the chain

Database returns results → Config Service returns results → Payment Service continues → User receives response.

**The complete trace:**

```
POST /pay (1200ms)                              [Payment Service]
├─ validate_payment_rules (10ms)                [Payment Service]
│  ├─ payment.amount = 49.99
│  └─ payment.currency = "USD"
├─ calculate_risk_score (5ms)                   [Payment Service]
│  └─ payment.risk_score = 0.23
├─ GET http://config-service/rates (900ms)      [Payment Service]
│  └─ GET /rates (850ms)                        [Config Service]
│     └─ SELECT exchange_rates (800ms)          [Config Service]
│        ├─ db.system = "postgresql"
│        └─ db.statement = "SELECT rate FROM..."
└─ INSERT payments (50ms)                       [Payment Service]
   └─ db.system = "postgresql"
```

**What we can see:**
- Total request time: 1200ms
- Time spent in Config Service: 900ms (75% of total)
- Time spent in database: 800ms (89% of Config Service's time)
- **Root cause:** The database query is the bottleneck

**What we couldn't see without tracing:**
- Where the 1200ms was actually spent
- That Config Service was the slow part
- That the database query was the specific problem
- Business context (payment amount, risk score, etc.)

**Key separation of concerns:**

1. **API vs SDK:** The API is what we use in our code. The SDK is what processes the data. This separation means we can change backends without changing application code.

2. **Instrumentation vs Export:** Instrumentation creates spans. Exporters send them. We can change where spans go without touching instrumentation.

3. **Auto vs Manual:** Both use the same API and SDK. They're just two different sources of spans.

---

## Important details we haven't covered yet

Now that we have the foundation, let's add some critical pieces that make production systems work.

### Sampling: why we don't trace everything

Here's a problem we haven't addressed: **If we create spans for every request, we'll drown in data.**

Imagine:
- 1000 requests per second
- Each request creates 20 spans
- That's 20,000 spans per second
- 1.7 billion spans per day

**Storage cost:** Enormous.
**Query performance:** Terrible.
**Signal-to-noise ratio:** Most requests are fine. we're storing millions of successful requests just to find the few failures.

**Solution: Sampling.** That means: "Only record detailed traces for a percentage of requests."

**Example configuration:**

```javascript
const sdk = new NodeSDK({
  serviceName: 'payment-service',
  sampler: new TraceIdRatioBasedSampler(0.01),  // Sample 1% of requests
});
```

**What happens:**

1. Request arrives
2. SDK decides: "Should I record this trace?"
   - Generates a random number
   - If number < 0.01 (1%), record the trace
   - Otherwise, skip it
3. The sampling decision is made at the root span
4. All child spans inherit the decision (if parent is sampled, children are sampled)

**Result:**
- 1000 requests/second → 10 detailed traces/second
- we still get enough data to debug issues
- Storage and query costs are manageable

**The sampling decision propagates:**

Remember the `traceparent` header?

```http
traceparent: 00-abc123-span456-01
                              └─┘
                          This is the sampled flag
```

- `01` = sampled (record this trace)
- `00` = not sampled (skip this trace)

When Config Service receives a request, it sees the sampling flag and makes the same decision. This ensures all services agree: either everyone records the trace, or nobody does.

**We'll cover sampling strategies in depth on Day 13.** For now, know that sampling exists and why it's necessary.

### Context propagation: the technical details

We've said "context propagates via HTTP headers" several times. Let's see exactly how that works.

**The W3C Trace Context standard defines two headers:**

1. **`traceparent`** (required): Core trace context

   ```
   traceparent: 00-abc123-span456-01
               └┬┘ └──┬─┘ └──┬─┘ └┬┘
              version trace_id span_id flags
   ```

   - `version`: Always `00` (future-proofing)
   - `trace_id`: 32 hex characters (16 bytes), globally unique
   - `span_id`: 16 hex characters (8 bytes), unique within trace
   - `flags`: 2 hex characters, bit flags (01 = sampled, 00 = not sampled)

2. **`tracestate`** (optional): Vendor-specific context

   ```
   tracestate: vendor1=value1,vendor2=value2
   ```

   Used for vendor-specific propagation (e.g., passing sampling priority, tenant IDs)

**How propagation works in practice:**

**Service A (outbound):**

```javascript
// Axios instrumentation automatically does this:
const activeSpan = trace.getActiveSpan();
const traceId = activeSpan.spanContext().traceId;
const spanId = activeSpan.spanContext().spanId;
const flags = activeSpan.spanContext().traceFlags;

axios.get('http://service-b/api', {
  headers: {
    'traceparent': `00-${traceId}-${spanId}-${flags.toString(16).padStart(2, '0')}`
  }
});
```

**Service B (inbound):**

```javascript
// Express instrumentation automatically does this:
app.use((req, res, next) => {
  const traceparent = req.headers['traceparent'];
  
  if (traceparent) {
    const [version, traceId, parentSpanId, flags] = traceparent.split('-');
    
    // Create span with extracted context
    const span = tracer.startSpan('GET /api', {
      traceId: traceId,
      parentSpanId: parentSpanId,
      traceFlags: parseInt(flags, 16)
    });
    
    // Set as active span
    context.with(trace.setSpan(context.active(), span), () => {
      next();
    });
  } else {
    // No context, start a new trace
    next();
  }
});
```

**we never write this code.** Auto-instrumentation handles it. But understanding what's happening helps we debug when context propagation breaks.

**Common propagation failures:**

1. **Missing instrumentation:** If a service doesn't have instrumentation, it won't propagate context.
   - Symptom: Trace breaks at that service
   - Fix: Add instrumentation

2. **Custom HTTP clients:** If we're using a custom HTTP library that isn't instrumented.
   - Symptom: Outbound calls don't have `traceparent` headers
   - Fix: Manually inject context or switch to an instrumented library

3. **Async boundaries:** In some languages (especially JavaScript), context can be lost across async boundaries.
   - Symptom: Child spans don't have the correct parent
   - Fix: Use `startActiveSpan` to ensure context is preserved

4. **Message queues:** Context propagation works differently for queues (context is in message metadata, not HTTP headers).
   - We'll cover this in Week 2

### Resource detection: how services identify themselves

Remember resources from Day 4? Let's see how they're actually set.

**Manual configuration (we write this):**

```javascript
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: 'payment-service',
  [SemanticResourceAttributes.SERVICE_VERSION]: '2.3.1',
  [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: 'production',
});

const sdk = new NodeSDK({
  resource: resource,
  // ...
});
```

**Auto-detection (SDK does this automatically):**

The OpenTelemetry SDK includes **resource detectors** that automatically discover information about the environment:

```javascript
const { envDetector, hostDetector, osDetector, processDetector } = require('@opentelemetry/resources');

const sdk = new NodeSDK({
  resourceDetectors: [
    envDetector,      // Reads env vars like OTEL_SERVICE_NAME
    hostDetector,     // Detects hostname
    osDetector,       // Detects OS type/version
    processDetector,  // Detects process ID, command, runtime
  ],
  // ...
});
```

**Cloud-specific detectors:**

```javascript
const { awsEc2Detector } = require('@opentelemetry/resource-detector-aws');
const { gcpDetector } = require('@opentelemetry/resource-detector-gcp');
const { containerDetector } = require('@opentelemetry/resource-detector-container');

const sdk = new NodeSDK({
  resourceDetectors: [
    awsEc2Detector,      // Detects AWS EC2 instance metadata
    gcpDetector,         // Detects GCP instance metadata
    containerDetector,   // Detects Docker container ID
  ],
  // ...
});
```

**Example of auto-detected resources:**

```
service.name = "payment-service"           ← From OTEL_SERVICE_NAME env var
service.version = "2.3.1"                  ← From package.json
deployment.environment = "production"       ← From ENVIRONMENT env var
host.name = "ip-10-0-1-42"                 ← Auto-detected
host.id = "i-1234567890abcdef0"            ← From AWS metadata
cloud.provider = "aws"                      ← From AWS metadata
cloud.region = "us-east-1"                 ← From AWS metadata
cloud.availability_zone = "us-east-1a"     ← From AWS metadata
container.id = "abc123def456..."           ← From Docker
k8s.pod.name = "payment-7d8f9-abc12"       ← From Kubernetes
k8s.namespace.name = "production"          ← From Kubernetes
k8s.cluster.name = "prod-cluster"          ← From Kubernetes
```

**Why this matters:**

Resource attributes let we filter and group traces:

```
# Show traces from production payment service in us-east-1
service.name = "payment-service" 
  AND deployment.environment = "production"
  AND cloud.region = "us-east-1"

# Show traces from a specific Kubernetes pod
k8s.pod.name = "payment-7d8f9-abc12"
```

This is critical for multi-environment, multi-region, multi-cluster setups.

## The debugging workflow: connecting everything

Let's walk through one complete debugging scenario using everything we've learned.

**Alert:** "Payment endpoint is slow. p95 latency is 2.1s (normally 300ms)."

### Step 1: Check metrics (when is it slow?)

```
Query: payment_service_latency_p95

Result:
14:25 → 310ms  ✅
14:30 → 320ms  ✅
14:35 → 2100ms ❌
14:40 → 2050ms ❌
14:45 → 2100ms ❌
```

**Finding:** Slowness started at 14:35.

### Step 2: Pull sample traces (where is it slow?)

```
Query:
  service.name = "payment-service"
  AND http.route = "/pay"
  AND timestamp >= 14:35
  AND timestamp <= 14:40
  AND duration > 1000ms

Result: 150 slow traces found
```

Pick one trace to investigate: `abc123`

### Step 3: Open the trace (what's slow in this specific request?)

```
Trace abc123 (2100ms)
└─ POST /pay (2100ms)                    [payment-service]
   ├─ validate_payment (5ms) ✅
   ├─ calculate_risk (5ms) ✅
   ├─ GET /config/rates (2000ms) ❌     [payment-service → config-service]
   │  └─ GET /rates (1950ms) ❌         [config-service]
   │     └─ SELECT exchange_rates (1900ms) ❌  [config-service → database]
   └─ INSERT payments (50ms) ✅
```

**Finding:** The database query in Config Service is taking 1900ms (normally ~50ms).

### Step 4: Check span attributes (what query is slow?)

Click on the database span:

```
Span: SELECT exchange_rates (1900ms)

Attributes:
  db.system = "postgresql"
  db.name = "config_db"
  db.operation = "SELECT"
  db.statement = "SELECT rate FROM exchange_rates WHERE currency = $1"
  db.rows_returned = 1

Status: OK (no errors)
```

**Finding:** The query is simple (returns 1 row) but taking 1.9 seconds. This suggests a database issue, not a query problem.

### Step 5: Correlate with logs (what's happening in the database?)

Search logs for the span ID:

```
Query logs:
  span_id = "span-005"
  timestamp >= 14:35
  timestamp <= 14:40

Results:
[14:36:23] WARN: Database connection pool exhausted (10/10 connections in use)
[14:36:23] WARN: Query waiting for available connection (wait_time=1850ms)
[14:36:25] INFO: Query executed successfully (execution_time=50ms)
```

**Root cause found:** Connection pool exhaustion. Queries are waiting for connections, not slow to execute.

### Step 6: Investigate why connection pool is exhausted

Check other traces around the same time:

```
Query:
  service.name = "config-service"
  AND timestamp >= 14:35
  AND timestamp <= 14:40
  AND db.system = "postgresql"

Finding: 200 concurrent database queries (normally ~20)
```

Check metrics for Config Service:

```
Query: config_service_requests_per_second

Result:
14:25 → 50 rps  ✅
14:30 → 55 rps  ✅
14:35 → 500 rps ❌ (10x spike!)
```

**Root cause confirmed:** Traffic spike caused connection pool exhaustion.

### Step 7: Look for the source of the spike

Check upstream services:

```
Query:
  http.target CONTAINS "config-service/rates"
  AND timestamp >= 14:35

Finding: Payment Service increased calls to Config Service from 50/s to 500/s
```

Check Payment Service logs:

```
[14:35:00] INFO: Deployed new version v2.4.0
[14:35:01] ERROR: Cache layer (Redis) is down, falling back to Config Service
```

**Ultimate root cause:** Redis outage caused Payment Service to bypass cache and hit Config Service directly, overwhelming its database connection pool.

### Step 8: Fix and verify

1. **Immediate fix:** Increase Config Service database connection pool from 10 to 50
2. **Root fix:** Restore Redis cache
3. **Long-term fix:** Add connection pool exhaustion alerting

**Verify with traces:**

```
Query:
  service.name = "payment-service"
  AND http.route = "/pay"
  AND timestamp >= 14:50
  AND duration > 1000ms

Result: 0 slow traces found ✅
```

**What made this possible:**

1. **Metrics** told us *when* (14:35)
2. **Traces** told us *where* (Config Service database)
3. **Span attributes** told us *what* (SELECT query, connection wait)
4. **Logs** told us *why* (connection pool exhausted)
5. **Cross-service visibility** showed *root cause* (Redis outage → cache bypass → database overload)

**This workflow took 10 minutes.** Without distributed tracing, it could have taken hours or days.

## Our mental model after Week 1

After six days, we should have this mental model:

```
Distributed Request
    ↓
Creates a Trace (one request journey)
    ↓
Trace contains Spans (timed operations)
    ↓
Spans have Attributes (context, following semantic conventions)
    ↓
Spans are created by Instrumentation (auto + manual)
    ↓
Context Propagates across services (via headers)
    ↓
SDK processes and exports spans (with sampling)
    ↓
Backend stores and visualizes traces
    ↓
we query traces to debug production issues
```

**Key insights:**

1. **Observability is multi-layered:** Metrics → Traces → Logs work together
2. **Traces are trees:** Parent-child relationships show request flow
3. **Conventions enable interoperability:** Standard names let tools understand our data
4. **Instrumentation has two modes:** Auto (infrastructure) + Manual (business logic)
5. **Context is the glue:** Propagation connects spans across services
6. **Sampling is necessary:** we can't record everything at scale

## What's next: Week 2 preview

Week 1 was concepts and theory - What is observability?. Week 2 is hands-on with the OpenTelemetry APIs and SDK.

**Coming up:**

**Week 2 (Days 8-14): How do I create telemetry?**
- **Day 8:** API vs SDK (understanding the architecture)
- **Day 9:** Tracing API (nested spans, events, attributes)
- **Day 10:** Metrics API (counters, gauges, histograms)
- **Day 11:** Logs API (structured logging + trace correlation)
- **Day 12:** Context Propagation (how context flows through our app)
- **Day 13:** SDK Pipelines (samplers, processors, exporters)
- **Day 14:** Hands-on instrumentation basics and week 2 Review

**Week 3 (Days 15-21): How do I manage telemetry in production?**
- Deep dive into the OpenTelemetry Collector
- Receivers, processors, and exporters
- Transformations and deployment models
- Scaling strategies for production

**Week 4 (Days 22-30): How do I handle edge cases and build production systems?**
- Debugging and troubleshooting distributed traces
- Schema management and semantic convention versioning
- Advanced instrumentation patterns (message queues, async, background jobs)
- Production-ready error handling and edge cases
- Final project: build a complete observable system
  
## What I'm taking into Day 8

**Week 1 taught us how distributed tracing works conceptually. We understand traces, spans, attributes, semantic conventions, instrumentation, and context propagation. Week 2 will teach us how to implement and operate tracing systems in production.**

**The complete picture:**

A user action becomes an HTTP request. Auto-instrumentation creates the root span and applies semantic conventions. Our application code runs, with manual instrumentation adding business context. Context propagates to downstream services via HTTP headers. Each service creates spans following the same conventions. The SDK batches spans, applies sampling, and exports them to a backend. We query traces to debug production issues faster than ever before.

**Remember:**

> > OpenTelemetry isn't just about collecting traces. It's about collecting all telemetry signals (metrics, traces, logs) in a *consistent, vendor-neutral way*, so you can answer production questions in minutes instead of hours—regardless of which backend you use.

See you on Day 8, where we'll dive into the difference between the OpenTelemetry API and SDK—understanding the architecture and separation of concerns that makes OpenTelemetry vendor-neutral and portable across backends.
