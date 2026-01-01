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

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Context propagation demo listening on port ${PORT}`);
});