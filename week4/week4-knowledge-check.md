# Week 4 Knowledge Check: Production OpenTelemetry Mastery

**Time to validate your Week 4 learning!** This knowledge check covers troubleshooting, production patterns, security, and advanced deployment strategies.

**Week 4 Focus Areas:**
- Systematic debugging approaches (Days 22-24)
- Production resilience and scaling (Days 25-27)  
- Complete system integration (Day 28)
- Advanced topics awareness (Days 29-30)

---

## Section 1: The Debugging Trilogy (Days 22-24)

### Question 1: Debugging Approach
You're troubleshooting missing traces in production. What's the correct debugging order?

A) Check application logs → Test network connectivity → Verify Collector config → Check backend status  
B) Restart the Collector → Check application instrumentation → Verify backend connectivity  
C) Debug the Collector first → Verify end-to-end pipeline → Check trace completeness and context  
D) Check backend storage → Verify Collector processing → Test application instrumentation

<details>
<summary><strong>Answer</strong></summary>

**Answer: C**

The systematic debugging approach from Week 4:
1. **Day 22:** Debug the Collector (infrastructure) first
2. **Day 23:** Verify end-to-end pipeline (application → SDK → collector → backend)  
3. **Day 24:** Check trace completeness and context propagation

This follows the principle of debugging from infrastructure → pipeline → application level.

</details>

---

### Question 2: Collector Health Debugging
Your Collector health check returns 200 OK, but no traces appear in Jaeger. What should you check next?

A) Restart the Collector service  
B) Check Collector metrics for received/processed/exported spans  
C) Verify Jaeger is running  
D) Increase Collector memory limits

<details>
<summary><strong>Answer</strong></summary>

**Answer: B**

A healthy status only means the Collector process is running. You need to check the pipeline metrics:
- `otelcol_receiver_accepted_spans` - Is data coming in?
- `otelcol_processor_accepted_spans` - Is data being processed?  
- `otelcol_exporter_sent_spans` - Is data being exported?

These metrics tell you exactly where in the pipeline data is getting lost.

</details>

---

### Question 3: Missing Data Scenario
You set up OpenTelemetry but see no data anywhere. What's the first debugging step?

A) Check if the backend is reachable  
B) Verify the Collector configuration  
C) Enable debug logging and check if the application is generating telemetry  
D) Test network connectivity between services

<details>
<summary><strong>Answer</strong></summary>

**Answer: C**

From Day 23's systematic approach, start at the beginning of the pipeline:
1. Is the application generating telemetry at all? (Enable debug logging, add console exporter)
2. Is the SDK exporting data?
3. Is the Collector receiving data?
4. Is the backend receiving data?

Always start with verifying data generation before checking downstream components.

</details>

---

### Question 4: Context Propagation Debugging
You see spans from your API service but nothing from the downstream Payment service, even though payments succeed. What's the most likely issue?

A) The Payment service is down  
B) Context propagation is broken between services  
C) The Collector is dropping Payment service spans  
D) The Payment service has no instrumentation

<details>
<summary><strong>Answer</strong></summary>

**Answer: B**

This is a classic Day 24 scenario: the request works (payment succeeds) but tracing is broken. The Payment service is likely:
- Creating spans but in a new trace (missing context extraction)
- Not forwarding trace context to downstream calls
- Using incorrect header names for context propagation

The key clue is that the payment succeeds - this means it's a tracing problem, not an application problem.

</details>

---

## Section 2: Production Resilience (Days 25-27)

### Question 5: Backpressure Handling
During a traffic spike, your Collector starts dropping spans. According to Day 25's three-layer defense, what happens automatically to handle this?

A) The Collector crashes and restarts  
B) Queue management activates first, then adaptive sampling if pressure continues, and memory limiter as last resort  
C) All spans are immediately dropped to protect the system  
D) The Collector requests applications to stop sending data

<details>
<summary><strong>Answer</strong></summary>

**Answer: B**

From Day 25, the three-layer defense works automatically in order:
1. **Queue Management (Layer 2):** Activates first to handle normal fluctuations by temporarily storing data
2. **Adaptive Sampling (Layer 3):** Reduces data volume if pressure continues - some data is better than no data
3. **Memory Limiter (Layer 1):** Emergency protection to prevent crashes by dropping data only when critically necessary

This is called **graceful degradation** - maintaining functionality by temporarily reducing quality instead of failing completely.

The system automatically recovers to full quality when pressure subsides.

</details>

---

### Question 6: Production Security
Which security practice is most critical for production OpenTelemetry deployments according to Day 26?

A) Using strong passwords for Collector authentication  
B) Not capturing sensitive data (passwords, API keys, PII) in the first place  
C) Encrypting telemetry data at rest  
D) Using private networks for all communication

<details>
<summary><strong>Answer</strong></summary>

**Answer: B**

From Day 26, the most critical security practice is **prevention - don't capture sensitive data in the first place**:
- Be selective about what attributes you capture
- Never capture passwords, API keys, credit card numbers, or full request/response bodies
- Review what auto-instrumentation captures
- When in doubt, don't log it - you can always add more later

Day 26 emphasizes: "Simple Fix: Be Selective About What You Capture" rather than trying to redact data after it's been captured.

While other options are important, preventing sensitive data from entering your observability pipeline is the foundation of security.

</details>

---

### Question 7: OpenTelemetry Operator
What does the auto-instrumentation injector in the OpenTelemetry Operator actually do?

A) Automatically installs OpenTelemetry in your cluster  
B) Modifies pod specifications to add instrumentation libraries via init containers  
C) Monitors applications and adds spans when needed  
D) Configures the Collector to receive data from applications

<details>
<summary><strong>Answer</strong></summary>

**Answer: B**

From Day 27, the injector is a Kubernetes admission controller that:
1. Intercepts pod creation requests
2. Modifies pod specs to add init containers with instrumentation libraries
3. Configures environment variables for the OpenTelemetry SDK
4. Mounts shared volumes so the main container can access the libraries

It works at pod creation time, not runtime monitoring.

</details>

---

## Section 3: Production Patterns & Integration

### Question 8: Sampling Strategy
For a high-traffic e-commerce site, what's the best sampling approach?

A) Fixed 1% probabilistic sampling across all services  
B) Tail-based sampling with different rates for errors, high-value transactions, and normal traffic  
C) No sampling - collect everything for complete visibility  
D) Head-based sampling with 10% rate during business hours

<details>
<summary><strong>Answer</strong></summary>

**Answer: B**

Tail-based sampling allows intelligent decisions:
- Always sample errors (100%)
- Always sample high-value transactions (business critical)
- Sample normal traffic at lower rates (cost optimization)
- Adapt sampling based on system load

This balances cost, performance, and observability needs better than fixed-rate sampling.

</details>

---

### Question 9: Collector Configuration
Your Day 28 project sends all telemetry to Dash0. What's the key benefit of using the Collector as an intermediary instead of direct SDK export?

A) The Collector is faster than direct export  
B) The Collector allows processing, filtering, and future routing changes without modifying application code  
C) The Collector is required for Dash0 integration  
D) The Collector reduces network bandwidth usage

<details>
<summary><strong>Answer</strong></summary>

**Answer: B**

Using the Collector as an intermediary provides flexibility:
- Process and transform data (filter health checks, add business context)
- Change backends without redeploying applications
- Implement batching and retry logic centrally
- Add multiple backends in the future without code changes

In Day 28, we used this pattern to filter health checks and batch telemetry before sending to Dash0.

</details>

---

### Question 10: Resource Management
In production, what's the most important Collector resource configuration?

A) Setting CPU requests equal to limits  
B) Configuring memory limits with appropriate batching settings (processor or exporter-native)  
C) Using the highest possible CPU and memory limits  
D) Setting resource requests but no limits for flexibility

<details>
<summary><strong>Answer</strong></summary>

**Answer: B**

Memory limits must align with batching configuration:
- Batch size × average span size = memory per batch
- Multiple concurrent batches = total memory usage
- Memory limits prevent OOM kills
- Proper batching optimizes both memory usage and export efficiency
- Modern exporters with persistent storage provide better reliability than traditional batch processors

Misaligned batching settings and memory limits cause the most production issues.

</details>

---

## Section 4: Advanced Concepts & Troubleshooting

### Question 11: OTTL Transformations
You need to add a business context attribute based on the HTTP route. Which OTTL statement is correct?

A) `set(attributes["business.area"], "payments") where http.route == "/api/payments"`  
B) `set(attributes["business.area"], "payments") where attributes["http.route"] == "/api/payments"`  
C) `attributes["business.area"] = "payments" if http.route == "/api/payments"`  
D) `transform(business.area, "payments") when route("/api/payments")`

<details>
<summary><strong>Answer</strong></summary>

**Answer: B**

OTTL syntax requires:
- `set()` function for setting attributes
- `attributes["key"]` to access span attributes  
- `where` clause for conditions
- Proper string comparison with `==`

Option A is missing `attributes[]` wrapper for the condition.

</details>

---

### Question 12: Performance Optimization
Your high-frequency trading application needs minimal latency impact from tracing. What's the best approach?

A) Disable tracing entirely during market hours  
B) Use probabilistic sampling with 0.01% rate  
C) Implement zero-allocation instrumentation with object pooling  
D) Only trace errors and slow requests

<details>
<summary><strong>Answer</strong></summary>

**Answer: C**

For latency-sensitive applications, zero-allocation patterns are crucial:
- Reuse span objects with sync.Pool
- Pre-allocate attribute slices
- Avoid string concatenation in hot paths
- Use batch processing to amortize export costs

Even 0.01% sampling has allocation overhead on every request.

</details>

---

### Question 13: Debugging Distributed Traces
A trace shows spans from Service A and Service C, but Service B (which processes requests between them) is missing. Service B logs show successful request processing. What's the most likely cause?

A) Service B is not instrumented  
B) Service B spans are being dropped by sampling  
C) Service B is not forwarding trace context  
D) The Collector is not receiving Service B spans

<details>
<summary><strong>Answer</strong></summary>

**Answer: A**

Key clues:
- Service B processes requests successfully (logs show this)
- Service A and C spans exist and are connected
- Service B spans are completely missing

This indicates Service B has no instrumentation at all. If it had instrumentation but broken context, you'd see orphaned spans. If sampling was dropping spans, you'd see some Service B spans occasionally.

</details>

---

### Question 14: Production Incident Response
During a production incident, your observability system is overwhelmed and dropping data. What's the correct priority order for maintaining observability?

A) Increase sampling rates → Scale Collector → Optimize queries  
B) Scale Collector → Reduce sampling rates → Implement circuit breakers  
C) Reduce sampling rates → Scale Collector → Implement graceful degradation  
D) Restart all components → Increase resources → Resume normal operations

<details>
<summary><strong>Answer</strong></summary>

**Answer: C**

During incidents, prioritize immediate stability:
1. **Reduce sampling rates** - Immediate load reduction
2. **Scale Collector** - Increase processing capacity  
3. **Implement graceful degradation** - Ensure partial observability is better than none

The goal is maintaining some observability during the incident, not perfect observability.

</details>

---

### Question 15: Business Context Integration
In your Day 28 project, you added custom spans for user lookups, product listings, and order creation. What's the benefit of adding business context to these technical traces?

A) It makes traces easier to find in Dash0  
B) It connects technical performance to business operations, enabling business-driven observability  
C) It reduces the amount of data sent to the backend  
D) It's required for the Collector to process the data

<details>
<summary><strong>Answer</strong></summary>

**Answer: B**

Business context transforms technical observability into business insights:
- "GET /api/users/:id" becomes "customer profile access"
- "POST /api/orders" becomes "revenue generation event"
- Technical latency becomes "checkout experience quality"

This allows teams to answer questions like "How many orders were created?" and "What's the performance of our revenue-generating endpoints?" directly from observability data.

</details>

---

## Scoring Guide

**13-15 correct:** **Production Expert** - You've mastered Week 4 concepts and are ready for advanced OpenTelemetry challenges!

**10-12 correct:** **Production Ready** - Strong understanding with minor gaps. Review the missed concepts.

**7-9 correct:** **Needs Review** - Good foundation but revisit Week 4 materials, especially debugging approaches and production patterns.

**Below 7:** **Revisit Week 4** - Focus on the debugging trilogy (Days 22-24) and production best practices (Days 25-27).

---

## Key Takeaways from Week 4

If you scored well, you understand:

**Systematic debugging approaches** for OpenTelemetry issues  
**Production resilience patterns** for handling scale and failures  
**Security best practices** for production deployments  
**Advanced deployment patterns** with Kubernetes Operator  
**Performance optimization** techniques for high-load systems  
**Business context integration** for meaningful observability

---

## Ready for Certification?

**Week 4 covered critical production skills that appear on the OTCA exam:**
- Systematic debugging (Days 22-24) → Exam Domain 4: Troubleshooting
- Production patterns (Days 25-27) → Exam Domain 4: Deployment & Operations
- Complete integration (Day 28) → Practical application across all domains

### **Quick Certification Tips**

**1. Focus on the Big Domains**
- Domain 2 (OpenTelemetry Fundamentals): 28% - Know API/SDK inside out
- Domain 3 (Using OpenTelemetry): 28% - Master Collector configuration
- Domain 4 (Ecosystem): 26% - Understand deployment patterns
- Domain 1 (Observability Fundamentals): 18% - Solid conceptual foundation

**2. Week 4 Exam Topics**
- **Debugging approaches:** Systematic troubleshooting from infrastructure → pipeline → application
- **Context propagation:** How trace context flows and where it breaks
- **Production patterns:** Backpressure, graceful degradation, security
- **Deployment strategies:** Agent vs Gateway, Kubernetes Operator

**3. Common Exam Traps**
- **Exact terminology:** "Sampler" not "sampling strategy", "propagator" not "context carrier"
- **Component responsibilities:** Know what receivers, processors, and exporters do
- **Configuration order:** Memory limiter first, batch last in processor pipelines
- **Deployment patterns:** When to use agent vs gateway (practical scenarios)

### **Next Step: Comprehensive OTCA Prep**

Ready to go deeper? Check out the **[OTCA Exam Prep Guide](./otca-exam-prep.md)**.

**Your 30-day journey has prepared you well. The OTCA exam validates what you already know!**

---

## Additional Practice

**Hands-on exercises to reinforce learning:**

1. **Set up a debugging scenario** - Intentionally break different parts of your observability pipeline and practice the systematic debugging approach

2. **Implement backpressure handling** - Configure queue management, memory limits, and adaptive sampling to handle traffic spikes

3. **Add security layers** - Practice not capturing sensitive data, implement TLS, and configure authentication

4. **Deploy with Operator** - Use the OpenTelemetry Operator to deploy and manage your observability stack in Kubernetes

5. **Create business dashboards** - Build dashboards that show business metrics derived from your technical telemetry
