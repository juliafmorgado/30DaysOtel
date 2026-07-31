# Dia 16 – Receivers: Como o Collector Recebe Dados

Ontem aprendemos a visão geral da arquitetura do Collector. Hoje vamos entender melhor os **receivers**, os componentes que trazem os dados de telemetry para dentro do Collector a partir de várias fontes.

> **Exemplo prático:** As configurações completas estão disponíveis em [`examples/day16-receivers/`](../examples/day16-receivers/)

---

## O Que Já Sabemos

No [Dia 15](./dia15.md), aprendemos que os receivers são o **lado de entrada** do pipeline do Collector. Hoje vamos aprender como configurar os diferentes tipos de receiver e entender quando usar cada um.

```
Receivers → Processors → Exporters
    ↓
  "Pega dados de apps, arquivos, endpoints"
```

---

## As Três Principais Categorias de Receiver

Um receiver é um "ponto de escuta" ou "coletor" de telemetry.

### 1. Push Receivers (as aplicações enviam dados pro Collector)
- **OTLP Receiver** - protocolo nativo do OpenTelemetry
- **Jaeger Receiver** - formato legado do Jaeger
- **Zipkin Receiver** - formato legado do Zipkin

### 2. Pull Receivers (o Collector busca os dados)
- **Prometheus Receiver** - faz scrape de endpoints de metrics
- **Filelog Receiver** - lê arquivos de log
- **Host Metrics Receiver** - metrics do sistema

### 3. Receivers Especializados
- **Kafka Receiver** - dados de fila de mensagens
- **OTLP/HTTP Receiver** - telemetry baseada em HTTP

---

## OTLP Receiver: O Mais Importante

O receiver OTLP aceita dados vindos dos SDKs do OpenTelemetry. Esse é o que a gente vai usar com mais frequência.

> O receiver `otlp` consegue escutar em vários protocolos ao mesmo tempo (gRPC e HTTP).
> Continua sendo **uma única instância de receiver**, que só suporta várias "formas de falar".

### Configuração Básica

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318
```

**O que isso faz:**
- Escuta na porta 4317 para conexões gRPC
- Escuta na porta 4318 para conexões HTTP
- Aceita traces, metrics e logs de qualquer SDK do OpenTelemetry

---

## Prometheus Receiver: Fazendo Scrape de Metrics

O receiver Prometheus puxa metrics de endpoints compatíveis com Prometheus.

> O **receiver** Prometheus faz scrape dos endpoints `/metrics` de *outros serviços*.
> Ele não faz scrape do próprio Collector, a menos que você aponte explicitamente para ele.

### Scrape Básico com Prometheus

```yaml
receivers:
  prometheus:
    config:
      scrape_configs:
        - job_name: 'my-app'
          scrape_interval: 30s
          static_configs:
            - targets: ['localhost:8080']
```

### Múltiplas Aplicações

```yaml
receivers:
  prometheus:
    config:
      scrape_configs:
        - job_name: 'web-app'
          scrape_interval: 15s
          static_configs:
            - targets: ['web-app:8080']
          
        - job_name: 'api-server'
          scrape_interval: 30s
          static_configs:
            - targets: ['api-server:9090']
          
        - job_name: 'database'
          scrape_interval: 60s
          static_configs:
            - targets: ['postgres-exporter:9187']
```

**Casos de uso:**
- Aplicações legadas com metrics no formato Prometheus
- Serviços de terceiros (bancos de dados, load balancers)
- Migração gradual do Prometheus para o OpenTelemetry

---

## Filelog Receiver: Lendo Arquivos de Log

O receiver filelog lê logs de arquivos e converte para o formato do OpenTelemetry.

> O filelog normalmente faz "tail" dos arquivos (fica lendo as linhas novas conforme elas chegam). Garanta que o usuário do Collector tenha permissão de leitura nesses arquivos.

### Leitura Básica de Arquivos

```yaml
receivers:
  filelog:
    include: [/var/log/app/*.log]
    exclude: [/var/log/app/debug.log]
```

**O que isso faz:**
- Monitora todos os arquivos .log em `/var/log/app/`
- Ignora o `debug.log` (excluído)
- Lê as linhas novas conforme elas são escritas (faz tail dos arquivos)
- Envia as linhas de log em formato bruto para o pipeline do Collector

---

## Host Metrics Receiver: Monitoramento de Sistema

Coleta metrics de sistema como CPU, memória e uso de disco.

```yaml
receivers:
  hostmetrics:
    collection_interval: 30s
    scrapers:
      cpu:
        metrics:
          system.cpu.utilization:
            enabled: true
      memory:
        metrics:
          system.memory.utilization:
            enabled: true
      disk:
        metrics:
          system.disk.io:
            enabled: true
      network:
        metrics:
          system.network.io:
            enabled: true
```

**Perfeito para:**
- Monitoramento de infraestrutura
- Monitoramento de container/VM
- Metrics básicos de sistema (baseline)

---

## Múltiplos Receivers em um Único Pipeline

Podemos usar vários receivers para coletar dados de fontes diferentes:

```yaml
receivers:
  # Apps do OpenTelemetry
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318
  
  # Apps legados do Prometheus
  prometheus:
    config:
      scrape_configs:
        - job_name: 'legacy-app'
          static_configs:
            - targets: ['legacy-app:8080']
  
  # Arquivos de log
  filelog:
    include: [/var/log/apps/*.log]
  
  # Metrics de sistema
  hostmetrics:
    collection_interval: 60s
    scrapers:
      cpu: {}
      memory: {}

service:
  pipelines:
    traces:
      receivers: [otlp]  # Só OTLP para traces
      processors: []
      exporters: [jaeger]
    
    metrics:
      receivers: [otlp, prometheus, hostmetrics]  # Múltiplas fontes
      processors: []
      exporters: [prometheus]
    
    logs:
      receivers: [otlp, filelog]  # OTLP + logs de arquivo
      processors: []
      exporters: [loki]
```

---

## Padrões Comuns de Receiver

### Padrão 1: Stack Moderna (Só OTLP)
```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318
```
**Use quando:** todas as aplicações usam SDKs do OpenTelemetry

### Padrão 2: Modo de Migração (OTLP + Legado)
```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
  prometheus:
    config:
      scrape_configs:
        - job_name: 'legacy-apps'
          static_configs:
            - targets: ['app1:8080', 'app2:8080']
```
**Use quando:** você está migrando do Prometheus para o OpenTelemetry

### Padrão 3: Observabilidade Completa (Todas as Fontes)
```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
  prometheus:
    config:
      scrape_configs:
        - job_name: 'infrastructure'
          static_configs:
            - targets: ['node-exporter:9100']
  filelog:
    include: [/var/log/**/*.log]
  hostmetrics:
    collection_interval: 30s
    scrapers:
      cpu: {}
      memory: {}
      disk: {}
```
**Use quando:** você precisa de monitoramento completo em todas as camadas

---

## Troubleshooting de Receivers

### Configuração para Debug

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

exporters:
  logging:
    loglevel: debug  # Veja o que está sendo recebido

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: []
      exporters: [logging]  # Saída de debug
```
---

## O Que Vamos Levar Para o Dia 17

Hoje aprendemos como fazer os dados entrarem **no** Collector:

**Conceitos-chave:**
- **OTLP receiver** para SDKs do OpenTelemetry (o mais importante)
- **Prometheus receiver** para metrics legados
- **Filelog receiver** para arquivos de log já existentes
- **Múltiplos receivers** em um único pipeline para uma coleta de dados completa

**Habilidades práticas:**
- Configurar ajustes básicos e avançados de receiver
- Fazer troubleshooting de problemas comuns em receivers
- Escolher o padrão de receiver certo para o nosso caso de uso

**Amanhã (Dia 17)** vamos aprender como os **Processors** transformam, filtram e enriquecem os dados de telemetry antes deles serem exportados.

Nos vemos no Dia 17!
