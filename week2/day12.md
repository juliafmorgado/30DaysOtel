# Day 12 – Context Propagation: Understanding How Traces Stay Connected

Yesterday we learned the Logs API and saw how logs automatically get trace and span IDs for correlation. Today we'll understand **context propagation** - the simple mechanism that makes this magic happen.

> **Working example:** The complete code for this tutorial is available in [`examples/day12-context-propagation/`](../examples/day12-context-propagation/)
>
> **Note:** This builds on Days 9-11. If you haven't done those yet, start there: [`examples/day11-logs-api/`](../examples/day11-logs-api/)

---

## What we already know from previous days

We've been using context propagation without realizing it:

- **[Day 9](https://github.com/juliafmorgado/30DaysOtel/blob/main/week2/day9.md):** Our manual spans automatically became children of the right parents
- **[Day 10](https://github.com/juliafmorgado/30DaysOtel/blob/main/week2/day10.md):** Our metrics were automatically associated with the right traces
- **[Day 11](https://github.com/juliafmorgado/30DaysOtel/blob/main/week2/day11.md):** Our logs automatically got trace and span IDs

Today's focus is understanding **how** this works and **when** it might break.

---

## What is Context Propagation?

Context propagation is how OpenTelemetry keeps track of "which trace am I currently in?" as your code executes.

**Think of it like this:**
- Your code is like a conversation
- Context is like "who's speaking right now?"
- Propagation is how we remember who's speaking as the conversation continues

**In simple terms:**
- Context contains the current trace ID and span ID
- Propagation ensures child spans know their parent
- This usually works automatically

---

## When Context Propagation Works Automatically (The Happy Path)

OpenTelemetry automatically propagates context through:

### 1. Normal function calls
```javascript
tracer.startActiveSpan('parent', (span) => {
  doSomething(); // This function "sees" the parent span
  span.end();
});
```

### 2. Async/await operations
```javascript
tracer.startActiveSpan('parent', async (span) => {
  await doAsyncWork(); // This still "sees" the parent span
  span.end();
});
```

### 3. Express middleware (with auto-instrumentation)
```javascript
app.use((req, res, next) => {
  // This middleware sees the same trace context
  next();
});
```

**The key insight:** Most of the time, context propagation "just works" and you don't need to think about it.

---

## When Context Propagation Can Break

Context propagation can break in some specific scenarios:

### 1. setTimeout and setInterval
```javascript
tracer.startActiveSpan('parent', (span) => {
  setTimeout(() => {
    // This callback might not see the parent span
    tracer.startActiveSpan('child', (childSpan) => {
      // This might start a new trace instead of being a child
      childSpan.end();
    });
  }, 1000);
  span.end();
});
```

### 2. Event emitters
```javascript
tracer.startActiveSpan('parent', (span) => {
  emitter.on('event', () => {
    // This event handler might not see the parent span
    tracer.startActiveSpan('child', (childSpan) => {
      childSpan.end();
    });
  });
  span.end();
});
```

**For beginners:** These are edge cases. Most of your code will work fine without worrying about this.

---

## What we're building today

We'll create **simple examples** showing:

1. **Automatic propagation** (the normal case)
2. **When propagation breaks** (so you can recognize it)
3. **How to fix it** (basic solution)

This is about **understanding the concept**, not mastering complex scenarios.

---

## Step 1: Set up the project

If you finished Day 11, copy that project:

```bash
cp -r day11-logs-api day12-context-propagation
cd day12-context-propagation
```

If starting fresh:

```bash
mkdir day12-context-propagation
cd day12-context-propagation
npm init -y
```

**Install dependencies:**

```bash
npm install express \
  @opentelemetry/api \
  @opentelemetry/sdk-node \
  @opentelemetry/resources \
  @opentelemetry/semantic-conventions \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-trace-otlp-http
```

---

## Step 2: Create simple instrumentation

Create `instrumentation.js`:

```javascript
// instrumentation.js
const { NodeSDK } = require("@opentelemetry/sdk-node");
const { getNodeAutoInstrumentations } = require("@opentelemetry/auto-instrumentations-node");
const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-http");
const { Resource } = require("@opentelemetry/resources");
const { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } = require("@opentelemetry/semantic-conventions");

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: "context-demo",
    [ATTR_SERVICE_VERSION]: "1.0.0",
  }),
  
  traceExporter: new OTLPTraceExporter({
    url: "http://localhost:4318/v1/traces",
  }),
  
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
console.log("OpenTelemetry initialized for context propagation demo");
```

---

## Step 3: Create examples showing context propagation

Create `app.js`:

```javascript
// app.js
const express = require("express");
const { trace, context } = require("@opentelemetry/api");

const app = express();
app.use(express.json());

const tracer = trace.getTracer("context-demo", "1.0.0");

// =========================
// EXAMPLE 1: Automatic propagation (works great)
// =========================

async function automaticPropagationExample() {
  return tracer.startActiveSpan("parent_operation", async (parentSpan) => {
    parentSpan.setAttribute("example", "automatic");
    
    // This works - async/await preserves context
    await tracer.startActiveSpan("child_operation", async (childSpan) => {
      childSpan.setAttribute("type", "child");
      
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // This also works - nested spans
      await tracer.startActiveSpan("grandchild_operation", async (grandchildSpan) => {
        grandchildSpan.setAttribute("type", "grandchild");
        await new Promise(resolve => setTimeout(resolve, 50));
        grandchildSpan.end();
      });
      
      childSpan.end();
    });
    
    parentSpan.end();
    return "Automatic propagation completed";
  });
}

// =========================
// EXAMPLE 2: Broken propagation (context lost)
// =========================

function brokenPropagationExample() {
  return tracer.startActiveSpan("parent_operation", (parentSpan) => {
    parentSpan.setAttribute("example", "broken");
    
    // This breaks - setTimeout loses context
    setTimeout(() => {
      tracer.startActiveSpan("orphaned_child", (childSpan) => {
        childSpan.setAttribute("problem", "no_parent");
        
        // This span will NOT be a child of parent_operation
        // It will start a completely new trace!
        
        childSpan.end();
      });
    }, 100);
    
    parentSpan.end();
    return "Broken propagation example started (check Jaeger in 1 second)";
  });
}

// =========================
// EXAMPLE 3: Fixed propagation (manual solution)
// =========================

function fixedPropagationExample() {
  return tracer.startActiveSpan("parent_operation", (parentSpan) => {
    parentSpan.setAttribute("example", "fixed");
    
    // Capture the current context
    const currentContext = context.active();
    
    setTimeout(() => {
      // Restore the context in the callback
      context.with(currentContext, () => {
        tracer.startActiveSpan("fixed_child", (childSpan) => {
          childSpan.setAttribute("solution", "context.with");
          
          // Now this span IS a child of parent_operation!
          
          childSpan.end();
        });
      });
    }, 100);
    
    parentSpan.end();
    return "Fixed propagation example started (check Jaeger in 1 second)";
  });
}

// =========================
// API ENDPOINTS
// =========================

app.get("/automatic", async (req, res) => {
  try {
    const result = await automaticPropagationExample();
    res.json({ 
      result, 
      message: "Check Jaeger - spans should be properly nested like a family tree" 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/broken", async (req, res) => {
  try {
    const result = brokenPropagationExample();
    res.json({ 
      result, 
      message: "Check Jaeger - orphaned_child will be in a separate trace (not connected to parent)!" 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/fixed", async (req, res) => {
  try {
    const result = fixedPropagationExample();
    res.json({ 
      result, 
      message: "Check Jaeger - fixed_child should be properly nested under parent" 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Context propagation demo listening on port ${PORT}`);
  console.log("\nTry these endpoints:");
  console.log("- GET /automatic (context works automatically - the normal case)");
  console.log("- GET /broken (context gets lost - shows the problem)");
  console.log("- GET /fixed (context manually restored - shows the solution)");
  console.log("\nOpen Jaeger at http://localhost:16686 to see the differences!");
});
```

---

## Step 4: Run and test the examples

**Start Jaeger:**
```bash
docker run -d --name jaeger \
  -p 16686:16686 \
  -p 4318:4318 \
  jaegertracing/all-in-one:latest
```

**Run the app:**
```bash
node --require ./instrumentation.js app.js
```

**Test each example:**

```bash
# 1. Automatic propagation (should work perfectly)
curl http://localhost:3000/automatic

# 2. Broken propagation (child span will be orphaned)
curl http://localhost:3000/broken

# 3. Fixed propagation (child span properly connected)
curl http://localhost:3000/fixed
```

---

## Step 5: Observe the differences in Jaeger

Open http://localhost:16686 and look for traces from the `context-demo` service.

**What you'll see:**

### Automatic Propagation ✅
```
GET /automatic
└─ parent_operation
   └─ child_operation
      └─ grandchild_operation
```
Perfect family tree - context flowed automatically.

### Broken Propagation ❌
```
GET /broken
└─ parent_operation

orphaned_child (separate trace!)
```
The `orphaned_child` span started a completely new trace because it lost context.

### Fixed Propagation ✅
```
GET /fixed
└─ parent_operation
   └─ fixed_child
```
Using `context.with()` restored the parent-child relationship.

---

## The Simple Fix: context.with()

When context propagation breaks, the fix is usually simple:

```javascript
// 1. Capture the current context
const currentContext = context.active();

// 2. Later, in a callback, restore it
setTimeout(() => {
  context.with(currentContext, () => {
    // Code here sees the captured context
    tracer.startActiveSpan('child', (span) => {
      // This span will be properly connected
      span.end();
    });
  });
}, 1000);
```

**Think of it as:** "Remember where we were, then go back there later."

---

## When do beginners need to worry about this?

**Most of the time: Never!** Context propagation works automatically for:
- Normal function calls
- async/await operations  
- Express middleware
- Most database calls
- Most HTTP requests

**You might need manual propagation for:**
- setTimeout/setInterval callbacks
- Event emitters
- Message queues (advanced topic)
- Worker threads (advanced topic)

**Beginner advice:** Don't worry about this until you see broken traces in Jaeger.

---

## How to recognize broken context propagation

**Signs your context propagation is broken:**
1. **In Jaeger:** You see multiple separate traces instead of one connected trace
2. **In logs:** Logs have different trace IDs when they should be the same
3. **In metrics:** Metrics aren't associated with the right traces

**When this happens:** Look for setTimeout, setInterval, or event emitters in your code.

---

## What I'm taking into Day 13

Today we learned **context propagation basics** - how trace context flows through your application:

**Key concepts:**
- Context propagation usually works automatically
- It can break with setTimeout and event emitters
- The fix is usually `context.with()`
- Most beginners don't need to worry about this

**Practical skills:**
- Recognizing when traces are properly connected
- Spotting broken context propagation in Jaeger
- Using `context.active()` and `context.with()` for simple fixes

**Tomorrow (Day 13):** We'll learn **basic SDK concepts** - samplers, processors, and exporters that control how telemetry flows through OpenTelemetry.

See you on Day 13!