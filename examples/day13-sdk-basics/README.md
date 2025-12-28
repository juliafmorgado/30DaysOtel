# Day 13 - SDK Basics Example

This example demonstrates basic OpenTelemetry SDK concepts for beginners: samplers, processors, and exporters.

## What this example shows

- **Console Exporter** - See spans printed directly to your terminal
- **Basic Sampling** - Control which spans get collected (50% vs 100%)
- **Different Processors** - Simple (immediate) vs Batch (efficient)
- **Multiple Exporters** - Console for learning, Jaeger for real backends

## SDK Pipeline Components

1. **Sampler** - "Should we keep this span?" (saves money and storage)
2. **Processor** - "How should we package spans?" (immediate vs batched)
3. **Exporter** - "Where should we send spans?" (console, Jaeger, etc.)

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Test Console Exporter (see spans in terminal):**
   ```bash
   # Run with console output
   node --require ./instrumentation-console.js app.js
   
   # In another terminal, test it
   curl http://localhost:3000/hello
   curl http://localhost:3000/multiple
   ```
   
   You'll see JSON spans printed directly to your terminal!

3. **Test Sampling (some spans dropped):**
   ```bash
   # Stop the previous app and run with 50% sampling
   node --require ./instrumentation-sampled.js app.js
   
   # Create multiple spans - only about half should appear
   curl http://localhost:3000/multiple
   curl http://localhost:3000/multiple
   curl http://localhost:3000/multiple
   ```
   
   Notice some spans don't appear - they were dropped by the sampler.

4. **Test Jaeger Export (real backend):**
   ```bash
   # Start Jaeger first
   docker run -d --name jaeger \
     -p 16686:16686 \
     -p 4318:4318 \
     jaegertracing/all-in-one:latest
   
   # Run app with Jaeger export
   node --require ./instrumentation-jaeger.js app.js
   
   # Create spans
   curl http://localhost:3000/multiple
   
   # Check Jaeger UI at http://localhost:16686
   ```

## What you'll learn

### Console vs Jaeger Export

**Console Exporter:**
- ✅ Great for learning - see exactly what's happening
- ✅ No external dependencies
- ❌ Not useful for real applications

**OTLP Exporter (to Jaeger):**
- ✅ Works with real observability backends
- ✅ Industry standard protocol
- ❌ Requires a backend to be running

### Simple vs Batch Processor

**SimpleSpanProcessor:**
- ✅ Immediate export - good for debugging
- ✅ Simple to understand
- ❌ Inefficient for high-traffic apps

**BatchSpanProcessor:**
- ✅ More efficient - fewer network calls
- ✅ Better for production
- ❌ Slight delay before spans appear

### Sampling Rates

**100% Sampling (ratio = 1.0):**
- ✅ Keep all traces - nothing is missed
- ❌ Expensive for high-traffic applications

**Partial Sampling (ratio = 0.5):**
- ✅ Much cheaper storage and processing
- ✅ Still get representative traces
- ❌ Might miss some important traces

## Example Span Output (Console)

When you run the console example, you'll see:

```json
{
  "traceId": "abc123def456...",
  "spanId": "789xyz...",
  "name": "hello_operation",
  "attributes": {
    "greeting": "hello world",
    "timestamp": "2024-01-13T10:30:00.000Z",
    "work": "completed"
  },
  "status": { "code": "UNSET" },
  "events": []
}
```

This is what a span looks like! The console exporter shows you the raw data.

## Files

- `app.js` - Simple Express app that creates spans
- `instrumentation-console.js` - Console exporter configuration
- `instrumentation-sampled.js` - 50% sampling configuration  
- `instrumentation-jaeger.js` - Jaeger export configuration
- `package.json` - Dependencies

## Key Learning Points

- **Exporters control destination** - console for learning, OTLP for production
- **Samplers control cost** - 100% for dev, lower % for production
- **Processors control efficiency** - simple for debugging, batch for production
- **SDK components are pluggable** - mix and match without changing app code

## Next Steps

This example teaches the basic SDK concepts. In Week 3, you'll learn about the OpenTelemetry Collector which provides much more powerful processing capabilities!