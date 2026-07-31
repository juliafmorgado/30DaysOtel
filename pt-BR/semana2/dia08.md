# Dia 8 – API vs SDK

Bem-vindo à Semana 2!

Na Semana 1 aprendemos *o que* o OpenTelemetry faz, agora na Semana 2 vamos aprender *como* usá-lo em aplicações reais.

Hoje vamos olhar para uma das decisões de design mais importantes do OpenTelemetry: por que a API é separada do SDK, e como isso permite manter o código da nossa aplicação estável enquanto mudamos a forma como a observabilidade é implementada por baixo dos panos.

**Pense assim:** nossa aplicação fala uma língua (a API). O SDK é o tradutor. Podem existir tradutores diferentes, alguns otimizados para performance, outros fornecidos por vendors, mas a nossa aplicação continua falando a mesma língua.

## O que já aprendemos

**Estivemos aprendendo sobre a API durante a semana 1**

- **[Dia 4](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day4.md):** Quando aprendemos `span.setAttribute('user.id', '12345')` — isso é a API
- **[Dia 5](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day5.md):** Quando aprendemos convenções semânticas como `http.request.method` — elas são usadas com a API
- **[Dia 6](https://github.com/juliafmorgado/30DaysOtel/blob/main/week1/day6.md):** Quando aprendemos auto-instrumentação — essas bibliotecas usam a API

A API não é novidade. O que é novo hoje é entender por que ela é separada do SDK.

## O problema que isso resolve

Antes do OpenTelemetry, instrumentar nosso código significava assumir um compromisso com um vendor específico e ficar preso a ele. Veja como isso era:

```javascript
// Using Vendor D's SDK directly in our application code
const tracer = require('dd-trace').init();

app.get('/users/:id', (req, res) => {
  const span = tracer.startSpan('get_user');
  span.setTag('user.id', req.params.id);
  
  const user = db.getUser(req.params.id);
  span.finish();
  res.json(user);
});
```

> **O problema do vendor lock-in:**
>
> Quer trocar de vendor? Você tem que reescrever todo o seu código de instrumentação. Cada chamada `tracer.startSpan()`. Cada `span.setTag()`. Cada import.
>
> As empresas passavam meses reescrevendo código de instrumentação só para trocar de vendor de observabilidade. Isso tornava arriscado adotar ferramentas de observabilidade, porque você podia ficar preso a um vendor para sempre.

O OpenTelemetry resolveu isso com uma decisão arquitetural brilhante: separar o "o quê" (API) do "como" (SDK).

## A solução: separando instrumentação de implementação

O OpenTelemetry divide observabilidade em duas responsabilidades completamente separadas:

1. **API**: é o que o código da nossa aplicação usa. É o conjunto de funções que chamamos para descrever o que está acontecendo na nossa aplicação (por exemplo, "uma request começou", "essa operação demorou 200ms"). Essa parte é estável e não depende de nenhum vendor.
2. **SDK**: é a parte que roda nos bastidores. Ela escuta essas chamadas da API e decide o que fazer com elas: se deve manter o dado, quanto coletar, como processar e para onde enviar. SDKs diferentes ou distribuições de vendors podem fazer isso de formas diferentes, sem exigir mudanças no código da nossa aplicação.

> [!TIP]
> **Não se confunda com a terminologia:**
>
> **Instrumentação** = a atividade de adicionar código de observabilidade na nossa aplicação
> **API** = os métodos e funções específicos que usamos para fazer essa instrumentação
>
> **Implementação** = o conceito de como o telemetry é processado nos bastidores
> **SDK** = o pacote de software de fato que faz esse processamento
>
> Então nós adicionamos instrumentação (usando a API) e o SDK fornece a implementação. São conceitos relacionados, mas não idênticos. Você vai encontrar os dois termos conforme for aprendendo OpenTelemetry.

<details>
<summary>Se a terminologia ainda está confusa, clique aqui para um exemplo concreto</summary>

Digamos que queremos observar o que acontece quando um usuário é carregado do banco de dados.

**Passo 1: Adicionamos instrumentação manual (usando a API)**

```
const { trace } = require('@opentelemetry/api');

const tracer = trace.getTracer('user-service');

function getUser(id) {
  const span = tracer.startSpan('get_user'); // API call
  span.setAttribute('user.id', id);           // API call

  const user = db.getUser(id);

  span.end();                                 // API call
  return user;
}
```

O que está acontecendo aqui?

- Estamos instrumentando nosso código
- Estamos chamando métodos da API
- Estamos apenas descrevendo o que acontece
- Nada está sendo enviado para lugar nenhum ainda

Nesse ponto, adicionamos sinais de observabilidade, mas ainda não decidimos o que fazer com eles.

**Passo 2: O SDK fornece a implementação**

Em algum outro lugar (geralmente em `instrumentation.js`), configuramos o SDK:

```
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: 'http://localhost:4318/v1/traces',
  }),
});

sdk.start();
```

Agora, quando nosso código chama `tracer.startSpan('get_user');`, a implementação do SDK:

- cria um objeto span de verdade
- decide se mantém ou descarta ele
- agrupa (batch) em lotes
- formata
- envia para algum lugar

Todo esse comportamento vive no SDK, e não no código da nossa aplicação.
</details>

## A API: o que escrevemos no nosso código

A API do OpenTelemetry é a parte que vai no código da nossa aplicação.

**Responsabilidades da API:**
- Criar spans, metrics e logs
- Adicionar attributes e events ao telemetry
- Gerenciar o contexto (em que trace eu estou?)
- Fornecer uma interface consistente entre todas as linguagens

**O que a API NÃO faz:**
- Enviar dados para backends (isso é trabalho do SDK)
- Aplicar decisões de sampling (o SDK cuida disso)
- Agrupar telemetry em lotes por eficiência (responsabilidade do SDK)
- Detectar informações do serviço, como hostname (funcionalidade do SDK)

**Características principais que a tornam especial:**

**Estável:** a API é estável desde a v1.0 e segue semantic versioning. Nomes de métodos e assinaturas não vão mudar, então nosso código de instrumentação não quebra quando você faz upgrade.

**Vendor-neutral:** a API não contém nenhuma lógica específica de backend. Ela não sabe nem se importa se você está enviando dados para Jaeger, Datadog ou um sistema próprio.

**Leve:** a API é só interfaces e estruturas de dados básicas. Ela não inclui código pesado de rede, lógica de processamento complexa ou dependências grandes.

**Exemplo de código de API na nossa aplicação (instrumentação manual):**

```javascript
// app.js - This is what we write in our application
const { trace } = require('@opentelemetry/api');

app.get('/users/:id', (req, res) => {
  const tracer = trace.getTracer('user-service'); // Get a tracer (this is the API)
  const span = tracer.startSpan('get_user'); // Create a span (API method)
  span.setAttribute('user.id', req.params.id); // Add attributes (API method)
  
  const user = db.getUser(req.params.id);
  span.end(); // End the span (API method)
  res.json(user);
});
```

**Insight importante:** esse código parece similar ao uso de um SDK específico de um vendor, mas ele é portável *entre implementações de SDK*. A mesma instrumentação funciona com o SDK padrão do OpenTelemetry, com distribuições de vendors (como a da Dash0) ou com qualquer outra implementação de SDK que siga a API do OpenTelemetry.

## O SDK: o que configuramos uma vez

O SDK do OpenTelemetry é o "motor" que pega as chamadas da API e as transforma em dados de telemetry de verdade, enviados para backends. Ele cuida de todas as partes complexas e configuráveis da observabilidade.

**Responsabilidades do SDK:**
- Coletar dados de telemetry a partir das chamadas da API
- Adicionar resource attributes (nome do serviço, versão, hostname, ambiente)
- Aplicar decisões de sampling (manter 100% dos traces? 10%? só os erros?)
- Processar dados de forma eficiente (agrupar spans em lotes, adicionar metadados)
- Formatar dados para backends diferentes (formatos OTLP, Jaeger, Prometheus)
- Lidar com comunicação de rede (enviar dados, retry em falhas, lidar com backpressure)
- Gerenciar performance (buffering, compressão, rate limiting)

**Características principais que o tornam poderoso:**

**Configurável:** podemos mudar completamente como o telemetry é processado sem tocar no código da aplicação. Quer trocar de 100% de sampling para 10%? Basta mudar uma linha na configuração do SDK.

**Pluggable:** o SDK é construído a partir de componentes intercambiáveis. Podemos misturar e combinar samplers, processors e exporters como blocos de montar (vamos estudar isso na Semana 3).

**Robusto:** o SDK contém toda a lógica complexa para processamento eficiente de dados, comunicação de rede e integração com backends.

**Opcional:** a API funciona sem um SDK (em modo "no-op"), o que é perfeito para testes e rollouts graduais.

**Exemplo de configuração de SDK:**

```javascript
// instrumentation.js - You change this file to switch SDK implementations
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

const sdk = new NodeSDK({
  // Resource: Describe this service
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'user-service',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: 'production',
  }),
  
  // Exporter: Where to send data
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
  }),
  
  // Auto-instrumentation: What to instrument automatically
  instrumentations: [getNodeAutoInstrumentations()],
  
  // Sampling: How much data to keep (could add this)
  // sampler: new TraceIdRatioBasedSampler(0.1), // Keep 10%
});

sdk.start();
```

> [!WARNING]
> **Alerta de nome de arquivo confuso!**
>
> O arquivo costuma se chamar `instrumentation.js`, mas na verdade ele está configurando o **SDK** (implementação), e não escrevendo código de instrumentação.
>
> Lembre-se: o **código da sua aplicação** faz a instrumentação. Esse arquivo configura a **implementação do SDK**.

**A mágica do acoplamento fraco:** repare como o código da API e a configuração do SDK são completamente separados. A API não sabe qual SDK está rodando. O SDK não dita quais métodos da API você pode usar. Esse acoplamento fraco é o que torna o OpenTelemetry tão flexível.

## Por que a implementação no-op importa

**A API funciona sem um SDK.** Se nenhum SDK estiver configurado, as chamadas da API não fazem nada (no-op):

```javascript
const span = tracer.startSpan('operation');  // Does nothing if no SDK
span.setAttribute('key', 'value');           // No-op
span.end();                                   // No-op
```

**Por que isso é útil:**

### 1. Testes
Testar código instrumentado sem backends. Seus testes rodam rápido e não precisam de infraestrutura.

### 2. Rollout gradual
Adicione instrumentação agora, habilite o SDK depois. Podemos instrumentar nosso código em desenvolvimento e habilitar o SDK em produção quando estivermos prontos.

### 3. Portabilidade de bibliotecas
Bibliotecas podem usar a API sem forçar dependências de SDK nos usuários. É assim que a auto-instrumentação funciona. As bibliotecas usam a API, e se configurarmos um SDK, o telemetry aparece automaticamente.

## Componentes do SDK (peças pluggable)

O SDK é modular. Os principais componentes que podemos configurar (vamos aprofundar no [Dia 13](./dia13.md)):

1. **Tracer Provider:** implementa `trace.getTracer()`
2. **Span Processors:** 
   - `BatchSpanProcessor` (agrupa spans em lotes para eficiência)
   - `SimpleSpanProcessor` (envia imediatamente, útil para debug)
3. **Exporters:** 
   - `OTLPTraceExporter` (padrão da indústria)
   - `JaegerExporter` (formato legado do Jaeger)
   - `ConsoleSpanExporter` (imprime no console para debug)
4. **Samplers:** 
   - `TraceIdRatioBasedSampler` (faz sampling de X% dos traces)
   - `ParentBasedSampler` (segue a decisão de sampling do parent)
5. **Resource Detectors:** detectam automaticamente nome do serviço, host, nome do pod

Podemos misturar e combinar tudo isso sem mudar o código da aplicação.

## Prévia prática rápida

Vamos ver isso funcionando de ponta a ponta.

**Instale:**
```bash
npm install express @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/sdk-trace-node @opentelemetry/resources @opentelemetry/semantic-conventions
```

**Crie o instrumentation.js:**
```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { ConsoleSpanExporter } = require('@opentelemetry/sdk-trace-node');
const { resourceFromAttributes } = require('@opentelemetry/resources');
const { ATTR_SERVICE_NAME } = require('@opentelemetry/semantic-conventions');

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'demo-service',
  }),
  traceExporter: new ConsoleSpanExporter(),
  instrumentations: [],
});

sdk.start();
console.log('OpenTelemetry SDK initialized');
```

**Crie o app.js:**
```javascript
const express = require('express');
const { trace } = require('@opentelemetry/api');

const app = express();

app.get('/hello', (req, res) => {
  const tracer = trace.getTracer('demo');
  const span = tracer.startSpan('say_hello');
  span.setAttribute('greeting', 'hello');
  
  res.json({ message: 'Hello, OpenTelemetry!' });
  span.end();
});

app.listen(3000, () => console.log('Server running on port 3000'));
```

**Execute:**
```bash
OTEL_SERVICE_NAME=demo-service node --require ./instrumentation.js app.js
//The `--require` flag loads the SDK configuration before our application code runs.
```

**Teste:**
```bash
curl http://localhost:3000/hello
```

Os spans são impressos no console. Se trocarmos o `ConsoleSpanExporter` por `OTLPTraceExporter`, eles vão para a nossa plataforma de observabilidade em vez disso. **O código da aplicação não muda.**

## Equívocos comuns

**"A API e o SDK são a mesma coisa"**  
❌ Não. A API é uma interface fina. O SDK é a implementação pesada.

**"Preciso importar o SDK no código da minha aplicação"**  
❌ Não. O código da aplicação importa só `@opentelemetry/api`. O SDK é carregado separadamente.

**"Auto-instrumentação faz parte do SDK"**  
⚠️ Meio que sim, meio que não. A auto-instrumentação usa a API e funciona com qualquer SDK.

**"A separação API/SDK significa que posso trocar de backend de observabilidade facilmente"**  
❌ Não exatamente. A separação mantém o código da sua aplicação estável quando você troca a implementação do SDK. A troca de backend depende de exporters e protocolos como o OTLP. (Vamos aprender mais sobre isso na Semana 3)

**"Se eu trocar de plataforma de observabilidade, preciso mudar o código da minha aplicação"**  
❌ Não. O código da sua aplicação (as chamadas da API) permanece o mesmo. Você só muda a configuração do SDK, como exporters e endpoints.

**"Se a API funciona sem o SDK (modo no-op), o SDK também funciona sem a API"**  
❌ Não. O SDK é literalmente uma implementação da interface da API. Sem ela, não haveria nada para implementar.

## O que estou levando para o Dia 9

**Insight central:** ao separar a API do SDK, o OpenTelemetry desacopla como o telemetry é criado de como ele é implementado. O código da aplicação depende só da API, enquanto diferentes implementações de SDK ou distribuições de vendors podem ser trocadas sem mudar esse código.

> Se você for lembrar de uma coisa só:
> **A separação API/SDK existe para manter o código da sua aplicação estável.**
> Todo o resto (vendors, backends, exporters) vem depois.

Até o Dia 9!
