# Dia 5 – Convenções Semânticas: A Linguagem Compartilhada da Observabilidade

Ontem aprendemos que spans têm attributes como `http.request.method = "POST"` e `db.statement = "SELECT * FROM rates"`. A pergunta de hoje é: **Por que esses nomes específicos? Por que não `request_method` ou `sql_query`?**

A resposta revela algo fundamental sobre como observabilidade realmente funciona em escala.

## O problema: caos sem padrões

Imagine três times construindo microsserviços:

**Payment Service (Go):**
```
request_method: "POST"
request_path: "/pay"
```

**Config Service (Java):**
```
http.request.method: "GET"
url.full: "https://api.example.com/config/rates"
```

**User Service (Python):**
```
method: "GET"
route: "/users/:id"
```

Agora tente responder: **"Me mostra todos os erros 500 em todos os serviços."**

Você não consegue. Cada serviço usa nomes de attribute diferentes. Sua ferramenta de query não sabe que `request_method`, `http.request.method` e `method` significam a mesma coisa.

**Esse é o desafio fundamental da observabilidade em sistemas distribuídos:** Você não está observando uma aplicação só. Você está observando dezenas de serviços, escritos em linguagens diferentes, por times diferentes, usando frameworks diferentes. Sem uma linguagem em comum, seus dados de telemetry são inúteis.

## A Solução: Convenções semânticas

**Convenções semânticas** são a solução do OpenTelemetry: um dicionário padrão que diz:

> "Quando você registra uma requisição HTTP, chame o método de `http.request.method`. Quando você registra uma query no database, chame ela de `db.statement`. Todo mundo usa exatamente esses nomes."

Não é só sobre nomes — é também sobre o formato dos valores:
- O método HTTP é `GET`, não `get` nem `Get`
- O sistema de database é `postgresql`, não `postgres`, `Postgres` ou `psql`

### Como convenções semânticas se conectam com tudo que já aprendemos

**Dia 3:** Traces registram a jornada de uma requisição por múltiplos serviços  
**Dia 4:** Traces são feitos de spans com attributes  
**Dia 5:** Attributes precisam de nomes padronizados, ou traces de serviços diferentes não podem ser consultados, comparados ou visualizados juntos  

Aqui está o fluxo:

<img src="images/day5-otel-observabilidade-flowchart.png.png" alt="OpenTelemetry observabilidade flowchart" width="400" height="600">

**Sem convenções semânticas, essa última etapa quebra.** Você teria traces, mas eles seriam ilhas de dados incompatíveis entre si.

>[!IMPORTANT]
>**Convenções semânticas vs attributes**
>
>Você já sabe o que são attributes. Convenções semânticas não substituem attributes. Elas só padronizam quais attributes usar para conceitos comuns.
>
>Pense assim:
>
>-Attributes são fatos
>
>-Convenções semânticas são as regras gramaticais desses fatos

## Os dois tipos de attributes

### 1. Attributes de infraestrutura (padronizados)

Esses cobrem operações que todo sistema faz: HTTP, databases, filas, RPC.

Namespaces comuns:
- `http.*` — Requisições/respostas HTTP
- `db.*` — Operações de database
- `messaging.*` — Filas de mensagens (Kafka, RabbitMQ, etc.)
- `rpc.*` — Chamadas remotas de procedimento (gRPC, etc.)

**Exemplo:**
```
http.request.method = "GET"
http.route = "/users/:id"
db.system = "postgresql"
```

### 2. Attributes de negócio (customizados, mas seguem o padrão)

Esses descrevem **o seu domínio específico**, como valores de pagamento, detalhes de pedidos, tiers de usuário etc.

**Exemplo:** Seu serviço de pagamento registra o contexto de negócio:
```
payment.amount = 49.99
payment.currency = "USD"
payment.method = "credit_card"
```

Não existe um padrão do OpenTelemetry para `payment.*` porque isso é lógica de negócio sua. Mas você ainda segue o padrão:
- Use um namespace (`payment.*`)
- Use lowercase com underscores
- Seja consistente entre os seus serviços

Isso significa que suas queries funcionam de forma consistente e que novos membros do time conseguem adivinhar os nomes dos attributes.

## Do código à query: como funciona de ponta a ponta

Vamos passar por como as convenções semânticas conectam tudo:

### Passo 1: Você escreve código normal e ele roda (local)

```javascript
// Your Express.js endpoint
app.post('/pay', async (req, res) => {
  const result = await processPayment(req.body);
  res.json(result);
});
```

### Passo 2: A instrumentação aplica as conventions automaticamente

A biblioteca Express do OpenTelemetry cria um span:
```
Span:
  name: "POST /pay"
  attributes:
    http.request.method = "POST"     ← Automatic
    http.route = "/pay"              ← Automatic
    http.response.status_code = 200  ← Automatic
```

Você não escreveu nenhum código de observabilidade. A biblioteca aplicou as convenções semânticas.

>[!NOTE]
> **O que está realmente acontecendo aqui (vamos aprender mais amanhã):**
> 
> A biblioteca Express está chamando a **OpenTelemetry Tracing API** por trás dos panos:
> ```javascript
> span.setAttribute('http.request.method', 'POST');
> span.setAttribute('http.route', '/pay');
> span.setAttribute('http.response.status_code', 200);
> ```
> 
> Amanhã (Dia 6) você vai aprender QUEM cria spans e QUANDO você precisa criá-los manualmente usando essa mesma API.

### Passo 3: O span vai para o seu observabilidade backend (global)

Esse span, junto com os spans de todos os seus outros serviços, fica armazenado no [Dash0](https://www.dash0.com/), por exemplo.

### Passo 4: Você faz a query usando nomes padronizados
```
# Find slow HTTP requests across ALL services
http.response.status_code = 200 AND duration > 1000ms
```

## A hierarquia: como as conventions se encaixam na arquitetura maior

Vamos dar um zoom out e ver onde as convenções semânticas se encaixam:

```
┌─────────────────────────────────────────────┐
│ Your Application Code                       │  ← You write this
└─────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│ Instrumentation Libraries                   │  ← Apply semantic conventions
│ (Express, PostgreSQL client, etc.)          │     automatically
└─────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│ OpenTelemetry SDK                           │  ← Sends spans to backend
└─────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│ Observabilidade Backend                     │  ← Stores spans, lets you query
│ (Dash0, Jaeger, etc.)                       │     using semantic convention names
└─────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│ Your Queries & Dashboards                   │  ← You query using convention names
│ "http.status_code >= 500"                   │
└─────────────────────────────────────────────┘
```

**As convenções semânticas são o contrato** que faz essa cadeia toda funcionar. Sem elas:
- As bibliotecas de instrumentação inventariam seus próprios nomes
- Backends diferentes esperariam formatos diferentes
- Suas queries não funcionariam entre serviços

## Resources também seguem conventions

Lembra dos resources do Dia 4? Eles descrevem *quem* criou o span. Convenções semânticas também se aplicam a resources:

```
service.name = "payment-service"
service.version = "2.3.1"
deployment.environment = "production"
k8s.cluster.name = "prod-us-east-1"
k8s.pod.name = "payment-7d8f9-abc12"
```

Isso permite filtrar traces:

```
# Show me traces from production payment service
service.name = "payment-service" AND deployment.environment = "production"

# Show me traces from the us-east-1 cluster
k8s.cluster.name = "prod-us-east-1"
```

**O padrão é o mesmo:** Nomes padronizados → Queries universais.

## Um workflow real: um exemplo do alerta até a resolução

Vamos ver como as convenções semânticas viabilizam workflows reais:

**Alerta:** "A latência p95 está alta"

**Passo 1: Metrics te dizem quando**
```
# Query your metrics
payment_service_latency_p95 > 1000ms at 14:30
```

**Passo 2: Traces te dizem onde (usando convenções semânticas)**
```
# Query for slow traces
service.name = "payment-service" AND duration > 1000ms AND timestamp > 14:30
```

**Passo 3: Abra um trace, veja spans com attributes padronizados**
```
Span: GET /config/rates (2000ms)
  Attributes:
    http.request.method = "GET"
    http.route = "/config/rates"
    http.response.status_code = 200
```

**Passo 4: Encontre a causa raiz**
O span filho mostra:
```
Span: SELECT rates (1950ms)
  Attributes:
    db.system = "postgresql"
    db.statement = "SELECT * FROM rates WHERE currency = $1"
    db.rows_returned = 150000  ← Way too many rows!
```

**Passo 5: Corrija e verifique**
Você adiciona um índice. Depois faz a query:
```
# Verify the fix
db.statement CONTAINS "SELECT * FROM rates" AND duration < 100ms
```

Cada passo funcionou porque todo mundo usou os mesmos nomes de attribute.

## Onde consultar
Especificação oficial: https://opentelemetry.io/docs/specs/semconv/

Você não precisa memorizar tudo isso. Só precisa saber onde procurar quando estiver criando spans customizados.

## O que eu levo para o Dia 6

A mensagem central de hoje: **Convenções semânticas são a razão pela qual observabilidade funciona em sistemas distribuídos. Elas são a linguagem compartilhada que permite que spans de serviços, times e linguagens diferentes sejam consultados juntos.**

A conexão com tudo o mais:
- **Dia 3:** Traces registram a jornada de uma requisição
- **Dia 4:** Traces são feitos de spans com attributes
- **Dia 5:** Attributes precisam de nomes padronizados (convenções semânticas), ou o sistema desmorona

Amanhã vamos falar sobre **instrumentação**: como os spans realmente são criados no seu código. Vamos aprender a diferença entre auto-instrumentação (as libraries fazem isso por você) e instrumentação manual (você escreve o código), e quando usar cada uma.

Nos vemos no Dia 6!
