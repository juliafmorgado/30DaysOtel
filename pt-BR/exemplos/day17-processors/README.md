# Dia 17 - Exemplos de Processors

Este diretório contém configurações de exemplo para diferentes processors do OpenTelemetry Collector.

> **Nota Importante**: Esses exemplos incluem configurações de batch processor para fins educacionais. Porém, o OpenTelemetry está movendo a funcionalidade de batching para os exporters, buscando mais confiabilidade ([issue #8122 no GitHub](https://github.com/open-telemetry/opentelemetry-collector/issues/8122), [#13582](https://github.com/open-telemetry/opentelemetry-collector/issues/13582)). Em produção, prefira exporters com batching integrado e armazenamento persistente.

## Arquivos

- `basic-processors.yaml` - Processors essenciais que todo deployment precisa
- `cost-optimization.yaml` - Filtering e sampling para reduzir custos
- `business-context.yaml` - Adicionando lógica de negócio e contexto à telemetry

## Entendendo os Processors

Os processors transformam os dados de telemetry conforme eles passam pelo pipeline do Collector:

```
Receivers → Processors → Exporters
              ↓
        Transform, filter, enhance
```

## Executando os Exemplos

### Pré-requisitos

1. **Instale o OpenTelemetry Collector:**
   ```bash
   curl -L -o otelcol https://github.com/open-telemetry/opentelemetry-collector-releases/releases/latest/download/otelcol_linux_amd64
   chmod +x otelcol
   ```

### Executando Cada Exemplo

**1. Processors Básicos:**
```bash
./otelcol --config=basic-processors.yaml
```

Isso demonstra:
- Batch processor para exportação eficiente (não é mais recomendado)
- Attributes processor para adicionar contexto
- Filter processor para remover ruído

**2. Otimização de Custos:**
```bash
./otelcol --config=cost-optimization.yaml
```

Isso mostra como:
- Filtrar ruído caro (health checks, debug logs)
- Fazer sampling de endpoints de alto volume
- Usar batching eficiente

**3. Contexto de Negócio:**
```bash
./otelcol --config=business-context.yaml
```

Isso demonstra:
- Adicionar metadados de negócio
- Transformar dados técnicos em metrics de negócio
- Categorização e ownership de serviços

## Testando os Processors

### Enviando Dados de Teste

Você pode testar essas configurações enviando dados de telemetry de exemplo:

**Usando curl (para HTTP):**
```bash
# Send a test trace
curl -X POST http://localhost:4318/v1/traces \
  -H "Content-Type: application/json" \
  -d '{
    "resourceSpans": [{
      "resource": {
        "attributes": [{
          "key": "service.name",
          "value": {"stringValue": "payment-service"}
        }]
      },
      "scopeSpans": [{
        "spans": [{
          "traceId": "12345678901234567890123456789012",
          "spanId": "1234567890123456",
          "name": "GET /health",
          "startTimeUnixNano": "1642680000000000000",
          "endTimeUnixNano": "1642680001000000000",
          "attributes": [{
            "key": "http.response.status_code",
            "value": {"intValue": "200"}
          }]
        }]
      }]
    }]
  }'
```

### O Que Você Vai Ver

Ao executar esses exemplos, você vai ver outputs diferentes dependendo dos processors:

**Output dos Processors Básicos:**
```
2024-01-17T10:30:45.123Z info Span: GET /health
2024-01-17T10:30:45.124Z info   environment: production
2024-01-17T10:30:45.125Z info   team: platform
```

**Output da Otimização de Custos:**
```
2024-01-17T10:30:45.123Z info Filtered out health check span
2024-01-17T10:30:45.124Z info Keeping 1 out of 10 search requests
```

**Output do Contexto de Negócio:**
```
2024-01-17T10:30:45.123Z info Span: payment_processing
2024-01-17T10:30:45.124Z info   business.critical: true
2024-01-17T10:30:45.125Z info   team.oncall: platform-team
2024-01-17T10:30:45.126Z info   business.impact: high
```

## Principais Conceitos Demonstrados

### 1. Ordem dos Processors
Os processors rodam na ordem em que são listados. Os exemplos mostram a ordem ideal:
1. Resource processors (adicionam contexto de serviço)
2. Filter processors (removem dados indesejados logo no início)
3. Attributes/Transform processors (adicionam contexto aos dados restantes)
4. Batch processors (agrupam para exportação eficiente)

### 2. Processamento Condicional
Muitos processors suportam condições:
```yaml
include:
  match_type: strict
  services: ["payment-service"]
```

### 3. Otimização de Performance
- Filtre cedo para reduzir a carga de processamento
- Faça batching de forma eficiente para reduzir chamadas de rede
- Use timeouts e tamanhos de batch apropriados

## Solução de Problemas

**Nenhum dado aparecendo:**
- Verifique as condições do processor (filtros include/exclude)
- Verifique se os nomes e valores dos atributos correspondem aos seus dados
- Use o logging exporter para ver o que está sendo processado

**Alto uso de memória:**
- Reduza os tamanhos de batch
- Adicione filtros mais agressivos
- Verifique se há loops de processor ou transforms ineficientes

**Processamento lento:**
- Mova os filter processors para mais cedo no pipeline
- Reduza operações complexas de transform
- Otimize as configurações de batch

## Próximos Passos

Depois de testar esses exemplos:
1. Modifique os processors para corresponder à sua lógica de negócio
2. Experimente diferentes condições de filtro
3. Tente combinar processors em ordens diferentes
4. Avance para o Dia 18 para aprender sobre exporters!

## Dicas Avançadas

### Depurando Processors
Adicione um logging exporter para ver o que cada processor faz:
```yaml
exporters:
  logging/debug:
    loglevel: debug

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [your-processors]
      exporters: [logging/debug, your-real-exporter]
```

### Monitoramento de Performance
Habilite as metrics do Collector para monitorar a performance dos processors:
```yaml
service:
  telemetry:
    metrics:
      address: 0.0.0.0:8888
```

Depois, verifique: `curl http://localhost:8888/metrics | grep processor`
