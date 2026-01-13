# Day 27 – OpenTelemetry Operator: Kubernetes-Native Observability

For the past two weeks we’ve been learning about manual Collector deployment. Today we’ll explore the **OpenTelemetry Operator**, a Kubernetes-native way to manage observability that automates deployment, scaling, and instrumentation, including an **injector** that removes much of the manual work required to instrument applications.

---

## What is the OpenTelemetry Operator?

The OpenTelemetry Operator is a **Kubernetes operator** that manages OpenTelemetry components in your cluster. Think of it as an intelligent automation system that:

- **Deploys and manages Collectors** automatically
- **Auto-instruments applications** without code changes
- **Handles configuration updates** seamlessly
- **Scales with your cluster** dynamically

### Why Do We Need an Operator?

**Without Operator (Manual Approach):**
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

**Problems with manual approach:**
- Configuration updates require manual ConfigMap changes
- No automatic instrumentation of applications
- Scaling requires manual intervention
- No standardization across teams

**With Operator (Kubernetes-Native):**
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

**Benefits of operator approach:**
- Declarative configuration management
- Automatic application instrumentation
- Built-in scaling and updates
- Consistent deployment patterns

---

## Core Concepts: Custom Resource Definitions (CRDs)

The Operator introduces two main Kubernetes resources:

### 1. OpenTelemetryCollector CRD

**Purpose:** Manages Collector deployments

> [!NOTE]
> We're using batch processor for educational purposes. In production, consider exporters with built-in batching. Modern exporters can handle batching internally.

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

**What the Operator creates for you:**
- Deployment or DaemonSet
- Service for load balancing
- ConfigMap for configuration
- ServiceAccount and RBAC
- Automatic updates when config changes

### 2. Instrumentation CRD

**Purpose:** Manages automatic instrumentation of applications without code change. That's one of the most powerful features of the operator. This is how it works:

**Step 1: Create Instrumentation Resource**
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

**Step 2: Annotate Your Application**
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

**What happens automatically:**
1. Operator detects the annotation
2. **Admission Controller** intercepts pod creation
3. **Injector** modifies pod spec to add instrumentation
4. **Init container** downloads and sets up instrumentation libraries
5. **Environment variables** configured for OpenTelemetry SDK
6. Application starts with instrumentation enabled

## [The Injector](https://opentelemetry.io/docs/platforms/kubernetes/operator/automatic/): How It Works Under the Hood

The **auto-instrumentation injector** is a Kubernetes admission controller that automatically modifies pod specifications. Think of it like automatic library installation that happens when your app starts in Kubernetes.
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

Normally, to add OpenTelemetry to a Node.js app, you'd need to:
1. Install the OpenTelemetry packages (npm install @opentelemetry/auto-instrumentations-node)
2. Create an instrumentation file
3. Modify your app's startup to require the instrumentation first
4. Set environment variables for configuration

The injector does all this automatically when your pod starts.

**Injection Process:**
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

### The sequence:
**Phase 1: Pod Creation (happens once)**
1. You deploy your app (original)
2. Kubernetes API Server receives the pod creation request
3. Admission Controller intercepts the request (part of Kubernetes), it says "Wait, I need to check this pod first". It sees the annotation `instrumentation.opentelemetry.io/inject-nodejs: "my-instrumentation"`
4. Mutating Webhook (the "injector" -> part of OpenTelemetry Operator) modifies the pod spec (behind the scenes) adding init container, env vars, shared volume
5. Kubernetes API Server creates the modified pod (not your original pod)
6. Phase 2: Init container runs, app container starts, etc.

**Phase 2: Pod Startup (happens every time the pod starts)**
1. Init container starts first → Downloads OpenTelemetry libraries to shared volume 
2. Init container finishes → Shared volume now contains `autoinstrumentation.js`
3. Your app container starts → Finds the libraries in the shared volume 
4. Node.js starts with `--require` → Loads OpenTelemetry BEFORE your app code 
5. Your app runs with OpenTelemetry → Automatically instrumented!

The pod modification happens at creation time, not at startup time. This is why you can restart, scale and roll updates to your pod and it will still be instrumented - the modification is "baked into" the pod specification, not applied dynamically each time.

**Languages supported by the Kubernetes Operator auto-injector:**
- **.NET:** Auto-instrumentation via OpenTelemetry .NET libraries
- **Java:** Auto-instrumentation via the OpenTelemetry Java Agent  
- **Node.js:** Auto-instrumentation via OpenTelemetry Node.js libraries
- **Python:** Auto-instrumentation via OpenTelemetry Python libraries
- **Go:** Auto-instrumentation via eBPF (requires feature gate to be enabled)
- **Deno:** Auto-instrumentation via OpenTelemetry Deno integration

**Languages requiring manual instrumentation:**
- **Ruby:** Manual instrumentation supported via the OpenTelemetry Ruby SDK. No auto-instrumentation agent or operator injection at this time

*Note: According to the official OpenTelemetry documentation, the operator supports auto-injection for .NET, Java, Node.js, Python, Go (with feature gate), and Deno. Go auto-instrumentation uses eBPF and requires elevated permissions.*
---

## Deployment Modes

The Operator supports three deployment modes for Collectors:

### 1. Deployment Mode
**Use case:** Centralized processing, gateway pattern

```yaml
spec:
  mode: deployment
  replicas: 3
```

**What you get:**
- Standard Kubernetes Deployment
- Load balancer Service
- Horizontal scaling
- Rolling updates

### 2. DaemonSet Mode
**Use case:** Agent pattern, per-node collection

```yaml
spec:
  mode: daemonset
```

**What you get:**
- One Collector pod per node
- Direct access to node resources
- Efficient local collection
- Automatic scaling with cluster

### 3. Sidecar Mode
**Use case:** Per-application isolation

```yaml
spec:
  mode: sidecar
```

**What you get:**
- Collector injected as sidecar container
- Application-specific configuration
- Complete isolation
- Fine-grained resource control

---

## Operator vs Manual: Side-by-Side Comparison

| Aspect | Manual Deployment | Operator Deployment |
|--------|------------------|-------------------|
| **Configuration** | ConfigMaps + manual updates | Declarative CRDs |
| **Instrumentation** | Code changes required | Annotation-based |
| **Scaling** | Manual replica management | Automatic scaling |
| **Updates** | Manual rolling updates | Operator-managed |
| **Standardization** | Team-specific patterns | Organization-wide consistency |
| **Learning Curve** | Understand all components | Understand CRDs and annotations |
| **Flexibility** | Full control | Operator constraints |
| **Maintenance** | High operational overhead | Low operational overhead |


### When to Use the Operator vs Manual Deployment

#### Use the Operator When:

**You're running on Kubernetes**
- Operator is designed for Kubernetes environments
- Leverages Kubernetes-native patterns

**You want automatic instrumentation**
- No code changes required
- Consistent instrumentation across services

**You have multiple teams/services**
- Standardized deployment patterns
- Centralized configuration management

**You need dynamic scaling**
- Automatic scaling with cluster growth
- Resource optimization

#### Use Manual Deployment When:

**You're not on Kubernetes**
- Docker Compose, VMs, bare metal
- Operator requires Kubernetes

**You need custom deployment patterns**
- Highly specialized configurations
- Non-standard architectures

**You want full control**
- Custom resource management
- Specific deployment requirements

**You're learning OpenTelemetry**
- Understanding underlying components
- Educational purposes

---

## Getting Started (Conceptual Overview)

### Installation Process
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

### Basic Workflow
1. **Install** the Operator in your cluster
2. **Define** Collector and Instrumentation resources
3. **Annotate** applications for auto-instrumentation
4. **Deploy** applications - instrumentation happens automatically
5. **Monitor** through Kubernetes-native tools

---

## What I'm taking into Day 28

Today we learned that the Operator simplifies Kubernetes deployments. It transforms complex manual processes into simple resource definitions. and handles the operational complexity for you. Underneath it is still OpenTelemetry (same Collector config format, instrumentation libraries, telemetry data and protocols). The Operator just manages the deployment and lifecycle

Tomorrow we'll put everything together in a comprehensive final project. We'll hopefully build a complete, production-ready observability stack that demonstrates all the concepts we've learned.

---

*"The best tools are the ones that handle complexity so you can focus on what matters. The OpenTelemetry Operator handles Kubernetes complexity so you can focus on observability."*
