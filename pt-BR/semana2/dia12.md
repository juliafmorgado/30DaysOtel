# Dia 12 – Context Propagation: Entendendo Como os Traces Continuam Conectados

Ontem aprendemos a Logs API e vimos como os logs recebem automaticamente trace e span IDs para correlação. Hoje vamos entender o **context propagation** e ver como esse mecanismo faz tudo isso acontecer.

> **Exemplo prático:** O código completo deste tutorial está disponível em [`examples/day12-context-propagation/`](../examples/day12-context-propagation/)
>
> **Observação:** Isso parte do que vimos nos Dias 9-11. Se você ainda não fez, comece por lá: [`examples/day9-tracing-api/`](../examples/day9-tracing-api/)

---

## O que já sabemos dos dias anteriores

A gente já vinha usando context propagation sem perceber:

- **[Dia 9](https://github.com/juliafmorgado/30DaysOtel/blob/main/week2/day9.md):** Nossos spans manuais viravam filhos dos pais certos automaticamente
- **[Dia 10](https://github.com/juliafmorgado/30DaysOtel/blob/main/week2/day10.md):** Nossas metrics eram associadas automaticamente aos traces certos
- **[Dia 11](https://github.com/juliafmorgado/30DaysOtel/blob/main/week2/day11.md):** Nossos logs recebiam trace e span IDs automaticamente

O foco de hoje é entender **como** isso funciona e **quando** isso pode quebrar.

---

## O que é Context Propagation?

Context propagation é como o OpenTelemetry mantém o controle de "em qual trace eu estou agora?" enquanto o código executa.

**Pense assim:**
- Nosso código é como uma conversa
- O context é tipo "quem está falando agora?"
- A propagation é como a gente lembra quem está falando conforme a conversa continua

**Em termos simples:**
- O context contém o trace ID e o span ID atuais
- A propagation garante que os spans filhos saibam quem é o pai deles
- Isso normalmente funciona de forma automática

---

## Quando o Context Propagation Funciona Automaticamente (O Caminho Feliz)

O OpenTelemetry propaga o context automaticamente através de:

### 1. Chamadas de função normais
```javascript
tracer.startActiveSpan('parent', (span) => {
  doSomething(); // Essa função "enxerga" o span pai
  span.end();
});
```

### 2. Operações async/await
```javascript
tracer.startActiveSpan('parent', async (span) => {
  await doAsyncWork(); // Isso ainda "enxerga" o span pai
  span.end();
});
```

### 3. Middleware do Express (com auto-instrumentação)
```javascript
app.use((req, res, next) => {
  // Esse middleware enxerga o mesmo trace context
  next();
});
```

Na maior parte do tempo, a context propagation "simplesmente funciona" e você nem precisa pensar sobre isso.

---

## Quando o Context Propagation Pode Quebrar

A context propagation pode quebrar em alguns cenários específicos:

### 1. setTimeout e setInterval
```javascript
tracer.startActiveSpan('parent', (span) => {
  setTimeout(() => {
    // Esse callback pode não enxergar o span pai
    tracer.startActiveSpan('child', (childSpan) => {
      // Isso pode iniciar um novo trace em vez de ser um filho
      childSpan.end();
    });
  }, 1000);
  span.end();
});
```

### 2. Event emitters
```javascript
tracer.startActiveSpan('parent', (span) => {
  emitter.on('event', () => {
    // Esse handler de evento pode não enxergar o span pai
    tracer.startActiveSpan('child', (childSpan) => {
      childSpan.end();
    });
  });
  span.end();
});
```

**Para iniciantes:** Esses são casos extremos. A maior parte do seu código vai funcionar bem sem você precisar se preocupar com isso.

---

## O que vamos construir hoje

Vamos criar **exemplos simples** mostrando:

1. **Propagation automática** (o caso normal)
2. **Quando a propagation quebra** (para você conseguir reconhecer)
3. **Como corrigir** (solução básica)

Isso é sobre **entender o conceito**, não dominar cenários complexos.

---

## Passo 1: Configurar o projeto

Se você terminou o Dia 11, copie aquele projeto:

```bash
cp -r day11-logs-api day12-context-propagation
cd day12-context-propagation
```

Se estiver começando do zero:

```bash
mkdir day12-context-propagation
cd day12-context-propagation
npm init -y
```

**Instale as dependências:**

```bash
npm install express \
  @opentelemetry/api \
  @opentelemetry/sdk-node \
  @opentelemetry/resources \
  @opentelemetry/semantic-conventions \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-trace-otlp-http
```

---

## Passo 2: Criar a instrumentação simples

Crie o `instrumentation.js`:

```javascript
// instrumentation.js
const { NodeSDK } = require("@opentelemetry/sdk-node");
const { getNodeAutoInstrumentations } = require("@opentelemetry/auto-instrumentations-node");
const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-http");
const { resourceFromAttributes } = require("@opentelemetry/resources");
const { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } = require("@opentelemetry/semantic-conventions");

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: "greeting-service",
    [ATTR_SERVICE_VERSION]: "1.0.0",
  }),
  traceExporter: new OTLPTraceExporter({
    url: "http://localhost:4318/v1/traces",
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
console.log("OpenTelemetry initialized for context propagation demo");
```

---

## Passo 3: Criar exemplos mostrando context propagation

Crie o `app.js`:

```javascript
// app.js
const express = require("express");
const { trace, context } = require("@opentelemetry/api");

const app = express();
app.use(express.json());

const tracer = trace.getTracer("context-demo", "1.0.0");

// =========================
// EXAMPLE 1: Automatic propagation (works great)
// =========================

async function automaticPropagationExample() {
  return tracer.startActiveSpan("parent_operation", async (parentSpan) => {
    parentSpan.setAttribute("example", "automatic");
    
    // This works - async/await preserves context
    await tracer.startActiveSpan("child_operation", async (childSpan) => {
      childSpan.setAttribute("type", "child");
      
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // This also works - nested spans
      await tracer.startActiveSpan("grandchild_operation", async (grandchildSpan) => {
        grandchildSpan.setAttribute("type", "grandchild");
        await new Promise(resolve => setTimeout(resolve, 50));
        grandchildSpan.end();
      });
      
      childSpan.end();
    });
    
    parentSpan.end();
    return "Automatic propagation completed";
  });
}

// =========================
// EXAMPLE 2: Broken propagation (context lost)
// =========================

function brokenPropagationExample() {
  return tracer.startActiveSpan("parent_operation", (parentSpan) => {
    parentSpan.setAttribute("example", "broken");
    
    // This breaks - setTimeout loses context
    setTimeout(() => {
      tracer.startActiveSpan("orphaned_child", (childSpan) => {
        childSpan.setAttribute("problem", "no_parent");
        
        // This span will NOT be a child of parent_operation
        // It will start a completely new trace!
        
        childSpan.end();
      });
    }, 100);
    
    parentSpan.end();
    return "Broken propagation example started (check Jaeger in 1 second)";
  });
}

// =========================
// API ENDPOINTS
// =========================

app.get("/automatic", async (req, res) => {
  try {
    const result = await automaticPropagationExample();
    res.json({ 
      result, 
      message: "Check Jaeger - spans should be properly nested like a family tree" 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/broken", async (req, res) => {
  try {
    const result = brokenPropagationExample();
    res.json({ 
      result, 
      message: "Check Jaeger - orphaned_child will be in a separate trace (not connected to parent)!" 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Context propagation demo listening on port ${PORT}`);
});
```
---

## Passo 4: Executar e testar os exemplos

**Suba o Jaeger:**
```bash
docker run -d --name jaeger \
  -p 16686:16686 \
  -p 4318:4318 \
  jaegertracing/all-in-one:latest
```

**Rode a aplicação:**
```bash
node --require ./instrumentation.js app.js
```

**Teste cada exemplo:**

```bash
# 1. Automatic propagation (should work perfectly)
curl http://localhost:3000/automatic

# 2. Broken propagation (child span will be orphaned)
curl http://localhost:3000/broken
```

---

## Passo 5: Observar as diferenças no Jaeger

Abra http://localhost:16686 e procure pelos traces do serviço `context-demo`.

**O que você vai ver:**

### Propagation Automática

![Automatic context propagation trace example](images/day12-automatic.png)

- Você vê uma estrutura de trace aninhada, bonitinha
- `parent_operation` → `child_operation` → `grandchild_operation`
- Tudo conectado dentro de uma única árvore de trace
- Isso mostra o context propagation funcionando automaticamente

### Propagation Quebrada

![Broken context propagation trace example](images/day12-broken.png)

- Você vê o `parent_operation`, mas ele está bem mais curto
- O span `orphaned_child` está completamente ausente desse trace
- Isso porque ele virou um trace separado e desconectado
- Isso mostra o context propagation quebrando

---

## Quando iniciantes precisam se preocupar com isso?

**Na maior parte do tempo: nunca!** O context propagation funciona automaticamente para:
- Chamadas de função normais
- Operações async/await
- Middleware do Express
- A maioria das chamadas a banco de dados
- A maioria das requisições HTTP

**Você pode precisar de propagation manual para:**
- Callbacks de setTimeout/setInterval
- Event emitters
- Filas de mensagens (tópico avançado)
- Worker threads (tópico avançado)

**Dica para iniciantes:** Não se preocupe com isso até você ver traces quebrados no Jaeger.

---

## Como reconhecer context propagation quebrada

**Sinais de que sua context propagation está quebrada:**
1. **No Jaeger:** Você vê vários traces separados em vez de um único trace conectado
2. **Nos logs:** Os logs têm trace IDs diferentes quando deveriam ser o mesmo
3. **Nas metrics:** As metrics não estão associadas aos traces certos

**Quando isso acontecer:** Procure por setTimeout, setInterval ou event emitters no seu código.

---

## O que eu levo para o Dia 13

Hoje aprendemos que **context propagation** é como o trace context flui através da nossa aplicação:

**Conceitos-chave:**
- O context propagation normalmente funciona automaticamente
- Ele pode quebrar com setTimeout e event emitters
- A maioria dos iniciantes não precisa se preocupar com isso

**Habilidades práticas:**
- Reconhecer quando os traces estão devidamente conectados
- Identificar context propagation quebrada no Jaeger
- Usar `context.active()` e `context.with()` para correções simples

Amanhã (Dia 13) vamos aprender **conceitos básicos do SDK** - samplers, processors e exporters que controlam como a telemetry flui pelo OpenTelemetry.

Nos vemos no Dia 13!
