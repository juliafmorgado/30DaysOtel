# OpenTelemetry Certification Quick Reference

## Three Signals of Observability

### Traces
- **Purpose**: Show request flow through distributed systems
- **Components**: Traces → Spans → Attributes/Events
- **Key IDs**: Trace ID (entire request), Span ID (single operation)
- **Relationships**: Parent-child span relationships

### Metrics
- **Purpose**: Numerical measurements over time
- **Types**: 
  - **Counter**: Monotonic, only increases (e.g., requests_total, bytes_sent)
  - **UpDownCounter**: Can increase/decrease (e.g., active_connections, queue_size)
  - **Histogram**: Distribution of values (e.g., request_duration, response_size)
  - **Gauge**: Current value at a point in time (e.g., cpu_temperature, memory_usage)
- **Aggregation**: Sum, count, min, max, percentiles
- **Attributes**: Key-value pairs for dimensionality

### Logs
- **Purpose**: Discrete events with timestamps
- **Structure**: Timestamp, severity, body, attributes
- **Correlation**: Can be linked to traces via trace/span IDs
- **Processing**: Structured vs unstructured

## Core Components

### API vs SDK
- **API**: Language-specific interfaces for instrumentation
- **SDK**: Implementation that processes and exports data
- **Separation**: Allows vendor-neutral instrumentation

### Data Model
- **Resource**: Describes the entity producing telemetry (service.name, host.name)
- **Instrumentation Scope**: Identifies the instrumentation library (name, version)
- **Attributes**: Key-value pairs for context (string, int, bool, array)
- **Events**: Time-stamped occurrences within spans (exceptions, logs)
- **Links**: Relationships between spans (batch processing, async operations)

### Instrumentation Types
- **Automatic**: No code changes, uses agents/libraries
- **Manual**: Explicit instrumentation code
- **Hybrid**: Combination of both approaches

### SDK Pipelines

#### Span Processors
- **Simple**: Exports spans immediately (dev/testing)
- **Batch**: Groups spans for efficient export (production)
- **Custom**: User-defined processing logic

#### Metric Readers
- **Push**: SDK pushes metrics to backend (OTLP)
- **Pull**: Backend scrapes metrics (Prometheus)
- **Periodic**: Exports at regular intervals

#### Log Record Processors
- **Simple**: Immediate export
- **Batch**: Grouped export for efficiency

#### Samplers
- **AlwaysOn**: Sample all traces (100%)
- **AlwaysOff**: Sample no traces (0%)
- **TraceIdRatioBased**: Probabilistic sampling (e.g., 10%)
- **ParentBased**: Follow parent span's sampling decision

### Context Propagation
- **Purpose**: Pass trace context across service boundaries
- **In-process**: Thread-local or async context
- **Cross-process**: HTTP headers (W3C Trace Context), message metadata
- **Standards**: W3C Trace Context, B3, Jaeger
- **Baggage**: User-defined key-value pairs propagated across services
- **Propagators**: Extract and inject context (composite propagator)

### Zero-Code Instrumentation (Agents)
- **Java**: OpenTelemetry Java Agent (JAR attachment)
- **.NET**: OpenTelemetry .NET Automatic Instrumentation
- **Python**: opentelemetry-instrument wrapper
- **Node.js**: @opentelemetry/auto-instrumentations-node
- **Trade-offs**: Easy setup vs limited customization

### Composability & Vendor Neutrality
**Key Principles:**
- **API/SDK Separation**: APIs are stable, SDKs can be swapped
- **Vendor Neutrality**: Same instrumentation code works with any backend
- **Plugin Architecture**: Custom processors, exporters, samplers
- **Language Implementations**: Consistent APIs across languages
- **Extensibility**: Add custom components without forking

**Benefits:**
- No vendor lock-in
- Switch backends without code changes
- Mix and match components
- Community-driven innovation

## Semantic Conventions

### Resource Attributes
- `service.name` (required): Service identifier
- `service.version`: Service version
- `deployment.environment`: Environment (prod, staging, dev)

### Common Span Attributes
- `http.request.method`: HTTP method (GET, POST, etc.)
- `http.response.status_code`: HTTP response code
- `db.system`: Database system (postgresql, mysql, etc.)
- `db.statement`: Database query

### Span Kinds
- `SPAN_KIND_CLIENT`: Outgoing request
- `SPAN_KIND_SERVER`: Incoming request
- `SPAN_KIND_INTERNAL`: Internal operation
- `SPAN_KIND_PRODUCER`: Message producer
- `SPAN_KIND_CONSUMER`: Message consumer

## Signal APIs

### Tracing API
**Creating Spans:**
```python
# Get tracer
tracer = trace.get_tracer(__name__, version="1.0.0")

# Create span
with tracer.start_as_current_span("operation_name") as span:
    span.set_attribute("key", "value")
    span.add_event("event_name", {"detail": "info"})
    span.set_status(Status(StatusCode.OK))
```

**Span Operations:**
- Set attributes: `span.set_attribute(key, value)`
- Add events: `span.add_event(name, attributes, timestamp)`
- Record exceptions: `span.record_exception(exception)`
- Set status: `span.set_status(StatusCode.OK/ERROR, description)`
- Add links: Created at span start, link to other spans

### Metrics API
**Instrument Types:**

**Counter** (monotonic, non-negative):
```python
counter = meter.create_counter("requests", unit="1")
counter.add(1, {"endpoint": "/api", "method": "GET"})
```

**UpDownCounter** (can increase/decrease):
```python
updown = meter.create_up_down_counter("connections", unit="1")
updown.add(1)   # Connection opened
updown.add(-1)  # Connection closed
```

**Histogram** (distribution of values):
```python
histogram = meter.create_histogram("request.duration", unit="ms")
histogram.record(125.5, {"endpoint": "/api"})
```

**Gauge** (synchronous, current value):
```python
gauge = meter.create_gauge("cpu.temperature", unit="C")
gauge.record(72.5, {"core": "0"})
```

**Asynchronous Instruments:**
```python
# Observable Counter (async, monotonic)
def observe_cpu_time(result):
    result.observe(get_cpu_time(), {"cpu": "0"})

meter.create_observable_counter("cpu.time", callbacks=[observe_cpu_time])

# Observable Gauge (async, current value)
meter.create_observable_gauge("memory.usage", callbacks=[observe_memory])

# Observable UpDownCounter (async, can increase/decrease)
meter.create_observable_up_down_counter("queue.size", callbacks=[observe_queue])
```

### Logs API
**Structured Logging:**
```python
logger = logs.get_logger(__name__, version="1.0.0")

# Emit log record
logger.emit(
    body="User login successful",
    severity_number=SeverityNumber.INFO,
    attributes={"user.id": "123", "ip": "192.168.1.1"}
)
```

**Trace Correlation:**
- Logs automatically include trace_id and span_id when emitted within a span
- Enables correlation between logs and traces

## SDK Configuration Methods

### 1. Environment Variables
```bash
export OTEL_SERVICE_NAME=my-service
export OTEL_EXPORTER_OTLP_ENDPOINT=http://collector:4317
```
- Easiest for containerized environments
- No code changes required
- Standard across languages

### 2. Programmatic Configuration
```python
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider

resource = Resource.create({
    "service.name": "my-service",
    "service.version": "1.0.0"
})

provider = TracerProvider(resource=resource)
trace.set_tracer_provider(provider)
```
- Most flexible
- Language-specific
- Runtime configuration

### 3. Configuration Files
```yaml
# YAML configuration (language-dependent)
service:
  name: my-service
  version: 1.0.0
exporter:
  otlp:
    endpoint: http://collector:4317
```
- Structured configuration
- Easy to version control
- Varies by language implementation

### 4. Resource Detection
```python
from opentelemetry.sdk.resources import (
    Resource,
    ProcessResourceDetector,
    OTELResourceDetector
)

resource = Resource.create().merge(
    ProcessResourceDetector().detect()
).merge(
    OTELResourceDetector().detect()
)
```
- Automatic detection of environment
- Cloud provider metadata
- Process and host information

## OpenTelemetry Collector

### Architecture
```
Receivers → Processors → Exporters
```

### Core Receivers
- **otlp**: Native OpenTelemetry protocol
- **jaeger**: Jaeger trace format
- **prometheus**: Prometheus metrics
- **filelog**: Log files

### Essential Processors
- **memory_limiter**: Prevents memory exhaustion
- **batch**: Groups data for efficient export (not being recommended anymore but might still be on the exam)
- **attributes**: Add/modify/remove attributes
- **filter**: Remove unwanted data
- **transform**: Complex transformations with OTTL

### Common Exporters
- **otlp**: Native OpenTelemetry export
- **jaeger**: Jaeger backend
- **prometheus**: Prometheus metrics
- **logging**: Debug output to logs
- **file**: Export to files

### Processor Order
```yaml
processors: [memory_limiter, attributes, filter, batch]
```
**Rule**: Memory limiter first, batch last

## Deployment Patterns

### Agent Pattern
- **Deployment**: One per host (DaemonSet)
- **Benefits**: Low latency, high availability
- **Use case**: High-volume applications

### Gateway Pattern
- **Deployment**: Centralized instances
- **Benefits**: Advanced processing, cost efficiency
- **Use case**: Complex transformations

### Sidecar Pattern
- **Deployment**: One per application pod
- **Benefits**: Isolation, simple configuration
- **Use case**: Specific application needs

## OTTL (OpenTelemetry Transformation Language)

### Contexts
- **resource**: Resource-level attributes
- **scope**: Instrumentation scope
- **span**: Individual span data
- **metric**: Metric data
- **datapoint**: Individual metric points
- **log**: Log record data

### Common Functions
```yaml
# Set attribute value
set(attributes["key"], "value")

# Delete attribute
delete_key(attributes, "key")

# Conditional operations
set(attributes["env"], "prod") where service.name == "api"

# String operations
Concat([attributes["method"], " ", attributes["path"]], "")
```

## Default Ports

### OTLP
- **4317**: OTLP over gRPC
- **4318**: OTLP over HTTP

### Collector Internal
- **8888**: Metrics endpoint
- **13133**: Health check (with health_check extension)
- **55679**: zpages (with zpages extension)

### Legacy Protocols
- **14250**: Jaeger gRPC
- **9411**: Zipkin HTTP

## Environment Variables

### Common SDK Variables
```bash
# Service identification
OTEL_SERVICE_NAME=my-service
OTEL_RESOURCE_ATTRIBUTES=service.version=1.0.0,deployment.environment=production,team=backend

# OTLP over HTTP/protobuf
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_EXPORTER_OTLP_ENDPOINT=http://collector:4318
OTEL_EXPORTER_OTLP_HEADERS="authorization=Bearer token"

# Signal-specific endpoints (optional override)
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://collector:4318/v1/traces
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=http://collector:4318/v1/metrics
OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=http://collector:4318/v1/logs
```

### Sampling Configuration
```bash
OTEL_TRACES_SAMPLER=traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1  # 10% sampling

# Other sampler options:
# always_on, always_off, parentbased_always_on, 
# parentbased_always_off, parentbased_traceidratio
```

### SDK Configuration
```bash
# Span processor
OTEL_BSP_SCHEDULE_DELAY=5000  # Batch delay in ms
OTEL_BSP_MAX_QUEUE_SIZE=2048  # Max queue size
OTEL_BSP_MAX_EXPORT_BATCH_SIZE=512  # Max batch size

# Propagators
OTEL_PROPAGATORS=tracecontext,baggage  # W3C Trace Context + Baggage
```

## Sampling Strategies

### Head-based Sampling
- **Decision point**: At trace start (root span)
- **Types**: Always on/off, probabilistic, rate limiting
- **Pros**: Low overhead, consistent
- **Cons**: Can't sample based on trace content

### Tail-based Sampling
- **Decision point**: After trace completion
- **Types**: Error-based, latency-based, attribute-based
- **Pros**: Content-aware decisions
- **Cons**: Higher overhead, requires buffering

## Configuration Examples

### Basic Collector Pipeline
```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  memory_limiter:
    limit_mib: 512
  batch:
    timeout: 1s
    send_batch_size: 1024

exporters:
  otlp:
    endpoint: http://backend:4317

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp]
```

### Multi-Backend Export
```yaml
exporters:
  jaeger:
    endpoint: http://jaeger:14250
    tls:
      insecure: true
  
  prometheus:
    endpoint: "0.0.0.0:8889"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [jaeger]
    
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheus]
```

## Debugging Commands

### Check Collector Health
```bash
curl http://localhost:13133/
```

### View Collector Metrics
```bash
curl http://localhost:8888/metrics
```

### Test OTLP Endpoint
```bash
curl -X POST http://localhost:4318/v1/traces \
  -H "Content-Type: application/json" \
  -d '{"resourceSpans":[]}'
```

## Common Issues and Solutions

### Missing Traces
1. Check context propagation
2. Verify exporter configuration
3. Check sampling settings
4. Validate network connectivity

### High Memory Usage
1. Add memory_limiter processor
2. Reduce batch sizes
3. Increase export frequency
4. Filter unnecessary data

### Export Failures
1. Check backend connectivity
2. Verify authentication
3. Review retry configuration
4. Check for rate limiting

### Backpressure Issues
1. Enable sending_queue with persistent storage
2. Adjust queue size and retry settings
3. Use memory_limiter to prevent OOM
4. Scale collector horizontally
5. Implement load balancing

## Key Metrics to Monitor

### Collector Health
- `otelcol_process_memory_rss`: Memory usage
- `otelcol_receiver_accepted_spans_total`: Spans received
- `otelcol_exporter_sent_spans_total`: Spans exported
- `otelcol_exporter_send_failed_spans_total`: Export failures
- `otelcol_exporter_queue_size`: Current queue size (backpressure indicator)
- `otelcol_exporter_queue_capacity`: Maximum queue capacity

### Application Metrics
- Request rate and latency
- Error rates by service
- Resource utilization
- Business KPIs

## Security Considerations

### Authentication
- API keys in headers
- mTLS certificates
- OAuth 2.0 tokens
- Basic authentication

### Data Privacy
- Remove PII attributes
- Mask sensitive data
- Implement data retention policies
- Ensure compliance (GDPR, etc.)

### Network Security
- Use TLS for transport
- Validate certificates
- Implement network policies
- Monitor for anomalies

## Best Practices

### Instrumentation
1. Start with automatic instrumentation
2. Add manual instrumentation for business logic
3. Use semantic conventions
4. Implement proper error handling
5. Don't over-instrument

### Collector Configuration
1. Always use memory_limiter
2. Order processors correctly
3. Use batching for efficiency
4. Implement proper retry logic
5. Monitor Collector health
6. Configure backpressure handling (sending_queue)

### Backpressure Management
1. Use exporters with sending_queue enabled
2. Configure queue size based on traffic patterns
3. Enable persistent storage for durability
4. Set appropriate retry_on_failure settings
5. Monitor queue length metrics

### Production Operations
1. Plan for scale from day one
2. Implement proper monitoring
3. Have debugging procedures
4. Plan for disaster recovery
5. Optimize costs continuously
