const { NodeSDK } = require("@opentelemetry/sdk-node");
const { getNodeAutoInstrumentations } = require("@opentelemetry/auto-instrumentations-node");
const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-http");
const { OTLPMetricExporter } = require("@opentelemetry/exporter-metrics-otlp-http");
const { PeriodicExportingMetricReader } = require("@opentelemetry/sdk-metrics");
const { Resource } = require("@opentelemetry/resources");
const { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } = require("@opentelemetry/semantic-conventions");

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: "order-service",
    [ATTR_SERVICE_VERSION]: "1.0.0",
  }),
  
  // Trace exporter (from Day 9)
  traceExporter: new OTLPTraceExporter({
    url: "http://localhost:4318/v1/traces",
  }),
  
  // Metric exporter (NEW for Day 10)
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: "http://localhost:4318/v1/metrics",
    }),
    exportIntervalMillis: 5000,  // Export metrics every 5 seconds
  }),
  
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
console.log("OpenTelemetry initialized (traces + metrics)");