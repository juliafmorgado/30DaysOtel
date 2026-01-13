# Day 20 – Deployment & Scaling: Modern Collector Patterns

Yesterday we learned OTTL transformations. Today we'll explore **deployment patterns** using the modern exporter capabilities we learned in [Day 18](./day18.md).

We'll cover deployment patterns AND basic scaling, using the **reliable exporter approach** instead of batch processors.

> **Modern examples:** Deployment configurations with exporter-side batching are available in [`examples/day20-deployment-patterns/`](../examples/day20-deployment-patterns/)

---

## The Big Question: Where Do You Put the Collector?

So far we've learned what the Collector does, but where does it actually run? We have two main choices:

**Option 1: Close to Our Apps (Agent Pattern)**
```
Our App → Collector (same server) → Backend
```

**Option 2: Centralized Location (Gateway Pattern)**  
```
Our App → Centralized Collector → Backend
```

Think of it like mail delivery:
- **Agent Pattern**: Every house has its own mailbox
- **Gateway Pattern**: Everyone drops mail at the central post office

Both work, but for different situations. Let's explore when to use each.

---

## Agent Pattern: Collector Runs With Our App

In the Agent pattern, we run a Collector instance close to our application (same server, same container, or same Kubernetes pod).

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Server 1      │    │   Server 2      │    │   Server 3      │
│                 │    │                 │    │                 │
│ App → Collector │    │ App → Collector │    │ App → Collector │
│        ↓        │    │        ↓        │    │        ↓        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 ↓
                         Backend (Jaeger, Dash0 etc.)
```

### Why Use Agent Pattern?

**Fast and Simple:**
- Our app sends data to `localhost:4318` (super fast)
- No network delays between app and Collector
- If Collector fails, only one app is affected

**Easy to Start With:**
- One Collector per application
- Simple configuration
- Easy to debug problems

### Simple Agent Example

Here's a basic Agent setup using Docker:

```yaml
# docker-compose.yml
version: '3.8'
services:
  # Your application
  my-app:
    image: my-node-app #Runs our Node.js app that generates telemetry data
    environment:
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://collector:4318 #Points to the Collector via http://collector:4318 (HTTP endpoint)
    depends_on:
      - collector #Waits for Collector to start first (depends_on)

  # Collector running as agent (close to app)
  collector:
    image: otel/opentelemetry-collector-contrib:latest #Runs the Collector using the official Docker image
    command: ["--config=/etc/otel-collector-config.yaml"] #Loads configuration from our local agent-config.yaml file
    volumes:
      - ./agent-config.yaml:/etc/otel-collector-config.yaml
    ports: #Exposes both ports for receiving telemetry (gRPC and HTTP)
      - "4317:4317"   # gRPC
      - "4318:4318"   # HTTP
```

**Agent configuration (modern approach):**
```yaml
# agent-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  # Simple processing - no batch processor needed
  attributes:
    actions:
      - key: deployment.environment
        value: production
        action: insert

exporters:
  otlp:
    endpoint: http://jaeger:4317
    tls:
      insecure: true
    # Modern exporter with built-in batching and reliability
    sending_queue:
      enabled: true
      queue_size: 1000
      persistent_storage_enabled: true
    retry_on_failure:
      enabled: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [attributes]  # No batch processor needed
      exporters: [otlp]
```

> **See complete example:** [`agent-config.yaml`](../examples/day20-deployment-patterns/agent-config.yaml)

---

## Gateway Pattern: Centralized Collector

In the Gateway pattern, we run one (or a few) centralized Collectors that receive telemetry from many applications.

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│    App 1    │  │    App 2    │  │    App 3    │
└─────────────┘  └─────────────┘  └─────────────┘
       │                │                │
       └────────────────┼────────────────┘
                        ↓
              ┌─────────────────┐
              │    Gateway      │
              │   Collector     │
              │  (Centralized)  │
              └─────────────────┘
                        ↓
       ┌────────────────┼────────────────┐
       ↓                ↓                ↓
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Backend A  │  │  Backend B  │  │  Backend C  │
└─────────────┘  └─────────────┘  └─────────────┘
```

### Why Use Gateway Pattern?

**Centralized Control:**
- Change configuration in one place
- All apps automatically get updates
- Easier to manage as we grow

**Advanced Processing:**
- Complex transformations (like OTTL from yesterday)
- Send different data to different backends
- Cross-application analysis

**Cost Efficiency:**
- One powerful Collector instead of many small ones
- Better resource utilization
- Easier to monitor and maintain

### Simple Gateway Example

```yaml
# docker-compose.yml
version: '3.8'
services:
  # Two different applications running independently, both send telemetry to the same Collector endpoint
  app1:
    image: my-app-1
    environment:
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://gateway-collector:4318
  
  app2:
    image: my-app-2
    environment:
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://gateway-collector:4318

  # Centralized gateway collector handling telemetry from multiple apps
  gateway-collector:
    image: otel/opentelemetry-collector-contrib:latest
    command: ["--config=/etc/otel-collector-config.yaml"]
    volumes:
      - ./gateway-config.yaml:/etc/otel-collector-config.yaml
    ports:
      - "4317:4317"
      - "4318:4318"
```

**Gateway configuration (modern approach with reliability):**
```yaml
# gateway-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  # Add environment labels to all data
  attributes:
    actions:
      - key: deployment.environment
        value: production
        action: insert
      - key: collector.type
        value: gateway
        action: insert

exporters:
  # Send traces to Jaeger with modern reliability features
  otlp/jaeger:
    endpoint: http://jaeger:4317
    tls:
      insecure: true
    sending_queue:
      enabled: true
      queue_size: 2000
      persistent_storage_enabled: true
    retry_on_failure:
      enabled: true
      max_elapsed_time: 300s
  
  # Send metrics to Prometheus
  prometheus:
    endpoint: "0.0.0.0:8889"
    namespace: "gateway"
    const_labels:
      environment: "production"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [attributes]  # No batch processor needed
      exporters: [otlp/jaeger]
    
    metrics:
      receivers: [otlp]
      processors: [attributes]
      exporters: [prometheus]
```

> **See complete example:** [`gateway-config.yaml`](../examples/day20-deployment-patterns/gateway-config.yaml)

## Modern Collector Reliability (From Day 18)

As we learned in [Day 18](./day18.md), modern Collectors use **exporter-side batching** instead of batch processors for better reliability:

### Key Benefits of Modern Approach

**Data Safety:**
- **Persistent storage** survives Collector crashes
- **100% data recovery** after restarts
- **No batch processor needed** - exporters handle everything

**Simplified Configuration:**
- Fewer components to configure
- Built-in retry logic and queue management
- Better performance with same functionality

### Modern vs Traditional

**Traditional approach (avoid in production):**
```yaml
processors:
  batch:  # Data lost if Collector crashes
    timeout: 1s
    send_batch_size: 1024
exporters:
  otlp:
    endpoint: http://backend:4317
```

**Modern approach (recommended):**
```yaml
processors: []  # Clean and simple
exporters:
  otlp:
    endpoint: http://backend:4317
    sending_queue:
      enabled: true
      persistent_storage_enabled: true  # Survives crashes!
    retry_on_failure:
      enabled: true
```

This modern approach works for **both Agent and Gateway patterns** - the reliability benefits apply everywhere.

---

## When to Use Which Pattern?

### Quick Decision Guide

**Use Agent Pattern when:**
- You're just getting started with OpenTelemetry
- You have one or a few applications
- You want the simplest setup possible
- Low latency is critical
- Each app has different requirements

**Use Gateway Pattern when:**
- You have many applications
- You want centralized control
- You need complex data transformations
- You want to send data to multiple backends
- You want to reduce operational overhead

**For our first OpenTelemetry setup, it's better to start with Agent pattern.** It's simpler and we can always move to Gateway later.

---

## Basic Scaling: What Happens When We Need More?

As our applications grow, we might need more than one Collector. Here are the basic concepts:

### Scaling Agent Pattern

**Problem:** Our app generates too much telemetry for one Collector.

**Solution:** Run multiple Collector instances and load balance between them.

```yaml
# docker-compose.yml with multiple agents
version: '3.8'
services:
  my-app:
    image: my-node-app
    environment:
      # App sends to load balancer (instead of directly to a Collector), which distributes to collectors
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://load-balancer:4318

  # Load balancer (simple nginx) handles distribution
  load-balancer:
    image: nginx
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf #Uses nginx.conf to define load balancing rules
    ports:
      - "4318:4318" #Receives all telemetry from our app on port 4318

  # Two identical Collector instances running the same config, this shares the telemetry load from our app. Both process and export data independently
  collector-1:
    image: otel/opentelemetry-collector-contrib:latest
    volumes:
      - ./agent-config.yaml:/etc/otel-collector-config.yaml

  collector-2:
    image: otel/opentelemetry-collector-contrib:latest
    volumes:
      - ./agent-config.yaml:/etc/otel-collector-config.yaml
```

### Scaling Gateway Pattern

**Problem:** Our centralized Collector gets overwhelmed.

**Solution:** Run multiple Gateway Collectors behind a load balancer.

```yaml
# Multiple gateway collectors
version: '3.8'
services:
  # Apps send to load balancer instead of directly to gateways
  app1:
    environment:
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://gateway-lb:4318

  # Load balancer for gateways (single entry point for all telemetry data). Distributes load across multiple gateway Collectors
  gateway-lb:
    image: nginx
    ports:
      - "4318:4318"

  # Multiple gateway instances - 2 identical gateway Collectors with advanced processing
  gateway-1:
    image: otel/opentelemetry-collector-contrib:latest
    volumes:
      - ./gateway-config.yaml:/etc/otel-collector-config.yaml

  gateway-2:
    image: otel/opentelemetry-collector-contrib:latest
    volumes:
      - ./gateway-config.yaml:/etc/otel-collector-config.yaml
```

### Resource Limits and Memory Management

Always set resource limits to prevent Collectors from using too much memory/CPU. Modern exporters with persistent storage are more memory-efficient:

```yaml
# docker-compose.yml
services:
  collector:
    image: otel/opentelemetry-collector-contrib:latest
    deploy:
      resources:
        limits:
          memory: 512M # Never use more than 512MB of RAM
          cpus: '0.5' # Never use more than 50% of one CPU core
        reservations:
          memory: 256M # Always guarantee 256MB of RAM
          cpus: '0.25' # Always guarantee 25% of one CPU core
```

**Modern exporters help with memory management:**
- **Persistent queues** use disk instead of just memory
- **Intelligent retry** prevents memory buildup
- **Backpressure handling** protects against overload

---

## What's Next?

**Today we learned foundational concepts.** 
In production, we'll encounter more advanced topics like:
- Kubernetes deployments with auto-scaling
- Advanced load balancing strategies  
- Multi-region deployments
- Security and authentication
- Performance optimization

But for now, we have everything we need to deploy and scale Collectors for most use cases!

---

## What We're Taking Into Day 21

Today we learned the practical side of Collector deployment.

**Tomorrow (Day 21)** we'll recap everything we learned in Week 3 -> from Collector architecture to deployment patterns. It's been a long week!

See you on Day 21 for our Week 3 recap!