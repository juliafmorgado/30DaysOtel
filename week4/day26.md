# Day 26 – Getting Ready for Real Use: Security and Performance Basics

Yesterday we learned what happens when observability systems get overwhelmed. Today we'll learn the basics of making our OpenTelemetry setup secure and performant, whether that's for a side project, a demo, or eventually production.

> **The goal:** Build good habits from the start, so you don't have to fix problems later.

---

## Why Learn This Now?

You might be thinking: "I'm just learning OpenTelemetry, why do I need to worry about security and performance?"

Here's why it matters even for beginners:

- **You accidentally expose sensitive data** when you log passwords in spans
- **Your laptop slows down** when you trace every single request
- **Good habits are easier** to learn from the start than to fix later
- **These concepts come up** in interviews and real projects

**Think of it like learning to drive:** You learn to check mirrors and use turn signals from day one, not after your first accident.

---

## Security: Don't Accidentally Expose Secrets

When you're learning and experimenting, it's easy to accidentally capture sensitive information:

```javascript
// Oops! This captures a password
app.post('/login', (req, res) => {
  const span = trace.getActiveSpan();
  span.setAttributes({
    'user.email': req.body.email,
    'user.password': req.body.password,  // ❌ Don't do this!
    'request.body': JSON.stringify(req.body)  // ❌ This too - it captures everything!
  });
});
```

**Simple Fix: Be Selective About What You Capture**

```javascript
// Better: Only capture safe information
app.post('/login', (req, res) => {
  const span = trace.getActiveSpan();
  span.setAttributes({
    'user.email': req.body.email,
    'login.attempt': 'true',
    'request.method': req.method
    // No passwords, no full request bodies
  });
});
```

### Basic Security Rules

**Safe to capture:**
- User IDs (not usernames if they're sensitive)
- Request methods (GET, POST)
- Response status codes
- Timing information
- Error messages (without sensitive details)

**Never capture:**
- Passwords
- API keys or tokens
- Credit card numbers
- Personal information (unless you know what you're doing)
- Full request/response bodies

### Quick Security Tips

1. **Review your attributes** - Look at what you're actually capturing
2. **Use environment variables** for sensitive config (API keys, endpoints)
3. **Be careful with auto-instrumentation** - It might capture more than you expect
4. **When in doubt, don't log it** - You can always add more later

---

## Performance: Don't Slow Down Your App

### The Problem: Collecting Too Much Telemetry Can Hurt Performance

When you're excited about tracing, it's tempting to trace everything:

```javascript
// This will slow down your app!
app.get('/users', async (req, res) => {
  const users = await User.findAll();
  
  // Creating a span for every user - bad idea!
  users.forEach(user => {
    const span = tracer.startSpan(`process-user-${user.id}`);
    // ... do something with user
    span.end();
  });
});
```

### Simple Fix: Trace Operations, Not Individual Items

```javascript
// Better: One span for the whole operation
app.get('/users', async (req, res) => {
  const span = tracer.startSpan('get-all-users');
  
  const users = await User.findAll();
  span.setAttributes({
    'users.count': users.length,
    'database.operation': 'findAll'
  });
  
  span.end();
});
```

### Performance Best Practices for Beginners

**1. Don't trace everything:**
```javascript
// Good: Trace important operations
app.post('/orders', createOrder);  // ✅ Trace this
app.get('/health', healthCheck);   // ❌ Don't trace this

// Good: Trace business logic
function processPayment() { /* trace this */ }

// Bad: Trace utility functions
function formatDate() { /* don't trace this */ }
```

**2. Use sampling:**
```javascript
// Even for learning, don't trace 100% of requests
const sdk = new NodeSDK({
  sampler: new TraceIdRatioBasedSampler(0.1), // 10% is plenty for learning
});
```

**3. Configure batching:**
```yaml
# In your Collector config
processors:
  batch:
    timeout: 1s
    send_batch_size: 100  # Small batches for learning
```

### When Performance Matters Most

- **Loops:** Never create spans inside loops over many items
- **High-frequency operations:** Database queries, API calls
- **Utility functions:** Date formatting, string manipulation
- **Health checks:** Usually don't need tracing

---

## Putting It Together: A Beginner's Checklist

Before you show your OpenTelemetry project to others:

### Security Basics
- [ ] No passwords or API keys in span attributes
- [ ] No full request/response bodies being logged
- [ ] Reviewed what auto-instrumentation captures
- [ ] Using environment variables for sensitive config

### Performance Basics
- [ ] Not creating spans inside loops
- [ ] Using sampling (even 10-50% is fine for learning)
- [ ] Batch processor configured in Collector
- [ ] Only tracing important operations

---

## Real Example: A Simple Blog API

Let's see how this applies to a basic blog API you might build while learning:

```javascript
// Good observability for a learning project
app.post('/posts', async (req, res) => {
  const span = tracer.startSpan('create-post');
  
  try {
    // ✅ Safe attributes
    span.setAttributes({
      'post.title_length': req.body.title.length,
      'post.category': req.body.category,
      'user.id': req.user.id,
      'http.request.method': req.method
    });
    
    const post = await Post.create({
      title: req.body.title,
      content: req.body.content,
      userId: req.user.id
    });
    
    span.setAttributes({
      'post.id': post.id,
      'database.operation': 'create'
    });
    
    res.json(post);
    span.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    span.setAttributes({
      'error.name': error.name,
      'error.message': error.message  // Safe - no sensitive data
    });
    span.setStatus({ 
      code: SpanStatusCode.ERROR,
      message: error.message 
    });
    res.status(500).json({ error: 'Failed to create post' });
  } finally {
    span.end();
  }
});
```

**What makes this good:**
- No sensitive data captured
- One span per operation (not per post)
- Useful attributes for debugging
- Proper error handling

---

## Common Beginner Mistakes

### Mistake 1: "I'll Add Security Later"
**Problem:** You get used to bad habits and accidentally expose data
**Solution:** Start with good practices from day one

### Mistake 2: "More Tracing = Better Observability"
**Problem:** Your app becomes slow and traces become noisy
**Solution:** Trace important operations, not everything

### Mistake 3: "Auto-instrumentation Handles Everything"
**Problem:** You don't know what's being captured automatically
**Solution:** Review what auto-instrumentation captures and supplement carefully

### Mistake 4: "Default Settings Are Fine"
**Problem:** Defaults often aren't optimized for your use case
**Solution:** Learn basic configuration (sampling, batching)

---

## What I'm Taking into Day 27

Today's key insight: **Good observability habits are easier to learn from the start than to fix later. Even as a beginner, you can build secure and performant observability.**

The two basics to remember:
1. **Security:** Don't accidentally log sensitive data - be selective about attributes
2. **Performance:** Don't trace everything - focus on important operations and use sampling

Tomorrow we'll explore the **OpenTelemetry Operator** - a tool that can help manage many of these concerns automatically in Kubernetes environments.

---

**Learning tip:** Start simple and build good habits. It's better to have basic observability that works reliably than complex observability that captures everything but slows down your app.

**What you'll see:**
- Queue sizes growing continuously
- Memory usage climbing steadily
- Export failure rates increasing
- Batch timeouts triggering frequently

---

## Handling Backpressure: Configuration Strategies

### 1. Optimize Batch Processing

**Problem:** Small batches create too many network calls
```yaml
processors:
  batch:
    timeout: 200ms        # Too frequent
    send_batch_size: 100  # Too small
```

**Solution:** Larger, more efficient batches
```yaml
processors:
  batch:
    timeout: 2s           # Allow more time to fill batches
    send_batch_size: 2048 # Larger batches
    send_batch_max_size: 4096  # Maximum batch size
```

### 2. Implement Queue Management

**Configure sending queues to handle bursts:**
```yaml
exporters:
  otlp:
    endpoint: https://api.backend.com:4317
    sending_queue:
      enabled: true
      num_consumers: 10      # Parallel export workers
      queue_size: 5000       # Buffer size
    retry_on_failure:
      enabled: true
      initial_interval: 1s
      max_interval: 30s
      max_elapsed_time: 300s
```

### 3. Add Circuit Breaker Behavior

**Fail fast when backends are down:**
```yaml
exporters:
  otlp:
    endpoint: https://api.backend.com:4317
    timeout: 10s           # Don't wait forever
    retry_on_failure:
      enabled: true
      max_elapsed_time: 60s  # Give up after 1 minute
```

### 4. Implement Graceful Degradation

**Drop less important data under pressure:**
```yaml
processors:
  # Drop debug logs under high load
  filter/load-shedding:
    logs:
      log_record:
        - 'severity_text == "DEBUG"'
        - 'severity_text == "TRACE"'
  
  # Sample high-volume endpoints more aggressively
  probabilistic_sampler:
    sampling_percentage: 10  # Keep only 10% under load
    
  # Use memory limiter to prevent OOM
  memory_limiter:
    limit_mib: 512
    spike_limit_mib: 128
    check_interval: 5s

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, filter/load-shedding, probabilistic_sampler, batch]
      exporters: [otlp]
```

---

## Dealing with Dropped Spans

### Why Spans Get Dropped

1. **Memory limits exceeded** - Collector runs out of memory
2. **Queue overflow** - More data than queues can hold
3. **Export failures** - Backend rejecting data
4. **Sampling decisions** - Intentionally dropping data
5. **Processing errors** - Malformed data causing drops

### Monitoring Dropped Spans

**Key metrics to track:**
```bash
# Memory limiter drops
curl http://collector:8888/metrics | grep "otelcol_processor_memory_limiter_refused_spans"

# Queue overflow drops
curl http://collector:8888/metrics | grep "otelcol_exporter_queue_capacity"

# Export failures
curl http://collector:8888/metrics | grep "otelcol_exporter_send_failed_spans"

# Processing errors
curl http://collector:8888/metrics | grep "otelcol_processor_refused_spans"
```

### Minimizing Data Loss

**1. Prioritize critical data:**
```yaml
processors:
  # Keep error traces at higher priority
  attributes/priority:
    actions:
      - key: priority
        value: "high"
        action: insert
        include:
          match_type: strict
          attributes:
            - key: http.response.status_code
              value: "5.*"
      - key: priority
        value: "low"
        action: insert
        include:
          match_type: strict
          span_names: ["GET /health", "GET /metrics"]

  # Route high-priority data to separate pipeline
  routing:
    from_attribute: priority
    table:
      - value: high
        exporters: [otlp/critical]
      - value: low
        exporters: [otlp/standard]
```

**2. Implement local buffering:**
```yaml
exporters:
  # Critical data - more resources
  otlp/critical:
    endpoint: https://api.backend.com:4317
    sending_queue:
      queue_size: 10000
      num_consumers: 20
  
  # Standard data - normal resources
  otlp/standard:
    endpoint: https://api.backend.com:4317
    sending_queue:
      queue_size: 2000
      num_consumers: 5
```

**3. Use file-based buffering for critical data:**
```yaml
exporters:
  # Persist critical traces to disk
  file/backup:
    path: /var/lib/otelcol/traces
    rotation:
      max_megabytes: 100
      max_days: 7
  
  otlp/primary:
    endpoint: https://api.backend.com:4317

service:
  pipelines:
    traces/critical:
      receivers: [otlp]
      processors: [filter/critical-only]
      exporters: [otlp/primary, file/backup]  # Dual export
```

---

## Error Handling Strategies

### 1. Categorize Errors by Severity

**Not all errors are equal:**
```yaml
processors:
  attributes/error-classification:
    actions:
      # Critical errors - always keep
      - key: error.severity
        value: "critical"
        action: insert
        include:
          match_type: strict
          attributes:
            - key: http.response.status_code
              value: "5.*"
      
      # Client errors - sample more
      - key: error.severity
        value: "client"
        action: insert
        include:
          match_type: strict
          attributes:
            - key: http.response.status_code
              value: "4.*"
      
      # Timeouts - medium priority
      - key: error.severity
        value: "timeout"
        action: insert
        include:
          match_type: strict
          attributes:
            - key: error.type
              value: "timeout"
```

### 2. Implement Error Rate Limiting

**Prevent error storms from overwhelming systems:**
```yaml
processors:
  # Limit error span rate per service
  groupbytrace:
    wait_duration: 10s
    num_traces: 1000
  
  filter/error-rate-limit:
    traces:
      span:
        # Keep only 1 in 10 client errors per service
        - 'attributes["http.response.status_code"] >= 400 and attributes["http.response.status_code"] < 500 and TraceID() % 10 != 0'
```

### 3. Add Error Context

**Enrich error spans with debugging information:**
```yaml
processors:
  attributes/error-context:
    actions:
      # Add timestamp for error correlation
      - key: error.timestamp
        value: "${env:TIMESTAMP}"
        action: insert
        include:
          match_type: strict
          attributes:
            - key: otel.status_code
              value: "ERROR"
      
      # Add deployment info for error tracking
      - key: deployment.version
        value: "${env:APP_VERSION}"
        action: insert
        include:
          match_type: strict
          attributes:
            - key: otel.status_code
              value: "ERROR"
```

---

## Resource Management

### 1. Set Appropriate Resource Limits

**Prevent resource exhaustion:**
```yaml
# Docker Compose
services:
  collector:
    image: otel/opentelemetry-collector-contrib:latest
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '0.5'
        reservations:
          memory: 512M
          cpus: '0.25'
```

```yaml
# Kubernetes
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
spec:
  template:
    spec:
      containers:
      - name: collector
        image: otel/opentelemetry-collector-contrib:latest
        resources:
          limits:
            memory: "1Gi"
            cpu: "500m"
          requests:
            memory: "512Mi"
            cpu: "250m"
```

### 2. Configure Memory Limiter

**Prevent out-of-memory crashes:**
```yaml
processors:
  memory_limiter:
    limit_mib: 800        # 80% of 1GB limit
    spike_limit_mib: 200  # Allow 200MB spikes
    check_interval: 2s    # Check every 2 seconds

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]  # Memory limiter FIRST
      exporters: [otlp]
```

### 3. Monitor Resource Usage

**Set up alerts for resource exhaustion:**
```yaml
# Prometheus alerts
groups:
  - name: otelcol-resources
    rules:
      - alert: CollectorHighMemory
        expr: process_resident_memory_bytes{job="otelcol"} / 1024 / 1024 > 800
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Collector memory usage is high"
      
      - alert: CollectorHighCPU
        expr: rate(process_cpu_seconds_total{job="otelcol"}[5m]) > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Collector CPU usage is high"
```

---

## Production-Ready Configuration Template

Here's a comprehensive production configuration that handles common issues:

```yaml
extensions:
  health_check:
    endpoint: 0.0.0.0:13133
  
  memory_ballast:
    size_mib: 256  # Reserve memory to prevent GC pressure

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  # 1. Memory protection (MUST be first)
  memory_limiter:
    limit_mib: 800
    spike_limit_mib: 200
    check_interval: 2s
  
  # 2. Load shedding under pressure
  filter/load-shedding:
    traces:
      span:
        # Drop health checks under load
        - 'name matches ".*health.*" and attributes["http.response.status_code"] < 400'
        # Sample high-volume endpoints
        - 'name == "GET /api/search" and TraceID() % 5 != 0'  # Keep 20%
  
  # 3. Error classification
  attributes/error-handling:
    actions:
      - key: error.severity
        value: "critical"
        action: insert
        include:
          match_type: strict
          attributes:
            - key: http.response.status_code
              value: "5.*"
  
  # 4. Efficient batching
  batch:
    timeout: 2s
    send_batch_size: 2048
    send_batch_max_size: 4096

exporters:
  # Primary backend with resilience
  otlp/primary:
    endpoint: https://api.backend.com:4317
    headers:
      authorization: "Bearer ${env:API_TOKEN}"
    timeout: 30s
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 5000
    retry_on_failure:
      enabled: true
      initial_interval: 1s
      max_interval: 30s
      max_elapsed_time: 300s
    compression: gzip
  
  # Backup for critical data
  file/backup:
    path: /var/lib/otelcol/backup
    rotation:
      max_megabytes: 100
      max_days: 3

service:
  extensions: [health_check, memory_ballast]
  
  telemetry:
    logs:
      level: info  # Reduce log noise in production
    metrics:
      address: 0.0.0.0:8888
      level: detailed
  
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, filter/load-shedding, attributes/error-handling, batch]
      exporters: [otlp/primary]
    
    # Separate pipeline for critical data backup
    traces/backup:
      receivers: [otlp]
      processors: [memory_limiter, filter/critical-only, batch]
      exporters: [file/backup]
```

---

## Operational Playbook

### When Collector Memory is High
1. Check memory limiter metrics
2. Reduce batch sizes temporarily
3. Increase sampling rates
4. Scale horizontally if needed

### When Export Failures Spike
1. Check backend health
2. Verify network connectivity
3. Increase retry timeouts
4. Enable backup exporters

### When Queues are Growing
1. Check export rates vs input rates
2. Increase batch sizes
3. Add more export workers
4. Implement load shedding

### When Data is Being Dropped
1. Identify drop reasons from metrics
2. Adjust memory limits
3. Optimize processor configurations
4. Consider horizontal scaling

---

## Tomorrow: Production Best Practices

Today we learned to handle production issues reactively. Tomorrow we'll learn to prevent them proactively with production best practices: security, performance optimization, and monitoring strategies.

**You can now keep observability systems running when everything else is breaking. Next, we'll make sure they're secure and optimized from the start.**

---

*"In production, it's not about building perfect systems - it's about building systems that fail gracefully and recover quickly."*

*Today you learned the art of graceful failure.*