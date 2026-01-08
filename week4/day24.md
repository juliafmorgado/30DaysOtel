# Day 24 – Debugging Distributed Traces: Finding Lost Spans

Yesterday we learned to troubleshoot missing telemetry data in the pipeline.

Today we'll go one step further and look into how to **debug distributed traces** themselves.

But remember, always debug the Collector first. Then debug context between services.
---

## The Distributed Tracing Challenge

In a distributed system, one user request doesn’t stay in one service. Consider this e-commerce checkout flow:
```
Frontend → API Gateway → User Service → Payment Service → Inventory Service
```
One request should create one trace, with spans from each service.

But in real life, you often see:
- **Missing spans** - Some services don't appear in traces
- **Broken context** - Spans exist but aren't connected
- **Orphaned spans** - Spans with no parent relationship
- **Incomplete traces** - Traces that end abruptly

> [!IMPORTANT]
> DON'T CONFUSE THE REQUEST FAILING AND THE TRACE FAILING!
>
> Read the next section and you'll understand it better

## The Common Confusion: “Did the request break or did tracing break?”

When people first learn distributed tracing, they often mix up two very different failures: the request and the trace. They feel similar because both show up as “missing spans”. But the request is the work and the trace is the metadata describing that work (it travels with the request).

### Case 1: The Request Breaks
When a service never receives the request or it crashes before doing any work, you don't see any spans from that service and/or the trace ends early.

This DOESN'T mean it's a tracing problem, it's usually a **network, timeout, or application error**.

Example: API calls Payment -> Payment crashes -> No Payment span exists because no work happened

👉 Nothing to trace because nothing ran

### Case 2: The Request Works, but Context Breaks
Here the request reaches the service, the service runs normally, a span is created BUT the trace context isn't passed or extracted. So the service shows up BUT in a **different trace** or as an orphan span.

This means the app and the request are fine but the **tracing is broken**.

Example: API calls Payment -> Payment runs successfully -> But forgets to forward traceparent -> Payment creates a brand new trace

👉 Work happened, but the story was lost

> If the service ran, but the trace is disconnected, context broke.
>
> If the service never ran, the request broke.
>
> Your job is to figure out whether the work stopped… or the story stopped.

## Why This Matters in Practice
Because the fixes are totally different:

| Problem | Fix |
|---------|-----|
| Request broke | Fix networking, retries, timeouts |
| Context broke | Fix propagation, headers, instrumentation |
| Missing spans | Check if service ran at all |
| Orphan spans | Check trace context |

---

## The One Rule of Distributed Tracing

As we learned on [day 12](../week2/day12.md) about context propagation, **distributed tracing only works if context is passed between services**.

The trace context (trace ID + parent info) is passed using request headers.
If those headers don’t make it across a service boundary, the trace breaks.
---

## What “Breaking” Actually Means

When context doesn’t flow correctly, you’ll see one of three things:

### 1. Missing spans (Service Not Appearing)
Service is running and processing requests, but never shows up in the trace and other services in the flow still work fine.

**Key questions to ask:**
- Is the service instrumented with OpenTelemetry?
- Is it sending telemetry to the right Collector endpoint?
- Can the service reach the Collector?

That usually means the service isn’t instrumented or it isn’t sending data anywhere (because the Collector endpoint is wrong, there are network connectivity issues or a service name mismatch).


### 2. Broken Context Propagation
All services create spans, but each one starts a new trace with different trace IDs. There is no parent-child relationships.

That means services are instrumented correctly but trace context isn't flowing between them. Each service starts a new trace instead of continuing the existing one.

**Key questions to ask:**
- Are HTTP headers being passed between services?
- Is the SDK configured to extract context from incoming requests?
- Is the SDK configured to inject context into outgoing requests?
- Are the right propagators configured (W3C Trace Context)?

That usually means context headers weren’t extracted or weren’t forwarded to the next service.

### 3. Incomplete traces
The trace starts fine, some spans appear but then it suddenly stops (missing downstream spans).
 
This is likely a **request problem**, not a tracing problem. The downstream service never received the request or it crashed before creating any spans.

**Key questions to ask:**
- Is the missing service actually running and healthy?
- Is it receiving HTTP requests from upstream services?
- Are there any errors in the service logs?
- Can services reach each other over the network?
- Is sampling set too low (accidentally dropping spans)?

**Common causes:**
- Service crashed or isn't running
- Network connectivity problems between services
- Load balancer or service mesh routing issues
- Aggressive sampling configuration
- Service timeouts or circuit breakers

---
## Where Tracing Breaks Most Often

Almost all distributed tracing issues happen at service boundaries:
- HTTP calls between services
- Message queues
- Async jobs
- Background workers

If context isn’t forwarded there, tracing stops.

---
## A Simple Debugging Checklist

When a trace looks wrong, check in order:
1. Does every service create spans? If not, instrumentation is missing.
2. Do spans share the same trace ID? If not, context isn’t propagating.
3. Does the trace break at a specific service hop? That’s where headers are getting lost.

That’s enough to find most issues.

---
## Why This Feels Hard at First
Tracing feels magical when it works and confusing when it doesn’t.

Once you understand that headers carry the trace, everything becomes easier to reason about.

---

## Tomorrow: Handling Production Issues

Today we learned to debug distributed traces systematically. Tomorrow we'll tackle broader production challenges like handling backpressure, dealing with dropped spans, and managing errors at scale.

**You can now debug the invisible connections between your services. Next, we'll make sure those connections stay reliable under pressure.**

See you on Day 25!