// app.js
const express = require('express');
const { trace, metrics, SpanStatusCode } = require('@opentelemetry/api');

const app = express();
app.use(express.json());

// Get a tracer (from Day 9)
const tracer = trace.getTracer('order-service', '1.0.0');

// Get a meter (NEW for Day 10)
const meter = metrics.getMeter('order-service', '1.0.0');

// =========================
// METRICS (create once, use everywhere)
// =========================

// Create counters once at startup
const ordersTotal = meter.createCounter("orders_processed_total", {
  description: "Total number of orders processed (success + failed)",
});

const ordersSuccess = meter.createCounter("orders_success_total", {
  description: "Total number of successful orders",
});

const ordersFailed = meter.createCounter("orders_failed_total", {
  description: "Total number of failed orders",
});

// =========================
// HELPER FUNCTIONS (same as Day 9)
// =========================

async function validateOrder(orderData) {
  await new Promise(resolve => setTimeout(resolve, 50));
  
  if (!orderData.items || orderData.items.length === 0) {
    throw new Error('Order must contain items');
  }
  if (!orderData.userId) {
    throw new Error('Order must have a userId');
  }
}

async function checkInventory(items) {
  await new Promise(resolve => setTimeout(resolve, 200));
  return { allAvailable: true, unavailableItems: [] };
}

async function calculateShipping(orderData) {
  await new Promise(resolve => setTimeout(resolve, 100));
  return 12.99;
}

async function processPayment(amount, method) {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // 20% chance of failure for demo purposes
  if (Math.random() < 0.2) {
    throw new Error('Payment declined: insufficient funds');
  }
  
  return {
    authId: 'auth_' + Math.random().toString(36).substring(2, 11),
    status: 'approved'
  };
}

async function saveOrder(orderData) {
  await new Promise(resolve => setTimeout(resolve, 150));
  return 'ord_' + Math.random().toString(36).substring(2, 11);
}

// =========================
// ORDER ENDPOINT (building on Day 9)
// =========================

app.post('/orders', async (req, res) => {
  return tracer.startActiveSpan('process_order', async (orderSpan) => {
    const orderData = req.body;
    
    // Add attributes to span (from Day 9)
    orderSpan.setAttribute('order.item_count', orderData.items?.length || 0);
    orderSpan.setAttribute('user.id', orderData.userId);
    
    try {
      // Step 1: Validate
      await tracer.startActiveSpan('validate_order', async (span) => {
        try {
          await validateOrder(orderData);
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
        try {
          const result = await checkInventory(orderData.items);
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
        try {
          const cost = await calculateShipping(orderData);
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
        try {
          const paymentResult = await processPayment(totalAmount, orderData.paymentMethod);
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
      
      // SUCCESS! Count it.
      ordersTotal.add(1);        // One more order processed
      ordersSuccess.add(1);      // One more successful order
      
      orderSpan.setStatus({ code: SpanStatusCode.OK });
      
      res.status(201).json({
        orderId,
        status: 'created',
        total: totalAmount
      });
      
    } catch (error) {
      // FAILURE! Count it.
      ordersTotal.add(1);        // One more order processed
      ordersFailed.add(1);       // One more failed order
      
      orderSpan.recordException(error);
      orderSpan.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      
      res.status(400).json({ error: error.message });
    } finally {
      orderSpan.end();
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Order service listening on port ${PORT}`);
  console.log('Send POST requests to /orders to see metrics in action');
});
