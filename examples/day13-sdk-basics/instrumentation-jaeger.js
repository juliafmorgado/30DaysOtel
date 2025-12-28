// instrumentation-jaeger.js - Send to Jaeger instead of console
const { NodeSDK } = require("@opentelemetry/sdk-node");
const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-http");
const { Resource } = require("@opentelemetry/resources");
const { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } = require("@opentelemetry/semantic-conventions");
const { 
  BatchSpanProcessor,
  TraceIdRatioBasedSampler 
} = require("@opentelemetry/sdk-trace-node");

const sdk = new NodeSDK({
  // Resource attributes - describe your service
  resource: new Resource({
    [ATTR_SERVICE_NAME]: "sdk-basics-demo",
    [ATTR_SERVICE_VERSION]: "1.0.0",
    "deployment.environment": "production",
    "service.team": "platform",
  }),
  
  // Keep all spans for this demo (head-based sampling)
  sampler: new TraceIdRatioBasedSampler(1.0), // 100%
  
  // Use batch processor (more efficient for real backends)
  spanProcessor: new BatchSpanProcessor(
    new OTLPTraceExporter({
      url: "http://localhost:4318/v1/traces",
    })
  ),
  
  instrumentations: [],
});

sdk.start();
console.log("✅ SDK initialized - spans will be batched and sent to Jaeger");