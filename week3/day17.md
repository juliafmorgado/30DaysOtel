# Day 17 – Processors: Transforming Data in the Pipeline

Yesterday we learned how receivers get data into the Collector. Today we'll explore **processors**, the components that transform, filter, and enhance telemetry data before it gets exported.

> **Working example:** Complete configurations are available in [`examples/day17-processors/`](../examples/day17-processors/)

---

## What We Already Know

From [Day 15](./day15.md), processors are the **middle** of the pipeline:

```
Receivers → Processors → Exporters
              ↓
        "Transform, filter, enhance data"
```

Processors are where the Collector's real power shines. They can do things the SDK simply cannot.

---

## How Processors Work (Beginner Notes)

Processors run **in order** inside a pipeline.
They can:
- add/remove/change attributes
- drop data (filter/sampling)
- reshape data (transform)
They cannot:
- “recover” missing telemetry that was never sent
- change what your app instrumented (they only modify what arrives)

---

## The Essential Processors

### 1. Batch Processor (Most Important)
Groups telemetry data for efficient export.

### 2. Attributes Processor
Adds, modifies, or removes attributes.

### 3. Filter Processor  
Drops unwanted telemetry data.

### 4. Transform Processor
Advanced transformations using OTTL.

### 5. Resource Processor
Modifies resource attributes.

---

## Batch Processor: The Foundation

The batch processor is essential for production deployments. It groups individual telemetry items into batches before export.

### Basic Configuration

```yaml
processors:
  batch:
    timeout: 1s
    send_batch_size: 1024
```

**What this does:**
- Collects up to 1024 spans/metrics/logs
- OR waits up to 1 second
- Then sends the batch to exporters

### Why Batching Matters

**Without batching:**
- 1000 spans = 1000 network calls
- High network overhead
- Poor performance

**With batching:**
- 1000 spans = 10 network calls (100 spans each)
- Much more efficient
- Better performance

### A Common Mistake: Batch Before Filter

If you batch first, you may waste memory/CPU batching spans you’ll drop anyway.
Prefer: `filter → attributes/transform → batch`

### Advanced Batch Configuration

```yaml
processors:
  batch:
    timeout: 2s
    send_batch_size: 2048
    send_batch_max_size: 4096
    metadata_keys:
      - tenant_id  # Batch by tenant for multi-tenant systems
```

---

## Attributes Processor: Adding Context

The attributes processor modifies span, metric, and log attributes.

### Adding Attributes

```yaml
processors:
  attributes:
    actions:
      - key: environment
        value: production
        action: insert
      - key: team
        value: platform
        action: insert
      - key: region
        value: us-east-1
        action: insert
```

### Modifying Existing Attributes

```yaml
processors:
  attributes:
    actions:
      # Rename an attribute
      - key: http.url
        action: delete
      - key: http.target
        action: insert
        from_attribute: http.url
      
      # Update values
      - key: service.version
        value: "v2.1.0"
        action: update
      
      # Hash sensitive data
      - key: user.email
        action: hash
```

### Conditional Attribute Changes

```yaml
processors:
  attributes:
    actions:
      # Only add environment for specific services
      - key: environment
        value: production
        action: insert
        include:
          match_type: strict
          services: ["payment-service", "user-service"]
      
      # Remove debug info from production
      - key: debug.info
        action: delete
        exclude:
          match_type: strict
          attributes:
            - key: environment
              value: development
```

---

## Filter Processor: Removing Noise

The filter processor drops unwanted telemetry to reduce costs and noise.

> `attributes[...]` refers to span/log attributes.
> `resource.attributes[...]` refers to service-level metadata (service name, env, k8s info).

### Basic Filtering

```yaml
processors:
  filter:
    traces:
      span:
        # Remove health check traces
        - 'name == "GET /health"'
        - 'name == "GET /ready"'
        
        # Remove 404 errors
        - 'attributes["http.status_code"] == 404'
        
        # Remove very short spans (likely noise)
        - 'duration < 1000000'  # Less than 1ms (nanoseconds)
```

### Advanced Filtering

```yaml
processors:
  filter:
    traces:
      span:
        # Complex conditions
        - 'name == "GET /api/users" and attributes["http.status_code"] >= 400'
        - 'attributes["service.name"] == "test-service"'
        
    metrics:
      metric:
        # Remove test metrics
        - 'name == "test.counter"'
        - 'HasAttrKeyOnDatapoint("test.label")'
        
    logs:
      log_record:
        # Remove debug logs in production
        - 'severity_text == "DEBUG" and resource.attributes["environment"] == "production"'
```

### Cost-Saving Filters

```yaml
processors:
  # Filter for cost optimization
  filter/cost-optimization:
    traces:
      span:
        # Remove successful health checks
        - 'name matches ".*health.*" and attributes["http.status_code"] < 400'
        
        # Remove internal service calls under 10ms
        - 'attributes["rpc.system"] == "grpc" and duration < 10000000'
        
        # Sample only errors for high-volume endpoints
        - 'name == "GET /api/search" and attributes["http.status_code"] < 400 and TraceID() % 100 != 0'
```

---

## Resource Processor: Service Metadata

The resource processor modifies resource attributes that describe the service itself.

- Use **resource processor** for “about the service” (env, cluster, service.team)
- Use **attributes processor** for “about the operation” (http.route, user.id, request.size)

### Adding Resource Information

```yaml
processors:
  resource:
    attributes:
      - key: deployment.environment
        value: production
        action: insert
      - key: service.team
        value: platform
        action: insert
      - key: k8s.cluster.name
        value: prod-us-east-1
        action: insert
```

### Dynamic Resource Attributes

```yaml
processors:
  resource:
    attributes:
      # Use environment variables
      - key: host.name
        from_attribute: host.name
        action: insert
      - key: service.instance.id
        value: "${HOSTNAME}"
        action: insert
      
      # Derive attributes from existing ones
      - key: service.namespace
        from_attribute: k8s.namespace.name
        action: insert
```

---

## Transform Processor: Advanced Transformations

The transform processor uses OTTL (OpenTelemetry Transformation Language) for complex data manipulation.

> Start with `attributes` and `filter` first. Reach for `transform` when rules become too complex.

### Basic Transformations

```yaml
processors:
  transform:
    trace_statements:
      # Rename spans
      - context: span
        statements:
          - set(name, "user_action") where name == "POST /api/users"
          - set(name, "product_view") where name == "GET /api/products"
      
      # Add computed attributes
      - context: span
        statements:
          - set(attributes["request.size"], "large") where attributes["http.request.body.size"] > 1000000
          - set(attributes["response.category"], "success") where attributes["http.status_code"] < 400
```

### Complex Business Logic

```yaml
processors:
  transform:
    trace_statements:
      # Extract user tier from custom headers
      - context: span
        statements:
          - set(attributes["user.tier"], "premium") where attributes["http.request.header.x-user-tier"] == "premium"
          - set(attributes["user.tier"], "standard") where attributes["http.request.header.x-user-tier"] == "standard"
      
      # Calculate request priority
      - context: span
        statements:
          - set(attributes["request.priority"], "high") where attributes["user.tier"] == "premium" and attributes["http.method"] == "POST"
          - set(attributes["request.priority"], "low") where attributes["user.tier"] == "standard" and attributes["http.method"] == "GET"
```

---

## Processor Ordering Matters

Processors run in the order they're listed. This order can significantly impact results.

### Good Ordering Example

```yaml
processors:
  # 1. First, add resource information
  resource:
    attributes:
      - key: environment
        value: production
        action: insert
  
  # 2. Then filter based on resource attributes
  filter:
    traces:
      span:
        - 'resource.attributes["environment"] == "test"'  # Remove test data
  
  # 3. Add span attributes
  attributes:
    actions:
      - key: processed_by
        value: collector
        action: insert
  
  # 4. Finally, batch for export
  batch:
    timeout: 1s

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resource, filter, attributes, batch]  # Order matters!
      exporters: [jaeger]
```

### Why This Order Works

1. **Resource first** - Establishes service context
2. **Filter second** - Removes unwanted data early (saves processing)
3. **Attributes third** - Adds context to remaining data
4. **Batch last** - Groups final data for export

---

## Real-World Processor Combinations

### Production-Ready Pipeline

```yaml
processors:
  # Resource identification
  resource:
    attributes:
      - key: deployment.environment
        value: production
        action: insert
      - key: service.team
        value: platform
        action: insert
  
  # Cost optimization
  filter/noise-reduction:
    traces:
      span:
        - 'name matches ".*health.*"'
        - 'attributes["http.status_code"] == 404'
        - 'duration < 1000000'  # < 1ms
  
  # Business context
  attributes/business-context:
    actions:
      - key: business.critical
        value: "true"
        action: insert
        include:
          match_type: strict
          services: ["payment-service", "user-service"]
  
  # Sampling for high-volume endpoints
  filter/sampling:
    traces:
      span:
        - 'name == "GET /api/search" and attributes["http.status_code"] < 400 and TraceID() % 10 != 0'  # Keep 10%
  
  # Efficient batching
  batch:
    timeout: 2s
    send_batch_size: 2048

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resource, filter/noise-reduction, attributes/business-context, filter/sampling, batch]
      exporters: [jaeger, otlp/dash0]
```

---

## Performance and Memory Considerations

### Memory-Efficient Processing

```yaml
processors:
  # Batch early to reduce memory usage
  batch/early:
    timeout: 500ms
    send_batch_size: 512
  
  # Filter before expensive operations
  filter/early:
    traces:
      span:
        - 'name matches ".*debug.*"'
  
  # Transform only what's needed
  transform/minimal:
    trace_statements:
      - context: span
        statements:
          - set(attributes["processed"], "true") where attributes["important"] == "true"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [filter/early, transform/minimal, batch/early]  # Filter first, transform minimally
      exporters: [jaeger]
```

### High-Throughput Configuration

```yaml
processors:
  batch/high-throughput:
    timeout: 100ms  # Shorter timeout
    send_batch_size: 4096  # Larger batches
    send_batch_max_size: 8192
  
  # Minimal processing for high volume
  attributes/minimal:
    actions:
      - key: processed_at
        value: "${env:HOSTNAME}"
        action: insert
```

---

## Debugging Processors

### Using Logging Exporter for Debugging

```yaml
processors:
  # Your processors
  attributes:
    actions:
      - key: debug.processed
        value: "true"
        action: insert

exporters:
  # Debug what processors are doing
  logging/debug:
    loglevel: debug
  
  # Your real exporter
  jaeger:
    endpoint: jaeger:14250

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [attributes]
      exporters: [logging/debug, jaeger]  # See processed data
```

### Processor Metrics

```yaml
service:
  telemetry:
    metrics:
      address: 0.0.0.0:8888  # Collector's own metrics
      level: detailed
```

Then check metrics:
```bash
curl http://localhost:8888/metrics | grep processor
```

---

## What We're Taking Into Day 18

Today we learned how to **transform** data in the Collector pipeline:

**Key concepts:**
- **Batch processor** for efficient export (essential for production)
- **Attributes processor** for adding business context
- **Filter processor** for cost optimization and noise reduction
- **Processor ordering** matters for performance and correctness

**Practical skills:**
- Configuring processors for production workloads
- Combining processors for complex data transformations
- Optimizing processor performance and memory usage

**Tomorrow (Day 18) we'll learn about **Exporters** and how they send processed data to multiple backends and implement multi-backend strategies.

See you on Day 18!