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
    authId: 'auth_' + Math.random().toString(36).substring(2, 11),
    status: 'approved'
  };
}

async function saveOrder(orderData) {
  // Simulate database save
  await new Promise(resolve => setTimeout(resolve, 150));
  
  return 'ord_' + Math.random().toString(36).substring(2, 11);
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