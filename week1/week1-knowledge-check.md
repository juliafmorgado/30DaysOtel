# Week 1 Knowledge Check: Observability Fundamentals

Test your understanding of the concepts from Week 1 (Days 1-6). This quiz covers observability basics, traces, metrics, logs, spans, semantic conventions, and instrumentation.

**Scoring Guide:**
- 0-10 correct: Review Week 1 materials
- 11-15 correct: Good grasp, but review weak areas
- 16-20 correct: Solid understanding, ready for Week 2
- 21+ correct: Excellent! You've mastered Week 1

---

## Section 1: Observability Basics (Days 1-3)

### Question 1
**What is the primary difference between monitoring and observability?**

A) Monitoring tells you *what* is broken, observability lets you ask *why*  
B) Monitoring is for logs, observability is for metrics  
C) Monitoring is for production, observability is for development  
D) There is no difference, they're the same thing  

<details>
<summary>Show answer</summary>

**Answer: A**

Monitoring typically answers predefined questions ("Is CPU > 80%?"). Observability lets you explore and ask new questions you didn't anticipate ("Why is this specific user's checkout flow slow?").

</details>

---

### Question 2
**A distributed request flows through Order Service → Inventory Service → Database. The total request takes 1200ms. Which signal tells you WHERE most of the time was spent?**

A) Metrics  
B) Logs  
C) Traces  
D) All three equally  

<details>
<summary>Show answer</summary>

**Answer: C**

**Traces** show the timeline of a single request across services. Metrics tell you *when* something is slow (aggregate patterns). Logs tell you *what* error occurred (event details). But only traces show you *where* in the request flow the time was spent.

</details>

---

### Question 3
**You see this in your metrics: `checkout_latency_p99 = 3.5s` (normally 500ms). What should you do FIRST?**

A) Restart the checkout service  
B) Scale up the checkout service instances  
C) Pull sample traces from that time window to see what's slow  
D) Check logs for errors in the checkout service  

<details>
<summary>Show answer</summary>

**Answer: C**

Metrics tell you **when** something is wrong. Traces tell you **where**. Logs tell you **what**. The workflow is: metrics (detect) → traces (locate) → logs (explain). Pull traces first to see which part of the request is actually slow (could be a downstream dependency, not the checkout service itself).

</details>

---

### Question 4
**What's the main problem with relying only on logs to debug distributed systems?**

A) Logs are too expensive to store  
B) Logs don't capture timing information  
C) Logs can't capture errors  
D) Without correlation IDs, you can't reconstruct which logs belong to the same request  

<details>
<summary>Show answer</summary>

**Answer: D**

Logs from different services are stored separately. Without a shared identifier (trace ID), you don't know which logs belong to the same user request. You end up grepping millions of log lines trying to manually piece together a story.

</details>

---

## Section 2: Traces and Spans (Day 4)

### Question 5
**Which statement about spans is TRUE?**

A) A span represents an entire distributed trace  
B) Spans can only be created automatically by instrumentation libraries  
C) All spans in a trace must be from the same service  
D) A span represents one timed operation within a trace  

<details>
<summary>Show answer</summary>

**Answer: D**

A span is one timed unit of work (e.g., "HTTP request", "database query", "validate order"). A trace is a collection of related spans. Spans can be created automatically (auto-instrumentation) or manually. Spans in a trace can come from multiple services (that's distributed tracing).

</details>

---

### Question 6
**Look at this trace structure:**

```
Trace xyz789 (1500ms)
└─ GET /orders (1500ms)          [span-100, parent: null]
   ├─ Check inventory (20ms)     [span-101, parent: span-100]
   ├─ Call shipping (1200ms)     [span-102, parent: span-100]
   │  └─ Calculate rate (1100ms) [span-103, parent: span-102]
   └─ Update status (100ms)      [span-104, parent: span-100]
```

**What is the `parent_span_id` of the "Calculate rate" span?**

A) `null`  
B) `span-100`  
C) `span-102`  
D) `span-103`  

<details>
<summary>Show answer</summary>

**Answer: C**

The "Calculate rate" span's parent is the "Call shipping" span (span-102), because the Shipping Service made the calculation call. Parent-child relationships show the call hierarchy.

</details>

---

### Question 7
**A developer is debugging a slow API endpoint. With auto-instrumentation, they see the request took 800ms, but the single database call within it only took 100ms. What is the most likely reason for the 700ms gap?**

A) The trace is broken  
B) Network latency  
C) The database query is lying about its duration  
D) Unexplained time (framework overhead, serialization, business logic not instrumented)  

<details>
<summary>Show answer</summary>

**Answer: D**

The 700ms is **unexplained time**—work that happened in the parent span but wasn't captured by child spans. This is usually:
- Framework overhead (request parsing, routing)
- Serialization/deserialization
- Business logic that isn't instrumented (custom functions)
- Waiting for thread pools or locks

This is why manual instrumentation matters—it fills these gaps.

</details>

---

### Question 8
**What's the difference between span attributes and resource attributes?**

A) There is no difference, they're the same thing  
B) Attributes are optional; resources are required  
C) Attributes describe the operation; resources describe the service/host  
D) Attributes are for traces; resources are for metrics  

<details>
<summary>Show answer</summary>

**Answer: C**

**Span attributes** describe the specific operation:
- `http.method = "POST"`
- `db.statement = "SELECT * FROM orders"`
- `customer.id = "67890"`

**Resource attributes** describe who created the span:
- `service.name = "order-service"`
- `service.version = "1.5.2"`
- `k8s.pod.name = "order-service-8a3c2-def45"`

Resources are attached to all spans from that service.

</details>

---

### Question 9
**Look at this waterfall chart:**

```
GET /checkout (1500ms)   |████████████████████████|
├─ Task X (200ms)        |████|
├─ Task Y (300ms)        |    ██████|
└─ Task Z (400ms)        |          ████████|
```

**What can you conclude about Tasks X, Y, and Z?**

A) They ran in parallel  
B) Tasks Y and Z ran in parallel  
C) The trace is broken  
D) They ran sequentially (one after another)  

<details>
<summary>Show answer</summary>

**Answer: D**

The bars don't overlap, meaning the operations happened one after another (sequential). If they overlapped on the timeline, they'd be parallel. Also notice: 200ms + 300ms + 400ms = 900ms, but the parent is 1500ms. The other 600ms is unexplained time (framework overhead, business logic, etc.).

</details>

---

## Section 3: Semantic Conventions (Day 5)

### Question 10
**Why do semantic conventions exist?**

A) To make OpenTelemetry code look cleaner  
B) To reduce the size of telemetry data  
C) They're optional best practices, not really necessary  
D) To ensure spans from different services/languages can be queried consistently  

<details>
<summary>Show answer</summary>

**Answer: D**

Without conventions, one service might use `request_method`, another `http.method`, another `method`. You can't write one query that works everywhere. Semantic conventions standardize attribute names so telemetry is interoperable.

</details>

---

### Question 11
**Which of these follows OpenTelemetry semantic conventions for an HTTP request?**

A) `method: "post"`, `path: "/orders"`, `status: "200"`  
B) `request.method: "POST"`, `request.path: "/orders"`, `response.code: 200`  
C) `http.method: "POST"`, `http.route: "/orders"`, `http.status_code: 200`  
D) `httpMethod: "POST"`, `httpRoute: "/orders"`, `statusCode: 200`  

<details>
<summary>Show answer</summary>

**Answer: C**

Semantic conventions specify:
- `http.method` (uppercase: GET, POST, PUT)
- `http.route` (route pattern, not full URL)
- `http.status_code` (integer, not string)

Notice the pattern: `namespace.attribute_name` (all lowercase with underscores).

</details>

---

### Question 12
**You're instrumenting an order processing function. Which attributes follow best practices?**

A) 
```python
span.set_attribute('total', 129.99)
span.set_attribute('currency', 'EUR')
```

B) 
```python
span.set_attribute('order.total', 129.99)
span.set_attribute('order.currency', 'EUR')
```

C) 
```python
span.set_attribute('OrderTotal', 129.99)
span.set_attribute('OrderCurrency', 'EUR')
```

D) 
```python
span.set_attribute('order_total', 129.99)
span.set_attribute('order_currency', 'EUR')
```

<details>
<summary>Show answer</summary>

**Answer: B**

Follow the semantic convention pattern even for custom attributes:
- Use a namespace (`order.*` for order-related attributes)
- Use dot notation (`order.total`, not `order_total`)
- Use lowercase with underscores within names (`http.status_code`)

This keeps your custom attributes consistent with OpenTelemetry standards.

</details>

---

### Question 13
**What's the difference between high-cardinality and low-cardinality attributes?**

A) High-cardinality attributes are more important  
B) High-cardinality attributes are faster to query  
C) There is no difference  
D) High-cardinality attributes have many unique values; low-cardinality have few  

<details>
<summary>Show answer</summary>

**Answer: D**

**Low cardinality:** `http.method` (GET, POST, PUT, DELETE... ~10 values)  
**High cardinality:** `customer.id` (millions of unique customers)

High-cardinality attributes are useful for debugging but expensive to store and query at scale. Use them deliberately.

</details>

---

## Section 4: Instrumentation (Day 6)

### Question 14
**What's the difference between auto-instrumentation and manual instrumentation?**

A) Auto-instrumentation is for production; manual is for development  
B) Auto-instrumentation is always better  
C) They're the same thing, just different names  
D) Auto-instrumentation instruments libraries (HTTP, DB); manual instruments your business logic  

<details>
<summary>Show answer</summary>

**Answer: D**

**Auto-instrumentation:** Wraps libraries you already use (Flask, PostgreSQL, requests) and creates spans automatically. It sees HTTP requests, database queries, etc.

**Manual instrumentation:** You write code to create spans for your custom business logic (e.g., `calculateDiscount()`, `checkInventory()`). Auto-instrumentation can't see your functions.

Production systems need both.

</details>

---

### Question 15
**Look at this code:**

```python
@app.route('/checkout', methods=['POST'])
def checkout():
    verify_payment(request.json)           # Line A
    discount = apply_coupons(request.json) # Line B
    db.execute('INSERT INTO orders ...')   # Line C
    send_sms(request.json['phone'])        # Line D
    return jsonify({'status': 'success'})
```

**With only auto-instrumentation enabled, which lines create spans?**

A) All of them  
B) Lines A and B  
C) Lines C and D  
D) Only Line C (database query)  

<details>
<summary>Show answer</summary>

**Answer: D**

Only Line C (database query) creates a span automatically, because PostgreSQL/MySQL instrumentation wraps the database client.

Lines A, B, and D are your custom functions. Auto-instrumentation can't see inside them. You need manual instrumentation to create spans for those operations.

(Line D might create a span if `send_sms()` uses an HTTP client like `requests`, which is auto-instrumented. But if it's a custom SMS API implementation, no span.)

</details>

---

### Question 16
**How does auto-instrumentation work under the hood?**

A) It modifies your source code at compile time  
B) It runs as a separate process that watches your app  
C) It requires you to manually call instrumentation APIs  
D) It uses monkey-patching to wrap library functions  

<details>
<summary>Show answer</summary>

**Answer: D**

Auto-instrumentation uses **monkey-patching** (also called wrapping). It intercepts library functions (like `flask.route()` or `cursor.execute()`) and wraps them with span creation logic:

```python
# Simplified example
original_execute = cursor.execute
def wrapped_execute(sql, params=None):
    span = tracer.start_span('db.query')
    result = original_execute(sql, params)
    span.end()
    return result
cursor.execute = wrapped_execute
```

Your application code doesn't change. The library's behavior is enhanced at runtime.

</details>

---

### Question 17
**What does this code do?**

```python
with tracer.start_as_current_span('check_inventory'):
    current_span = trace.get_current_span()
    current_span.set_attribute('product.sku', sku)
    available = check_inventory_levels(sku)
```

A) It automatically instruments the `check_inventory_levels()` function  
B) It sends product data to the backend  
C) It's invalid code and won't work  
D) It manually creates a span around the function call  

<details>
<summary>Show answer</summary>

**Answer: D**

This is **manual instrumentation**. You're explicitly:
1. Starting a span (`start_as_current_span`)
2. Getting a reference to it (`get_current_span`)
3. Adding an attribute (`set_attribute`)
4. Running your business logic (`check_inventory_levels`)
5. The span ends automatically when exiting the `with` block

This creates a span that will appear in your trace, showing how long `check_inventory_levels()` took.

</details>

---

### Question 18
**Which statement about context propagation is TRUE?**

A) Context propagation only works within a single service  
B) Context propagation requires manual code in every service  
C) Context propagation is optional for distributed tracing  
D) Context propagation passes trace IDs between services via HTTP headers  

<details>
<summary>Show answer</summary>

**Answer: D**

Context propagation is how trace IDs travel between services. When Order Service calls Shipping Service, the trace context is injected into HTTP headers:

```http
GET /shipping HTTP/1.1
traceparent: 00-xyz789-span102-01
            └──┬──┘ └──┬──┘
          trace_id  span_id
```

Shipping Service extracts this header and continues the trace. This happens automatically with auto-instrumentation.

</details>

---

## Section 5: Practical Scenarios

### Question 19
**You instrument your code and run it, but no traces appear in your observability backend. Which is the LEAST likely cause?**

A) You forgot to start the OpenTelemetry SDK  
B) The trace was sampled out (sampling rate is too low)  
C) The exporter URL is incorrect  
D) You used semantic conventions incorrectly  

<details>
<summary>Show answer</summary>

**Answer: D**

Incorrect semantic conventions (e.g., using `request_type` instead of `http.method`) won't prevent traces from appearing. They just make the attributes inconsistent.

Common causes of missing traces:
- SDK not initialized
- Exporter misconfigured (wrong URL)
- Sampling rate too low (e.g., 0.01 = 1% of traces)
- Network issues between app and backend

</details>

---

### Question 20
**Given this trace:**

```
POST /order (2500ms)
├─ Validate items (15ms)
├─ Call inventory (2200ms)
│  └─ Check stock (1800ms)
└─ Create record (150ms)
```

**The inventory service has 400ms unexplained time (2200ms - 1800ms). You add manual instrumentation and find:**

```
POST /order (2500ms)
├─ Validate items (15ms)
├─ Call inventory (2200ms)
│  ├─ Reserve items (350ms)      ← NEW
│  └─ Check stock (1800ms)
└─ Create record (150ms)
```

**What was the unexplained 400ms?**

A) Network latency  
B) Database connection time  
C) Framework overhead  
D) The item reservation operation that wasn't instrumented before  

<details>
<summary>Show answer</summary>

**Answer: D**

The 350ms reservation operation was business logic that auto-instrumentation couldn't see. Manual instrumentation revealed it. The remaining 50ms (2200 - 350 - 1800) is likely framework overhead or serialization.

This is why manual instrumentation matters—it fills visibility gaps.

</details>

---

### Question 21
**You want to see all database queries across all services that took longer than 2 seconds. Which query works because of semantic conventions?**

A) `db.query.duration > 2000ms`  
B) `database.statement.time > 2s`  
C) `query.execution_time > 2000`  
D) `db.system = "postgresql" AND duration > 2000ms`  

<details>
<summary>Show answer</summary>

**Answer: D**

Because all services follow semantic conventions:
- Database spans have `db.system` attribute (postgresql, mysql, mongodb, etc.)
- All spans have a `duration` field
- You can query across all services with one consistent query

Without conventions, every service would use different attribute names, making this query impossible.

</details>

---

### Question 22
**You're setting up OpenTelemetry for the first time. What's the recommended order?**

A) Manual instrumentation → Auto-instrumentation → Configure SDK  
B) Auto-instrumentation → Manual instrumentation → Configure SDK  
C) Configure SDK → Auto-instrumentation → Manual instrumentation  
D) Manual instrumentation → Configure SDK → Auto-instrumentation  

<details>
<summary>Show answer</summary>

**Answer: C**

**Recommended order:**
1. **Configure SDK** (set service name, exporter, sampling)
2. **Enable auto-instrumentation** (get 80% coverage for free)
3. **Add manual instrumentation** (fill gaps in business logic)

This gives you quick wins (auto-instrumentation) before investing time in manual spans.

</details>

---

### Question 23 (Bonus: Code Reading)
**What's wrong with this instrumentation code?**

```python
span = tracer.start_span('fulfill_order')
span.set_attribute('order.id', order_id)

try:
    fulfill_order(order_id)
except Exception as e:
    print(f'Error: {e}')

span.end()
```

A) Nothing, it's correct  
B) Should use `start_as_current_span` instead  
C) `span.end()` should be inside the try block  
D) Missing `span.record_exception(e)` in the except block  

<details>
<summary>Show answer</summary>

**Answer: D** (and arguably B, but D is more critical)

**Issues:**
1. **No error recording:** When an error occurs, you should call `span.record_exception(e)` to attach the error to the span.
2. **No span status:** You should set `span.set_status(Status(StatusCode.ERROR))` on failure.

**Better version:**
```python
with tracer.start_as_current_span('fulfill_order') as span:
    span.set_attribute('order.id', order_id)
    try:
        fulfill_order(order_id)
        span.set_status(Status(StatusCode.OK))
    except Exception as e:
        span.record_exception(e)  # ← Missing in original
        span.set_status(Status(StatusCode.ERROR))
        raise
```

Using `start_as_current_span` with a context manager is cleaner.

</details>

---

### Question 24 (Bonus: Architecture)
**A trace breaks between Service X and Service Y. Service X shows the outbound HTTP call, but Service Y doesn't show an incoming request span. What's the most likely cause?**

A) Service Y is down  
B) Network latency  
C) Sampling rate is too low  
D) Service Y doesn't have OpenTelemetry configured  

<details>
<summary>Show answer</summary>

**Answer: D**

If Service Y isn't instrumented (no OpenTelemetry SDK running), it won't:
- Extract the trace context from headers
- Create a span for the incoming request
- Continue the trace

The trace "ends" at Service X's outbound call.

**Other scenarios:**
- Service Y has instrumentation but doesn't support the W3C Trace Context format
- Service Y's HTTP framework isn't supported by auto-instrumentation

</details>

---

### Question 25 (Bonus: Real-World)
**Your team wants to add observability to a 30-service system. What's the best approach?**

A) Manually instrument every service before deploying  
B) Wait until you have full manual instrumentation everywhere  
C) Deploy observability to all services at once  
D) Start with auto-instrumentation on the most critical 3-5 services, then expand  

<details>
<summary>Show answer</summary>

**Answer: D**

**Pragmatic approach:**
1. **Start small:** Pick 3-5 high-traffic or critical services
2. **Enable auto-instrumentation:** Get value quickly with minimal effort
3. **Add manual instrumentation:** Fill gaps in business logic as needed
4. **Expand gradually:** Roll out to more services as you learn
5. **Iterate:** Improve instrumentation based on what you learn from traces

Trying to instrument everything perfectly before deploying leads to analysis paralysis. Ship something, learn, iterate.

</details>

---

## Answer Key

| Question | Answer | Topic |
|----------|--------|-------|
| 1 | A | Observability vs Monitoring |
| 2 | C | Traces vs Metrics vs Logs |
| 3 | C | Debugging workflow |
| 4 | D | Logs in distributed systems |
| 5 | D | Spans basics |
| 6 | C | Parent-child relationships |
| 7 | D | Unexplained time |
| 8 | C | Attributes vs Resources |
| 9 | D | Reading waterfall charts |
| 10 | D | Semantic conventions purpose |
| 11 | C | HTTP semantic conventions |
| 12 | B | Custom attribute naming |
| 13 | D | Cardinality |
| 14 | D | Auto vs Manual |
| 15 | D | What auto-instrumentation sees |
| 16 | D | How auto-instrumentation works |
| 17 | D | Manual instrumentation code |
| 18 | D | Context propagation |
| 19 | D | Troubleshooting missing traces |
| 20 | D | Unexplained time discovery |
| 21 | D | Querying with conventions |
| 22 | C | Setup order |
| 23 | D | Error handling in spans |
| 24 | D | Broken trace propagation |
| 25 | D | Rollout strategy |

---

## How did you do?

- **0-10 correct:** Review Week 1 materials, especially Days 4-6
- **11-15 correct:** Good foundation, but revisit semantic conventions and instrumentation
- **16-20 correct:** Solid understanding! Ready for Week 2
- **21-25 correct:** Excellent! You've mastered Week 1 concepts

**Next step:** Move on to Week 2 (OpenTelemetry APIs & SDK) or review any topics where you struggled.

---

**Want more practice?** Try building a simple instrumented app using what you learned in Week 1!
