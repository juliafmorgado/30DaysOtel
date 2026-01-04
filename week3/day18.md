# Day 18 – Exporters: Multi-Backend Strategies

Yesterday we learned how processors transform data in the pipeline. Today we explore **exporters**, the components that send processed telemetry data to observability backends.

> **Working example:** Complete configurations are available in [`examples/day18-exporters/`](../examples/day18-exporters/)

---

## What We Already Know

From [Day 15](./day15.md), exporters are the **output side** of the pipeline. They are what make the Collector's multi-backend capabilities possible.

```
Receivers → Processors → Exporters
                           ↓
                    "Send data to backends"
```

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

### OTLP Exporters: The Modern Choice

OTLP (OpenTelemetry Protocol) is the native format for OpenTelemetry data. Most modern observability platforms support it.

#### Basic OTLP Configuration

```yaml
exporters:
  otlp:
    endpoint: https://api.dash0.com:4317
    headers:
      authorization: "Bearer your-api-token"
    compression: gzip
```

#### Multiple OTLP Exporters (for different backends)

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
Key insight: Same OTLP format, different destinations for different needs -> real-time monitoring, development, and long-term storage.

---

### Prometheus Exporter: Metrics Endpoint

The Prometheus exporter creates a metrics endpoint that Prometheus can scrape.

> **Important:** The Prometheus exporter does **not** push metrics to Prometheus.
>
> It exposes an HTTP endpoint (like `/metrics`) that Prometheus **scrapes** on an interval.

#### Basic Prometheus Export

```yaml
exporters:
  prometheus:
    endpoint: "0.0.0.0:8889" #Collector starts an HTTP server on port 8889, Prometheus scrapes: http://collector:8889/metrics
    namespace: "myapp" #Adds prefix to all metric names
    const_labels:
      environment: "production" #Every metric gets these labels automatically
      team: "platform"
```
Key insight: This turns the Collector into a Prometheus-compatible metrics endpoint that Prometheus can scrape, while adding consistent labeling and namespacing to all metrics.

#### Advanced Prometheus Configuration

```yaml
exporters:
  prometheus:
    endpoint: "0.0.0.0:8889" #Metrics endpoint at `http://collector:8889/metrics`
    namespace: "otel" #All metrics prefixed with `otel_`
    const_labels: #Constant labels added to all metrics
      cluster: "prod-us-east-1"
      environment: "production"
    metric_expiration: 180m #Removes metrics that haven't been updated in 180 minutes
    resource_to_telemetry_conversion:
      enabled: true #Converts resource attributes to metric labels
    enable_open_metrics: true #Uses newer OpenMetrics format instead of classic Prometheus format
```

Key benefits: Rich labeling, automatic cleanup, modern format, and resource context preservation for better Prometheus integration.

---

### Jaeger Exporter: Distributed Tracing

The Jaeger exporter sends traces directly to Jaeger.

#### Basic Jaeger Configuration

```yaml
exporters:
  jaeger:
    endpoint: jaeger-collector:14250 #Sends traces to Jaeger collector on port 14250
    tls:
      insecure: true #Disables TLS encryption (no HTTPS), don't use it in prod!
```
Key insight: This sends OpenTelemetry traces to Jaeger in Jaeger's native format, with TLS disabled for development convenience.

### Production Jaeger Setup

```yaml
exporters:
  jaeger:
    endpoint: jaeger-collector:14250
    tls:
      cert_file: /path/to/cert.pem # Client certificate
      key_file: /path/to/key.pem # Client private key
      ca_file: /path/to/ca.pem # Certificate Authority
    timeout: 30s #Timeout Protection: If Jaeger doesn't respond within 30 seconds, give up
    retry_on_failure:
      enabled: true
      initial_interval: 1s # First retry after 1 second
      max_interval: 30s # Don't wait more than 30 seconds between retries
      max_elapsed_time: 300s # Give up after 5 minutes total
```
This configuration ensures secure, reliable trace delivery to Jaeger in production environments.

---

### File Exporter: Local Storage

The file exporter writes telemetry data to local files.

#### Basic File Export

```yaml
exporters:
  file:
    path: /var/log/otel/traces.json #Saves telemetry data as JSON to this file
    rotation:
      max_megabytes: 100 # Rotate when file reaches 100MB
      max_days: 7 # Rotate daily after 7 days
      max_backups: 3 # Keep 3 old files
```
Benefits: Local backup, debugging capability, compliance/audit trail, works even when backends are down.

#### Separate Files by Signal Type

```yaml
exporters:
  file/traces:
    path: /var/log/otel/traces.json
    rotation:
      max_megabytes: 100 # 100MB files
      max_days: 7 # Keep for 1 week
  #Reasoning: Traces are detailed but not as frequent as metrics
  
  file/metrics:
    path: /var/log/otel/metrics.json
    rotation:
      max_megabytes: 50 # Smaller 50MB files
      max_days: 3 # Keep for 3 days only
  #Reasoning: Metrics are high-volume, rotate frequently

  file/logs:
    path: /var/log/otel/logs.json
    rotation:
      max_megabytes: 200 # Larger 200MB files
      max_days: 14 # Keep for 2 weeks
  #Reasoning: Logs are critical for debugging, need longer retention
```
---

## Which Exporter Should I Choose?

- **Most modern backends:** use **OTLP**
- **Prometheus ecosystem:** use **prometheus exporter** (scrape endpoint)
- **Local debugging:** use **logging exporter**
- **Local backup / audits:** use **file exporter**
- **Legacy backends:** use vendor-specific exporters (Jaeger, Loki, etc.)

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

## Simple Debugging

```yaml
exporters:
  logging/debug:
    loglevel: debug
  
  jaeger:
    endpoint: jaeger:14250

service:
  pipelines:
    traces:
      exporters: [logging/debug, jaeger]  # See what's being sent
```

---

## What We're Taking Into Day 19

Today we learned how to **send telemetry data** from the Collector to Observability backends.

The Collector pipeline is almost complete, we can receive data, process it, and now export it. 

Tomorrow (Day 19) we'll add the final piece: smart data transformations with **OTTL (OpenTelemetry Transformation Language)**!

See you on Day 19!