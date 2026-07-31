# Dia 23 – Cadê os Meus Dados? Solucionando Problemas de Telemetry Ausente

Você configurou seu setup de OpenTelemetry. Adicionou instrumentação. Configurou o collector. Mas quando você olha o seu observabilidade backend... **nada**. Sem traces, sem metrics, sem logs.

**A pergunta de hoje é:** quando os dados de telemetry somem, como você faz um debug sistemático do pipeline para descobrir onde eles estão se perdendo?

Essa é uma das frustrações mais comuns de quem está começando com OpenTelemetry. A boa notícia é que existe uma abordagem metódica para encontrar e corrigir esses problemas.

## O pipeline de telemetry: onde os dados podem desaparecer

Entender onde os dados podem se perder ajuda você a fazer debug de forma sistemática:

```
Application → SDK → Collector → Backend
     ↓         ↓        ↓         ↓
   [Issue 1] [Issue 2] [Issue 3] [Issue 4]
```

**Issue 1:** a aplicação não está gerando dados
**Issue 2:** o SDK não está exportando dados
**Issue 3:** o collector não está recebendo/processando dados
**Issue 4:** o backend não está recebendo/armazenando dados

Vamos fazer debug de cada etapa de forma sistemática.

## Passo 1: sua aplicação está gerando telemetry?

### Verifique se a instrumentação foi carregada

**Problema:** instrumentação não carregada ou configurada incorretamente.

**Comandos de debug:**
```bash
# Enable OpenTelemetry debug logging
export OTEL_LOG_LEVEL=debug

# For Node.js, also enable instrumentation debugging
export OTEL_INSTRUMENTATION_DEBUG=true

# Run your application
node app.js
```

**O que observar:**
```
Good: @opentelemetry/instrumentation-http Applying instrumentation patch for module http
Good: @opentelemetry/instrumentation-express Applying instrumentation patch for module express

Bad: No instrumentation messages
Bad: "Module not found" errors
```

### Confirme se os spans estão sendo criados

**Adicione um log temporário para ver os spans crus:**

```javascript
// In your instrumentation setup
const { SimpleSpanProcessor, ConsoleSpanExporter } = require('@opentelemetry/sdk-trace-base');

// Add console exporter temporarily for debugging
sdk.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
```

**Faça uma requisição de teste e confira a saída no console:**
```bash
curl http://localhost:3000/api/test
```

**Saída esperada:**
```json
{
  "traceId": "a1b2c3d4e5f6...",
  "spanId": "1a2b3c4d...",
  "name": "GET /api/test",
  "attributes": {
    "http.request.method": "GET",
    "http.route": "/api/test"
  }
}
```

## Passo 2: seu SDK está exportando dados?

### Verifique a configuração do SDK

**Problemas comuns:**
- Endpoint do exporter errado
- Autenticação ausente
- Problemas de conectividade de rede
- Configuração de sampling descartando todos os dados

**Faça debug do exporter:**
```javascript
// Add debug logging to your SDK setup
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

const exporter = new OTLPTraceExporter({
  url: 'http://localhost:4318/v1/traces',
  // Add debug headers
  headers: {
    'debug': 'true'
  }
});

// Test exporter connectivity
console.log('Exporter endpoint:', exporter.url);
```

### Confirme a conectividade de rede

**Teste se o collector está acessível:**
```bash
# Test HTTP connectivity to collector
curl -v http://localhost:4318/v1/traces \
  -H "Content-Type: application/json" \
  -d '{"test": "connectivity"}'

# Should return 200 or 400 (not connection refused)
```

### Verifique a configuração de sampling

**Problema:** o sampler está descartando todos os traces.

```javascript
// Temporarily use AlwaysOn sampler for debugging
const { AlwaysOnSampler } = require('@opentelemetry/sdk-trace-base');

const sdk = new NodeSDK({
  sampler: new AlwaysOnSampler(), // Debug: capture everything
  // ... rest of config
});
```

## Passo 3: seu collector está recebendo dados?

### Ative o debug logging do collector

**Atualize a configuração do collector:**
```yaml
service:
  telemetry:
    logs:
      level: debug
      
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  # Add debug processor to see data flow
  debug:
    verbosity: detailed

exporters:
  # Keep your existing exporters
  logging:
    loglevel: debug

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [debug]  # Add debug processor
      exporters: [logging]  # Add logging exporter temporarily
```

### Confira os logs do collector

**Inicie o collector e observe os logs:**
```bash
./otelcol --config=config.yaml

# Look for these messages:
✅ "Trace received" - Data is reaching collector
✅ "Exporting traces" - Data is being sent to backend
❌ "Connection refused" - Backend unreachable
❌ "Authentication failed" - Credentials issue
```

### Teste o collector diretamente

**Envie dados de teste para o collector:**
```bash
curl -X POST http://localhost:4318/v1/traces \
  -H "Content-Type: application/json" \
  -d '{
    "resourceSpans": [{
      "resource": {
        "attributes": [{
          "key": "service.name",
          "value": {"stringValue": "test-service"}
        }]
      },
      "scopeSpans": [{
        "spans": [{
          "traceId": "12345678901234567890123456789012",
          "spanId": "1234567890123456",
          "name": "test-span",
          "startTimeUnixNano": "1640995200000000000",
          "endTimeUnixNano": "1640995201000000000"
        }]
      }]
    }]
  }'
```

## Passo 4: seu backend está recebendo dados?

### Verifique a conectividade do backend

**Teste o endpoint do backend:**
```bash
# For Jaeger
curl http://localhost:16686/api/traces?service=test-service

# For Zipkin  
curl http://localhost:9411/api/v2/traces

# For vendor backends, check their health endpoints
```

### Confirme a autenticação

**Problemas comuns de autenticação:**
```yaml
exporters:
  otlp:
    endpoint: https://api.vendor.com:443
    headers:
      authorization: "Bearer ${API_KEY}"  # Check env var is set
      
  jaeger:
    endpoint: http://jaeger:14250
    tls:
      insecure: true  # For local development only
```

### Confira os logs do backend

**Procure erros de ingestão nos logs do seu backend:**
- Falhas de autenticação
- Rate limiting
- Problemas de formato de dados
- Problemas de armazenamento

## Cenários comuns de troubleshooting

### Cenário 1: "Eu vejo spans no console, mas não no Jaeger"
**Causa provável:** problema de configuração do collector ou do exporter.
**Correção rápida:** adicione o logging exporter na configuração do collector e verifique os logs em busca de erros de exportação.

### Cenário 2: "Auto-instrumentação não está funcionando"
**Causa provável:** instrumentação não carregada ou biblioteca não suportada.
**Correção rápida:** ative `OTEL_LOG_LEVEL=debug` e confirme que a instrumentação carrega antes do código da aplicação.

### Cenário 3: "Os dados aparecem de forma intermitente"
**Causa provável:** sampling, batching ou limites de recursos.
**Correção rápida:** defina o sampler como `AlwaysOnSampler` temporariamente e verifique a configuração do batch processor.

### Cenário 4: "Atributos de alta cardinalidade causando problemas"
**Causa provável:** valores de atributos únicos demais sobrecarregando o sistema.
**Correção rápida:** procure atributos com IDs de usuário, timestamps ou UUIDs e use processors para filtrá-los.

## Prevenção: monitorando o seu monitoramento

**Configure health checks para o seu pipeline de telemetry:**

```yaml
# Collector health check
receivers:
  prometheus:
    config:
      scrape_configs:
        - job_name: 'otel-collector'
          static_configs:
            - targets: ['localhost:8888']

# Monitor key metrics:
# - otelcol_receiver_accepted_spans
# - otelcol_exporter_sent_spans  
# - otelcol_processor_dropped_spans
```


## O que eu levo para o Dia 24

**Telemetry ausente geralmente é um problema de configuração ou conectividade, não um problema de código. Faça debug sistematicamente em cada etapa do pipeline: application → SDK → collector → backend.**

A abordagem de debug:
1. **Verifique cada etapa de forma independente** usando debug logging e dados de teste
2. **Use exporters de debug temporários** para ver o fluxo dos dados
3. **Teste a conectividade** em cada fronteira de rede
4. **Monitore o monitoramento** para pegar problemas cedo

Amanhã vamos aprender sobre **debugging de distributed traces** para encontrar spans perdidos e context propagation quebrada entre os limites dos serviços.

---

**Dica de debug:** sempre mantenha uma "configuração de debug" pronta, incluindo console exporters, debug logging e AlwaysOn sampling. Isso permite isolar problemas rapidamente sem precisar mexer nas configurações de produção.
