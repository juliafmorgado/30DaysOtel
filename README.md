# 30 Days of OpenTelemetry

Welcome!

> **What is OpenTelemetry?** It's the industry-standard framework for collecting and exporting observability data (traces, metrics, logs) in a vendor-neutral way. Think of it as the unified language that lets you understand what's happening inside your distributed systems.

This is a **public learning project** designed to help others follow along and build production-ready observability skills step-by-step. Whether you're a complete beginner or already familiar with observability concepts, you'll find structured content, hands-on examples, and real-world patterns here. Feel free to follow along with me!

---

## Weekly Structure

| Week   | Theme | Focus | What We'll Build |
|--------|-------|-------|-------------------|
| **1** | Observability Fundamentals | Understanding traces, metrics, logs; semantic conventions; auto vs manual instrumentation | Mental models + reading real traces |
| **2** | OpenTelemetry APIs & SDK | Hands-on with Tracing API, Metrics API, Logs API, context propagation, SDK pipelines | Instrumented Node.js/Python apps |
| **3** | OpenTelemetry Collector | Receivers, processors, exporters, transformations (OTTL), deployment models, scaling | Full collector pipeline + multi-backend routing |
| **4** | Production Patterns & Final Project | Debugging traces, schema management, backpressure handling, architecture design | Complete observable system (app + collector + backends) |

---

## Goals of This Project

- Understand **observability fundamentals** (why it matters, what problems it solves)
- Be fluent in **tracing, metrics, and logs** (the three pillars of observability)
- Master the **OpenTelemetry API & SDK** (creating telemetry in code)
- Build and configure the **OpenTelemetry Collector** (processing and routing telemetry)
- Debug real pipelines using **zPages, logging exporters, sampling strategies, and memory limiters**
- Build a **final project** with:
  - Instrumented multi-service application
  - Full collector pipeline with transformations (OTTL)
  - Multiple backends (Jaeger for traces, Prometheus for metrics, Dash0 for everything)
- Be ready to pass the [**OpenTelemetry Certified Associate (OTCA)**](https://training.linuxfoundation.org/certification/opentelemetry-certified-associate-otca/) exam

---

## Daily Breakdown

<details>
<summary><strong>Week 1: Observability Fundamentals</strong></summary>

| Day | Topic | What We'll Learn |
|-----|-------|-------------------|
| 1 | Why Observability Matters | The shift from monoliths to microservices and why traditional monitoring isn't enough |
| 2 | What is OpenTelemetry? | Vendor-neutral telemetry, the API/SDK separation, and why it won |
| 3 | Traces, Metrics, Logs | How requests flow through distributed systems; three lenses on the same event |
| 4 | Spans (Building Blocks) | Anatomy of a span, parent-child relationships, reading waterfall charts |
| 5 | Semantic Conventions | Why `http.method` not `request_method`; the shared language of observability |
| 6 | Instrumentation | Auto-instrumentation vs manual; when to use each; how spans get created |
| 7 | Week 1 Review | Consolidation + missing pieces (sampling preview, context propagation details) |

</details>

<details>
<summary><strong>Week 2: OpenTelemetry APIs & SDK</strong></summary>

| Day | Topic | What We'll Learn |
|-----|-------|-------------------|
| 8 | API vs SDK | The architecture that makes OpenTelemetry portable; separation of concerns |
| 9 | Tracing API | Creating nested spans, span events, adding attributes; hands-on examples |
| 10 | Metrics API | Counters, gauges, histograms; measuring what matters |
| 11 | Logs API | Structured logging + trace correlation; logs as part of the telemetry story |
| 12 | Context Propagation | How trace context flows through your app and across services |
| 13 | SDK Pipelines | Samplers, processors, exporters; controlling telemetry flow |
| 14 | Hands-on + Week 2 Review | Build an instrumented app + recap |

</details>

<details>
<summary><strong>Week 3: OpenTelemetry Collector Deep Dive</strong></summary>

| Day | Topic | What We'll Learn |
|-----|-------|-------------------|
| 15 | Collector Architecture | Why the Collector exists; receivers → processors → exporters |
| 16 | Receivers | OTLP, Filelog, Prometheus; how telemetry enters the Collector |
| 17 | Processors | Batch, transform, attributes, tail sampling; shaping your data |
| 18 | Exporters | Sending to Jaeger, Prometheus, Loki, Tempo; multi-backend strategies |
| 19 | Transformations (OTTL) | OpenTelemetry Transformation Language; advanced filtering and manipulation |
| 20 | Deployment Models | Agent, gateway, sidecar, DaemonSet; where to run the Collector |
| 21 | Scaling | Load balancing, high availability, multi-Collector architectures |
| 22 | Week 3 Review | Consolidate Collector knowledge |

</details>

<details>
<summary><strong>Week 4: Production Patterns & Final Project</strong></summary>

| Day | Topic | What We'll Learn |
|-----|-------|-------------------|
| 23 | Debugging the Collector | Logging exporters, zPages, troubleshooting common issues |
| 24 | Debugging Traces | Propagation failures, broken traces, missing spans |
| 25 | Backpressure & Error Handling | Dropped spans, memory limits, graceful degradation |
| 26 | Schema Management | Semantic convention versions, schema evolution |
| 27 | Advanced Patterns + Architecture | Message queues, async patterns, designing observable systems |
| 28 | **Final Project** | Build a complete system: app + Collector + transformations + multiple backends |
| 29 | Week 4 Review | Lessons learned, what worked, what didn't |
| 30 | Mock Exam + Final Recap | OTCA exam prep, architecture review, next steps |

</details>

---

## Tools and Technologies
This learning journey uses:

**Languages:**
- Node.js (primary examples)
- Python (secondary examples)

**OpenTelemetry:**
- OpenTelemetry API & SDK (Node.js, Python)
- OpenTelemetry Collector
- Auto-instrumentation libraries

**Backends:**
- [Jaeger](https://www.jaegertracing.io/) (trace visualization)
- [Prometheus](https://prometheus.io/) (metrics)
- [Dash0](https://www.dash0.com/) (unified observability platform)

**Utilities:**
- [OTelBin](https://www.otelbin.io/) (Collector config validation)
- Docker / Docker Compose (local setup)



---

# Connect with Me

- [**LinkedIn**](https://www.linkedin.com/in/juliafmorgado/)
- [**X/Twitter**](https://x.com/juliafmorgado)
- [**YouTube**](https://www.youtube.com/juliafmorgado) 
- [**Instagram**](https://www.instagram.com/juliafmorgado/)
- [**Twitch**](https://www.twitch.tv/juliafmorgado)
- [**Blog**](https://www.juliafmorgado.com/)

**Learning OpenTelemetry too?** Feel free to reach out! I'd love to connect with fellow learners and exchange insights.

---

## Acknowledgments

Inspired by:
- The OpenTelemetry community
- [OpenTelemetry Official Docs](https://opentelemetry.io/docs/)
- [90DaysofDevOps](https://github.com/MichaelCade/90DaysOfDevOps) by my friend [Michael Cade](https://www.linkedin.com/in/michaelcade1)
- Everyone sharing their OpenTelemetry journey online

---

**⭐ Star this repo if you find it helpful!**

Let's make observability accessible to everyone. Happy learning!

---

# License

This project is open source under the MIT License. 
