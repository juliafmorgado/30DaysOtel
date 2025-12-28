// instrumentation-console.js - See spans in your terminal
const { NodeSDK } = require("@opentelemetry/sdk-node");
const { ConsoleSpanExporter } = require("@opentelemetry/sdk-trace-node");
const { Resource } = require("@opentelemetry/resources");
const { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } = require("@opentelemetry/semantic-conventions");
const { SimpleSpanProcessor } = require("@opentelemetry/sdk-trace-node");

const sdk = new NodeSDK({
  // Resource attributes - describe your service
  resource: new Resource({
    [ATTR_SERVICE_NAME]: "sdk-basics-demo",
    [ATTR_SERVICE_VERSION]: "1.0.0",
    "deployment.environment": "development",
    "service.team": "platform",
  }),
  
  // Use console exporter so we can see spans in terminal
  spanProcessor: new SimpleSpanProcessor(
    new ConsoleSpanExporter()
  ),
  
  // No auto-instrumentation for now - we want to see our manual spans clearly
  instrumentations: [],
});

sdk.start();
console.log("✅ SDK initialized - spans will print to console");