# Day 16 - Receivers Examples

This directory contains example configurations for different OpenTelemetry Collector receivers.

## Files

- `basic-otlp.yaml` - Basic OTLP receiver for OpenTelemetry SDKs
- `prometheus-scraping.yaml` - Prometheus receiver for scraping metrics
- `filelog-parsing.yaml` - Filelog receiver for parsing log files
- `multi-source.yaml` - Multiple receivers in one configuration

## Running the Examples

### Prerequisites

1. **Install OpenTelemetry Collector:**
   ```bash
   # Download the latest release
   curl -L -o otelcol https://github.com/open-telemetry/opentelemetry-collector-releases/releases/latest/download/otelcol_linux_amd64
   chmod +x otelcol
   ```

2. **Create test log files (for filelog examples):**
   ```bash
   mkdir -p /var/log/app
   echo "2026-01-16 10:30:45 INFO User login successful" >> /var/log/app/app.log
   echo "2026-01-16 10:31:12 ERROR Database connection failed" >> /var/log/app/app.log
   echo "2026-01-16 10:31:45 WARN High memory usage detected" >> /var/log/app/app.log
   ```

### Running Each Example

**1. Basic OTLP Receiver:**
```bash
./otelcol --config=basic-otlp.yaml
```
Then send test data:
```bash
# Test with curl (if you have an app sending OTLP data)
curl -X POST http://localhost:4318/v1/traces \
  -H "Content-Type: application/json" \
  -d '{"resourceSpans":[]}'
```

**2. Prometheus Scraping:**
```bash
# First, start a simple metrics server (optional)
python3 -m http.server 8080 &

# Run the collector
./otelcol --config=prometheus-scraping.yaml
```

**3. Filelog Parsing:**
```bash
# Make sure log files exist and are readable
sudo chmod 644 /var/log/app/*.log

# Run the collector
./otelcol --config=filelog-parsing.yaml

# Add more log entries to see them processed
echo "2026-01-16 10:32:00 INFO New user registered" >> /var/log/app/app.log
```

**4. Multi-Source Configuration:**
```bash
./otelcol --config=multi-source.yaml
```

## What You'll See

When running these examples, you'll see log output showing:
- Receiver startup messages
- Incoming telemetry data
- Processed and exported data (via logging exporter)

Example output:
```
2026-01-16T10:30:45.123Z info service/service.go:123 Starting receivers...
2026-01-16T10:30:45.124Z info otlpreceiver/otlp.go:45 Starting OTLP receiver on 0.0.0.0:4317
2026-01-16T10:30:45.125Z info prometheusreceiver/prometheus.go:67 Starting Prometheus scraping
```

## Troubleshooting

**Port already in use:**
```bash
# Check what's using the port
netstat -tulpn | grep :4317
# Kill the process or change the port in the config
```

**Permission denied (log files):**
```bash
# Make sure the collector can read log files
sudo chmod 644 /var/log/app/*.log
# Or run collector with appropriate permissions
```

**No data appearing:**
- Check that applications are sending data to the correct endpoints
- Verify firewall settings allow connections
- Use the logging exporter to see if data is being received

## Next Steps

After trying these examples:
1. Modify the configurations to match your environment
2. Try combining different receivers
3. Experiment with different scraping intervals and file patterns
4. Move on to Day 17 to learn about processors!