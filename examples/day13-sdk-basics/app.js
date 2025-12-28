// app.js
const express = require("express");
const { trace } = require("@opentelemetry/api");

const app = express();
const tracer = trace.getTracer("sdk-basics", "1.0.0");

// Simple endpoint that creates a span
app.get("/hello", (req, res) => {
  // Create a span - this will be processed by our SDK pipeline
  tracer.startActiveSpan("hello_operation", (span) => {
    span.setAttribute("greeting", "hello world");
    span.setAttribute("timestamp", new Date().toISOString());
    
    // Simulate some work
    setTimeout(() => {
      span.setAttribute("work", "completed");
      span.end();
      
      res.json({ 
        message: "Hello! Check your terminal to see the span." 
      });
    }, 100);
  });
});

// Create multiple spans quickly
app.get("/multiple", (req, res) => {
  const count = 5;
  
  for (let i = 0; i < count; i++) {
    tracer.startActiveSpan(`span_${i}`, (span) => {
      span.setAttribute("span.number", i);
      span.setAttribute("batch", "multiple_test");
      
      // End span after a short delay
      setTimeout(() => {
        span.end();
      }, i * 50); // Stagger the endings
    });
  }
  
  res.json({ 
    message: `Created ${count} spans. Check your terminal!` 
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 App listening on port ${PORT}`);
  console.log("Try: curl http://localhost:3000/hello");
  console.log("Try: curl http://localhost:3000/multiple");
});