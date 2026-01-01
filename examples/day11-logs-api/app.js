// app.js
const express = require('express');
const { trace, metrics } = require('@opentelemetry/api');
const { logs } = require('@opentelemetry/api-logs');

const app = express();

// Get a tracer (from Day 9)
const tracer = trace.getTracer('greeting-service', '1.0.0');

// Get a meter (from Day 10)
const meter = metrics.getMeter('greeting-service', '1.0.0');

// Get a logger (NEW for Day 11)
const logger = logs.getLogger('greeting-service', '1.0.0');

// =========================
// METRICS (from Day 10)
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

const greetingErrors = meter.createCounter("greeting_errors_total", {
  description: "Total number of greeting errors",
});

// =========================
// GREETING ENDPOINT (building on Days 9 & 10)
// =========================

app.get('/hello/:name', (req, res) => {
  // Count this request (from Day 10)
  requestsTotal.add(1);
  
  // Create a span for our greeting operation (from Day 9)
  tracer.startActiveSpan('create_greeting', (span) => {
    const name = req.params.name;
    
    // Add attributes to describe what we're doing (from Day 9)
    span.setAttribute('user.name', name);
    span.setAttribute('greeting.type', 'personal');
    
    // LOG: Greeting started (NEW for Day 11)
    logger.emit({
      severityText: "INFO",
      body: "Greeting processing started",
      attributes: {
        "user.name": name,
        "greeting.type": "personal",
      },
    });
    
    // Add an event to mark when we start processing (from Day 9)
    span.addEvent('processing_started');
    
    // Simple validation (NEW - to demonstrate error logging)
    if (name.length > 50) {
      // Count this error (NEW for Day 11)
      greetingErrors.add(1);
      
      // LOG: Greeting failed (NEW for Day 11)
      logger.emit({
        severityText: "ERROR",
        body: "Greeting processing failed",
        attributes: {
          "user.name": name,
          "error.message": "name too long",
          "name.length": name.length,
        },
      });
      
      span.recordException(new Error('Name too long'));
      span.setStatus({ code: 2, message: 'Name exceeds maximum length' }); // ERROR status
      span.end();
      
      return res.status(400).json({ 
        error: 'Name too long. Maximum 50 characters allowed.',
        provided_length: name.length
      });
    }
    
    // Simulate some processing time
    setTimeout(() => {
      // Create a nested span for message formatting (from Day 9)
      tracer.startActiveSpan('format_message', (formatSpan) => {
        const message = `Hello, ${name}! Welcome to OpenTelemetry tracing, metrics, and logs.`;
        
        formatSpan.setAttribute('message.length', message.length);
        formatSpan.addEvent('message_formatted');
        formatSpan.end();
        
        // Count this greeting (from Day 10)
        greetingsTotal.add(1);
        
        // Count this specific name (from Day 10)
        popularNames.add(1, { name: name });
        
        // LOG: Greeting completed successfully (NEW for Day 11)
        logger.emit({
          severityText: "INFO",
          body: "Greeting processing completed successfully",
          attributes: {
            "user.name": name,
            "message.length": message.length,
            "processing.duration_ms": 100, // We know it's ~100ms
          },
        });
        
        // Add final attributes and events to parent span (from Day 9)
        span.setAttribute('response.message', message);
        span.addEvent('processing_completed');
        span.setStatus({ code: 1 }); // OK status
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
  console.log('Logs will be sent to OTLP endpoint, metrics shown in console every 10 seconds');
});
