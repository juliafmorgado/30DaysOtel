# Day 23 – Where the Heck is My Data? Troubleshooting Missing Telemetry

You've configured your OpenTelemetry setup. You've added instrumentation. You've set up the collector. But when you check your observability backend... **nothing**. No traces, no metrics, no logs.

**Today's question is:** When telemetry data goes missing, how do you systematically debug the pipeline to find where it's getting lost?

This is one of the most common frustrations when getting started with OpenTelemetry. The good news: there's a methodical approach to finding and fixing these issues.

## The telemetry pipeline: where data can disappear

Understanding where data can get lost helps you debug systematically:

```
Application → SDK → Collector → Backend
     ↓         ↓        ↓         ↓
   [Issue 1] [Issue 2] [Issue 3] [Issue 4]
```

**Issue 1:** Application not generating data  
**Issue 2:** SDK not exporting data  
**Issue 3:** Collector not receiving/processing data  
**Issue 4:** Backend not receiving/storing data  

Let's debug each step systematically.

## Step 1: Is your application generating telemetry?

### Check if instrumentation is loaded

**Problem:** Instrumentation not loaded or configured incorrectly.

**Debug commands:**
```bash
# Enable OpenTelemetry debug logging
export OTEL_LOG_LEVEL=debug

# For Node.js, also enable instrumentation debugging
export OTEL_INSTRUMENTATION_DEBUG=true

# Run your application
node app.js
```

**What to look for:**
```
Good: @opentelemetry/instrumentation-http Applying instrumentation patch for module http
Good: @opentelemetry/instrumentation-express Applying instrumentation patch for module express

Bad: No instrumentation messages
Bad: "Module not found" errors
```

### Verify spans are being created

**Add temporary logging to see raw spans:**

```javascript
// In your instrumentation setup
const { SimpleSpanProcessor, ConsoleSpanExporter } = require('@opentelemetry/sdk-trace-base');

// Add console exporter temporarily for debugging
sdk.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
```

**Make a test request and check console output:**
```bash
curl http://localhost:3000/api/test
```

**Expected output:**
```json
{
  "traceId": "a1b2c3d4e5f6...",
  "spanId": "1a2b3c4d...",
  "name": "GET /api/test",
  "attributes": {
    "http.request.method": "GET",
    "http.route": "/api/test"
  }
}
```

## Step 2: Is your SDK exporting data?

### Check SDK configuration

**Common issues:**
- Wrong exporter endpoint
- Missing authentication
- Network connectivity problems
- Sampling configuration dropping all data

**Debug the exporter:**
```javascript
// Add debug logging to your SDK setup
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

const exporter = new OTLPTraceExporter({
  url: 'http://localhost:4318/v1/traces',
  // Add debug headers
  headers: {
    'debug': 'true'
  }
});

// Test exporter connectivity
console.log('Exporter endpoint:', exporter.url);
```

### Verify network connectivity

**Test if collector is reachable:**
```bash
# Test HTTP connectivity to collector
curl -v http://localhost:4318/v1/traces \
  -H "Content-Type: application/json" \
  -d '{"test": "connectivity"}'

# Should return 200 or 400 (not connection refused)
```

### Check sampling configuration

**Problem:** Sampler dropping all traces.

```javascript
// Temporarily use AlwaysOn sampler for debugging
const { AlwaysOnSampler } = require('@opentelemetry/sdk-trace-base');

const sdk = new NodeSDK({
  sampler: new AlwaysOnSampler(), // Debug: capture everything
  // ... rest of config
});
```

## Step 3: Is your collector receiving data?

### Enable collector debug logging

**Update collector config:**
```yaml
service:
  telemetry:
    logs:
      level: debug
      
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  # Add debug processor to see data flow
  debug:
    verbosity: detailed

exporters:
  # Keep your existing exporters
  logging:
    loglevel: debug

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [debug]  # Add debug processor
      exporters: [logging]  # Add logging exporter temporarily
```

### Check collector logs

**Start collector and watch logs:**
```bash
./otelcol --config=config.yaml

# Look for these messages:
✅ "Trace received" - Data is reaching collector
✅ "Exporting traces" - Data is being sent to backend
❌ "Connection refused" - Backend unreachable
❌ "Authentication failed" - Credentials issue
```

### Test collector directly

**Send test data to collector:**
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
          "startTimeUnixNano": "1640995200000000000",
          "endTimeUnixNano": "1640995201000000000"
        }]
      }]
    }]
  }'
```

## Step 4: Is your backend receiving data?

### Check backend connectivity

**Test backend endpoint:**
```bash
# For Jaeger
curl http://localhost:16686/api/traces?service=test-service

# For Zipkin  
curl http://localhost:9411/api/v2/traces

# For vendor backends, check their health endpoints
```

### Verify authentication

**Common auth issues:**
```yaml
exporters:
  otlp:
    endpoint: https://api.vendor.com:443
    headers:
      authorization: "Bearer ${API_KEY}"  # Check env var is set
      
  jaeger:
    endpoint: http://jaeger:14250
    tls:
      insecure: true  # For local development only
```

### Check backend logs

**Look for ingestion errors in your backend logs:**
- Authentication failures
- Rate limiting
- Data format issues
- Storage problems

## Common troubleshooting scenarios

### Scenario 1: "I see spans in console but not in Jaeger"
**Likely cause:** Collector or exporter configuration issue.
**Quick fix:** Add logging exporter to collector config and check logs for export errors.

### Scenario 2: "Auto-instrumentation not working"
**Likely cause:** Instrumentation not loaded or library not supported.
**Quick fix:** Enable `OTEL_LOG_LEVEL=debug` and verify instrumentation loads before application code.

### Scenario 3: "Data appears intermittently"
**Likely cause:** Sampling, batching, or resource limits.
**Quick fix:** Set sampler to `AlwaysOnSampler` temporarily and check batch processor configuration.

### Scenario 4: "High cardinality attributes causing issues"
**Likely cause:** Too many unique attribute values overwhelming the system.
**Quick fix:** Check for attributes with user IDs, timestamps, or UUIDs and use processors to filter them.

## Prevention: monitoring your monitoring

**Set up health checks for your telemetry pipeline:**

```yaml
# Collector health check
receivers:
  prometheus:
    config:
      scrape_configs:
        - job_name: 'otel-collector'
          static_configs:
            - targets: ['localhost:8888']

# Monitor key metrics:
# - otelcol_receiver_accepted_spans
# - otelcol_exporter_sent_spans  
# - otelcol_processor_dropped_spans
```


## What I'm taking into Day 24

**Missing telemetry data is usually a configuration or connectivity issue, not a code problem. Debug systematically through each stage of the pipeline: application → SDK → collector → backend.**

The debugging approach:
1. **Verify each stage independently** using debug logging and test data
2. **Use temporary debug exporters** to see data flow
3. **Test connectivity** at each network boundary
4. **Monitor the monitoring** to catch issues early

Tomorrow we'll learn about **debugging distributed traces** to find lost spans and broken context propagation across service boundaries.

---

**Debug tip:** Always keep a "debug configuration" ready that includes console exporters, debug logging, and AlwaysOn sampling. This lets you quickly isolate issues without modifying production configs.