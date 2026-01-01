# Day 14 – Week 2 Recap: OpenTelemetry APIs & SDK

We’ve made it to the end of Week 2!
This week was about getting our hands dirty with OpenTelemetry APIs, adding traces, metrics, and logs to real code, and wiring up just enough SDK configuration to make things work.

At this point, you might feel like:
- “I copied some SDK config and it worked”
- “I know how to add spans, but not everything behind the scenes”
- “I understand what they do but I couldn't do it alone”

That’s completely normal and expected.

> **Knowledge Check:** Test your Week 2 knowledge with our [`week2-knowledge-check.md`](./week2-knowledge-check.md)
>
> **Next Week Preview:** We will dive into the **OpenTelemetry Collector**, the powerful data processing pipeline that can transform, route, and enhance our telemetry data.

---

## What We Accomplished This Week

### **The Big Picture: API vs SDK**
One of the biggest ideas this week was the difference between instrumentation and implementation.
- **API** = what we write in our application code (create spans, record metrics, emit logs)
- **SDK** = what actually processes and exports that data (batching, exporting, sampling, etc.)

The **separation** between them allows us to change how telemetry behaves without changing application code.

### **The Three Pillars of Observability**
- **Traces** = Individual request journeys ("What happened to this request?")
- **Metrics** = Aggregate patterns ("How often is something happening overall?")
- **Logs** = Detailed event information ("Why did this operation fail?")

### **Core Skills Developed**
- Add manual spans with proper attributes and events
- Use counters to track basic behavior
- Emit structured logs that automatically link to traces
- Understand context propagation and when it breaks
- Set up a basic SDK configuration that sends telemetry somewhere useful

---

## Day-by-Day Recap

### **[Day 8: API vs SDK](./day8.md)**
This was the day we zoomed out and talked about architecture.

**What we learned:** 
- The API is what our code talks to
- The SDK is the concrete implementation behind it
- Telemetry can be turned off (no-op) without deleting instrumentation
- This design avoids vendor lock-in

---

### **[Day 9: Tracing API](./day9.md)**
Focus: Following a single request through the system

**What we built:** Simple greeting service with manual instrumentation
- Basic greeting endpoint with nested spans
- Span attributes and events for request details
- Parent-child span relationships

**Key insight:** Traces tell the story of individual requests through your system.

---

### **[Day 10: Metrics API](./day10.md)**
Focus: Looking at behavior over time

**What we built:** Enhanced greeting service with counters
- `greetings_sent_total` - Count of greetings sent
- `requests_received_total` - Count of requests received  
- `popular_names_total` - Count by name with labels

Key takeaway: Metrics don’t explain why something happened, they show how often it happens.
---

### **[Day 11: Logs API](./day11.md)**
Focus: Adding detail and context

**What we built:**
- Structured logs instead of plain text
- Automatic trace_id and span_id correlation in logs
- Error logs that line up with failed spans

Key takeaway: Logs become much more useful when they’re connected to traces.
---

### **[Day 12: Context Propagation](./day12.md)**
Focus: How everything stays connected

**What we saw:**
- Context usually flows automatically
- `setTimeout` and event emitters can break it
- Broken context leads to disconnected traces

Key takeaway: Good observability depends on context staying intact.
---

### **[Day 13: You Deserve a Break!](./day13.md)**
We took a well-deserved break to process everything learned

Why?
There’s a lot of new mental models here. Pausing helps them settle.

---

## The “It Finally Makes Sense” Pattern

By the end of Week 2, we were using traces, metrics, and logs together, even if we didn’t fully understand every internal piece yet.

Here's a short recap:

```javascript
tracer.startActiveSpan("create_greeting", async (span) => {
  span.setAttribute("user.name", name); // TRACING: Add attributes to describe the operation
  requestsTotal.add(1); // METRICS: Count this request

  try {
    logger.emit({ severityText: "INFO", body: "Greeting created" }); // LOGGING: Record what's happening
    greetingsTotal.add(1);
  } catch (error) {
    span.recordException(error);
    logger.emit({ severityText: "ERROR", body: "Greeting failed" });
    throw error;
  } finally {
    span.end();
  }
});
```

At this stage, the important thing isn’t how the SDK processes this, it’s that the code is instrumented correctly, the data shows up and everything is connected.

---

## Key Concepts Mastered

### **1. Manual Instrumentation**
- Creating spans with `tracer.startActiveSpan()`
- Adding meaningful attributes with semantic conventions
- Proper error handling with `span.recordException()`
- Setting span status for success/failure

### **2. Telemetry Integration**
- Traces for request flows
- Metrics for aggregate patterns  
- Logs for detailed context
- Automatic correlation via trace context

### **3. SDK Configuration**
- Resource attributes for service identification
- Basic exporter configuration (console vs OTLP)
- Understanding the basic SDK setup pattern
- Auto-instrumentation setup

**What we actually learned about the SDK (even if it felt like copy-paste):**
We've been using SDK configuration without diving deep into the internals. Here's the basic pattern of SDK initialization that we implicitly learned:

```javascript
const sdk = new NodeSDK({
  // We learned how to identify our service (resource attributes)
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: "greeting-service",
    [ATTR_SERVICE_VERSION]: "1.0.0",
  }),
  
  // How to send traces somewhere (exporters)
  traceExporter: new OTLPTraceExporter({
    url: "http://localhost:4318/v1/traces",
  }),
  
  // How to send metrics to console
  metricReader: new PeriodicExportingMetricReader({
    exporter: new ConsoleMetricExporter(),
    exportIntervalMillis: 10000,
  }),
  
  // That auto-instrumentation exists and captures HTTP requests automatically
  instrumentations: [getNodeAutoInstrumentations()],
});
```

**What we did NOT learn (and that's fine!):**
We didn’t talk about:
- batching processors
- sampling strategies
- SDK pipelines
- why defaults were chosen

The default SDK configuration works perfectly for learning scenarios. We got working observability without cognitive overload. Understanding why comes next.

---

## Why This Sets Us Up Perfectly for Week 3

In Week 3, we move beyond the SDK and into the Collector.

That’s where:
- pipelines become explicit
- processors finally make sense
- routing and filtering show up
- “why not do this in the SDK?” becomes a real question

Week 2 gave us working observability.
Week 3 explains the machinery.

---

## Final Thoughts

> If you feel like: “I know how to use this, even if I don’t fully understand it yet”
>
> That’s success.

You now have:
- real instrumentation
- real telemetry
- a solid foundation

And you’re ready for Day 15!