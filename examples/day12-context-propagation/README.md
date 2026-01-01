# Day 12 - Context Propagation Example

This example demonstrates basic context propagation concepts using OpenTelemetry, showing when it works automatically and when it needs manual help.

## What this example shows

- **Automatic context propagation** (the normal, happy case)
- **Broken context propagation** (when setTimeout breaks the connection)

## Context propagation scenarios

1. **Automatic** - async/await preserves context (works great)
2. **Broken** - setTimeout loses context (creates separate traces)

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start Jaeger (for traces):**
   ```bash
   docker run -d --name jaeger \
     -p 16686:16686 \
     -p 4318:4318 \
     jaegertracing/all-in-one:latest
   ```

3. **Run the application:**
   ```bash
   node --require ./instrumentation.js app.js
   ```

4. **Test each scenario:**
   ```bash
   # Test automatic propagation (should work perfectly)
   curl http://localhost:3000/automatic
   
   # Test broken propagation (child span will be orphaned)
   curl http://localhost:3000/broken
   ```

5. **View traces in Jaeger:**
   - Open http://localhost:16686
   - Select "context-demo" 
   - Click "Find Traces"

## What you'll see in Jaeger

### Automatic Propagation ✅
```
GET /automatic
└─ parent_operation
   └─ child_operation
      └─ grandchild_operation
```
Perfect family tree - context flows automatically.

### Broken Propagation ❌
```
GET /broken
└─ parent_operation

orphaned_child (separate trace!)
```
The child span starts a new trace because context was lost.


## Key Learning Points

- **Context propagation usually works automatically** for normal async/await code
- **setTimeout and setInterval can break context** propagation
- **The fix is simple**: capture context with `context.active()` and restore with `context.with()`
- **Most beginners don't need to worry** about this until they see broken traces
- **Visual debugging**: Jaeger makes it easy to spot broken context propagation

## The Simple Fix Pattern

```javascript
// 1. Capture current context
const currentContext = context.active();

// 2. Later, in a callback, restore it
setTimeout(() => {
  context.with(currentContext, () => {
    // Code here sees the captured context
    tracer.startActiveSpan('child', (span) => {
      // This span will be properly connected
      span.end();
    });
  });
}, 1000);
```

## Files

- `app.js` - Three simple examples showing context propagation scenarios
- `instrumentation.js` - Basic OpenTelemetry configuration (traces only)
- `package.json` - Dependencies

## Next Steps

This example prepares you for Day 13 where we'll learn about basic SDK concepts like samplers, processors, and exporters.