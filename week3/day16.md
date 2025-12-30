# Day 16 – Receivers: How the Collector Gets Data In

Yesterday we learned the big picture of Collector architecture. Today we dive deep into **receivers**, the components that bring telemetry data into the Collector from various sources.

> **Working example:** Complete configurations are available in [`examples/day16-receivers/`](../examples/day16-receivers/)

---

## What We Already Know

From Day 15, we learned that receivers are the **input side** of the Collector pipeline:

```
Receivers → Processors → Exporters
    ↓
  "Get data from apps, files, endpoints"
```

Today we'll learn how to configure different receiver types and understand when to use each one.

---

## The Three Main Receiver Categories

### 1. Push Receivers (apps send data to Collector)
- **OTLP Receiver** - OpenTelemetry native protocol
- **Jaeger Receiver** - Legacy Jaeger format
- **Zipkin Receiver** - Legacy Zipkin format

### 2. Pull Receivers (Collector fetches data)
- **Prometheus Receiver** - Scrapes metrics endpoints
- **Filelog Receiver** - Reads log files
- **Host Metrics Receiver** - System metrics

### 3. Specialized Receivers
- **Kafka Receiver** - Message queue data
- **OTLP/HTTP Receiver** - HTTP-based telemetry

---

## OTLP Receiver: The Most Important One

The OTLP receiver accepts data from OpenTelemetry SDKs. This is what we'll use most often.

### Basic Configuration

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318
```

**What this does:**
- Listens on port 4317 for gRPC connections
- Listens on port 4318 for HTTP connections
- Accepts traces, metrics, and logs from any OpenTelemetry SDK

### Advanced OTLP Configuration

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        max_recv_msg_size: 4194304  # 4MB max message size
        keepalive:
          server_parameters:
            max_connection_idle: 11s
            max_connection_age: 12s
      http:
        endpoint: 0.0.0.0:4318
        cors:
          allowed_origins:
            - "https://myapp.com"
            - "https://dashboard.com"
```

**When to use advanced config:**
- Large spans that exceed default message size
- Browser applications that need CORS
- High-traffic scenarios requiring connection tuning

---

## Prometheus Receiver: Scraping Metrics

The Prometheus receiver pulls metrics from Prometheus-compatible endpoints.

### Basic Prometheus Scraping

```yaml
receivers:
  prometheus:
    config:
      scrape_configs:
        - job_name: 'my-app'
          scrape_interval: 30s
          static_configs:
            - targets: ['localhost:8080']
```

### Multiple Applications

```yaml
receivers:
  prometheus:
    config:
      scrape_configs:
        - job_name: 'web-app'
          scrape_interval: 15s
          static_configs:
            - targets: ['web-app:8080']
          
        - job_name: 'api-server'
          scrape_interval: 30s
          static_configs:
            - targets: ['api-server:9090']
          
        - job_name: 'database'
          scrape_interval: 60s
          static_configs:
            - targets: ['postgres-exporter:9187']
```

**Use cases:**
- Legacy applications with Prometheus metrics
- Third-party services (databases, load balancers)
- Gradual migration from Prometheus to OpenTelemetry

---

## Filelog Receiver: Reading Log Files

The filelog receiver reads logs from files and converts them to OpenTelemetry format.

### Basic File Reading

```yaml
receivers:
  filelog:
    include: [/var/log/app/*.log]
    exclude: [/var/log/app/debug.log]
```

### Advanced Log Processing

```yaml
receivers:
  filelog:
    include: [/var/log/app/*.log]
    operators:
      - type: regex_parser
        regex: '^(?P<timestamp>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) (?P<level>\w+) (?P<message>.*)'
        timestamp:
          parse_from: attributes.timestamp
          layout: '%Y-%m-%d %H:%M:%S'
      - type: severity_parser
        parse_from: attributes.level
```

**What this does:**
1. Reads all `.log` files in `/var/log/app/`
2. Parses each line using regex to extract timestamp, level, and message
3. Converts log levels to OpenTelemetry severity
4. Creates structured log records

---

## Host Metrics Receiver: System Monitoring

Collects system metrics like CPU, memory, disk usage.

```yaml
receivers:
  hostmetrics:
    collection_interval: 30s
    scrapers:
      cpu:
        metrics:
          system.cpu.utilization:
            enabled: true
      memory:
        metrics:
          system.memory.utilization:
            enabled: true
      disk:
        metrics:
          system.disk.io:
            enabled: true
      network:
        metrics:
          system.network.io:
            enabled: true
```

**Perfect for:**
- Infrastructure monitoring
- Container/VM monitoring
- Baseline system metrics

---

## Multiple Receivers in One Pipeline

We can use multiple receivers to collect data from different sources:

```yaml
receivers:
  # OpenTelemetry apps
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318
  
  # Legacy Prometheus apps
  prometheus:
    config:
      scrape_configs:
        - job_name: 'legacy-app'
          static_configs:
            - targets: ['legacy-app:8080']
  
  # Log files
  filelog:
    include: [/var/log/apps/*.log]
  
  # System metrics
  hostmetrics:
    collection_interval: 60s
    scrapers:
      cpu: {}
      memory: {}

service:
  pipelines:
    traces:
      receivers: [otlp]  # Only OTLP for traces
      processors: [batch]
      exporters: [jaeger]
    
    metrics:
      receivers: [otlp, prometheus, hostmetrics]  # Multiple sources
      processors: [batch]
      exporters: [prometheus]
    
    logs:
      receivers: [otlp, filelog]  # OTLP + file logs
      processors: [batch]
      exporters: [loki]
```

---

## Receiver Security and Authentication

### TLS Configuration

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        tls:
          cert_file: /path/to/cert.pem
          key_file: /path/to/key.pem
          ca_file: /path/to/ca.pem
          client_ca_file: /path/to/client-ca.pem
```

### Authentication Headers

```yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318
        auth:
          authenticator: basicauth/server
```

**When to use:**
- Production deployments
- Multi-tenant environments
- Compliance requirements

---

## Common Receiver Patterns

### Pattern 1: Modern Stack (OTLP Only)
```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318
```
**Use when:** All applications use OpenTelemetry SDKs

### Pattern 2: Migration Mode (OTLP + Legacy)
```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
  prometheus:
    config:
      scrape_configs:
        - job_name: 'legacy-apps'
          static_configs:
            - targets: ['app1:8080', 'app2:8080']
```
**Use when:** Migrating from Prometheus to OpenTelemetry

### Pattern 3: Complete Observability (All Sources)
```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
  prometheus:
    config:
      scrape_configs:
        - job_name: 'infrastructure'
          static_configs:
            - targets: ['node-exporter:9100']
  filelog:
    include: [/var/log/**/*.log]
  hostmetrics:
    collection_interval: 30s
    scrapers:
      cpu: {}
      memory: {}
      disk: {}
```
**Use when:** Need comprehensive monitoring across all layers

---

## Troubleshooting Receivers

### Common Issues

**1. Port conflicts:**
```bash
# Check if ports are in use
netstat -tulpn | grep :4317
netstat -tulpn | grep :4318
```

**2. Permission issues (file logs):**
```bash
# Ensure Collector can read log files
chmod 644 /var/log/app/*.log
chown collector:collector /var/log/app/
```

**3. Network connectivity:**
```bash
# Test OTLP endpoint
curl -v http://localhost:4318/v1/traces
```

### Debugging Configuration

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

exporters:
  logging:
    loglevel: debug  # See what's being received

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: []
      exporters: [logging]  # Debug output
```

---

## Performance Considerations

### High-Traffic OTLP

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        max_recv_msg_size: 8388608  # 8MB
        max_concurrent_streams: 16
        keepalive:
          server_parameters:
            max_connection_idle: 60s
            max_connection_age: 120s
```

### Efficient File Reading

```yaml
receivers:
  filelog:
    include: [/var/log/app/*.log]
    max_log_size: 1MiB
    max_concurrent_files: 1024
    poll_interval: 200ms
```

---

## What We're Taking Into Day 17

Today we learned how to get data **into** the Collector:

**Key concepts:**
- **OTLP receiver** for OpenTelemetry SDKs (most important)
- **Prometheus receiver** for legacy metrics
- **Filelog receiver** for existing log files
- **Multiple receivers** in one pipeline for comprehensive data collection

**Practical skills:**
- Configuring basic and advanced receiver settings
- Troubleshooting common receiver issues
- Choosing the right receiver pattern for our use case

**Tomorrow (Day 17):** We'll learn how **Processors** transform, filter, and enhance telemetry data before it gets exported.

See you on Day 17!