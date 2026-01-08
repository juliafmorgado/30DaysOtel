# Day 24 – When Things Go Wrong: Handling Production Issues at Scale

Yesterday we learned to debug distributed traces - finding individual missing spans and broken context propagation. Today we tackle a different challenge: **keeping entire observability systems reliable when everything else is falling apart.**

**The key distinction (will explain more below):**
- **Day 23:** Individual span debugging (micro-level) - "Why is this specific span missing?"
- **Day 24:** System reliability under load (macro-level) - "How do we keep the whole system working when overwhelmed?"

> **Murphy's Law of Observability:** Your observability system will fail exactly when you need it most - unless you design it not to.

---

## The Production Reality Check

It's Black Friday. Your e-commerce site is getting 10x normal traffic. More users visiting your website. More API calls are being made. More database queries are happening.

This creates more telemetry data. Each request creates spans, 10x traffic = 10x spans to process.

So in turn your observability infrastructure gets overwhelmed. The Collector receives 10x more spans, and it needs to process and export 10x more data. It may not have enough CPU/memory for this load.

At the same time, your observability backends also get stressed. Jaeger needs to store 10x more traces, Prometheus needs to handle 10x more metrics... These systems may be running on the same servers as your apps.

**Why Is This a Problem?**
Your payment service is slow (app problem) -> You want to check traces to see why -> But your Collector crashed from too much data (observability problem) -> So you can't see the traces that would help you debug the payment issue

This happens more often than you'd think.

**The cruel irony** is that the moment you most need observability (during incidents) is exactly when it's most likely to fail (due to increased load).

---

## Understanding Backpressure

### What is Backpressure?

Think of a highway that suddenly merges from three lanes into one. Cars arrive at the merge point faster than they can get through. Result? A massive traffic jam that backs up for miles.

This is backpressure in observability systems:
- Applications are the cars, constantly sending telemetry
- The Collector is the highway, processing and forwarding data
- The backend (Jaeger) is the destination

When any part slows down, you get a traffic jam of telemetry data.

### Common Triggers

**Traffic spikes** are the obvious culprit (Black Friday, viral content, DDoS attacks). But it's not always about volume:

- Backend database has issues and responds slowly
- Network partition between Collector and backend
- Misconfigured Collector creates bottlenecks
- Resource exhaustion (memory, CPU, network)

The tricky part is that Backpressure cascades. Collector can't export → memory climbs → starts dropping data → crashes → all apps lose telemetry.

### The Three-Layer Defense

**Layer 1: Memory Limiter (Emergency Spillway)**
```yaml
processors:
  memory_limiter:
    limit_mib: 512
```
When memory gets dangerously high, drop incoming data to prevent crash. Harsh but necessary, losing some data beats losing the entire system.

**Layer 2: Queue Management (Reservoir)**
```yaml
exporters:
  otlp/jaeger:
    sending_queue:
      enabled: true
      queue_size: 1000
```
Store data temporarily when backend is slow. Handles normal performance fluctuations.

**Layer 3: Adaptive Sampling (Release Valve)**
```yaml
processors:
  probabilistic_sampler:
    sampling_percentage: 10.0  # Reduce from 100% under pressure
```
When consistently overloaded, reduce data volume. Some data is infinitely better than no data.

These work together automatically:
1. **Normal operation:** All inactive, 100% quality
2. **Light pressure:** Queues activate, maintain quality  
3. **Heavy pressure:** Sampling reduces volume
4. **Critical pressure:** Memory limiter prevents crash
5. **Recovery:** Automatic return to full quality

This is called **graceful degradation**, it maintain functionality by temporarily reducing quality instead of failing completely.

---

## Data Loss Prevention

In distributed systems, data loss is inevitable. Networks fail, services crash, resources get exhausted. The question isn't whether you'll lose telemetry data, but how you'll handle it.

### The Silent Killer Problem

The most dangerous data loss is the kind you don't notice. Unlike crashed services (obvious), dropped spans fail silently. Your traces look normal but are incomplete.

> [!IMPORTANT]
>
> Don't confuse this with [Day 23](./day23.md) where we learned about missing spans (debugging problem). The focus there was "Why don't I see spans that should be there?". There, the cause was configuration issues, broken instrumentation, network problems.
>
> `App creates span → Never reaches Collector → Missing from traces`
> (Debugging: "Why didn't this span get created/sent?")
>
> Here we're talking about production problems, when "Spans were created and sent, but got lost in the pipeline".  Most of the time the cause is system overload, resource exhaustion, backend failures.
>
> `App creates span → Reaches Collector → Gets dropped due to overload → Missing from traces`
> (Production: "How do we handle data loss when systems are overwhelmed?")

**Key monitoring:**
- Input vs output: receiving more spans than exporting?
- Queue utilization: consistently full?
- Memory usage: approaching limits?
- Export success rate: what percentage succeeds?

### Prevention Strategies

**Persistent Queues**
```yaml
exporters:
  otlp/jaeger:
    sending_queue:
      storage: file_storage
```
Save queued data to disk, not just memory. Survives Collector restarts and crashes.

**Multiple Export Paths**
```yaml
service:
  pipelines:
    traces/primary:
      exporters: [otlp/jaeger]
    traces/backup:
      exporters: [file/backup]
```
Send data to multiple destinations. If Jaeger goes down, backup still receives data.

**Dead Letter Queues**
When data consistently fails to process (malformed spans, invalid trace IDs), send it to a separate queue for manual inspection. Prevents "poison" data from blocking healthy data.

---

## Error Handling and Recovery

### Exponential Backoff

When export fails, don't immediately retry, that hammers struggling backends. Instead, wait progressively longer between attempts. First retry after 1s, then 2s, then 4s, 8s, etc. Gives backends time to recover.

```yaml
retry_on_failure:
  initial_interval: 1s
  max_interval: 60s
  multiplier: 2.0
```

### Priority-Based Processing

Not all telemetry is equally important:
- **Critical:** Error traces, security events, business transactions
- **Important:** Performance traces, user interactions  
- **Nice-to-have:** Debug traces, health checks

During resource constraints, prioritize critical data. Create separate pipelines with different sampling rates.

### Health Checks

```yaml
extensions:
  health_check:
    endpoint: 0.0.0.0:13133
```

Expose health endpoints for monitoring and automated recovery.

---

## Resource Management

The reality is that every system has finite resources (memory, CPU, network...). Telemetry volume can grow unpredictably, but resources are fixed.

So always **set explicit limits**. Don't let the Collector consume all server memory:
```yaml
resources:
  limits:
    memory: "512Mi"
    cpu: "500m"
```

Also, **monitor usage trends**, track memory consumption, alert before limits reached, plan capacity increases proactively.

---

## The Production Mindset

The biggest shift isn't technical, it's mental:

**Development mindset:** "Make it work"
**Production mindset:** "Make it work when everything else is broken"

This changes how you design systems:
- Assume failures will happen
- Design for graceful degradation  
- Monitor the monitors
- Plan for worst-case scenarios

Remember, perfect is the enemy of good. You need:
- Good enough reliability for your use case
- Visibility when things go wrong
- Fast recovery when failures happen
- Learning from incidents to improve

**The goal isn't preventing all failures, it's handling them gracefully when they occur.**

---

## Tomorrow: Production Best Practices

Today we learned to handle production crises. Tomorrow we'll learn to prevent them: security, performance, and monitoring best practices that make observability systems production-ready from day one.

**You can now keep your observability system running when everything else is falling apart. Next, we'll make sure it never needs to.**

See you on Day 25!