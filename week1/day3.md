# Day 3 – Traces, Metrics, Logs (and how one request actually moves)

Most observability explanations start with “signals” and definitions. That’s backwards for beginners. The hard part is usually this: **what does a single request physically do as it moves through a system?** 

Once you can picture the request moving, traces/metrics/logs stop feeling like three random data types and start feeling like three camera angles.

So we’re going to follow one real request as it travels, then map each telemetry signal onto what you’d observe.

## One request, end to end (what happens on the wire and in memory)

<img width="1536" height="1024" alt="Payment request end to end" src="https://github.com/user-attachments/assets/df07db32-59cc-4699-a044-31f614520ea2" />

A user clicks **“Pay”** in a browser or mobile app. That click becomes an HTTP request sent over the network. The request has a method (`POST`), a path (`/pay`), headers (metadata), and a body (data like cart items or payment token).

That request hits a load balancer or API gateway first (often), then gets routed to an instance of your **Payment Service**. At this moment, there is a physical TCP connection (or HTTP/2 stream), bytes arriving, and your service runtime (Node/Java/Go/etc.) decoding those bytes into a request object.

Now your application code runs. It might validate input, check auth, compute totals, and then… it needs information it doesn’t have locally. Maybe it needs fraud rules, currency conversion, or feature flags. So the Payment Service becomes a client and makes its own outbound request to another service, like **Config Service**.

This is a key point: the original “Pay” request is still *in progress*. The Payment Service is now waiting on dependency calls. The user is waiting too, indirectly, because their request cannot finish until these dependencies finish.

So the Payment Service sends a second HTTP request to Config Service. New network hop, new connection or reused connection, new headers, new bytes. Config Service receives it, decodes it into a request object, runs code, and discovers it also needs data. It calls another downstream component, like a config proxy or database access service, which then calls the database. The database executes a query, returns rows, and the response flows back up the chain:

Database → proxy → Config Service → Payment Service → user

That’s the physical shape of a distributed request: a **stack of waiting** across services. Each service is doing some work, then pausing while it waits for downstream work, then resuming.

>[!NOTE]
> Why waiting, not parallel work?
> 
> Each service needs the result from the previous one. Payment can't finish calculating the total until it knows the current exchange rate from Config. Config can't return exchange rates until it reads them from the database. It's sequential because of data dependencies, not bad design.

If this request takes 1200 ms, it’s rarely because Payment Service “spent” 1200 ms on CPU. Usually it spent some CPU time, and the rest was waiting for other services, waiting for the database, waiting on the network, or waiting on locks/queues.

This is why “slow request” debugging is hard without observability. You’re not debugging one program. You’re debugging a chain reaction.

## A concrete mental picture: three lenses on the same slow request

Imagine you run the exact same payment request, and you collect all three signals:

**Metrics (the smoke alarm):**
"Payment latency is worse between 14:30–14:40"
→ Tells you WHEN something is wrong

**Traces (the breadcrumb trail):**
"Request abc123 spent 800ms in Config Service → DB query"
→ Tells you WHERE in the request flow

**Logs (the forensic notes):**
"Connection pool exhausted, query timed out after 30s"
→ Tells you WHAT specifically failed

Each signal is incomplete by itself. Together, they explain reality.

## What tracing is, using that one request

Tracing is what happens when we decide: **for this one request, record the story of what it touched and how long each part took**.

When tracing is enabled, the system generates a **trace ID** near the beginning of the request (often right when it enters the first service). That trace ID is just an identifier, but it’s powerful because it’s the thread that ties the whole journey together.

As the Payment Service calls Config Service, it includes that trace information in the outbound request metadata (usually HTTP headers). Config Service reads it, realizes “I’m part of the same request story”, and continues the trace when it makes downstream calls. This repeats until the request finishes.

In a trace view, you’ll later see that request as a timeline. One request becomes one narrative: “Payment handled the incoming `/pay`, then called config, config called database, database took 800 ms, everything returned, request completed.”

Here’s the beginner-friendly definition I wish I’d heard earlier:

**A trace is the recorded journey of one request through the system.**

Tomorrow is the day to go deep on spans, but for today it’s enough to know that a trace is made of timed segments (spans) that represent the steps along that journey.

## Metrics, and why they can’t answer “which request?”

Metrics are not about individual journeys. Metrics are about **aggregates over time**.

If tracing is “tell me the story of one request”, metrics are “how are requests behaving overall?” Metrics answer questions like: “Is latency trending up this afternoon?” or “Did error rate spike after deploy?” or “How many requests per second are we handling?”

That aggregate nature is the whole point. Metrics are cheap to collect, stable over time, and perfect for alerting. A good metric can wake you up at 2:07 AM and be correct about the fact that users are suffering.

But metrics can’t tell you *why* a specific request was slow. A latency histogram can tell you that p95 went from 300 ms to 1.2 s. It cannot tell you, by itself, “Config Service started taking 900 ms because one query lost an index.”

>[!IMPORTANT]
>This is the handoff that matters in real life:
>
>Metrics tell you **something is wrong**.
>Traces show you **where it went wrong for real requests**.

That’s why people often “start with metrics” and “debug with traces”.

## Logs, and why they feel useful until they don’t

Logs are records of events. A service prints: “started request”, “calling dependency”, “db timeout”, “payment succeeded”, and so on. Historically, logs were the main way people debugged production.

Logs are still valuable, but beginners often get trapped in a painful loop: searching logs, guessing correlations, copying IDs into another search, and trying to reconstruct timelines manually.

The reason logs struggle in distributed systems is that the interesting story is split across many machines and services. Without a shared identifier, you don’t really have “one request”; you have thousands of lines that *might* be related.

Logs get dramatically more powerful when they are correlated with traces. If a log line carries the trace ID (and span ID), you can jump from “error log in Config Service” straight into the exact request journey that produced it, and see what else was happening around it.

>[!NOTE]
>**Debugging without trace correlation (the old way):**
>1. Check metrics → see spike at 14:35
>2. Grep logs for "14:35" → 47,000 lines
>3. Grep for "timeout" → 8,000 lines
>4. Grep for payment IDs → manually reconstruct timeline
>5. 2 hours later, still guessing
>
>**With trace correlation:**
>1. Check metrics → see spike at 14:35
>2. Sample a slow trace → abc123
>3. Search logs for abc123 → 8 relevant lines
>4. Root cause found in 3 minutes

This is the practical relationship:

A trace is the map.
Logs are the street-level notes pinned onto the map.

## Context propagation: the glue that makes correlation possible

If you only remember one thing from today, remember this:

**Context propagation is how the request carries its identity (trace ID) across service boundaries.** (_This sounds abstract, but don't worry we'll come back at it around Day 12._)

“Context” is a little packet of identity information, typically including trace ID and a parent span ID. “Propagation” is the act of injecting that context into outbound requests (like headers) and extracting it on the receiving side.

This is why a Payment Service can “see” database work in a trace even though it never talked to the database directly. It didn’t magically observe the database. The trace simply stayed intact as the request moved through other services that *did* talk to the database.

When context propagation is missing or broken, a trace fractures into separate islands. You might see a Payment trace and a Config trace that look unrelated, even though they were part of the same user click. This is one of the most common “why doesn’t tracing work?” failures.

It answers the beginner’s biggest mystery: “How does the system know these pieces belong together?”

## (Tiny cameo) Baggage

Baggage is context that also propagates, but it’s not primarily about tracing structure. It’s more like “extra labels that travel with the request” such as tenant ID, user tier, or experiment group.

Baggage is useful, but it’s also easy to overuse because it increases what gets sent downstream. For now, it’s enough to know it exists and that it rides along with context propagation. I’ll give it a proper day later.

## What this means for your first observability setup

**Goal: Answer "why was that request slow?" in under 5 minutes instead of 2 hours.**

How to get there:

1. Start with metrics – They're cheapest and catch most issues
2. Add tracing selectively – Even 1% of requests traced is useful
3. Correlate logs – Emit trace IDs in your log lines
4. Use metrics to find time windows, traces to debug specific failures

## What I’m taking into Day 4

Tomorrow we'll zoom into spans: the individual segments that make up a trace timeline. Once spans click, we’ll be able to read a trace like a debugging timeline: what happened, in what order, and what was waiting on what.

For Day 3, the win is this mental model:

A single request moves as a chain of network calls and waiting.
Tracing records that chain for one request.
Metrics summarize many requests over time.
Logs describe events, and become much more useful when correlated with traces through propagated context.

See you on Day 4!
