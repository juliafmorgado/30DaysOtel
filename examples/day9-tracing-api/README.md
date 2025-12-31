# Day 9: Tracing API Demo

A simple Express greeting API demonstrating manual instrumentation with OpenTelemetry.

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start Jaeger:**
   ```bash
   docker run -d --name jaeger \
     -p 16686:16686 \
     -p 4318:4318 \
     jaegertracing/all-in-one:latest
   ```

3. **Run the app:**
   ```bash
   node --require ./instrumentation.js app.js
   ```

4. **Send test requests:**
   ```bash
   # Basic greeting
   curl http://localhost:3000/hello/Alice
   
   # Try different names
   curl http://localhost:3000/hello/Bob
   curl http://localhost:3000/hello/Charlie
   
   # Health check (no manual spans)
   curl http://localhost:3000/health
   ```

5. **View traces:** Open http://localhost:16686

## What You'll Learn

- Creating manual spans with `tracer.startActiveSpan()`
- Adding attributes with `span.setAttribute()`
- Recording events with `span.addEvent()`
- Creating nested spans for parent-child relationships
- Viewing traces in Jaeger

## Expected Response

```json
{
  "message": "Hello, Alice! Welcome to OpenTelemetry tracing.",
  "timestamp": "2024-01-09T10:30:00.000Z"
}
```

See the full tutorial: [Day 9 - Tracing API](../../week2/day9.md)
