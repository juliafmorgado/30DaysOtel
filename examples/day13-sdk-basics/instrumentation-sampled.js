// instrumentation-sampled.js - Only keep 50% of spans
const { NodeSDK } = require("@opentelemetry/sdk-node");
const { ConsoleSpanExporter } = require("@opentelemetry/sdk-trace-node");
const { Resource } = require("@opentelemetry/resources");
const { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } = require("@opentelemetry/semantic-conventions");
const { 
  SimpleSpanProcessor,
  TraceIdRatioBasedSampler 
} = require("@opentelemetry/sdk-trace-node");

const sdk = new NodeSDK({
  // Resource attributes - describe your service
  resource: new Resource({
    [ATTR_SERVICE_NAME]: "sdk-basics-demo",
    [ATTR_SERVICE_VERSION]: "1.0.0",
    "deployment.environment": "testing",
    "service.team": "platform",
  }),
  
  // Only keep 50% of traces (head-based sampling)
  sampler: new TraceIdRatioBasedSampler(0.5),
  
  spanProcessor: new SimpleSpanProcessor(
    new ConsoleSpanExporter()
  ),
  
  instrumentations: [],
});

sdk.start();
console.log("✅ SDK initialized with 50% sampling - some spans will be dropped");