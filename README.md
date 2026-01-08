# 30 Days of OpenTelemetry

Welcome!

> **What is OpenTelemetry?**
> 
> It's the industry-standard framework for collecting and exporting observability data (traces, metrics, logs) in a vendor-neutral way. Think of it as the unified language that lets you understand what's happening inside your distributed systems.

This is a **public learning project** designed to help others follow along and build production-ready observability skills step-by-step. Whether you're a complete beginner or looking to get certified, you'll find structured content, hands-on examples, and comprehensive exam preparation here.

---

## Weekly Structure

| Week   | Theme | Focus | What We'll Build |
|--------|-------|-------|-------------------|
| **1** | Observability Fundamentals | Understanding traces, metrics, logs; semantic conventions; auto vs manual instrumentation | Mental models + reading real traces |
| **2** | OpenTelemetry APIs & SDK | Hands-on with Tracing API, Metrics API, Logs API, context propagation, SDK pipelines | Instrumented Node.js apps |
| **3** | OpenTelemetry Collector | Receivers, processors, exporters, transformations (OTTL), deployment models, scaling | Full collector pipeline + multi-backend routing |
| **4** | Production & Certification | Debugging, security, Kubernetes Operator, architecture patterns, OTCA exam prep | Complete observable system + certification readiness |

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
  - Multiple backends (Jaeger for traces, Prometheus for metrics, Loki for logs)
  - Production-ready security and cost optimization
- **Pass the OpenTelemetry Certified Associate (OTCA) exam** with comprehensive preparation including:
  - Complete coverage of all 4 certification domains
  - Practice questions and assessment scenarios
  - Study guide and exam strategies

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
| 15 | Collector Architecture | Why the Collector exists; receivers → processors → exporters pipeline flow |
| 16 | Receivers | OTLP, Filelog, Prometheus; how telemetry enters the Collector |
| 17 | Processors | Batch, attributes, filter, transform; essential data processing patterns |
| 18 | Exporters | Multi-backend strategies; Jaeger, Prometheus, Loki routing |
| 19 | Transformations (OTTL) | OpenTelemetry Transformation Language; business-friendly data manipulation |
| 20 | Deployment & Scaling | Agent vs Gateway patterns; basic scaling concepts |
| 21 | Week 3 Recap | Insights and wisdom; mindset shifts from learning to architecting |

</details>

<details>
<summary><strong>Week 4: Production Patterns & Certification Prep</strong></summary>

| Day | Topic | What We'll Learn |
|-----|-------|-------------------|
| 22 | Debugging the Collector | Systematic debugging approaches, logging exporters, health checks, metrics analysis |
| 23 | Debugging Distributed Traces | Finding lost spans, broken context propagation, systematic troubleshooting workflows |
| 24 | Production Issues at Scale | Backpressure management, dropped spans, error handling, resource management |
| 25 | Production Best Practices | Security (TLS, PII protection), performance optimization, monitoring strategies |
| 26 | OpenTelemetry Operator Overview | Kubernetes-native observability, auto-instrumentation, CRDs, deployment modes |
| 27 | Real-World Architecture Patterns | Startup growth, enterprise multi-tenant, hybrid cloud, cost-optimized patterns |
| 28 | **Final Project** | Build complete e-commerce observability stack with security, cost optimization, business context |
| 29 | Advanced Topics Preview | Custom instrumentation, advanced sampling, security observability, emerging technologies |
| 30 | **Certification Study Guide & Assessment** | OTCA exam preparation, practice questions, domain review, final assessment |

</details>

---

## Prerequisites

**To follow along, you'll need:**
- Basic JavaScript/Node.js knowledge (examples use Express.js)
- Docker installed (for running Jaeger and other backends)
- Terminal/command line familiarity
- Curiosity about observability! 🔍

**Optional but helpful:**
- Experience with distributed systems
- Basic understanding of HTTP and APIs
- Familiarity with monitoring concepts

---
## Contributing

This is a learning project, which means **I will make mistakes**. If you spot:

- ❌ Technical errors or outdated information
- 💡 Better ways to explain concepts
- 🐛 Broken code examples
- 📚 Resources I should check out
- ❓ Questions I should explore

**Please:**
1. Open an Issue (for discussion)
2. Submit a PR (for fixes)
3. Leave a comment on social media posts
4. DM me directly

All contributions welcome, from typo fixes to major corrections. You'll be credited!

---

## Resources I'm Starting With

**Official Docs:**
- [OpenTelemetry Docs](https://opentelemetry.io/docs/)
- [OTCA Exam Guide](https://training.linuxfoundation.org/certification/opentelemetry-certified-associate-otca/)
- [Dash0 docs](https://www.dash0.com/documentation/dash0)

**Books:**
- [Practical OpenTelemetry: Adopting Open Observability Standards Across Your Organization](https://www.amazon.com/Practical-OpenTelemetry-Observability-Standards-Organization/dp/1484290747) by [Daniel Gomez Blanco](https://www.linkedin.com/in/danielgblanco86/)
- [Learning OpenTelemetry](https://www.oreilly.com/library/view/learning-opentelemetry/9781098147174/) by [Ted Young](https://www.linkedin.com/in/ted-young/) and [Austin Parker](https://www.linkedin.com/in/austinlparker/)

**Courses/Workshops:**
- [OpenTelemetry Course on Udemy](https://www.udemy.com/course/opentelemetry/) (if I find a good one)
- Dash0 internal workshops (from my team)

**Community:**
- [OpenTelemetry Slack](https://cloud-native.slack.com/) (#opentelemetry channel)
- [CNCF OpenTelemetry SIG meetings](https://github.com/open-telemetry/community)

I'll add more as I discover them.

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
