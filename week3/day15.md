# Day 15 – Collector Architecture: Understanding the Data Processing Pipeline

Welcome to Week 3! After mastering the OpenTelemetry APIs and SDK in Week 2, we're now ready to explore the **OpenTelemetry Collector**, a powerful, standalone service that can receive, process, and export telemetry data.

Think of this as moving from a **personal assistant** (the SDK) to a **full processing center** (the Collector). While the SDK handles telemetry inside your application, the Collector is like having a dedicated team that specializes in collecting, organizing, and distributing telemetry data from many applications.

> **Today's Focus:** Architecture overview only. We'll understand WHAT the Collector is and HOW it's structured, not dive deep into configuration details.

---

## The Problem: SDK Limitations at Scale

In Week 2, we used the SDK to process telemetry. This works great for single applications, but imagine we're running an e-commerce platform with:
- Web frontend (React)
- API server (Node.js)  
- Payment service (Go)
- Inventory service (Python)

**With SDK-only approach:**
- Each service needs its own telemetry configuration
- Want to add a new backend? Update and redeploy all 4 services
- Want to change sampling rates? Update and redeploy all 4 services
- Each service uses its own resources for telemetry processing

---

## The Solution: OpenTelemetry Collector

The Collector is a **standalone service** that acts as a centralized telemetry processing hub. Think of it like the post office. Instead of every person delivering their own mail (data) directly to recipients (backends), everyone drops their mail at the post office and they receive it, process it and export it.

**Before Collector (SDK-only):**
```
Frontend → SDK → Backend
API → SDK → Backend  
Payment → SDK → Backend
Inventory → SDK → Backend
```

**With Collector:**
```
Frontend   → SDK →
API        → SDK →        ┌────────────┐
Payment    → SDK → ─────▶ │  Collector │
Inventory  → SDK →        └────────────┘
                               │
                 ┌─────────────┼─────────────┐
                 │             │             │
              Dash0/Jaeger Dash0/Prometheus  Dash0
              (traces)      (metrics)        (logs)

```

**Key benefits:**
- **Centralized configuration**: Change backends without touching application code
- **Advanced processing**: Complex filtering, transformations, and routing
- **Independent scaling**: Scale telemetry processing separately from apps

> [!IMPORTANT]
> The Collector does not replace the SDK. They work together.
>
> The SDK lives inside your app and does things the Collector can’t:
> - Creates spans, metrics, and logs
> - Handles context propagation
> - Instruments libraries (HTTP, DB, messaging)
> - Knows what is happening inside the code
>
> Without an SDK, the Collector would have nothing to receive from most apps.
>
> The SDK still creates telemetry and sends it out. The Collector receives it, processes it and routes it.

---

## Collector Architecture: The Pipeline Model

The Collector processes data through **pipelines**. Think assembly lines where data flows through stages:

```
Receivers → Processors → Exporters
    ↓           ↓           ↓
  "Receive    "Transform    "Send
   data"       data"       data"
```

### Example data flow:
1. **Receiver** gets telemetry from your Node.js app
2. **Processor** adds environment labels and batches data
3. **Exporter** sends traces to Jaeger and metrics to Prometheus, or everything to Dash0

---

## Receivers: How Data Gets In

Receivers are the **input** side of the Collector, like different types of mailboxes that can accept mail in different formats. Each receiver knows how to understand a specific protocol or format. 

> Sometimes we need different receivers because we might have modern apps sending data via OTLP, legacy apps that only know how to expose Prometheus metrics, 3rd-party services that send data in their own formats etc. So instead of forcing every application to speak the same language, the Collector provides receivers that can understand many different "languages."

### Common receiver types:

**OTLP Receiver** (the native speaker):
```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317 # Port for gRPC protocol
      http:
        endpoint: 0.0.0.0:4318 # Port for HTTP protocol
```
Accepts data from OpenTelemetry SDKs using either gRPC (faster, binary -> like sending a compressed file) or HTTP (easier to debug -> like sending readable text). 

Our Node.js app from Week 2 can send telemetry to either `collector:4317` or `http://collector:4318`.

<details>
<summary><strong>What is OTLP?</strong></summary>

OTLP is the default protocol for OpenTelemetry. It is the standard way to transmit telemetry data between applications, Collectors, and observability backends.

**In practice:**
```
// Week 2: Direct to Jaeger
traceExporter: new OTLPTraceExporter({
  url: "http://localhost:4318/v1/traces"  // Traces sent direct to Jaeger
})

// With Collector: Same code, different URL
traceExporter: new OTLPTraceExporter({
  url: "http://collector:4318/v1/traces"  // Traces sent direct to Collector instead
})
```

OTLP makes your telemetry setup flexible. You can switch from direct-to-backend to using a Collector without changing your application code at all. Only the endpoint URL changes.

</details>

**Prometheus Receiver** (the translator):
```yaml
receivers:
  prometheus:
    config:
      scrape_configs:
        - job_name: 'my-app'
          static_configs:
            - targets: ['localhost:8080']
```
Scrapes metrics from Prometheus endpoints and converts them into OpenTelemetry format.

**Filelog Receiver** (the file reader):
```yaml
receivers:
  filelog:
    include: [/var/log/*.log]
```
Reads logs files from disks and converts into OTel format.

---

## Processors: How Data Gets Transformed

Processors are the **middle** of the pipeline. They can modify, filter, enhance, or reorganize telemetry data before it is exported.

> Raw telemetry data often needs work before it's useful because sometimes we might want to filter out noisy or unimportant traces, or the data is missing context, or it's in an inefficient format or there is sensitive information.

### Common processor types explained:

**Batch Processor** (the "efficiency expert"):
```yaml
processors:
  batch:
    timeout: 1s # Send batch after 1 second
    send_batch_size: 1024 # Or when we have 1024 spans
```
Collects individual spans/metrics/logs and groups them into batches before sending. Without batching, a high-traffic application might make thousands of network calls per second, which is inefficient and can overwhelm backends.

**Attributes Processor** (the labeler):
```yaml
processors:
  attributes:
    actions:
      - key: environment
        value: production
        action: insert # Add the label environment=production to all data
```
Adds, modifies, or removes attributes (labels) on telemetry data.

**Filter Processor**(the bouncer):
```yaml
processors:
  filter:
    traces:
      span:
        - 'attributes["http.status_code"] == 404' # Drop 404 errors to reduce costs
```
Drops unwanted telemetry data based on rules we define. 

---

## Exporters: How Data Gets Out

Exporters are the **output** side of the Collector and they send processed data to backends.

They're like specialized delivery services that know how to deliver packages to different destinations in the format each destination expects.

### Common exporter types explained:

**OTLP Exporter** (the modern standard):
```yaml
exporters:
  otlp:
    endpoint: https://api.dash0.com:4317
    headers:
      authorization: "Bearer your-token"
```
Sends telemetry data using the industry standard OpenTelemetry Protocol (OTLP).

> **OpenTelemetry-Native Backends**
>
> Modern platforms like **Dash0** are built for OpenTelemetry:
>
> - Use standard OTLP (no vendor-specific exporters needed)
> - Understand semantic conventions natively
> - No data transformation required
>
> This is the advantage of the OpenTelemetry ecosystem—native support means simpler configuration.

**Prometheus Exporter** (the metrics specialist):
```yaml
exporters:
  prometheus:
    endpoint: "0.0.0.0:8889"
```
Converts OpenTelemetry metrics into Prometheus format and exposes them on an HTTP endpoint that Prometheus can scrape.

**Logging Exporter** (the debugger's friend):
```yaml
exporters:
  logging:
    loglevel: debug
```
Prints telemetry data to the Collector's console/logs (great for debugging).

---

## Pipelines: Connecting Everything

Pipelines define how receivers, processors, and exporters work together. Each pipeline handles one telemetry type, so they can have completely different processing logic.

> We separate each pipeline because they have different processing needs (traces might need complex filtering, while metrics just need batching), and destinations; they have different scaling needs and it helps isolating problems (if traces pipeline has issues, your metrics and logs keep flowing).

```yaml
service:
  pipelines:
    traces:                    # This pipeline handles trace data
      receivers: [otlp]        # Get traces from OTLP receiver
      processors: [batch]      # Process them with batch processor
      exporters: [jaeger]      # Send them to Jaeger
    
    metrics:                   # This pipeline handles metric data
      receivers: [otlp, prometheus]  # Get metrics from two sources
      processors: [batch, attributes] # Apply two processors in order
      exporters: [prometheus]  # Send them to Prometheus
    
    logs:                      # This pipeline handles log data
      receivers: [otlp, filelog] # Get logs from OTLP and files
      processors: [batch]      # Just batch them
      exporters: [logging]     # Print them to console
```

---

## Complete Example: E-commerce Platform

**Step 1: Define the Components**

**Step 2: Connect Them in Pipelines**

Think of it like:
- First: "Here are all the tools I have available" (receivers, processors, exporters)
- Then: "Here's how I want to connect those tools for each telemetry type" (pipelines)

Here's the complete Collector configuration:

```yaml
receivers: # How data gets in
  otlp:  # Accept OTel data from your app
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317 # Your apps send to this port

processors: # How data gets transformed
  batch: # Batch data for efficiency
    timeout: 1s
  
  attributes: # Add environment labels to all data
    actions:
      - key: environment
        value: production
        action: insert
  
  filter: # Filter out noisy traces to save money
    traces:
      span:
        - 'name == "GET /health"'  # Remove health checks

exporters: # Exporters: How data gets out
  jaeger: # Send traces to Jaeger
    endpoint: jaeger:14250
  
  prometheus: # Expose metrics for Prometheus to scrape
    endpoint: "0.0.0.0:8889"
  
  otlp/dash0: # Send everything to modern observability platform
    endpoint: https://api.dash0.com:4317
    headers:
      authorization: "Bearer token"

service: # Orchestrating everything
  pipelines: # Data processing pipelines
    traces: # Trace pipeline: Filter noise, add labels, send to multiple destinations
      receivers: [otlp]
      processors: [filter, attributes, batch] # Order matters!
      exporters: [jaeger, otlp/dash0]
    
    metrics: # Metrics pipeline: Simple processing, multiple destinations
      receivers: [otlp]
      processors: [attributes, batch]
      exporters: [prometheus, otlp/dash0]
```

This single Collector configuration handles telemetry from dozens of microservices, processes it intelligently, and delivers it to multiple backends, all without any changes to your application code.


---

## Why Use the Collector?

After seeing the architecture, you might wonder: "Why not just use the SDK directly?" 

Let's imagine a scenario where we're running a growing e-commerce platform that sends traces to Jaeger, but we want to add Dash0 for better analytics.

**With SDK-only approach (what we learned in Week 2):**
- Update 4 service configurations
- Redeploy all services
- Test each service individually
- Risk: Deployment issues could break observability

**With Collector (what we're learning this week):**
- Add one exporter to Collector config
- Restart only the Collector
- All services automatically send to both backends
- Risk: Minimal, isolated change

> The Collector transforms observability from a distributed problem (every service for itself) to a centralized solution (intelligent hub) that scales with our organization.

---

## What We're NOT Covering Today

Today is architecture overview only ("what" and "why" before diving into the "how"). This week we'll dive into the detailed implementation.

---

## Key Takeaways



---

## What I'm Taking Into Day 16

**The Collector is a telemetry processing hub:**
- **Each pipeline handles one telemetry type** (traces, metrics, logs) and can be configured independently.
- **Data flows through stages:** Input → Transform → Output, with each stage having a specific responsibility.
- **Components are pluggable:** Mix and match receivers, processors, and exporters like building blocks.
- The Collector transforms OpenTelemetry from "one app → one backend" to "many apps → many backends"

**Tomorrow (Day 16)** we'll dive deep into **Receivers** and learn how to configure different input sources and understand the various protocols and formats the Collector can accept.

See you on Day 16!