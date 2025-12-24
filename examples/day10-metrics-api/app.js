// app.js
const express = require("express");
const { trace, SpanStatusCode, metrics } = require("@opentelemetry/api");

const app = express();
app.use(express.json());

// Tracer (Day 9) + Meter (Day 10)
const tracer = trace.getTracer("order-service", "1.0.0");
const meter = metrics.getMeter("order-service", "1.0.0");

// =========================
// METRICS (create once)
// =========================

// Counter: total orders processed (success + failed)
const ordersProcessed = meter.createCounter("orders.processed.total", {
  description: "Total number of orders processed",
  unit: "1",
});

// Counter: total payment failures
const paymentFailures = meter.createCounter("payments.failed.total", {
  description: "Total number of payment failures",
  unit: "1",
});

// Histogram: order processing duration
const orderDuration = meter.createHistogram("order.processing.duration", {
  description: "Time spent processing an order",
  unit: "ms",
});

// Histogram: order totals (store currency as attribute)
const orderTotal = meter.createHistogram("order.total", {
  description: "Distribution of order totals",
  unit: "1",
});

// UpDownCounter: active orders in progress
const activeOrders = meter.createUpDownCounter("orders.active", {
  description: "Number of orders currently being processed",
  unit: "1",
});

// =========================
// HELPERS (same as Day 9)
// =========================

async function validateOrder(orderData) {
  await new Promise((resolve) => setTimeout(resolve, 50));
  if (!orderData.items || orderData.items.length === 0) {
    throw new Error("Order must contain items");
  }
  if (!orderData.userId) {
    throw new Error("Order must have a userId");
  }
}

async function checkInventory(items) {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return { allAvailable: true, unavailableItems: [] };
}

async function calculateShipping(orderData) {
  await new Promise((resolve) => setTimeout(resolve, 100));
  return 12.99;
}

async function processPayment(amount, method) {
  await new Promise((resolve) => setTimeout(resolve, 500));

  // 30% chance of failure
  if (Math.random() < 0.3) {
    throw new Error("Payment declined: insufficient funds");
  }

  return {
    authId: "auth_" + Math.random().toString(36).substring(2, 11),
    status: "approved",
  };
}

async function saveOrder(orderData) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  return "ord_" + Math.random().toString(36).substring(2, 11);
}

// =========================
// ORDER ENDPOINT
// =========================

app.post("/orders", async (req, res) => {
  const startTime = Date.now();
  const paymentMethod = req.body?.paymentMethod || "credit_card";

  // "in-flight right now"
  activeOrders.add(1);

  return tracer.startActiveSpan("process_order", async (orderSpan) => {
    const orderData = req.body;
    const orderSubtotal = orderData.total || 100;

    orderSpan.setAttribute("order.item_count", orderData.items?.length || 0);
    orderSpan.setAttribute("order.user_id", orderData.userId);
    orderSpan.setAttribute("order.subtotal", orderSubtotal);

    try {
      // Step 1: Validate
      await tracer.startActiveSpan("validate_order", async (span) => {
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
      const inventoryResult = await tracer.startActiveSpan(
        "check_inventory",
        async (span) => {
          try {
            const result = await checkInventory(orderData.items);
            span.setAttribute("inventory.all_available", result.allAvailable);
            span.setStatus({ code: SpanStatusCode.OK });
            return result;
          } catch (error) {
            span.recordException(error);
            span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
            throw error;
          } finally {
            span.end();
          }
        }
      );

      if (!inventoryResult.allAvailable) {
        throw new Error("Some items are out of stock");
      }

      // Step 3: Calculate shipping
      const shippingCost = await tracer.startActiveSpan(
        "calculate_shipping",
        async (span) => {
          try {
            const cost = await calculateShipping(orderData);
            span.setAttribute("shipping.cost", cost);
            span.setStatus({ code: SpanStatusCode.OK });
            return cost;
          } catch (error) {
            span.recordException(error);
            span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
            throw error;
          } finally {
            span.end();
          }
        }
      );

      // Step 4: Process payment
      const totalAmount = orderSubtotal + shippingCost;

      await tracer.startActiveSpan("process_payment", async (span) => {
        span.setAttribute("payment.amount", totalAmount);
        span.setAttribute("payment.method", paymentMethod);

        try {
          const paymentResult = await processPayment(totalAmount, paymentMethod);
          span.setAttribute("payment.authorization_id", paymentResult.authId);
          span.setStatus({ code: SpanStatusCode.OK });
        } catch (error) {
          span.recordException(error);
          span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });

          // metric: payment failures
          paymentFailures.add(1, { method: paymentMethod });

          throw error;
        } finally {
          span.end();
        }
      });

      // Step 5: Save order
      const orderId = await tracer.startActiveSpan("save_order", async (span) => {
        try {
          const id = await saveOrder(orderData);
          span.setAttribute("order.created_id", id);
          span.setStatus({ code: SpanStatusCode.OK });
          return id;
        } catch (error) {
          span.recordException(error);
          span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
          throw error;
        } finally {
          span.end();
        }
      });

      // SUCCESS METRICS
      const durationMs = Date.now() - startTime;

      ordersProcessed.add(1, { status: "success", method: paymentMethod });
      orderDuration.record(durationMs, { status: "success" });
      orderTotal.record(totalAmount, { currency: "USD" });

      orderSpan.setAttribute("order.final_id", orderId);
      orderSpan.setStatus({ code: SpanStatusCode.OK });

      res.status(201).json({
        orderId,
        status: "created",
        total: totalAmount,
      });
    } catch (error) {
      // FAILURE METRICS
      const durationMs = Date.now() - startTime;

      ordersProcessed.add(1, { status: "failed", method: paymentMethod });
      orderDuration.record(durationMs, { status: "failed" });

      orderSpan.recordException(error);
      orderSpan.setStatus({ code: SpanStatusCode.ERROR, message: error.message });

      res.status(400).json({ error: error.message });
    } finally {
      // always decrement
      activeOrders.add(-1);
      orderSpan.end();
    }
  });
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Order service listening on port ${PORT}`);
});
