# Dia 9 – Tracing API: Construindo Histórias de Requisição Ricas e Observáveis

Ontem aprendemos que a API do OpenTelemetry é o que usamos no nosso código, enquanto o SDK cuida da configuração. Hoje vamos colocar a mão na massa com a **Tracing API**, a parte do OpenTelemetry que nos permite criar traces detalhados do comportamento da nossa aplicação.

> **Exemplo prático:** O código completo deste tutorial está disponível em [`examples/day9-tracing-api/`](../examples/day9-tracing-api/)

---
## O que já sabemos da Semana 1

- **[Dia 4](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day4.md):** Aprendemos que spans têm nomes, atributos e relações de pai-filho → Hoje vamos criar esses spans nós mesmos
- **[Dia 5](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day5.md):** Aprendemos convenções semânticas como `http.request.method` → Hoje vamos usá-las em `span.setAttribute()`
- **[Dia 6](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day6.md):** Aprendemos que a auto-instrumentação chama a Tracing API → Hoje vamos chamar essa mesma API manualmente

**Os métodos da API não são novidade, estamos aprendendo sobre eles a semana toda.** Hoje é a hora de praticar o uso deles.

## O que vamos construir hoje: um serviço simples de saudação

Vamos construir uma API Express básica que cria saudações personalizadas. Esse exemplo simples vai nos deixar focar em aprender a Tracing API sem se distrair com lógica de negócio complexa.

**Nossa API de saudação vai:**
1. **Receber um nome** - Pegar o nome do usuário na URL
2. **Criar uma saudação** - Gerar uma mensagem personalizada
3. **Adicionar um tempo de processamento** - Simular um trabalho real com um pequeno delay

**Por que esse exemplo é perfeito para aprender:**
- **Simples e focado** - Fácil de entender o que cada span representa
- **Mostra relações de pai-filho** - Vamos criar spans aninhados
- **Demonstra conceitos-chave** - Attributes, events e o ciclo de vida do span
- **Rápido de testar** - Basta um curl numa URL para ver o resultado

---
## Passo 1: Configurar o projeto

Crie um novo diretório e inicialize ele:

```bash
mkdir otel-tracing-basics
cd otel-tracing-basics
npm init -y
```

**Instale as dependências:**

```bash
npm install express @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/resources @opentelemetry/semantic-conventions @opentelemetry/auto-instrumentations-node @opentelemetry/exporter-trace-otlp-http
```

**Nossa estrutura de projeto vai ficar assim:**
```
otel-tracing-api/
├── instrumentation.js    (configuração do SDK)
├── app.js                (app Express com instrumentação manual)
└── package.json
```

---

## Passo 2: Configurar o OpenTelemetry (instrumentation.js)

Antes de escrever qualquer código de aplicação, precisamos configurar o OpenTelemetry. Essa configuração diz ao SDK como processar e exportar nossos dados telemétricos.

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
console.log("OpenTelemetry initialized");
```

**Vamos entender o que cada parte faz:**

**Configuração do resource:**
```javascript
resource: resourceFromAttributes({
  [ATTR_SERVICE_NAME]: "greeting-service",
  [ATTR_SERVICE_VERSION]: "1.0.0",
})
```
Isso diz ao OpenTelemetry "quem" está criando os dados telemétricos. Todo span vai incluir esses atributos automaticamente, o que facilita filtrar traces por service e versão no Jaeger.

> **Nota:** Usamos `resourceFromAttributes()` em vez do construtor `new Resource()`, que está deprecated. O [OpenTelemetry 2.x](https://opentelemetry.io/blog/2025/otel-js-sdk-2-0/) deixou de exportar classes para melhorar a estabilidade da API e permitir um tree-shaking melhor.

**Trace exporter:**
```javascript
traceExporter: new OTLPTraceExporter({
  url: "http://localhost:4318/v1/traces",
})
```
Isso diz ao OpenTelemetry "para onde" enviar os dados de trace. OTLP (OpenTelemetry Protocol) é o formato padrão, e o Jaeger aceita OTLP na porta 4318.

**Auto-instrumentação:**
```javascript
instrumentations: [getNodeAutoInstrumentations()]
```
Isso encapsula bibliotecas existentes em tempo de execução para capturar automaticamente spans de rotas Express, requisições HTTP, chamadas de banco de dados e outras operações comuns. Vamos adicionar nossos próprios spans manuais por cima desses spans automáticos.

**Por que configuramos isso separadamente:** Lembra do [Dia 8](./dia08.md)? Essa separação é o que permite trocar a implementação do SDK (padrão → distribuição de um vendor) ou a configuração (sampling de 100% → sampling de 10%) sem mexer no código da nossa aplicação.

---

## Passo 3: Criar o app Express (app.js)

Crie o `app.js`:

```javascript
// app.js
const express = require('express');
const { trace } = require('@opentelemetry/api');

const app = express();

// Get a tracer (our span factory)
const tracer = trace.getTracer('greeting-service', '1.0.0');

// Simple greeting endpoint with manual instrumentation
app.get('/hello/:name', (req, res) => {
  // Create a span for our greeting operation
  tracer.startActiveSpan('create_greeting', (span) => {
    const name = req.params.name;
    
    // Add attributes to describe what we're doing
    span.setAttribute('user.name', name);
    span.setAttribute('greeting.type', 'personal');
    
    // Add an event to mark when we start processing
    span.addEvent('processing_started');
    
    // Simulate some processing time
    setTimeout(() => {
      // Create a nested span for message formatting
      tracer.startActiveSpan('format_message', (formatSpan) => {
        const message = `Hello, ${name}! Welcome to OpenTelemetry tracing.`;
        
        formatSpan.setAttribute('message.length', message.length);
        formatSpan.addEvent('message_formatted');
        formatSpan.end();
        
        // Add final attributes and events to parent span
        span.setAttribute('response.message', message);
        span.addEvent('processing_completed');
        span.end();
        
        res.json({ 
          message,
          timestamp: new Date().toISOString()
        });
      });
    }, 100);
  });
});

// Health check endpoint (no manual instrumentation)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Greeting service listening on port ${PORT}`);
  console.log('Try: curl http://localhost:3000/hello/Alice');
});
```

---

## Passo 4: Subir o Jaeger (para visualizar os traces)

Precisamos de um backend para receber e visualizar os traces. Vamos usar o Jaeger. Para isso, precisamos ter o Docker Desktop instalado e rodando.

```bash
docker run -d --name jaeger \
  -p 16686:16686 \
  -p 4318:4318 \
  jaegertracing/all-in-one:latest
```

**Abra a UI do Jaeger:** http://localhost:16686

---

## Passo 5: Rodar a aplicação

Inicie o app com o OpenTelemetry habilitado:

```bash
node --require ./instrumentation.js app.js
```

Devemos ver:
```
OpenTelemetry initialized
Greeting service listening on port 3000
```

---

## Passo 6: Enviar uma requisição de teste

Abra um novo terminal e envie uma requisição:

```bash
# Different names to see various traces
curl http://localhost:3000/hello/Bob
curl http://localhost:3000/hello/Charlie
curl http://localhost:3000/hello/Maria
```
ou
```
# Names with different lengths (to see message.length attribute vary)
curl http://localhost:3000/hello/Jo
curl http://localhost:3000/hello/Alexander
```
ou
```
# Generate multiple traces quickly
for name in Alice Bob Charlie David Emma; do
  curl http://localhost:3000/hello/$name
  echo ""
done
```

**Resposta esperada:**
```json
{
  "message": "Hello, {name}! Welcome to OpenTelemetry tracing.",
  "timestamp": "2024-01-09T10:30:00.000Z"
}
```
---

## Passo 7: Ver o trace no Jaeger

1. Abra http://localhost:16686
2. Selecione **"greeting-service"** no dropdown de Service
3. Clique em **"Find Traces"**
4. Clique em um trace

**No Jaeger, você vai ver o waterfall do trace:**
- **Span raiz**: `GET /hello/:name` (rota Express - auto-instrumentação)
- **Span do request handler**: `request handler - /hello/:name` (middleware Express - auto-instrumentação)  
- **Span de lógica de negócio**: `create_greeting` (nosso span manual)
- **Span de sub-operação**: `format_message` (nosso span manual aninhado)
- **Events**: Marcadores na timeline mostrando as etapas de processamento
- **Timing**: Quanto tempo cada operação levou (103ms no total, no exemplo)

![Jaeger trace example](images/day9-jaeger-trace.png)

A estrutura completa do trace tem 4 níveis:
```
GET /hello/:name (Express route)
└── request handler - /hello/:name (Express middleware)
    └── create_greeting (our manual span)
        └── format_message (our nested span)
```

**O que cada span representa:**
1. **Span de requisição HTTP** - O ciclo de vida geral da requisição HTTP
2. **Span do request handler** - O Express processando a rota específica
3. **Span de lógica de negócio** - Nossa lógica de criação da saudação
4. **Span de sub-operação** - A etapa de formatação da mensagem

Isso mostra como a auto-instrumentação e a instrumentação manual trabalham juntas. O Express cria o contexto HTTP automaticamente, e nossos spans manuais adicionam contexto de lógica de negócio por cima.

---
## O que aconteceu aqui?

Vamos entender o código que escrevemos:

### 1. Auto-instrumentação (isso a gente não escreveu)

A auto-instrumentação do Express criou o span raiz automaticamente:
```javascript
// This happened automatically when the request arrived
GET /hello/Alice
  http.request.method = "GET"
  http.route = "/hello/:name"
  http.response.status_code = 200
```

### 2. Nossa instrumentação manual (isso a gente escreveu)

Envolvemos nossa lógica de negócio em spans:

```javascript
tracer.startActiveSpan('create_greeting', (span) => {
  span.setAttribute('user.name', 'name');
  span.setAttribute('greeting.type', 'personal');
  
  // ... more business logic ...
  
  span.end();
});
```

**Métodos-chave da API que usamos:**
- `trace.getTracer()` → Pega um tracer (conceito do [Dia 6](../semana1/dia6.md): quem cria os spans)
- `tracer.startActiveSpan()` → Cria um span (conceito do [Dia 4](../semana1/dia4.md): o que tem dentro de um span)
- `span.setAttribute()` → Adiciona attributes (conceito do [Dia 5](../semana1/dia5.md): convenções semânticas)
- `span.addEvent()` → Marca um ponto no tempo
- `span.end()` → Finaliza o span


---

## Boas práticas

### Faça:
- Use `startActiveSpan()` (cria as relações de pai-filho automaticamente)
- Sempre chame `span.end()` (ou deixe o callback fazer isso)
- Adicione attributes significativos (`user.name`, `message.length`)
- Use events para marcar momentos importantes

### Não faça:
- Esquecer de chamar `span.end()`
- Criar spans para operações triviais
- Usar timestamps ou IDs aleatórios como nomes de span

---

## Troubleshooting

### "Não estou vendo traces no Jaeger"

**Checklist:**
1. O Jaeger está rodando? Confira em http://localhost:16686
2. Você iniciou o app com `--require ./instrumentation.js`?
3. Você está chamando `span.end()`?
4. Confira o console em busca de erros

### "Meus spans aninhados não aparecem como filhos"

Provavelmente você está usando `tracer.startSpan()` em vez de `tracer.startActiveSpan()`. Use `startActiveSpan()` para definir automaticamente as relações de pai-filho.

### "Os attributes estão faltando"

Certifique-se de chamar `span.setAttribute()` **antes** de `span.end()`.

---

## O que eu levo para o Dia 10

Hoje aprendemos o básico da **Tracing API** com um serviço simples de saudação:

**Habilidades-chave:**
- Configurar o OpenTelemetry com Express
- Criar spans manuais com `tracer.startActiveSpan()`
- Adicionar attributes com `span.setAttribute()`
- Registrar events com `span.addEvent()`
- Criar spans aninhados para relações de pai-filho
- Visualizar traces no Jaeger

**O padrão básico:**
```javascript
tracer.startActiveSpan('operation_name', (span) => {
  span.setAttribute('key', 'value');
  span.addEvent('milestone_reached');
  
  // Do work here
  
  span.end();
});
```

**Amanhã (Dia 10)** vamos aprender o básico da **Metrics API**.

Nos vemos no Dia 10!
