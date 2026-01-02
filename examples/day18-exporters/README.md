# Day 18 - Exporters Examples

This directory contains example configurations for different OpenTelemetry Collector exporters and multi-backend strategies.

## Files

- `multi-backend.yaml` - Send data to multiple backends simultaneously
- `environment-routing.yaml` - Route data based on environment
- `data-tiering.yaml` - Send different data to different backends based on importance

## Understanding Exporters

Exporters send processed telemetry data to observability backends:

```
Receivers → Processors → Exporters
                           ↓
                    Multiple Backends
```

## Running the Examples

### Prerequisites

1. **Install OpenTelemetry Collector:**
   ```bash
   curl -L -o otelcol https://github.com/open-telemetry/opentelemetry-collector-releases/releases/latest/download/otelcol_linux_amd64
   chmod +x otelcol
   ```

2. **Set environment variables:**
   ```bash
   export DASH0_TOKEN="your-dash0-token"
   export JAEGER_ENDPOINT="localhost:14250"
   ```

### Running the Multi-Backend Example

```bash
./otelcol --config=multi-backend.yaml
```

This configuration:
- Sends traces to Dash0, Jaeger, and local file backup
- Sends metrics to Dash0 and Prometheus endpoint
- Sends logs only to Dash0

### Testing the Configuration

**Send test data:**
```bash
# Send a test trace
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

**Check Prometheus metrics:**
```bash
curl http://localhost:8889/metrics
```

## Key Concepts Demonstrated

### 1. Multi-Backend Export
Send the same data to multiple backends:
```yaml
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [backend1, backend2, backend3]  # Multiple exporters
```

### 2. Signal Separation
Send different signal types to specialized backends:
- Traces → Jaeger (specialized for tracing)
- Metrics → Prometheus (specialized for metrics)
- Logs → Loki (specialized for logs)
- Everything → Unified platform (Dash0)

### 3. Reliability Features
- Retry on failure
- Compression for bandwidth efficiency
- Timeouts for reliability
- Queue management for high throughput

## Monitoring Exporter Health

Enable Collector metrics to monitor exporter performance:
```yaml
service:
  telemetry:
    metrics:
      address: 0.0.0.0:8888
```

Then check exporter metrics:
```bash
curl http://localhost:8888/metrics | grep exporter
```

Key metrics to watch:
- `otelcol_exporter_sent_spans_total` - Successfully sent spans
- `otelcol_exporter_send_failed_spans_total` - Failed exports
- `otelcol_exporter_queue_size` - Queue backlog

## Troubleshooting

**Exporter failures:**
- Check network connectivity to backend endpoints
- Verify authentication tokens and headers
- Check TLS configuration for HTTPS endpoints

**High memory usage:**
- Reduce batch sizes
- Enable compression
- Check retry configuration

**Slow exports:**
- Increase timeout values
- Enable compression
- Use multiple consumers in sending queue

## Security Best Practices

1. **Use environment variables for secrets:**
   ```yaml
   headers:
     authorization: "Bearer ${env:API_TOKEN}"
   ```

2. **Enable TLS for production:**
   ```yaml
   tls:
     cert_file: /path/to/cert.pem
     key_file: /path/to/key.pem
   ```

3. **Validate backend certificates:**
   ```yaml
   tls:
     insecure: false  # Verify certificates
   ```

## Next Steps

After trying these examples:
1. Configure exporters for your actual backends
2. Experiment with different multi-backend strategies
3. Set up monitoring for exporter health
4. Move on to Day 19 to learn about OTTL transformations!