# Day 22 – Debugging the Collector: When Your Observability Tool Needs Observing

Welcome to Week 4! This week we focus on troubleshooting, production readiness, and real-world challenges. Today we learn how to debug Collector issues when they inevitably arise in production.

> [!NOTE]
> Don’t worry if the next few days feel confusing. We’ll be doing a lot of debugging, and it’s totally normal to mix up the what and the when at first. Everything will click together later. 
>
>On Day 29, we’ll do a full recap and clear things up. 
>
>Hang in there, it’s part of the process!

---

## The Problem: When the Observer Becomes the Problem

Picture this scenario: Your team reports that traces aren't showing up in Jaeger. Is it:
- The application not sending traces?
- The Collector not receiving them?
- The Collector not processing them correctly?
- The Collector not exporting them?
- Jaeger not accepting them?

**Without Collector debugging skills, you're guessing.** With them, you can systematically identify and fix the problem.

---

## Why Collector Debugging Matters

When your Collector fails in production, you lose visibility into your entire system during incidents. You can't debug what you can't see, and every minute without observability data is expensive.

The Collector seems simple -> receive data, process it, export it. But data can be dropped silently, and a single configuration typo can break everything. That's why systematic debugging is essential.

---

## The Collector's Built-in Observability

The Collector practices what it preaches, it generates telemetry about itself.

### Health Check Endpoint

The simplest debugging tool:

```bash
# Check if Collector is running
curl http://localhost:13133/

# Response when healthy:
{"status":"Server available","upSince":"2024-01-04T10:30:00Z","uptime":"2h15m30s"}
```

**What this tells us:**
The health check endpoint is the simplest debugging tool, but it only tells you if the Collector process is running and how long it's been up. This is useful for detecting crashes, but it doesn't tell you whether pipelines are working, if data is flowing through, or what the performance looks like.

### Collector Metrics (The Real Debugging Power)

The real debugging power comes from the Collector's detailed metrics about its own operation. These metrics show you exactly where in the pipeline data is getting stuck, help you isolate problems to specific components, and provide quantitative evidence instead of forcing you to guess. Most importantly, they help you track improvements after making changes.

```yaml
service:
  telemetry:
    metrics:
      address: 0.0.0.0:8888  # Metrics endpoint
      level: detailed         # More detailed metrics
```

```
#Check exporter metrics
curl http://localhost:8888/metrics | grep otelcol_exporter
```

**What to look for:**
- `otelcol_receiver_accepted_spans` - **Are spans coming in?** (If zero, problem is before Collector)
- `otelcol_processor_batch_batch_send_size` - **Are batches being created?** (Shows processing is working)
- `otelcol_exporter_sent_spans` - **Are spans going out?** (If zero but received > 0, export problem)
- `otelcol_exporter_send_failed_spans` - **Are exports failing?** (Network, auth, or backend issues)

**Why these metrics matter:**
- They show you **exactly where in the pipeline** data is getting stuck
- They help you **isolate the problem** to receiver, processor, or exporter
- They provide **quantitative evidence** instead of guessing
- They help you **track improvements** after making changes

---

## The Logging Exporter: Our Debugging Best Friend

The most powerful debugging tool is the logging exporter. It shows you exactly what data is flowing through your pipelines.

### Basic Logging Configuration

```yaml
exporters:
  logging:
    loglevel: debug
    sampling_initial: 5      # Log first 5 items
    sampling_thereafter: 100 # Then every 100th item

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [logging, jaeger]  # Add logging alongside real exporter
```

**What we'll see:**
```
2024-01-04T10:30:00.000Z	DEBUG	Span	{
  "traceID": "abc123...",
  "spanID": "def456...", 
  "name": "GET /api/users",
  "attributes": {
    "http.request.method": "GET",
    "http.response.status_code": 200
  }
}
```

### Advanced Logging for Specific Debugging

**Debug only errors:**
```yaml
processors:
  filter/debug-errors:
    traces:
      span:
        - 'attributes["http.response.status_code"] >= 400'

exporters:
  logging/errors:
    loglevel: debug

service:
  pipelines:
    traces/debug:
      receivers: [otlp]
      processors: [filter/debug-errors]
      exporters: [logging/errors]
```

**Debug specific services:**
```yaml
processors:
  filter/debug-payment:
    traces:
      span:
        - 'resource.attributes["service.name"] == "payment-service"'
```

---

## Systematic Debugging Approach

When traces/metrics/logs aren't flowing, follow this systematic approach:

### Step 1: Check Collector Health
```bash
# Is the Collector running?
curl http://localhost:13133/

# Are the ports listening?
netstat -tlnp | grep -E "(4317|4318|8888|13133)"
```

### Step 2: Check Receiver Metrics
```bash
# Are spans being received?
curl -s http://localhost:8888/metrics | grep "otelcol_receiver_accepted_spans"

# If zero, the problem is before the Collector (app not sending, network issues)
```

### Step 3: Add Logging Exporter
```yaml
exporters:
  logging/debug:
    loglevel: debug

service:
  pipelines:
    traces:
      exporters: [logging/debug, jaeger]  # Add logging
```

**If you see data in logs but not in Jaeger, the problem is in the exporter.**

### Step 4: Check Exporter Metrics
```bash
# Are exports succeeding?
curl -s http://localhost:8888/metrics | grep "otelcol_exporter_sent_spans"

# Are exports failing?
curl -s http://localhost:8888/metrics | grep "otelcol_exporter_send_failed_spans"
```

### Step 5: Check Collector Logs
```bash
# Look for error messages
docker logs collector-container 2>&1 | grep -i error

# Look for connection issues
docker logs collector-container 2>&1 | grep -i "connection\|timeout\|refused"
```

---

## Common Debugging Scenarios

### Scenario 1: No Data Flowing

**Symptoms:** Zero metrics in `otelcol_receiver_accepted_spans`

**Debug steps:**
1. Check if app is sending to correct endpoint
2. Verify network connectivity: `curl http://collector:4318/v1/traces`
3. Check Collector receiver configuration

### Scenario 2: Data Coming In, Not Going Out

**Symptoms:** `otelcol_receiver_accepted_spans > 0` but `otelcol_exporter_sent_spans = 0`

**Debug steps:**
1. Add logging exporter to see processed data
2. Check processor configurations (filters might be dropping everything)
3. Verify exporter endpoint and authentication
4. Check `otelcol_exporter_send_failed_spans` for export errors

## Key Takeaways

**The systematic approach is your superpower.** Don't guess, follow the 5-step process to isolate problems quickly. Use metrics to see the big picture, then use logging exporters to see the details.

**Always add a logging exporter when debugging.** It's your best friend for seeing exactly what data is flowing through your pipelines.

**Monitor your Collector proactively.** Set up basic alerts for export failures and memory usage. Don't wait for problems to find you.

---

## Tomorrow: Troubleshooting Missing Telemetry

**We have the foundation now that our Collector is observable. Next is making sure data actually flows through the pipeline.**

Today you learned to debug the Collector itself. Tomorrow on day 23, we'll tackle the most common frustration: "Where the heck is my data?" - systematically troubleshooting when telemetry data goes missing anywhere in the pipeline from application to backend.

---

> *"The best debugging tool is a well-instrumented system. The second-best is knowing how to use the first one."*
>
> *Today you learned both.*