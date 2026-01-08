# Week 2 Knowledge Check: OpenTelemetry APIs & SDK

Test your understanding of Week 2 concepts! This knowledge check covers the OpenTelemetry APIs, SDK configuration, and hands-on skills you've developed.

> **How to use this:** Try to answer each question before looking at the answer. This will help identify areas where you might want to review the material.

---

## Section 1: API vs SDK Fundamentals

### Question 1
**What is the main benefit of separating the OpenTelemetry API from the SDK?**

<details>
<summary>Click to see answer</summary>

**Answer:** **Keeps your application code stable** so you can switch SDK implementations without changing your instrumentation code.

**Simple example:** Your app calls `tracer.startActiveSpan()` (API). You can switch from the standard OpenTelemetry SDK to a vendor's SDK without touching your application code.

**Why this matters:** No vendor lock-in -> your observability code works with any OpenTelemetry-compatible implementation.
</details>

### Question 2
**What happens when you use the OpenTelemetry API without configuring an SDK?**

<details>
<summary>Click to see answer</summary>

**Answer:** **All API calls do nothing** but your application still works normally. This is called "no-op" mode.

**Why this is useful:**
- Test your instrumented code without setting up backends
- Add instrumentation now, enable observability later
- No performance impact when observability is disabled
</details>

---

## Section 2: Tracing API

### Question 3
**In your greeting service, what does `span.setAttribute('user.name', name)` do?**

<details>
<summary>Click to see answer</summary>

**Answer:** **Adds metadata to the span** that describes what's happening in this operation.

**Why useful:** You can search for spans by user name in Jaeger, or see which user was involved when debugging issues.
</details>

### Question 4
**Complete this error handling pattern:**

```javascript
tracer.startActiveSpan('operation', async (span) => {
  try {
    await doWork();
    // What goes here for success?
  } catch (error) {
    // What goes here for errors?
    throw error;
  } finally {
    // What goes here?
  }
});
```

<details>
<summary>Click to see answer</summary>

**Answer:**
```javascript
tracer.startActiveSpan('operation', async (span) => {
  try {
    await doWork();
    span.setStatus({ code: SpanStatusCode.OK }); // Mark success
  } catch (error) {
    span.recordException(error);                 // Record the error
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    throw error;                                 // Re-throw for app handling
  } finally {
    span.end();                                  // Always end the span
  }
});
```
</details>

---

## Section 3: Metrics API

### Question 5
**What type of metric would you use to track "total greetings sent" and why?**

<details>
<summary>Click to see answer</summary>

**Answer:** **Counter** because it only goes up and resets when your app restarts.

Counters are perfect for counting things that accumulate over time, like total greetings sent.
</details>

### Question 6
**How do you add labels/dimensions to metrics to track different categories?**

<details>
<summary>Click to see answer</summary>

**Answer:** **Add extra information in curly braces** when you call `add()`:

```javascript
popularNames.add(1, { name: "Alice" });
popularNames.add(1, { name: "Bob" });
```

**What happens:** You get separate counts for each name:
- Alice: gets her own counter
- Bob: gets his own counter

**Why useful:** See which names are most popular instead of just a total count.
</details>

---

## Section 4: Logs API

### Question 7
**What makes OpenTelemetry logs "structured" and why is this better than traditional logging?**

<details>
<summary>Click to see answer</summary>

**Answer:** **Structured logs use attributes instead of free-form text**, making them machine-readable.

**Traditional logging:**
```javascript
console.log('Greeting created for user Alice');
```

**Structured logging:**
```javascript
logger.emit({
  body: 'Greeting created',
  attributes: { 'user.name': 'Alice' }
});
```

**Why better:** Easy to search and filter (find all logs for user "Alice").
</details>

### Question 8
**How do logs automatically get correlated with traces?**

<details>
<summary>Click to see answer</summary>

**Answer:** **OpenTelemetry automatically adds trace IDs to logs** when they're created inside a span.

**Result:** You can find all logs for a specific trace by searching for the trace ID in your log viewer.
</details>

---

## Section 5: Context Propagation

### Question 9
**What's the most common way to fix broken context propagation in callbacks?**

<details>
<summary>Click to see answer</summary>

**Answer:** **Copy the context before `setTimeout`, then restore it inside the callback.**

**The problem:** Spans inside `setTimeout` become separate traces instead of being connected.

**The fix:**
```javascript
tracer.startActiveSpan('parent', (span) => {
  const currentContext = context.active(); // Save the context
  
  setTimeout(() => {
    context.with(currentContext, () => {   // Use the saved context
      tracer.startActiveSpan('child', (childSpan) => {
        // Now this child IS connected to parent!
        childSpan.end();
      });
    });
  }, 1000);
  span.end();
});
```

**When you need this:** Whenever you see spans appearing as separate traces instead of being nested.
</details>

### Question 10
**Which of these will automatically keep spans connected as parent-child, and which might break the connection?**

A) `async/await`  
B) `setTimeout()`  
C) `Promise.then()`

<details>
<summary>Click to see answer</summary>

**Answer:** 
- **Keep connection:** A) `async/await` and C) `Promise.then()`
- **Might break:** B) `setTimeout()`

**Why:** Promise-based async (async/await, .then) automatically preserves context. Callback-based async (setTimeout, setInterval) often loses context and needs the manual fix.
</details>

---

## Section 6: SDK Configuration

### Question 11
**Looking at your instrumentation.js file, what does each part of this configuration do?**

```javascript
const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: "greeting-service",
    [ATTR_SERVICE_VERSION]: "1.0.0",
  }),
  traceExporter: new OTLPTraceExporter({
    url: "http://localhost:4318/v1/traces",
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});
```

<details>
<summary>Click to see answer</summary>

**Answer:**
- **`resource`:** Identifies your service as "greeting-service" version "1.0.0" - this appears on all your telemetry
- **`traceExporter`:** Sends traces to Jaeger using OTLP protocol on port 4318
- **`instrumentations`:** Wraps libraries at runtime to automatically capture spans for HTTP requests, Express routes, and other operations

**Hidden magic:** The SDK also automatically batches spans for efficiency and adds system information like Node.js version and hostname.
</details>

### Question 12
**Why do your metrics appear every 10 seconds instead of immediately after each request?**

<details>
<summary>Click to see answer</summary>

**Answer:** Because you configured `exportIntervalMillis: 10000` in your metrics setup:

```javascript
metricReader: new PeriodicExportingMetricReader({
  exporter: new ConsoleMetricExporter(),
  exportIntervalMillis: 10000, // This line!
}),
```

**What happens:** Metrics are collected continuously but exported in batches every 10 seconds for efficiency. This prevents flooding your console with individual metric updates.
</details>

---

## Section 7: Integration & Correlation

### Question 13
**How do traces, metrics, and logs complement each other in observability?**

<details>
<summary>Click to see answer</summary>

**Answer:** Each provides a different perspective:

**Metrics** → **WHEN** and **HOW MUCH**
- "Greeting failures spiked at 2:30 PM"
- "Error rate increased by 200%"

**Traces** → **WHERE** and **WHO** 
- "Failures are in the validation step"
- "User Alice's specific request failed"

**Logs** → **WHAT** and **WHY**
- "Validation failed: name is required"
- "Database connection timeout after 30s"

**Workflow:** Metrics detect problems → Traces show where → Logs explain why
</details>



## Scoring Your Knowledge

**Count your correct answers:**

- **14-16 correct:** **Expert Level** - You've mastered Week 2 concepts! Ready for Week 3.
- **11-13 correct:**  **Proficient** - Strong understanding with minor gaps. Review missed topics.
- **8-10 correct:**  **Developing** - Good foundation but review key concepts before Week 3.
- **5-7 correct:**  **Needs Review** - Revisit Week 2 materials, especially hands-on examples.
- **0-4 correct:**  **Start Over** - Go back through Week 2 with the working examples.

---

## Next Steps

**If you scored well:** You're ready for Week 3! The OpenTelemetry Collector will build on these foundations.

**If you need review:** That's totally normal! OpenTelemetry has many concepts. Focus on the hands-on examples as they'll help solidify the theory.

**Remember:** The goal isn't perfection, it's understanding. You can always come back to these concepts as you use OpenTelemetry in real projects.

**See you in Week 3!** 