# OpenTelemetry Certified Associate (OTCA) Exam Preparation

**Thinking about taking the OTCA exam?** 

This guide covers all exam domains, includes practice questions, and shares tips to help you feel confident going into the [OpenTelemetry Certified Associate (OTCA)](https://training.linuxfoundation.org/certification/opentelemetry-certified-associate-otca/) exam.

> Check the [Quick Reference Sheet](./otca-quick-reference.md) to help refresh the concepts before the exam!

> Try the [Mock Exam](./otca-mock-exam.md) to see how ready you are!

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

### **Key Concepts for Exam**

**Telemetry Data:**
- **Traces:** Request flow through distributed systems
- **Metrics:** Aggregated measurements over time
- **Logs:** Discrete events with context
- Correlation of signals for complete observability

**Semantic Conventions:**
- Standardized attribute names and values
- Resource attributes (service.name, deployment.environment)
- Span attributes (http.request.method, db.system)
- Metric naming conventions

**Instrumentation:**
- Auto-instrumentation vs manual instrumentation
- When to use each approach
- Performance impact considerations
- Coverage and completeness

**Analysis and Outcomes:**
- Observability vs monitoring (unknown unknowns vs known unknowns)
- Exploratory analysis and correlation
- Troubleshooting distributed systems
- Performance optimization insights

---

## Domain 2: The OpenTelemetry API and SDK (46%)

### **Key Concepts for Exam**

**Data Model:**
- **Resource:** Describes the entity producing telemetry
- **Instrumentation Scope:** Identifies the instrumentation library
- **Attributes:** Key-value pairs for context
- **Events:** Time-stamped occurrences within spans
- **Links:** Relationships between spans

**Composability and Extension:**
- **API/SDK Separation:** APIs define interfaces, SDKs provide implementations
- **Vendor Neutrality:** Same instrumentation works with any backend
- **Plugin Architecture:** Custom components and extensions
- **Language-specific implementations**

**Configuration:**
- Environment variables (OTEL_*)
- Configuration files
- Programmatic configuration
- Resource detection and configuration

**Signals (Tracing, Metric, Log):**
- **Tracing API:** Creating spans, adding attributes, events, status
- **Metrics API:** Counters, gauges, histograms, up-down counters
- **Logs API:** Structured logging with trace correlation
- Signal-specific best practices

**SDK Pipelines:**
- **Span Processors:** Simple, batch, and custom processors
- **Metric Readers:** Push vs pull models
- **Log Record Processors:** Batching and filtering
- **Samplers:** Always on/off, probabilistic, parent-based, trace ID ratio

**Context Propagation:**
- **In-process:** Thread-local or async context
- **Cross-process:** HTTP headers (W3C Trace Context), message metadata
- **Baggage:** User-defined cross-cutting concerns
- Propagators and context carriers

**Agents:**
- Zero-code instrumentation
- Language-specific agents (Java, .NET, Python, Node.js)
- Configuration and customization
- Trade-offs vs manual instrumentation

---

## Domain 3: The OpenTelemetry Collector (26%)

### **Key Concepts for Exam**

**Configuration:**
- YAML configuration structure
- Receivers, processors, exporters, extensions
- Service pipelines (traces, metrics, logs)
- Environment variable substitution

**Deployment:**
- **Agent Pattern:** Collector on each node, local processing
- **Gateway Pattern:** Centralized collectors, cross-cluster routing
- **Hybrid:** Agents for local processing, gateways for aggregation
- Kubernetes deployment (DaemonSet, Deployment, StatefulSet)

**Scaling:**
- **Horizontal Scaling:** Multiple collector instances with load balancing
- **Vertical Scaling:** Increasing resources per collector instance
- Load balancing strategies
- Resource limits and requests

**Pipelines:**
- **Receivers:** How data enters (OTLP, Prometheus, Filelog, Jaeger)
- **Processors:** How data is modified (batch, attributes, filter, resource)
- **Exporters:** How data exits (OTLP, Prometheus, Jaeger, Logging)
- Pipeline ordering and data flow

> Since the processor batching capability hasn't been deprecated yet it might be on the Exam (as of Jan 2026)

**Transforming Data:**
- **OTTL (OpenTelemetry Transformation Language):** Syntax and functions
- Attribute manipulation (set, delete, upsert)
- Resource and scope transformations
- Filtering and routing based on conditions
- Performance considerations

---

## Domain 4: Maintaining and Debugging Observability Pipelines (10%)

### **Key Concepts for Exam**

**Context Propagation:**
- Verifying trace context across service boundaries
- Troubleshooting broken traces and missing spans
- Baggage propagation issues
- Missing or incorrect propagation headers (traceparent, tracestate)
- Testing context propagation in distributed systems

**Debugging Pipelines:**
- Using logging exporter for visibility
- Collector metrics and health checks (port 8888)
- Trace sampling and data loss investigation
- Performance bottlenecks identification
- Configuration validation and testing
- zpages extension for debugging (port 55679)
- Analyzing dropped data and export failures

**Error Handling:**
- Retry mechanisms and backpressure handling
- Graceful degradation strategies
- Queue management (sending_queue configuration)
- Circuit breakers and timeout settings
- Monitoring collector health and status
- Handling export failures and network issues
- Resource limits and memory management

**Schema Management:**
- Schema evolution and versioning
- Backward compatibility considerations
- Semantic convention updates and migrations
- Migration strategies for breaking changes
- Schema transformation in pipelines
- Handling multiple schema versions simultaneously

---

## Content Tips

**Review Your 30-Day Journey**

**High-Probability Topics:**
- Semantic conventions and standardization
- Context propagation mechanisms
- Collector architecture (receivers, processors, exporters)
- Deployment patterns (agent vs gateway)
- Sampling strategies and trade-offs
- Security considerations (TLS, PII redaction)
- Performance optimization (batching, resource limits)

**Tricky Areas:**
- Differences between metric types (counter vs gauge vs histogram)
- When to use different sampling strategies
- Collector processor ordering and pipeline configuration
- Kubernetes Operator vs manual deployment
- Debugging approaches for different types of issues

## Practice Resources

### Hands-On Labs
Set up these environments for practice:
1. **Basic instrumentation** in your preferred language
2. **Collector pipeline** with multiple processors
3. **Multi-backend export** configuration
4. **OTTL transformations** for data processing
5. **Debugging scenario** with logging exporter

### Configuration Practice
Write configurations for:
- Agent deployment pattern
- Gateway deployment pattern
- Multi-tenant routing
- Cost optimization with sampling
- Error handling and retry logic


## Success Tips

### Technical Preparation
1. **Understand concepts, don't memorize**
2. **Practice writing configurations**
3. **Set up real environments**
4. **Debug common issues**
5. **Know the defaults and conventions**

**Question Strategies:**
- Read questions carefully - look for key words
- Eliminate obviously wrong answers first
- For scenario questions, think about the practical implementation
- When unsure, go with your first instinct
- Don't spend too long on any question


## Post-Exam

### If You Pass
1. **Celebrate your achievement!**
2. **Update your LinkedIn and resume**
3. **Share your success with the community**
4. **Consider advanced certifications**
5. **Help others prepare for their exams**

### If You Don't Pass
1. **Don't be discouraged**, many people need multiple attempts
2. **Review your weak areas** from the exam feedback
3. **Study those topics more deeply**
4. **Take another practice exam**
5. **Schedule your retake when ready (you're allowed one free retake)**

## Good Luck!

You've completed 30 days of comprehensive OpenTelemetry training. You have the knowledge and skills needed to pass the certification exam. Trust in your preparation and go show what you've learned!

**Remember**: The certification validates what you already know. You're ready!