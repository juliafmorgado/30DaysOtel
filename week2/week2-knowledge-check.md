# Week 2 Knowledge Check: OpenTelemetry APIs & SDK

Test your understanding of Week 2 concepts! This knowledge check covers the OpenTelemetry APIs, SDK configuration, and hands-on skills you've developed.

> **How to use this:** Try to answer each question before looking at the answer. This will help identify areas where you might want to review the material.

---

## Section 1: API vs SDK Fundamentals

### Question 1
**What is the main benefit of separating the OpenTelemetry API from the SDK?**

<details>
<summary>Click to see answer</summary>

**Answer:** You can change observability backends without changing your application code. The API provides stable interfaces for creating telemetry, while the SDK handles the configurable processing and export logic.

**Key insight:** This separation makes OpenTelemetry vendor-neutral and portable.
</details>

### Question 2
**What happens when you use the OpenTelemetry API without configuring an SDK?**

<details>
<summary>Click to see answer</summary>

**Answer:** The API operates in "no-op" mode - all API calls do nothing but don't break your application. This is useful for testing and gradual rollouts.

**Example:**
```javascript
const span = tracer.startSpan('operation');  // Does nothing if no SDK
span.setAttribute('key', 'value');           // No-op
span.end();                                   // No-op
```
</details>

---

## Section 2: Tracing API

### Question 3
**What's the difference between `tracer.startSpan()` and `tracer.startActiveSpan()`?**

<details>
<summary>Click to see answer</summary>

**Answer:** 
- `startActiveSpan()` automatically sets the span as the active span in the current context, enabling automatic parent-child relationships
- `startSpan()` creates a span but doesn't set it as active, requiring manual context management

**Best practice:** Always use `startActiveSpan()` for automatic context propagation.
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
**What type of metric would you use to track "total orders processed" and why?**

<details>
<summary>Click to see answer</summary>

**Answer:** **Counter** - because it only goes up (accumulates over time) and resets when the application restarts.

```javascript
const ordersProcessed = meter.createCounter("orders_processed_total", {
  description: "Total number of orders processed"
});

// Usage
ordersProcessed.add(1); // Increment by 1
```

**Why not other types:**
- Gauge: For values that go up and down (like active connections)
- Histogram: For recording measurements you want percentiles for (like duration)
</details>

### Question 6
**How should you handle counting both successes and failures?**

<details>
<summary>Click to see answer</summary>

**Answer:** Count in both the success and failure paths to capture everything:

```javascript
try {
  // ... do work ...
  ordersTotal.add(1);     // Count all attempts
  ordersSuccess.add(1);   // Count successes
} catch (error) {
  ordersTotal.add(1);     // Count all attempts  
  ordersFailed.add(1);    // Count failures
  throw error;
}
```

**Math check:** `ordersSuccess + ordersFailed = ordersTotal`
</details>

---

## Section 4: Logs API

### Question 7
**What makes OpenTelemetry logs "structured" and why is this better than traditional logging?**

<details>
<summary>Click to see answer</summary>

**Answer:** Structured logs use machine-readable attributes instead of free-form text:

**Traditional (bad):**
```javascript
console.log('Payment failed for user user_123 with error insufficient funds');
```

**Structured (good):**
```javascript
logger.emit({
  severityText: 'ERROR',
  body: 'Payment processing failed',
  attributes: {
    'user.id': 'user_123',
    'error.message': 'insufficient funds'
  }
});
```

**Benefits:** Easy to search, filter, and correlate with traces automatically.
</details>

### Question 8
**How do logs automatically get correlated with traces?**

<details>
<summary>Click to see answer</summary>

**Answer:** When you emit a log inside an active span, OpenTelemetry automatically adds `traceId` and `spanId` to the log record.

```javascript
tracer.startActiveSpan("process_payment", span => {
  logger.emit({ body: "Payment started" });
  // This log automatically gets trace_id and span_id!
});
```

**Result:** You can click a failed trace → see all logs, or see an error log → jump to the exact trace.
</details>

---

## Section 5: Context Propagation

### Question 9
**In which scenarios does context propagation work automatically?**

<details>
<summary>Click to see answer</summary>

**Answer:** Context propagation works automatically for:
- Normal function calls
- async/await operations
- Express middleware (with auto-instrumentation)
- Most database calls
- Most HTTP requests

**Key insight:** Most of the time, you don't need to think about context propagation.
</details>

### Question 10
**Fix this broken context propagation:**

```javascript
tracer.startActiveSpan('parent', (span) => {
  setTimeout(() => {
    tracer.startActiveSpan('child', (childSpan) => {
      // This child won't be connected to parent!
      childSpan.end();
    });
  }, 1000);
  span.end();
});
```

<details>
<summary>Click to see answer</summary>

**Answer:**
```javascript
tracer.startActiveSpan('parent', (span) => {
  // 1. Capture the current context
  const currentContext = context.active();
  
  setTimeout(() => {
    // 2. Restore the context in the callback
    context.with(currentContext, () => {
      tracer.startActiveSpan('child', (childSpan) => {
        // Now this child IS connected to parent!
        childSpan.end();
      });
    });
  }, 1000);
  span.end();
});
```

**Pattern:** Capture with `context.active()`, restore with `context.with()`
</details>

---

## Section 6: SDK Pipelines

### Question 11
**What are the three main components of an SDK pipeline and what does each do?**

<details>
<summary>Click to see answer</summary>

**Answer:**
1. **Sampler** - "Should we keep this span?" (controls cost)
2. **Processor** - "How should we package spans?" (controls performance) 
3. **Exporter** - "Where should we send spans?" (controls destination)

**Pipeline flow:**
```
Your Code → Sampler → Processor → Exporter → Backend
```
</details>

### Question 12
**What's the difference between head-based and tail-based sampling?**

<details>
<summary>Click to see answer</summary>

**Answer:**
- **Head-based sampling** (SDK): Decision made **upfront** when the trace starts (`startActiveSpan()` time)
- **Tail-based sampling** (Collector): Decision made **after** the trace completes, based on trace content

**Week 2 focus:** We learned head-based sampling with `TraceIdRatioBasedSampler`

**Example:**
```javascript
// Head-based: Decision made immediately
const sampler = new TraceIdRatioBasedSampler(0.1); // 10% of traces
```
</details>

### Question 13
**When would you use SimpleSpanProcessor vs BatchSpanProcessor?**

<details>
<summary>Click to see answer</summary>

**Answer:**

**SimpleSpanProcessor:**
- ✅ Use for: Development, debugging, learning
- ✅ Benefit: Immediate export (see spans right away)
- ❌ Problem: Inefficient for high-traffic (too many network calls)

**BatchSpanProcessor:**
- ✅ Use for: Production applications
- ✅ Benefit: More efficient (fewer network calls)
- ❌ Trade-off: Slight delay before spans appear

**Rule of thumb:** Simple for debugging, Batch for production.
</details>

---

## Section 7: Practical Application

### Question 14
**You notice in Jaeger that some spans appear as separate traces instead of being connected. What's likely wrong and how do you fix it?**

<details>
<summary>Click to see answer</summary>

**Answer:** 

**Likely cause:** Broken context propagation, usually from:
- `setTimeout` or `setInterval` callbacks
- Event emitters
- Message queues

**How to fix:**
1. Identify where context breaks (look for async boundaries)
2. Capture context with `context.active()`
3. Restore context with `context.with()`

**Debug tip:** Look for callbacks and event handlers in your code.
</details>

### Question 15
**Your production service handles 10,000 requests per second. What sampling rate would you start with and why?**

<details>
<summary>Click to see answer</summary>

**Answer:** Start with **1-5%** sampling (`TraceIdRatioBasedSampler(0.01)` to `0.05`)

**Reasoning:**
- 10,000 RPS × 1% = 100 traces/second (manageable)
- 10,000 RPS × 100% = 10,000 traces/second (expensive!)
- You can always increase if you need more data
- 1% still gives you representative traces for debugging

**Best practice:** Start conservative, increase based on needs and budget.
</details>

---

## Section 8: Integration & Correlation

### Question 16
**How do traces, metrics, and logs work together to provide complete observability?**

<details>
<summary>Click to see answer</summary>

**Answer:** Each provides a different lens on the same events:

**Metrics** → **WHEN** and **HOW MUCH**
- "Payment failures spiked at 10:30 AM"
- "Error rate increased by 500%"

**Traces** → **WHERE** and **WHO** 
- "Failures are in the payment service"
- "User user_123's specific request failed"

**Logs** → **WHAT** and **WHY**
- "Payment declined: insufficient funds"
- "Database connection timeout after 30s"

**Workflow:** Metrics detect problems → Traces show where → Logs explain why
</details>

### Question 17
**Complete this observability pattern:**

```javascript
tracer.startActiveSpan('process_order', async (span) => {
  // Log: Order started
  
  try {
    await processOrder();
    
    // Count: Success
    // Log: Success
    
  } catch (error) {
    // Trace: Record error
    // Count: Failure  
    // Log: Failure details
  }
});
```

<details>
<summary>Click to see answer</summary>

**Answer:**
```javascript
tracer.startActiveSpan('process_order', async (span) => {
  // Log: Order started
  logger.emit({
    severityText: "INFO",
    body: "Order processing started",
    attributes: { "user.id": userId }
  });
  
  try {
    await processOrder();
    
    // Count: Success
    ordersSuccess.add(1);
    
    // Log: Success
    logger.emit({
      severityText: "INFO",
      body: "Order completed successfully"
    });
    
  } catch (error) {
    // Trace: Record error
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR });
    
    // Count: Failure
    ordersFailed.add(1);
    
    // Log: Failure details
    logger.emit({
      severityText: "ERROR",
      body: "Order processing failed",
      attributes: { "error.message": error.message }
    });
    
    throw error;
  }
});
```

**Key insight:** All three are automatically correlated via trace context!
</details>

---

## Scoring Your Knowledge

**Count your correct answers:**

- **15-17 correct:** 🏆 **Expert Level** - You've mastered Week 2 concepts! Ready for Week 3.
- **12-14 correct:** 🎯 **Proficient** - Strong understanding with minor gaps. Review missed topics.
- **9-11 correct:** 📚 **Developing** - Good foundation but review key concepts before Week 3.
- **6-8 correct:** 🔄 **Needs Review** - Revisit Week 2 materials, especially hands-on examples.
- **0-5 correct:** 📖 **Start Over** - Go back through Week 2 with the working examples.

---

## Areas to Review Based on Your Score

### **If you missed API/SDK questions (1-2):**
- Re-read [Day 8: API vs SDK](./day8.md)
- Practice the no-op mode example

### **If you missed Tracing questions (3-4):**
- Re-do [Day 9: Tracing API](./day9.md) hands-on example
- Practice the error handling pattern

### **If you missed Metrics questions (5-6):**
- Re-do [Day 10: Metrics API](./day10.md) hands-on example
- Practice creating and incrementing counters

### **If you missed Logs questions (7-8):**
- Re-do [Day 11: Logs API](./day11.md) hands-on example
- Practice structured logging with trace correlation

### **If you missed Context questions (9-10):**
- Re-do [Day 12: Context Propagation](./day12.md) examples
- Practice the `context.with()` fix pattern

### **If you missed SDK questions (11-13):**
- Re-read [Day 13: SDK Pipelines](./day13.md)
- Try the different instrumentation configurations

### **If you missed Integration questions (14-17):**
- Review how all three pillars work together
- Practice the complete observability pattern

---

## Next Steps

**If you scored well:** You're ready for Week 3! The OpenTelemetry Collector will build on these foundations.

**If you need review:** That's totally normal! OpenTelemetry has many concepts. Focus on the hands-on examples - they'll help solidify the theory.

**Remember:** The goal isn't perfection, it's understanding. You can always come back to these concepts as you use OpenTelemetry in real projects.

**See you in Week 3!** 