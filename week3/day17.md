# Day 17 – Processors: Transforming Data in the Pipeline

Yesterday we learned how receivers get data into the Collector. Today we'll explore **processors**, the components that transform, filter, and enhance telemetry data before it gets exported.

> **Working examples:** Complete configurations are available in [`examples/day17-processors/`](../examples/day17-processors/)

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
- "recover" missing telemetry that was never sent
- change what your app instrumented (they only modify what arrives)

---

## The Essential Processors

### The Evolution of Batching in OpenTelemetry

**The Old Way: Batch Processor (Still Works, But Being Replaced)**

For years, the batch processor was the recommended approach for efficient telemetry export. However, OpenTelemetry is now moving batching functionality from processors to exporters for improved reliability ([GitHub issue #8122](https://github.com/open-telemetry/opentelemetry-collector/issues/8122), [#13582](https://github.com/open-telemetry/opentelemetry-collector/issues/13582)).

The problem is that the batch processor collects data in memory and **if the Collector crashes, all data in memory is lost forever**. 

**The New Way: Exporter-Side Batching (we'll explore it tomorrow on Day 18)**

Modern exporters handle batching internally with persistent storage for better reliability.

> **For Learning**: We'll show batch processor examples in the [`examples/`](../examples/day17-processors/) directory to understand concepts, but know that modern deployments are moving away from it.

---

### Attributes Processor: Adding Context

The attributes processor adds, modifies or removes span, metric, and log attributes.

> Analogy: Like adding address labels to packages or removing old shipping stickers.

**Basic example:**
```yaml
processors:
  attributes:
    actions:
      - key: environment
        value: production
        action: insert
```

**Key capabilities:**
- **Add** business context (environment, team, region)
- **Modify** existing attributes (rename, update values)
- **Remove** sensitive data (hash emails, delete debug info)
- **Conditional** processing (only for specific services)

> **See detailed examples:** Check the individual YAML files in this directory for specific processor configurations.

---

### Filter Processor: Removing Unwanted Data

The filter processor drops unwanted telemetry to reduce costs and noise.

> Analogy: Like a bouncer at a club that only lets the right data through.

**Basic example:**
```yaml
processors:
  filter:
    traces:
      span:
        - 'name == "GET /health"'  # Remove health checks
        - 'duration < 1000000'     # Remove spans < 1ms
```

**Key capabilities:**
- **Cost optimization** (remove health checks, sample high-volume endpoints)
- **Noise reduction** (filter debug data, test services)
- **Complex conditions** (combine multiple criteria)
- **Multi-signal** filtering (traces, metrics, logs)

---

### Resource Processor: Service Metadata

The resource processor modifies resource attributes that describe the service itself.

**Key distinction:**
- **Resource processor**: "about the service" (environment, cluster, team)
- **Attributes processor**: "about the operation" (HTTP route, user ID, request size)

**Basic example:**
```yaml
processors:
  resource:
    attributes:
      - key: deployment.environment
        value: production
        action: insert
```

---

### Transform Processor: Advanced Logic

The transform processor uses OTTL (OpenTelemetry Transformation Language) for complex data manipulation.

> **Start simple**: Use `attributes` and `filter` first. Reach for `transform` when rules become too complex.

**When to use transform:**
- Rename spans based on complex conditions
- Add computed attributes
- Extract data from one attribute to create new ones
- Complex business logic transformations

---

## Processor Ordering Matters

Processors run in the order they're listed. **Order significantly impacts results.**

### Optimal Ordering Strategy

```yaml
processors: [resource, filter, attributes, transform]
```

**Why this order works:**
1. **Resource first** - Establishes service context
2. **Filter second** - Removes unwanted data early (saves processing)
3. **Attributes third** - Adds context to remaining data
4. **Transform last** - Complex logic on final dataset

---

## Real-World Patterns

### Production-Ready Pipeline Strategy

```yaml
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [
        resource,              # Service context
        filter/noise-reduction, # Remove noise early
        attributes/business,   # Add business context
        filter/sampling       # Apply sampling
      ]
      exporters: [modern-exporter]  # Handles batching internally
```

### Performance Optimization

**Key principles:**
- **Filter early** to reduce processing load
- **Avoid unnecessary transforms** on high-volume data
- **Use appropriate conditions** to minimize processing
- **Monitor processor metrics** for bottlenecks

---

## Debugging Processors

### See What Processors Do

Add a logging exporter to debug processor behavior:

```yaml
exporters:
  logging/debug:
    loglevel: debug

service:
  pipelines:
    traces:
      processors: [your-processors]
      exporters: [logging/debug, your-real-exporter]
```

### Monitor Performance

Enable Collector self-monitoring:

```yaml
service:
  telemetry:
    metrics:
      address: 0.0.0.0:8888
```

Check processor metrics: `curl http://localhost:8888/metrics | grep processor`

---

## What We're Taking Into Day 18

Today we learned how to **transform** data in the Collector pipeline:

**Key concepts:**
- **Batching evolution** - moving from processors to exporters for reliability
- **Processor types** - attributes, filter, resource, transform
- **Ordering strategy** - resource → filter → attributes → transform
- **Performance optimization** - filter early, process efficiently

**Tomorrow (Day 18)** we'll learn about **Exporters** and how they send processed data to backends and why modern exporters handle batching internally for better reliability.

See you on Day 18!