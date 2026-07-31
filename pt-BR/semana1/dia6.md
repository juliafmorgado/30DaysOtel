# Dia 6 – Instrumentação: Como os Dados de Observabilidade São Criados

Nos últimos três dias aprendemos a ler dados de observabilidade:
- [**Dia 3:**](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day3.md) Três sinais: traces (a jornada de uma requisição), metrics (padrões agregados), logs (detalhes de eventos)
- [**Dia 4:**](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day4.md) Spans = os blocos que formam os traces (com attributes, tempos, relações pai-filho)
- [**Dia 5:**](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day5.md) Convenções semânticas = nomes padronizados para que os dados fiquem alinhados entre os serviços

Hoje vamos responder: **De onde vêm, de fato, os dados de observabilidade? Quem cria os spans, metrics e logs que estamos estudando a semana toda?**

## A verdade central: dados de observabilidade não aparecem do nada, alguém os cria

Quando olhamos para um trace como este:

```
POST /pay (1200ms)
├─ Validate input (5ms)
├─ GET /config/rates (900ms)
│  └─ SELECT * FROM rates (800ms)
└─ Process payment (50ms)
```

Ou um dashboard de metric mostrando "requests per second", ou linhas de log dizendo "payment processed successfully" — tudo isso existe porque **algum código decidiu registrar aquela informação**.

Esse código responsável por registrar chama-se **instrumentação**.

Esses dados podem ser criados de duas formas fundamentalmente diferentes:

1. **Auto-instrumentação** — código adicionado em tempo de execução que envolve bibliotecas/frameworks existentes para capturar dados de observabilidade automaticamente, sem você precisar mexer no código da sua aplicação
2. **Instrumentação manual** — você escreve código explicitamente para registrar dados de observabilidade

O motivo de as duas existirem tem a ver com **o que cada uma consegue enxergar**:
- **Auto-instrumentação** enxerga chamadas de biblioteca (HTTP, bancos de dados, filas)
- **Instrumentação manual** enxerga a sua lógica de negócio (validar pagamento, calcular risco, processar pedido)

Vamos entender cada uma direitinho.

## Auto-instrumentação: observabilidade sem precisar tocar no código da aplicação

Auto-instrumentação é quando o OpenTelemetry instala "sensores" em volta das bibliotecas populares que já usamos (Express, axios, pg, etc.), que ficam observando o comportamento da nossa aplicação e criam telemetry automaticamente para as operações mais comuns. Pense nisso como um sistema de câmeras de segurança. Não precisamos tirar uma foto manualmente toda vez que alguém passa por uma porta. A câmera já captura o movimento sozinha nos pontos de entrada principais.

### O que a auto-instrumentação registra

**Para traces**, ela cria spans para:
- Requisições HTTP recebidas
- Requisições HTTP enviadas
- Consultas ao banco de dados
- Operações em filas de mensagens
- Chamadas de cache
- Chamadas gRPC

**Para metrics**, ela registra:
- Contagem de requisições
- Duração das requisições
- Requisições ativas
- Contagem de erros

**Para logs**, ela pode enriquecer seus logs existentes com contexto de trace (trace IDs, span IDs)

Tudo isso acontece **automaticamente** assim que você habilita.

### Um exemplo concreto: antes e depois da auto-instrumentação

#### **Antes (sem nenhum código de observabilidade)**

```javascript
// app.js - just plain application code
const express = require('express');
const { Client } = require('pg');

const app = express();
const db = new Client({ connectionString: 'postgresql://localhost/mydb' });

app.get('/users/:id', async (req, res) => {
  const result = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
  res.json(result.rows[0]);
});

app.listen(3000);
```

**Que dados de observabilidade você tem aqui?** Nenhum. Sem traces, sem metrics, sem correlação.

#### **Depois de habilitar a auto-instrumentação:**

Você cria **um único arquivo de setup** (separado do código da sua aplicação):

```javascript
// instrumentation.js
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'user-service',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
  }),
  traceExporter: new OTLPTraceExporter({
    url: 'http://localhost:4318/v1/traces',
  }),
  instrumentations: [getNodeAutoInstrumentations()], // ← The magic line
});

sdk.start();

console.log('OpenTelemetry initialized');
```

**Rode sua aplicação carregando esse arquivo de setup primeiro:**

```bash
node --require ./instrumentation.js app.js
```

A flag `--require` diz ao Node.js para carregar o arquivo de instrumentação antes do código da sua aplicação rodar. Isso dá ao OpenTelemetry a chance de envolver suas bibliotecas antes que elas sejam usadas.

> [!IMPORTANT]
>
> A instrumentação do OpenTelemetry é uma instrumentação em tempo de execução, ou seja, ela precisa estar ativa enquanto sua aplicação está rodando.
>
> Se qualquer parte parar de funcionar, o pipeline de telemetry quebra.

**Como você pode ver, o código da nossa aplicação (`app.js`) não mudou em nada.** Mas agora, quando alguém chama `GET /users/123`:

**Você ganha traces:**
```
Trace abc123
└─ GET /users/:id (45ms)
   └─ SELECT users (40ms)
```

**Com convenções semânticas aplicadas automaticamente:**
```
Span: GET /users/:id
  http.request.method = "GET"
  http.route = "/users/:id"
  http.response.status_code = 200
  http.target = "/users/123"

Span: SELECT users
  db.system = "postgresql"
  db.statement = "SELECT * FROM users WHERE id = $1"
  db.operation = "SELECT"
```

**Você ganha metrics:**
```
http.server.request.duration (histogram)
http.server.active_requests (gauge)
db.client.operation.duration (histogram)
```

**Você ganha logs correlacionados** (se estiver usando uma biblioteca de log):
```
[trace_id=abc123 span_id=def456] GET /users/123 - 200 OK
```

Tudo isso com **zero alterações no código da sua aplicação**. É esse o poder da auto-instrumentação.

### Como a auto-instrumentação funciona? (sem mágica, só um "embrulho")

Auto-instrumentação usa uma técnica chamada **monkey-patching** ou **wrapping**.

Aqui está o que acontece, em bom português:

1. Seu arquivo de instrumentação carrega primeiro
2. O OpenTelemetry encontra a biblioteca Express
3. Ele envolve a função de tratamento de rotas do Express:

```javascript
// Simplified: what OpenTelemetry does behind the scenes
const originalRouteHandler = express.Router.handle;

express.Router.handle = function wrappedHandler(req, res, next) {
  // Start a span
  const span = tracer.startSpan(`${req.method} ${req.route.path}`);
  span.setAttribute('http.request.method', req.method);
  span.setAttribute('http.route', req.route.path);
  
  // Call the original function (your code runs)
  const result = originalRouteHandler.call(this, req, res, next);
  
  // End the span
  span.setAttribute('http.response.status_code', res.statusCode);
  span.end();
  
  return result;
};
```

Seu código chama as funções do Express normalmente. Mas agora essas funções já vêm com observabilidade embutida.

**A mesma coisa acontece com bibliotecas de banco de dados, clientes HTTP, tudo.**

Isso é poderoso porque:
- O código da sua aplicação continua limpo
- As convenções semânticas são aplicadas automaticamente
- Você pode habilitar/desabilitar a instrumentação sem mudar código
- Atualizações de biblioteca te dão mais observabilidade de graça

>[!NOTE]
> A maioria dos pacotes de auto-instrumentação do OpenTelemetry cobre as bibliotecas mais usadas em cada ecossistema de linguagem. Sempre confira o que está disponível para a sua linguagem:
> - **Node.js:** https://www.npmjs.com/package/@opentelemetry/auto-instrumentations-node
> - **Python:** https://github.com/open-telemetry/opentelemetry-python-contrib/tree/main/instrumentação
> - **Java:** https://github.com/open-telemetry/opentelemetry-java-instrumentação

### O que a auto-instrumentação NÃO consegue ver

Auto-instrumentação só enxerga **as fronteiras das bibliotecas**. Ela não consegue entender a sua lógica de negócio personalizada.

**Exemplo de um endpoint de pagamento:**

```javascript
app.post('/pay', async (req, res) => {
  // ✅ Auto-instrumentation sees this (Express handling HTTP request)
  
  validatePaymentRules(req.body);  // ❌ Not instrumented (your custom function)
  
  const risk = calculateRiskScore(req.body);  // ❌ Not instrumented (your custom function)
  
  await db.query('INSERT INTO payments...');   // ✅ Auto-instrumentation sees this (PostgreSQL)
  
  sendConfirmationEmail(req.body.email);  // ❌ Not instrumented (your custom function)
  
  res.json({ success: true });  // ✅ Auto-instrumentation sees this (Express response)
});
```

**Seu trace com APENAS auto-instrumentação:**

```
POST /pay (500ms)
└─ INSERT payments (50ms)
```

**O problema:** a requisição levou 500ms, o banco de dados levou 50ms. Para onde foram os outros 450ms?

Você sabe que estão *em algum lugar* do seu código, mas não consegue ver onde. As funções customizadas (`validatePaymentRules`, `calculateRiskScore`, `sendConfirmationEmail`) são invisíveis para a auto-instrumentação.

**É essa lacuna que a instrumentação manual preenche.**

## Instrumentação manual: observabilidade que você cria explicitamente

Instrumentação manual significa **você escrever código que cria dados de observabilidade para as suas operações customizadas**.

É aqui que você instrumenta:
- Funções de lógica de negócio (`validatePayment`, `calculateRisk`)
- Algoritmos customizados (roteamento, precificação, recomendações)
- Etapas internas de processamento
- Operações que usam protocolos/bibliotecas que não têm auto-instrumentação

Pense na auto-instrumentação como câmeras na entrada do prédio (fronteiras externas). A instrumentação manual é como adicionar câmeras dentro de salas específicas para enxergar o trabalho interno.

### O que "manual" realmente significa?

Instrumentação manual significa chamar funções da **OpenTelemetry API**.

> [!IMPORTANT]
> **Espera, o que é uma "API"?**
> 
> "API" significa "Application Programming Interface" (Interface de Programação de Aplicações), mas isso é jargão técnico. Aqui está o que isso significa em termos simples:
>
> **Uma API é um conjunto de funções que você pode chamar no seu código.**
>
> Quando falamos "OpenTelemetry API", queremos dizer: **o OpenTelemetry te dá funções que você pode chamar para criar dados de observabilidade.**
>
> Exemplos dessas funções:
> - `trace.getTracer()` — pega uma ferramenta para criar spans
> - `tracer.startSpan()` — começa a registrar uma operação com tempo
> - `span.setAttribute()` — adiciona contexto à operação
> - `span.end()` — para de registrar
> - `meter.createCounter()` — cria um contador de metric
> - `counter.add(1)` — incrementa o contador
>
> **Na verdade, já estamos aprendendo sobre essas funções a semana toda, sem perceber:**
>
> - **Dia 4:** quando você aprendeu `span.setAttribute('user.id', '12345')` — isso é a OpenTelemetry API
> - **Dia 5:** quando você aprendeu convenções semânticas como `http.request.method` — elas são usadas JUNTO com a OpenTelemetry API
>
> **Auto-instrumentação e instrumentação manual usam a mesma API.** A única diferença é:
> - Auto-instrumentação: as bibliotecas chamam essas funções por nós
> - Instrumentação manual: nós mesmos chamamos essas funções

### O mesmo exemplo de pagamento, agora com instrumentação manual

Vamos adicionar instrumentação manual para enxergar essas operações escondidas:

```javascript
const { trace } = require('@opentelemetry/api');

app.post('/pay', async (req, res) => {
  const tracer = trace.getTracer('payment-service');
  
  // Manual span #1: Validate payment rules
  const validateSpan = tracer.startSpan('validate_payment_rules');
  try {
    validatePaymentRules(req.body);
    validateSpan.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    validateSpan.recordException(error);
    validateSpan.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    throw error;
  } finally {
    validateSpan.end();
  }
  
  // Manual span #2: Calculate risk score
  const riskSpan = tracer.startSpan('calculate_risk_score');
  const risk = calculateRiskScore(req.body);
  riskSpan.setAttribute('payment.risk_score', risk);
  riskSpan.setAttribute('payment.amount', req.body.amount);
  riskSpan.setAttribute('payment.currency', req.body.currency);
  riskSpan.end();
  
  // Auto-instrumented span: Database call (library creates this automatically)
  await db.query('INSERT INTO payments VALUES ...');
  
  // Manual span #3: Send confirmation email
  const emailSpan = tracer.startSpan('send_confirmation_email');
  await sendConfirmationEmail(req.body.email);
  emailSpan.setAttribute('email.recipient', req.body.email);
  emailSpan.end();
  
  res.json({ success: true });
});
```

**Agora nosso trace mostra tudo:**

```
POST /pay (500ms)
├─ validate_payment_rules (10ms)
├─ calculate_risk_score (5ms)
├─ INSERT payments (50ms)
└─ send_confirmation_email (400ms)  ← Achamos o gargalo!
```

A operação de e-mail está levando 400ms. Você verifica o status do provedor de e-mail e vê que eles estão com uma instabilidade. **Problema identificado em segundos.**

### Instrumentação manual para metrics

Também podemos registrar metrics manualmente:

```javascript
const { metrics } = require('@opentelemetry/api');

const meter = metrics.getMeter('payment-service');

// Create a counter
const paymentCounter = meter.createCounter('payments.processed', {
  description: 'Number of payments processed'
});

// Create a histogram for payment amounts
const paymentAmount = meter.createHistogram('payment.amount', {
  description: 'Payment amount distribution'
});

// In your code:
app.post('/pay', async (req, res) => {
  // ... payment processing ...
  
  paymentCounter.add(1, {
    'payment.method': req.body.method,
    'payment.currency': req.body.currency
  });
  
  paymentAmount.record(req.body.amount, {
    'payment.currency': req.body.currency
  });
  
  res.json({ success: true });
});
```

Agora conseguimos perguntar: "Quantos pagamentos com cartão de crédito em USD foram processados na última hora?"

### Instrumentação manual para logs

Podemos emitir logs estruturados com correlação de trace:

```javascript
const { trace } = require('@opentelemetry/api');
const logger = require('winston');

app.post('/pay', async (req, res) => {
  const span = trace.getActiveSpan();
  const traceId = span.spanContext().traceId;
  const spanId = span.spanContext().spanId;
  
  logger.info('Payment processing started', {
    trace_id: traceId,
    span_id: spanId,
    payment_amount: req.body.amount,
    payment_method: req.body.method
  });
  
  // ... payment logic ...
});
```

Agora nossos logs ficam correlacionados com os traces. Podemos buscar logs por trace ID e ver exatamente o que aconteceu naquela requisição específica.

## Como auto e instrumentação manual trabalham juntas

Não escolhemos uma ou outra. Usamos **as duas**, e elas se complementam.

```
┌─────────────────────────────────────────────────────┐
│ Our Application Code                               │
│                                                      │
│ app.post('/pay', async (req, res) => {             │
│   validatePayment(req.body);  ← Manual span needed │
│   await db.query(...);        ← Auto span created  │
│ });                                                  │
└─────────────────────────────────────────────────────┘
                        ↓
        ┌──────────────────────────────────┐
        │                                  │
        ↓                                  ↓
┌──────────────────┐          ┌──────────────────────┐
│ Auto             │          │ Manual               │
│ instrumentation  │          │ instrumentation      │
│                  │          │                      │
│ • HTTP requests  │          │ • Business logic     │
│ • DB queries     │          │ • Custom functions   │
│ • Cache calls    │          │ • Domain operations  │
│ • Message queues │          │ • Your unique code   │
└──────────────────┘          └──────────────────────┘
        │                                  │
        └──────────────┬───────────────────┘
                       ↓
        ┌──────────────────────────────────┐
        │ OpenTelemetry API                │
        │                                  │
        │ Both use the same functions:    │
        │ • startSpan()                   │
        │ • setAttribute()                │
        │ • createCounter()               │
        │ • record()                      │
        └──────────────────────────────────┘
                       ↓
        ┌──────────────────────────────────┐
        │ OpenTelemetry SDK                │
        │                                  │
        │ • Collects all telemetry        │
        │ • Applies sampling              │
        │ • Batches data                  │
        │ • Sends to backend              │
        └──────────────────────────────────┘
                       ↓
              Backend (Jaeger, Dash0, etc.)
```

**O insight chave:** auto-instrumentação e instrumentação manual usam a mesma OpenTelemetry API. Elas não são sistemas concorrentes — são duas formas de chamar as mesmas funções.

**A estratégia deve ser:**

1. **Comece com auto-instrumentação** — ganhe 80% de cobertura sem mudar uma linha de código
2. **Identifique as lacunas** — olhe os traces e procure "tempo sem explicação"
3. **Adicione instrumentação manual** — preencha essas lacunas com contexto de negócio
4. **Itere** — vá adicionando mais instrumentação manual conforme descobrir o que precisa enxergar

## O maior erro de iniciante (e como evitá-lo)

É tentador querer instrumentar *tudo*. Não faça isso.

Spans demais:
- Deixam os traces ilegíveis (você não enxerga a floresta de tanta árvore)
- Adicionam overhead de performance
- Custam dinheiro em armazenamento
- Escondem os problemas importantes

**Regra prática para instrumentação manual:**

**INSTRUMENTE:**
- Operações que levam um tempo relevante (>5ms)
- Lógica crítica para o negócio (processamento de pagamento, cumprimento de pedidos)
- Operações que falham de formas interessantes (chamadas a APIs externas)
- Qualquer coisa que já te deu trabalho para debugar antes

**NÃO INSTRUMENTE:**
- Funções auxiliares minúsculas (<1ms)
- Transformações de dados puras (formatação, parsing)
- Getters/setters
- As próprias operações de logging

**Em vez de criar um span para operações triviais, apenas adicione um attribute ao span pai:**

```javascript
// Don't do this
const span = tracer.startSpan('calculate_item_count');
const count = items.length;
span.end();

// Do this instead
span.setAttribute('order.item_count', items.length);
```

## O que eu levo para o Dia 7

O insight central de hoje: **dados de observabilidade (spans, metrics, logs) são criados pela instrumentação. A auto-instrumentação cuida da infraestrutura automaticamente. A instrumentação manual cuida da sua lógica de negócio. As duas usam as mesmas OpenTelemetry APIs. Sistemas reais precisam das duas.**

Amanhã fazemos uma revisão da Semana 1 e amarramos tudo o que aprendemos até aqui.

Nos vemos no Dia 7!
