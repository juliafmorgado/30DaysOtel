# Day 19 – OTTL: Advanced Data Transformations

Yesterday we learned about exporters and multi-backend strategies. Today we explore **OTTL (OpenTelemetry Transformation Language)**, this powerful way to modify your telemetry data before it gets exported.

> **Complete examples:** All OTTL configurations discussed today are available in [`examples/day19-ottl/`](../examples/day19-ottl/)

---

## What is OTTL and Why Do You Need It?

Imagine you're collecting traces from your application, but you realize:
- Your span names are too technical: `POST /api/v1/users/create` 
- You want business-friendly names: `user_registration`
- You need to remove sensitive data like passwords from attributes
- You want to add performance categories: "fast", "slow", "critical"

**OTTL (OpenTelemetry Transformation Language) solves these problems.** It's like having a smart filter that can read, modify, and enrich your telemetry data as it flows through the Collector.

**Think of OTTL as "find and replace" on steroids** - but instead of just text, you can transform any part of your telemetry data based on conditions you define.

---

## How OTTL Works: The Basics

OTTL works inside the **Transform processor** in your Collector configuration. Here's the simple pattern:

```yaml
processors:
  transform:
    trace_statements:
      - context: span
        statements:
          - set(name, "user_registration") where name == "POST /api/users"
```

**What this does:**
1. **Looks at each span** (`context: span`)
2. **Finds spans** where the name equals "POST /api/users" (`where name == "POST /api/users"`)
3. **Changes the name** to "user_registration" (`set(name, "user_registration")`)

**The pattern is always:** `FUNCTION(what_to_change, new_value) WHERE condition`

---

## Understanding OTTL Contexts

OTTL can work on different parts of your telemetry data. Think of contexts as "what am I looking at right now?"

**For Traces:**
- `resource` - Information about your service (service name, version)
- `span` - Individual operations (HTTP requests, database calls)

**For Metrics:**
- `resource` - Service information
- `metric` - The metric itself (name, description)
- `datapoint` - Individual metric values

**For Logs:**
- `resource` - Service information  
- `log` - Individual log entries

**Most of the time, you'll work with `span` context** - that's where your application operations live.

---

## The Most Useful OTTL Functions

### 1. set() - Change Values

**What it does:** Changes or adds values to your telemetry data.

**Common uses:**
- Rename spans to be more business-friendly
- Add new attributes based on existing data
- Categorize operations

**Examples:**
```yaml
# Make span names more readable
- set(name, "user_registration") where name == "POST /api/users"

# Add business categories
- set(attributes["business_area"], "payments") where name matches ".*payment.*"

# Add performance labels
- set(attributes["speed"], "slow") where duration > 1000000000  # > 1 second
```

> **See full examples:** [`basic-transformations.yaml`](../examples/day19-ottl/basic-transformations.yaml)

### 2. delete_key() - Remove Sensitive Data

**What it does:** Removes attributes you don't want to keep.

**Common uses:**
- Remove passwords, credit card numbers, API keys
- Clean up debug information in production
- Remove temporary attributes

**Examples:**
```yaml
# Remove sensitive information
- delete_key(attributes, "user.password")
- delete_key(attributes, "credit_card.number")

# Remove debug info in production
- delete_key(attributes, "debug.info") where resource.attributes["environment"] == "production"
```

### 3. String Functions - Text Manipulation

**Concat()** - Combine text:
```yaml
# Create descriptive endpoint names
- set(attributes["endpoint"], Concat([attributes["http.method"], " ", attributes["http.route"]], ""))
```

**Split()** - Break apart text:
```yaml
# Extract domain from email
- set(attributes["user.domain"], Split(attributes["user.email"], "@")[1])
```

**Replace()** - Find and replace text:
```yaml
# Clean up service names
- set(resource.attributes["service.name"], replace_pattern(resource.attributes["service.name"], "[-_]", "."))
```

---

## Real-World OTTL Use Cases

### Use Case 1: Making Spans Business-Friendly

**Problem:** Your spans have technical names like `POST /api/v1/users/create` but you want business names like `user_registration`.

**Solution:** Use OTTL to rename spans based on patterns.

```yaml
statements:
  - set(attributes["business.action"], "user_management") where name matches ".*user.*"
  - set(attributes["business.action"], "payment_processing") where name matches ".*payment.*"
  - set(name, "user_registration") where name == "POST /api/users"
```

> **See complete example:** [`business-logic.yaml`](../examples/day19-ottl/business-logic.yaml)

### Use Case 2: Adding Performance Categories

**Problem:** You want to quickly identify slow operations without looking at raw duration numbers.

**Solution:** Add performance labels based on duration.

```yaml
statements:
  - set(attributes["performance"], "fast") where duration < 100000000      # < 100ms
  - set(attributes["performance"], "normal") where duration < 500000000    # < 500ms  
  - set(attributes["performance"], "slow") where duration >= 500000000     # >= 500ms
```

> **See complete example:** [`performance-classification.yaml`](../examples/day19-ottl/performance-classification.yaml)

### Use Case 3: Extracting User Information

**Problem:** User information is buried in HTTP headers, but you want it as span attributes for easier filtering.

**Solution:** Extract header data into proper attributes.

```yaml
statements:
  - set(attributes["user.id"], attributes["http.request.header.x-user-id"]) where attributes["http.request.header.x-user-id"] != nil
  - set(attributes["user.tier"], attributes["http.request.header.x-user-tier"]) where attributes["http.request.header.x-user-tier"] != nil
```

> **See complete example:** [`data-enrichment.yaml`](../examples/day19-ottl/data-enrichment.yaml)

### Use Case 4: E-commerce Business Intelligence

**Problem:** You have an e-commerce site and want to categorize operations by business value.

**Solution:** Add business context based on operation patterns.

```yaml
statements:
  - set(attributes["business.value"], "high") where name matches ".*(checkout|payment).*"
  - set(attributes["business.value"], "medium") where name matches ".*(cart|basket).*"
  - set(attributes["business.value"], "low") where name matches ".*(browse|search).*"
```

> **See complete example:** [`ecommerce-example.yaml`](../examples/day19-ottl/ecommerce-example.yaml)

---

## Working with Different Types of Data

### Numbers and Math

OTTL can work with numbers and do basic math:

```yaml
# Convert bytes to megabytes
- set(attributes["size.mb"], Int(attributes["size.bytes"]) / 1048576)

# Calculate percentages  
- set(attributes["error.rate"], (Int(attributes["errors"]) * 100) / Int(attributes["total"]))

# Convert nanoseconds to seconds (duration is always in nanoseconds)
- set(attributes["duration.seconds"], duration / 1000000000)
```

### Boolean Logic (True/False Conditions)

You can combine multiple conditions:

```yaml
# Check multiple conditions with AND
- set(attributes["critical.error"], "true") where attributes["http.status_code"] >= 500 and attributes["business.area"] == "payment"

# Check multiple conditions with OR  
- set(attributes["needs.attention"], "true") where duration > 5000000000 or attributes["http.status_code"] >= 500

# Check if value is in a list
- set(attributes["premium.endpoint"], "true") where attributes["http.route"] in ["/api/premium", "/api/vip"]
```

### Working with Text Patterns

OTTL uses "matches" for pattern matching:

```yaml
# Find spans that contain certain words
- set(attributes["area"], "authentication") where name matches ".*login.*"
- set(attributes["area"], "database") where name matches ".*db.*"

# Match specific patterns
- set(attributes["api.version"], "v1") where attributes["http.route"] matches "/api/v1/.*"
```

---

## OTTL for Metrics and Logs

### Transforming Metrics

OTTL can also transform metrics to make them more useful:

```yaml
processors:
  transform/metrics:
    metric_statements:
      - context: metric
        statements:
          # Rename metrics to be more descriptive
          - set(name, "http_requests_total") where name == "http.server.requests"
          
      - context: datapoint  
        statements:
          # Add environment labels to all metrics
          - set(attributes["environment"], resource.attributes["deployment.environment"])
          - set(attributes["service"], resource.attributes["service.name"])
```

> **See complete example:** [`metrics-transformations.yaml`](../examples/day19-ottl/metrics-transformations.yaml)

### Transforming Logs

OTTL is especially powerful for logs because it can extract structured data from unstructured log messages:

```yaml
processors:
  transform/logs:
    log_statements:
      - context: log
        statements:
          # Extract user ID from log message
          - set(attributes["user.id"], ExtractPatterns(body, "user_id=(\\w+)")[0]) where body matches ".*user_id=.*"
          
          # Classify log levels
          - set(severity_text, "ERROR") where body matches ".*ERROR.*"
          - set(severity_text, "WARN") where body matches ".*WARN.*"
```

> **See complete example:** [`logs-transformations.yaml`](../examples/day19-ottl/logs-transformations.yaml)

---

## Performance Tips for OTTL

### Keep It Simple

**Good - Simple and fast:**
```yaml
- set(attributes["priority"], "high") where attributes["user.tier"] == "premium"
```

**Avoid - Complex and slow:**
```yaml  
- set(attributes["category"], "api") where name matches ".*complex.*regex.*pattern.*"
```

**Why?** Simple equality checks (`==`) are much faster than complex pattern matching (`matches`).

### Use Specific Conditions

**Good - Targets specific spans:**
```yaml
- set(attributes["business.area"], "payment") where name == "POST /api/payments" and attributes["http.status_code"] >= 400
```

**Avoid - Processes everything:**
```yaml
- set(attributes["processed"], "true")  # This runs on every single span!
```

**Why?** The more specific your `where` conditions, the less work OTTL has to do.

### Multiple Transform Processors

Instead of one giant transform processor, use multiple smaller ones:

```yaml
processors:
  # First: Add business context
  transform/business:
    trace_statements:
      - context: span
        statements:
          - set(attributes["business.area"], "payments") where name matches ".*payment.*"
  
  # Second: Add performance categories  
  transform/performance:
    trace_statements:
      - context: span
        statements:
          - set(attributes["speed"], "slow") where duration > 1000000000
```

**Why?** This is easier to debug and maintain than one huge processor.

---

## Debugging Your OTTL Transformations

When your OTTL statements don't work as expected, here's how to debug them:

### 1. Add Debug Attributes

Add temporary attributes to see what's happening:

```yaml
statements:
  # Keep the original value for comparison
  - set(attributes["debug.original_name"], name)
  
  # Your transformation
  - set(name, "user_registration") where name == "POST /api/users"
  
  # Mark when transformation was applied
  - set(attributes["debug.transformed"], "true") where name == "user_registration"
```

### 2. Use the Logging Processor

Add logging before and after your transform processor:

```yaml
processors:
  logging/before:
    loglevel: debug
    
  transform/my-transforms:
    # Your OTTL statements here
    
  logging/after:
    loglevel: debug

service:
  pipelines:
    traces:
      processors: [logging/before, transform/my-transforms, logging/after]
```

### 3. Test with Simple Conditions First

Start simple and build up complexity:

```yaml
# Start with this
- set(attributes["test"], "found") where name == "POST /api/users"

# Then add complexity
- set(attributes["test"], "found") where name == "POST /api/users" and attributes["http.status_code"] >= 400
```

> **Complete debugging setup:** [`debug-config.yaml`](../examples/day19-ottl/debug-config.yaml)

---

## When to Use OTTL vs Other Processors

**Use OTTL when you need to:**
- Rename spans based on complex conditions
- Add business context to your telemetry
- Extract data from one attribute to create new attributes
- Remove sensitive information conditionally
- Perform calculations or data enrichment

**Use other processors when you need to:**
- **Attributes processor** - Simple add/delete/update of attributes
- **Resource processor** - Modify resource attributes only
- **Batch processor** - Group telemetry for performance
- **Filter processor** - Drop entire spans/metrics/logs

**OTTL is more powerful but also more complex.** Start with simpler processors and move to OTTL when you need the extra flexibility.

---

## What We're Taking Into Day 20

Today we learned how to transform telemetry data with OTTL:

**Key concepts:**
- **OTTL transforms data** as it flows through the Collector
- **Basic pattern:** `FUNCTION(what, value) WHERE condition`
- **Common functions:** `set()`, `delete_key()`, string manipulation
- **Contexts:** resource, span, metric, datapoint, log

**Practical skills:**
- Making span names business-friendly
- Adding performance categories and business context
- Extracting user information from headers
- Debugging OTTL transformations

**Tomorrow (Day 20):** We'll learn about **Deployment Patterns** - different ways to deploy the Collector in your infrastructure (Agent vs Gateway patterns) and when to use each approach.

The transformation power of OTTL will become even more valuable when we see how to deploy Collectors at scale!