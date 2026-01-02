# Day 18 – Exporters: Multi-Backend Strategies

Yesterday we learned how processors transform data in the pipeline. Today we explore **exporters**, the components that send processed telemetry data to observability backends, and how to implement sophisticated multi-backend strategies.

> **Working example:** Complete configurations are available in [`examples/day18-exporters/`](../examples/day18-exporters/)

---

## What We Already Know

From [Day 15](./day15.md), exporters are the **output side** of the pipeline:

```
Receivers → Processors → Exporters
                           ↓
                    "Send data to backends"
```

Exporters are what make the Collector's multi-backend capabilities possible.

---

## How Exporters Work

An exporter is the last step in a pipeline. It takes the telemetry produced by receivers + processors and **sends it out**.

Two key mental models:

1) **Pipelines are independent**
- `traces`, `metrics`, and `logs` are separate assembly lines.
- An exporter only runs for the pipelines it’s listed in.

2) **Multiple exporters = fan-out (duplicate sends)**
- If you configure `exporters: [jaeger, otlp/dash0]`, the Collector sends the **same trace data** to both backends.
- This is not “splitting” the data, it’s **copying** it to multiple destinations.

---

## The Main Exporter Categories

### 1. OTLP Exporters (Modern Standard)
- **OTLP/gRPC** - High performance, binary protocol
- **OTLP/HTTP** - Web-friendly, JSON or protobuf

### 2. Vendor-Specific Exporters
- **Jaeger** - Distributed tracing
- **Prometheus** - Metrics scraping
- **Loki** - Log aggregation

### 3. Utility Exporters
- **Logging** - Debug output to console
- **File** - Write to local files


## Which Exporter Should I Choose?

- **Most modern backends:** use **OTLP**
- **Prometheus ecosystem:** use **prometheus exporter** (scrape endpoint)
- **Local debugging:** use **logging exporter**
- **Local backup / audits:** use **file exporter**
- **Legacy backends:** use vendor-specific exporters (Jaeger, Loki, etc.)


---

## OTLP Exporters: The Modern Choice

OTLP (OpenTelemetry Protocol) is the native format for OpenTelemetry data. Most modern observability platforms support it.

### Basic OTLP Configuration

```yaml
exporters:
  otlp:
    endpoint: https://api.dash0.com:4317
    headers:
      authorization: "Bearer your-api-token"
    compression: gzip
```

### Multiple OTLP Backends

> **Naming tip:** Exporters use the pattern `type/name`.
> - `type` = exporter implementation (e.g., `otlp`, `file`, `logging`)
> - `name` = your label so you can create multiple instances
> Example: `otlp/dash0` and `otlp/storage` are both OTLP exporters with different settings.

```yaml
exporters:
  # Production observability platform
  otlp/dash0:
    endpoint: https://api.dash0.com:4317
    headers:
      authorization: "Bearer ${env:DASH0_TOKEN}"
    compression: gzip
  
  # Development/staging environment
  otlp/jaeger:
    endpoint: http://jaeger:4317
    tls:
      insecure: true
  
  # Long-term storage
  otlp/storage:
    endpoint: https://long-term-storage.com:4317
    headers:
      authorization: "Bearer ${env:STORAGE_TOKEN}"
    timeout: 30s
```

---

## Prometheus Exporter: Metrics Endpoint

The Prometheus exporter creates a metrics endpoint that Prometheus can scrape.

> **Important:** The Prometheus exporter does **not** push metrics to Prometheus.
> It exposes an HTTP endpoint (like `/metrics`) that Prometheus **scrapes** on an interval.

### Basic Prometheus Export

```yaml
exporters:
  prometheus:
    endpoint: "0.0.0.0:8889"
    namespace: "myapp"
    const_labels:
      environment: "production"
      team: "platform"
```

### Advanced Prometheus Configuration

```yaml
exporters:
  prometheus:
    endpoint: "0.0.0.0:8889"
    namespace: "otel"
    const_labels:
      cluster: "prod-us-east-1"
      environment: "production"
    metric_expiration: 180m
    resource_to_telemetry_conversion:
      enabled: true
    enable_open_metrics: true
```

**What this creates:**
- Metrics endpoint at `http://collector:8889/metrics`
- All metrics prefixed with `otel_`
- Constant labels added to all metrics
- Resource attributes converted to metric labels

---

## Jaeger Exporter: Distributed Tracing

The Jaeger exporter sends traces directly to Jaeger.

### Basic Jaeger Configuration

```yaml
exporters:
  jaeger:
    endpoint: jaeger-collector:14250
    tls:
      insecure: true
```

### Production Jaeger Setup

```yaml
exporters:
  jaeger:
    endpoint: jaeger-collector:14250
    tls:
      cert_file: /path/to/cert.pem
      key_file: /path/to/key.pem
      ca_file: /path/to/ca.pem
    timeout: 30s
    retry_on_failure:
      enabled: true
      initial_interval: 1s
      max_interval: 30s
      max_elapsed_time: 300s
```

---

## File Exporter: Local Storage

The file exporter writes telemetry data to local files.

### Basic File Export

```yaml
exporters:
  file:
    path: /var/log/otel/traces.json
    rotation:
      max_megabytes: 100
      max_days: 7
      max_backups: 3
```

### Separate Files by Signal Type

```yaml
exporters:
  file/traces:
    path: /var/log/otel/traces.json
    rotation:
      max_megabytes: 100
      max_days: 7
  
  file/metrics:
    path: /var/log/otel/metrics.json
    rotation:
      max_megabytes: 50
      max_days: 3
  
  file/logs:
    path: /var/log/otel/logs.json
    rotation:
      max_megabytes: 200
      max_days: 14
```

---

## Multi-Backend Strategies

The real power of the Collector comes from sending data to multiple backends simultaneously.

### Strategy 1: Signal Separation

Send different signal types to specialized backends:

```yaml
exporters:
  # Traces to Jaeger
  jaeger:
    endpoint: jaeger:14250
    tls:
      insecure: true
  
  # Metrics to Prometheus
  prometheus:
    endpoint: "0.0.0.0:8889"
  
  # Logs to Loki
  loki:
    endpoint: http://loki:3100/loki/api/v1/push
  
  # Everything to unified platform
  otlp/dash0:
    endpoint: https://api.dash0.com:4317
    headers:
      authorization: "Bearer ${env:DASH0_TOKEN}"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [jaeger, otlp/dash0]  # Dual export
    
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheus, otlp/dash0]  # Dual export
    
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [loki, otlp/dash0]  # Dual export
```

### Strategy 2: Environment-Based Routing

Different backends for different environments:

```yaml
exporters:
  # Production backends
  otlp/prod:
    endpoint: https://prod-api.dash0.com:4317
    headers:
      authorization: "Bearer ${env:PROD_TOKEN}"
  
  # Staging backends
  otlp/staging:
    endpoint: https://staging-api.dash0.com:4317
    headers:
      authorization: "Bearer ${env:STAGING_TOKEN}"
  
  # Development (local)
  jaeger/dev:
    endpoint: localhost:14250
    tls:
      insecure: true

processors:
  # Route based on environment
  attributes:
    actions:
      - key: deployment.environment
        from_attribute: k8s.namespace.name
        action: insert
# This processor only **adds an attribute**. The routing happens because we define separate pipelines (`traces/prod`, `traces/staging`, etc.).

service:
  pipelines:
    # Production pipeline
    traces/prod:
      receivers: [otlp]
      processors: [attributes, batch]
      exporters: [otlp/prod]
    
    # Staging pipeline
    traces/staging:
      receivers: [otlp]
      processors: [attributes, batch]
      exporters: [otlp/staging]
    
    # Development pipeline
    traces/dev:
      receivers: [otlp]
      processors: [attributes, batch]
      exporters: [jaeger/dev]
```

### Strategy 3: Data Tiering

Send different data to different backends based on importance:

```yaml
exporters:
  # High-value data to premium backend
  otlp/premium:
    endpoint: https://premium-api.com:4317
    headers:
      authorization: "Bearer ${env:PREMIUM_TOKEN}"
  
  # Standard data to cost-effective backend
  otlp/standard:
    endpoint: https://standard-api.com:4317
    headers:
      authorization: "Bearer ${env:STANDARD_TOKEN}"
  
  # Archive data to cheap storage
  file/archive:
    path: /archive/telemetry.json
    rotation:
      max_megabytes: 1000
      max_days: 365

processors:
  # Separate high-value data
  filter/premium:
    traces:
      span:
        - 'attributes["business.critical"] == "true"'
        - 'attributes["http.status_code"] >= 500'
  
  # Standard operational data
  filter/standard:
    traces:
      span:
        - 'attributes["business.critical"] != "true" and attributes["http.status_code"] < 500'

service:
  pipelines:
    # Premium data pipeline
    traces/premium:
      receivers: [otlp]
      processors: [filter/premium, batch]
      exporters: [otlp/premium]
    
    # Standard data pipeline
    traces/standard:
      receivers: [otlp]
      processors: [filter/standard, batch]
      exporters: [otlp/standard, file/archive]
```

---

## Exporter Performance and Reliability

Backends are not always available. If the exporter can’t send (network issues, throttling, backend outage),
**retries and queues reduce data loss** and smooth out traffic spikes.

### Retry Configuration

```yaml
exporters:
  otlp:
    endpoint: https://api.backend.com:4317
    retry_on_failure:
      enabled: true
      initial_interval: 1s
      max_interval: 30s
      max_elapsed_time: 300s
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 5000
```

### Timeout and Compression

```yaml
exporters:
  otlp:
    endpoint: https://api.backend.com:4317
    timeout: 30s
    compression: gzip  # Reduces bandwidth
    headers:
      authorization: "Bearer ${env:API_TOKEN}"
```

### Load Balancing

```yaml
exporters:
  # Load balance across multiple endpoints
  loadbalancing:
    protocol:
      otlp:
        timeout: 10s
    resolver:
      static:
        hostnames:
          - backend1.example.com:4317
          - backend2.example.com:4317
          - backend3.example.com:4317
```

---

## Debugging Exporters

### Logging Exporter for Debugging

```yaml
exporters:
  # Debug what's being exported
  logging/debug:
    loglevel: debug
    sampling_initial: 5
    sampling_thereafter: 200
  
  # Your real exporter
  otlp/production:
    endpoint: https://api.backend.com:4317

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [logging/debug, otlp/production]  # See what's being sent
```

### Exporter Metrics

Monitor exporter health with built-in metrics:

```yaml
service:
  telemetry:
    metrics:
      address: 0.0.0.0:8888
      level: detailed
```

Key metrics to watch:
```bash
curl http://localhost:8888/metrics | grep exporter
# otelcol_exporter_sent_spans_total
# otelcol_exporter_send_failed_spans_total
# otelcol_exporter_queue_size
```

---

## Security Considerations

### TLS Configuration

```yaml
exporters:
  otlp:
    endpoint: https://secure-backend.com:4317
    tls:
      cert_file: /certs/client.crt
      key_file: /certs/client.key
      ca_file: /certs/ca.crt
      insecure: false
      server_name_override: secure-backend.com
```

### Authentication Methods

```yaml
exporters:
  # Bearer token
  otlp/bearer:
    endpoint: https://api.backend.com:4317
    headers:
      authorization: "Bearer ${env:API_TOKEN}"
  
  # API key
  otlp/apikey:
    endpoint: https://api.backend.com:4317
    headers:
      x-api-key: "${env:API_KEY}"
  
  # Custom headers
  otlp/custom:
    endpoint: https://api.backend.com:4317
    headers:
      x-tenant-id: "${env:TENANT_ID}"
      x-region: "us-east-1"
```

---

## Cost Optimization with Exporters

### Sampling at Export

```yaml
exporters:
  # Expensive backend - sample more aggressively
  otlp/expensive:
    endpoint: https://expensive-backend.com:4317
    
  # Cheap backend - send everything
  otlp/cheap:
    endpoint: https://cheap-backend.com:4317

processors:
  # Sample for expensive backend
  probabilistic_sampler/expensive:
    sampling_percentage: 10  # Only 10%
  
  # No sampling for cheap backend
  batch/cheap:
    timeout: 1s

service:
  pipelines:
    # Expensive pipeline (sampled)
    traces/expensive:
      receivers: [otlp]
      processors: [probabilistic_sampler/expensive, batch]
      exporters: [otlp/expensive]
    
    # Cheap pipeline (full data)
    traces/cheap:
      receivers: [otlp]
      processors: [batch/cheap]
      exporters: [otlp/cheap]
```

---

## What We're Taking Into Day 19

Today we learned how to **send** data from the Collector to multiple backends:

**Key concepts:**
- **OTLP exporters** for modern observability platforms
- **Multi-backend strategies** for different use cases
- **Performance optimization** with retries, compression, and load balancing
- **Security** with TLS and authentication

**Practical skills:**
- Configuring exporters for production reliability
- Implementing sophisticated routing strategies
- Monitoring and debugging exporter performance

**Tomorrow (Day 19):** We'll dive deep into **OTTL (OpenTelemetry Transformation Language)** - the powerful language for advanced data transformations in processors.

See you on Day 19!