# Day 10 - Metrics API Example

This example demonstrates basic metrics using OpenTelemetry, building on the tracing example from Day 9.

## What this example shows

- **Simple counters** that track order processing
- **Basic metrics patterns** for beginners
- **Integration** of metrics with existing tracing code

## Metrics we track

1. `orders_processed_total` - Total orders (success + failed)
2. `orders_success_total` - Successful orders only
3. `orders_failed_total` - Failed orders only

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

4. **Send test requests:**
   ```bash
   # Send 10 requests (some will succeed, some will fail)
   for i in {1..10}; do
     curl -X POST http://localhost:3000/orders \
       -H "Content-Type: application/json" \
       -d '{"userId":"user'$i'","items":[{"sku":"WIDGET-'$i'","quantity":1}],"total":99,"paymentMethod":"credit_card"}'
     echo ""
     sleep 1
   done
   ```

5. **View traces in Jaeger:**
   - Open http://localhost:16686
   - Select "order-service" 
   - Click "Find Traces"

## What you'll see

- **Traces**: Individual request flows in Jaeger
- **Metrics**: Counters increment as orders are processed
- **Pattern**: ~80% success, ~20% failure (due to simulated payment failures)

## Key Learning Points

- Metrics show **patterns** across many requests
- Traces show **details** of individual requests  
- Simple counters are perfect for beginners
- Metrics and traces work together for complete observability

## Files

- `app.js` - Express app with tracing (Day 9) + metrics (Day 10)
- `instrumentation.js` - OpenTelemetry configuration for traces and metrics
- `package.json` - Dependencies

## Next Steps

This example prepares you for Day 11 where we'll add structured logging to complete the observability picture.