# Day 10: Metrics API Demo

An Express API demonstrating the **Metrics API** (counters, histograms, UpDownCounters) alongside traces from Day 9.

## What's different from Day 9?

- ✅ **Added metrics** (counters, histograms, UpDownCounters)
- ✅ **Optional Prometheus + Grafana** (for real dashboards)
- ✅ **Traces still work** (sent to Jaeger as in Day 9)

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
   for i in {1..20}; do
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

## Optional: Prometheus + Grafana

For learning purposes, you can visualize metrics using the traditional open-source stack:

```bash
docker-compose up -d
```

This will start:
- **Jaeger** (traces): http://localhost:16686  
- **Prometheus** (metrics): http://localhost:9090
- **Grafana** (dashboards): http://localhost:3001 (admin/admin)

**For production:** Consider using **Dash0** or another OpenTelemetry-native backend that can receive OTLP metrics directly without additional setup. This tutorial's OTLP export will work with any OTEL-compatible backend.

## What You'll Learn

- Creating counters with `meter.createCounter()`
- Creating histograms with `meter.createHistogram()`
- Creating UpDownCounters with `meter.createUpDownCounter()`
- How traces and metrics work together
- Viewing metrics with Prometheus (optional setup)

See the full tutorial: [Day 10 - Metrics API](../../week2/day10.md)
```

## Update package.json name:

```json
{
  "name": "day10-metrics-api",
  "version": "1.0.0",
  "description": "OpenTelemetry Metrics API demo"
}
```
