# Day 14 – Week 2 Recap: Mastering OpenTelemetry APIs & SDK

Congratulations! We've completed Week 2 of our OpenTelemetry journey. This week was all about **hands-on experience with the APIs**, so learning to create traces, metrics, and logs in our code, and understanding how the SDK processes them.

> **Knowledge Check:** Test your Week 2 knowledge with our [`week2-knowledge-check.md`](./week2-knowledge-check.md)
>
> **Next Week Preview** we will dive into the **OpenTelemetry Collector**, the powerful data processing pipeline that can transform, route, and enhance our telemetry data.

---

## What We Accomplished This Week

### **The Big Picture: API vs SDK**
- **API** = What we write in our code (stable, vendor-neutral)
- **SDK** = How telemetry gets processed and exported (configurable)
- **Separation** = Change backends without changing application code

### **The Three Pillars of Observability**
- **Traces** = Individual request journeys ("What happened to this order?")
- **Metrics** = Aggregate patterns ("How many orders are failing?")
- **Logs** = Detailed event information ("Why did this payment fail?")

### **Core Skills Developed**
- Creating manual spans with proper attributes and error handling
- Implementing basic counters to track success/failure patterns
- Adding structured logging with automatic trace correlation
- Understanding context propagation and when it breaks
- Configuring SDK pipelines with samplers, processors, and exporters

---

## Day-by-Day Recap

### **[Day 8: API vs SDK](./day8.md)**
**Key Learning:** The architecture that makes OpenTelemetry portable

**What we built:** Simple demo showing API/SDK separation
- API calls in application code
- SDK configuration in separate file
- No-op mode for testing

**Key insight:** Change observability backends without touching application code.

---

### **[Day 9: Tracing API](./day9.md)**
**Key Learning:** Creating spans to follow individual requests

**What we built:** Complete order processing API with manual instrumentation
- 5-step order flow (validate → inventory → shipping → payment → save)
- Proper span attributes and error handling
- Parent-child span relationships

**Key insight:** Traces tell the story of individual requests through your system.

---

### **[Day 10: Metrics API](./day10.md)**
**Key Learning:** Counting events to see aggregate patterns

**What we built:** Simple counters on top of Day 9's tracing
- `orders_processed_total` - All orders (success + failed)
- `orders_success_total` - Successful orders only
- `orders_failed_total` - Failed orders only

**Key insight:** Metrics show patterns across many requests, traces show individual request details.

---

### **[Day 11: Logs API](./day11.md)**
**Key Learning:** Structured logging with automatic trace correlation

**What we built:** Structured logs integrated with traces and metrics
- Order started, completed, and failed events
- Automatic trace_id and span_id correlation
- Structured attributes for filtering

**Key insight:** Logs provide detailed context, automatically linked to traces for complete debugging.

---

### **[Day 12: Context Propagation](./day12.md)**
**Key Learning:** How trace context flows through your application

**What we built:** Examples showing when context works and when it breaks
- Automatic propagation (async/await)
- Broken propagation (setTimeout)
- Manual fixes (context.with())

**Key insight:** Context propagation usually works automatically, but setTimeout and event emitters can break it.

---

### **[Day 13: SDK Pipelines](./day13.md)**
**Key Learning:** Samplers, processors, and exporters control telemetry flow

**What we built:** Different SDK configurations showing pipeline components
- Console exporter for learning
- Sampling for cost control
- Batch processing for efficiency

**Key insight:** SDK pipelines control cost (sampling), performance (processing), and destination (exporting).

---

## The Complete Observability Pattern

By the end of Week 2, you learned this powerful pattern:

```javascript
// Complete observability in action
tracer.startActiveSpan('process_order', async (span) => {
  // 1. STRUCTURED LOGGING: Record what's happening
  logger.emit({
    severityText: "INFO",
    body: "Order processing started",
    attributes: { "user.id": userId }
  });
  
  try {
    // ... business logic ...
    
    // 2. METRICS: Count successes
    ordersSuccess.add(1);
    
    // 3. LOGGING: Record success
    logger.emit({
      severityText: "INFO", 
      body: "Order completed",
      attributes: { "order.id": orderId }
    });
    
  } catch (error) {
    // 4. TRACING: Record error in span
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR });
    
    // 5. METRICS: Count failures
    ordersFailed.add(1);
    
    // 6. LOGGING: Record failure details
    logger.emit({
      severityText: "ERROR",
      body: "Order failed", 
      attributes: { "error.message": error.message }
    });
  }
  
  // All three are automatically correlated via trace context!
});
```

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
- Samplers for cost control (head-based sampling)
- Processors for performance (simple vs batch)
- Exporters for destinations (console, OTLP)
- Resource attributes for service identification

### **4. Production Readiness**
- Understanding when context propagation breaks
- Configuring appropriate sampling rates
- Using structured logging for searchability
- Setting up proper error handling

---

## Tools and Technologies Used

### **Core Libraries**
- `@opentelemetry/api` - Stable interfaces for creating telemetry
- `@opentelemetry/sdk-node` - Node.js SDK implementation
- `@opentelemetry/auto-instrumentations-node` - Automatic instrumentation

### **Exporters**
- `@opentelemetry/exporter-trace-otlp-http` - OTLP trace export
- `@opentelemetry/exporter-metrics-otlp-http` - OTLP metrics export
- `@opentelemetry/exporter-logs-otlp-http` - OTLP logs export

### **Observability Backends**
- **Jaeger** - Distributed tracing visualization
- **Console** - Terminal output for learning
- **OTLP Protocol** - Industry standard for telemetry export

---

## Common Patterns Learned

### **1. The Instrumentation Pattern**
```javascript
tracer.startActiveSpan('operation_name', async (span) => {
  span.setAttribute('key', 'value');
  
  try {
    await doWork();
    span.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR });
    throw error;
  } finally {
    span.end();
  }
});
```

### **2. The Counting Pattern**
```javascript
try {
  // ... do work ...
  successCounter.add(1);
} catch (error) {
  failureCounter.add(1);
  throw error;
}
```

### **3. The Context Fix Pattern**
```javascript
const currentContext = context.active();
setTimeout(() => {
  context.with(currentContext, () => {
    // Code here sees the captured context
  });
}, 1000);
```

---

## Troubleshooting Skills Developed

### **Broken Traces**
- **Symptom:** Multiple separate traces instead of one connected trace
- **Cause:** Context propagation broken (usually setTimeout or event emitters)
- **Fix:** Use `context.active()` and `context.with()`

### **Missing Telemetry**
- **Symptom:** No spans/metrics/logs appearing
- **Cause:** SDK not initialized or wrong exporter configuration
- **Fix:** Check instrumentation file and backend connectivity

### **Sampling Issues**
- **Symptom:** Some traces missing randomly
- **Cause:** Sampling rate too low
- **Fix:** Adjust `TraceIdRatioBasedSampler` ratio or use `AlwaysOnSampler` for debugging

---

## What's Next: Week 3 Preview

**Theme:** OpenTelemetry Collector Deep Dive

**You'll learn:**
- **Collector Architecture** - Receivers → Processors → Exporters
- **Advanced Processing** - Transformations, filtering, routing
- **Multi-Backend Strategies** - Send different data to different systems
- **Production Deployment** - Agent vs Gateway patterns
- **Scaling Patterns** - Load balancing and high availability

**Why this matters:** The Collector provides much more powerful data processing than the SDK alone, enabling complex routing, transformations, and multi-backend strategies.

---

## Reflection Questions

Before moving to Week 3, consider:

1. **Which observability pillar (traces, metrics, logs) do you find most useful for debugging?**
2. **What sampling rate would you use for a high-traffic production service?**
3. **When would you need manual context propagation in your applications?**
4. **How would you explain the API/SDK separation to a teammate?**
5. **What resource attributes would be most important for your services?**

---

## Resources for Continued Learning

### **Official Documentation**
- [OpenTelemetry Concepts](https://opentelemetry.io/docs/concepts/)
- [Node.js SDK Documentation](https://opentelemetry.io/docs/languages/js/)
- [Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/)

### **Community Resources**
- [OpenTelemetry Slack](https://cloud-native.slack.com/) (#opentelemetry channel)
- [CNCF OpenTelemetry SIG](https://github.com/open-telemetry/community)
- [OpenTelemetry Blog](https://opentelemetry.io/blog/)

### **Practice Projects**
- Add OpenTelemetry to your existing Node.js applications
- Experiment with different sampling rates and exporters
- Try correlating logs with traces in your debugging workflow

---

## Congratulations! 🎉

You've successfully completed Week 2 and now have hands-on experience with:
- ✅ Creating manual traces, metrics, and logs
- ✅ Understanding API/SDK separation
- ✅ Configuring basic SDK pipelines
- ✅ Debugging context propagation issues
- ✅ Setting up complete observability for applications

**You're ready for Week 3!** The OpenTelemetry Collector will take your observability skills to the next level with advanced data processing capabilities.

See you on Day 15! 🚀