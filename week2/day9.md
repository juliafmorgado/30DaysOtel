# Day 9 – Tracing API: Building Rich, Observable Request Stories

Yesterday we learned that the OpenTelemetry API is what we use in our code, while the SDK handles configuration. Today we get hands-on with the **Tracing API**—the part of OpenTelemetry that lets us create detailed traces of our application's behavior.

By the end of today hopefully we'll know how to:
- Create custom spans for our business logic
- Build nested span hierarchies that show call relationships
- Add attributes that make spans searchable and debuggable
- Record span events for point-in-time observations
- Handle errors properly in spans
- Use both manual and context-managed span creation

This is where observability becomes practical. Let's build something.

---

## What we're building today

We'll instrument a realistic order processing flow:

```
User places order
    ↓
Validate order items
    ↓
Check inventory (parallel for each item)
    ↓
Calculate shipping cost
    ↓
Process payment
    ↓
Create order record
    ↓
Send confirmation
```

Without instrumentation, if this flow is slow or fails, we're debugging blind. With the Tracing API, we'll see exactly where time is spent and what went wrong.

---

## Setup: Get a tracer

Before creating spans, we need a **tracer**. Think of it as our span factory:

```javascript
// Node.js
const { trace } = require('@opentelemetry/api');

const tracer = trace.getTracer(
  'order-service',           // Service name
  '1.0.0'                    // Optional: version
);
```

```python
# Python
from opentelemetry import trace

tracer = trace.get_tracer(
    "order-service",
    "1.0.0"
)
```

**Best practice:** Get one tracer per service/library and reuse it. Don't create a new tracer for every span.

---

## Creating your first manual span

The simplest span creation:

```javascript
// Node.js
const span = tracer.startSpan('process_order');

// Do work
processOrder();

span.end();
```

```python
# Python
span = tracer.start_span('process_order')

# Do work
process_order()

span.end()
```

**Critical:** Always call `span.end()`. Forgetting it means the span never finishes, breaking your trace.

---

## The better way: Context managers

Manual `span.end()` is error-prone. Use context managers instead:

```javascript
// Node.js - startActiveSpan
tracer.startActiveSpan('process_order', (span) => {
  try {
    processOrder();
  } finally {
    span.end();
  }
});
```

```python
# Python - with statement
with tracer.start_as_current_span('process_order'):
    process_order()
```

**Why this is better:**
- `span.end()` is called automatically
- Works with async/await
- Handles exceptions properly
- Sets the span as "active" (more on this later)

For the rest of today, we'll use context managers.

---

## Adding attributes: Making spans searchable

Attributes turn timing data into stories. Without them, you see "this took 500ms." With them, you see "processing order #12345 for user premium-tier-user took 500ms."

```javascript
// Node.js
tracer.startActiveSpan('process_order', (span) => {
  // Add attributes
  span.setAttribute('order.id', 'ord_12345');
  span.setAttribute('order.total', 149.99);
  span.setAttribute('order.currency', 'USD');
  span.setAttribute('order.item_count', 3);
  span.setAttribute('user.id', 'user_67890');
  span.setAttribute('user.tier', 'premium');
  
  processOrder();
  span.end();
});
```

```python
# Python
with tracer.start_as_current_span('process_order') as span:
    span.set_attribute('order.id', 'ord_12345')
    span.set_attribute('order.total', 149.99)
    span.set_attribute('order.currency', 'USD')
    span.set_attribute('order.item_count', 3)
    span.set_attribute('user.id', 'user_67890')
    span.set_attribute('user.tier', 'premium')
    
    process_order()
```

**Naming convention:**
- Use namespaces: `order.*`, `user.*`, `payment.*`
- Follow semantic conventions where they exist (we learned this on Day 5)
- Use dot notation: `order.total`, not `order_total`

**Now you can query:**
```
# Find all failed orders over $100
order.total > 100 AND status = ERROR

# Find slow premium user orders
user.tier = "premium" AND duration > 1000ms
```

---

## Nested spans: Showing the call hierarchy

The power of tracing is seeing how operations relate. Nested spans show parent-child relationships.

**Example: Order processing with nested operations**

```javascript
// Node.js
async function processOrder(orderData) {
  return tracer.startActiveSpan('process_order', async (orderSpan) => {
    orderSpan.setAttribute('order.id', orderData.id);
    orderSpan.setAttribute('order.total', orderData.total);
    
    try {
      // Child span 1: Validate
      await tracer.startActiveSpan('validate_order', async (validateSpan) => {
        validateSpan.setAttribute('order.item_count', orderData.items.length);
        await validateOrder(orderData);
        validateSpan.end();
      });
      
      // Child span 2: Check inventory
      await tracer.startActiveSpan('check_inventory', async (inventorySpan) => {
        const available = await checkInventory(orderData.items);
        inventorySpan.setAttribute('inventory.all_available', available);
        inventorySpan.end();
      });
      
      // Child span 3: Process payment
      await tracer.startActiveSpan('process_payment', async (paymentSpan) => {
        paymentSpan.setAttribute('payment.amount', orderData.total);
        paymentSpan.setAttribute('payment.method', orderData.paymentMethod);
        await processPayment(orderData);
        paymentSpan.end();
      });
      
      return { success: true };
    } finally {
      orderSpan.end();
    }
  });
}
```

```python
# Python
async def process_order(order_data):
    with tracer.start_as_current_span('process_order') as order_span:
        order_span.set_attribute('order.id', order_data['id'])
        order_span.set_attribute('order.total', order_data['total'])
        
        # Child span 1: Validate
        with tracer.start_as_current_span('validate_order') as validate_span:
            validate_span.set_attribute('order.item_count', len(order_data['items']))
            await validate_order(order_data)
        
        # Child span 2: Check inventory
        with tracer.start_as_current_span('check_inventory') as inventory_span:
            available = await check_inventory(order_data['items'])
            inventory_span.set_attribute('inventory.all_available', available)
        
        # Child span 3: Process payment
        with tracer.start_as_current_span('process_payment') as payment_span:
            payment_span.set_attribute('payment.amount', order_data['total'])
            payment_span.set_attribute('payment.method', order_data['payment_method'])
            await process_payment(order_data)
        
        return {'success': True}
```

**The resulting trace:**

```
process_order (850ms)
├─ validate_order (50ms)
│  └─ order.item_count = 3
├─ check_inventory (200ms)
│  └─ inventory.all_available = true
└─ process_payment (550ms)
   ├─ payment.amount = 149.99
   └─ payment.method = "credit_card"
```

**Key insight:** Using `startActiveSpan` (or `start_as_current_span`) automatically makes nested spans children of the active span. No manual parent management needed.

---

## Span events: Point-in-time observations

Sometimes you want to mark a moment in time within a span, without creating a whole new child span.

**Use cases:**
- "Payment authorization succeeded"
- "Retry attempt #3"
- "Cache miss"
- "Rate limit warning"

```javascript
// Node.js
tracer.startActiveSpan('process_payment', async (span) => {
  span.setAttribute('payment.amount', 149.99);
  
  // Event: Starting authorization
  span.addEvent('authorization_started', {
    'payment.processor': 'stripe',
    'payment.method': 'credit_card'
  });
  
  const authResult = await authorizePayment();
  
  if (authResult.requires_3ds) {
    // Event: 3D Secure required
    span.addEvent('3ds_challenge_required', {
      'challenge.url': authResult.challengeUrl
    });
  }
  
  // Event: Authorization completed
  span.addEvent('authorization_completed', {
    'authorization.id': authResult.id,
    'authorization.status': authResult.status
  });
  
  span.end();
});
```

```python
# Python
with tracer.start_as_current_span('process_payment') as span:
    span.set_attribute('payment.amount', 149.99)
    
    # Event: Starting authorization
    span.add_event('authorization_started', {
        'payment.processor': 'stripe',
        'payment.method': 'credit_card'
    })
    
    auth_result = await authorize_payment()
    
    if auth_result.requires_3ds:
        # Event: 3D Secure required
        span.add_event('3ds_challenge_required', {
            'challenge.url': auth_result.challenge_url
        })
    
    # Event: Authorization completed
    span.add_event('authorization_completed', {
        'authorization.id': auth_result.id,
        'authorization.status': auth_result.status
    })
```

**In trace UIs, events appear as markers on the span timeline**, showing exactly when they occurred.

**When to use events vs child spans:**

| Use Events | Use Child Spans |
|------------|-----------------|
| Instantaneous occurrences | Operations with duration |
| Log-like observations | Nested work |
| Minimal overhead | Full timing needed |
| "Payment authorized" | "Authorize payment" |
| "Cache miss" | "Check cache" |

---

## Error handling: Recording exceptions

When errors occur, we need to capture them in spans so they're visible in traces.

### The wrong way (what NOT to do)

```javascript
// ❌ DON'T DO THIS
tracer.startActiveSpan('process_order', (span) => {
  try {
    processOrder();
  } catch (error) {
    console.log('Error:', error);  // Just logging
  }
  span.end();
});
```

**Problem:** The span looks successful. The error is invisible in traces.

### The right way

```javascript
// ✅ Node.js - Proper error handling
const { SpanStatusCode } = require('@opentelemetry/api');

tracer.startActiveSpan('process_order', async (span) => {
  try {
    await processOrder();
    span.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    // 1. Record the exception (includes stack trace)
    span.recordException(error);
    
    // 2. Mark span as failed
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message
    });
    
    // 3. Re-throw so app handles it normally
    throw error;
  } finally {
    span.end();
  }
});
```

```python
# ✅ Python - Proper error handling
from opentelemetry.trace import Status, StatusCode

with tracer.start_as_current_span('process_order') as span:
    try:
        await process_order()
        span.set_status(Status(StatusCode.OK))
    except Exception as e:
        # 1. Record the exception
        span.record_exception(e)
        
        # 2. Mark span as failed
        span.set_status(Status(StatusCode.ERROR, str(e)))
        
        # 3. Re-raise
        raise
```

**What this does:**
- `recordException()`/`record_exception()`: Attaches error message, type, and stack trace to span
- `setStatus(ERROR)`: Marks span as failed (turns red in UIs)
- `throw`/`raise`: Lets your app handle the error normally (return 500, retry, etc.)

**The resulting trace:**

```
process_order (850ms) [ERROR] ❌
├─ validate_order (50ms) [OK]
├─ check_inventory (200ms) [OK]
└─ process_payment (550ms) [ERROR] ❌
   └─ Exception: InsufficientFundsError
      Message: "Card declined: insufficient funds"
      Stack trace: ...
```

Now you can search for failed spans: `status = ERROR AND order.total > 100`

---

## Span status: More than just errors

Spans have three status codes:

| Status | Meaning | When to use |
|--------|---------|-------------|
| `UNSET` | Default (neutral) | Most spans |
| `OK` | Explicitly successful | Operations where success needs confirmation |
| `ERROR` | Failed | Caught exceptions, validation failures, timeouts |

```javascript
// Node.js
const { SpanStatusCode } = require('@opentelemetry/api');

// Explicitly mark success
span.setStatus({ code: SpanStatusCode.OK });

// Mark failure
span.setStatus({ 
  code: SpanStatusCode.ERROR, 
  message: 'Validation failed: missing required field' 
});

// Leave unset (most common)
// span.setStatus() not called
```

**When to explicitly set OK:**
- Payment processing (confirm success)
- Data validation (passed all checks)
- Critical operations where success matters

**Most spans don't need explicit OK.** `UNSET` is fine.

---

## Real-world example: Complete order processing

Let's put it all together with a realistic, production-ready example:

```javascript
// Node.js - Complete example
const { trace, SpanStatusCode } = require('@opentelemetry/api');

const tracer = trace.getTracer('order-service', '1.0.0');

async function handleOrderRequest(req, res) {
  return tracer.startActiveSpan('handle_order_request', async (rootSpan) => {
    rootSpan.setAttribute('http.method', req.method);
    rootSpan.setAttribute('http.route', '/orders');
    
    try {
      const orderData = req.body;
      
      // Step 1: Validate
      await tracer.startActiveSpan('validate_order', async (span) => {
        span.setAttribute('order.id', orderData.id);
        span.setAttribute('order.item_count', orderData.items.length);
        
        try {
          await validateOrderData(orderData);
          span.addEvent('validation_passed');
          span.setStatus({ code: SpanStatusCode.OK });
        } catch (error) {
          span.recordException(error);
          span.setStatus({ code: SpanStatusCode.ERROR, message: 'Validation failed' });
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
          
          if (!result.allAvailable) {
            span.addEvent('inventory_shortage', {
              'unavailable_items': result.unavailableItems.join(', ')
            });
          }
          
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
        throw new Error('Items out of stock');
      }
      
      // Step 3: Calculate shipping
      const shippingCost = await tracer.startActiveSpan('calculate_shipping', async (span) => {
        span.setAttribute('shipping.destination', orderData.address.country);
        span.setAttribute('shipping.weight_kg', orderData.totalWeight);
        
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
      await tracer.startActiveSpan('process_payment', async (span) => {
        const totalAmount = orderData.total + shippingCost;
        
        span.setAttribute('payment.amount', totalAmount);
        span.setAttribute('payment.currency', orderData.currency);
        span.setAttribute('payment.method', orderData.paymentMethod);
        
        try {
          span.addEvent('payment_authorization_started');
          
          const paymentResult = await authorizePayment({
            amount: totalAmount,
            currency: orderData.currency,
            method: orderData.paymentMethod
          });
          
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
      
      // Step 5: Create order record
      const orderId = await tracer.startActiveSpan('create_order_record', async (span) => {
        try {
          const id = await createOrderInDatabase(orderData);
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
      rootSpan.setAttribute('order.final_id', orderId);
      rootSpan.setAttribute('http.status_code', 201);
      rootSpan.setStatus({ code: SpanStatusCode.OK });
      
      res.status(201).json({ orderId, status: 'created' });
      
    } catch (error) {
      rootSpan.recordException(error);
      rootSpan.setAttribute('http.status_code', error.statusCode || 500);
      rootSpan.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      
      res.status(error.statusCode || 500).json({ error: error.message });
    } finally {
      rootSpan.end();
    }
  });
}
```

**The resulting trace shows:**

```
handle_order_request (1850ms) [OK]
├─ validate_order (50ms) [OK]
│  ├─ order.id = "ord_12345"
│  ├─ order.item_count = 3
│  └─ Event: validation_passed
├─ check_inventory (200ms) [OK]
│  ├─ inventory.item_count = 3
│  └─ inventory.all_available = true
├─ calculate_shipping (100ms) [OK]
│  ├─ shipping.destination = "US"
│  ├─ shipping.weight_kg = 2.5
│  └─ shipping.cost = 12.99
├─ process_payment (1200ms) [OK]
│  ├─ payment.amount = 162.98
│  ├─ payment.currency = "USD"
│  ├─ payment.method = "credit_card"
│  ├─ Event: payment_authorization_started
│  ├─ Event: payment_authorization_completed
│  └─ payment.authorization_id = "auth_xyz789"
└─ create_order_record (300ms) [OK]
   └─ order.created_id = "ord_12345"
```

**Now when something goes wrong, you see exactly where.**

---

## Advanced: Adding attributes conditionally

Sometimes you only want to add attributes based on outcomes:

```javascript
tracer.startActiveSpan('apply_discount', async (span) => {
  span.setAttribute('discount.code', discountCode);
  
  const discount = await calculateDiscount(discountCode);
  
  if (discount.applied) {
    span.setAttribute('discount.amount', discount.amount);
    span.setAttribute('discount.percentage', discount.percentage);
    span.addEvent('discount_applied');
  } else {
    span.setAttribute('discount.applied', false);
    span.setAttribute('discount.reason', discount.reason);
    span.addEvent('discount_rejected', {
      'rejection.reason': discount.reason
    });
  }
  
  span.end();
});
```

---

## Advanced: Parallel operations (multiple child spans)

Sometimes you have parallel work (e.g., checking inventory for multiple items):

```javascript
async function checkAllItemsInventory(items) {
  return tracer.startActiveSpan('check_all_items', async (parentSpan) => {
    parentSpan.setAttribute('items.count', items.length);
    
    // Create child spans in parallel
    const checks = items.map(item =>
      tracer.startActiveSpan(`check_item_${item.sku}`, async (itemSpan) => {
        itemSpan.setAttribute('item.sku', item.sku);
        itemSpan.setAttribute('item.quantity', item.quantity);
        
        try {
          const available = await checkItemInventory(item);
          itemSpan.setAttribute('item.available', available);
          return available;
        } finally {
          itemSpan.end();
        }
      })
    );
    
    const results = await Promise.all(checks);
    parentSpan.setAttribute('all_available', results.every(r => r));
    parentSpan.end();
    
    return results;
  });
}
```

**The trace shows parallel spans:**

```
check_all_items (450ms)
├─ check_item_SKU123 (200ms)  ← Start: 0ms
├─ check_item_SKU456 (300ms)  ← Start: 0ms (parallel!)
└─ check_item_SKU789 (450ms)  ← Start: 0ms (parallel!)
```

In a waterfall view, you'll see these bars overlapping, indicating parallel execution.

---

## Best practices summary

### ✅ Do:
- Use `startActiveSpan` / `start_as_current_span` (context managers)
- Always call `span.end()` (or let context manager do it)
- Record exceptions with `recordException()` / `record_exception()`
- Set span status to `ERROR` when failures occur
- Add meaningful attributes (order ID, user ID, amounts)
- Use semantic conventions where they exist
- Re-throw errors after recording them

### ❌ Don't:
- Forget to call `span.end()`
- Swallow errors without recording them in spans
- Add high-cardinality attributes everywhere (be selective)
- Create spans for trivial operations (<1ms)
- Use span names with dynamic values (`process_order_12345` ❌)

---

## Common patterns

### Pattern 1: Retry logic with events

```javascript
tracer.startActiveSpan('call_external_api', async (span) => {
  let attempts = 0;
  const maxAttempts = 3;
  
  while (attempts < maxAttempts) {
    attempts++;
    span.addEvent('retry_attempt', { 'attempt': attempts });
    
    try {
      const result = await callAPI();
      span.setAttribute('attempts', attempts);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      if (attempts === maxAttempts) {
        span.recordException(error);
        span.setStatus({ code: SpanStatusCode.ERROR });
        throw error;
      }
      await sleep(1000 * attempts);
    }
  }
  
  span.end();
});
```

### Pattern 2: Conditional spans

```javascript
async function processOrder(orderData) {
  return tracer.startActiveSpan('process_order', async (span) => {
    // Always validate
    await validateOrder(orderData);
    
    // Only check fraud for high-value orders
    if (orderData.total > 1000) {
      await tracer.startActiveSpan('fraud_check', async (fraudSpan) => {
        const riskScore = await checkFraud(orderData);
        fraudSpan.setAttribute('fraud.risk_score', riskScore);
        fraudSpan.end();
      });
    }
    
    await processPayment(orderData);
    span.end();
  });
}
```

### Pattern 3: Enriching spans with computed values

```javascript
tracer.startActiveSpan('calculate_total', async (span) => {
  const subtotal = calculateSubtotal(items);
  const tax = calculateTax(subtotal);
  const shipping = calculateShipping(address);
  const total = subtotal + tax + shipping;
  
  // Add all computed values
  span.setAttribute('order.subtotal', subtotal);
  span.setAttribute('order.tax', tax);
  span.setAttribute('order.shipping', shipping);
  span.setAttribute('order.total', total);
  span.setAttribute('order.tax_rate', tax / subtotal);
  
  span.end();
  return total;
});
```

---

## Troubleshooting

### "My spans aren't showing up in traces"

**Checklist:**
1. ✅ SDK is initialized and started?
2. ✅ Exporter is configured correctly?
3. ✅ Calling `span.end()`?
4. ✅ Sampling rate isn't 0?
5. ✅ Using `startActiveSpan` (not just `startSpan`)?

### "My nested spans aren't showing parent-child relationships"

**Problem:** You're probably using `startSpan()` instead of `startActiveSpan()`.

**Solution:** Use `startActiveSpan()` to automatically set the active span context.

### "Spans are showing up but attributes are missing"

**Checklist:**
1. ✅ Calling `setAttribute()` before `span.end()`?
2. ✅ Attribute values are serializable (no objects, use primitives)?
3. ✅ Check backend limits (some truncate attributes)?

---

## What I'm taking into Day 10

Today we learned the **Tracing API**—the core of manual instrumentation:

**Key skills:**
- Creating spans with `startActiveSpan` / `start_as_current_span`
- Building nested hierarchies that show call relationships
- Adding attributes for searchability
- Recording events for point-in-time observations
- Handling errors properly (`recordException`, `setStatus`)
- Following best practices for production-ready instrumentation

**The pattern:**
```javascript
tracer.startActiveSpan('operation_name', async (span) => {
  span.setAttribute('key', 'value');
  
  try {
    // Do work
    span.addEvent('milestone_reached');
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

Tomorrow (Day 10), we'll learn the **Metrics API**: counters, gauges, and histograms for measuring what matters. Metrics are different from traces—they're aggregates, not individual requests—but they're equally powerful.

See you on Day 10!

---

## Extra: Quick reference

### Node.js cheat sheet

```javascript
const { trace, SpanStatusCode } = require('@opentelemetry/api');
const tracer = trace.getTracer('service-name', '1.0.0');

// Create span
tracer.startActiveSpan('operation', async (span) => {
  // Add attribute
  span.setAttribute('key', 'value');
  
  // Add event
  span.addEvent('event_name', { 'key': 'value' });
  
  // Record exception
  span.recordException(error);
  
  // Set status
  span.setStatus({ code: SpanStatusCode.ERROR, message: 'Failed' });
  
  // End (or let context manager do it)
  span.end();
});
```

### Python cheat sheet

```python
from opentelemetry import trace
from opentelemetry.trace import Status, StatusCode

tracer = trace.get_tracer("service-name", "1.0.0")

# Create span
with tracer.start_as_current_span('operation') as span:
    # Add attribute
    span.set_attribute('key', 'value')
    
    # Add event
    span.add_event('event_name', {'key': 'value'})
    
    # Record exception
    span.record_exception(error)
    
    # Set status
    span.set_status(Status(StatusCode.ERROR, "Failed"))
```

---

**Ready for Day 10?** We'll shift from individual requests (traces) to aggregate measurements (metrics). See you tomorrow!
