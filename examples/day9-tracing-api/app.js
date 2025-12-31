// app.js
const express = require('express');
const { trace } = require('@opentelemetry/api');

const app = express();

// Get a tracer (our span factory)
const tracer = trace.getTracer('greeting-service', '1.0.0');

// Simple greeting endpoint with manual instrumentation
app.get('/hello/:name', (req, res) => {
  // Create a span for our greeting operation
  tracer.startActiveSpan('create_greeting', (span) => {
    const name = req.params.name;
    
    // Add attributes to describe what we're doing
    span.setAttribute('user.name', name);
    span.setAttribute('greeting.type', 'personal');
    
    // Add an event to mark when we start processing
    span.addEvent('processing_started');
    
    // Simulate some processing time
    setTimeout(() => {
      // Create a nested span for message formatting
      tracer.startActiveSpan('format_message', (formatSpan) => {
        const message = `Hello, ${name}! Welcome to OpenTelemetry tracing.`;
        
        formatSpan.setAttribute('message.length', message.length);
        formatSpan.addEvent('message_formatted');
        formatSpan.end();
        
        // Add final attributes and events to parent span
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
});