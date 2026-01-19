## Mock Exam: 60 Questions

**Instructions:** Answer all questions. Passing score is 75% (45/60). Time limit: 90 minutes.

This exam includes scenario-based questions that test deeper understanding of OpenTelemetry concepts.

**How to use this exam:**
1. Answer all 60 questions without looking at the answers
2. Check your answers and calculate your score
3. Review the detailed explanations for questions you missed to understand why

---

**1.** Where do Resource attributes belong conceptually?

A) On every span as span attributes only  
B) On telemetry data as metadata describing the entity producing telemetry (service/process/host)  
C) Only inside baggage headers  
D) Only in the Collector config

<details>
<summary><strong>Answer</strong></summary>

**B** - Resources are metadata attached once at SDK initialization and apply to all telemetry signals (traces, metrics, logs) from that entity. This is why service.name lives in the resource, not on individual spans.

**Why others are wrong:**
- A: Span attributes are for request-specific data, not entity identity. Putting resource info on every span as attributes would be wasteful duplication.
- C: Baggage is for cross-cutting request context, not entity metadata. Baggage propagates with requests; resources don't.
- D: While the Collector can add/modify resources, they conceptually belong on the telemetry data itself, not just in config.

</details>

---

**2.** Correct Collector pipeline order is:

A) Exporters → Receivers → Processors  
B) Receivers → Exporters → Processors  
C) Receivers → Processors → Exporters  
D) Processors → Receivers → Exporters

<details>
<summary><strong>Answer</strong></summary>

**C** - This is the core architecture of the Collector. Data enters through receivers, gets transformed/filtered by processors, and exits through exporters. This unidirectional flow is consistent across all signal types (traces, metrics, logs).

**Why others are wrong:**
- A: Exporters come last, not first. They send data out after processing.
- B: Processors must come between receivers and exporters to transform data before export.
- D: Processors can't come before receivers - there's no data to process yet.

</details>

---

**3.** You see spans exported with service.name="unknown_service". Most likely, the issue is:

A) W3C Trace Context disabled  
B) Missing resource configuration (OTEL_SERVICE_NAME or OTEL_RESOURCE_ATTRIBUTES not set)  
C) Missing span kind  
D) Exporter is dropping attributes by design

<details>
<summary><strong>Answer</strong></summary>

**B** - service.name is a resource attribute that must be explicitly set. If not provided, many SDKs default to "unknown_service" (or "unknown_service:node", etc.). This happens when OTEL_SERVICE_NAME isn't set, OTEL_RESOURCE_ATTRIBUTES doesn't include it, and no programmatic resource configuration provides it.

**Why others are wrong:**
- A: W3C Trace Context is for propagating trace context between services, not for service naming.
- C: Span kind (CLIENT/SERVER/INTERNAL/etc.) describes the span's role, not the service identity.
- D: Exporters don't typically drop service.name by design - if it's missing, it wasn't set in the first place.

</details>

---

**4.** Which component is most appropriate to reduce bandwidth by sending telemetry in fewer, larger payloads?

A) Memory limiter processor  
B) Batch processor  
C) OTLP receiver  
D) Logging exporter

<details>
<summary><strong>Answer</strong></summary>

**B** - The batch processor accumulates telemetry data and sends it in larger chunks rather than one-by-one. This dramatically reduces network calls, connection overhead, and backend ingestion load.

**Why others are wrong:**
- A: Memory limiter protects against OOM, doesn't optimize bandwidth.
- C: OTLP receiver accepts data into the Collector, doesn't control batching.
- D: Logging exporter is for debugging, not bandwidth optimization.

</details>

---

**5.** In OTel, the context propagation mechanism is mainly responsible for:

A) Converting logs to spans  
B) Transporting trace context and baggage across process boundaries  
C) Creating metrics views  
D) Retrying exporters

<details>
<summary><strong>Answer</strong></summary>

**B** - Context propagation is the mechanism that carries trace_id, span_id, and baggage across process boundaries (typically via HTTP headers like traceparent). This enables distributed tracing - without it, each service would start new traces.

**Why others are wrong:**
- A: Logs and spans are separate signals. Context propagation doesn't convert between them.
- C: Metrics views are configured in the SDK, not related to context propagation.
- D: Exporter retries are about reliability, not context propagation.

</details>

---

**6.** You want to generate metrics from trace spans (e.g., request count, latency) within the Collector before exporting. The most correct approach is:

A) Use separate pipelines with manual metric creation  
B) Use the transform processor  
C) Export traces twice to different backends  
D) Use a span metrics connector to bridge the traces pipeline to a metrics pipeline

<details>
<summary><strong>Answer</strong></summary>

**D** - Connectors act as both an exporter (from traces pipeline) and a receiver (to metrics pipeline), enabling you to generate metrics from trace data within the Collector.

**Why others are wrong:**
- A: Manual metric creation doesn't leverage the Collector's built-in capabilities
- B: Transform processor transforms data, doesn't generate metrics from spans
- C: Exporting traces twice wastes bandwidth and doesn't create metrics

</details>

---

**7.** Which statement about OpenTelemetry API vs SDK is most accurate?

A) API exports telemetry; SDK defines interfaces only  
B) API provides interfaces; SDK provides implementations like samplers, processors, exporters  
C) SDK is optional for any instrumentation to work  
D) API includes Collector pipeline components

<details>
<summary><strong>Answer</strong></summary>

**B** - The API defines interfaces (how to create spans, record metrics, etc.) while the SDK provides actual implementations (samplers, processors, exporters). This separation allows instrumentation libraries to depend only on the stable API, while applications configure the SDK implementation.

**Why others are wrong:**
- A: Reversed - API defines interfaces, SDK exports telemetry through its implementations.
- C: SDK is required for telemetry to actually be recorded and exported. Without it, the API becomes a no-op.
- D: Collector components are separate from the SDK. The API/SDK are for application instrumentation.

</details>

---

**8.** When deploying Collectors, when is local collection (agent pattern) preferred over purely central collection?

A) When you want higher network latency  
B) When you want to avoid running anything on nodes  
C) When you want to reduce app egress, capture host-level telemetry, and isolate failures near the source  
D) When you have only one service

<details>
<summary><strong>Answer</strong></summary>

**C** - Running a Collector agent on each node/host allows you to: reduce network egress from apps (data goes to localhost), collect host-level metrics (CPU, memory, disk), and isolate failures (if one agent fails, others continue).

**Why others are wrong:**
- A: Agent pattern reduces latency (localhost), doesn't increase it.
- B: Agent pattern specifically means running something on nodes - that's the point.
- D: Even with one service, agents provide benefits like host metrics and local buffering.

</details>

---

**9.** You want to ensure spans for a single request across HTTP → gRPC → DB all share the same trace. The critical requirement is:

A) All spans must be created with SpanKind.INTERNAL  
B) All services must use the same trace exporter endpoint  
C) All services must have matching OTEL_TRACES_SAMPLER configuration  
D) Parent context must be propagated and used to start child spans

<details>
<summary><strong>Answer</strong></summary>

**D** - Parent context (containing trace_id and span_id) must be propagated across service boundaries and used when creating child spans. This is how all spans in a distributed request share the same trace_id.

**Why others are wrong:**
- A: Span kind (CLIENT/SERVER/INTERNAL) describes the span's role, not trace continuity
- B: **Tricky!** Services can export to different backends or even through different collectors - what matters is that context is propagated at span creation time, not where spans are exported
- C: **Tricky!** Sampling configuration can differ between services (though not recommended). A parent service might sample at 10% while a child samples at 100%. The ParentBased sampler ensures children respect the parent's decision, but matching config isn't the requirement - context propagation is

</details>

---

**10.** Which processor is primarily intended to protect the Collector from OOM due to sudden ingestion spikes?

A) Resource processor  
B) Memory limiter processor  
C) Attributes processor  
D) Span metrics connector

<details>
<summary><strong>Answer</strong></summary>

**B** - The memory limiter processor monitors the Collector's memory usage and applies memory pressure that causes data to be dropped upstream when approaching configured limits. This prevents the Collector from crashing due to memory exhaustion during traffic spikes.

**Why others are wrong:**
- A: Resource processor adds/modifies resource attributes, doesn't protect memory.
- C: Attributes processor modifies attributes, doesn't protect memory.
- D: Span metrics connector generates metrics from spans, doesn't protect memory.

</details>

---

**11.** When would you use Links on a span rather than parent/child relationships?

A) When you want to connect a span to its immediate caller in a synchronous request  
B) When a span is causally related to multiple traces or multiple parents (e.g., batch processing)  
C) When you need to propagate trace context across async boundaries  
D) When you want to create a child span that continues the same trace

<details>
<summary><strong>Answer</strong></summary>

**B** - Links are used when a span is causally related to multiple traces or parents. For example, a batch processing job triggered by 100 different user requests would use links to reference all 100 triggering traces, since it can only have one parent but needs to show relationship to multiple traces.

**Why others are wrong:**
- A: **Tricky!** This describes parent/child relationships, not links. Immediate caller in synchronous requests = parent/child
- C: **Tricky!** Most async boundaries use parent/child relationships via context propagation. However, links can be used in some async/message scenarios where you want to show causal relationships without strict parent/child hierarchy (e.g., message queue consumers referencing producer spans)
- D: **Tricky!** This is exactly what parent/child is for - continuing the same trace. Links are typically for relating to spans in *other* traces, though they can also be used within the same trace for non-hierarchical relationships

**Key distinction:** Parent/child = hierarchical relationship within a trace. Links = causal relationships that may cross trace boundaries or represent non-hierarchical connections.

</details>

---

**12.** You see "exporter timeout" errors and increasing queue length. Best first tuning target?

A) Increase sampling to 100%  
B) Increase batch timeout to a huge number  
C) Check exporter endpoint connectivity/latency and adjust queue/retry/batch sizing appropriately  
D) Disable processors

<details>
<summary><strong>Answer</strong></summary>

**C** - When you see exporter timeouts and queue growth, it means the backend can't keep up or there's a network issue. The solution is to diagnose the connectivity/latency problem and then tune queue sizes, retry settings, and batch sizes to handle the actual backend performance characteristics.

**Why others are wrong:**
- A: Increasing sampling to 100% would make the problem worse by sending more data.
- B: Increasing batch timeout alone doesn't fix slow backends - you need to address the root cause.
- D: Disabling processors removes important functionality and doesn't fix backend issues.

</details>

---

**13.** Which is the best example of Baggage use (when used carefully)?

A) Carry a low-cardinality business identifier (e.g., tenant_id) to correlate across services  
B) Put full JWT tokens into baggage for debugging  
C) Carry entire request bodies to avoid logging  
D) Replace span attributes with baggage everywhere

<details>
<summary><strong>Answer</strong></summary>

**A** - Baggage should carry low-cardinality values (limited distinct values) that need to be available across all services in a request. tenant_id is ideal - it has limited cardinality and is useful for filtering/grouping across services. It propagates automatically with trace context.

**Why others are wrong:**
- B: JWT tokens are large, high-cardinality, and contain sensitive data. Never put them in baggage (propagated in headers).
- C: Request bodies are large and high-cardinality. Baggage has size limits and propagates in every downstream call.
- D: Span attributes are better for most data. Baggage is only for data that must be available across service boundaries.

</details>

---

**14.** Security best practice for OTLP ingestion over gRPC/HTTP is usually:

A) Use plaintext to avoid CPU cost  
B) Use TLS/mTLS where appropriate, plus authN/authZ if exposed  
C) Disable batching  
D) Use baggage for secrets

<details>
<summary><strong>Answer</strong></summary>

**B** - OTLP endpoints should use TLS to encrypt telemetry data in transit (which may contain sensitive information). If the endpoint is exposed beyond localhost, add authentication/authorization to prevent unauthorized data submission or data exfiltration.

**Why others are wrong:**
- A: Plaintext exposes telemetry data (which may contain PII, secrets, business logic) to network sniffing.
- C: Batching is unrelated to security - it's a performance optimization.
- D: Baggage is for request context, not secrets. Secrets should never be in baggage (it's propagated in headers).

</details>

---

**15.** A team complains "we turned on auto-instrumentation but we still don't see DB spans." The best first hypothesis is:

A) The Collector is filtering out DB spans in the pipeline  
B) The DB client library isn't supported by that auto-instrumentation agent or is used in an unsupported way  
C) The sampling rate is set too low and DB spans are being dropped  
D) The exporter endpoint is misconfigured

<details>
<summary><strong>Answer</strong></summary>

**B** - Auto-instrumentation only works with libraries it knows about. If the team is using a DB client that isn't in the auto-instrumentation's supported list, or using it in an unusual way (e.g., custom connection pooling), no DB spans will be created at all.

**Why others are wrong:**
- A: **Tricky!** While the Collector *could* filter spans, if you see HTTP spans but no DB spans, the issue is at span creation time, not filtering. The Collector doesn't selectively drop span types by default.
- C: **Tricky!** If sampling were the issue, you'd see *some* DB spans (just fewer). Seeing *zero* DB spans suggests they're not being created at all, not that they're being sampled out.
- D: **Tricky!** If the exporter were misconfigured, you wouldn't see *any* spans (HTTP, DB, or otherwise). Seeing HTTP spans but no DB spans points to instrumentation coverage, not export issues.

</details>

---

**16.** If you need to drop attributes containing secrets at the Collector, the best place is:

A) In the backend only  
B) In an attributes/transform processor before exporting  
C) In the receiver only  
D) In context propagation headers

<details>
<summary><strong>Answer</strong></summary>

**B** - The Collector is the ideal place to redact secrets because it's a centralized control point before data reaches backends. Use attributes or transform processors to detect and remove/mask sensitive attributes. This provides defense in depth - even if apps accidentally log secrets, they're caught before storage.

**Why others are wrong:**
- A: Waiting until the backend means secrets are already transmitted and may be logged/cached along the way.
- C: Receivers accept data as-is. Processing happens in processors, not receivers.
- D: Context propagation headers are for trace context, not for filtering secrets from telemetry data.

</details>

---

**17.** In most language SDKs, which component most directly decides whether a span is recorded/exported?

A) Resource detector  
B) Sampler decision at span creation  
C) Tail-based sampling decision after trace completion  
D) Exporter retry logic only

<details>
<summary><strong>Answer</strong></summary>

**B** - In most language SDKs, the sampler makes the decision at span creation time (head-based sampling). This is when the SDK decides whether to record the span or create a non-recording span.

**Why others are wrong:**
- A: Resource detector identifies the service, doesn't make sampling decisions
- C: **Tricky!** Tail-based sampling happens in the Collector, not in the SDK. The question asks about "most language SDKs" which use head-based sampling at span creation. Tail-based sampling requires buffering complete traces and is typically done at the Collector level, not in application SDKs.
- D: Exporter retry logic happens after the sampling decision has already been made

**Key distinction:** Head-based (SDK, at span creation) vs Tail-based (Collector, after trace completion).

</details>

---

**18.** When initializing the OpenTelemetry SDK, which component must be configured first before creating spans?

A) Exporter configuration  
B) The TracerProvider  
C) Span processor configuration  
D) Sampler configuration

<details>
<summary><strong>Answer</strong></summary>

**B** - Before creating spans via get_tracer() in typical instrumentation, the TracerProvider must be configured and set as the global provider; otherwise you’ll get a no-op tracer.

**Why others are wrong:**
- A: **Tricky!** While exporters are important, they're configured as part of the TracerProvider setup, not before it. You can create a TracerProvider without an exporter (though spans won't be exported).
- C: **Tricky!** Span processors are configured when creating the TracerProvider, not before. The TracerProvider initialization is what comes first.
- D: **Tricky!** Samplers are also configured during TracerProvider creation, not as a separate first step. The TracerProvider is the foundation that holds all these components.

**Key concept:** TracerProvider → get_tracer() → create spans. The provider must exist first.

</details>

---

**19.** What is the difference between propagators and exporters?

A) Propagators send telemetry to backends; exporters inject headers  
B) Propagators handle context injection/extraction; exporters send telemetry out-of-process  
C) Both do the same thing; names vary by language  
D) Exporters decide sampling

<details>
<summary><strong>Answer</strong></summary>

**B** - Propagators handle context (trace_id, span_id, baggage) injection into carriers (HTTP headers, message metadata) and extraction from carriers. Exporters handle sending completed telemetry data (spans, metrics, logs) to backends. Completely different responsibilities.

**Why others are wrong:**
- A: Completely backwards - propagators handle headers, exporters send to backends.
- C: They have distinct, well-defined roles across all languages.
- D: Samplers decide sampling, not exporters. Exporters just send what they're given.

</details>

---

**20.** What is the most correct reason to use a central Collector layer even if you also deploy agents?

A) It eliminates the need for exporters  
B) It centralizes policy (sampling, transforms, routing), reduces backend fanout, and improves operational control  
C) It makes trace context propagation unnecessary  
D) It converts traces into logs automatically

<details>
<summary><strong>Answer</strong></summary>

**B** - Even with agents on each node, a central Collector layer provides: centralized policy enforcement (tail-based sampling, PII redaction), reduced backend fanout (N agents → 1 gateway → backends instead of N agents → backends), easier operational changes (update gateway config vs updating all agents), and cross-service correlation capabilities.

**Why others are wrong:**
- A: Exporters are still needed - the central Collector uses exporters to send to backends.
- C: Context propagation still happens between services. The Collector doesn't replace it.
- D: Collectors can route/transform signals but don't automatically convert traces to logs.

</details>

**21.** If you accidentally create a new root span for every outbound HTTP call, what symptom is most likely?

A) Traces become very long with too many children  
B) Traces fragment; you see many single-span traces instead of end-to-end traces  
C) Exporter timeouts increase but traces stay connected  
D) Only metrics break

<details>
<summary><strong>Answer</strong></summary>

**B** - When you create a root span for each outbound call instead of using the current context as parent, each call starts a new trace. You end up with many disconnected single-span traces instead of one connected trace showing the full request flow. This is a classic context propagation bug.

**Why others are wrong:**
- A: Traces would be shorter (single spans), not longer. No parent/child relationships are formed.
- C: Exporter behavior is unrelated to span parent/child relationships.
- D: Metrics continue to work independently of trace structure.

</details>

---

**22.** Which statement about Collector "extensions" is most accurate?

A) They are mandatory for every pipeline  
B) They provide capabilities like health checks, pprof, zpages, auth, storage, etc., not signal processing  
C) They are processors that run after exporters  
D) They only exist for metrics

<details>
<summary><strong>Answer</strong></summary>

**B** - Extensions are optional components that add operational capabilities to the Collector: health_check (liveness/readiness endpoints), pprof (Go profiling), zpages (internal diagnostics), file_storage (persistent queues), etc. They don't process telemetry signals - that's what processors do.

**Why others are wrong:**
- A: Extensions are optional. A minimal Collector can run without any extensions.
- C: Extensions are separate from the pipeline. Processors run in the pipeline between receivers and exporters.
- D: Extensions work across all signal types, not just metrics.

</details>

---

**23.** Which statement about span attributes vs events is most correct?

A) Events are key/value pairs without timestamps  
B) Attributes should capture stable metadata; events capture time-stamped occurrences during the span  
C) Attributes are only for errors; events are only for info  
D) Events replace logs entirely

<details>
<summary><strong>Answer</strong></summary>

**B** - Attributes are key-value pairs describing the span (http.method, db.statement, etc.) - relatively stable metadata. Events are time-stamped occurrences that happen during the span (exceptions, retries, cache hits) - they have a timestamp and can have their own attributes. Different purposes.

**Why others are wrong:**
- A: Events DO have timestamps - that's their defining characteristic. They mark when something happened during the span.
- C: Both attributes and events can be used for various purposes. No such restriction exists.
- D: Events complement logs but don't replace them. Logs are a separate signal with different use cases.

</details>

---

**24.** You suspect spans are being dropped in the Collector under load. Which combination is most diagnostic?

A) Only backend dashboards showing ingestion rates  
B) Collector self-telemetry + memory limiter logs + exporter queue metrics  
C) Application-side span creation metrics and SDK queue sizes  
D) Increasing batch processor timeout to see if spans eventually arrive

<details>
<summary><strong>Answer</strong></summary>

**B** - When debugging span drops in the Collector, you need visibility into the Collector's internal state. Self-telemetry metrics (like otelcol_processor_dropped_spans), memory limiter logs (showing when backpressure is applied), and exporter queue metrics (showing queue depth and capacity) together provide the complete picture of where and why spans are being dropped.

**Why others are wrong:**
- A: **Tricky!** Backend dashboards show what arrived, but can't tell you *why* spans didn't arrive or *where* in the Collector pipeline they were dropped
- C: **Tricky!** Application-side metrics show if spans left the app, but if the problem is in the Collector under load, app metrics won't reveal Collector-specific issues like memory limits or exporter queue overflows
- D: **Tricky!** Increasing batch timeout might help with throughput issues, but won't diagnose *why* spans are being dropped. If the Collector is dropping spans due to memory pressure or queue overflow, waiting longer won't fix it

</details>

---

**25.** In a language SDK, where is "current span" typically stored?

A) In a global variable shared across threads  
B) In a context mechanism (thread-local/async-local) managed by the runtime/framework  
C) Inside the exporter queue  
D) Only in the Collector

<details>
<summary><strong>Answer</strong></summary>

**B** - The "current span" is stored in a context object that's managed by the language runtime (thread-local storage in threaded languages, async context in async languages). This allows child spans to automatically find their parent without explicit passing. The SDK provides context managers/decorators to handle this.

**Why others are wrong:**
- A: Global variables shared across threads would cause race conditions and incorrect parent/child relationships in concurrent code.
- C: Exporter queue holds completed spans waiting for export, not the current active span.
- D: The Collector doesn't track application-side "current span" - that's SDK responsibility.

</details>

---

**26.** In a well-instrumented system, the fastest way to distinguish "no telemetry produced" vs "telemetry produced but not exported" is:

A) Check backend ingestion metrics and compare with application request counts  
B) Add a debug/logging exporter temporarily and compare counts with backend ingestion  
C) Switch from OTLP to Zipkin to see if the protocol is the issue  
D) Enable SDK debug logging to see if spans are being created

<details>
<summary><strong>Answer</strong></summary>

**B** - Adding a debug/logging exporter (either in the SDK or Collector) lets you see exactly what telemetry is being produced and sent. By comparing the count/content in the debug output with what arrives at the backend, you can quickly identify if the problem is at creation time (no telemetry in debug output) or export time (telemetry in debug output but not in backend).

**Why others are wrong:**
- A: **Tricky!** Backend metrics + request counts can show a discrepancy exists, but won't tell you *where* the problem is. If you see 1000 requests but only 100 traces in the backend, you still don't know if 900 spans were never created or if they were created but dropped somewhere in the pipeline.
- C: **Tricky!** Switching protocols might help if there's a protocol-specific bug, but it doesn't diagnose the root cause. If spans aren't being created at all, changing the exporter protocol won't help.
- D: **Tricky!** SDK debug logging shows span creation, but doesn't show what happens after export. If spans are created but dropped by the Collector or lost in transit, SDK logs won't reveal that. You need visibility at the export boundary.

</details>

---

**27.** A service uses both OpenTelemetry and OpenTracing instrumentation. What's the most correct expectation?

A) They can't coexist at all  
B) Bridge/shim layers may exist, but semantic fidelity may be imperfect and requires careful configuration  
C) OpenTracing automatically converts metrics to spans  
D) OpenTelemetry requires OpenTracing to function

<details>
<summary><strong>Answer</strong></summary>

**B** - OpenTelemetry provides bridge/shim layers to interoperate with OpenTracing instrumentation. However, the two APIs have different semantics (OTel has more features like events, links, status), so the mapping isn't perfect. Some information may be lost or approximated in translation.

**Why others are wrong:**
- A: They can coexist using bridge layers. Many organizations run both during migration.
- C: OpenTracing is a tracing API only, doesn't handle metrics at all.
- D: OpenTelemetry is independent and doesn't require OpenTracing. OpenTracing is the older standard being replaced.

</details>

---

**28.** Your traces show correct service names in development but "unknown_service" in production. The most likely root cause is:

A) Batch processor disabled in production  
B) Production environment doesn't have OTEL_SERVICE_NAME or OTEL_RESOURCE_ATTRIBUTES set, and no programmatic resource configuration  
C) Context propagation headers changed between environments  
D) Logs were disabled in production

<details>
<summary><strong>Answer</strong></summary>

**B** - When service names work in development but show "unknown_service" (or "unknown_service:node" etc.) in production, it means the production environment is missing the resource configuration that was present in dev. This commonly happens when developers set OTEL_SERVICE_NAME locally but forget to set it in production deployment configs, or when programmatic resource configuration isn't being applied in the production runtime.

**Why others are wrong:**
- A: **Tricky!** Batch processor affects export timing and batching, not service naming. Service names come from resource attributes, not processors.
- C: **Tricky!** Context propagation headers (traceparent/tracestate) carry trace context between services, not service identity. Each service's name comes from its own resource configuration.
- D: **Tricky!** Logs being disabled wouldn't affect trace service names. These are separate signals with independent configuration.

</details>

---

**29.** You set OTEL_RESOURCE_ATTRIBUTES=service.name=payments,service.version=1.2.3 but your spans show service.name=unknown_service. The most likely cause is:

A) The Collector overwrote the resource with its own  
B) The env var isn't set in the process, or programmatic config is overriding it  
C) W3C Trace Context not enabled  
D) Span kind is wrong

<details>
<summary><strong>Answer</strong></summary>

**B** - Per spec, SDKs MUST read OTEL_RESOURCE_ATTRIBUTES, but env var resources have lower priority than programmatic resources. Most likely: the env var isn't actually set in the process (check with `printenv`), has formatting issues, or programmatic config is overriding it.

**Why others are wrong:**
- A: The Collector doesn't overwrite application resource attributes unless explicitly configured with a resource processor.
- C: W3C Trace Context is for propagating trace context between services, not for resource attributes.
- D: Span kind describes the span's role, completely unrelated to resource attributes.

</details>

---

**30.** Performance tuning: what's the main tradeoff when you increase batch size?

A) Lower throughput but lower CPU  
B) Higher throughput/efficiency but higher latency and memory usage during buffering  
C) More accurate timestamps  
D) Less need for TLS

<details>
<summary><strong>Answer</strong></summary>

**B** - Increasing batch size means more telemetry is accumulated before sending. This improves throughput (fewer network calls, better compression) but increases latency (data waits longer before export) and memory usage (more data buffered in memory). Classic throughput vs latency tradeoff.

**Why others are wrong:**
- A: Larger batches increase throughput (more efficient), not decrease it. CPU may be slightly higher due to compression.
- C: Timestamps are set when telemetry is created, not affected by batch size.
- D: TLS requirements are independent of batch size. You still need TLS for security regardless of batching.

</details>

---

**31.** Which statement about semantic conventions is most correct?

A) They are mandatory and enforced by the Collector  
B) They are recommended naming/attribute schemas to improve interoperability and queryability  
C) They are only for metrics, not traces/logs  
D) They are deprecated in favor of baggage

<details>
<summary><strong>Answer</strong></summary>

**B** - Semantic conventions define standard naming and attribute schemas (like http.request.method, db.system) to ensure consistency across implementations. They're strongly recommended for interoperability but not enforced by the spec. Backends and tools work better when you follow them.

**Why others are wrong:**
- A: They're not mandatory. The SDK/Collector won't reject telemetry that doesn't follow them.
- C: Semantic conventions exist for all signals - traces, metrics, and logs.
- D: Semantic conventions are actively maintained and evolving. Baggage is a separate concept for request context.

</details>

---

**32.** Which naming practice tends to create the worst long-term pain?

A) Use low-cardinality span names like GET /orders/{id} patterns (templated)  
B) Put unique IDs into span names (e.g., GET /orders/12345)  
C) Use semantic convention attributes for route templates  
D) Keep service.name stable per deployable unit

<details>
<summary><strong>Answer</strong></summary>

**B** - Span names should be low-cardinality (limited distinct values) like "GET /orders/{id}" not "GET /orders/12345". High-cardinality span names make it impossible to aggregate metrics by span name, break backend indexing, and make traces unsearchable. Put IDs in attributes instead.

**Why others are wrong:**
- A: This is the correct practice - use templated/parameterized names with low cardinality.
- C: This is also correct - use semantic conventions for route templates in attributes.
- D: This is also correct - service.name should be stable per deployable unit, not change per instance.

</details>

---

**33.** In OpenTelemetry metrics, what's the most correct high-level purpose of Views (where supported)?

A) To control aggregation and attribute selection for metric streams  
B) To set trace sampling probability  
C) To change exporter retry backoff  
D) To rename span events

<details>
<summary><strong>Answer</strong></summary>

**A** - Views allow you to customize how metrics are aggregated and exported: change aggregation temporality, select which attributes to include/exclude (cardinality management), change histogram bucket boundaries, rename metrics, etc. They're configured in the SDK and control what gets exported.

**Why others are wrong:**
- B: Sampling is configured via samplers, not views. Views are for metrics, sampling is for traces.
- C: Exporter retry backoff is configured in exporter settings, not views.
- D: Span events are part of traces, not metrics. Views don't affect trace data.

</details>

---

**34.** When debugging context propagation across HTTP services, the most direct thing to check is:

A) That all services share the same exporter endpoint  
B) That inbound requests carry traceparent (and optionally tracestate) headers and that frameworks extract/inject them  
C) That all spans have the same span.kind  
D) That metrics are enabled

<details>
<summary><strong>Answer</strong></summary>

**B** - For HTTP services, trace context is propagated via the traceparent header (required, contains trace_id and span_id) and tracestate header (optional, vendor-specific data). Check that: outbound requests inject these headers, inbound requests extract them, and frameworks/libraries support W3C Trace Context format.

**Why others are wrong:**
- A: Services can export to different backends. Context propagation happens at request time, not export time.
- C: Span kind describes the span's role, doesn't affect context propagation.
- D: Metrics are independent of trace context propagation.

</details>

---

**35.** A histogram shows p99 latency. What's the correct intuition about where p99 comes from?

A) It is stored as a single metric point by default  
B) It is computed from a distribution (histogram or summary) at query time (depending on backend/format)  
C) It is a span attribute  
D) It is derived from logs severity

<details>
<summary><strong>Answer</strong></summary>

**B** - Histograms record distributions by counting observations in buckets. The p99 (99th percentile) is calculated at query time from the bucket counts. It's not stored as a single value - the histogram stores the distribution, and percentiles are derived from it.

**Why others are wrong:**
- A: Histograms store bucket counts, not individual percentile values. Percentiles are computed from the distribution.
- C: Span attributes are key-value pairs on traces, not related to metric percentile calculation.
- D: Log severity is for logs, not related to metric percentile calculation.

</details>

---

**36.** You see traces but parent/child relationships are wrong in async code. Most common culprit?

A) Wrong exporter  
B) Context not properly bound to async execution (missing instrumentation or context manager)  
C) Batch processor misconfigured  
D) Resource attributes missing

<details>
<summary><strong>Answer</strong></summary>

**B** - In async code (promises, async/await, callbacks), context must be explicitly bound to the async execution. If the framework/instrumentation doesn't handle this, child spans created in async callbacks won't find their parent context, resulting in disconnected traces or incorrect parent/child relationships.

**Why others are wrong:**
- A: Exporter choice doesn't affect span parent/child relationships - that's determined at span creation time.
- C: Batch processor affects export timing, not span relationships.
- D: Resource attributes describe the service, don't affect span parent/child relationships.

</details>

---

**37.** You want HTTP client spans to include the peer service name for service graph building. Which is the best approach?

A) Put peer service name in baggage always  
B) Set the appropriate span attributes per semantic conventions (e.g., server.address, server.port, or network.peer.address)  
C) Put peer name in span name only  
D) Use resource attribute service.name on the client span

<details>
<summary><strong>Answer</strong></summary>

**B** - Service graphs are built from span attributes that identify the peer service. service.peer.name when known; otherwise fall back to network attributes like server.address or network.peer.address.

**Why others are wrong:**
- A: Baggage propagates with requests but isn't the right place for peer service identification. Use span attributes.
- C: Span name should describe the operation, not the peer service. Attributes are for metadata like peer service.
- D: service.name is a resource attribute identifying the current service, not the peer. Each service has its own service.name.

</details>

---

**38.** Best practice for resource tagging is:

A) Put deployment-specific random values in service.name  
B) Put stable service identity in service.name, deployment details in attributes like service.version/deployment.environment  
C) Put hostname in span name  
D) Put trace_id in resource attributes

<details>
<summary><strong>Answer</strong></summary>

**B** - service.name should be stable and identify the logical service (e.g., "payment-service"), not change per deployment. Use other resource attributes for deployment-specific details: service.version for version, deployment.environment for env (prod/staging), service.instance.id for instance identity. This enables proper aggregation and comparison across deployments.

**Why others are wrong:**
- A: Random or deployment-specific values in service.name break aggregation and make historical comparison impossible.
- C: Hostname belongs in resource attributes (host.name), not span name. Span name describes the operation.
- D: trace_id is per-request, not per-service. It belongs in trace context, not resource attributes.

</details>

---

**39.** In the Collector, which configuration best reflects "traces pipeline receives OTLP and exports to OTLP"?

A) receivers: [otlp] processors: [batch] exporters: [otlp] under service.pipelines.traces  
B) Put exporters under receivers  
C) Put receivers under exporters  
D) Put everything under extensions

<details>
<summary><strong>Answer</strong></summary>

**A** - This shows the proper YAML structure for a Collector pipeline. Under service.pipelines.traces, you list the receivers, processors, and exporters to use. The Collector connects them in order: OTLP receiver → batch processor → OTLP exporter.

**Why others are wrong:**
- B: Exporters aren't nested under receivers. They're separate lists at the same level.
- C: Receivers aren't nested under exporters. They're separate lists at the same level.
- D: Extensions are separate from pipelines. Pipelines go under service.pipelines, extensions under service.extensions.

</details>

---

**40.** What's the most correct statement about sampling and debugging?

A) Sampling never affects debugging because you can extrapolate missing traces  
B) If you sample too aggressively, you may lose rare failure traces, so adjust sampling strategy or use tail sampling for "interesting" traces  
C) Sampling only applies to metrics  
D) Sampling is decided by the Collector only

<details>
<summary><strong>Answer</strong></summary>

**B** - If you sample at 1%, you'll miss 99% of traces including rare errors. For debugging, you need the error traces. Solutions: increase sampling rate, use parent-based sampling (if parent is sampled, sample children), or use tail-based sampling in the Collector to keep error traces and sample successful ones.

**Why others are wrong:**
- A: You can't reliably extrapolate missing traces, especially for rare errors or edge cases.
- C: Sampling applies to traces, not metrics. Metrics are typically not sampled (they're already aggregated).
- D: Sampling can be decided by the SDK (head-based) or Collector (tail-based). Both are valid approaches.

</details>

**41.** A receiver is best described as:

A) A component that sends data to a backend  
B) A component that accepts telemetry data into the Collector (push or pull)  
C) A component that batches spans  
D) A component that transforms attributes only

<details>
<summary><strong>Answer</strong></summary>

**B** - Receivers are the entry point for data into the Collector. They can accept pushed data (OTLP receiver accepts gRPC/HTTP), pull data (Prometheus receiver scrapes metrics), or read from files (filelog receiver). They're the first component in the pipeline.

**Why others are wrong:**
- A: That's an exporter - sends data to backends.
- C: That's the batch processor - batches data for efficient export.
- D: That's what processors do - receivers just accept data as-is.

</details>

---

**42.** If you must choose one first step to improve pipeline reliability under intermittent backend outages:

A) Disable retries so failures surface quickly  
B) Enable/size queues + retries appropriately, and ensure backpressure doesn't crash the Collector  
C) Increase log verbosity in production permanently  
D) Remove batch processor

<details>
<summary><strong>Answer</strong></summary>

**B** - Queues buffer data during temporary backend outages, retries handle transient failures. Proper sizing prevents data loss during short outages while preventing OOM during long outages. Configure sending_queue (size, persistent storage) and retry_on_failure (enabled, initial/max interval) in exporters.

**Why others are wrong:**
- A: Disabling retries means data loss on any transient failure. Retries are essential for reliability.
- C: Increased log verbosity helps debugging but doesn't improve reliability. It may actually hurt performance.
- D: Batch processor improves efficiency and reduces backend load. Removing it makes things worse.

</details>

---

**43.** What's the best description of connectors in the Collector?

A) They are exporters that can also receive data, enabling pipeline-to-pipeline bridging  
B) They are TLS settings blocks  
C) They are required for OTLP  
D) They only work for logs

<details>
<summary><strong>Answer</strong></summary>

**A** - Connectors act as both an exporter (from one pipeline) and a receiver (to another pipeline). Example: spanmetrics connector exports from traces pipeline and receives into metrics pipeline, generating metrics from span data. They enable signal transformation within the Collector.

**Why others are wrong:**
- B: TLS settings are configured in receivers/exporters, not connectors.
- C: OTLP works without connectors. Connectors are for pipeline-to-pipeline bridging.
- D: Connectors work for all signal types - traces, metrics, and logs.

</details>

---

**44.** Which is the strongest reason to avoid high-cardinality attributes on metrics and logs?

A) They break trace context  
B) They make storage/query costs and performance explode, reducing system usability  
C) They prevent TLS  
D) They are disallowed by OpenTelemetry spec

<details>
<summary><strong>Answer</strong></summary>

**B** - High-cardinality attributes (user_id, request_id, etc.) create massive numbers of unique time series in metrics or log entries. This causes: exponential storage growth, slow queries, high memory usage, and potentially crashes backends. Keep metric/log attributes low-cardinality (limited distinct values).

**Why others are wrong:**
- A: High cardinality doesn't break trace context. It's a storage/performance issue.
- C: TLS is unrelated to cardinality. It's about encryption.
- D: The spec allows high-cardinality attributes but it's a terrible practice that breaks systems.

</details>

---

**45.** You want to add a team=backend attribute to all spans at the Collector. Which processor?

A) Batch processor  
B) Attributes processor or resource processor  
C) Memory limiter  
D) Filter processor

<details>
<summary><strong>Answer</strong></summary>

**B** - The attributes processor can add/modify/delete span attributes. The resource processor can add/modify/delete resource attributes (which apply to all telemetry). Both can add a team=backend attribute, depending on whether you want it as a span attribute or resource attribute.

**Why others are wrong:**
- A: Batch processor groups data for export, doesn't modify attributes.
- C: Memory limiter protects against OOM, doesn't modify attributes.
- D: Filter processor drops entire spans/metrics/logs based on conditions, doesn't add attributes.

</details>

---

**46.** Which statement about span status is most correct?

A) Status is optional and rarely used  
B) Status (OK, ERROR, UNSET) indicates span outcome; ERROR typically means operation failed  
C) Status is only for HTTP spans  
D) Status replaces span attributes

<details>
<summary><strong>Answer</strong></summary>

**B** - Span status is a standardized way to indicate whether the operation succeeded or failed. UNSET (default), OK (explicit success), ERROR (operation failed). Backends use status to identify errors, calculate error rates, and highlight failed operations. Set status to ERROR when exceptions occur or operations fail.

**Why others are wrong:**
- A: Status is important for error tracking and should be set appropriately. It's widely used.
- C: Status applies to all span types, not just HTTP. DB spans, RPC spans, etc. all use status.
- D: Status complements attributes, doesn't replace them. Use both: status for outcome, attributes for details.

</details>

---

**47.** In a ParentBased sampler, what happens to child spans when the parent is sampled?

A) Children are always dropped  
B) Children inherit the parent's sampling decision  
C) Children use a different sampler  
D) Children are always sampled at 100%

<details>
<summary><strong>Answer</strong></summary>

**B** - ParentBased sampler ensures consistent sampling across a distributed trace. If the parent span was sampled, all children are sampled. If the parent wasn't sampled, children aren't sampled. This prevents partial traces (some spans sampled, others not) which are hard to analyze.

**Why others are wrong:**
- A: Children inherit the parent's decision, not dropped automatically.
- C: Children use the parent's decision, not a different sampler.
- D: Children might be sampled at 100% if parent was sampled, but they might also not be sampled if parent wasn't. They inherit the decision.

</details>

---

**48.** What happens when a BatchSpanProcessor's queue is full?

A) The Collector crashes  
B) New spans are dropped  
C) Export happens immediately  
D) Spans are sent to a different exporter

<details>
<summary><strong>Answer</strong></summary>

**B** - The BatchSpanProcessor has a maximum queue size (max_queue_size). When full, new spans are dropped rather than queued. This prevents unbounded memory growth. The SDK may log warnings about dropped spans. Monitor SDK metrics to detect this condition.

**Why others are wrong:**
- A: The SDK doesn't crash - it drops spans gracefully to protect itself from memory exhaustion.
- C: Export happens on schedule (OTEL_BSP_SCHEDULE_DELAY) or when batch is full, not when queue is full.
- D: Spans aren't rerouted. They're simply dropped. Configure one exporter per processor.

</details>

---

**49.** OTEL_BSP_SCHEDULE_DELAY controls:

A) How long to wait before starting the SDK  
B) Maximum time the batch processor waits before exporting, even if batch isn't full  
C) Sampling probability  
D) Exporter retry interval

<details>
<summary><strong>Answer</strong></summary>

**B** - This controls the delay interval between consecutive exports. The batch processor exports when either: the batch reaches max_export_batch_size OR schedule_delay time elapses (whichever comes first). Lower values = lower latency but more frequent exports. Default is typically 5000 milliseconds.

**Why others are wrong:**
- A: SDK starts immediately. This controls ongoing export timing, not startup.
- C: Sampling probability is controlled by sampler configuration (OTEL_TRACES_SAMPLER), not batch processor.
- D: Exporter retry interval is controlled by exporter retry settings, not batch processor schedule delay.

</details>

---

**50.** If a span's parent context is not properly set, what happens?

A) The span becomes a root span (new trace)  
B) The span is dropped  
C) The exporter fails  
D) Metrics stop working

<details>
<summary><strong>Answer</strong></summary>

**A** - When you create a span without providing parent context (or if context isn't properly propagated), the SDK creates a root span with a new trace_id. This is why broken context propagation results in fragmented traces - each service starts a new trace instead of continuing the existing one.

**Why others are wrong:**
- B: Spans aren't dropped due to missing parent context. They're created as root spans.
- C: Exporter works regardless of parent context. It exports whatever spans are created.
- D: Metrics are independent of span parent context.

</details>

---

**51.** Which is the best reason NOT to put trace_id as a metric label on all metrics?

A) It breaks W3C Trace Context  
B) It increases cardinality dramatically and can destabilize metric backends  
C) It prevents exporting to Prometheus  
D) It forces always-on sampling

<details>
<summary><strong>Answer</strong></summary>

**B** - Every unique trace_id creates a new time series. With millions of requests, you get millions of time series, causing: massive storage costs, slow queries, high memory usage, and backend instability. This is called "cardinality napalm" - it destroys metric systems. Never use high-cardinality values as metric attributes.

**Why others are wrong:**
- A: W3C Trace Context is for propagating trace context, unrelated to metric labels.
- C: Prometheus can technically accept it, but it will destroy your Prometheus instance with cardinality explosion.
- D: Sampling is independent of metric labels. But the cardinality problem remains regardless of sampling.

</details>

---

**52.** SimpleSpanProcessor vs BatchSpanProcessor - what's the key difference?

A) Simple is faster  
B) Simple exports each span synchronously (blocking); Batch queues and exports asynchronously  
C) Simple only works with OTLP  
D) Batch doesn't support sampling

<details>
<summary><strong>Answer</strong></summary>

**B** - SimpleSpanProcessor calls the exporter immediately for each span (synchronous, blocks the application thread). BatchSpanProcessor queues spans and exports them asynchronously in batches. Batch is almost always preferred for production - Simple is mainly for testing/debugging.

**Why others are wrong:**
- A: Simple is slower because it blocks on every span. Batch is faster due to async + batching.
- C: Both work with any exporter (OTLP, Jaeger, etc.). The processor is independent of exporter choice.
- D: Sampling happens before processors. Both processor types work with any sampler.

</details>

---

**53.** Most OpenTelemetry SDKs handle null/None attribute values by:

A) Storing them as "null" string  
B) Ignoring or removing them (null is not a valid attribute value)  
C) Converting them to empty strings  
D) Throwing an error

<details>
<summary><strong>Answer</strong></summary>

**B** - The OpenTelemetry spec defines valid attribute value types: string, boolean, int, double, array of these types. Null/None is not a valid type. Most SDKs silently ignore attempts to set null values rather than throwing errors. If you need to represent "no value", omit the attribute entirely.

**Why others are wrong:**
- A: Null isn't stored as "null" string. It's ignored/removed.
- C: Null isn't converted to empty string. Empty string is a valid value, null is not.
- D: Most SDKs don't throw errors, they silently ignore null values for robustness.

</details>

---

**54.** trace.get_tracer() uses which tracer provider?

A) A new provider created each time  
B) The global tracer provider set via trace.set_tracer_provider()  
C) The Collector's provider  
D) A random provider

<details>
<summary><strong>Answer</strong></summary>

**B** - The SDK uses a global tracer provider pattern. You configure and set the global provider once at startup (trace.set_tracer_provider(provider)). Then throughout your code, trace.get_tracer() returns a tracer from that global provider. This allows instrumentation libraries to get tracers without knowing about your specific configuration.

**Why others are wrong:**
- A: Creating a new provider each time would be wasteful and lose configuration. The global provider is reused.
- C: The Collector doesn't provide tracers to applications. Each application has its own SDK with its own tracer provider.
- D: There's no randomness. It uses the explicitly configured global provider.

</details>

---

**55.** A slow exporter (5 seconds per batch) with high span creation rate will likely cause:

A) Faster exports  
B) Queue backup and eventual span drops  
C) Automatic scaling  
D) Sampling to increase

<details>
<summary><strong>Answer</strong></summary>

**B** - If spans are created faster than the exporter can send them (5 seconds per batch is very slow), the queue fills up. Once max_queue_size is reached, new spans are dropped. This is a classic backpressure problem. Solutions: fix exporter performance, increase queue size, reduce span creation rate, or improve sampling.

**Why others are wrong:**
- A: Slow exporter makes exports slower, not faster.
- C: The SDK doesn't automatically scale. You need to tune configuration or fix the bottleneck.
- D: Sampling rate is configured separately. It doesn't automatically increase due to slow exporters.

</details>

---

**56.** Can you call set_attribute() on a span after calling end()?

A) Yes, it works normally  
B) No, it's typically ignored (no-op) - spans are immutable after end()  
C) Yes, but only for resource attributes  
D) It throws an error always

<details>
<summary><strong>Answer</strong></summary>

**B** - Once you call span.end(), the span is considered complete and immutable. Attempts to modify it (set_attribute, add_event, set_status) are typically ignored as no-ops. This prevents accidental modification of completed spans and allows the SDK to safely export them.

**Why others are wrong:**
- A: It doesn't work normally. The span is immutable after end().
- C: Resource attributes are set at SDK initialization, not on individual spans. And they can't be modified after span.end() either.
- D: Most SDKs silently ignore it (no-op) rather than throwing errors, for robustness.

</details>

---

**57.** ParentBased sampler with an incoming sampled parent context will:

A) Ignore the parent and use root sampler  
B) Respect the parent's sampling decision and sample the span  
C) Always drop the span  
D) Only work with OTLP

<details>
<summary><strong>Answer</strong></summary>

**B** - When a ParentBased sampler sees incoming context with a sampled parent, it samples the span to maintain trace continuity. This ensures complete traces - if the root was sampled, all descendants are sampled. If there's no parent context, it falls back to the configured root sampler.

**Why others are wrong:**
- A: It respects the parent, doesn't ignore it. That's the whole point of ParentBased.
- C: It samples the span (respects parent's decision), doesn't drop it.
- D: ParentBased sampler works with any exporter/protocol. It's SDK-side sampling logic.

</details>

---

**58.** Dropping all attributes from a metric via a View results in:

A) The metric is deleted  
B) Cardinality becomes 1 (all data points collapse into single time series)  
C) The metric becomes a trace  
D) Export fails

<details>
<summary><strong>Answer</strong></summary>

**B** - Attributes are what distinguish different time series. If you drop all attributes, all data points for that metric collapse into a single time series (cardinality = 1). This can be useful for getting a total across all dimensions, but you lose the ability to filter/group by attributes.

**Why others are wrong:**
- A: The metric still exists, just with no attributes (single time series).
- C: Metrics and traces are separate signals. Dropping attributes doesn't convert between them.
- D: Export works fine. A metric with no attributes is valid, just not very useful for analysis.

</details>

---

**59.** Counters in OpenTelemetry are:

A) Can increase or decrease  
B) Monotonic (non-decreasing) - calling add() with negative value is invalid  
C) Only for HTTP requests  
D) Stored as strings

<details>
<summary><strong>Answer</strong></summary>

**B** - Counters represent cumulative values that only go up (requests served, bytes sent, errors). Calling add() with a negative value is invalid. If you need a value that can increase or decrease (queue size, active connections), use UpDownCounter instead.

**Why others are wrong:**
- A: That's UpDownCounter. Counter is monotonic only.
- C: Counters can measure anything cumulative, not just HTTP requests.
- D: Counters are numeric (int or double), not strings.

</details>

---

**60.** If spans are dropped due to queue overflow, what should you do?

A) Decrease max_queue_size  
B) Increase max_queue_size and/or max_export_batch_size, ensure exporter is performant  
C) Disable batching  
D) Remove all processors

<details>
<summary><strong>Answer</strong></summary>

**B** - Queue overflow means spans are being created faster than they can be exported. Solutions: increase queue size (more buffering), increase batch size (more efficient export), ensure exporter is fast (check network/backend), or reduce span creation rate (sampling). Also verify the backend can handle the load.

**Why others are wrong:**
- A: Decreasing queue size makes the problem worse - less buffering means more drops.
- C: Disabling batching makes export less efficient, likely making the problem worse.
- D: Removing processors doesn't fix queue overflow. The queue is in the span processor itself.

</details>

---

## Scoring Guide

- **54-60 (90%+)**: Excellent! You're well-prepared for the OTCA exam
- **45-53 (75-89%)**: Good! Review missed topics and you'll be ready
- **36-44 (60-74%)**: Need more study - focus on SDK and Collector sections
- **Below 36 (<60%)**: Revisit the 30-day curriculum, especially weeks 2-3

**Key Areas to Review if You Scored Low:**
- SDK configuration and resource attributes (Questions 1, 3, 28, 29, 38)
- Collector pipeline architecture (Questions 2, 6, 17, 39, 41, 43)
- Context propagation mechanisms (Questions 5, 9, 19, 21, 34, 50)
- Sampling strategies (Questions 10, 15, 47, 57)
- Batch processing and performance (Questions 4, 12, 30, 48, 49, 52)
- Debugging and troubleshooting (Questions 24, 26, 36, 42)
