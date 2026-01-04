# Day 20 – Deployment & Scaling: Where to Put Collectors and How to Scale Them

Yesterday we learned OTTL transformations. Today we cover the practical questions: **Where do you deploy Collectors?** and **What happens when you need more than one?**

We'll cover a lot today: deployment patterns AND basic scaling. But don't worry, these are introductory concepts to give us the foundation. Advanced production deployments come later in our OpenTelemetry journey.

> **Simple examples:** Basic deployment configurations are available in [`examples/day20-deployment-patterns/`](../examples/day20-deployment-patterns/)

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
                         Backend (Jaeger, etc.)
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
    image: my-node-app
    environment:
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://collector:4318
    depends_on:
      - collector

  # Collector running as agent (close to app)
  collector:
    image: otel/opentelemetry-collector-contrib:latest
    command: ["--config=/etc/otel-collector-config.yaml"]
    volumes:
      - ./agent-config.yaml:/etc/otel-collector-config.yaml
    ports:
      - "4317:4317"   # gRPC
      - "4318:4318"   # HTTP
```

**Agent configuration (simple):**
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
  batch:
    timeout: 1s
    send_batch_size: 512

exporters:
  otlp:
    endpoint: http://jaeger:4317
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
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
  # Multiple applications
  app1:
    image: my-app-1
    environment:
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://gateway-collector:4318
  
  app2:
    image: my-app-2
    environment:
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://gateway-collector:4318

  # Centralized gateway collector
  gateway-collector:
    image: otel/opentelemetry-collector-contrib:latest
    command: ["--config=/etc/otel-collector-config.yaml"]
    volumes:
      - ./gateway-config.yaml:/etc/otel-collector-config.yaml
    ports:
      - "4317:4317"
      - "4318:4318"
```

**Gateway configuration (more advanced):**
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
  batch:
    timeout: 2s
    send_batch_size: 1024
  
  # Add environment labels to all data
  attributes:
    actions:
      - key: environment
        value: production
        action: insert

exporters:
  # Send traces to Jaeger
  otlp/jaeger:
    endpoint: http://jaeger:4317
    tls:
      insecure: true
  
  # Send metrics to Prometheus
  prometheus:
    endpoint: "0.0.0.0:8889"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [attributes, batch]
      exporters: [otlp/jaeger]
    
    metrics:
      receivers: [otlp]
      processors: [attributes, batch]
      exporters: [prometheus]
```

> **See complete example:** [`gateway-config.yaml`](../examples/day20-deployment-patterns/gateway-config.yaml)

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

### Simple Comparison

| Factor | Agent Pattern | Gateway Pattern |
|--------|---------------|-----------------|
| **Setup Complexity** | ✅ Simple | ❌ More complex |
| **Performance** | ✅ Fastest | ⚠️ Network overhead |
| **Management** | ❌ Many configs | ✅ One config |
| **Processing Power** | ⚠️ Basic | ✅ Advanced |
| **Best for Beginners** | ✅ Yes | ⚠️ Later |

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
      # App sends to load balancer, which distributes to collectors
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://load-balancer:4318

  # Load balancer (simple nginx)
  load-balancer:
    image: nginx
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    ports:
      - "4318:4318"

  # Multiple collector instances
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
  # Apps send to load balancer
  app1:
    environment:
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://gateway-lb:4318

  # Load balancer for gateways
  gateway-lb:
    image: nginx
    ports:
      - "4318:4318"

  # Multiple gateway instances
  gateway-1:
    image: otel/opentelemetry-collector-contrib:latest
    volumes:
      - ./gateway-config.yaml:/etc/otel-collector-config.yaml

  gateway-2:
    image: otel/opentelemetry-collector-contrib:latest
    volumes:
      - ./gateway-config.yaml:/etc/otel-collector-config.yaml
```

### Basic High Availability

**Problem:** What if our Collector crashes?

**Solution:** Run backup Collectors and configure failover.

```yaml
# Simple failover configuration
exporters:
  # Primary backend
  otlp/primary:
    endpoint: http://jaeger-primary:4317
    retry_on_failure:
      enabled: true
      max_elapsed_time: 30s
  
  # Backup backend (if primary fails)
  otlp/backup:
    endpoint: http://jaeger-backup:4317

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/primary, otlp/backup]  # Send to both
```

### Resource Limits (Important!)

Always set resource limits to prevent Collectors from using too much memory/CPU:

```yaml
# docker-compose.yml
services:
  collector:
    image: otel/opentelemetry-collector-contrib:latest
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
```

**Why this matters:** Without limits, a Collector processing lots of data can crash our server by using all available memory.

---

## Common Beginner Mistakes

### Port Confusion
```yaml
# Wrong - mixing up gRPC and HTTP ports
my-app:
  environment:
    - OTEL_EXPORTER_OTLP_ENDPOINT=http://collector:4317  # This is gRPC port!

# Right - use correct port for HTTP
my-app:
  environment:
    - OTEL_EXPORTER_OTLP_ENDPOINT=http://collector:4318  # HTTP port
```

### Forgetting Resource Limits
```yaml
# Wrong - no resource limits (can crash your system)
collector:
  image: otel/opentelemetry-collector-contrib:latest

# Right - always set limits
collector:
  image: otel/opentelemetry-collector-contrib:latest
  deploy:
    resources:
      limits:
        memory: 512M
```

### No Monitoring
Always monitor your Collectors! Add basic health checks:

```yaml
# Add to your collector config
extensions:
  health_check:
    endpoint: 0.0.0.0:13133

service:
  extensions: [health_check]
```

Then check: `curl http://collector:13133` should return `{"status":"Server available"}`

---

## What's Next?

**Today we covered the basics of:**
- Where to deploy Collectors (Agent vs Gateway)
- How to scale Collectors (multiple instances, load balancing)
- Basic high availability (failover, backups)
- Resource management and common mistakes

**These are foundational concepts.** In production, we'll encounter more advanced topics like:
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