# Day 10 - Metrics API Example

This example demonstrates basic metrics using OpenTelemetry, building on the greeting service from Day 9.

## What this example shows

- **Simple counters** that track greeting requests
- **Basic metrics patterns** for beginners
- **Integration** of metrics with existing tracing code
- **Labels/dimensions** to slice and dice data

## Metrics we track

1. `greetings_sent_total` - Total greetings sent
2. `requests_received_total` - Total requests received
3. `popular_names_total` - Count of each name requested (with labels)

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
   # Send greetings to different names
   curl http://localhost:3000/hello/Alice
   curl http://localhost:3000/hello/Bob
   curl http://localhost:3000/hello/Alice
   curl http://localhost:3000/hello/Charlie
   curl http://localhost:3000/hello/Alice
   
   # Generate more data
   for i in {1..10}; do
     curl http://localhost:3000/hello/User$i
   done
   ```

5. **View traces in Jaeger:**
   - Open http://localhost:16686
   - Select "greeting-service" 
   - Click "Find Traces"

6. **View metrics in console:**
   - Metrics are exported every 30 seconds
   - Check the console output for metric data

## What you'll see

- **Traces**: Individual greeting flows in Jaeger (from Day 9)
- **Metrics**: Counters showing total greetings, popular names, etc.
- **Labels**: `popular_names_total{name="Alice"} = 3` shows Alice was requested 3 times

## Expected Metrics Output

```json
{
  "greetings_sent_total": 15,
  "requests_received_total": 15,
  "popular_names_total": [
    {"name": "Alice", "value": 3},
    {"name": "Bob", "value": 1},
    {"name": "Charlie", "value": 1},
    {"name": "User1", "value": 1}
  ]
}
```

## Key Learning Points

- Metrics show **patterns** across many requests
- Traces show **details** of individual requests  
- Simple counters are perfect for beginners
- Labels add dimensions to slice data by name, type, etc.
- Metrics and traces work together for complete observability

## Files

- `app.js` - Express greeting app with tracing (Day 9) + metrics (Day 10)
- `instrumentation.js` - OpenTelemetry configuration for traces and metrics
- `package.json` - Dependencies

## Next Steps

This example prepares you for Day 11 where we'll add structured logging.