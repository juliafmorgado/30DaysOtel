# Day 18 - Exporters Examples

This directory contains beginner-friendly examples for configuring OpenTelemetry Collector exporters.

## Files

- `basic-jaeger.yaml` - Send traces to Jaeger
- `basic-prometheus.yaml` - Send metrics to Prometheus
- `basic-loki.yaml` - Send logs to Loki
- `simple-multi.yaml` - Send each telemetry type to its specialized backend
- `debug-exporters.yaml` - Use logging exporter to debug what's being sent

## Understanding Exporters

Exporters are the final step in the Collector pipeline - they send your processed telemetry data to observability backends:

```
Your App → Collector → Exporter → Backend (Jaeger, Prometheus, etc.)
```

**Key concept:** Different backends expect different formats, so you need the right exporter for each backend type.

## Running the Examples

### Prerequisites

1. **Install OpenTelemetry Collector:**
   ```bash
   curl -L -o otelcol https://github.com/open-telemetry/opentelemetry-collector-releases/releases/latest/download/otelcol_linux_amd64
   chmod +x otelcol
   ```

2. **Start backends (using Docker):**
   ```bash
   # Start Jaeger
   docker run -d --name jaeger \
     -p 16686:16686 -p 14250:14250 \
     jaegertracing/all-in-one:latest
   
   # Start Prometheus
   docker run -d --name prometheus \
     -p 9090:9090 \
     prom/prometheus:latest
   ```

### Example 1: Basic Jaeger (Traces)

```bash
./otelcol --config=basic-jaeger.yaml
```

**What this does:**
- Receives traces from your apps on port 4318
- Sends traces to Jaeger
- View traces at http://localhost:16686

### Example 2: Basic Prometheus (Metrics)

```bash
./otelcol --config=basic-prometheus.yaml
```

**What this does:**
- Receives metrics from your apps
- Exposes metrics for Prometheus to scrape on port 8889
- Configure Prometheus to scrape http://localhost:8889/metrics

### Example 3: Debug What's Being Sent

```bash
./otelcol --config=debug-exporters.yaml
```

**What this does:**
- Shows you exactly what data is being exported
- Prints telemetry to console AND sends to Jaeger
- Great for troubleshooting!

### Testing Your Setup

**Send test traces:**
```bash
curl -X POST http://localhost:4318/v1/traces \
  -H "Content-Type: application/json" \
  -d '{
    "resourceSpans": [{
      "resource": {
        "attributes": [{
          "key": "service.name",
          "value": {"stringValue": "test-service"}
        }]
      },
      "scopeSpans": [{
        "spans": [{
          "traceId": "12345678901234567890123456789012",
          "spanId": "1234567890123456",
          "name": "test-span",
          "startTimeUnixNano": "1642680000000000000",
          "endTimeUnixNano": "1642680001000000000"
        }]
      }]
    }]
  }'
```

**Check results:**
- **Jaeger:** Visit http://localhost:16686 to see traces
- **Prometheus:** Visit http://localhost:8889/metrics to see metrics
- **Console:** Check terminal output for debug logs

## Key Concepts Demonstrated

### 1. Different Exporters for Different Backends
Each backend expects a specific format:
- **Jaeger exporter** → Converts OpenTelemetry traces to Jaeger format
- **Prometheus exporter** → Exposes metrics in Prometheus format
- **OTLP exporter** → Sends data in OpenTelemetry's native format

### 2. Basic Configuration
Simple exporter setup with essential settings:
```yaml
exporters:
  jaeger:
    endpoint: jaeger:14250    # Where to send data
    tls:
      insecure: true          # No encryption (dev only)
```

### 3. Debugging with Logging Exporter
See exactly what's being exported:
```yaml
exporters:
  logging:
    loglevel: debug           # Print detailed info
  jaeger:
    endpoint: jaeger:14250

service:
  pipelines:
    traces:
      exporters: [logging, jaeger]  # Send to both
```

## Common Issues and Solutions

**"Connection refused" errors:**
- Make sure your backend (Jaeger, Prometheus) is running
- Check the endpoint URL and port number
- Verify firewall settings

**"No data appearing" in backend:**
- Use the debug configuration to see if data is being sent
- Check that your app is sending data to the Collector
- Verify the exporter configuration matches your backend setup

**"TLS errors" in production:**
- Set `insecure: false` for production
- Add proper certificate configuration
- Use HTTPS endpoints for cloud backends

## Next Steps

After trying these examples:
1. Configure exporters for your actual backends
2. Try the simple-multi.yaml to send different telemetry types to specialized backends
3. Use debug-exporters.yaml whenever you need to troubleshoot
4. Move on to Day 19 to learn about OTTL transformations!