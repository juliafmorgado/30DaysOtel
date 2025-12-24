# Day 11: Logs API Demo

An Express API demonstrating the **Logs API** (structured logging with trace correlation) alongside traces and metrics from previous days.

## What's different from Day 10?

- **Added structured logging** (with trace correlation)
- **Log-trace correlation** (logs include trace and span IDs automatically)
- **Structured log attributes** (key-value pairs instead of plain text)
- **Traces and metrics still work** (from Days 9 & 10)

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

4. **Send test requests:**
   ```bash
   for i in {1..10}; do
     curl -X POST http://localhost:3000/orders \
       -H "Content-Type: application/json" \
       -d '{
         "userId": "user_'$i'",
         "items": [{"sku": "WIDGET-1", "quantity": 2}],
         "total": '$((50 + RANDOM % 150))',
         "paymentMethod": "credit_card"
       }'
     echo ""
     sleep 0.5
   done
   ```

5. **View results:**
   - **Traces:** http://localhost:16686 (Jaeger UI)
   - **Metrics:** Use the optional Prometheus + Grafana setup below
   - **Logs:** Check your console (structured logs with trace correlation)

## Optional: Prometheus + Grafana

For learning purposes, you can visualize metrics using the traditional open-source stack:

```bash
docker-compose up -d
```

This will start:
- **Jaeger** (traces): http://localhost:16686  
- **Prometheus** (metrics): http://localhost:9090
- **Grafana** (dashboards): http://localhost:3001 (admin/admin)

**For production:** Consider using **Dash0** or another OpenTelemetry-native backend that can receive OTLP logs, metrics, and traces directly without additional setup. This tutorial's OTLP export will work with any OTEL-compatible backend.

## What You'll Learn

- Creating structured logs with `logger.emit()`
- Correlating logs with traces (automatic trace and span IDs)
- Adding structured attributes to logs (key-value pairs)
- How logs, traces, and metrics work together
- Viewing correlated logs and traces in observability backends

See the full tutorial: [Day 11 - Logs API](../../week2/day11.md)

## Key Logging Concepts

### Structured Logging
Instead of plain text logs:
```
"Order processing started for user_123"
```

Use structured logs with attributes:
```javascript
logger.emit({
  severityText: "INFO",
  body: "Order processing started",
  attributes: {
    "user.id": "user_123",
    "order.item_count": 2,
    "order.subtotal": 99.99
  }
});
```

### Automatic Trace Correlation
When you emit logs inside a span, OpenTelemetry automatically adds:
- `trace_id` - Links to the trace
- `span_id` - Links to the specific span
- This lets you jump from logs to traces and vice versa

### Log Levels
Use appropriate severity levels:
- `INFO` - Normal operations
- `WARN` - Something unusual but not an error
- `ERROR` - Actual errors and failures
- `DEBUG` - Detailed debugging information

## Update package.json name:

```json
{
  "name": "day11-logs-api",
  "version": "1.0.0",
  "description": "OpenTelemetry Logs API demo"
}
```