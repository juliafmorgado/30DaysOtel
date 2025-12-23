# Day 9: Tracing API Demo

A simple Express API demonstrating manual instrumentation with OpenTelemetry.

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

4. **Send a test request:**
   ```bash
   curl -X POST http://localhost:3000/orders \
     -H "Content-Type: application/json" \
     -d '{
       "userId": "user_123",
       "items": [{"sku": "WIDGET-1", "quantity": 2}],
       "total": 99.99,
       "paymentMethod": "credit_card",
       "address": {"country": "US"}
     }'
   ```

5. **View traces:** Open http://localhost:16686

## What You'll Learn

- Creating manual spans with `tracer.startActiveSpan()`
- Adding attributes with `span.setAttribute()`
- Recording events with `span.addEvent()`
- Handling errors with `span.recordException()`
- Viewing traces in Jaeger

See the full tutorial: [Day 9 - Tracing API](../../week2/day9.md)
