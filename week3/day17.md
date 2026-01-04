# Day 17 – Processors: Transforming Data in the Pipeline

Yesterday we learned how receivers get data into the Collector. Today we'll explore **processors**, the components that transform, filter, and enhance telemetry data before it gets exported.

> **Working example:** Complete configurations are available in [`examples/day17-processors/`](../examples/day17-processors/)

---

## What We Already Know

From [Day 15](./day15.md), processors are the **middle** of the pipeline. They are where the Collector's real power shines. They can do things the SDK simply cannot.

```
Receivers → Processors → Exporters
              ↓
        "Transform, filter, enhance data..."
```

---

## How Processors Work

Processors run **in order** inside a pipeline. They can:
- add/remove/change attributes
- drop data (filter/sampling)
- reshape data (transform)

They cannot:
- “recover” missing telemetry that was never sent
- change what your app instrumented (they only modify what arrives)

---

## The Essential Processors

### Batch Processor (Most Important)

The batch processor is essential for production deployments. It groups individual telemetry items into batches for efficient export.

> Analogy: Like collecting mail in a bag before going to the post office, instead of making a trip for each letter.

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

**Why Batching Matters**
Without batching: 1000 spans = 1000 network calls with high network overhead and poor performance
With batching: 1000 spans = 10 network calls (100 spans each), much more efficient and better performance

**A Common Mistake: Batch Before Filter**

If you batch first, you may waste memory/CPU batching spans you’ll drop anyway.
Prefer: `filter → attributes/transform → batch`

---

### Attributes Processor: Adding Context

The attributes processor adds, modifies or removes span, metric, and log attributes.

> Analogy: Like adding address labels to packages or removing old shipping stickers.

#### Adding Attributes

```yaml
processors:
  attributes:
    actions:
      - key: environment
        value: production
        action: insert # Add "environment=production" to all telemetry data in this pipeline
      - key: team
        value: platform 
        action: insert # Add "team=platform" to all telemetry data in this pipeline
      - key: region
        value: us-east-1
        action: insert # Add "region=us-east-1" to all telemetry data in this pipeline
```

#### Modifying Existing Attributes

```yaml
processors:
  attributes:
    actions:
      # Rename an attribute (delete + insert)
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

#### Conditional Attribute Changes

```yaml
processors:
  attributes:
    actions:
      # Only add environment=production to payment-service and user-service
      - key: environment
        value: production
        action: insert
        include:
          match_type: strict
          services: ["payment-service", "user-service"]
      
      # Remove debug.info from everything EXCEPT development environment
      - key: debug.info
        action: delete
        exclude:
          match_type: strict
          attributes:
            - key: environment
              value: development
```
Think of it as:
- Include: "Only do this action for these specific things"
- Exclude: "Do this action for everything EXCEPT these specific things"

---

### Filter Processor

The filter processor drops unwanted telemetry to reduce costs and noise.

> Analogy: Like a bouncer at a club that only lets the right data through, blocks the rest.

#### Basic Filtering

```yaml
processors:
  filter:
    traces:
      span:
        # Remove health check spans
        - 'name == "GET /health"'
        - 'name == "GET /ready"'
        
        # Remove 404 errors
        - 'attributes["http.status_code"] == 404'
        
        # Remove very short spans (likely noise)
        - 'duration < 1000000'  # Less than 1ms (nanoseconds)
```
> `attributes[...]` refers to span/log attributes.
> `resource.attributes[...]` refers to service-level metadata (service name, env, k8s info).

#### Advanced Filtering

```yaml
processors:
  filter:
    traces:
      span:
        # Complex conditions
        - 'name == "GET /api/users" and attributes["http.status_code"] >= 400' #Removes GET /api/users spans that failed (400, 404, 500 errors)
        - 'attributes["service.name"] == "test-service"' #Removes all spans from test-service
        
    metrics:
      metric:
        # Remove test metrics
        - 'name == "test.counter"' #Removes any metric named "test.counter"
        - 'HasAttrKeyOnDatapoint("test.label")' #Removes any metric that has a "test.label" attribute
        
    logs:
      log_record:
        # Remove debug logs in production
        - 'severity_text == "DEBUG" and resource.attributes["environment"] == "production"' #Removes DEBUG logs in prod environment
```

#### Cost-Saving Filters

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

### Resource Processor: Service Metadata

The resource processor modifies resource attributes that describe the service itself (service-level metadata). All traces, metrics, and logs get the updated resource info.

- Use **resource processor** for “about the service” (env, cluster, service.team)
- Use **attributes processor** for “about the operation” (http.route, user.id, request.size)

> Analogy: Think of it as: **Resource processor** adds the "return address" to all packages from your service, while **attributes processor** adds labels to individual items inside the packages.

#### Adding Resource Information

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

#### Dynamic Resource Attributes

```yaml
processors:
  resource:
    attributes:
      # Use environment variables
      - key: host.name
        from_attribute: host.name
        action: insert #Copies the value from an existing host.name attribute
      - key: service.instance.id
        value: "${HOSTNAME}"
        action: insert #Gets the value from the HOSTNAME environment variable
      
      # Derive attributes from existing ones
      - key: service.namespace
        from_attribute: k8s.namespace.name
        action: insert #Copies the Kubernetes namespace to a service-level attribute
```
This helps standardize resource attributes across different deployment environments.

---

### Transform Processor: Advanced Transformations

The transform processor uses OTTL (OpenTelemetry Transformation Language) - more on [Day 19](./day19.md) - for complex data manipulation.

> Analogy: Like a smart translator that can rewrite and restructure messages based on complex rules.

> [!IMPORTANT]
> Start with `attributes` and `filter` first. Reach for `transform` when rules become too complex.

#### Basic Transformations

```yaml
processors:
  transform:
    trace_statements:
      # Rename spans
      - context: span
        statements:
          - set(name, "user_action") where name == "POST /api/users" #before span name was POST /api/users, after becomes user_action (more readable)
          - set(name, "product_view") where name == "GET /api/products" #before span name was GET /api/products, after becomes product_view (more readable)
      
      # Add computed attributes (Smart categorization)
      - context: span
        statements:
          - set(attributes["request.size"], "large") where attributes["http.request.body.size"] > 1000000 #If request body >1MB add request.size = "large"
          - set(attributes["response.category"], "success") where attributes["http.status_code"] < 400 #If HTTP status code < 400 add response.category = "success"
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

---

## Debugging Processors

### Using Logging Exporter for Debugging What Processor are Doing

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

**Why This is Useful:**
Problem: "Is my processor actually working?" 
Solution: Send data to both logging (to see it) and your real backend

You can verify:
- Did the processor add the debug.processed attribute?
- Are all spans getting processed?
- Is the data reaching Jaeger correctly?

Once you're confident it's working, remove the logging exporter.

### Processor Metrics

This enables self-monitoring for the Collector, it exposes metrics about its own performance:

```yaml
service:
  telemetry:
    metrics:
      address: 0.0.0.0:8888  #Collector starts monitoring itself and exposes internal metrics on port 8888.
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