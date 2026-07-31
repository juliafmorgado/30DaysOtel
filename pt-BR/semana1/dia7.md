# Dia 7 – Revisão da Semana 1

A gente cobriu bastante coisa em seis dias. Hoje é uma pausa. Uma chance de conectar tudo que aprendemos e ver como as peças se encaixam.

Vamos revisitar os conceitos principais, adicionar detalhes importantes que passamos batido e mostrar o quadro completo de como o OpenTelemetry e a observabilidade realmente funcionam.

Até o final de hoje, vamos ter:
- Um mapa mental claro dos Dias 1-6
- Entendimento do que realmente estivemos aprendendo (spoiler: as APIs!)
- As peças que faltavam para conectar tudo
- Confiança nos fundamentos
- Preparo para a Semana 2 (onde a gente vai colocar a mão na massa)

## A jornada até aqui: o que aprendemos

### [Dia 1](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day1.md): Por que observabilidade importa

Sistemas modernos são complexos demais para entender só olhando o código ou os logs. Quando algo quebra em produção, a gente precisa de visibilidade sobre o que está realmente acontecendo em todos os nossos serviços.

**O que aprendemos:**
- A migração de monólitos para microsserviços tornou o debugging exponencialmente mais difícil
- O monitoramento tradicional (CPU, memória, disco) não responde "por que o fluxo de checkout está lento?"
- Não dá para prever todo modo de falha, então a gente precisa conseguir fazer novas perguntas ao nosso sistema em produção
- Observabilidade é sobre conseguir entender o comportamento do sistema de fora, sem precisar dar deploy de código novo

**O modelo mental que construímos:**
```
Old way (monoliths):
- One codebase, one process
- Add a log line, redeploy, read logs
- Debugging = add print statements

New way (microservices):
- 50+ services, hundreds of instances
- Request touches 10+ services
- Can't redeploy to debug
- Need to understand without changing code
```

### [Dia 2](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day2.md): O que é OpenTelemetry?

Antes do OpenTelemetry, cada fornecedor de observabilidade tinha seu próprio formato proprietário e seu próprio SDK. A gente escrevia código de instrumentação que nos prendia a um único fornecedor. O OpenTelemetry resolveu isso criando APIs padronizadas que permitem flexibilidade de fornecedor.

**O que aprendemos:**
- O OpenTelemetry padroniza como criamos e coletamos telemetry
- Ele permite flexibilidade de fornecedor através da separação entre API e SDK
- Os principais fornecedores adotaram ele como padrão da indústria

**O modelo mental que construímos:**
```
Before OpenTelemetry:
- Vendor X SDK → Vendor X backend only
- Want to switch vendors? Rewrite all instrumentation

With OpenTelemetry:
- OpenTelemetry API → Multiple SDK implementations possible
- Write instrumentation once
- Use different SDK implementations without changing code
- Same standards across languages (Go, Node.js, Python, Java, etc.)
```

### [Dia 3](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day3.md): A forma de uma requisição distribuída

Uma requisição em um sistema distribuído não é uma operação só. É uma cadeia de operações passando por vários serviços, cada um esperando o próximo. A observabilidade nos dá três lentes diferentes para entender o que está acontecendo.

**O que aprendemos:**
- Como um único clique do usuário vira múltiplos saltos de rede
- Por que "a requisição levou 1200ms" não nos diz muita coisa
- Os três sinais da observabilidade: traces (a jornada de uma requisição), metrics (padrões agregados) e logs (detalhes de eventos)
- Como cada sinal responde perguntas diferentes
- Por que context propagation é crítico

**O modelo mental que construímos:**
```
User clicks "Pay"
    ↓
Payment Service processes request
    ↓ (calls)
Config Service fetches exchange rates
    ↓ (calls)
Database returns rates
    ↓ (returns to)
Config Service
    ↓ (returns to)
Payment Service
    ↓ (returns to)
User

Three ways to observe this:
- Metrics: "Payment latency spiked at 14:35"
- Traces: "This request spent 800ms in the database"
- Logs: "Query timeout: connection pool exhausted"
```


### [Dia 4](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day4.md): Spans=os blocos de construção

Um trace não é um blob de dados só. É uma árvore de spans, onde cada span é um pedaço de trabalho cronometrado.

**O que aprendemos:**
- O que é um span (nome da operação, horário de início, duração, relação com o pai)
- Como spans formam hierarquias (relações parent-child)
- O que são attributes (contexto em formato chave-valor, tipo `http.request.method = "POST"`)
- O que são resources (metadados sobre o próprio serviço)
- Como ler um waterfall chart

**O modelo mental que construímos:**
```
Trace = one request's journey
Span = one step in that journey
Attributes = what happened in this step
Resources = who performed this step
Parent-child = how steps connect
```

### [Dia 5](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day5.md): Convenções semânticas=a linguagem compartilhada

Attributes precisam de nomes padronizados, senão a telemetry de serviços diferentes fica incompatível e não dá para analisar tudo junto.

**O que aprendemos:**
- Por que usar `http.request.method` em vez de `request_method` ou simplesmente `method`
- Como convenções semânticas tornam possível fazer queries entre serviços diferentes
- A diferença entre attributes de infraestrutura (`http.*`, `db.*`) e attributes de negócio (`payment.*`, `order.*`)
- Por que bibliotecas de instrumentação aplicam as conventions automaticamente

**O modelo mental que construímos:**
```
Without conventions:
  Service A: request_method = "POST"
  Service B: http.request.method = "POST"
  Service C: method = "POST"
  → Can't query across services

With conventions:
  All services: http.request.method = "POST"
  → One query works everywhere
```

### [Dia 6](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day6.md): Instrumentação=como a telemetry é criada

Dados de telemetry não aparecem magicamente. Eles são criados por código de instrumentação, seja automaticamente (envolvendo bibliotecas) ou manualmente (código que a gente mesmo escreve).

**O que aprendemos:**
- Auto-instrumentação cuida da infraestrutura (HTTP, bancos de dados) automaticamente
- Instrumentação manual cuida da lógica de negócio que a gente escreve
- As duas trabalham juntas no mesmo trace usando as mesmas APIs

**O modelo mental que construímos:**
```
Auto-instrumentation = skeleton (HTTP, DB, queues)
Manual instrumentation = muscles (business logic)
Production systems need both

Both call the same API functions:
- Auto: Libraries call tracer.startSpan() for you
- Manual: You call tracer.startSpan() yourself
```

## O quadro completo: como tudo se conecta

Vamos percorrer uma requisição do início ao fim, conectando tudo que vimos dos Dias 3 ao 6.

### Passo 1: A ação do usuário dispara uma requisição

Um usuário clica em "Pagar" no nosso app. Isso vira uma requisição HTTP POST para o nosso Payment Service.

### Passo 2: Auto-instrumentação cria a telemetry

Nosso Payment Service está rodando com auto-instrumentação do OpenTelemetry habilitada.

Quando a requisição HTTP chega, a **instrumentação do Express** automaticamente:
1. Gera um novo trace ID (`abc123`)
2. Cria um span para a requisição HTTP
3. Aplica as convenções semânticas
4. Cria uma metric para contagem de requisições
5. Enriquece os logs com o contexto do trace

```
Span (auto-created by Express instrumentation):
  trace_id: abc123
  span_id: span-001
  parent_span_id: null  ← Root span
  name: "POST /pay"
  
  Attributes (semantic conventions applied automatically):
    http.request.method = "POST"
    http.route = "/pay"
    http.response.status_code = 200
  
  Resource (configured in our setup):
    service.name = "payment-service"
    service.version = "2.3.1"
```

**A gente não escreveu uma linha de código para isso.** A auto-instrumentação cuidou de tudo.

### Passo 3: Nossa lógica de negócio roda (instrumentação manual)

Dentro do nosso handler de pagamento, temos lógica de negócio customizada. Queremos visibilidade sobre isso, então adicionamos instrumentação manual.

```javascript
async function processPayment(req, res) {
  // Auto-instrumentation created the HTTP span
  // Now we create our own span for business logic
  
  const span = tracer.startSpan('process_payment');
  
  // Add business context using semantic conventions
  span.setAttribute('payment.amount', req.body.amount);
  span.setAttribute('payment.currency', req.body.currency);
  span.setAttribute('user.id', req.body.userId);
  
  // Record a custom metric
  paymentCounter.add(1, {
    'payment.method': req.body.method,
    'payment.currency': req.body.currency
  });
  
  try {
    await validatePayment(req.body);
    const exchangeRate = await getExchangeRate(req.body.currency);
    span.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR });
    throw error;
  } finally {
    span.end();
  }
}
```

**Isso cria telemetry adicional:**
- Um child span para `process_payment` com attributes de negócio
- Uma counter metric rastreando o processamento de pagamentos
- Rastreamento de exceções caso algo dê errado

### Passo 4: Chamada para um serviço downstream (auto-instrumentação de novo)

Quando nosso código chama `getExchangeRate()`, que faz uma requisição HTTP para o Config Service:

A **instrumentação do cliente HTTP** automaticamente:
1. Cria um span para a chamada HTTP de saída
2. Propaga o contexto do trace (passa o `abc123` para o Config Service)
3. Registra o tempo e os detalhes HTTP
4. Cria metrics para a requisição de saída

### Passo 5: O Config Service recebe a requisição

O Config Service também tem auto-instrumentação habilitada. Quando ele recebe a requisição HTTP com o contexto do trace propagado:

1. Ele vê o header `traceparent` com o trace ID `abc123`
2. Ele cria um novo span que faz parte do mesmo trace
3. Ele continua registrando metrics
4. Seus logs recebem o mesmo trace ID

### Passo 6: Query no banco de dados (auto-instrumentação, tipo diferente)

Dentro do Config Service, o código faz uma query no PostgreSQL. A **instrumentação do PostgreSQL** automaticamente:
1. Cria um span para a query no banco
2. Registra a query SQL
3. Captura o tempo
4. Cria metrics específicas do banco de dados

### Passo 7: O quadro completo

Quando toda a telemetry é coletada e enviada para o nosso backend de observabilidade, temos:

**Traces mostrando o fluxo completo da requisição:**
```
Trace abc123:
  
  span-001: POST /pay (Payment Service)         [0ms ────────── 1200ms]
    │
    └─ span-002: process_payment                [10ms ──── 1190ms]
         │
         └─ span-003: GET /exchange-rate        [100ms ─ 1100ms]
              │
              └─ span-004: GET /exchange-rate   [105ms - 1095ms]
                   │       (Config Service)
                   │
                   └─ span-005: SELECT rates    [110ms - 1090ms]
                                (PostgreSQL)
```

**Metrics mostrando padrões agregados:**
```
http.server.request.count{service="payment-service", route="/pay"}: 1,247
http.server.request.duration{service="payment-service", route="/pay"}: avg 450ms
payments.processed{method="credit_card", currency="USD"}: 892
db.client.operation.duration{operation="SELECT"}: avg 980ms
```

**Logs com correlação de trace:**
```
[trace_id=abc123 span_id=span-002] Payment processing started
[trace_id=abc123 span_id=span-004] Fetching exchange rate for USD
[trace_id=abc123 span_id=span-005] Query executed in 980ms
```

Os três sinais trabalhando juntos para nos dar visibilidade completa.

## O que realmente estivemos aprendendo: as APIs do OpenTelemetry

Aqui vai algo importante que talvez não tenha ficado óbvio:

**A semana toda, estivemos aprendendo SOBRE as APIs do OpenTelemetry.**

Vamos deixar isso explícito:

### Dia 3 = As três APIs (Tracing, Metrics, Logs)

Quando aprendemos sobre traces, metrics e logs, estávamos aprendendo sobre **as três APIs do OpenTelemetry**:

```javascript
// These are the three APIs:
const tracer = trace.getTracer('my-service');    // Tracing API
const meter = metrics.getMeter('my-service');    // Metrics API
const logger = logs.getLogger('my-service');     // Logs API
```

### Dia 4 = O data model da Tracing API

Quando aprendemos sobre spans, attributes e relações, estávamos aprendendo **o que a Tracing API oferece**:

```javascript
// These are all Tracing API methods:
const span = tracer.startSpan('operation_name');
span.setAttribute('key', 'value');
span.setStatus({ code: SpanStatusCode.OK });
span.end();
```

Os conceitos do Dia 4 (nome do span, attributes, relações parent-child) são o **data model** da Tracing API.

### Dia 5 = Como usar TODAS as APIs corretamente

Convenções semânticas são a **forma padronizada de usar as APIs do OpenTelemetry**:

```javascript
// Without semantic conventions:
span.setAttribute('method', 'POST');           // ❌ Non-standard
counter.add(1, { 'type': 'payment' });        // ❌ Non-standard

// With semantic conventions:
span.setAttribute('http.request.method', 'POST');      // ✅ Standard
counter.add(1, { 'payment.method': 'cc' });   // ✅ Standard
```

O mesmo vale para metrics e logs. Convenções semânticas nos dizem os nomes corretos de attributes a usar.

### Dia 6 = QUEM chama as APIs

Instrumentação é sobre **quem está chamando a API**:

```javascript
// Auto-instrumentation = library calls the API for us
// (Express library creates spans automatically using the Tracing API)

// Manual instrumentation = we call the API ourselves
const span = tracer.startSpan('my_business_logic');
span.setAttribute('order.id', orderId);
span.end();

const counter = meter.createCounter('payments.processed');
counter.add(1, { 'payment.method': 'credit_card' });
```

**As duas usam as mesmas APIs do OpenTelemetry.** A diferença é quem escreve o código que as chama.

Pense nisso como câmeras de segurança:
- **Auto-instrumentação** = câmeras nos corredores, entradas, estacionamentos (infraestrutura que todo mundo precisa)
- **Instrumentação manual** = câmeras em salas específicas para as nossas necessidades particulares (lógica de negócio)
- **As APIs** = o próprio sistema de câmeras (o mesmo para os dois tipos de câmera)

## A sacada: a gente já sabe o que as APIs fazem

**A Semana 2 é quando vamos praticar chamando essas APIs com as próprias mãos.**

## O que vem a seguir

O **Dia 8** é sobre entender por que a API e o SDK são separados. Essa separação permite flexibilidade de fornecedor e liberdade de escolha de implementação, para que a gente possa usar diferentes implementações de SDK sem mudar o código de instrumentação.

Se quiser, teste seu conhecimento com esse [quiz](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/knowledge-check.md).

Vamos construir alguma coisa!
