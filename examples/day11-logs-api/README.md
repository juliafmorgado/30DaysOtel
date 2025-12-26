# Day 11 - Logs API Example

This example demonstrates basic structured logging using OpenTelemetry, building on the tracing and metrics examples from Days 9 & 10.

## What this example shows

- **Simple structured logging** with automatic trace correlation
- **Basic logging patterns** for beginners
- **Integration** of logs with existing tracing and metrics code

## Logs we create

1. **Order started** - When processing begins (INFO level)
2. **Order completed** - When order succeeds (INFO level)
3. **Order failed** - When any step fails (ERROR level)

All logs automatically include `traceId` and `spanId` for correlation.

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
- **Metrics**: Counters increment as orders are processed (from Day 10)
- **Logs**: Structured log messages with automatic trace correlation (NEW!)

## Example Log Output

**Order Started:**
```json
{
  "severityText": "INFO",
  "body": "Order processing started",
  "traceId": "abc123...",
  "spanId": "def456...",
  "attributes": {
    "user.id": "user1",
    "order.item_count": 1
  }
}
```

**Order Failed:**
```json
{
  "severityText": "ERROR",
  "body": "Order processing failed",
  "traceId": "abc123...",
  "spanId": "def456...",
  "attributes": {
    "user.id": "user1",
    "error.message": "Payment declined: insufficient funds"
  }
}
```

## Key Learning Points

- **Structured logs** are machine-readable and searchable
- **Automatic correlation** links logs to traces via traceId/spanId
- **Severity levels** help categorize log importance (INFO vs ERROR)
- **Attributes** provide structured context for filtering and analysis
- **Complete observability** = traces + metrics + logs working together

## Files

- `app.js` - Express app with tracing (Day 9) + metrics (Day 10) + logs (Day 11)
- `instrumentation.js` - OpenTelemetry configuration for traces, metrics, and logs
- `package.json` - Dependencies

## Next Steps

This example prepares you for Day 12 where we'll learn about context propagation and how trace context flows through your application.