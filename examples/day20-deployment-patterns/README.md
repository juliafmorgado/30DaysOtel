# Day 20: Modern Deployment & Scaling Examples

This directory contains examples for deploying OpenTelemetry Collectors using modern exporter-side batching for better reliability.

> **Modern Approach**: These examples use exporter-side batching with persistent storage instead of batch processors, following OpenTelemetry's current best practices ([GitHub issue #8122](https://github.com/open-telemetry/opentelemetry-collector/issues/8122)).

## Files Overview

- `agent-config.yaml` - Simple agent configuration
- `gateway-config.yaml` - Basic gateway configuration  
- `docker-compose-agent.yml` - Agent pattern with Docker Compose
- `docker-compose-gateway.yml` - Gateway pattern with Docker Compose
- `docker-compose-scaling.yml` - Basic scaling with resource limits

## Agent Pattern Example

**When to use:** Single application, simple setup, getting started

### Running the Agent Pattern

```bash
# 1. Start the agent setup
docker-compose -f docker-compose-agent.yml up

# 2. Your app sends traces to the collector
# 3. Collector forwards traces to Jaeger
# 4. View traces at http://localhost:16686
```

**What happens:**
```
Your App → Collector (same host) → Jaeger
```

**Benefits:**
- Simple setup
- Fast (no network delays)
- Easy to debug

## Gateway Pattern Example

**When to use:** Multiple applications, centralized control

### Running the Gateway Pattern

```bash
# 1. Start the gateway setup
docker-compose -f docker-compose-gateway.yml up

# 2. Multiple apps send traces to the same collector
# 3. Gateway collector processes all data
# 4. View traces at http://localhost:16686
```

**What happens:**
```
App 1 ──┐
        ├──→ Gateway Collector → Jaeger
App 2 ──┘
```

**Benefits:**
- Centralized configuration
- Advanced processing
- Multiple apps, one collector

## Basic Scaling Example

**When to use:** Need to control resource usage

### Running with Resource Limits

```bash
# 1. Start with resource limits
docker-compose -f docker-compose-scaling.yml up

# 2. Monitor resource usage
docker stats

# 3. Check collector metrics
curl http://localhost:8888/metrics
```

**What this prevents:**
- Collector using too much memory
- CPU spikes crashing your system
- Resource starvation of other apps

## Configuration Files

### Agent Config (Modern Approach)
```yaml
# agent-config.yaml - Modern exporter with built-in batching
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318

processors: []  # No batch processor needed

exporters:
  otlp:
    endpoint: http://jaeger:4317
    # Built-in batching and reliability
    sending_queue:
      enabled: true
      queue_size: 512
      persistent_storage_enabled: true  # Survives crashes
    retry_on_failure:
      enabled: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: []  # Clean and simple
      exporters: [otlp]
```

### Gateway Config (Advanced with Reliability)
```yaml
# gateway-config.yaml - Advanced processing with modern exporters
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318

processors:
  attributes:
    actions:
      - key: deployment.environment
        value: production
        action: insert

exporters:
  otlp:
    endpoint: http://jaeger:4317
    sending_queue:
      enabled: true
      queue_size: 2048
      persistent_storage_enabled: true
    retry_on_failure:
      enabled: true
      max_elapsed_time: 300s

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [attributes]  # No batch processor
      exporters: [otlp]
```

## Key Benefits of Modern Approach

**Data Safety:**
- **Persistent storage** survives Collector crashes
- **100% data recovery** after restarts  
- **No data loss** during network issues

**Simplified Configuration:**
- **No batch processor needed** - exporters handle everything
- **Built-in retry logic** and queue management
- **Better performance** with same functionality

**Production Ready:**
- **Intelligent backpressure** handling
- **Configurable retry policies**
- **Memory-efficient** persistent queues

## Testing Your Setup

### Send Test Data

```bash
# Send a simple test trace
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

### Check Results

1. **Jaeger UI:** http://localhost:16686 (view traces)
2. **Collector metrics:** http://localhost:8888/metrics (health check)
3. **Docker logs:** `docker-compose logs collector` (debug issues)

## Common Issues & Solutions

**"Connection refused" errors:**
- Make sure all services are running: `docker-compose ps`
- Check if ports are available: `netstat -tulpn | grep 4318`

**"No traces appearing":**
- Check collector logs: `docker-compose logs collector`
- Verify your app is sending to the right endpoint
- Test with the curl command above

**"High memory usage":**
- Use the scaling example with resource limits
- Check collector metrics for queue sizes
- Reduce batch sizes in configuration

## Next Steps

After trying these examples:
1. **Modify configurations** to match your needs
2. **Try different backends** (replace Jaeger with others)
3. **Add more processing** (filters, transformations)
4. **Scale up** when you need more capacity

## Quick Decision Guide

**Choose Agent Pattern when:**
- You have one application
- You want the simplest setup
- Low latency is important

**Choose Gateway Pattern when:**
- You have multiple applications  
- You want centralized control
- You need advanced processing

**Add Resource Limits when:**
- Running in production
- Sharing servers with other apps
- Want to prevent resource issues