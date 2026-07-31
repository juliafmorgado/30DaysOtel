# Dia 18 – Exporters Modernos: Batching e Confiabilidade Nativos

Ontem você aprendeu como os processors transformam os dados no pipeline. Hoje vamos explorar os **exporters modernos** e as capacidades nativas que eles trazem, que tornam o batch processor desnecessário.

> **Exemplos práticos:** As configurações completas estão disponíveis em [`examples/day18-exporters/`](../examples/day18-exporters/)

---

## O Que Já Sabemos

Lá no [Dia 15](./dia15.md), vimos que os exporters são o **lado de saída** do pipeline. E no [Dia 17](./dia17.md), aprendemos que o OpenTelemetry está movendo a funcionalidade de batching dos processors para os exporters, buscando mais confiabilidade.

```
Receivers → Processors → Exporters
                           ↓
                    "Enviar dados de forma confiável para os backends"
```

---

## A Evolução: Do Batch Processor ao Exporter Helper

### O Jeito Antigo (Dia 17)
```yaml
processors:
  batch:  # Data lost if Collector crashes
    timeout: 1s
    send_batch_size: 1024

exporters:
  otlp:
    endpoint: https://api.backend.com
```

### O Jeito Novo (Hoje)
```yaml
processors: []  # No batch processor needed!

exporters:
  otlp:
    endpoint: https://api.backend.com
    # Built-in batching with persistent storage
    sending_queue:
      enabled: true
      queue_size: 1000
      persistent_storage_enabled: true
    retry_on_failure:
      enabled: true
```

**Diferença chave:** os exporters modernos cuidam do batching internamente, com **persistent storage** que sobrevive a crashes.

---

## Exporter Helper: A Base de Tudo

Todos os exporters modernos são construídos em cima do **exporter helper** ([issue #8122 no GitHub](https://github.com/open-telemetry/opentelemetry-collector/issues/8122)), que oferece:

### 1. **Batching Nativo**
- Agrupamento automático dos dados telemétricos
- Tamanhos de batch e timeouts configuráveis
- Não precisa de um batch processor separado

### 2. **Persistent Storage**
- Os dados sobrevivem a crashes do Collector
- Usa um write-ahead log (WAL) baseado em disco
- Recuperação de 100% dos dados após reinicializações

### 3. **Lógica de Retry Inteligente**
- Exponential backoff para requisições que falharem
- Políticas de retry configuráveis
- Lida com quedas temporárias do backend

### 4. **Gerenciamento de Queue**
- Filas em memória e persistentes
- Tratamento de backpressure
- Proteção de memória

---

## Configuração Moderna do Exporter OTLP

### Configuração Básica e Confiável

```yaml
exporters:
  otlp:
    endpoint: https://api.dash0.com:4317 #WHERE to send data - the URL and port of the backend service
    headers:
      authorization: "Bearer ${env:DASH0_TOKEN}" #Adds authentication to each request.
    
    # Built-in batching (replaces batch processor)
    sending_queue:
      enabled: true #Turns on the exporter's internal queue system that collects telemetry data before sending
      queue_size: 1000 #Sets the maximum number of items (spans/metrics/logs) the queue can hold. When it reaches 1000 items, it sends a batch
      persistent_storage_enabled: true  #Saves queued data to disk so if the Collector crashes, the data survives and gets sent after restart
    
    # Intelligent retry logic
    retry_on_failure:
      enabled: true #If sending fails (network issue, backend down), automatically retry instead of losing data
      initial_interval: 1s #Wait 1 second before the first retry attempt
      max_interval: 30s #Never wait more than 30 seconds between retry attempts (prevents infinite waiting)
      max_elapsed_time: 300s #Give up after trying for 5 minutes total
    
    # Performance optimization
    compression: gzip #Compresses data before sending to reduce bandwidth usage
    timeout: 30s #If a single send request takes longer than 30 seconds, give up and try again
```

### Configuração Avançada de Confiabilidade

```yaml
exporters:
  otlp/production:
    endpoint: https://api.backend.com:4317
    headers:
      authorization: "Bearer ${env:API_TOKEN}"
    
    # Advanced queue configuration
    sending_queue:
      enabled: true
      queue_size: 5000
      persistent_storage_enabled: true
      storage_directory: "/var/lib/otelcol/storage"  # Custom storage location
      
    # Sophisticated retry policy
    retry_on_failure:
      enabled: true
      initial_interval: 1s
      randomization_factor: 0.5  # Add jitter to prevent thundering herd
      multiplier: 1.5
      max_interval: 30s
      max_elapsed_time: 300s
    
    # Connection management
    timeout: 30s
    compression: gzip
    keepalive:
      time: 30s
      timeout: 5s
      permit_without_stream: true
```

---

## Exporters Especializados com Capacidades Modernas

### Exporter Prometheus (Metrics)

```yaml
exporters:
  prometheus:
    endpoint: "0.0.0.0:8889"
    namespace: "myapp"
    const_labels:
      environment: "production"
      cluster: "us-east-1"
    
    # Modern reliability features
    metric_expiration: 180m
    resource_to_telemetry_conversion:
      enabled: true
    enable_open_metrics: true
    
    # Built-in queue management
    sending_queue:
      enabled: true
      queue_size: 1000
```

### Exporter de Arquivo com Persistência

```yaml
exporters:
  file/backup:
    path: /var/log/otel/traces.jsonl
    rotation:
      max_megabytes: 100
      max_days: 7
      max_backups: 3
    
    # Reliability features
    sending_queue:
      enabled: true
      queue_size: 5000
      persistent_storage_enabled: true
    
    # Ensure data reaches disk
    flush_interval: 1s
```

---

## Comparando as Abordagens Antiga e Nova

### Comparação de Confiabilidade

| Aspecto | Batch Processor | Exporters Modernos |
|--------|----------------|------------------|
| **Perda de Dados** | 100% durante crashes | 0% com persistent storage |
| **Recuperação** | Nenhuma | Recuperação total após reinicialização |
| **Armazenamento** | Só em memória | Baseado em disco (WAL) |
| **Configuração** | Componente separado | Nativo |
| **Manutenção** | Complexidade extra | Simplificada |

### Comparação de Performance

```yaml
# Old approach: Separate batching
processors:
  batch:
    timeout: 1s
    send_batch_size: 1024
exporters:
  otlp:
    endpoint: https://api.backend.com

# New approach: Integrated batching
processors: []  # Cleaner!
exporters:
  otlp:
    endpoint: https://api.backend.com
    sending_queue:
      enabled: true
      queue_size: 1024  # Same performance, better reliability
      persistent_storage_enabled: true
```

---

## Estratégia de Migração

### Passo 1: Habilite as Queues do Exporter
```yaml
exporters:
  otlp:
    endpoint: https://api.backend.com
    sending_queue:
      enabled: true
      queue_size: 1000
```

### Passo 2: Adicione o Persistent Storage
```yaml
exporters:
  otlp:
    endpoint: https://api.backend.com
    sending_queue:
      enabled: true
      queue_size: 1000
      persistent_storage_enabled: true  # Add this
```

### Passo 3: Remova o Batch Processor
```yaml
processors: []  # Remove batch processor
# OR
processors: [attributes, filter]  # Keep other processors
```

---

## Monitorando Exporters Modernos

### Métricas do Exporter

Habilite o self-monitoring do Collector para acompanhar a performance do exporter:

```yaml
service:
  telemetry:
    metrics:
      address: 0.0.0.0:8888
      level: detailed
```

**Métricas chave para acompanhar:**
- `otelcol_exporter_queue_size` - Profundidade atual da queue
- `otelcol_exporter_queue_capacity` - Tamanho máximo da queue
- `otelcol_exporter_sent_spans` - Dados enviados com sucesso
- `otelcol_exporter_send_failed_spans` - Envios que falharam
- `otelcol_exporter_enqueue_failed_spans` - Overflow da queue

### Configuração para Debug

```yaml
exporters:
  logging/debug:
    loglevel: debug
  
  otlp/production:
    endpoint: https://api.backend.com
    sending_queue:
      enabled: true
      persistent_storage_enabled: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: []
      exporters: [logging/debug, otlp/production]  # See what's being sent
```

---

## Boas Práticas para Exporters Modernos

### 1. **Sempre Habilite o Persistent Storage**
```yaml
sending_queue:
  enabled: true
  persistent_storage_enabled: true  # Essential for reliability
```

### 2. **Configure Tamanhos de Queue Adequados**
```yaml
sending_queue:
  queue_size: 1000  # Start here, adjust based on traffic
```

### 3. **Use Políticas de Retry Inteligentes**
```yaml
retry_on_failure:
  enabled: true
  initial_interval: 1s
  max_elapsed_time: 300s  # Don't retry forever
```

### 4. **Monitore a Saúde da Queue**
- Acompanhe as métricas de profundidade da queue
- Configure alertas para overflow da queue
- Monitore as taxas de retry

### 5. **Teste a Recuperação de Crashes**
- Simule crashes do Collector
- Verifique a recuperação dos dados
- Valide a persistência da queue

---

## O Que Vamos Levar Para o Dia 19

Hoje você aprendeu sobre os **exporters modernos** e os recursos nativos de confiabilidade que eles trazem:

**Conceitos chave:**
- O **exporter helper** oferece batching, persistência e lógica de retry nativos
- O **persistent storage** elimina a perda de dados durante crashes
- **Não precisa mais de batch processor** - os exporters cuidam de tudo
- **Configuração simplificada** com mais confiabilidade

**Caminho de migração:**
- Habilite as queues do exporter e o persistent storage
- Remova os batch processors
- Monitore as métricas do exporter

**Amanhã (Dia 19)** vamos aprender sobre **OTTL (OpenTelemetry Transformation Language)** para transformações de dados avançadas, que funcionam perfeitamente com os exporters modernos.

Nos vemos no Dia 19!
