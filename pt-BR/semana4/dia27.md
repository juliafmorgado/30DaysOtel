# Dia 27 – OpenTelemetry Operator: Observabilidade Nativa do Kubernetes

Nas últimas duas semanas, você aprendeu sobre deployment manual do Collector. Hoje vamos explorar o **OpenTelemetry Operator**, uma forma nativa do Kubernetes de gerenciar observabilidade que automatiza deployment, escalonamento e instrumentação, incluindo um **injector** que elimina boa parte do trabalho manual necessário para instrumentar aplicações.

---

## O Que é o OpenTelemetry Operator?

O OpenTelemetry Operator é um **Kubernetes operator** que gerencia os componentes do OpenTelemetry no seu cluster. Pense nele como um sistema de automação inteligente que:

- **Faz deploy e gerencia Collectors** automaticamente
- **Aplica auto-instrumentação nas aplicações** sem precisar mudar código
- **Lida com atualizações de configuração** de forma transparente
- **Escala com o seu cluster** dinamicamente

### Por Que Precisamos de um Operator?

**Sem Operator (Abordagem Manual):**
```yaml
# You manually create ConfigMaps
apiVersion: v1
kind: ConfigMap
metadata:
  name: collector-config
data:
  collector.yaml: |
    # Your collector configuration

---
# You manually create Deployments
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
spec:
  # Manual deployment configuration
```

**Problemas da abordagem manual:**
- Atualizações de configuração exigem mudanças manuais no ConfigMap
- Nenhuma instrumentação automática das aplicações
- Escalonamento exige intervenção manual
- Nenhuma padronização entre os times

**Com Operator (Nativo do Kubernetes):**
```yaml
# You declare what you want
apiVersion: opentelemetry.io/v1alpha1
kind: OpenTelemetryCollector
metadata:
  name: my-collector
spec:
  config: |
    # Your collector configuration
```

**Benefícios da abordagem com Operator:**
- Gerenciamento declarativo de configuração
- Instrumentação automática das aplicações
- Escalonamento e atualizações embutidos
- Padrões de deployment consistentes

---

## Conceitos Principais: Custom Resource Definitions (CRDs)

O Operator introduz dois recursos principais do Kubernetes:

### 1. OpenTelemetryCollector CRD

**Propósito:** Gerencia deployments do Collector

> [!NOTE]
> Estamos usando o batch processor para fins didáticos. Em produção, considere exporters com batching embutido. Exporters modernos conseguem lidar com o batching internamente.

```yaml
apiVersion: opentelemetry.io/v1alpha1
kind: OpenTelemetryCollector
metadata:
  name: demo-collector
spec:
  # Deployment mode: deployment, daemonset, or sidecar
  mode: deployment
  
  # Number of replicas (for deployment mode)
  replicas: 3
  
  # Collector configuration (same as manual config)
  config: |
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
          http:
            endpoint: 0.0.0.0:4318
    
    processors:
      # Traditional batch processor (educational)
      batch:
        timeout: 1s
        send_batch_size: 1024
    
    exporters:
      logging:
        loglevel: debug
      # Example of exporter with built-in batching:
      # otlp:
      #   endpoint: http://backend:4317
      #   sending_queue:
      #     enabled: true
      #     persistent_storage_enabled: true
    
    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [batch]  # Educational example
          exporters: [logging]
```

**O que o Operator cria para você:**
- Deployment ou DaemonSet
- Service para load balancing
- ConfigMap para configuração
- ServiceAccount e RBAC
- Atualizações automáticas quando a configuração muda

### 2. Instrumentação CRD

**Propósito:** Gerencia a instrumentação automática das aplicações sem precisar mudar código. Esse é um dos recursos mais poderosos do operator. Veja como funciona:

**Passo 1: Criar o Recurso Instrumentação**
```yaml
apiVersion: opentelemetry.io/v1alpha1
kind: Instrumentation
metadata:
  name: my-instrumentation
spec:
  # Exporter configuration
  exporter:
    endpoint: http://otel-collector:4318
  # Language-specific configuration  
  nodejs:
    image: ghcr.io/open-telemetry/opentelemetry-operator/autoinstrumentation-nodejs:latest
    env:
      - name: OTEL_LOG_LEVEL
        value: "debug"
```

**Passo 2: Anotar a Sua Aplicação**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-nodejs-app
spec:
  template:
    metadata:
      annotations:
        # Enable auto-instrumentation
        instrumentation.opentelemetry.io/inject-nodejs: "my-instrumentation"
    spec:
      containers:
      - name: app
        image: my-nodejs-app:latest
```

**O que acontece automaticamente:**
1. O Operator detecta a annotation
2. O **Admission Controller** intercepta a criação do pod
3. O **Injector** modifica o pod spec para adicionar instrumentação
4. O **init container** baixa e configura as bibliotecas de instrumentação
5. As **variáveis de ambiente** são configuradas para o OpenTelemetry SDK
6. A aplicação inicia com a instrumentação habilitada

## [O Injector](https://opentelemetry.io/docs/platforms/kubernetes/operator/automatic/): Como Funciona Por Baixo dos Panos

O **auto-instrumentação injector** é um admission controller do Kubernetes que modifica automaticamente as especificações dos pods. Pense nele como uma instalação automática de bibliotecas que acontece quando a sua aplicação inicia no Kubernetes.
```
┌─────────────────────────────────────────────────────────┐
│                OpenTelemetry Operator                   │
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │           Admission Controller                      ││
│  │                                                     ││
│  │  ┌─────────────────────────────────────────────────┐││
│  │  │        Mutating Webhook                         │││
│  │  │     (aka "The Injector")                        │││
│  │  │                                                 │││
│  │  │  - Receives pod creation requests               │││
│  │  │  - Checks for instrumentation annotations       │││
│  │  │  - Modifies pod spec to add OpenTelemetry       │││
│  │  │  - Returns modified pod spec to Kubernetes      │││
│  │  └─────────────────────────────────────────────────┘││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

Normalmente, para adicionar o OpenTelemetry a uma aplicação Node.js, você precisaria:
1. Instalar os pacotes do OpenTelemetry (npm install @opentelemetry/auto-instrumentations-node)
2. Criar um arquivo de instrumentação
3. Modificar a inicialização da sua aplicação para dar require na instrumentação primeiro
4. Configurar as variáveis de ambiente

O injector faz tudo isso automaticamente quando o seu pod inicia.

**Processo de Injeção:**
```yaml
# Original Pod Spec
apiVersion: v1
kind: Pod
metadata:
  annotations:
    instrumentation.opentelemetry.io/inject-nodejs: "my-instrumentation"
spec:
  containers: # You just deploy a normal Node.js app
  - name: app
    image: my-nodejs-app:latest

# Kubernetes stores THIS in etcd (after Injector/webhook modification)
apiVersion: v1
kind: Pod
spec:
  initContainers: # This container runs FIRST and downloads the OpenTelemetry libraries
  - name: opentelemetry-auto-instrumentation
    image: ghcr.io/open-telemetry/opentelemetry-operator/autoinstrumentation-nodejs:latest
    command: ["/otel-auto-instrumentation-nodejs"]
    volumeMounts:
    - name: opentelemetry-auto-instrumentation
      mountPath: /otel-auto-instrumentation
  containers:
  - name: app
    image: my-nodejs-app:latest
    env: # This tells Node.js to load OpenTelemetry BEFORE your app code
    - name: NODE_OPTIONS
      value: "--require /otel-auto-instrumentation/autoinstrumentation.js"
    - name: OTEL_SERVICE_NAME
      value: "my-nodejs-app"
    volumeMounts:
    - name: opentelemetry-auto-instrumentation
      mountPath: /otel-auto-instrumentation
  volumes: # This is like a shared folder between containers
  - name: opentelemetry-auto-instrumentation
    emptyDir: {}
```

### A sequência:
**Fase 1: Criação do Pod (acontece uma vez)**
1. Você faz deploy da sua aplicação (original)
2. O Kubernetes API Server recebe a requisição de criação do pod
3. O Admission Controller intercepta a requisição (faz parte do Kubernetes) e pensa "Espera, eu preciso checar esse pod primeiro". Ele vê a annotation `instrumentation.opentelemetry.io/inject-nodejs: "my-instrumentation"`
4. O Mutating Webhook (o "injector" → faz parte do OpenTelemetry Operator) modifica o pod spec (por baixo dos panos), adicionando init container, env vars e volume compartilhado
5. O Kubernetes API Server cria o pod modificado (não o seu pod original)
6. Fase 2: o init container roda, o app container inicia, etc.

**Fase 2: Inicialização do Pod (acontece toda vez que o pod inicia)**
1. O init container inicia primeiro → Baixa as bibliotecas do OpenTelemetry para o volume compartilhado
2. O init container termina → O volume compartilhado agora contém o `autoinstrumentation.js`
3. O seu app container inicia → Encontra as bibliotecas no volume compartilhado
4. O Node.js inicia com `--require` → Carrega o OpenTelemetry ANTES do código da sua aplicação
5. A sua aplicação roda com o OpenTelemetry → Automaticamente instrumentada!

A modificação do pod acontece no momento da criação, não no momento da inicialização. É por isso que você pode reiniciar, escalar e fazer rolling updates no seu pod e ele continuará instrumentado - a modificação fica "embutida" na especificação do pod, e não é aplicada dinamicamente toda vez.

**Linguagens suportadas pelo auto-injector do Kubernetes Operator:**
- **.NET:** Auto-instrumentação via bibliotecas do OpenTelemetry .NET
- **Java:** Auto-instrumentação via o OpenTelemetry Java Agent  
- **Node.js:** Auto-instrumentação via bibliotecas do OpenTelemetry Node.js
- **Python:** Auto-instrumentação via bibliotecas do OpenTelemetry Python
- **Go:** Auto-instrumentação via eBPF (precisa habilitar um feature gate)
- **Deno:** Auto-instrumentação via integração com o OpenTelemetry Deno

**Linguagens que exigem instrumentação manual:**
- **Ruby:** Instrumentação manual suportada via o OpenTelemetry Ruby SDK. Por enquanto não há agent de auto-instrumentação nem injection do operator

*Nota: de acordo com a documentação oficial do OpenTelemetry, o operator suporta auto-injection para .NET, Java, Node.js, Python, Go (com feature gate) e Deno. A auto-instrumentação em Go usa eBPF e exige permissões elevadas.*
---

## Modos de Deployment

O Operator suporta três modos de deployment para Collectors:

### 1. Modo Deployment
**Caso de uso:** Processamento centralizado, padrão gateway

```yaml
spec:
  mode: deployment
  replicas: 3
```

**O que você ganha:**
- Deployment padrão do Kubernetes
- Service de load balancer
- Escalonamento horizontal
- Rolling updates

### 2. Modo DaemonSet
**Caso de uso:** Padrão agent, coleta por nó

```yaml
spec:
  mode: daemonset
```

**O que você ganha:**
- Um pod de Collector por nó
- Acesso direto aos recursos do nó
- Coleta local eficiente
- Escalonamento automático com o cluster

### 3. Modo Sidecar
**Caso de uso:** Isolamento por aplicação

```yaml
spec:
  mode: sidecar
```

**O que você ganha:**
- Collector injetado como sidecar container
- Configuração específica por aplicação
- Isolamento completo
- Controle refinado de recursos

---

## Operator vs Manual: Comparação Lado a Lado

| Aspecto | Deployment Manual | Deployment com Operator |
|--------|------------------|-------------------|
| **Configuração** | ConfigMaps + atualizações manuais | CRDs declarativas |
| **Instrumentação** | Exige mudanças de código | Baseada em annotations |
| **Escalonamento** | Gerenciamento manual de réplicas | Escalonamento automático |
| **Atualizações** | Rolling updates manuais | Gerenciadas pelo Operator |
| **Padronização** | Padrões específicos de cada time | Consistência em toda a organização |
| **Curva de Aprendizado** | Entender todos os componentes | Entender CRDs e annotations |
| **Flexibilidade** | Controle total | Restrições do Operator |
| **Manutenção** | Alto overhead operacional | Baixo overhead operacional |


### Quando Usar o Operator vs Deployment Manual

#### Use o Operator Quando:

**Você está rodando no Kubernetes**
- O Operator é feito para ambientes Kubernetes
- Aproveita padrões nativos do Kubernetes

**Você quer instrumentação automática**
- Não exige mudanças de código
- Instrumentação consistente entre os serviços

**Você tem múltiplos times/serviços**
- Padrões de deployment padronizados
- Gerenciamento centralizado de configuração

**Você precisa de escalonamento dinâmico**
- Escalonamento automático conforme o cluster cresce
- Otimização de recursos

#### Use Deployment Manual Quando:

**Você não está no Kubernetes**
- Docker Compose, VMs, bare metal
- O Operator exige Kubernetes

**Você precisa de padrões de deployment customizados**
- Configurações altamente especializadas
- Arquiteturas fora do padrão

**Você quer controle total**
- Gerenciamento customizado de recursos
- Requisitos específicos de deployment

**Você está aprendendo OpenTelemetry**
- Entender os componentes por baixo dos panos
- Fins didáticos

---

## Primeiros Passos (Visão Conceitual)

### Processo de Instalação
```bash
# 1. Install the Operator (conceptual)
kubectl apply -f https://github.com/open-telemetry/opentelemetry-operator/releases/latest/download/opentelemetry-operator.yaml

# 2. Create a Collector
kubectl apply -f collector.yaml

# 3. Create Instrumentation
kubectl apply -f instrumentation.yaml

# 4. Annotate your applications
kubectl patch deployment my-app -p '{"spec":{"template":{"metadata":{"annotations":{"instrumentation.opentelemetry.io/inject-nodejs":"my-instrumentation"}}}}}'
```

### Fluxo Básico
1. **Instale** o Operator no seu cluster
2. **Defina** os recursos de Collector e Instrumentação
3. **Anote** as aplicações para auto-instrumentação
4. **Faça deploy** das aplicações - a instrumentação acontece automaticamente
5. **Monitore** através de ferramentas nativas do Kubernetes

---

## O Que Eu Levo Para o Dia 28

Hoje aprendemos que o Operator simplifica os deployments no Kubernetes. Ele transforma processos manuais complexos em definições de recursos simples e cuida da complexidade operacional para você. Por baixo dos panos, continua sendo o OpenTelemetry de sempre (o mesmo formato de configuração do Collector, as mesmas bibliotecas de instrumentação, os mesmos dados de telemetry e protocolos). O Operator só gerencia o deployment e o lifecycle

Amanhã vamos juntar tudo em um projeto final completo. Com sorte, vamos construir uma stack de observabilidade completa e pronta para produção, que demonstra todos os conceitos que aprendemos.

---

*"As melhores ferramentas são aquelas que lidam com a complexidade para que você possa focar no que importa. O OpenTelemetry Operator lida com a complexidade do Kubernetes para que você possa focar em observabilidade."*
