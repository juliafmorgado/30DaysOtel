const express = require('express');
const { trace, metrics } = require('@opentelemetry/api');

const app = express();

// Get a tracer (from Day 9)
const tracer = trace.getTracer('greeting-service', '1.0.0');

// Get a meter (NEW for Day 10)
const meter = metrics.getMeter('greeting-service', '1.0.0');

// =========================
// METRICS (create once, use everywhere)
// =========================

// Create counters once at startup
const greetingsTotal = meter.createCounter("greetings_sent_total", {
  description: "Total number of greetings sent",
});

const requestsTotal = meter.createCounter("requests_received_total", {
  description: "Total number of requests received",
});

const popularNames = meter.createCounter("popular_names_total", {
  description: "Count of greetings by name",
});

// =========================
// GREETING ENDPOINT (building on Day 9)
// =========================

app.get('/hello/:name', (req, res) => {
  // Count every request received
  requestsTotal.add(1);
  
  // Create a span for our greeting operation (from Day 9)
  tracer.startActiveSpan('create_greeting', (span) => {
    const name = req.params.name;
    
    // Add attributes to describe what we're doing (from Day 9)
    span.setAttribute('user.name', name);
    span.setAttribute('greeting.type', 'personal');
    
    // Add an event to mark when we start processing (from Day 9)
    span.addEvent('processing_started');
    
    // Simulate some processing time
    setTimeout(() => {
      // Create a nested span for message formatting (from Day 9)
      tracer.startActiveSpan('format_message', (formatSpan) => {
        const message = `Hello, ${name}! Welcome to OpenTelemetry tracing and metrics.`;
        
        formatSpan.setAttribute('message.length', message.length);
        formatSpan.addEvent('message_formatted');
        formatSpan.end();
        
        // Count every greeting sent (NEW for Day 10)
        greetingsTotal.add(1);
        
        // Count this specific name (NEW for Day 10) -> These are counters with labels (dimensions)
        popularNames.add(1, { name: name });
        
        // Add final attributes and events to parent span (from Day 9)
        span.setAttribute('response.message', message);
        span.addEvent('processing_completed');
        span.end();
        
        res.json({ 
          message,
          timestamp: new Date().toISOString()
        });
      });
    }, 100);
  });
});

// Health check endpoint (no manual instrumentation)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Greeting service listening on port ${PORT}`);
  console.log('Try: curl http://localhost:3000/hello/Alice');
  console.log('Metrics will be exported every 10 seconds');
});