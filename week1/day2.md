# Day 2 – Trying to Understand Observability (and Why OpenTelemetry Exists)

Today is **day 2** of my 30-day OpenTelemetry learning journey. 

Today was about asking:  **“Why does observability even matter, and why is OpenTelemetry such a big deal?”**

---

## Starting from the real problem: modern systems are hard to understand

Modern software systems are difficult to operate, even when they are built correctly.

Users expect fast responses and near-perfect uptime. Systems are distributed by default. A single request can pass through multiple services, owned by different teams, and touch databases or infrastructure you do not directly control. At the same time, changes are deployed frequently.

When something breaks, the failure rarely points clearly to its cause. A slowdown might appear in one service, but be caused by something much deeper in the system. Engineers often jump between logs, metrics, dashboards, and traces, trying to manually reconstruct what happened.

This is the environment observability exists for.

---

## What observability actually means

Observability is the ability to understand what your system is doing **from the outside**, especially when it is running in production and not behaving as expected.

It is not just about knowing *that* something is wrong.  
It is about being able to explain *why* it is wrong.

A simple way to frame it is:

> Observability = telemetry + holistic analysis

Telemetry is the raw data a system produces: logs, metrics, and traces.  
Holistic analysis means those signals must be **connected**, not viewed in isolation.

If telemetry is fragmented, engineers are left guessing. When telemetry is connected, engineers can reason about cause and effect.

This idea of connection leads directly to **correlation**.

---

## Why data alone is not enough

One of the biggest realizations for me today was that having more data does not automatically lead to better understanding.

A system can produce enormous volumes of logs, metrics, and dashboards and still be extremely difficult to debug. The issue is not data scarcity. The issue is **uncorrelated data**.

If logs show one thing, metrics show another, and traces live somewhere else, engineers must mentally stitch them together. This approach does not scale in distributed systems.

Observability requires that telemetry tells a **single, connected story**, not three separate ones.

---

## Correlation and context

**Correlation** is the ability to link telemetry signals together so they describe the same execution or event. This is made possible through **context**.

Context is shared identity that travels with a request as it moves through a system. It includes things like trace IDs, transaction IDs, and request metadata.

A useful mental model is to think of context as a passport that a request carries.

Every time the request enters a service, that service:
- reads the passport
- adds its own stamp (telemetry)
- passes the passport along

For example, a single request might flow through a Payment Service, then a Config Service, then a proxy, and finally a database. Each component emits its own telemetry. Context allows all of that telemetry to be linked back to the same request.

Because of this shared context, engineers can follow one real execution across service boundaries and see exactly where time was spent and where things went wrong. This is not based on averages or assumptions, but on what actually happened.

This ability to trace cause and effect across distributed systems is what makes observability effective.

---

## Where OpenTelemetry fits into this picture

OpenTelemetry (OTel) is an open-source project hosted by the [CNCF](https://www.cncf.io/) that focuses on **how telemetry is generated and connected**, not on how it is stored or visualized.

Instead, it standardizes the *inputs* to those tools.

Think of OpenTelemetry as plumbing.

It ensures:
- telemetry is produced in a consistent format
- context flows correctly between services
- signals can be correlated later

What you build on top of that plumbing (dashboards, alerts, analytics) is a separate concern.

---

## What OpenTelemetry actually standardizes

OpenTelemetry defines:
- APIs for generating telemetry
- SDKs for implementing those APIs
- protocols for exporting data
- semantic conventions for naming things
- rules for propagating context

A key design principle is that **instrumentation and export are decoupled**.

You instrument your code once, using stable APIs.  
You decide where the data goes later.

This leads to a simple rule:

> Instrument once. Export anywhere.

This makes telemetry easier to maintain and reduces long-term lock-in.

---

## Separation of responsibilities

OpenTelemetry also introduces a clean separation of responsibilities.

Library maintainers instrument libraries using OpenTelemetry APIs. They describe what happens inside the library, but they do not choose vendors or backends.

Application owners decide:
- which SDK to use
- which exporters to enable
- where telemetry is sent

This keeps instrumentation reusable and avoids pushing vendor decisions into shared dependencies.

---

## How OpenTelemetry changes the observability ecosystem

Before OpenTelemetry, observability vendors often owned everything, from agents to dashboards.

With OpenTelemetry:
- telemetry generation is standardized
- context propagation is shared
- vendors no longer control instrumentation

This shifts competition toward:
- analysis and correlation
- user experience
- performance and cost efficiency
- helping humans understand systems faster

Instrumentation becomes shared infrastructure.  
Understanding becomes the differentiator.

For developers, this means less fear of committing to the wrong tool early. Instrumentation can remain stable even as backends change.

For organizations, this reduces long-term risk. It becomes easier to mix open-source and commercial tools, change vendors over time, and protect engineering investment.

---

## An analogy: OpenTelemetry as the SQL of observability

Thinking about observability in terms of databases helped clarify this shift for me.

SQL is a standard. Databases do not compete on query language anymore. They compete on performance, tooling, reliability, and user experience.

OpenTelemetry is becoming the equivalent standard for observability. Telemetry should not need to be rewritten to change tools. Only the destination should change.

---

## Why CNCF matters

OpenTelemetry’s usefulness depends on broad adoption and trust. The CNCF provides neutral governance, shared ownership, legitimacy and long-term stability.

Knowing that OpenTelemetry was accepted into the CNCF in 2019, moved to incubation in 2021, and began the graduation process in 2025 turns it into a stable, long-term project rather than an experiment.

---

## What I am taking away from Day 2

Observability is about understanding behavior, not collecting signals. Correlation is the key that turns telemetry into explanations. Context is what makes correlation possible. And OpenTelemetry exists to make all of that consistent and scalable.

Things are still fuzzy in places, but I feel like I now know *what problem OpenTelemetry is actually solving*.

On to day 3.

