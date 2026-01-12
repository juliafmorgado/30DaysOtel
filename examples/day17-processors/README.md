# Day 17 - Processors Examples

This directory contains example configurations for different OpenTelemetry Collector processors.

> **Important Note**: These examples include batch processor configurations for educational purposes. However, OpenTelemetry is moving batching functionality to exporters for better reliability ([GitHub issue #8122](https://github.com/open-telemetry/opentelemetry-collector/issues/8122), [#13582](https://github.com/open-telemetry/opentelemetry-collector/issues/13582)). In production, prefer exporters with built-in batching and persistent storage.

## Files

- `basic-processors.yaml` - Essential processors every deployment needs
- `cost-optimization.yaml` - Filtering and sampling to reduce costs
- `business-context.yaml` - Adding business logic and context to telemetry

## Understanding Processors

Processors transform telemetry data as it flows through the Collector pipeline:

```
Receivers → Processors → Exporters
              ↓
        Transform, filter, enhance
```

## Running the Examples

### Prerequisites

1. **Install OpenTelemetry Collector:**
   ```bash
   curl -L -o otelcol https://github.com/open-telemetry/opentelemetry-collector-releases/releases/latest/download/otelcol_linux_amd64
   chmod +x otelcol
   ```

### Running Each Example

**1. Basic Processors:**
```bash
./otelcol --config=basic-processors.yaml
```

This demonstrates:
- Batch processor for efficient export (not being recommended anymore)
- Attributes processor for adding context
- Filter processor for removing noise

**2. Cost Optimization:**
```bash
./otelcol --config=cost-optimization.yaml
```

This shows how to:
- Filter out expensive noise (health checks, debug logs)
- Sample high-volume endpoints
- Use efficient batching

**3. Business Context:**
```bash
./otelcol --config=business-context.yaml
```

This demonstrates:
- Adding business metadata
- Transforming technical data into business metrics
- Service categorization and ownership

## Testing the Processors

### Send Test Data

You can test these configurations by sending sample telemetry data:

**Using curl (for HTTP):**
```bash
# Send a test trace
curl -X POST http://localhost:4318/v1/traces \
  -H "Content-Type: application/json" \
  -d '{
    "resourceSpans": [{
      "resource": {
        "attributes": [{
          "key": "service.name",
          "value": {"stringValue": "payment-service"}
        }]
      },
      "scopeSpans": [{
        "spans": [{
          "traceId": "12345678901234567890123456789012",
          "spanId": "1234567890123456",
          "name": "GET /health",
          "startTimeUnixNano": "1642680000000000000",
          "endTimeUnixNano": "1642680001000000000",
          "attributes": [{
            "key": "http.response.status_code",
            "value": {"intValue": "200"}
          }]
        }]
      }]
    }]
  }'
```

### What You'll See

When running these examples, you'll see different outputs based on the processors:

**Basic Processors Output:**
```
2024-01-17T10:30:45.123Z info Span: GET /health
2024-01-17T10:30:45.124Z info   environment: production
2024-01-17T10:30:45.125Z info   team: platform
```

**Cost Optimization Output:**
```
2024-01-17T10:30:45.123Z info Filtered out health check span
2024-01-17T10:30:45.124Z info Keeping 1 out of 10 search requests
```

**Business Context Output:**
```
2024-01-17T10:30:45.123Z info Span: payment_processing
2024-01-17T10:30:45.124Z info   business.critical: true
2024-01-17T10:30:45.125Z info   team.oncall: platform-team
2024-01-17T10:30:45.126Z info   business.impact: high
```

## Key Concepts Demonstrated

### 1. Processor Ordering
Processors run in the order listed. The examples show optimal ordering:
1. Resource processors (add service context)
2. Filter processors (remove unwanted data early)
3. Attributes/Transform processors (add context to remaining data)
4. Batch processors (group for efficient export)

### 2. Conditional Processing
Many processors support conditions:
```yaml
include:
  match_type: strict
  services: ["payment-service"]
```

### 3. Performance Optimization
- Filter early to reduce processing load
- Batch efficiently to reduce network calls
- Use appropriate timeouts and batch sizes

## Troubleshooting

**No data appearing:**
- Check processor conditions (include/exclude filters)
- Verify attribute names and values match your data
- Use logging exporter to see what's being processed

**High memory usage:**
- Reduce batch sizes
- Add more aggressive filtering
- Check for processor loops or inefficient transforms

**Slow processing:**
- Move filter processors earlier in the pipeline
- Reduce complex transform operations
- Optimize batch settings

## Next Steps

After trying these examples:
1. Modify the processors to match your business logic
2. Experiment with different filter conditions
3. Try combining processors in different orders
4. Move on to Day 18 to learn about exporters!

## Advanced Tips

### Debugging Processors
Add a logging exporter to see what each processor does:
```yaml
exporters:
  logging/debug:
    loglevel: debug

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [your-processors]
      exporters: [logging/debug, your-real-exporter]
```

### Performance Monitoring
Enable Collector metrics to monitor processor performance:
```yaml
service:
  telemetry:
    metrics:
      address: 0.0.0.0:8888
```

Then check: `curl http://localhost:8888/metrics | grep processor`