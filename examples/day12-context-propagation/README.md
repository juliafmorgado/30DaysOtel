# Day 12: Context Propagation Demo

An Express API demonstrating **Context Propagation** (how trace context flows through your application and when it breaks).

## What's different from Day 11?

- **Context propagation examples** (automatic vs broken vs manual)
- **Cross-service simulation** (how context flows between services)
- **Troubleshooting patterns** (fixing broken trace relationships)
- **All previous telemetry still works** (traces, metrics, logs from Days 9-11)

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start Jaeger (for traces):**
   ```bash
   docker run -d --name jaeger \
     -p 16686:16686 \
     -p 4317:4317 \
     -p 4318:4318 \
     jaegertracing/all-in-one:latest
   ```

3. **Run the app:**
   ```bash
   node --require ./instrumentation.js app.js
   ```

4. **Test different propagation scenarios:**
   ```bash
   # Automatic propagation (works perfectly)
   curl http://localhost:3000/automatic
   
   # Broken propagation (child span becomes orphaned)
   curl http://localhost:3000/broken
   
   # Manual propagation (fixes the broken case)
   curl http://localhost:3000/manual
   
   # Cross-service simulation (spans connected across services)
   curl http://localhost:3000/cross-service
   ```

5. **View results in Jaeger:**
   - **Traces:** http://localhost:16686 (Jaeger UI)
   - Look for service: `context-demo`
   - Compare the trace structures between different endpoints

## What You'll Learn

- When context propagation works automatically (async/await, sync calls)
- When context propagation breaks (setTimeout, callbacks, queues)
- How to fix broken propagation with `context.with()`
- How context flows between services via HTTP headers
- Debugging techniques for broken trace relationships

See the full tutorial: [Day 12 - Context Propagation](../../week2/day12.md)

## Key Context Propagation Patterns

### Automatic Propagation
```javascript
tracer.startActiveSpan('parent', async (span) => {
  await tracer.startActiveSpan('child', async (childSpan) => {
    // This works - child is properly nested under parent
    childSpan.end();
  });
  span.end();
});
```

### Broken Propagation
```javascript
tracer.startActiveSpan('parent', (span) => {
  setTimeout(() => {
    tracer.startActiveSpan('orphaned', (childSpan) => {
      // This breaks - orphaned starts a new trace!
      childSpan.end();
    });
  }, 100);
  span.end();
});
```

### Manual Propagation
```javascript
tracer.startActiveSpan('parent', (span) => {
  const currentContext = context.active(); // Capture context
  
  setTimeout(() => {
    context.with(currentContext, () => { // Restore context
      tracer.startActiveSpan('fixed', (childSpan) => {
        // This works - child is properly nested under parent
        childSpan.end();
      });
    });
  }, 100);
  span.end();
});
```

## Expected Results in Jaeger

### `/automatic` endpoint:
```
GET /automatic
└─ parent_operation
   └─ child_async
      └─ grandchild
```

### `/broken` endpoint:
```
GET /broken
└─ parent_operation

orphaned_child (separate trace!)
```

### `/manual` endpoint:
```
GET /manual
└─ parent_operation
   └─ fixed_child
```

### `/cross-service` endpoint:
```
GET /cross-service
└─ service_a_operation
   └─ service_b_operation
```

## When You Need Manual Context Propagation

- **Event emitters and callbacks**
- **setTimeout/setInterval**
- **Message queues (producer → consumer)**
- **Worker threads and child processes**
- **Custom async patterns**

## Troubleshooting

### "My spans aren't connected"
1. Check if you're using `startActiveSpan` (not `startSpan`)
2. Look for callbacks or setTimeout - use `context.with()`
3. Verify auto-instrumentation is enabled for HTTP calls

### "I see multiple traces instead of one"
- Context was lost somewhere
- Check for event emitters without bound context
- Look for setTimeout/setInterval without `context.with()`

### "Context works locally but not across services"
- Verify HTTP auto-instrumentation is enabled
- Check that headers aren't being stripped by proxies
- Ensure both services use compatible OpenTelemetry versions

## For Production

Consider using **Dash0** or another OpenTelemetry-native backend that can:
- Automatically correlate traces across services
- Provide built-in context propagation debugging
- Handle OTLP traces, metrics, and logs natively

This tutorial's OTLP export will work with any OTEL-compatible backend.