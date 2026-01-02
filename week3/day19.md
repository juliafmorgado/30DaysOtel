# Day 19 – OTTL: Advanced Data Transformations

Yesterday we learned about exporters and multi-backend strategies. Today we dive deep into **OTTL (OpenTelemetry Transformation Language)** - the powerful language that enables sophisticated data transformations in the Collector.

> **Working example:** Complete OTTL configurations are available in [`examples/day19-ottl/`](../examples/day19-ottl/)

---

## What is OTTL?

OTTL (OpenTelemetry Transformation Language) is a domain-specific language for transforming telemetry data. It's used primarily in the Transform processor to perform complex data manipulations that other processors can't handle.

**Think of OTTL as SQL for telemetry data** - it lets us query, filter, and transform telemetry using a familiar syntax.

---

## OTTL Basics: Contexts and Statements

### Contexts: Where OTTL Operates

OTTL operates on different contexts depending on the telemetry type:

```yaml
processors:
  transform:
    # Trace contexts
    trace_statements:
      - context: resource
        statements: [...]
      - context: scope
        statements: [...]
      - context: span
        statements: [...]
    
    # Metric contexts
    metric_statements:
      - context: resource
        statements: [...]
      - context: metric
        statements: [...]
      - context: datapoint
        statements: [...]
    
    # Log contexts
    log_statements:
      - context: resource
        statements: [...]
      - context: log
        statements: [...]
```

### Basic Statement Structure

OTTL statements follow this pattern:
```
FUNCTION(arguments) WHERE condition
```

Examples:
```yaml
statements:
  - set(name, "user_action") where name == "POST /api/users"
  - set(attributes["priority"], "high") where attributes["user.tier"] == "premium"
  - delete_key(attributes, "sensitive_data")
```

---

## Essential OTTL Functions

### 1. Set Functions: Modifying Data

**set()** - Set a value:
```yaml
statements:
  # Rename spans
  - set(name, "user_registration") where name == "POST /api/users"
  
  # Add computed attributes
  - set(attributes["request.size"], "large") where attributes["http.request.body.size"] > 1000000
  
  # Set status based on conditions
  - set(status.code, 2) where attributes["http.status_code"] >= 500  # STATUS_CODE_ERROR
```

**set_status()** - Set span status:
```yaml
statements:
  - set_status(2, "Request failed") where attributes["http.status_code"] >= 500
  - set_status(1) where attributes["http.status_code"] >= 400  # STATUS_CODE_OK
```

### 2. Delete Functions: Removing Data

**delete_key()** - Remove attributes:
```yaml
statements:
  # Remove sensitive data
  - delete_key(attributes, "user.password")
  - delete_key(attributes, "credit_card.number")
  
  # Remove debug information in production
  - delete_key(attributes, "debug.info") where resource.attributes["environment"] == "production"
```

**delete_matching_keys()** - Remove multiple keys by pattern:
```yaml
statements:
  # Remove all debug attributes
  - delete_matching_keys(attributes, "debug.*")
  
  # Remove all temporary attributes
  - delete_matching_keys(attributes, "temp.*")
```

### 3. String Functions: Text Manipulation

**Concat()** - Combine strings:
```yaml
statements:
  - set(attributes["full_endpoint"], Concat([attributes["http.method"], " ", attributes["http.route"]], ""))
  - set(attributes["user_info"], Concat([attributes["user.id"], ":", attributes["user.tier"]], ""))
```

**Split()** - Split strings:
```yaml
statements:
  # Extract domain from email
  - set(attributes["user.domain"], Split(attributes["user.email"], "@")[1])
  
  # Extract path segments
  - set(attributes["api.version"], Split(attributes["http.route"], "/")[2])
```

**Replace()** - Replace text:
```yaml
statements:
  # Normalize service names
  - set(resource.attributes["service.name"], replace_pattern(resource.attributes["service.name"], "[-_]", "."))
  
  # Clean up URLs
  - set(attributes["http.clean_url"], replace_pattern(attributes["http.url"], "\\?.*", ""))
```

---

## Advanced OTTL Patterns

### Business Logic Transformations

```yaml
processors:
  transform/business-logic:
    trace_statements:
      - context: span
        statements:
          # Categorize business actions
          - set(attributes["business.action"], "user_management") where name matches ".*user.*"
          - set(attributes["business.action"], "payment_processing") where name matches ".*payment.*"
          - set(attributes["business.action"], "order_fulfillment") where name matches ".*order.*"
          
          # Calculate business impact
          - set(attributes["business.impact"], "critical") where attributes["business.action"] == "payment_processing" and attributes["http.status_code"] >= 500
          - set(attributes["business.impact"], "high") where attributes["business.action"] == "user_management" and attributes["http.status_code"] >= 500
          - set(attributes["business.impact"], "medium") where attributes["http.status_code"] >= 400
          - set(attributes["business.impact"], "low") where attributes["http.status_code"] < 400
          
          # Add SLA information
          - set(attributes["sla.target"], 99.9) where attributes["business.action"] == "payment_processing"
          - set(attributes["sla.target"], 99.5) where attributes["business.action"] == "user_management"
          - set(attributes["sla.target"], 95.0) where attributes["business.action"] == "order_fulfillment"
```

### Data Enrichment from Headers

```yaml
processors:
  transform/header-enrichment:
    trace_statements:
      - context: span
        statements:
          # Extract user information from headers
          - set(attributes["user.id"], attributes["http.request.header.x-user-id"]) where attributes["http.request.header.x-user-id"] != nil
          - set(attributes["user.tier"], attributes["http.request.header.x-user-tier"]) where attributes["http.request.header.x-user-tier"] != nil
          - set(attributes["tenant.id"], attributes["http.request.header.x-tenant-id"]) where attributes["http.request.header.x-tenant-id"] != nil
          
          # Extract request context
          - set(attributes["request.id"], attributes["http.request.header.x-request-id"]) where attributes["http.request.header.x-request-id"] != nil
          - set(attributes["correlation.id"], attributes["http.request.header.x-correlation-id"]) where attributes["http.request.header.x-correlation-id"] != nil
          
          # Clean up - remove header attributes after extraction
          - delete_matching_keys(attributes, "http.request.header.*")
```

### Performance Classification

```yaml
processors:
  transform/performance-classification:
    trace_statements:
      - context: span
        statements:
          # Classify response times
          - set(attributes["performance.category"], "excellent") where duration < 100000000  # < 100ms
          - set(attributes["performance.category"], "good") where duration >= 100000000 and duration < 500000000  # 100-500ms
          - set(attributes["performance.category"], "acceptable") where duration >= 500000000 and duration < 1000000000  # 500ms-1s
          - set(attributes["performance.category"], "slow") where duration >= 1000000000 and duration < 5000000000  # 1-5s
          - set(attributes["performance.category"], "critical") where duration >= 5000000000  # > 5s
          
          # Add performance alerts
          - set(attributes["alert.performance"], "true") where attributes["performance.category"] == "critical"
          - set(attributes["alert.performance"], "true") where attributes["performance.category"] == "slow" and attributes["business.impact"] == "critical"
```

---

## Working with Different Data Types

### Numeric Operations

```yaml
statements:
  # Convert string to number and perform calculations
  - set(attributes["http.response.size.mb"], Int(attributes["http.response.size"]) / 1048576) where attributes["http.response.size"] != nil
  
  # Calculate percentages
  - set(attributes["error.rate"], (Int(attributes["error.count"]) * 100) / Int(attributes["total.requests"])) where attributes["total.requests"] != nil
  
  # Round numbers
  - set(attributes["duration.seconds"], duration / 1000000000)  # Convert nanoseconds to seconds
```

### Boolean Logic

```yaml
statements:
  # Complex boolean conditions
  - set(attributes["is.critical.error"], "true") where attributes["http.status_code"] >= 500 and (attributes["business.action"] == "payment_processing" or attributes["business.action"] == "user_management")
  
  # Set flags based on multiple conditions
  - set(attributes["requires.investigation"], "true") where duration > 5000000000 or attributes["http.status_code"] >= 500 or attributes["error.count"] > 0
```

### Array and Map Operations

```yaml
statements:
  # Check if value exists in array
  - set(attributes["is.premium.endpoint"], "true") where attributes["http.route"] in ["/api/premium", "/api/vip", "/api/enterprise"]
  
  # Work with nested attributes
  - set(attributes["database.slow"], "true") where attributes["db.statement"] != nil and duration > 1000000000
```

---

## OTTL for Different Signal Types

### Metrics Transformations

```yaml
processors:
  transform/metrics:
    metric_statements:
      - context: metric
        statements:
          # Rename metrics
          - set(name, "http_requests_total") where name == "http.server.requests"
          
          # Add metric metadata
          - set(description, "Total HTTP requests received") where name == "http_requests_total"
      
      - context: datapoint
        statements:
          # Add labels to all datapoints
          - set(attributes["environment"], resource.attributes["deployment.environment"])
          - set(attributes["service"], resource.attributes["service.name"])
          
          # Normalize label values
          - set(attributes["method"], "GET") where attributes["http.method"] == "get"
          - set(attributes["method"], "POST") where attributes["http.method"] == "post"
```

### Log Transformations

```yaml
processors:
  transform/logs:
    log_statements:
      - context: log
        statements:
          # Extract structured data from log body
          - set(attributes["user.id"], ExtractPatterns(body, "user_id=(\\w+)")[0]) where body matches ".*user_id=.*"
          - set(attributes["request.duration"], ExtractPatterns(body, "duration=(\\d+)ms")[0]) where body matches ".*duration=.*"
          
          # Classify log levels
          - set(severity_text, "ERROR") where body matches ".*ERROR.*"
          - set(severity_text, "WARN") where body matches ".*WARN.*"
          - set(severity_text, "INFO") where body matches ".*INFO.*"
          
          # Add business context
          - set(attributes["business.critical"], "true") where body matches ".*(payment|billing|checkout).*" and severity_text == "ERROR"
```

---

## Performance Considerations

### Efficient OTTL Patterns

**Good - Specific conditions:**
```yaml
statements:
  - set(attributes["priority"], "high") where attributes["user.tier"] == "premium" and attributes["http.method"] == "POST"
```

**Avoid - Expensive operations:**
```yaml
statements:
  # Avoid complex regex in hot paths
  - set(attributes["category"], "api") where name matches ".*api.*"  # Use simpler conditions when possible
```

### Optimizing Transform Processors

```yaml
processors:
  # Process only what's needed
  transform/critical-only:
    trace_statements:
      - context: span
        statements:
          - set(attributes["processed"], "true") where attributes["business.critical"] == "true"
        # Only process critical spans
        
  # Use multiple transform processors for different purposes
  transform/enrichment:
    trace_statements:
      - context: span
        statements:
          - set(attributes["user.tier"], attributes["http.request.header.x-user-tier"])
          
  transform/classification:
    trace_statements:
      - context: span
        statements:
          - set(attributes["business.impact"], "high") where attributes["user.tier"] == "premium"
```

---

## Debugging OTTL Transformations

### Using Logging to Debug

```yaml
processors:
  # Log before transformation
  logging/before:
    loglevel: debug
    sampling_initial: 5
    
  transform/debug:
    trace_statements:
      - context: span
        statements:
          - set(attributes["debug.original_name"], name)  # Keep original for debugging
          - set(name, "user_action") where name == "POST /api/users"
          
  # Log after transformation
  logging/after:
    loglevel: debug
    sampling_initial: 5

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [logging/before, transform/debug, logging/after]
      exporters: [otlp/backend]
```

### Testing OTTL Statements

```yaml
processors:
  transform/test:
    trace_statements:
      - context: span
        statements:
          # Add debug attributes to verify conditions
          - set(attributes["debug.condition_met"], "true") where attributes["http.status_code"] >= 500
          - set(attributes["debug.user_tier"], attributes["user.tier"]) where attributes["user.tier"] != nil
```

---

## Real-World OTTL Examples

### E-commerce Platform Transformations

```yaml
processors:
  transform/ecommerce:
    trace_statements:
      - context: span
        statements:
          # Categorize e-commerce actions
          - set(attributes["ecommerce.action"], "browse") where name matches ".*(product|catalog|search).*"
          - set(attributes["ecommerce.action"], "cart") where name matches ".*(cart|basket).*"
          - set(attributes["ecommerce.action"], "checkout") where name matches ".*(checkout|payment|order).*"
          - set(attributes["ecommerce.action"], "account") where name matches ".*(user|profile|account).*"
          
          # Calculate business value
          - set(attributes["business.value"], "high") where attributes["ecommerce.action"] == "checkout"
          - set(attributes["business.value"], "medium") where attributes["ecommerce.action"] == "cart"
          - set(attributes["business.value"], "low") where attributes["ecommerce.action"] == "browse"
          
          # Extract order information
          - set(attributes["order.value"], attributes["http.request.header.x-order-value"]) where attributes["ecommerce.action"] == "checkout"
          - set(attributes["order.items"], attributes["http.request.header.x-item-count"]) where attributes["ecommerce.action"] == "checkout"
          
          # Set SLA based on business value
          - set(attributes["sla.target"], 99.9) where attributes["business.value"] == "high"
          - set(attributes["sla.target"], 99.5) where attributes["business.value"] == "medium"
          - set(attributes["sla.target"], 95.0) where attributes["business.value"] == "low"
```

---

## What We're Taking Into Day 20

Today we learned the power of OTTL for advanced data transformations:

**Key concepts:**
- **OTTL contexts** (resource, span, metric, datapoint, log)
- **Essential functions** (set, delete, string manipulation)
- **Complex transformations** for business logic and data enrichment
- **Performance optimization** for OTTL statements

**Practical skills:**
- Writing OTTL statements for real-world scenarios
- Debugging OTTL transformations
- Optimizing transform processors for performance

**Tomorrow (Day 20):** We'll learn about **Deployment Patterns** - how to deploy Collectors in different architectures (Agent vs Gateway patterns) for various use cases.

See you on Day 20! 🚀