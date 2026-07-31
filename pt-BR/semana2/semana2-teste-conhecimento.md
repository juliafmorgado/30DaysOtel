# Teste de Conhecimento da Semana 2: APIs e SDK do OpenTelemetry

Teste seu entendimento sobre os conceitos da Semana 2! Este teste de conhecimento cobre as APIs do OpenTelemetry, a configuração do SDK e as habilidades práticas que você desenvolveu.

> **Como usar isso:** Tente responder cada pergunta antes de olhar a resposta. Isso vai ajudar a identificar os pontos que você talvez precise revisar no material.

---

## Seção 1: Fundamentos de API vs SDK

### Pergunta 1
**Qual é o principal benefício de separar a API do OpenTelemetry do SDK?**

<details>
<summary>Clique para ver a resposta</summary>

**Resposta:** **Mantém o código da sua aplicação estável**, permitindo trocar de implementação do SDK sem precisar mudar o código de instrumentação.

**Exemplo simples:** Sua aplicação chama `tracer.startActiveSpan()` (API). Você pode trocar do SDK padrão do OpenTelemetry para o SDK de um vendor sem mexer no código da sua aplicação.

**Por que isso importa:** Sem vendor lock-in -> seu código de observabilidade funciona com qualquer implementação compatível com OpenTelemetry.
</details>

### Pergunta 2
**O que acontece quando você usa a API do OpenTelemetry sem configurar um SDK?**

<details>
<summary>Clique para ver a resposta</summary>

**Resposta:** **Todas as chamadas da API não fazem nada**, mas sua aplicação continua funcionando normalmente. Isso é chamado de modo "no-op".

**Por que isso é útil:**
- Testar seu código instrumentado sem precisar configurar backends
- Adicionar instrumentação agora e habilitar observabilidade depois
- Nenhum impacto de performance quando a observabilidade está desabilitada
</details>

---

## Seção 2: API de Tracing

### Pergunta 3
**No seu greeting service, o que `span.setAttribute('user.name', name)` faz?**

<details>
<summary>Clique para ver a resposta</summary>

**Resposta:** **Adiciona metadata ao span** que descreve o que está acontecendo naquela operação.

**Por que é útil:** Você pode buscar spans pelo nome do usuário no Jaeger, ou ver qual usuário estava envolvido ao fazer debug de problemas.
</details>

### Pergunta 4
**Complete este padrão de tratamento de erros:**

```javascript
tracer.startActiveSpan('operation', async (span) => {
  try {
    await doWork();
    // What goes here for success?
  } catch (error) {
    // What goes here for errors?
    throw error;
  } finally {
    // What goes here?
  }
});
```

<details>
<summary>Clique para ver a resposta</summary>

**Resposta:**
```javascript
tracer.startActiveSpan('operation', async (span) => {
  try {
    await doWork();
    span.setStatus({ code: SpanStatusCode.OK }); // Mark success
  } catch (error) {
    span.recordException(error);                 // Record the error
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    throw error;                                 // Re-throw for app handling
  } finally {
    span.end();                                  // Always end the span
  }
});
```
</details>

---

## Seção 3: API de Metrics

### Pergunta 5
**Que tipo de metric você usaria para rastrear o "total de greetings enviados" e por quê?**

<details>
<summary>Clique para ver a resposta</summary>

**Resposta:** **Counter**, porque ele só aumenta e reseta quando sua aplicação reinicia.

Counters são perfeitos para contar coisas que acumulam ao longo do tempo, como o total de greetings enviados.
</details>

### Pergunta 6
**Como você adiciona labels/dimensions às metrics para rastrear categorias diferentes?**

<details>
<summary>Clique para ver a resposta</summary>

**Resposta:** **Adicione informação extra entre chaves** quando você chama `add()`:

```javascript
popularNames.add(1, { name: "Alice" });
popularNames.add(1, { name: "Bob" });
```

**O que acontece:** Você tem contagens separadas para cada nome:
- Alice: tem seu próprio counter
- Bob: tem seu próprio counter

**Por que é útil:** Você vê quais nomes são mais populares em vez de só um total.
</details>

---

## Seção 4: API de Logs

### Pergunta 7
**O que faz os logs do OpenTelemetry serem "structured" e por que isso é melhor do que o logging tradicional?**

<details>
<summary>Clique para ver a resposta</summary>

**Resposta:** **Structured logs usam attributes em vez de texto livre**, o que os torna legíveis por máquina.

**Logging tradicional:**
```javascript
console.log('Greeting created for user Alice');
```

**Structured logging:**
```javascript
logger.emit({
  body: 'Greeting created',
  attributes: { 'user.name': 'Alice' }
});
```

**Por que é melhor:** Fica fácil buscar e filtrar (encontrar todos os logs do usuário "Alice").
</details>

### Pergunta 8
**Como os logs são correlacionados automaticamente com traces?**

<details>
<summary>Clique para ver a resposta</summary>

**Resposta:** **O OpenTelemetry adiciona trace IDs automaticamente aos logs** quando eles são criados dentro de um span.

**Resultado:** Você consegue encontrar todos os logs de um trace específico buscando pelo trace ID no seu log viewer.
</details>

---

## Seção 5: Context Propagation

### Pergunta 9
**Qual é a forma mais comum de corrigir context propagation quebrada em callbacks?**

<details>
<summary>Clique para ver a resposta</summary>

**Resposta:** **Copie o context antes do `setTimeout`, depois restaure ele dentro do callback.**

**O problema:** Spans dentro de `setTimeout` viram traces separados em vez de ficarem conectados.

**A correção:**
```javascript
tracer.startActiveSpan('parent', (span) => {
  const currentContext = context.active(); // Save the context
  
  setTimeout(() => {
    context.with(currentContext, () => {   // Use the saved context
      tracer.startActiveSpan('child', (childSpan) => {
        // Now this child IS connected to parent!
        childSpan.end();
      });
    });
  }, 1000);
  span.end();
});
```

**Quando você precisa disso:** Sempre que você ver spans aparecendo como traces separados em vez de aninhados.
</details>

### Pergunta 10
**Quais dessas opções mantêm os spans conectados automaticamente como parent-child, e quais podem quebrar a conexão?**

A) `async/await`  
B) `setTimeout()`  
C) `Promise.then()`

<details>
<summary>Clique para ver a resposta</summary>

**Resposta:** 
- **Mantêm a conexão:** A) `async/await` e C) `Promise.then()`
- **Pode quebrar:** B) `setTimeout()`

**Por quê:** Async baseado em Promise (async/await, .then) preserva o context automaticamente. Async baseado em callback (setTimeout, setInterval) costuma perder o context e precisa da correção manual.
</details>

---

## Seção 6: Configuração do SDK

### Pergunta 11
**Olhando para o seu arquivo instrumentation.js, o que cada parte dessa configuração faz?**

```javascript
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
```

<details>
<summary>Clique para ver a resposta</summary>

**Resposta:**
- **`resource`:** Identifica seu serviço como "greeting-service" versão "1.0.0" - isso aparece em toda a sua telemetry
- **`traceExporter`:** Envia traces para o Jaeger usando o protocolo OTLP na porta 4318
- **`instrumentations`:** Envolve bibliotecas em runtime para capturar automaticamente spans de requisições HTTP, rotas do Express e outras operações

**Mágica escondida:** O SDK também agrupa os spans automaticamente para ganhar eficiência e adiciona informações do sistema, como a versão do Node.js e o hostname.
</details>

### Pergunta 12
**Por que suas metrics aparecem a cada 10 segundos em vez de imediatamente depois de cada requisição?**

<details>
<summary>Clique para ver a resposta</summary>

**Resposta:** Porque você configurou `exportIntervalMillis: 10000` na sua configuração de metrics:

```javascript
metricReader: new PeriodicExportingMetricReader({
  exporter: new ConsoleMetricExporter(),
  exportIntervalMillis: 10000, // This line!
}),
```

**O que acontece:** As metrics são coletadas continuamente, mas exportadas em lotes a cada 10 segundos para ganhar eficiência. Isso evita inundar seu console com atualizações individuais de metric.
</details>

---

## Seção 7: Integração e Correlação

### Pergunta 13
**Como traces, metrics e logs se complementam em observabilidade?**

<details>
<summary>Clique para ver a resposta</summary>

**Resposta:** Cada um oferece uma perspectiva diferente:

**Metrics** → **QUANDO** e **QUANTO**
- "As falhas de greeting dispararam às 14h30"
- "A taxa de erro aumentou 200%"

**Traces** → **ONDE** e **QUEM** 
- "As falhas estão na etapa de validação"
- "A requisição específica da usuária Alice falhou"

**Logs** → **O QUE** e **POR QUÊ**
- "Validação falhou: o nome é obrigatório"
- "Timeout na conexão com o banco de dados depois de 30s"

**Fluxo de trabalho:** Metrics detectam os problemas → Traces mostram onde → Logs explicam o porquê
</details>



## Avaliando Seu Conhecimento

**Conte suas respostas corretas:**

- **14-16 corretas:** **Nível Expert** - Você dominou os conceitos da Semana 2! Pronto para a Semana 3.
- **11-13 corretas:**  **Proficiente** - Bom entendimento com pequenas lacunas. Revise os tópicos que você errou.
- **8-10 corretas:**  **Em Desenvolvimento** - Boa base, mas revise os conceitos-chave antes da Semana 3.
- **5-7 corretas:**  **Precisa Revisar** - Revisite o material da Semana 2, especialmente os exemplos práticos.
- **0-4 corretas:**  **Recomece** - Refaça a Semana 2 com os exemplos funcionando.

---

## Próximos Passos

**Se você foi bem:** Você está pronto para a Semana 3! O Collector do OpenTelemetry vai construir em cima dessas bases.

**Se você precisa revisar:** Isso é totalmente normal! O OpenTelemetry tem muitos conceitos. Foque nos exemplos práticos, porque eles vão ajudar a fixar a teoria.

**Lembre-se:** O objetivo não é a perfeição, é o entendimento. Você sempre pode voltar a esses conceitos conforme for usando o OpenTelemetry em projetos reais.

**Nos vemos na Semana 3!**
