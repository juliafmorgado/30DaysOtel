# Day 26 – Getting Ready for Real Use: Security and Performance Basics

Yesterday we learned what happens when observability systems get overwhelmed. Today we'll learn the basics of making our OpenTelemetry setup secure and performant, whether that's for a side project, a demo, or eventually production.

> **The goal:** Build good habits from the start, so you don't have to fix problems later.

> **Note:** Configuration examples in this lesson use batch processor for educational purposes. In production, consider exporters with built-in batching and persistent storage for better reliability ([OpenTelemetry issue #8122](https://github.com/open-telemetry/opentelemetry-collector/issues/8122)).

---

## Why Learn This Now?

You might be thinking: "I'm just learning OpenTelemetry, why do I need to worry about security and performance?"

Here's why it matters even for beginners:

- **You accidentally expose sensitive data** when you log passwords in spans
- **Your laptop slows down** when you trace every single request
- **Good habits are easier** to learn from the start than to fix later
- **These concepts come up** in interviews and real projects

**Think of it like learning to drive:** You learn to check mirrors and use turn signals from day one, not after your first accident.

---

## Security: Don't Accidentally Expose Secrets

When you're learning and experimenting, it's easy to accidentally capture sensitive information:

```javascript
// Oops! This captures a password
app.post('/login', (req, res) => {
  const span = trace.getActiveSpan();
  span.setAttributes({
    'user.email': req.body.email,
    'user.password': req.body.password,  // ❌ Don't do this!
    'request.body': JSON.stringify(req.body)  // ❌ This too - it captures everything!
  });
});
```

**Simple Fix: Be Selective About What You Capture**

```javascript
// Better: Only capture safe information
app.post('/login', (req, res) => {
  const span = trace.getActiveSpan();
  span.setAttributes({
    'user.email': req.body.email,
    'login.attempt': 'true',
    'request.method': req.method
    // No passwords, no full request bodies
  });
});
```

### Basic Security Rules

**Safe to capture:**
- User IDs (not usernames if they're sensitive)
- Request methods (GET, POST)
- Response status codes
- Timing information
- Error messages (without sensitive details)

**Never capture:**
- Passwords
- API keys or tokens
- Credit card numbers
- Personal information (unless you know what you're doing)
- Full request/response bodies

### Quick Security Tips

1. **Review your attributes** - Look at what you're actually capturing
2. **Use environment variables** for sensitive config (API keys, endpoints)
3. **Be careful with auto-instrumentation** - It might capture more than you expect
4. **When in doubt, don't log it** - You can always add more later

---

## Performance: Don't Slow Down Your App

### The Problem: Collecting Too Much Telemetry Can Hurt Performance

When you're excited about tracing, it's tempting to trace everything:

```javascript
// This will slow down your app!
app.get('/users', async (req, res) => {
  const users = await User.findAll();
  
  // Creating a span for every user - bad idea!
  users.forEach(user => {
    const span = tracer.startSpan(`process-user-${user.id}`);
    // ... do something with user
    span.end();
  });
});
```

### Simple Fix: Trace Operations, Not Individual Items

```javascript
// Better: One span for the whole operation
app.get('/users', async (req, res) => {
  const span = tracer.startSpan('get-all-users');
  
  const users = await User.findAll();
  span.setAttributes({
    'users.count': users.length,
    'database.operation': 'findAll'
  });
  
  span.end();
});
```

### Performance Best Practices for Beginners

**1. Don't trace everything:**
```javascript
// Good: Trace important operations
app.post('/orders', createOrder);  // ✅ Trace this
app.get('/health', healthCheck);   // ❌ Don't trace this

// Good: Trace business logic
function processPayment() { /* trace this */ }

// Bad: Trace utility functions
function formatDate() { /* don't trace this */ }
```

**2. Use sampling:**
```javascript
// Even for learning, don't trace 100% of requests
const sdk = new NodeSDK({
  sampler: new TraceIdRatioBasedSampler(0.1), // 10% is plenty for learning
});
```

**3. Configure batching:**
```yaml
# In your Collector config (educational example)
# Note: Modern exporters can handle batching internally for better reliability
processors:
  batch:
    timeout: 1s
    send_batch_size: 100  # Small batches for learning

# Alternative: Modern exporter-native batching (recommended for production)
exporters:
  otlp:
    endpoint: http://backend:4317
    sending_queue:
      enabled: true
      queue_size: 1000
      persistent_storage_enabled: true  # Survives crashes
    retry_on_failure:
      enabled: true
```

### When Performance Matters Most

- **Loops:** Never create spans inside loops over many items
- **High-frequency operations:** Database queries, API calls
- **Utility functions:** Date formatting, string manipulation
- **Health checks:** Usually don't need tracing

---

## Putting It Together: A Beginner's Checklist

Before you show your OpenTelemetry project to others:

### Security Basics
- [ ] No passwords or API keys in span attributes
- [ ] No full request/response bodies being logged
- [ ] Reviewed what auto-instrumentation captures
- [ ] Using environment variables for sensitive config

### Performance Basics
- [ ] Not creating spans inside loops
- [ ] Using sampling (even 10-50% is fine for learning)
- [ ] Efficient batching configured (processor or exporter-native)
- [ ] Only tracing important operations

---

## Common Beginner Mistakes

### Mistake 1: "I'll Add Security Later"
**Problem:** You get used to bad habits and accidentally expose data
**Solution:** Start with good practices from day one

### Mistake 2: "More Tracing = Better Observability"
**Problem:** Your app becomes slow and traces become noisy
**Solution:** Trace important operations, not everything

### Mistake 3: "Auto-instrumentation Handles Everything"
**Problem:** You don't know what's being captured automatically
**Solution:** Review what auto-instrumentation captures and supplement carefully

### Mistake 4: "Default Settings Are Fine"
**Problem:** Defaults often aren't optimized for your use case
**Solution:** Learn basic configuration (sampling, batching)

---

## What I'm Taking into Day 27

Today's key insight was that **good observability habits are easier to learn from the start than to fix later. Even as a beginner, you can build secure and performant observability.**

The two basics to remember:
1. **Security:** Don't accidentally log sensitive data, be selective about attributes
2. **Performance:** Don't trace everything, focus on important operations and use sampling

Tomorrow we'll explore the **OpenTelemetry Operator**, a tool that can help manage many of these concerns automatically in Kubernetes environments.
