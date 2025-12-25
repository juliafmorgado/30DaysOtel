// app.js
const express = require("express");
const { trace, context, SpanStatusCode } = require("@opentelemetry/api");

const app = express();
app.use(express.json());

const tracer = trace.getTracer("context-demo", "1.0.0");

// =========================
// EXAMPLE 1: Automatic propagation (works great)
// =========================

async function automaticPropagationExample() {
  return tracer.startActiveSpan("parent_operation", async (parentSpan) => {
    parentSpan.setAttribute("example", "automatic_propagation");
    
    // This works - async/await preserves context
    await tracer.startActiveSpan("child_async", async (childSpan) => {
      childSpan.setAttribute("propagation", "automatic");
      
      // Simulate async work
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // This also works - nested spans
      await tracer.startActiveSpan("grandchild", async (grandchildSpan) => {
        grandchildSpan.setAttribute("level", "grandchild");
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
    parentSpan.setAttribute("example", "broken_propagation");
    
    // This breaks - setTimeout loses context
    setTimeout(() => {
      tracer.startActiveSpan("orphaned_child", (childSpan) => {
        childSpan.setAttribute("propagation", "broken");
        childSpan.setAttribute("problem", "no_parent_context");
        
        // This span will NOT be a child of parent_operation
        // It will start a new trace!
        
        childSpan.end();
      });
    }, 100);
    
    parentSpan.end();
    return "Broken propagation example started";
  });
}

// =========================
// EXAMPLE 3: Manual propagation (fixing the break)
// =========================

function manualPropagationExample() {
  return tracer.startActiveSpan("parent_operation", (parentSpan) => {
    parentSpan.setAttribute("example", "manual_propagation");
    
    // Capture the current context
    const currentContext = context.active();
    
    setTimeout(() => {
      // Restore the context in the callback
      context.with(currentContext, () => {
        tracer.startActiveSpan("fixed_child", (childSpan) => {
          childSpan.setAttribute("propagation", "manual");
          childSpan.setAttribute("solution", "context.with");
          
          // Now this span IS a child of parent_operation!
          
          childSpan.end();
        });
      });
    }, 100);
    
    parentSpan.end();
    return "Manual propagation example started";
  });
}

// =========================
// EXAMPLE 4: Cross-service propagation simulation
// =========================

function simulateCrossServiceCall() {
  return tracer.startActiveSpan("service_a_operation", async (span) => {
    span.setAttribute("service", "service_a");
    
    // Simulate extracting trace context for HTTP headers
    const headers = {};
    
    // In real HTTP calls, auto-instrumentation does this automatically
    // But here's how you'd do it manually:
    trace.setSpanContext(context.active(), span.spanContext());
    
    // Simulate HTTP call to another service
    const response = await simulateServiceBCall(headers);
    
    span.setAttribute("response", response);
    span.end();
    
    return response;
  });
}

async function simulateServiceBCall(headers) {
  // In a real scenario, this would be a different service
  // Auto-instrumentation would extract context from HTTP headers
  
  return tracer.startActiveSpan("service_b_operation", async (span) => {
    span.setAttribute("service", "service_b");
    span.setAttribute("received_headers", Object.keys(headers).length);
    
    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 200));
    
    span.end();
    return "Service B processed request";
  });
}

// =========================
// API ENDPOINTS
// =========================

app.get("/automatic", async (req, res) => {
  try {
    const result = await automaticPropagationExample();
    res.json({ result, message: "Check Jaeger - spans should be properly nested" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/broken", async (req, res) => {
  try {
    const result = brokenPropagationExample();
    res.json({ 
      result, 
      message: "Check Jaeger - orphaned_child will be in a separate trace!" 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/manual", async (req, res) => {
  try {
    const result = manualPropagationExample();
    res.json({ 
      result, 
      message: "Check Jaeger - fixed_child should be properly nested under parent" 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/cross-service", async (req, res) => {
  try {
    const result = await simulateCrossServiceCall();
    res.json({ 
      result, 
      message: "Check Jaeger - service_b_operation should be child of service_a_operation" 
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
  console.log("- GET /automatic (context works automatically)");
  console.log("- GET /broken (context gets lost)");
  console.log("- GET /manual (context manually fixed)");
  console.log("- GET /cross-service (simulated service-to-service)");
});