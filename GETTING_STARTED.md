# Getting Started

Welcome to 30 Days of OpenTelemetry! Not sure where to jump in? Pick the option below that matches how you want to learn.

---

## 1. I want to learn by reading

Start with the fundamentals, no code required yet.

**[Week 1, Day 1: Why Observability Matters](week1/day1.md)**

This is the beginning of the full 30-day path: observability concepts, the three pillars (traces, metrics, logs), semantic conventions, and instrumentation basics, before you touch any code. Work through Week 1 day by day, then continue into Week 2 (APIs & SDK) and Week 3 (Collector).

---

## 2. I want to learn by running code

Prefer to get your hands dirty first? Run a working example straight away.

```bash
cd examples/day9-tracing-api
npm install
npm start
```

This spins up the Day 9 Tracing API demo (a small Express app instrumented with OpenTelemetry) so you can see spans, attributes, and context propagation in action. Once it's running, go back to [Week 2, Day 9](week2/day09.md) to understand what the code is actually doing, then explore the other examples in [`examples/`](examples/) (metrics, logs, context propagation, collector receivers/processors/exporters, OTTL, deployment patterns).

---

## 3. I want to get certified

Aiming for the **OpenTelemetry Certified Associate (OTCA)** exam? Head straight to the certification-focused week.

**[Week 4: Production Readiness & Certification](week4/)**

Week 4 covers troubleshooting, security, Kubernetes deployment, and production best practices, plus dedicated OTCA resources:

- [OTCA Exam Preparation Guide](week4/otca-exam-prep.md) — full study guide covering all 4 exam domains
- [OTCA Mock Exam](week4/otca-mock-exam.md) — 20 practice questions with detailed answers
- [OTCA Quick Reference](week4/otca-quick-reference.md) — essential concepts and commands for exam day

If you're new to OpenTelemetry, it's still worth skimming Weeks 1–3 first since the exam covers fundamentals, the API/SDK, and the Collector, not just Week 4 topics.

---

Not sure which path fits? Check the [full README](README.md) for the complete weekly breakdown and prerequisites.
