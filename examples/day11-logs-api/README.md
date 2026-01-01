# Day 11 - Logs API Example

This example demonstrates basic structured logging using OpenTelemetry, building on the greeting service from Days 9 & 10.

## What this example shows

- **Simple structured logging** with automatic trace correlation
- **Basic logging patterns** for beginners
- **Integration** of logs with existing tracing and metrics code
- **Error logging** with simple validation

## Logs we create

1. **Greeting started** - When processing begins (INFO level)
2. **Greeting completed** - When greeting succeeds (INFO level)
3. **Greeting failed** - When validation fails (ERROR level)

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
   # Send successful greetings
   curl http://localhost:3000/hello/Alice
   curl http://localhost:3000/hello/Bob
   curl http://localhost:3000/hello/Charlie

   # Send a greeting that will fail (name too long)
   curl http://localhost:3000/hello/ThisNameIsWayTooLongAndWillCauseAnErrorBecauseItExceedsFiftyCharacters

   # Send more successful greetings
   curl http://localhost:3000/hello/Alice
   curl http://localhost:3000/hello/David

   # Generate more data
   for i in {1..5}; do
     curl http://localhost:3000/hello/User$i
   done
   ```

5. **View traces in Jaeger:**
   - Open http://localhost:16686
   - Select "greeting-service" 
   - Click "Find Traces"

6. **View metrics in console:**
   - Metrics are exported every 10 seconds to your terminal
   - Look for `greetings_sent_total`, `requests_received_total`, `popular_names_total`, and `greeting_errors_total`

## What you'll see

- **Traces**: Individual greeting flows in Jaeger (from Day 9)
- **Metrics**: Counters in your terminal showing greetings, popular names, errors (from Day 10)
- **Logs**: Structured log messages with automatic trace correlation (NEW!)

## Example Log Output

**Greeting Started:**
```json
{
  "severityText": "INFO",
  "body": "Greeting processing started",
  "traceId": "abc123...",
  "spanId": "def456...",
  "attributes": {
    "user.name": "Alice",
    "greeting.type": "personal"
  }
}
```

**Greeting Completed:**
```json
{
  "severityText": "INFO",
  "body": "Greeting processing completed successfully",
  "traceId": "abc123...",
  "spanId": "def456...",
  "attributes": {
    "user.name": "Alice",
    "message.length": 67,
    "processing.duration_ms": 100
  }
}
```

**Greeting Failed:**
```json
{
  "severityText": "ERROR",
  "body": "Greeting processing failed",
  "traceId": "abc123...",
  "spanId": "def456...",
  "attributes": {
    "user.name": "ThisNameIsWayTooLong...",
    "error.message": "name too long",
    "name.length": 85
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

- `app.js` - Express greeting app with tracing (Day 9) + metrics (Day 10) + logs (Day 11)
- `instrumentation.js` - OpenTelemetry configuration for traces, metrics, and logs
- `package.json` - Dependencies

## Next Steps

This example prepares you for Day 12 where we'll learn about context propagation and how trace context flows through your application.