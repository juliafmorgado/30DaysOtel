# Dia 20 – Deployment & Scaling: Padrões Modernos de Collector

Ontem aprendemos as transformações do OTTL. Hoje vamos explorar os **padrões de deployment** usando as capacidades modernas de exporter que vimos no [Dia 18](./dia18.md).

Vamos cobrir padrões de deployment E scaling básico, usando a **abordagem de exporter confiável** em vez de processadores de batch.

> **Exemplos modernos:** As configurações de deployment com batching do lado do exporter estão disponíveis em [`examples/day20-deployment-patterns/`](../examples/day20-deployment-patterns/)

---

## A Grande Pergunta: Onde Você Coloca o Collector?

Até agora aprendemos o que o Collector faz, mas onde ele realmente roda? Temos duas opções principais:

**Opção 1: Perto das Nossas Apps (Padrão Agent)**
```
Nossa App → Collector (mesmo servidor) → Backend
```

**Opção 2: Local Centralizado (Padrão Gateway)**  
```
Nossa App → Collector Centralizado → Backend
```

Pense nisso como entrega de correio:
- **Padrão Agent**: Cada casa tem sua própria caixa de correio
- **Padrão Gateway**: Todo mundo deixa a correspondência nos correios centrais

Os dois funcionam, mas para situações diferentes. Vamos explorar quando usar cada um.

---

## Padrão Agent: Collector Roda Junto com a Nossa App

No padrão Agent, rodamos uma instância do Collector bem perto da nossa aplicação (mesmo servidor, mesmo container, ou mesmo pod do Kubernetes).

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Server 1      │    │   Server 2      │    │   Server 3      │
│                 │    │                 │    │                 │
│ App → Collector │    │ App → Collector │    │ App → Collector │
│        ↓        │    │        ↓        │    │        ↓        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 ↓
                         Backend (Jaeger, Dash0 etc.)
```

### Por Que Usar o Padrão Agent?

**Rápido e Simples:**
- Nossa app envia dados para `localhost:4318` (super rápido)
- Sem atrasos de rede entre a app e o Collector
- Se o Collector falhar, só uma app é afetada

**Fácil de Começar:**
- Um Collector por aplicação
- Configuração simples
- Fácil de debugar problemas

### Exemplo Simples de Agent

Aqui está uma configuração básica de Agent usando Docker:

```yaml
# docker-compose.yml
version: '3.8'
services:
  # Your application
  my-app:
    image: my-node-app #Runs our Node.js app that generates telemetry data
    environment:
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://collector:4318 #Points to the Collector via http://collector:4318 (HTTP endpoint)
    depends_on:
      - collector #Waits for Collector to start first (depends_on)

  # Collector running as agent (close to app)
  collector:
    image: otel/opentelemetry-collector-contrib:latest #Runs the Collector using the official Docker image
    command: ["--config=/etc/otel-collector-config.yaml"] #Loads configuration from our local agent-config.yaml file
    volumes:
      - ./agent-config.yaml:/etc/otel-collector-config.yaml
    ports: #Exposes both ports for receiving telemetry (gRPC and HTTP)
      - "4317:4317"   # gRPC
      - "4318:4318"   # HTTP
```

**Configuração do agent (abordagem moderna):**
```yaml
# agent-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  # Simple processing - no batch processor needed
  attributes:
    actions:
      - key: deployment.environment
        value: production
        action: insert

exporters:
  otlp:
    endpoint: http://jaeger:4317
    tls:
      insecure: true
    # Modern exporter with built-in batching and reliability
    sending_queue:
      enabled: true
      queue_size: 1000
      persistent_storage_enabled: true
    retry_on_failure:
      enabled: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [attributes]  # No batch processor needed
      exporters: [otlp]
```

> **Veja o exemplo completo:** [`agent-config.yaml`](../examples/day20-deployment-patterns/agent-config.yaml)

---

## Padrão Gateway: Collector Centralizado

No padrão Gateway, rodamos um (ou alguns) Collectors centralizados que recebem telemetry de várias aplicações.

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│    App 1    │  │    App 2    │  │    App 3    │
└─────────────┘  └─────────────┘  └─────────────┘
       │                │                │
       └────────────────┼────────────────┘
                        ↓
              ┌─────────────────┐
              │    Gateway      │
              │   Collector     │
              │  (Centralized)  │
              └─────────────────┘
                        ↓
       ┌────────────────┼────────────────┐
       ↓                ↓                ↓
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Backend A  │  │  Backend B  │  │  Backend C  │
└─────────────┘  └─────────────┘  └─────────────┘
```

### Por Que Usar o Padrão Gateway?

**Controle Centralizado:**
- Muda a configuração em um lugar só
- Todas as apps recebem as atualizações automaticamente
- Mais fácil de gerenciar conforme você cresce

**Processamento Avançado:**
- Transformações complexas (como o OTTL de ontem)
- Envia dados diferentes para backends diferentes
- Análise entre aplicações

**Eficiência de Custo:**
- Um Collector potente em vez de vários pequenos
- Melhor utilização de recursos
- Mais fácil de monitorar e manter

### Exemplo Simples de Gateway

```yaml
# docker-compose.yml
version: '3.8'
services:
  # Two different applications running independently, both send telemetry to the same Collector endpoint
  app1:
    image: my-app-1
    environment:
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://gateway-collector:4318
  
  app2:
    image: my-app-2
    environment:
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://gateway-collector:4318

  # Centralized gateway collector handling telemetry from multiple apps
  gateway-collector:
    image: otel/opentelemetry-collector-contrib:latest
    command: ["--config=/etc/otel-collector-config.yaml"]
    volumes:
      - ./gateway-config.yaml:/etc/otel-collector-config.yaml
    ports:
      - "4317:4317"
      - "4318:4318"
```

**Configuração do gateway (abordagem moderna com confiabilidade):**
```yaml
# gateway-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  # Add environment labels to all data
  attributes:
    actions:
      - key: deployment.environment
        value: production
        action: insert
      - key: collector.type
        value: gateway
        action: insert

exporters:
  # Send traces to Jaeger with modern reliability features
  otlp/jaeger:
    endpoint: http://jaeger:4317
    tls:
      insecure: true
    sending_queue:
      enabled: true
      queue_size: 2000
      persistent_storage_enabled: true
    retry_on_failure:
      enabled: true
      max_elapsed_time: 300s
  
  # Send metrics to Prometheus
  prometheus:
    endpoint: "0.0.0.0:8889"
    namespace: "gateway"
    const_labels:
      environment: "production"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [attributes]  # No batch processor needed
      exporters: [otlp/jaeger]
    
    metrics:
      receivers: [otlp]
      processors: [attributes]
      exporters: [prometheus]
```

> **Veja o exemplo completo:** [`gateway-config.yaml`](../examples/day20-deployment-patterns/gateway-config.yaml)

## Confiabilidade Moderna do Collector (Do Dia 18)

Como vimos no [Dia 18](./dia18.md), os Collectors modernos usam **batching do lado do exporter** em vez de processadores de batch para ter mais confiabilidade:

### Principais Benefícios da Abordagem Moderna

**Segurança dos Dados:**
- **Armazenamento persistente** sobrevive a crashes do Collector
- **100% de recuperação de dados** depois de restarts
- **Nenhum processador de batch necessário** - os exporters cuidam de tudo

**Configuração Simplificada:**
- Menos componentes para configurar
- Lógica de retry e gerenciamento de fila embutidos
- Melhor performance com a mesma funcionalidade

### Moderno vs Tradicional

**Abordagem tradicional (evite em produção):**
```yaml
processors:
  batch:  # Data lost if Collector crashes
    timeout: 1s
    send_batch_size: 1024
exporters:
  otlp:
    endpoint: http://backend:4317
```

**Abordagem moderna (recomendada):**
```yaml
processors: []  # Clean and simple
exporters:
  otlp:
    endpoint: http://backend:4317
    sending_queue:
      enabled: true
      persistent_storage_enabled: true  # Survives crashes!
    retry_on_failure:
      enabled: true
```

Essa abordagem moderna funciona para **os padrões Agent e Gateway** - os benefícios de confiabilidade se aplicam em qualquer um deles.

---

## Quando Usar Qual Padrão?

### Guia Rápido de Decisão

**Use o Padrão Agent quando:**
- Você está começando com OpenTelemetry agora
- Você tem uma ou poucas aplicações
- Você quer a configuração mais simples possível
- Latência baixa é crítica
- Cada app tem requisitos diferentes

**Use o Padrão Gateway quando:**
- Você tem muitas aplicações
- Você quer controle centralizado
- Você precisa de transformações de dados complexas
- Você quer enviar dados para vários backends
- Você quer reduzir a sobrecarga operacional

**Para nossa primeira configuração de OpenTelemetry, é melhor começar com o padrão Agent.** É mais simples e sempre podemos migrar para o Gateway depois.

---

## Scaling Básico: O Que Acontece Quando Precisamos de Mais?

Conforme nossas aplicações crescem, podemos precisar de mais de um Collector. Aqui estão os conceitos básicos:

### Escalando o Padrão Agent

**Problema:** Nossa app gera telemetry demais para um único Collector.

**Solução:** Rodar várias instâncias do Collector e balancear a carga entre elas.

```yaml
# docker-compose.yml with multiple agents
version: '3.8'
services:
  my-app:
    image: my-node-app
    environment:
      # App sends to load balancer (instead of directly to a Collector), which distributes to collectors
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://load-balancer:4318

  # Load balancer (simple nginx) handles distribution
  load-balancer:
    image: nginx
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf #Uses nginx.conf to define load balancing rules
    ports:
      - "4318:4318" #Receives all telemetry from our app on port 4318

  # Two identical Collector instances running the same config, this shares the telemetry load from our app. Both process and export data independently
  collector-1:
    image: otel/opentelemetry-collector-contrib:latest
    volumes:
      - ./agent-config.yaml:/etc/otel-collector-config.yaml

  collector-2:
    image: otel/opentelemetry-collector-contrib:latest
    volumes:
      - ./agent-config.yaml:/etc/otel-collector-config.yaml
```

### Escalando o Padrão Gateway

**Problema:** Nosso Collector centralizado fica sobrecarregado.

**Solução:** Rodar vários Gateway Collectors atrás de um load balancer.

```yaml
# Multiple gateway collectors
version: '3.8'
services:
  # Apps send to load balancer instead of directly to gateways
  app1:
    environment:
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://gateway-lb:4318

  # Load balancer for gateways (single entry point for all telemetry data). Distributes load across multiple gateway Collectors
  gateway-lb:
    image: nginx
    ports:
      - "4318:4318"

  # Multiple gateway instances - 2 identical gateway Collectors with advanced processing
  gateway-1:
    image: otel/opentelemetry-collector-contrib:latest
    volumes:
      - ./gateway-config.yaml:/etc/otel-collector-config.yaml

  gateway-2:
    image: otel/opentelemetry-collector-contrib:latest
    volumes:
      - ./gateway-config.yaml:/etc/otel-collector-config.yaml
```

### Limites de Recursos e Gerenciamento de Memória

Sempre defina limites de recursos para evitar que os Collectors usem memória/CPU demais. Exporters modernos com armazenamento persistente são mais eficientes em memória:

```yaml
# docker-compose.yml
services:
  collector:
    image: otel/opentelemetry-collector-contrib:latest
    deploy:
      resources:
        limits:
          memory: 512M # Never use more than 512MB of RAM
          cpus: '0.5' # Never use more than 50% of one CPU core
        reservations:
          memory: 256M # Always guarantee 256MB of RAM
          cpus: '0.25' # Always guarantee 25% of one CPU core
```

**Exporters modernos ajudam no gerenciamento de memória:**
- **Filas persistentes** usam disco em vez de só memória
- **Retry inteligente** evita acúmulo de memória
- **Tratamento de backpressure** protege contra sobrecarga

---

## O Que Vem Depois?

**Hoje aprendemos conceitos fundamentais.** 
Em produção, vamos encontrar tópicos mais avançados como:
- Deployments no Kubernetes com auto-scaling
- Estratégias avançadas de load balancing  
- Deployments multi-região
- Segurança e autenticação
- Otimização de performance

Mas, por enquanto, temos tudo que precisamos para fazer deployment e escalar Collectors para a maioria dos casos de uso!

---

## O Que Vamos Levar Para o Dia 21

Hoje aprendemos o lado prático do deployment do Collector.

**Amanhã (Dia 21)** vamos fazer um recap de tudo que aprendemos na Semana 3 -> desde a arquitetura do Collector até os padrões de deployment. Foi uma semana longa!

Nos vemos no Dia 21 para o nosso recap da Semana 3!
