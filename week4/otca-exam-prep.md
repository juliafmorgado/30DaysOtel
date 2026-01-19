# OpenTelemetry Certified Associate (OTCA) Exam Preparation

**Thinking about taking the OTCA exam?** 

This guide focuses on what you need to know for the exam and how concepts are tested.

> **Quick Links:**
> - [Quick Reference Sheet](./otca-quick-reference.md): Core definitions and concepts
> - [Mock Exam](./otca-mock-exam.md): 60 questions to test your readiness

**Exam Overview:**
- **Duration:** 90 minutes
- **Questions:** 60 multiple choice
- **Passing Score:** 75% (45/60 questions)
- **Format:** Online proctored
- **Cost:** $250 USD
- **Validity:** 2 years
- **Includes one retake**

---

## Certification Domains & Coverage

The OTCA exam covers 4 main domains:

| Domain | Weight | Your Learning Coverage |
|--------|--------|----------------------|
| **Fundamentals of Observability** | 18% | Week 1 |
| **The OpenTelemetry API and SDK** | 46% | Weeks 1-2 |
| **The OpenTelemetry Collector** | 26% | Week 3 |
| **Maintaining and Debugging Observability Pipelines** | 10% | Week 4 |

---

## Domain 1: Fundamentals of Observability (18%)

### **What the Exam Loves to Ask**

**Signal Characteristics:**
- When to use traces vs metrics vs logs
- How signals correlate (trace_id in logs, exemplars in metrics)
- Trade-offs between signal types
- Metric types: Counter vs UpDownCounter vs Histogram vs Gauge 

**Semantic Conventions:**
- Difference between resource attributes and span attributes
- Common attribute names (http.request.method, not http.method)
- Why semantic conventions matter for interoperability

**Trace Context:**
- W3C Trace Context standard (traceparent, tracestate headers)
- How trace context propagates across service boundaries
- Difference between trace context and baggage

**Instrumentation Approaches:**
- Auto-instrumentation vs manual: when to use each
- Coverage limitations of auto-instrumentation
- Performance impact considerations

**Observability vs Monitoring:**
- Known unknowns (monitoring) vs unknown unknowns (observability)
- Exploratory analysis capabilities
- Correlation across services

---

## Domain 2: The OpenTelemetry API and SDK (46%)

### **What the Exam Loves to Ask**

**Resource vs Span Attributes:**
- Resource: entity producing telemetry (service, host, container)
- Span attributes: request-specific data
- When to use each

**Sampler Types:**
- Head-based (SDK, at span creation) vs tail-based (Collector, after trace completion)
- ParentBased behavior: children inherit parent's sampling decision

**Context Propagation vs Correlation:**
- Propagation: moving trace context between services (headers)
- Correlation: linking telemetry signals together (trace_id in logs, exemplars in metrics)
- Completely different responsibilities

**Processor vs Exporter Responsibilities:**
- Processors: transform/filter data in the pipeline
- Exporters: send data to backends
- Span processors: Simple (sync, blocking) vs Batch (async, queued)

**SDK Configuration Priority:**
- Environment variables (lowest priority)
- Resource detectors
- Programmatic configuration (highest priority)

**Context Mechanisms:**
- In-process: thread-local/async-local storage
- Cross-process: HTTP headers (traceparent, tracestate)
- Baggage: cross-cutting concerns (low-cardinality only!)

---

## Domain 3: The OpenTelemetry Collector (26%)

### **What the Exam Loves to Ask**

**Pipeline Architecture:**
- Order: Receivers → Processors → Exporters
- Each signal type (traces, metrics, logs) has its own pipeline
- Connectors bridge pipelines (e.g., spanmetrics: traces → metrics)

**Deployment Patterns:**
- Agent: on each node, local processing, host metrics
- Gateway: centralized, policy enforcement, reduced backend fanout
- Hybrid: agents + gateway for best of both

**Processor Ordering:**
- Memory limiter should be first (protect against OOM)
- Batch should be last (before export)
- Transforms/filters in the middle

**Batch Processor:**
- Even though the Batch processor is not being recommended, it's still widely used and might appear on the exam. There are discussions about promoting exporter-side batching/queueing patterns, but no deprecation timeline exists yet.
- Batching improves throughput but increases latency
- Configure: max_batch_size, timeout

**OTTL Transformations:**
- Syntax: `set(attributes["key"], "value")`
- Common functions: set, delete, truncate_all, replace_pattern
- Context: span, resource, scope, metric, datapoint, log

**Scaling Considerations:**
- Horizontal: multiple instances + load balancer
- Vertical: increase CPU/memory per instance
- Queue sizing and backpressure handling

---

## Domain 4: Maintaining and Debugging Observability Pipelines (10%)

### **What the Exam Loves to Ask**

**Context Propagation Debugging:**
- Check for traceparent header in HTTP requests
- Verify frameworks extract/inject context
- Look for fragmented traces (many single-span traces = broken propagation)

**Pipeline Debugging:**
- Logging exporter: see what's being processed
- Collector metrics (port 8888): otelcol_processor_dropped_spans, etc.
- zpages extension (port 55679): live pipeline inspection

**Common Issues:**
- Spans dropped: check queue sizes, memory limits, exporter performance
- Missing spans: check sampling, instrumentation coverage
- High latency: check batch timeout, exporter speed
- High cardinality: check metric attributes

**Error Handling:**
- sending_queue: buffer during backend outages
- retry_on_failure: handle transient failures
- Memory limiter: prevent OOM

---

## Hands-On Lab Ladder

Practice these labs in order to build practical skills:

**Lab 1: Basic Pipeline**
- App → Collector → Logging exporter
- Verify telemetry flows through

**Lab 2: Add Reliability**
- Add batch processor
- Add memory_limiter processor
- Observe behavior under load

**Lab 3: Add Resilience**
- Configure sending_queue in exporter
- Configure retry_on_failure
- Test with backend outage

**Lab 4: Add Transformation**
- Add transform processor with OTTL
- Modify attributes, filter data
- Verify transformations work

**Lab 5: Add Metrics from Traces**
- Add spanmetrics connector
- Generate request count and latency metrics from spans
- Export to separate metrics backend

---

## High-Probability Topics

**Expect Multiple Questions On:**
- Semantic conventions and attribute naming
- Context propagation mechanisms and debugging
- Collector pipeline architecture and ordering
- Deployment patterns (agent vs gateway)
- Sampling strategies and trade-offs
- SDK configuration priority (env vars vs programmatic)
- Metric types and when to use each
- Batch processor behavior and configuration
- Error handling and retry mechanisms

---

## Question Strategies

**During the Exam:**
1. **Read carefully** - Look for key words like "most likely", "best practice", "first step"
2. **Eliminate wrong answers** - Often 2 answers are obviously wrong
3. **Think practically** - What would you do in production?
4. **Watch for traps** - Review the "Top 10 Gotchas" on the [OTCA quick reference sheet](./otca-quick-reference.md)
5. **Don't overthink** - Your first instinct is usually correct
6. **Manage time** - 90 minutes for 60 questions = 1.5 minutes per question

**Common Question Patterns:**
- "What's the most likely cause?" → Think about common misconfigurations
- "What's the best practice?" → Think about production reliability
- "What happens when...?" → Think about the data flow
- "Which component is responsible?" → Know the architecture clearly

---

## Post-Exam

### If You Pass
1. **Celebrate your achievement!**
2. **Update your LinkedIn and resume**
3. **Share your success with the community**
4. **Consider advanced certifications**
5. **Help others prepare for their exams**

### If You Don't Pass
1. **Don't be discouraged** - Many people need multiple attempts
2. **Review your weak areas** from the exam feedback
3. **Study those topics more deeply**
4. **Take another practice exam**
5. **Schedule your retake when ready** (you have one free retake)

---

## Good Luck!

You've completed 30 days of comprehensive OpenTelemetry training. You have the knowledge and skills needed to pass the certification exam. Trust in your preparation and go show what you've learned!

**Remember**: The certification validates what you already know. You're ready!