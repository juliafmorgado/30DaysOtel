# Day 19 – OTTL: Advanced Data Transformations

Yesterday we learned about exporters. Today we explore **OTTL (OpenTelemetry Transformation Language)**, a powerful way to modify our telemetry data before it gets exported.

> **Complete examples:** All OTTL configurations discussed today are available in [`examples/day19-ottl/`](../examples/day19-ottl/)

---

## What is OTTL and Why Do We Need It?

Imagine we're collecting traces from our application, but we realize:
- Our span names are too technical: `POST /api/v1/users/create` 
- We want business-friendly names: `user_registration`
- We need to remove sensitive data like passwords from attributes
- We want to add performance categories: "fast", "slow", "critical"

**OTTL (OpenTelemetry Transformation Language) solves these problems.** It's like having a smart filter that can read, modify, and enrich our telemetry data as it flows through the Collector.

**Think of OTTL as "find and replace" on steroids**, but instead of just text, we can transform any part of our telemetry data based on conditions we define.

> [!Note]
> Don't confuse OTTL and OTLP
> As seen on [Day 15](./day15.md), OTLP is a protocol, a way to send data from A to B. OTTL is a way to modify data.
---

## How OTTL Works: The Basics

OTTL works inside the **Transform processor** in our Collector configuration. Here's the simple pattern:

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

OTTL can work on different parts of our telemetry data. Think of contexts as "what am I looking at right now?"

**For Traces:**
- `resource` - Information about our service (service name, version)
- `span` - Individual operations (HTTP requests, database calls)

**For Metrics:**
- `resource` - Service information
- `metric` - The metric itself (name, description)
- `datapoint` - Individual metric values

**For Logs:**
- `resource` - Service information  
- `log` - Individual log entries

**Most of the time, we'll work with `span` context** -> that's where our application operations live.

---

## The Most Useful OTTL Functions

### 1. set() - Change Values

**What it does:** Changes or adds values to our telemetry data.

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

**What it does:** Removes attributes we don't want to keep.

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
**Problem:** Technical span names like `POST /api/v1/users/create`  
**Solution:** Rename to business terms like `user_registration`  
> **See complete example:** [`business-logic.yaml`](../examples/day19-ottl/business-logic.yaml)

### Use Case 2: Adding Performance Categories  
**Problem:** Raw duration numbers are hard to interpret  
**Solution:** Add labels like "fast", "slow", "critical" based on duration  
> **See complete example:** [`performance-classification.yaml`](../examples/day19-ottl/performance-classification.yaml)

### Use Case 3: Extracting User Information
**Problem:** User data buried in HTTP headers  
**Solution:** Extract headers into proper span attributes for easier filtering  
> **See complete example:** [`data-enrichment.yaml`](../examples/day19-ottl/data-enrichment.yaml)

### Use Case 4: E-commerce Business Intelligence
**Problem:** Need to categorize operations by business value  
**Solution:** Add business context based on operation patterns  
> **See complete example:** [`ecommerce-example.yaml`](../examples/day19-ottl/ecommerce-example.yaml)

---

## Working with Different Types of Data

OTTL can handle various data types and operations:

**Numbers and Math:**
- Convert units: bytes to MB, nanoseconds to seconds
- Calculate percentages and ratios
- Compare values with `>`, `<`, `>=`, `<=`

**Multiple Conditions:**
- Combine with `and`: `where status >= 500 and name == "payment"`
- Combine with `or`: `where duration > 1000 or status >= 400`
- Check lists: `where method in ["POST", "PUT", "DELETE"]`

**Text Patterns:**
- Find text: `where name matches ".*login.*"` (contains "login")
- Pattern matching: `where route matches "/api/v1/.*"` (starts with /api/v1/)

---

## OTTL for Metrics and Logs

OTTL works on all telemetry types, not just traces:
- **Metrics:** Rename metrics, add labels from resource attributes
- **Logs:** Extract structured data from log messages, normalize log levels

> **Complete examples:** [`metrics-transformations.yaml`](../examples/day19-ottl/metrics-transformations.yaml) and [`logs-transformations.yaml`](../examples/day19-ottl/logs-transformations.yaml)


---

## Performance Tips for OTTL

**Keep conditions simple:** Use `==` instead of complex `matches` patterns when possible - it's much faster.

**Be specific:** Target exactly what you want to transform with precise `where` conditions. Avoid transformations that run on every single span.

**Use multiple processors:** Break complex transformations into smaller, focused processors rather than one giant processor.

**The key:** OTTL is powerful, but with great power comes the need for thoughtful conditions!
---

## Debugging Our OTTL Transformations

When our OTTL isn't working as expected:

**1. Use the logging exporter** to see what's happening:
```yaml
exporters:
  logging:
    loglevel: debug

service:
  pipelines:
    traces:
      processors: [transform/my-transforms]
      exporters: [logging, jaeger]  # Send to both
```

**2. Add debug attributes** to track our transformations:
```yaml
statements:
  - set(attributes["debug.original_name"], name)  # Keep original
  - set(name, "user_registration") where name == "POST /api/users"
  - set(attributes["debug.transformed"], "true") where name == "user_registration"
```

**3. Start simple** and add complexity gradually:
```yaml
# Test basic condition first
- set(attributes["test"], "found") where name == "POST /api/users"

# Then add more conditions
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

Today we learned OTTL, and how it lets us modify telemetry data as it flows through the Collector, turning technical spans into business-meaningful information.

**What we can do now:**
- Transform technical span names into business-friendly labels
- Add performance categories based on duration
- Extract important data from HTTP headers
- Debug OTTL transformations when they don't work as expected

**The pattern:** `FUNCTION(what, new_value) WHERE condition` -> simple but powerful!

**Tomorrow (Day 20)** we'll learn about **Deployment & Scaling** (where to put our Collectors and how to handle growth.) 

We now have a complete Collector pipeline: receive data, process it, transform it with OTTL, and export it. Tomorrow we'll see how to deploy this in the real world!