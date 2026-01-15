## Mock Exam: 20 Questions

**Instructions:** Answer all questions. Passing score is 75% (15/20). Time limit: 30 minutes.

### **Questions 1-5: Observability Fundamentals**

**1.** What is the primary purpose of distributed tracing?

A) To monitor system performance metrics  
B) To track the flow of requests through multiple services  
C) To collect application logs centrally  
D) To detect security vulnerabilities

**2.** Which telemetry signal is best for understanding the performance of individual operations?

A) Metrics  
B) Logs  
C) Traces  
D) Events

**3.** What makes observability different from traditional monitoring?

A) Observability uses newer technology  
B) Observability focuses on user experience  
C) Observability enables exploration of unknown issues  
D) Observability is cloud-native

**4.** In a microservices architecture, what is the main challenge for observability?

A) Too much data to process  
B) Correlating data across service boundaries  
C) Different programming languages  
D) Network latency

**5.** What is a span in distributed tracing?

A) The time between two events  
B) A single operation within a trace  
C) A connection between services  
D) An error in the system

### **Questions 6-10: OpenTelemetry Fundamentals**

**6.** What is the main advantage of OpenTelemetry's vendor-neutral approach?

A) Better performance than vendor-specific solutions  
B) Lower cost of implementation  
C) Ability to switch backends without changing instrumentation  
D) Automatic scaling capabilities

**7.** How does OpenTelemetry handle context propagation in HTTP requests?

A) Through URL parameters  
B) Through HTTP headers like traceparent  
C) Through request body  
D) Through cookies

**8.** What is the role of semantic conventions in OpenTelemetry?

A) To define API interfaces  
B) To standardize attribute names and values  
C) To specify export formats  
D) To configure sampling rates

**9.** Which component is responsible for deciding whether to sample a trace?

A) The Collector  
B) The Sampler in the SDK  
C) The backend system  
D) The instrumentation library

**10.** What is baggage in OpenTelemetry?

A) Unused telemetry data  
B) User-defined key-value pairs propagated across services  
C) Error information in spans  
D) Configuration data for the SDK

### **Questions 11-15: Using OpenTelemetry**

**11.** When creating a span, what information is required at minimum?

A) Span name and parent span  
B) Span name only  
C) Span name and attributes  
D) Span name and duration

**12.** What type of metric would you use to track the current number of active connections?

A) Counter  
B) Histogram  
C) Gauge  
D) Summary

**13.** In the OpenTelemetry Collector, what happens if you don't configure a batch processor?

A) The Collector won't start  
B) Telemetry data is exported immediately, one item at a time  
C) Data is automatically batched with default settings  
D) Only metrics are processed

**14.** What is the purpose of OTTL (OpenTelemetry Transformation Language)?

A) To configure the Collector  
B) To write custom instrumentation  
C) To transform telemetry data in the Collector  
D) To query telemetry data

**15.** Which processor would you use to add a constant attribute to all spans?

A) Batch processor  
B) Attributes processor  
C) Filter processor  
D) Resource processor

### **Questions 16-20: OpenTelemetry Ecosystem**

**16.** In production, what is the most critical security consideration for OpenTelemetry?

A) Encrypting data in transit  
B) Using strong authentication  
C) Redacting PII from telemetry data  
D) Limiting network access

**17.** What is the main benefit of using tail-based sampling over head-based sampling?

A) Better performance  
B) Lower memory usage  
C) Ability to make sampling decisions based on complete trace information  
D) Simpler configuration

**18.** When would you choose the Agent deployment pattern over Gateway pattern?

A) When you need centralized processing  
B) When you want to reduce network hops and process data locally  
C) When you have limited resources  
D) When you need cross-cluster routing

**19.** What should you monitor to detect backpressure in the OpenTelemetry Collector?

A) CPU usage only  
B) Memory usage only  
C) Queue sizes and export success rates  
D) Network bandwidth

**20.** In Kubernetes, what does the OpenTelemetry Operator's auto-instrumentation injector do?

A) Automatically scales the Collector  
B) Modifies pod specs to add instrumentation libraries  
C) Monitors application performance  
D) Configures network policies

---

## Mock Exam Answers

<details>
<summary><strong>Click to reveal all answers</strong></summary>

**1. B** - Distributed tracing tracks request flow through multiple services  
**2. C** - Traces show individual operation performance and relationships  
**3. C** - Observability enables exploration of unknown issues  
**4. B** - Correlating data across service boundaries is the main challenge  
**5. B** - A span represents a single operation within a trace  

**6. C** - Vendor neutrality allows switching backends without code changes  
**7. B** - Context propagated through HTTP headers like traceparent  
**8. B** - Semantic conventions standardize attribute names and values  
**9. B** - The Sampler in the SDK makes sampling decisions  
**10. B** - Baggage carries user-defined key-value pairs across services  

**11. B** - Only span name is required at minimum  
**12. C** - Gauge tracks current values that can go up or down  
**13. B** - Without batch processor, data exports immediately (Note: Modern exporters handle batching internally)  
**14. C** - OTTL transforms telemetry data in the Collector  
**15. B** - Attributes processor adds/modifies span attributes  

**16. C** - PII redaction is most critical for compliance and privacy  
**17. C** - Tail sampling uses complete trace information for decisions  
**18. B** - Agent pattern reduces network hops with local processing  
**19. C** - Monitor queue sizes and export rates for backpressure  
**20. B** - Injector modifies pod specs to add instrumentation  

**Scoring:**
- 18-20: Excellent, ready for the exam!
- 15-17: Good, review missed topics
- 12-14: Need more study, focus on weak areas
- Below 12: Revisit the 30-day curriculum

</details>
