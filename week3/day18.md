# Day 18 – Modern Exporters: Built-in Batching and Reliability

Yesterday we learned how processors transform data in the pipeline. Today we explore **modern exporters** and their built-in capabilities that make batch processors unnecessary.

> **Working examples:** Complete configurations are available in [`examples/day18-exporters/`](../examples/day18-exporters/)

---

## What We Already Know

From [Day 15](./day15.md), exporters are the **output side** of the pipeline. From [Day 17](./day17.md), we learned that OpenTelemetry is moving batching functionality from processors to exporters for better reliability.

```
Receivers → Processors → Exporters
                           ↓
                    "Send data reliably to backends"
```

---

## The Evolution: From Batch Processors to Exporter Helper

### The Old Way (Day 17)
```yaml
processors:
  batch:  # Data lost if Collector crashes
    timeout: 1s
    send_batch_size: 1024

exporters:
  otlp:
    endpoint: https://api.backend.com
```

### The New Way (Today)
```yaml
processors: []  # No batch processor needed!

exporters:
  otlp:
    endpoint: https://api.backend.com
    # Built-in batching with persistent storage
    sending_queue:
      enabled: true
      queue_size: 1000
      persistent_storage_enabled: true
    retry_on_failure:
      enabled: true
```

**Key difference:** Modern exporters handle batching internally with **persistent storage** that survives crashes.

---

## Exporter Helper: The Foundation

All modern exporters are built on **exporter helper** ([GitHub issue #8122](https://github.com/open-telemetry/opentelemetry-collector/issues/8122)), which provides:

### 1. **Built-in Batching**
- Automatic grouping of telemetry data
- Configurable batch sizes and timeouts
- No separate batch processor needed

### 2. **Persistent Storage**
- Data survives Collector crashes
- Uses disk-based write-ahead log (WAL)
- 100% data recovery after restarts

### 3. **Intelligent Retry Logic**
- Exponential backoff for failed requests
- Configurable retry policies
- Handles temporary backend outages

### 4. **Queue Management**
- In-memory and persistent queues
- Backpressure handling
- Memory protection

---

## Modern OTLP Exporter Configuration

### Basic Reliable Configuration

```yaml
exporters:
  otlp:
    endpoint: https://api.dash0.com:4317 #WHERE to send data - the URL and port of the backend service
    headers:
      authorization: "Bearer ${env:DASH0_TOKEN}" #Adds authentication to each request.
    
    # Built-in batching (replaces batch processor)
    sending_queue:
      enabled: true #Turns on the exporter's internal queue system that collects telemetry data before sending
      queue_size: 1000 #Sets the maximum number of items (spans/metrics/logs) the queue can hold. When it reaches 1000 items, it sends a batch
      persistent_storage_enabled: true  #Saves queued data to disk so if the Collector crashes, the data survives and gets sent after restart
    
    # Intelligent retry logic
    retry_on_failure:
      enabled: true #If sending fails (network issue, backend down), automatically retry instead of losing data
      initial_interval: 1s #Wait 1 second before the first retry attempt
      max_interval: 30s #Never wait more than 30 seconds between retry attempts (prevents infinite waiting)
      max_elapsed_time: 300s #Give up after trying for 5 minutes total
    
    # Performance optimization
    compression: gzip #Compresses data before sending to reduce bandwidth usage
    timeout: 30s #If a single send request takes longer than 30 seconds, give up and try again
```

### Advanced Reliability Configuration

```yaml
exporters:
  otlp/production:
    endpoint: https://api.backend.com:4317
    headers:
      authorization: "Bearer ${env:API_TOKEN}"
    
    # Advanced queue configuration
    sending_queue:
      enabled: true
      queue_size: 5000
      persistent_storage_enabled: true
      storage_directory: "/var/lib/otelcol/storage"  # Custom storage location
      
    # Sophisticated retry policy
    retry_on_failure:
      enabled: true
      initial_interval: 1s
      randomization_factor: 0.5  # Add jitter to prevent thundering herd
      multiplier: 1.5
      max_interval: 30s
      max_elapsed_time: 300s
    
    # Connection management
    timeout: 30s
    compression: gzip
    keepalive:
      time: 30s
      timeout: 5s
      permit_without_stream: true
```

---

## Specialized Exporters with Modern Capabilities

### Prometheus Exporter (Metrics)

```yaml
exporters:
  prometheus:
    endpoint: "0.0.0.0:8889"
    namespace: "myapp"
    const_labels:
      environment: "production"
      cluster: "us-east-1"
    
    # Modern reliability features
    metric_expiration: 180m
    resource_to_telemetry_conversion:
      enabled: true
    enable_open_metrics: true
    
    # Built-in queue management
    sending_queue:
      enabled: true
      queue_size: 1000
```

### File Exporter with Persistence

```yaml
exporters:
  file/backup:
    path: /var/log/otel/traces.jsonl
    rotation:
      max_megabytes: 100
      max_days: 7
      max_backups: 3
    
    # Reliability features
    sending_queue:
      enabled: true
      queue_size: 5000
      persistent_storage_enabled: true
    
    # Ensure data reaches disk
    flush_interval: 1s
```

---

## Comparing Old vs New Approaches

### Reliability Comparison

| Aspect | Batch Processor | Modern Exporters |
|--------|----------------|------------------|
| **Data Loss** | 100% during crashes | 0% with persistent storage |
| **Recovery** | None | Full recovery after restart |
| **Storage** | Memory only | Disk-based WAL |
| **Configuration** | Separate component | Built-in |
| **Maintenance** | Extra complexity | Simplified |

### Performance Comparison

```yaml
# Old approach: Separate batching
processors:
  batch:
    timeout: 1s
    send_batch_size: 1024
exporters:
  otlp:
    endpoint: https://api.backend.com

# New approach: Integrated batching
processors: []  # Cleaner!
exporters:
  otlp:
    endpoint: https://api.backend.com
    sending_queue:
      enabled: true
      queue_size: 1024  # Same performance, better reliability
      persistent_storage_enabled: true
```

---

## Migration Strategy

### Step 1: Enable Exporter Queues
```yaml
exporters:
  otlp:
    endpoint: https://api.backend.com
    sending_queue:
      enabled: true
      queue_size: 1000
```

### Step 2: Add Persistent Storage
```yaml
exporters:
  otlp:
    endpoint: https://api.backend.com
    sending_queue:
      enabled: true
      queue_size: 1000
      persistent_storage_enabled: true  # Add this
```

### Step 3: Remove Batch Processor
```yaml
processors: []  # Remove batch processor
# OR
processors: [attributes, filter]  # Keep other processors
```

---

## Monitoring Modern Exporters

### Exporter Metrics

Enable Collector self-monitoring to track exporter performance:

```yaml
service:
  telemetry:
    metrics:
      address: 0.0.0.0:8888
      level: detailed
```

**Key metrics to monitor:**
- `otelcol_exporter_queue_size` - Current queue depth
- `otelcol_exporter_queue_capacity` - Maximum queue size
- `otelcol_exporter_sent_spans` - Successfully sent data
- `otelcol_exporter_send_failed_spans` - Failed sends
- `otelcol_exporter_enqueue_failed_spans` - Queue overflow

### Debugging Configuration

```yaml
exporters:
  logging/debug:
    loglevel: debug
  
  otlp/production:
    endpoint: https://api.backend.com
    sending_queue:
      enabled: true
      persistent_storage_enabled: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: []
      exporters: [logging/debug, otlp/production]  # See what's being sent
```

---

## Best Practices for Modern Exporters

### 1. **Always Enable Persistent Storage**
```yaml
sending_queue:
  enabled: true
  persistent_storage_enabled: true  # Essential for reliability
```

### 2. **Configure Appropriate Queue Sizes**
```yaml
sending_queue:
  queue_size: 1000  # Start here, adjust based on traffic
```

### 3. **Use Intelligent Retry Policies**
```yaml
retry_on_failure:
  enabled: true
  initial_interval: 1s
  max_elapsed_time: 300s  # Don't retry forever
```

### 4. **Monitor Queue Health**
- Watch queue depth metrics
- Alert on queue overflow
- Monitor retry rates

### 5. **Test Crash Recovery**
- Simulate Collector crashes
- Verify data recovery
- Validate queue persistence

---

## What We're Taking Into Day 19

Today we learned about **modern exporters** and their built-in reliability features:

**Key concepts:**
- **Exporter helper** provides built-in batching, persistence, and retry logic
- **Persistent storage** eliminates data loss during crashes
- **No batch processor needed** - exporters handle everything
- **Simplified configuration** with better reliability

**Migration path:**
- Enable exporter queues and persistent storage
- Remove batch processors
- Monitor exporter metrics

**Tomorrow (Day 19)** we'll learn about **OTTL (OpenTelemetry Transformation Language)** for advanced data transformations that work perfectly with modern exporters.

See you on Day 19!