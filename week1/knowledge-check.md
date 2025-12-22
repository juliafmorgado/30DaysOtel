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

A) Monitoring is for logs, observability is for metrics  
B) Monitoring tells you *what* is broken, observability lets you ask *why*  
C) Monitoring is for production, observability is for development  
D) There is no difference, they're the same thing  

<details>
<summary>Show answer</summary>

**Answer: B**

Monitoring typically answers predefined questions ("Is CPU > 80%?"). Observability lets you explore and ask new questions you didn't anticipate ("Why is this specific user's checkout flow slow?").

</details>

---

### Question 2
**A distributed request flows through Payment Service → Config Service → Database. The total request takes 1200ms. Which signal tells you WHERE most of the time was spent?**

A) Metrics  
B) Traces  
C) Logs  
D) All three equally  

<details>
<summary>Show answer</summary>

**Answer: B**

**Traces** show the timeline of a single request across services. Metrics tell you *when* something is slow (aggregate patterns). Logs tell you *what* error occurred (event details). But only traces show you *where* in the request flow the time was spent.

</details>

---

### Question 3
**You see this in your metrics: `payment_latency_p95 = 2.1s` (normally 300ms). What should you do FIRST?**

A) Restart the payment service  
B) Check logs for errors in the payment service  
C) Pull sample traces from that time window to see what's slow  
D) Scale up the payment service instances  

<details>
<summary>Show answer</summary>

**Answer: C**

Metrics tell you **when** something is wrong. Traces tell you **where**. Logs tell you **what**. The workflow is: metrics (detect) → traces (locate) → logs (explain). Pull traces first to see which part of the request is actually slow (could be a downstream dependency, not the payment service itself).

</details>

---

### Question 4
**What's the main problem with relying only on logs to debug distributed systems?**

A) Logs are too expensive to store  
B) Logs don't capture timing information  
C) Without correlation IDs, you can't reconstruct which logs belong to the same request  
D) Logs can't capture errors  

<details>
<summary>Show answer</summary>

**Answer: C**

Logs from different services are stored separately. Without a shared identifier (trace ID), you don't know which logs belong to the same user request. You end up grepping millions of log lines trying to manually piece together a story.

</details>

---

## Section 2: Traces and Spans (Day 4)

### Question 5
**Which statement about spans is TRUE?**

A) A span represents an entire distributed trace  
B) A span represents one timed operation within a trace  
C) Spans can only be created automatically by instrumentation libraries  
D) All spans in a trace must be from the same service  

<details>
<summary>Show answer</summary>

**Answer: B**

A span is one timed unit of work (e.g., "HTTP request", "database query", "validate payment"). A trace is a collection of related spans. Spans can be created automatically (auto-instrumentation) or manually. Spans in a trace can come from multiple services (that's distributed tracing).

</details>

---

### Question 6
**Look at this trace structure:**

```
Trace abc123 (1200ms)
└─ POST /pay (1200ms)           [span-001, parent: null]
   ├─ Validate input (5ms)      [span-002, parent: span-001]
   ├─ Call Config (900ms)       [span-003, parent: span-001]
   │  └─ DB query (850ms)       [span-004, parent: span-003]
   └─ Process payment (50ms)    [span-005, parent: span-001]
```

**What is the `parent_span_id` of the "DB query" span?**

A) `null`  
B) `span-001`  
C) `span-003`  
D) `span-004`  

<details>
<summary>Show answer</summary>

**Answer: C**

The DB query span's parent is the "Call Config" span (span-003), because Config Service made the database call. Parent-child relationships show the call hierarchy.

</details>

---

### Question 7
**A developer is debugging a slow API endpoint. With auto-instrumentation, they see the request took 500ms, but the single database call within it only took 50ms. What is the most likely reason for the 450ms gap?**

A) The trace is broken  
B) Unexplained time (framework overhead, serialization, business logic not instrumented)  
C) Network latency  
D) The database query is lying about its duration  

<details>
<summary>Show answer</summary>

**Answer: B**

The 450ms is **unexplained time**—work that happened in the parent span but wasn't captured by child spans. This is usually:
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
B) Attributes describe the operation; resources describe the service/host  
C) Attributes are optional; resources are required  
D) Attributes are for traces; resources are for metrics  

<details>
<summary>Show answer</summary>

**Answer: B**

**Span attributes** describe the specific operation:
- `http.method = "POST"`
- `db.statement = "SELECT * FROM users"`
- `user.id = "12345"`

**Resource attributes** describe who created the span:
- `service.name = "payment-service"`
- `service.version = "2.3.1"`
- `k8s.pod.name = "payment-7d8f9-abc12"`

Resources are attached to all spans from that service.

</details>

---

### Question 9
**Look at this waterfall chart:**

```
POST /pay (1000ms)    |████████████████████|
├─ Step A (100ms)     |██|
├─ Step B (200ms)     |    ████|
└─ Step C (300ms)     |        ██████|
```

**What can you conclude about Steps A, B, and C?**

A) They ran in parallel  
B) They ran sequentially (one after another)  
C) Steps B and C ran in parallel  
D) The trace is broken  

<details>
<summary>Show answer</summary>

**Answer: B**

The bars don't overlap, meaning the operations happened one after another (sequential). If they overlapped on the timeline, they'd be parallel. Also notice: 100ms + 200ms + 300ms = 600ms, but the parent is 1000ms. The other 400ms is unexplained time (framework overhead, business logic, etc.).

</details>

---

## Section 3: Semantic Conventions (Day 5)

### Question 10
**Why do semantic conventions exist?**

A) To make OpenTelemetry code look cleaner  
B) To ensure spans from different services/languages can be queried consistently  
C) To reduce the size of telemetry data  
D) They're optional best practices, not really necessary  

<details>
<summary>Show answer</summary>

**Answer: B**

Without conventions, one service might use `request_method`, another `http.method`, another `method`. You can't write one query that works everywhere. Semantic conventions standardize attribute names so telemetry is interoperable.

</details>

---

### Question 11
**Which of these follows OpenTelemetry semantic conventions for an HTTP request?**

A) `method: "post"`, `path: "/users"`, `status: "200"`  
B) `http.method: "POST"`, `http.route: "/users"`, `http.status_code: 200`  
C) `request.method: "POST"`, `request.path: "/users"`, `response.code: 200`  
D) `httpMethod: "POST"`, `httpRoute: "/users"`, `statusCode: 200`  

<details>
<summary>Show answer</summary>

**Answer: B**

Semantic conventions specify:
- `http.method` (uppercase: GET, POST, PUT)
- `http.route` (route pattern, not full URL)
- `http.status_code` (integer, not string)

Notice the pattern: `namespace.attribute_name` (all lowercase with underscores).

</details>

---

### Question 12
**You're instrumenting a payment processing function. Which attributes follow best practices?**

A) 
```javascript
span.setAttribute('amount', 49.99);
span.setAttribute('currency', 'USD');
```

B) 
```javascript
span.setAttribute('payment.amount', 49.99);
span.setAttribute('payment.currency', 'USD');
```

C) 
```javascript
span.setAttribute('PaymentAmount', 49.99);
span.setAttribute('PaymentCurrency', 'USD');
```

D) 
```javascript
span.setAttribute('payment_amount', 49.99);
span.setAttribute('payment_currency', 'USD');
```

<details>
<summary>Show answer</summary>

**Answer: B**

Follow the semantic convention pattern even for custom attributes:
- Use a namespace (`payment.*` for payment-related attributes)
- Use dot notation (`payment.amount`, not `payment_amount`)
- Use lowercase with underscores within names (`http.status_code`)

This keeps your custom attributes consistent with OpenTelemetry standards.

</details>

---

### Question 13
**What's the difference between high-cardinality and low-cardinality attributes?**

A) High-cardinality attributes are more important  
B) High-cardinality attributes have many unique values; low-cardinality have few  
C) High-cardinality attributes are faster to query  
D) There is no difference  

<details>
<summary>Show answer</summary>

**Answer: B**

**Low cardinality:** `http.method` (GET, POST, PUT, DELETE... ~10 values)  
**High cardinality:** `user.id` (millions of unique users)

High-cardinality attributes are useful for debugging but expensive to store and query at scale. Use them deliberately.

</details>

---

## Section 4: Instrumentation (Day 6)

### Question 14
**What's the difference between auto-instrumentation and manual instrumentation?**

A) Auto-instrumentation is for production; manual is for development  
B) Auto-instrumentation instruments libraries (HTTP, DB); manual instruments your business logic  
C) Auto-instrumentation is always better  
D) They're the same thing, just different names  

<details>
<summary>Show answer</summary>

**Answer: B**

**Auto-instrumentation:** Wraps libraries you already use (Express, PostgreSQL, axios) and creates spans automatically. It sees HTTP requests, database queries, etc.

**Manual instrumentation:** You write code to create spans for your custom business logic (e.g., `validatePayment()`, `calculateRisk()`). Auto-instrumentation can't see your functions.

Production systems need both.

</details>

---

### Question 15
**Look at this code:**

```javascript
app.post('/pay', async (req, res) => {
  validatePayment(req.body);              // Line A
  const risk = calculateRisk(req.body);   // Line B
  await db.query('INSERT INTO ...');      // Line C
  sendEmail(req.body.email);              // Line D
  res.json({ success: true });
});
```

**With only auto-instrumentation enabled, which lines create spans?**

A) All of them  
B) Only Line C (database query)  
C) Lines C and D (database and email)  
D) None of them  

<details>
<summary>Show answer</summary>

**Answer: B**

Only Line C (database query) creates a span automatically, because PostgreSQL instrumentation wraps the database client.

Lines A, B, and D are your custom functions. Auto-instrumentation can't see inside them. You need manual instrumentation to create spans for those operations.

(Line D might create a span if `sendEmail()` uses an HTTP client like axios, which is auto-instrumented. But if it's a custom SMTP implementation, no span.)

</details>

---

### Question 16
**How does auto-instrumentation work under the hood?**

A) It modifies your source code at compile time  
B) It uses monkey-patching to wrap library functions  
C) It runs as a separate process that watches your app  
D) It requires you to manually call instrumentation APIs  

<details>
<summary>Show answer</summary>

**Answer: B**

Auto-instrumentation uses **monkey-patching** (also called wrapping). It intercepts library functions (like `express.get()` or `db.query()`) and wraps them with span creation logic:

```javascript
// Simplified example
const originalQuery = db.query;
db.query = function(sql, params) {
  const span = tracer.startSpan('db.query');
  const result = originalQuery.call(this, sql, params);
  span.end();
  return result;
};
```

Your application code doesn't change. The library's behavior is enhanced at runtime.

</details>

---

### Question 17
**What does this code do?**

```javascript
const span = tracer.startSpan('validate_payment');
span.setAttribute('payment.amount', 49.99);
validatePayment(data);
span.end();
```

A) It automatically instruments the `validatePayment()` function  
B) It manually creates a span around the function call  
C) It sends payment data to the backend  
D) It's invalid code and won't work  

<details>
<summary>Show answer</summary>

**Answer: B**

This is **manual instrumentation**. You're explicitly:
1. Starting a span (`startSpan`)
2. Adding an attribute (`setAttribute`)
3. Running your business logic (`validatePayment`)
4. Ending the span (`end`)

This creates a span that will appear in your trace, showing how long `validatePayment()` took.

</details>

---

### Question 18
**Which statement about context propagation is TRUE?**

A) Context propagation only works within a single service  
B) Context propagation passes trace IDs between services via HTTP headers  
C) Context propagation requires manual code in every service  
D) Context propagation is optional for distributed tracing  

<details>
<summary>Show answer</summary>

**Answer: B**

Context propagation is how trace IDs travel between services. When Payment Service calls Config Service, the trace context is injected into HTTP headers:

```http
GET /config HTTP/1.1
traceparent: 00-abc123-span456-01
            └──┬──┘ └──┬──┘
          trace_id  span_id
```

Config Service extracts this header and continues the trace. This happens automatically with auto-instrumentation.

</details>

---

## Section 5: Practical Scenarios

### Question 19
**You instrument your code and run it, but no traces appear in Jaeger. Which is the LEAST likely cause?**

A) You forgot to start the OpenTelemetry SDK  
B) The trace was sampled out (sampling rate is too low)  
C) The exporter URL is incorrect  
D) You used semantic conventions incorrectly  

<details>
<summary>Show answer</summary>

**Answer: D**

Incorrect semantic conventions (e.g., using `request_method` instead of `http.method`) won't prevent traces from appearing. They just make the attributes inconsistent.

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
POST /checkout (2000ms)
├─ Validate cart (10ms)
├─ Call payment service (1800ms)
│  └─ Charge card (1500ms)
└─ Send receipt (100ms)
```

**The payment service has 300ms unexplained time (1800ms - 1500ms). You add manual instrumentation and find:**

```
POST /checkout (2000ms)
├─ Validate cart (10ms)
├─ Call payment service (1800ms)
│  ├─ Fraud check (250ms)        ← NEW
│  └─ Charge card (1500ms)
└─ Send receipt (100ms)
```

**What was the unexplained 300ms?**

A) Network latency  
B) The fraud check operation that wasn't instrumented before  
C) Database connection time  
D) Framework overhead  

<details>
<summary>Show answer</summary>

**Answer: B**

The 250ms fraud check was business logic that auto-instrumentation couldn't see. Manual instrumentation revealed it. The remaining 50ms (1800 - 250 - 1500) is likely framework overhead or serialization.

This is why manual instrumentation matters—it fills visibility gaps.

</details>

---

### Question 21
**You want to see all database queries across all services that took longer than 1 second. Which query works because of semantic conventions?**

A) `db.query.duration > 1000ms`  
B) `database.statement.time > 1s`  
C) `db.system = "postgresql" AND duration > 1000ms`  
D) `query.execution_time > 1000`  

<details>
<summary>Show answer</summary>

**Answer: C**

Because all services follow semantic conventions:
- Database spans have `db.system` attribute (postgresql, mysql, etc.)
- All spans have a `duration` field
- You can query across all services with one consistent query

Without conventions, every service would use different attribute names, making this query impossible.

</details>

---

### Question 22
**You're setting up OpenTelemetry for the first time. What's the recommended order?**

A) Manual instrumentation → Auto-instrumentation → Configure SDK  
B) Configure SDK → Auto-instrumentation → Manual instrumentation  
C) Auto-instrumentation → Manual instrumentation → Configure SDK  
D) Manual instrumentation → Configure SDK → Auto-instrumentation  

<details>
<summary>Show answer</summary>

**Answer: B**

**Recommended order:**
1. **Configure SDK** (set service name, exporter, sampling)
2. **Enable auto-instrumentation** (get 80% coverage for free)
3. **Add manual instrumentation** (fill gaps in business logic)

This gives you quick wins (auto-instrumentation) before investing time in manual spans.

</details>

---

### Question 23 (Bonus: Code Reading)
**What's wrong with this instrumentation code?**

```javascript
const span = tracer.startSpan('process_order');
span.setAttribute('order.id', order.id);

try {
  processOrder(order);
} catch (error) {
  console.log('Error:', error);
}

span.end();
```

A) Nothing, it's correct  
B) Missing `span.recordException(error)` in the catch block  
C) Should use `startActiveSpan` instead  
D) `span.end()` should be inside the try block  

<details>
<summary>Show answer</summary>

**Answer: B** (and arguably C, but B is more critical)

**Issues:**
1. **No error recording:** When an error occurs, you should call `span.recordException(error)` to attach the error to the span.
2. **No span status:** You should set `span.setStatus({ code: SpanStatusCode.ERROR })` on failure.

**Better version:**
```javascript
const span = tracer.startSpan('process_order');
span.setAttribute('order.id', order.id);

try {
  processOrder(order);
  span.setStatus({ code: SpanStatusCode.OK });
} catch (error) {
  span.recordException(error);  // ← Missing in original
  span.setStatus({ code: SpanStatusCode.ERROR });
  throw error;
} finally {
  span.end();
}
```

Or use `startActiveSpan` for cleaner async handling.

</details>

---

### Question 24 (Bonus: Architecture)
**A trace breaks between Service A and Service B. Service A shows the outbound HTTP call, but Service B doesn't show an incoming request span. What's the most likely cause?**

A) Service B is down  
B) Service B doesn't have OpenTelemetry configured  
C) Network latency  
D) Sampling rate is too low  

<details>
<summary>Show answer</summary>

**Answer: B**

If Service B isn't instrumented (no OpenTelemetry SDK running), it won't:
- Extract the trace context from headers
- Create a span for the incoming request
- Continue the trace

The trace "ends" at Service A's outbound call.

**Other scenarios:**
- Service B has instrumentation but doesn't support the W3C Trace Context format
- Service B's HTTP framework isn't supported by auto-instrumentation

</details>

---

### Question 25 (Bonus: Real-World)
**Your team wants to add observability to a 50-service system. What's the best approach?**

A) Manually instrument every service before deploying  
B) Start with auto-instrumentation on the most critical 5 services, then expand  
C) Wait until you have full manual instrumentation everywhere  
D) Deploy observability to all services at once  

<details>
<summary>Show answer</summary>

**Answer: B**

**Pragmatic approach:**
1. **Start small:** Pick 2-5 high-traffic or critical services
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
| 1 | B | Observability vs Monitoring |
| 2 | B | Traces vs Metrics vs Logs |
| 3 | C | Debugging workflow |
| 4 | C | Logs in distributed systems |
| 5 | B | Spans basics |
| 6 | C | Parent-child relationships |
| 7 | B | Unexplained time |
| 8 | B | Attributes vs Resources |
| 9 | B | Reading waterfall charts |
| 10 | B | Semantic conventions purpose |
| 11 | B | HTTP semantic conventions |
| 12 | B | Custom attribute naming |
| 13 | B | Cardinality |
| 14 | B | Auto vs Manual |
| 15 | B | What auto-instrumentation sees |
| 16 | B | How auto-instrumentation works |
| 17 | B | Manual instrumentation code |
| 18 | B | Context propagation |
| 19 | D | Troubleshooting missing traces |
| 20 | B | Unexplained time discovery |
| 21 | C | Querying with conventions |
| 22 | B | Setup order |
| 23 | B | Error handling in spans |
| 24 | B | Broken trace propagation |
| 25 | B | Rollout strategy |

---

## How did you do?

- **0-10 correct:** Review Week 1 materials, especially Days 4-6
- **11-15 correct:** Good foundation, but revisit semantic conventions and instrumentation
- **16-20 correct:** Solid understanding! Ready for Week 2
- **21-25 correct:** Excellent! You've mastered Week 1 concepts

**Next step:** Move on to Week 2 (OpenTelemetry APIs & SDK) or review any topics where you struggled.

---

**Want more practice?** Try building a simple instrumented app using what you learned in Week 1!
