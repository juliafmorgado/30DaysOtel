# Day 4 – Spans, Context, and the Shape of a Trace

Yesterday we followed a request end to end and learned what a **trace** is: the recorded journey of one request through a distributed system.

Today we zoom in.

If a trace is the story, then **spans** are the chapters.
And **context** is the thread that keeps the scenes from falling out of order.

If you can read spans, you can debug distributed systems. Let's make that concrete.

## What is a span? (The smallest unit of tracing)

A span represents **a single timed operation**. Not a service. Not a request (it can be **part** of a request).

Examples of real spans:
- "HTTP POST /pay received"
- "Call Config Service"
- "Validate payment token"
- "SELECT exchange_rate FROM rates"
- "Wait for connection from pool"
- "Serialize response"

Each span records:
1. **What happened** (a name, like `GET /config/rates`)
2. **When it started** (timestamp)
3. **How long it took** (duration)
4. **Where it fits** in the larger request (parent relationship)
5. **Extra context** (attributes/metadata we'll cover soon)

Here's the key insight: **Spans nest inside each other, like folders in a file system.** And a trace is just a folder of spans that share the same trace ID.

**Example**: Let’s replay the payment request from Day 3.

<img width="948" height="496" alt="Trace hierarchy flowchart" src="https://github.com/user-attachments/assets/1cc0948e-e5a8-4f82-ad0a-500f89672f21" />

This image shows one trace (abc123), meaning one user request, broken into spans. Color tells you role and scope, not importance.

**🟢 Green — Root span (the request boundary)**
**Span A: HTTP POST /pay (Payment Service)**
Green marks the root span.

This span represents:
- The moment the request enters the system
- The full lifetime of the user-visible request
- Everything else happens inside this span

If Span A takes 1.2 seconds, that’s what the user experienced.

**🔵 Blue — Work done inside Payment Service**
**Spans B, C, F, G**

Blue spans are:
- Children of the root
- Executed by the Payment Service itself
-Sequential pieces of application logic

* Important detail: Even though Span C calls another service, it is still blue because the decision and waiting happen inside Payment Service. This span represents Payment waiting on Config.

**🟠 Orange — Entry span of a downstream service**
**Span D: HTTP GET /config (Config Service)**

Orange marks a service boundary crossing.

This span represents:
- The moment Config Service receives the request
- The start of Config’s own work
- A new runtime, new process, new responsibility

Even though Span D is triggered by Payment, it does not belong to Payment Service. It belongs to Config Service.

**🟡 Yellow — Internal dependency work (deepest layer)**
**Span E: Query rates table**

Yellow marks leaf work, usually:
- Database queries
- Cache lookups
- RPC calls to infrastructure

This span is a grandchild:
- Parent: Span D (Config Service handling request)
- Grandparent: Span C (Payment calling Config)
  
## Parent-child relationships

Every span except the root has a **parent**. This is how the trace knows how to draw the tree.

>[!NOTE]
> **This is the anatomy of a span:**
> - `trace_id`: Which request journey this belongs to
> - `span_id`: This span's unique ID
> - `parent_span_id`: Which span created this one
> - `name`: Human-readable description
> - `start_time`: When it began
> - `end_time`: When it finished
> - `attributes`: Extra metadata (next section)

## Attributes: the context that makes spans useful

A span's **attributes** are key-value pairs that describe what kind of operation this was. They're also called "tags" in some systems.

Example attributes for `Span A: POST /pay`:
```
http.method = "POST"
http.route = "/pay"
http.status_code = 200
payment.amount = 49.99
payment.currency = "USD"
user.id = "user_12345"
```

Without attributes, you'd see: "Some database query took 800ms."

With attributes, you see: "A PostgreSQL SELECT on the rates table took 800ms, for currency=USD, in the config_db database."

Attributes turn spans from timing data into **stories with context**.

### Attribute cardinality (a warning for later)

**Cardinality** = how many unique values an attribute can have.

Low cardinality: `http.method` (GET, POST, PUT, DELETE... maybe 10 values)
High cardinality: `user.id` (millions of unique users)

High-cardinality attributes (user IDs, session IDs, order IDs) are useful for debugging but expensive to store and query at scale. Most tracing systems let you add them, but you'll pay in storage and query performance.

For now: **Use high-cardinality attributes when debugging, but be aware they're not free.**

## Resources: metadata about where the span came from

**Attributes** describe the operation. Resources describe the thing doing the operation. It's metadata about the service/container/host itself, not the request.

Common resource attributes:
```
service.name = "payment-service"
deployment.environment = "production"
cloud.region = "us-east-1"
k8s.pod.name = "payment-service-7d8f9-abc12"
```
Resources are attached to **all spans from that service**. They're how you can filter traces by "show me only spans from payment-service version 2.3.1 in production."

>[!IMPORTANT]
> **Attributes vs Resources:**
> - **Attributes**: Describe the specific span (this request, this query, this user)
> - **Resources**: Describe the service/process that created the span (which service, which version, which host)

## Context: the invisible envelope every request carries

Remember Day 3's "context propagation"? Now we can be more specific.

The **context object** is the data structure that carries:
- `trace_id`: The request's ID
- `span_id`: The current span's ID (becomes `parent_span_id` for the next span)
- Trace flags (e.g., "is this trace sampled?")
- **Baggage** (extra labels that travel with the request)

When Payment Service calls Config Service, it **injects** this context into HTTP headers:

```
http
POST /config/rates HTTP/1.1
traceparent: 00-abc123-span_aaa-01
            └──┬──┘ └──┬──┘ └──┬──┘
          version  trace_id  span_id (parent for next span)
```

Config Service **extracts** this header, reads the context, and creates `Span 2` with `parent_span_id=span_aaa`.

### Intra-service vs inter-service propagation

**Inter-service propagation** (what we just described):
- Context travels **between services** (over the network)
- Usually via HTTP headers, message queue metadata, or gRPC metadata
- This is what most people mean by "context propagation"

**Intra-service propagation** (within one service):
- Context travels **within the same process** (in memory)
- Example: Your Payment Service calls a helper function `validateToken()`, which should create a child span
- The language runtime (Node, Java, Go) usually has thread-local storage or async context to pass trace context automatically

>[!NOTE]
> **Most tracing libraries handle intra-service propagation for you.** You usually only need to think about inter-service propagation (configuring which HTTP headers to use, etc.).

## Propagators: the translators

Different tracing systems use different header formats:
- **W3C Trace Context**: `traceparent`, `tracestate` (the standard)
- **B3**: `X-B3-TraceId`, `X-B3-SpanId` (Zipkin format)
- **Jaeger**: `uber-trace-id`

A **propagator** is the code that knows how to:
1. **Inject** context into outbound requests (write headers)
2. **Extract** context from inbound requests (read headers)

Most modern systems support W3C Trace Context. If you're using OpenTelemetry, it handles propagation for you—you just configure which formats to support.

## Baggage: extra labels that ride along

**Baggage** is key-value data that propagates with the context but isn't part of the trace structure.

Example: You want every span in a request to know:
- `tenant.id = "acme_corp"`
- `user.tier = "premium"`
- `experiment.group = "checkout_v2"`

You set this **once** at the edge (API gateway), and it propagates to every downstream service and span automatically.

**Why not just use span attributes?**

Span attributes are set per-span. Baggage is set once and inherited by all child spans. It's like a request-scoped global variable.

**Warning:** Baggage increases payload size for every inter-service call. Don't put large data (like entire user profiles) in baggage. Keep it to small, essential labels.

## Distributed tracing: putting it all together

**Distributed tracing** is the practice of creating traces that span multiple services/processes/hosts.

It requires:
1. **Context propagation** (so spans know their parents across network boundaries)
2. **Instrumentation** in each service (code that creates spans)
3. **A backend** to collect and visualize traces (Jaeger, Tempo, etc.)

The "distributed" part is the hard part historically, because it requires every service to:
- Generate trace/span IDs
- Propagate context
- Emit spans in a compatible format
- Send spans to the same backend

This is why OpenTelemetry matters (more on that around Day 10-12). It's a standard that makes all of this interoperable.

## A real debugging workflow (using spans)

Let's say metrics alert you: "p95 latency for `POST /pay` is 2.1s (normally 300ms)."

**Step 1:** Pull a sample trace from the slow period.

You see:
```
Trace abc123 (2100ms total)
└─ POST /pay (2100ms)
├─ Validate input (5ms)
├─ GET /config/rates (2000ms) ← 🔥 This is the problem
│  └─ Query rates (1950ms)    ← 🔥 And specifically this
└─ Process payment (50ms)
```

**Step 2:** Click into the database span. Check its attributes:
```
db.statement = "SELECT * FROM rates WHERE currency = $1"
db.rows_affected = 150000
```

**Step 3:** Hypothesis: "The query is doing a full table scan because we lost an index."

**Step 4:** Search logs for that span's `span_id`. Find: `WARN: Query plan shows seq_scan on rates table (no index on currency)`

**Root cause found in 3 minutes:** Missing index on `rates.currency`.

This is what spans give you: **a timeline with context that points you to the exact problematic operation.**

## What I'm taking into Day 5

I know there was a lot to take today! Today's win: **Spans are timed units of work that nest to form a trace. Attributes and resources add context. Context propagation (via propagators) is how spans stay connected across services.**

Tomorrow we'll look at **instrumentation**: how spans actually get created in your code (manual vs automatic), and what libraries/tools do this for you.

For Day 4, here's your mental model:

- **Trace** = the whole request journey
- **Span** = one step in that journey
- **Attributes** = what happened in this step
- **Resources** = who performed this step (the emitter)
- **Context propagation** = how steps stay connected across services

See you on Day 5!
