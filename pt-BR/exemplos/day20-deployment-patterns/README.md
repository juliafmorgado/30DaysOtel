# Dia 20: Exemplos Modernos de Deployment e Escalabilidade

Este diretório contém exemplos de deploy de OpenTelemetry Collectors usando batching moderno do lado do exporter para uma confiabilidade melhor.

> **Abordagem Moderna**: Esses exemplos usam batching do lado do exporter com armazenamento persistente em vez de processors de batch, seguindo as melhores práticas atuais do OpenTelemetry ([issue #8122 no GitHub](https://github.com/open-telemetry/opentelemetry-collector/issues/8122)).

## Visão Geral dos Arquivos

- `agent-config.yaml` - Configuração simples de agent
- `gateway-config.yaml` - Configuração básica de gateway
- `docker-compose-agent.yml` - Padrão agent com Docker Compose
- `docker-compose-gateway.yml` - Padrão gateway com Docker Compose
- `docker-compose-scaling.yml` - Escalabilidade básica com limites de recursos

## Exemplo do Padrão Agent

**Quando usar:** Aplicação única, setup simples, começando agora

### Rodando o Padrão Agent

```bash
# 1. Start the agent setup
docker-compose -f docker-compose-agent.yml up

# 2. Your app sends traces to the collector
# 3. Collector forwards traces to Jaeger
# 4. View traces at http://localhost:16686
```

**O que acontece:**
```
Your App → Collector (same host) → Jaeger
```

**Benefícios:**
- Setup simples
- Rápido (sem delays de rede)
- Fácil de debugar

## Exemplo do Padrão Gateway

**Quando usar:** Múltiplas aplicações, controle centralizado

### Rodando o Padrão Gateway

```bash
# 1. Start the gateway setup
docker-compose -f docker-compose-gateway.yml up

# 2. Multiple apps send traces to the same collector
# 3. Gateway collector processes all data
# 4. View traces at http://localhost:16686
```

**O que acontece:**
```
App 1 ──┐
        ├──→ Gateway Collector → Jaeger
App 2 ──┘
```

**Benefícios:**
- Configuração centralizada
- Processamento avançado
- Várias aplicações, um único collector

## Exemplo Básico de Escalabilidade

**Quando usar:** Precisa controlar o uso de recursos

### Rodando com Limites de Recursos

```bash
# 1. Start with resource limits
docker-compose -f docker-compose-scaling.yml up

# 2. Monitor resource usage
docker stats

# 3. Check collector metrics
curl http://localhost:8888/metrics
```

**O que isso evita:**
- Collector consumindo memória demais
- Picos de CPU derrubando seu sistema
- Falta de recursos para outras aplicações

## Arquivos de Configuração

### Config do Agent (Abordagem Moderna)
```yaml
# agent-config.yaml - Modern exporter with built-in batching
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318

processors: []  # No batch processor needed

exporters:
  otlp:
    endpoint: http://jaeger:4317
    # Built-in batching and reliability
    sending_queue:
      enabled: true
      queue_size: 512
      persistent_storage_enabled: true  # Survives crashes
    retry_on_failure:
      enabled: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: []  # Clean and simple
      exporters: [otlp]
```

### Config do Gateway (Avançado com Confiabilidade)
```yaml
# gateway-config.yaml - Advanced processing with modern exporters
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318

processors:
  attributes:
    actions:
      - key: deployment.environment
        value: production
        action: insert

exporters:
  otlp:
    endpoint: http://jaeger:4317
    sending_queue:
      enabled: true
      queue_size: 2048
      persistent_storage_enabled: true
    retry_on_failure:
      enabled: true
      max_elapsed_time: 300s

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [attributes]  # No batch processor
      exporters: [otlp]
```

## Principais Benefícios da Abordagem Moderna

**Segurança dos Dados:**
- **Armazenamento persistente** sobrevive a crashes do Collector
- **100% de recuperação de dados** depois de restarts
- **Nenhuma perda de dados** durante problemas de rede

**Configuração Simplificada:**
- **Não precisa de processor de batch** - os exporters cuidam de tudo
- **Lógica de retry embutida** e gerenciamento de queue
- **Melhor performance** com a mesma funcionalidade

**Pronto para Produção:**
- **Backpressure inteligente**
- **Políticas de retry configuráveis**
- **Queues persistentes** eficientes em memória

## Testando Seu Setup

### Enviando Dados de Teste

```bash
# Send a simple test trace
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

### Conferindo os Resultados

1. **Jaeger UI:** http://localhost:16686 (visualizar traces)
2. **Métricas do collector:** http://localhost:8888/metrics (verificação de saúde)
3. **Logs do Docker:** `docker-compose logs collector` (debugar problemas)

## Problemas Comuns & Soluções

**Erros de "Connection refused":**
- Confira se todos os serviços estão rodando: `docker-compose ps`
- Verifique se as portas estão disponíveis: `netstat -tulpn | grep 4318`

**"Nenhum trace aparecendo":**
- Confira os logs do collector: `docker-compose logs collector`
- Verifique se sua aplicação está enviando para o endpoint certo
- Teste com o comando curl acima

**"Uso alto de memória":**
- Use o exemplo de escalabilidade com limites de recursos
- Confira as métricas do collector para o tamanho das queues
- Reduza o tamanho dos batches na configuração

## Próximos Passos

Depois de testar esses exemplos:
1. **Modifique as configurações** para se adequar às suas necessidades
2. **Experimente backends diferentes** (troque o Jaeger por outros)
3. **Adicione mais processamento** (filtros, transformações)
4. **Escale** quando precisar de mais capacidade

## Guia Rápido de Decisão

**Escolha o Padrão Agent quando:**
- Você tem uma aplicação só
- Você quer o setup mais simples possível
- Baixa latência é importante

**Escolha o Padrão Gateway quando:**
- Você tem várias aplicações
- Você quer controle centralizado
- Você precisa de processamento avançado

**Adicione Limites de Recursos quando:**
- Estiver rodando em produção
- Estiver compartilhando servidores com outras aplicações
- Quiser evitar problemas de recursos
