# Day 20: Deployment Patterns Examples

This directory contains complete examples for different OpenTelemetry Collector deployment patterns.

## Files Overview

- `agent-config.yaml` - Agent pattern configuration (minimal processing)
- `gateway-config.yaml` - Gateway pattern configuration (advanced processing)
- `kubernetes-agent-daemonset.yaml` - Kubernetes DaemonSet for agent deployment
- `kubernetes-gateway-deployment.yaml` - Kubernetes Deployment for gateway pattern

## Agent Pattern

The agent pattern deploys Collectors close to applications for low latency and high availability.

### Running the Agent Example

```bash
# Download the agent configuration
curl -O https://raw.githubusercontent.com/your-repo/30DaysOtel/main/examples/day20-deployment-patterns/agent-config.yaml

# Update the API token in the configuration
sed -i 's/YOUR_API_TOKEN/your-actual-token/' agent-config.yaml

# Run the Collector
docker run -p 4317:4317 -p 4318:4318 -p 8888:8888 \
  -v $(pwd)/agent-config.yaml:/etc/otelcol-contrib/config.yaml \
  otel/opentelemetry-collector-contrib:latest
```

### Agent Pattern Benefits

- **Low Latency**: Minimal network hops
- **High Availability**: Independent failure domains
- **Resource Isolation**: Predictable resource usage
- **Simple Configuration**: Straightforward pipelines

## Gateway Pattern

The gateway pattern uses centralized Collectors for advanced processing and multi-backend routing.

### Running the Gateway Example

```bash
# Download the gateway configuration
curl -O https://raw.githubusercontent.com/your-repo/30DaysOtel/main/examples/day20-deployment-patterns/gateway-config.yaml

# Update API tokens in the configuration
sed -i 's/YOUR_PROD_API_TOKEN/your-production-token/' gateway-config.yaml
sed -i 's/YOUR_ARCHIVE_API_TOKEN/your-archive-token/' gateway-config.yaml
sed -i 's/YOUR_SECURITY_API_TOKEN/your-security-token/' gateway-config.yaml

# Run the Collector
docker run -p 4317:4317 -p 4318:4318 -p 8888:8888 \
  -v $(pwd)/gateway-config.yaml:/etc/otelcol-contrib/config.yaml \
  otel/opentelemetry-collector-contrib:latest
```

### Gateway Pattern Benefits

- **Centralized Control**: Single configuration point
- **Advanced Processing**: Complex transformations and routing
- **Cost Efficiency**: Shared infrastructure
- **Multi-Backend Support**: Route to different backends

## Kubernetes Deployments

### Agent DaemonSet

Deploy agents on every Kubernetes node:

```bash
# Create namespace
kubectl create namespace observability

# Deploy the DaemonSet
kubectl apply -f kubernetes-agent-daemonset.yaml

# Check deployment
kubectl get pods -n observability -l app=otel-collector-agent
```

### Gateway Deployment

Deploy centralized gateways with auto-scaling:

```bash
# Create the secret with your API token
kubectl create secret generic observability-secrets \
  --from-literal=dash0-api-token=your-actual-token \
  -n observability

# Deploy the gateway
kubectl apply -f kubernetes-gateway-deployment.yaml

# Check deployment
kubectl get pods -n observability -l app=otel-collector-gateway
```

## Hybrid Pattern

Combine both patterns by:

1. Deploy agents using the DaemonSet
2. Deploy gateways using the Deployment
3. Configure agents to send to gateways:

```yaml
# In agent configuration
exporters:
  otlp/gateway:
    endpoint: http://otel-collector-gateway.observability.svc.cluster.local:4317
```

## Testing Your Deployment

### Send Test Data

```bash
# Install otel-cli for testing
go install github.com/equinix-labs/otel-cli@latest

# Send test trace to agent (port 4317)
otel-cli exec --endpoint http://localhost:4317 --insecure \
  --service "test-service" --name "test-operation" \
  -- echo "Testing agent pattern"

# Send test trace to gateway (port 4317)
otel-cli exec --endpoint http://localhost:4317 --insecure \
  --service "test-service" --name "test-operation" \
  -- echo "Testing gateway pattern"
```

### Monitor Collector Health

```bash
# Check Collector metrics
curl http://localhost:8888/metrics

# Look for key metrics:
# - otelcol_receiver_accepted_spans_total
# - otelcol_processor_batch_batch_send_size_sum
# - otelcol_exporter_sent_spans_total
```

## Configuration Tips

### Agent Pattern Optimization

```yaml
processors:
  batch:
    timeout: 1s          # Fast batching for low latency
    send_batch_size: 512 # Smaller batches
  
  memory_limiter:
    limit_mib: 128       # Conservative memory limit
```

### Gateway Pattern Optimization

```yaml
processors:
  batch:
    timeout: 5s           # Longer batching for efficiency
    send_batch_size: 2048 # Larger batches
  
  memory_limiter:
    limit_mib: 1024       # More memory for processing
```

## Troubleshooting

### Common Issues

1. **Agent can't reach gateway**
   - Check network connectivity
   - Verify service discovery (Kubernetes DNS)
   - Check firewall rules

2. **Gateway overwhelmed**
   - Scale horizontally (increase replicas)
   - Optimize processing (add filtering)
   - Check resource limits

3. **High memory usage**
   - Tune batch processor settings
   - Add memory_limiter processor
   - Check for memory leaks in custom processors

### Debug Commands

```bash
# Check Collector logs
kubectl logs -n observability -l app=otel-collector-agent -f

# Check resource usage
kubectl top pods -n observability

# Check HPA status
kubectl get hpa -n observability
```

## Next Steps

1. **Monitor Performance**: Set up monitoring for your Collectors
2. **Optimize Costs**: Implement filtering and sampling strategies
3. **Scale Testing**: Test with production-like loads
4. **Security**: Implement proper authentication and TLS
5. **Backup Strategy**: Plan for Collector failures and data loss

## Related Examples

- [Day 16: Receivers](../day16-receivers/) - Understanding data ingestion
- [Day 17: Processors](../day17-processors/) - Data transformation
- [Day 18: Exporters](../day18-exporters/) - Multi-backend strategies