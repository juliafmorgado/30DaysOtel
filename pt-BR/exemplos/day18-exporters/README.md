# Dia 18 - Exemplos de Exporters

Este diretório contém exemplos pensados para iniciantes sobre como configurar exporters do OpenTelemetry Collector.

## Arquivos

- `basic-jaeger.yaml` - Envia traces para o Jaeger
- `basic-prometheus.yaml` - Envia metrics para o Prometheus
- `basic-loki.yaml` - Envia logs para o Loki
- `simple-multi.yaml` - Envia cada tipo de telemetry para o backend especializado
- `debug-exporters.yaml` - Usa o exporter de logging para debugar o que está sendo enviado

## Entendendo os Exporters

Os exporters são a última etapa do pipeline do Collector - eles enviam os seus dados de telemetry já processados para os backends de observabilidade:

```
Sua App → Collector → Exporter → Backend (Jaeger, Prometheus, etc.)
```

**Conceito-chave:** Backends diferentes esperam formatos diferentes, então você precisa do exporter certo para cada tipo de backend.

## Rodando os Exemplos

### Pré-requisitos

1. **Instale o OpenTelemetry Collector:**
   ```bash
   curl -L -o otelcol https://github.com/open-telemetry/opentelemetry-collector-releases/releases/latest/download/otelcol_linux_amd64
   chmod +x otelcol
   ```

2. **Suba os backends (usando Docker):**
   ```bash
   # Sobe o Jaeger
   docker run -d --name jaeger \
     -p 16686:16686 -p 14250:14250 \
     jaegertracing/all-in-one:latest
   
   # Sobe o Prometheus
   docker run -d --name prometheus \
     -p 9090:9090 \
     prom/prometheus:latest
   ```

### Exemplo 1: Jaeger Básico (Traces)

```bash
./otelcol --config=basic-jaeger.yaml
```

**O que isso faz:**
- Recebe traces das suas apps na porta 4318
- Envia os traces para o Jaeger
- Veja os traces em http://localhost:16686

### Exemplo 2: Prometheus Básico (Metrics)

```bash
./otelcol --config=basic-prometheus.yaml
```

**O que isso faz:**
- Recebe metrics das suas apps
- Expõe as metrics para o Prometheus fazer scrape na porta 8889
- Configure o Prometheus para fazer scrape em http://localhost:8889/metrics

### Exemplo 3: Debugando o que Está Sendo Enviado

```bash
./otelcol --config=debug-exporters.yaml
```

**O que isso faz:**
- Mostra exatamente quais dados estão sendo exportados
- Imprime a telemetry no console E envia para o Jaeger
- Ótimo para troubleshooting!

### Testando a Sua Configuração

**Envie traces de teste:**
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
          "startTimeUnixNano": "1642680000000000000",
          "endTimeUnixNano": "1642680001000000000"
        }]
      }]
    }]
  }'
```

**Confira os resultados:**
- **Jaeger:** Acesse http://localhost:16686 para ver os traces
- **Prometheus:** Acesse http://localhost:8889/metrics para ver as metrics
- **Console:** Confira a saída do terminal para os logs de debug

## Conceitos-Chave Demonstrados

### 1. Exporters Diferentes para Backends Diferentes
Cada backend espera um formato específico:
- **Exporter do Jaeger** → Converte traces do OpenTelemetry para o formato do Jaeger
- **Exporter do Prometheus** → Expõe metrics no formato do Prometheus
- **Exporter OTLP** → Envia os dados no formato nativo do OpenTelemetry

### 2. Configuração Básica
Uma configuração simples de exporter com os ajustes essenciais:
```yaml
exporters:
  jaeger:
    endpoint: jaeger:14250    # Para onde enviar os dados
    tls:
      insecure: true          # Sem criptografia (só para dev)
```

### 3. Debugando com o Exporter de Logging
Veja exatamente o que está sendo exportado:
```yaml
exporters:
  logging:
    loglevel: debug           # Imprime informações detalhadas
  jaeger:
    endpoint: jaeger:14250

service:
  pipelines:
    traces:
      exporters: [logging, jaeger]  # Envia para os dois
```

## Problemas Comuns e Soluções

**Erros de "Connection refused":**
- Confira se o seu backend (Jaeger, Prometheus) está rodando
- Verifique a URL do endpoint e o número da porta
- Confira as configurações de firewall

**"Nenhum dado aparecendo" no backend:**
- Use a configuração de debug para ver se os dados estão sendo enviados
- Confira se a sua app está enviando dados para o Collector
- Verifique se a configuração do exporter bate com a configuração do seu backend

**Erros de "TLS" em produção:**
- Defina `insecure: false` para produção
- Adicione a configuração de certificado adequada
- Use endpoints HTTPS para backends na nuvem

## Próximos Passos

Depois de testar esses exemplos:
1. Configure exporters para os seus backends de verdade
2. Experimente o simple-multi.yaml para enviar tipos diferentes de telemetry para backends especializados
3. Use o debug-exporters.yaml sempre que precisar fazer troubleshooting
4. Siga para o Dia 19 para aprender sobre transformações OTTL!
