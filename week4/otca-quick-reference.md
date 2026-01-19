# OpenTelemetry Certification Quick Reference

> **Purpose**: Fast lookup for definitions, defaults, and configurations. For exam strategy and practice, see [Exam Prep Guide](./otca-exam-prep.md).

---

## If You Remember Nothing Else...

1. **service.name is a resource attribute**, not a span attribute
2. **Propagators ≠ Exporters** - Propagators handle context (headers), exporters send telemetry to backends
3. **Links ≠ Parent/Child** - Links relate spans across traces; parent/child is hierarchical within a trace
4. **Tail sampling is typically Collector-side**, not SDK (SDK does head-based sampling)
5. **High-cardinality attributes destroy metrics backends** - Never use trace_id, user_id, etc. as metric labels
6. **Counters are monotonic** - Use UpDownCounter if values can decrease
7. **Batch processor is in the SDK**, not just the Collector (though Collector has it too)
8. **Context propagation happens at span creation**, not at export time
9. **Environment variables have lower priority** than programmatic resource configuration
10. **Extensions don't process telemetry** - They provide operational capabilities (health checks, pprof, etc.)

---

## Three Signals

### Traces
- Show request flow through distributed systems
- Components: Trace ID → Spans → Attributes/Events
- Parent-child relationships form the trace tree

### Metrics
- **Counter**: Monotonic, only increases (requests_total, bytes_sent)
- **UpDownCounter**: Can increase/decrease (active_connections, queue_size)
- **Histogram**: Distribution of values (request_duration, response_size)
- **Gauge**: Current value at a point in time (cpu_temperature, memory_usage)

### Logs
- Discrete events with timestamps
- Can be correlated to traces via trace_id/span_id

---

## Core Data Model

| Component | Purpose | Example |
|-----------|---------|---------|
| **Resource** | Entity producing telemetry | service.name, host.name, deployment.environment |
| **Instrumentation Scope** | Library that created telemetry | name, version |
| **Attributes** | Key-value context | http.request.method, db.system |
| **Events** | Time-stamped occurrences | exceptions, cache hits |
| **Links** | Relationships between spans | batch job → triggering requests |
| **Baggage** | Cross-cutting context propagated with requests | tenant_id, user_tier (low-cardinality only!) |

---

## API vs SDK

- **API**: Language-specific interfaces for instrumentation (stable, vendor-neutral)
- **SDK**: Implementation that processes and exports data (configurable, pluggable)
- **Separation**: Instrument once, swap backends without code changes

---

## Sampler Behaviors in One Glance

| Sampler | Behavior | Use Case |
|---------|----------|----------|
| AlwaysOn | Sample 100% | Development, debugging |
| AlwaysOff | Sample 0% | Disable tracing |
| TraceIdRatioBased | Probabilistic (e.g., 10%) | Production cost control |
| ParentBased | Inherit parent's decision | Consistent distributed traces |

**Key**: Head-based (SDK, at span creation) vs Tail-based (Collector, after trace completion)

---

## Context Propagation

**In-process**: Thread-local or async-local storage
**Cross-process**: HTTP headers (traceparent, tracestate)
**Baggage**: Low-cardinality cross-cutting concerns (tenant_id, user_tier)

**Standards**: W3C Trace Context (default), B3, Jaeger

---

## Collector Pipeline Skeleton

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  memory_limiter:
    limit_mib: 512
    check_interval: 1s
  batch:
    timeout: 1s
    send_batch_size: 1024

exporters:
  otlp:
    endpoint: http://backend:4317
  logging:
    loglevel: debug

extensions:
  health_check:
    endpoint: 0.0.0.0:13133
  zpages:
    endpoint: 0.0.0.0:55679

service:
  extensions: [health_check, zpages]
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp, logging]
```

**Processor order rule**: memory_limiter first, batch last

---

## Deployment Patterns

| Pattern | Deployment | Benefits | Use Case |
|---------|-----------|----------|----------|
| **Agent** | One per host (DaemonSet) | Low latency, host metrics | High-volume apps |
| **Gateway** | Centralized instances | Policy enforcement, cost control | Complex transformations |
| **Hybrid** | Agents + Gateway | Best of both | Production recommended |

---

## Semantic Conventions

### Resource Attributes (entity-level)
- `service.name` (required)
- `service.version`
- `deployment.environment` (prod, staging, dev)
- `host.name`, `host.id`

### Span Attributes (request-level)
- `http.request.method` (GET, POST) - stable HTTP semconv v1.x
- `http.response.status_code` (200, 404)
- `db.system` (postgresql, mysql)
- `db.statement` (SQL query)
- `server.address`, `server.port` (peer service info)
- `network.peer.address` (IP address)

**Note**: Prefer `server.address` when you know the logical remote service (for service graphs)

### Span Kinds
- CLIENT: Outgoing request
- SERVER: Incoming request
- INTERNAL: Internal operation
- PRODUCER: Message producer
- CONSUMER: Message consumer

---

## OTTL Quick Reference

**Contexts**: resource, scope, span, metric, datapoint, log

**Common Functions**:
```yaml
# Set attribute
set(attributes["key"], "value")

# Delete attribute
delete_key(attributes, "key")

# Conditional
set(attributes["env"], "prod") where service.name == "api"

# String operations
Concat([attributes["method"], " ", attributes["path"]], "")
```

---

## Environment Variables Cheat Sheet

```bash
# Service identity
OTEL_SERVICE_NAME=my-service
OTEL_RESOURCE_ATTRIBUTES=service.version=1.0.0,deployment.environment=prod

# OTLP endpoint
OTEL_EXPORTER_OTLP_ENDPOINT=http://collector:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_EXPORTER_OTLP_HEADERS="authorization=Bearer token"

# Sampling
OTEL_TRACES_SAMPLER=traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1  # 10%

# Batch processor
OTEL_BSP_SCHEDULE_DELAY=5000  # ms
OTEL_BSP_MAX_QUEUE_SIZE=2048
OTEL_BSP_MAX_EXPORT_BATCH_SIZE=512

# Propagators
OTEL_PROPAGATORS=tracecontext,baggage
```

**Priority**: Env vars (lowest) < Resource detectors < Programmatic config (highest)

---

## Do-Not-Do List

### Cardinality Killers
❌ **Never** use high-cardinality values as metric attributes:
- trace_id, span_id
- user_id, session_id
- request_id, transaction_id
- Full URLs with query params

✅ **Do** use low-cardinality attributes:
- endpoint (templated: `/users/{id}`)
- http_method (GET, POST)
- status_code (200, 404)
- environment (prod, staging)

### Secrets & PII
❌ **Never** put in telemetry:
- Passwords, API keys, tokens
- Credit card numbers, SSNs
- Full email addresses, phone numbers
- JWT tokens in baggage

✅ **Do** redact at Collector with attributes/transform processor

### Context Propagation
❌ **Don't**:
- Create new root spans for outbound calls (breaks traces)
- Put large data in baggage (size limits, propagates everywhere)
- Forget to extract context on inbound requests

✅ **Do**:
- Use current context as parent for child spans
- Keep baggage low-cardinality and small
- Verify traceparent header presence

---

## Collector Components

### Receivers (data in)
- **otlp**: Native OpenTelemetry
- **prometheus**: Scrape metrics
- **filelog**: Parse log files
- **jaeger**: Jaeger traces

### Processors (data transform)
- **memory_limiter**: Prevent OOM (use first!)
- **batch**: Group for efficiency (commonly used in production)
- **attributes**: Add/modify/delete attributes
- **filter**: Drop unwanted data
- **transform**: OTTL transformations

### Exporters (data out)
- **otlp**: Native export
- **prometheus**: Metrics endpoint
- **logging**: Debug to stdout
- **file**: Export to files

### Extensions (operational)
- **health_check**: Liveness/readiness
- **zpages**: Live debugging
- **pprof**: Go profiling

---

## Common Issues → Quick Fixes

| Symptom | Most Likely Cause | Fix |
|---------|------------------|-----|
| service.name="unknown_service" | Resource not configured | Set OTEL_SERVICE_NAME or OTEL_RESOURCE_ATTRIBUTES |
| Fragmented traces | Context propagation broken | Check traceparent header injection/extraction |
| Spans dropped | Queue overflow or memory limit | Increase queue size, check exporter performance |
| No DB spans (auto-instr) | Library not supported | Check instrumentation library compatibility |
| High cardinality explosion | Wrong metric attributes | Remove high-cardinality labels (user_id, trace_id) |
| Export failures | Backend connectivity | Check endpoint, auth, network |

---

## Security Checklist

✅ Use TLS/mTLS for OTLP endpoints
✅ Redact PII at Collector (attributes/transform processor)
✅ Authenticate exporters (API keys, OAuth)
✅ Implement data retention policies
✅ Monitor for anomalies
✅ Use network policies in Kubernetes

---

## Production Best Practices

1. **Always use memory_limiter** (first processor)
2. **Always use batch processor** (last processor, before export)
3. **Configure sending_queue** in exporters (buffer during outages)
4. **Enable retry_on_failure** (handle transient failures)
5. **Monitor Collector health** (metrics on port 8888)
6. **Use agent + gateway pattern** (production recommended)
7. **Implement proper sampling** (cost control)
8. **Follow semantic conventions** (interoperability)
9. **Test context propagation** (distributed tracing)
10. **Plan for scale** (horizontal scaling, load balancing)

---

**Last updated**: January 2026
**Exam version**: OTCA (OpenTelemetry Certified Associate)
