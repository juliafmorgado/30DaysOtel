# Day 9 – Tracing API: Building Rich, Observable Request Stories

Yesterday we learned that the OpenTelemetry API is what we use in our code, while the SDK handles configuration. Today we get hands-on with the **Tracing API**, the part of OpenTelemetry that lets us create detailed traces of our application's behavior.

---
## What we already know from Week 1

Before we dive in, let's connect today's hands-on work to what we learned last week:

- **[Day 4](https://github.com/juliafmorgado/30DaysOtel/edit/main/week1/day4.md):** We learned spans have names, attributes, and parent-child relationships → Today we'll create those ourselves
- **[Day 5](https://github.com/juliafmorgado/30DaysOtel/edit/main/week1/day5.md):** We learned semantic conventions like `http.method` → Today we'll use them in `span.setAttribute()`
- **[Day 6](https://github.com/juliafmorgado/30DaysOtel/edit/main/week1/day6.md):** We learned auto-instrumentation calls the Tracing API → Today we'll call the same API manually

**The API methods aren't new, we've been learning about them all week.** Today we practice using them.

## What we're building today: A simple order API

We're going to build a minimal Express API with one endpoint: `POST /orders`. This endpoint will:
1. Validate the order
2. Check inventory
3. Calculate shipping
4. Process payment
5. Save the order

Then we'll add manual instrumentation to see exactly what's happening at each step.

**By the end, we'll have:**
- A working Node.js API with OpenTelemetry
- Manual spans showing our business logic
- A trace we can view in Jaeger

---
## Step 1: Set up the project

Create a new directory and initialize it:

```bash
mkdir otel-tracing-demo
cd otel-tracing-demo
npm init -y
```

**Install dependencies:**

```bash
npm install express @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node @opentelemetry/exporter-trace-otlp-http
```

**Our project structure will be:**
```
otel-tracing-demo/
├── instrumentation.js    (SDK configuration)
├── app.js                (Express app with manual instrumentation)
└── package.json
```

---

## Step 2: Configure OpenTelemetry (instrumentation.js)

Create `instrumentation.js`:

```javascript
// instrumentation.js
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

const sdk = new NodeSDK({
  serviceName: 'order-service',
  traceExporter: new OTLPTraceExporter({
    url: 'http://localhost:4318/v1/traces',
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
console.log('OpenTelemetry initialized');
```

**What this does:**
- Configures the SDK to send traces to Jaeger (running on localhost)
- Enables auto-instrumentation for Express and other libraries
- Sets the service name to "order-service"

---

## Step 3: Create the Express app (app.js)

Create `app.js`:

```javascript
// app.js
const express = require('express');
const { trace, SpanStatusCode } = require('@opentelemetry/api');

const app = express();
app.use(express.json());

// Get a tracer (our span factory)
const tracer = trace.getTracer('order-service', '1.0.0');

// Helper functions (simulated business logic)
async function validateOrder(orderData) {
  // Simulate validation time
  await new Promise(resolve => setTimeout(resolve, 50));
  
  if (!orderData.items || orderData.items.length === 0) {
    throw new Error('Order must contain items');
  }
  if (!orderData.userId) {
    throw new Error('Order must have a userId');
  }
}

async function checkInventory(items) {
  // Simulate inventory check
  await new Promise(resolve => setTimeout(resolve, 200));
  
  return {
    allAvailable: true,
    unavailableItems: []
  };
}

async function calculateShipping(orderData) {
  // Simulate shipping calculation
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return 12.99;
}

async function processPayment(amount, method) {
  // Simulate payment processing
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return {
    authId: 'auth_' + Math.random().toString(36).substr(2, 9),
    status: 'approved'
  };
}

async function saveOrder(orderData) {
  // Simulate database save
  await new Promise(resolve => setTimeout(resolve, 150));
  
  return 'ord_' + Math.random().toString(36).substr(2, 9);
}

// Our instrumented endpoint
app.post('/orders', async (req, res) => {
  // The root span is created automatically by Express auto-instrumentation
  // Now we add our manual spans for business logic
  
  return tracer.startActiveSpan('process_order', async (orderSpan) => {
    const orderData = req.body;
    
    // Add business attributes to the root span
    orderSpan.setAttribute('order.item_count', orderData.items?.length || 0);
    orderSpan.setAttribute('order.user_id', orderData.userId);
    
    try {
      // Step 1: Validate
      await tracer.startActiveSpan('validate_order', async (span) => {
        try {
          await validateOrder(orderData);
          span.addEvent('validation_passed');
          span.setStatus({ code: SpanStatusCode.OK });
        } catch (error) {
          span.recordException(error);
          span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
          throw error;
        } finally {
          span.end();
        }
      });
      
      // Step 2: Check inventory
      const inventoryResult = await tracer.startActiveSpan('check_inventory', async (span) => {
        span.setAttribute('inventory.item_count', orderData.items.length);
        
        try {
          const result = await checkInventory(orderData.items);
          span.setAttribute('inventory.all_available', result.allAvailable);
          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (error) {
          span.recordException(error);
          span.setStatus({ code: SpanStatusCode.ERROR });
          throw error;
        } finally {
          span.end();
        }
      });
      
      if (!inventoryResult.allAvailable) {
        throw new Error('Some items are out of stock');
      }
      
      // Step 3: Calculate shipping
      const shippingCost = await tracer.startActiveSpan('calculate_shipping', async (span) => {
        span.setAttribute('shipping.destination', orderData.address?.country || 'US');
        
        try {
          const cost = await calculateShipping(orderData);
          span.setAttribute('shipping.cost', cost);
          span.setStatus({ code: SpanStatusCode.OK });
          return cost;
        } catch (error) {
          span.recordException(error);
          span.setStatus({ code: SpanStatusCode.ERROR });
          throw error;
        } finally {
          span.end();
        }
      });
      
      // Step 4: Process payment
      const totalAmount = (orderData.total || 100) + shippingCost;
      
      await tracer.startActiveSpan('process_payment', async (span) => {
        span.setAttribute('payment.amount', totalAmount);
        span.setAttribute('payment.currency', 'USD');
        span.setAttribute('payment.method', orderData.paymentMethod || 'credit_card');
        
        try {
          span.addEvent('payment_authorization_started');
          
          const paymentResult = await processPayment(totalAmount, orderData.paymentMethod);
          
          span.setAttribute('payment.authorization_id', paymentResult.authId);
          span.addEvent('payment_authorization_completed', {
            'authorization.status': paymentResult.status
          });
          
          span.setStatus({ code: SpanStatusCode.OK });
        } catch (error) {
          span.recordException(error);
          span.setStatus({ code: SpanStatusCode.ERROR, message: 'Payment failed' });
          throw error;
        } finally {
          span.end();
        }
      });
      
      // Step 5: Save order
      const orderId = await tracer.startActiveSpan('save_order', async (span) => {
        try {
          const id = await saveOrder(orderData);
          span.setAttribute('order.created_id', id);
          span.setStatus({ code: SpanStatusCode.OK });
          return id;
        } catch (error) {
          span.recordException(error);
          span.setStatus({ code: SpanStatusCode.ERROR });
          throw error;
        } finally {
          span.end();
        }
      });
      
      // Success!
      orderSpan.setAttribute('order.final_id', orderId);
      orderSpan.setStatus({ code: SpanStatusCode.OK });
      
      res.status(201).json({
        orderId,
        status: 'created',
        total: totalAmount
      });
      
    } catch (error) {
      orderSpan.recordException(error);
      orderSpan.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      
      res.status(400).json({ error: error.message });
    } finally {
      orderSpan.end();
    }
  });
});

// Health check endpoint (no manual instrumentation needed)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Order service listening on port ${PORT}`);
});
```

---

## Step 4: Start Jaeger (to view traces)

We need a backend to receive and visualize traces. Let's use Jaeger. You should have Docker Desktop installed and running.

```bash
docker run -d --name jaeger \
  -p 16686:16686 \
  -p 4318:4318 \
  jaegertracing/all-in-one:latest
```

**Open Jaeger UI:** http://localhost:16686

---

## Step 5: Run your application

Start your app with OpenTelemetry enabled:

```bash
node --require ./instrumentation.js app.js
```

You should see:
```
OpenTelemetry initialized
Order service listening on port 3000
```

---

## Step 6: Send a test request

Open a new terminal and send a request:

```bash
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "items": [
      {"sku": "WIDGET-1", "quantity": 2},
      {"sku": "GADGET-5", "quantity": 1}
    ],
    "total": 99.99,
    "paymentMethod": "credit_card",
    "address": {
      "country": "US"
    }
  }'
```

**Expected response:**
```json
{
  "orderId": "ord_abc123",
  "status": "created",
  "total": 112.98
}
```

---

## Step 7: View your trace in Jaeger

1. Open http://localhost:16686
2. Select **"order-service"** from the Service dropdown
3. Click **"Find Traces"**
4. Click on the trace

**You should see:**

```
POST /orders (1000ms) [Auto-instrumented by Express]
└─ process_order (1000ms) [Your manual span]
   ├─ validate_order (50ms)
   │  └─ Event: validation_passed
   ├─ check_inventory (200ms)
   │  └─ inventory.all_available = true
   ├─ calculate_shipping (100ms)
   │  └─ shipping.cost = 12.99
   ├─ process_payment (500ms)
   │  ├─ Event: payment_authorization_started
   │  ├─ Event: payment_authorization_completed
   │  └─ payment.authorization_id = "auth_xyz"
   └─ save_order (150ms)
      └─ order.created_id = "ord_abc123"
```

---
## What just happened?

Let's break down the code you wrote:

### 1. Auto-instrumentation (you didn't write this)

Express auto-instrumentation created the root span automatically:
```javascript
// This happened automatically when the request arrived
POST /orders
  http.method = "POST"
  http.route = "/orders"
  http.status_code = 201
```

### 2. Your manual instrumentation (you wrote this)

You wrapped your business logic in spans:

```javascript
tracer.startActiveSpan('process_order', async (orderSpan) => {
  orderSpan.setAttribute('order.item_count', 2);
  orderSpan.setAttribute('order.user_id', 'user_123');
  
  // ... more business logic ...
  
  orderSpan.end();
});
```

**Key API methods you used:**
- `trace.getTracer()` → Get a tracer (Day 6 concept: who creates spans)
- `tracer.startActiveSpan()` → Create a span (Day 4 concept: what's in a span)
- `span.setAttribute()` → Add attributes (Day 5 concept: semantic conventions)
- `span.addEvent()` → Mark a point in time
- `span.recordException()` → Capture errors
- `span.setStatus()` → Mark success/failure
- `span.end()` → Finish the span

---

## Experiment: Trigger an error

Let's see what happens when something fails.

**Send a request with missing data:**

```bash
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "items": []
  }'
```

**Expected response:**
```json
{
  "error": "Order must contain items"
}
```

**Now check Jaeger:**

The trace will show:
```
POST /orders [ERROR] ❌
└─ process_order [ERROR] ❌
   └─ validate_order [ERROR] ❌
      └─ Exception: Error: Order must contain items
         Stack trace: ...
```

The error was captured in the span and is now searchable in Jaeger!

---

## Key patterns you learned

### Pattern 1: Wrapping business logic in spans

```javascript
await tracer.startActiveSpan('operation_name', async (span) => {
  span.setAttribute('key', 'value');
  
  try {
    await doWork();
    span.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR });
    throw error;
  } finally {
    span.end();
  }
});
```

### Pattern 2: Adding business context with attributes

```javascript
span.setAttribute('order.id', orderId);
span.setAttribute('order.total', 99.99);
span.setAttribute('user.id', userId);
```

### Pattern 3: Marking milestones with events

```javascript
span.addEvent('payment_authorization_started');
// ... work happens ...
span.addEvent('payment_authorization_completed', {
  'authorization.id': authId
});
```

### Pattern 4: Proper error handling

```javascript
try {
  await processPayment();
} catch (error) {
  span.recordException(error);          // Capture the error
  span.setStatus({ code: SpanStatusCode.ERROR });  // Mark span as failed
  throw error;                          // Re-throw so app handles it
}
```

---

## Exercises to try

### Exercise 1: Add more attributes

Add these attributes to the `process_order` span:
- `order.total`
- `order.currency`
- `order.payment_method`

### Exercise 2: Add a new span

Add manual instrumentation for a "send confirmation email" step:

```javascript
await tracer.startActiveSpan('send_confirmation_email', async (span) => {
  span.setAttribute('email.recipient', orderData.email);
  
  // Simulate sending email
  await new Promise(resolve => setTimeout(resolve, 300));
  
  span.addEvent('email_sent');
  span.end();
});
```

### Exercise 3: Simulate a payment failure

Modify `processPayment()` to randomly fail:

```javascript
async function processPayment(amount, method) {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // 30% chance of failure
  if (Math.random() < 0.3) {
    throw new Error('Payment declined: insufficient funds');
  }
  
  return {
    authId: 'auth_' + Math.random().toString(36).substr(2, 9),
    status: 'approved'
  };
}
```

Send multiple requests and see how failed traces look in Jaeger.

---

## How this connects to auto-instrumentation

Remember from Day 6: auto-instrumentation and manual instrumentation both use the same API.

**What auto-instrumentation does (Express library):**
```javascript
// This happens automatically inside the Express library
tracer.startActiveSpan(`${req.method} ${req.route}`, (span) => {
  span.setAttribute('http.method', req.method);
  span.setAttribute('http.route', req.route);
  // ... your route handler runs ...
  span.end();
});
```

**What you write manually:**
```javascript
// You write this in your application code
tracer.startActiveSpan('process_order', (span) => {
  span.setAttribute('order.id', orderId);
  // ... your business logic ...
  span.end();
});
```

**Same API. Different operations.** Auto-instrumentation = infrastructure spans (HTTP, database). Manual instrumentation = business logic spans (order processing, payments). Both appear in the same trace.

---

## Best practices (from today's code)

### ✅ Do:
- Use `startActiveSpan` (context manager pattern)
- Always call `span.end()` (or let the callback do it)
- Record exceptions with `span.recordException(error)`
- Set span status to `ERROR` when failures occur
- Add meaningful attributes (`order.id`, `payment.amount`)
- Re-throw errors after recording them (so your app handles them normally)

### ❌ Don't:
- Forget to call `span.end()`
- Swallow errors without recording them
- Use high-cardinality attributes (like timestamps or UUIDs) as span names
- Create spans for trivial operations (<1ms)

---

## Troubleshooting

### "I don't see traces in Jaeger"

**Checklist:**
1. ✅ Is Jaeger running? Check http://localhost:16686
2. ✅ Did you start your app with `--require ./instrumentation.js`?
3. ✅ Are you calling `span.end()`?
4. ✅ Check the console for errors

### "My nested spans aren't showing up as children"

You're probably using `tracer.startSpan()` instead of `tracer.startActiveSpan()`. Use `startActiveSpan()` to automatically set parent-child relationships.

### "Attributes are missing"

Make sure you call `span.setAttribute()` **before** `span.end()`.

---

## What I'm taking into Day 10

Today we learned the **Tracing API** by building a real Express app:

**Key skills:**
- Setting up OpenTelemetry with Express
- Creating manual spans with `tracer.startActiveSpan()`
- Adding attributes with `span.setAttribute()`
- Recording events with `span.addEvent()`
- Handling errors with `span.recordException()` and `span.setStatus()`
- Viewing traces in Jaeger

**The pattern we'll use constantly:**
```javascript
tracer.startActiveSpan('operation_name', async (span) => {
  span.setAttribute('key', 'value');
  
  try {
    await doWork();
    span.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR });
    throw error;
  } finally {
    span.end();
  }
});
```

**Tomorrow (Day 10):** We'll learn the **Metrics API** and add counters, histograms, and gauges to track aggregate patterns (like "orders per minute" or "average order value").

See you on Day 10!

