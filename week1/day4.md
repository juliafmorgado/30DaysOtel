# Day 4 – Spans: Reading the timeline of a request

Yesterday we followed a request end to end and learned what a **trace** is: the recorded journey of one request through a distributed system.

Today we zoom in and answer: **What is that journey actually made of?**

## The one-sentence answer

A trace is made of **spans**, and each span is one timed piece of work. That's it. Everything else today is just helping you see that clearly.

## Start with what we already know: a slow request

We get an alert:

> "The `/pay` endpoint is slow."

We look at metrics and see p95 latency jumped from 300ms to 2.1 seconds. We pull up a trace. Here's what you see:

<img width="1026" height="514" alt="trace hierarchy" src="https://github.com/user-attachments/assets/e6bb8119-f4aa-4def-b4c2-1f26d57f98bb" />


Trace abc123 (2100ms total)
│
└─ POST /pay [████████████████████] 2100ms
├─ Validate input [█] 5ms
├─ Call Config Service [█████████████████] 2000ms ← Something's wrong here
│ └─ Database: query rates [████████████████] 1950ms ← Specifically here
└─ Process payment [██] 50ms

**This visualization is made of spans.**  

Let's break down what we're looking at.

---

## What is a span, really?

A span is a record that says: "I did this thing, it started at this time, and it took this long."

That's it.

### Span for "POST /pay"

```
name: "POST /pay"
start_time: 14:32.000
end_time: 14:32.100
duration: 2100ms
```

### Span for "Database query"
```
name: "SELECT * FROM rates"
start_time: 14:32.050
end_time: 14:32.000
duration: 1950ms
```

Notice something? The database span's time is **inside** the `/pay` span's time. That's because the database work happened **during** the payment request.

This brings us to the most important thing about spans:

## Spans form a hierarchy (parent-child relationships)

The `/pay` request **created** the config service call.
The config service call **created** the database query.

<img width="948" height="496" alt="Trace hierarchy flowchart" src="https://github.com/user-attachments/assets/72761125-f99e-43ad-a32a-682106b43d2b" />

In tracing terms:
- Span A "POST /pay" is the **parent** of Span C "Call Config Service"
- Span C "Call Config Service" is the **parent** of Span E "Database query"

**Why does this matter?**

Because this hierarchy tells you the **path the request took**. When you see a slow span, you can trace it back: "The database query was slow → which was called by Config Service → which was called by the payment request." That's your debugging breadcrumb trail.

## How spans know their parents: the span anatomy

Every span stores these key pieces of information:
```
trace_id: abc123              # Which request journey am I part of?
span_id: span-789             # My unique ID
parent_span_id: span-456      # Who created me?
name: "Database query"        # What am I?
start_time: 14:32.050         # When did I start?
duration: 1950ms              # How long did I take?
```

The **root span** (the first span in a trace) has `parent_span_id: null` because nothing created it—it's where the request entered your system.

>[!NOTE]
> **The trace ID is the thread that ties everything together.**
> 
> All spans with `trace_id: abc123` belong to the same request journey. That's how your tracing tool knows to group them into one trace visualization.

## Making spans useful: attributes

So far, a span just tells you 
> "something took 1950ms."
Not very useful.

**Attributes** are the details that make spans debuggable. They're key-value pairs that describe what happened.

**Without attributes:**
```
name: "Database query"
duration: 1950ms
```

**With attributes:**
```
name: "Database query"
duration: 1950ms
attributes:
  db.system: "postgresql"
  db.statement: "SELECT * FROM rates WHERE currency = $1"
  db.name: "config_db"
  db.operation: "SELECT"
  db.rows_returned: 150000  ← Aha! Returning way too many rows
```

Now you have context. You can see:
1.Which database
2. Which query
3. Which DB instance
4. How many rows returned

**This is what turns "database was slow" into "this specific query returned 150k rows instead of 1."**

### Common attributes you'll see

**For HTTP requests:**
```
http.method: "POST"
http.route: "/pay"
http.status_code: 200
http.target: "/pay?user_id=12345"
```

**Database queries:**
```
db.system: "postgresql"
db.statement: "SELECT * FROM users WHERE id = $1"
db.operation: "SELECT"
```

## A quick word on cardinality (you'll hear this term)

**Cardinality** = how many different values an attribute can have.

- `http.method` → Low cardinality (GET, POST, PUT, DELETE... ~10 values)
- `user.id` → High cardinality (millions of possible users)

High-cardinality attributes are great for debugging individual requests,
but expensive at scale.

Use them deliberately, not everywhere.

## Resources: "Who created this span?"
**Attributes** describe the span's operation. **Resources** describe the service/process that created it.

Think of resources as the span's "return address."
```
service.name: "payment-service"
service.version: "2.3.1"
deployment.environment: "production"
host.name: "ip-10-0-1-42"
k8s.pod.name: "payment-7d8f9-abc12"
```

>[!IMPORTANT]
> **Quick reference:**
> - **Attributes** → What happened
> - **Resources** → Who did it

## How spans travel across services: context propagation

Here's the question that confuses a lot of peopl: **"How does Config Service know it's part of the same trace as Payment Service?"**

Answer: **Payment Service tells it.**

When Payment Service calls Config Service, it includes the trace information in HTTP headers:

```http
POST /config/rates HTTP/1.1
Host: config-service
traceparent: 00-abc123-span456-01
            └─┬──┘ └──┬──┘ └─┬─┘
          version  trace_id  span_id
```

Config Service reads this header and says: "Oh, I'm part of trace abc123, and my parent is span456."
Then Config Service creates its own span:
```
trace_id: abc123              ← Same as Payment Service
span_id: span789              ← My new span ID
parent_span_id: span456       ← Payment's span ID
```

This is called **context propagation**. The trace context (trace ID + parent span ID) propagates from service to service via HTTP headers.

## Baggage: extra labels that travel with the request
Sometimes you want to attach metadata that isn't part of the trace structure but should be available to all spans in the request.

Examples:
- `tenant.id = "acme_corp"` (for multi-tenant systems)
- `user.tier = "premium"` (for different service levels)
- `experiment.group = "checkout_v2"` (for A/B testing)

You set these once at the entry point (API gateway), and they automatically propagate to every downstream service and span.

**Why not just use span attributes?**
Span attributes are set individually on each span. Baggage is set once and inherited by all spans. It's like a request-scoped global variable.

## Distributed tracing: putting it all together

**Distributed tracing** is the practice of creating traces that span multiple services/processes/machines.

The "distributed" part is the challenge because it requires:
1. Every service generates consistent trace/span IDs
2. Every service propagates context correctly
3. All spans use compatible formats
4. All spans go to the same backend (Jaeger, Tempo, etc.)
   
Historically, this was hard. You needed instrumentation libraries for each language, careful header management, and compatible formats across your whole stack.
**This is why OpenTelemetry exists**(more on that around Day 10). It's a standard that makes distributed tracing interoperable across languages, frameworks, and backends.

## A real debugging workflow (using spans)
Let's replay the scenario from the beginning, but now with your new knowledge:

**Metrics alert**: "p95 latency for `POST /pay` is 2.1s (normally 300ms)."

**Step 1:** Pull a sample trace from the slow period.

You see:
```
Trace abc123 (2100ms total)
└─ POST /pay (2100ms)
├─ Validate input (5ms)
├─ Call Config Service (2000ms) ← 🔥 This is the problem
│  └─ Database query (1950ms)    ← 🔥 And specifically this
└─ Process payment (50ms)
```

**Step 2:** Click the database span. Check its attributes:
```
db.statement = "SELECT * FROM rates WHERE currency = $1"
db.rows_affected = 150000 ← Way too many rows!
```

**Step 3:** Hypothesis: "The query is doing a full table scan because we lost an index."

**Step 4:** Search logs for that span's `span_id`. Find: `[span_id=span789] WARN: Sequential scan on rates table (no index used)`

**Root cause found in 3 minutes:** Missing index on `rates.currency`.

This is what spans give you: **a timeline with context that points you to the exact problematic operation.**

## What I'm taking into Day 5

I know there was a lot to take today! Today's win: **Spans are timed units of work that nest to form a trace. Attributes and resources add context. Context propagation (via propagators) is how spans stay connected across services.**

Tomorrow we'll look at **instrumentation**: how spans actually get created in your code (manual vs automatic), and what libraries/tools do this for you.

For Day 4, here's our mental model:

- **Trace** = the whole request journey
- **Span** = one step in that journey
- **Attributes** = what happened in this step
- **Resources** = who performed this step (the emitter)
- **Context propagation** = how steps stay connected across services

See you on Day 5!
