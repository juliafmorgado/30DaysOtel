# Day 19 - OTTL: Advanced Data Transformations

This directory contains example configurations for OpenTelemetry Transformation Language (OTTL) transformations.

> **Important Note**: These examples use batch processor for educational purposes. OpenTelemetry is moving batching functionality to exporters for better reliability ([GitHub issue #8122](https://github.com/open-telemetry/opentelemetry-collector/issues/8122)). In production, prefer exporters with built-in batching and persistent storage.

## Files

- `basic-transformations.yaml` - Basic OTTL functions and patterns
- `business-logic.yaml` - Business-focused transformations
- `data-enrichment.yaml` - Header extraction and data enrichment
- `performance-classification.yaml` - Performance categorization
- `ecommerce-example.yaml` - Real-world e-commerce transformations
- `metrics-transformations.yaml` - Metric-specific OTTL examples
- `logs-transformations.yaml` - Log-specific OTTL examples
- `debug-config.yaml` - Configuration for debugging OTTL transformations

## Running the Examples

1. **Start the Collector:**
   ```bash
   otelcol --config-file=basic-transformations.yaml
   ```

2. **Send test data:**
   Use the test data generator or send traces from your application to see the transformations in action.

3. **Observe the results:**
   Check the exported data to see how the OTTL transformations modified your telemetry.

## Key OTTL Concepts

- **Contexts**: resource, span, metric, datapoint, log
- **Functions**: set(), delete_key(), Concat(), Split(), Replace()
- **Conditions**: WHERE clauses for conditional transformations
- **Performance**: Optimize for hot paths and specific conditions

## Next Steps

- Experiment with different OTTL statements
- Combine multiple transform processors
- Test performance impact of complex transformations
- Move to Day 20 for deployment patterns