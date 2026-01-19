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
| **3** | OpenTelemetry Collector | Receivers, processors, exporters, transformations (OTTL), deployment models, scaling | Full collector pipeline with OTTL transformations |
| **4** | Production Readiness & Certification | Troubleshooting, debugging, security, Kubernetes Operator, production best practices, OTCA exam prep | Complete observable system + certification readiness |

---

## Goals of This Project

- Understand **observability fundamentals** (why it matters, what problems it solves)
- Become fluent in **tracing, metrics, and logs** (the three pillars of observability)
- Master the **OpenTelemetry API & SDK** (creating telemetry in code)
- Build and configure the **OpenTelemetry Collector** (processing and routing telemetry)
- Learn **production patterns** including:
  - Debugging distributed traces and missing telemetry
  - Troubleshooting collector pipelines
  - Production best practices (security, performance, cost optimization)
  - Kubernetes deployment with OpenTelemetry Operator
- **Pass the OpenTelemetry Certified Associate (OTCA) exam** with comprehensive preparation including:
  - Complete coverage of all 4 certification domains
  - Practice questions and mock exam
  - Quick reference guide and exam strategies

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

[Week 1 Knowledge Check](week1/week1-knowledge-check.md)

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
| 13 | Break Day | Rest and recharge |
| 14 | Week 2 Review | Recap of APIs, SDK basics, and what we've accomplished |

[Week 2 Knowledge Check](week2/week2-knowledge-check.md)

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

[Week 3 Knowledge Check](week3/week3-knowledge-check.md)

</details>

<details>
<summary><strong>Week 4: Production Patterns & Certification Prep</strong></summary>

| Day | Topic | What We'll Learn |
|-----|-------|-------------------|
| 22 | Debugging the Collector | Systematic debugging approaches, logging exporters, health checks, metrics analysis |
| 23 | Where the Heck is My Data? | Troubleshooting missing telemetry data through the entire pipeline (application → SDK → collector → backend) |
| 24 | Debugging Distributed Traces | Finding lost spans, broken context propagation, systematic troubleshooting workflows |
| 25 | Production Issues at Scale | Backpressure management, dropped spans, error handling, resource management |
| 26 | Production Best Practices | Security (TLS, PII protection), performance optimization, monitoring strategies |
| 27 | OpenTelemetry Operator Overview | Kubernetes-native observability, auto-instrumentation injector, CRDs, deployment modes |
| 28 | Final Project | Build a complete observability stack with Dash0 integration |
| 29 | Week 4 Recap | Systematic review of debugging trilogy, production patterns, and key concepts mastered |
| 30 | What's Next | Advanced OpenTelemetry topics and continuing your observability journey |

[Week 4 Knowledge Check](week4/week4-knowledge-check.md)

**OTCA Certification Resources:**
- [OTCA Exam Preparation Guide](week4/otca-exam-prep.md) - Complete study guide covering all 4 domains
- [OTCA Mock Exam](week4/otca-mock-exam.md) - 20 practice questions with detailed answers
- [OTCA Quick Reference](week4/otca-quick-reference.md) - Essential concepts and commands for exam day


</details>

---

## Prerequisites

**To follow along, you'll need:**
- Basic JavaScript/Node.js knowledge (examples use Express.js, but you can use any language with OpenTelemetry support)
- Docker installed (for running Jaeger and other backends)
- Terminal/command line familiarity
- Curiosity about observability!

**Note:** While our examples use Node.js, OpenTelemetry supports many languages including Python, Go, Java, .NET, Ruby, PHP, and more. The concepts are the same across all languages.

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

All contributions welcome, from typo fixes to major corrections.

---

## Resources I'm Starting With

**Official Docs:**
- [OpenTelemetry Docs](https://opentelemetry.io/docs/)
- [OTCA Exam Guide](https://training.linuxfoundation.org/certification/opentelemetry-certified-associate-otca/)
- [Dash0 docs](https://www.dash0.com/documentation/dash0)

**Books:**
- [Practical OpenTelemetry: Adopting Open Observability Standards Across Your Organization](https://www.amazon.com/Practical-OpenTelemetry-Observability-Standards-Organization/dp/1484290747) by [Daniel Gomez Blanco](https://www.linkedin.com/in/danielgblanco86/)
- [Learning OpenTelemetry](https://www.oreilly.com/library/view/learning-opentelemetry/9781098147174/) by [Ted Young](https://www.linkedin.com/in/ted-young/) and [Austin Parker](https://www.linkedin.com/in/austinlparker/)

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
