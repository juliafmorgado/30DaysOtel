# Week 3 Knowledge Check: OpenTelemetry Collector

This knowledge check focuses on **how you think about the Collector**, not memorizing terms or configuration.

There may be multiple valid ways to explain an answer.  
You’re checking *understanding*, not perfection.
---

## Question 1: Centralization

Your team has 6 services written in different languages.
Each one sends telemetry directly to Jaeger.

One day, your manager asks:
> “Can we also send metrics to Prometheus and logs somewhere else?”

What problem does this create without a Collector, and why?

<details>
<summary>Answer</summary>

Without a Collector:
- each service must be reconfigured and redeployed
- each language SDK needs separate changes
- observability changes become application changes

The Collector centralizes this decision so apps don’t need to change.
</details>
---

## Question 2: Decision Ownership

Who should decide:
- what data is kept
- what data is dropped
- where data is sent

The application team or the platform team?  
Why does the Collector make this easier?

<details>
<summary>Answer</summary>

The platform team.

The Collector moves observability decisions out of application code and into infrastructure configuration, where they can be changed without redeploying apps.
</details>

---
## Question 3: Multiple Sources

You receive:
- traces from OpenTelemetry SDKs
- metrics from Prometheus endpoints
- logs from files on disk

Why is it valuable that all of this goes through **one system** before reaching backends?

<details>
<summary>Answer</summary>

Because it:
- normalizes different formats
- applies consistent processing rules
- avoids having separate observability pipelines per data source
</details>

---

## Question 4: Processing Tradeoffs

You notice your observability bill is increasing quickly.

You have two options:
1. Sample data in every application SDK
2. Filter and batch data in the Collector

Why is option 2 usually preferred?

<details>
<summary>Answer</summary>

Because:
- SDK changes require redeployments
- filtering in one central place is easier to tune
- the same rules apply consistently across all services
</details>

---

---

## Question 5: Export Flexibility

Your company wants to evaluate a new observability backend for one month.

Why is the Collector useful here, even if you don’t switch permanently?

<details>
<summary>Answer</summary>

Because you can:
- add a new exporter
- send the same data to multiple backends
- evaluate without touching application code
</details>

---

## Question 6: Signal Differences

Why might traces, metrics, and logs need **different handling**, even though they all pass through the same Collector?

<details>
<summary>Answer</summary>

Because:
- traces are often filtered or sampled
- metrics are aggregated over time
- logs are often parsed or severity-filtered

Each signal has different goals and costs.
</details>

---

## Question 7: Failure Isolation

What happens if a backend goes down:
- without a Collector
- with a Collector

Why does the Collector improve resilience?

<details>
<summary>Answer</summary>

Without a Collector:
- apps may block or drop data
- failures affect application behavior

With a Collector:
- retries and buffering happen centrally
- app behavior stays unchanged
</details>

---

## Question 8: Growth Thinking

Your startup grows from 3 services to 30.

What observability problem appears *even if everything technically works*?

<details>
<summary>Answer</summary>

Configuration sprawl:
- duplicated logic
- inconsistent rules
- hard-to-reason observability behavior

The Collector provides a single place to reason about telemetry.
</details>

---

## Question 9: Anti-Pattern Recognition

Someone proposes:
> “Let’s do all filtering and routing inside application code.”

Why is this usually a bad idea?

<details>
<summary>Answer</summary>

Because:
- it couples observability to business logic
- it increases redeployments
- it creates inconsistency across services
</details>

---

## Question 10: One-Sentence Test

Finish this sentence:

> “The OpenTelemetry Collector exists so that __________.”

<details>
<summary>Example answer</summary>

“…applications can stay simple while observability becomes flexible and scalable.”
</details>

---

## Scoring

- **8–10:** You understand the *why* behind the Collector  
- **6–7:** Solid understanding, revisit a few ideas  
- **Below 6:** Re-read Week 3 with focus on architecture

Remember: The Collector is a powerful tool, and mastering it takes practice. Don't worry if you didn't get everything right the first time!