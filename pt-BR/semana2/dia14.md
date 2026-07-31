# Dia 14 – Recap da Semana 2: APIs e SDK do OpenTelemetry

Chegamos ao final da Semana 2!
Essa semana foi sobre colocar a mão na massa com as APIs do OpenTelemetry, adicionando traces, metrics e logs em código de verdade, e configurando o SDK só o suficiente para as coisas funcionarem.

Nesse ponto, você pode estar se sentindo assim:
- "Copiei uma configuração de SDK e funcionou"
- "Sei como adicionar spans, mas não entendo tudo o que acontece por trás"
- "Entendo o que essas coisas fazem, mas não conseguiria fazer sozinho(a)"

Isso é completamente normal e esperado.

> **Teste de Conhecimento:** Teste seu conhecimento da Semana 2 com nosso [`semana2-teste-conhecimento.md`](./semana2-teste-conhecimento.md)
>
> **Prévia da Próxima Semana:** Vamos mergulhar no **OpenTelemetry Collector**, o poderoso pipeline de processamento de dados que consegue transformar, rotear e enriquecer nossos dados de telemetry.

---

## O Que Realizamos Essa Semana

### **O Panorama Geral: API vs SDK**
Uma das maiores ideias dessa semana foi a diferença entre instrumentação e implementação.
- **API** = o que escrevemos no código da nossa aplicação (criar spans, registrar metrics, emitir logs)
- **SDK** = o que de fato processa e exporta esses dados (batching, exportação, sampling, etc.)

A **separação** entre eles nos permite mudar como a telemetry se comporta sem mudar o código da aplicação.

### **Os Três Pilares da Observabilidade**
- **Traces** = A jornada de cada requisição individual ("O que aconteceu com essa requisição?")
- **Metrics** = Padrões agregados ("Com que frequência algo está acontecendo no geral?")
- **Logs** = Informação detalhada de eventos ("Por que essa operação falhou?")

### **Habilidades Principais Desenvolvidas**
- Adicionar spans manuais com atributos e events apropriados
- Usar counters para acompanhar comportamentos básicos
- Emitir logs estruturados que se conectam automaticamente aos traces
- Entender context propagation e quando ela quebra
- Configurar um SDK básico que envia telemetry para algum lugar útil

---

## Recap Dia a Dia

### **[Dia 8: API vs SDK](./dia08.md)**
Esse foi o dia em que demos um passo atrás e falamos sobre arquitetura.

**O que aprendemos:**
- A API é com o que nosso código conversa
- O SDK é a implementação concreta por trás dela
- A telemetry pode ser desligada (no-op) sem apagar a instrumentação
- Esse design evita vendor lock-in

---

### **[Dia 9: Tracing API](./dia09.md)**
Foco: Acompanhar uma única requisição pelo sistema

**O que construímos:** Um serviço de saudação simples com instrumentação manual
- Endpoint de saudação básico com spans aninhados
- Atributos e events de span para detalhes da requisição
- Relações de span pai-filho

**Insight principal:** Traces contam a história de requisições individuais através do seu sistema.

---

### **[Dia 10: Metrics API](./dia10.md)**
Foco: Observar o comportamento ao longo do tempo

**O que construímos:** Serviço de saudação melhorado com counters
- `greetings_sent_total` - Contagem de saudações enviadas
- `requests_received_total` - Contagem de requisições recebidas
- `popular_names_total` - Contagem por nome com labels

Principal aprendizado: Metrics não explicam por que algo aconteceu, elas mostram com que frequência acontece.
---

### **[Dia 11: Logs API](./dia11.md)**
Foco: Adicionando detalhe e contexto

**O que construímos:**
- Logs estruturados em vez de texto simples
- Correlação automática de trace_id e span_id nos logs
- Logs de erro alinhados com spans que falharam

Principal aprendizado: Logs se tornam muito mais úteis quando estão conectados aos traces.
---

### **[Dia 12: Context Propagation](./dia12.md)**
Foco: Como tudo permanece conectado

**O que vimos:**
- O context normalmente flui automaticamente
- `setTimeout` e event emitters podem quebrá-lo
- Context quebrado leva a traces desconectados

Principal aprendizado: Uma boa observabilidade depende do context permanecer intacto.
---

### **[Dia 13: Você Merece uma Pausa!](./dia13.md)**
Demos uma pausa mais que merecida para processar tudo o que aprendemos

Por quê?
Existem muitos modelos mentais novos aqui. Pausar ajuda eles a se assentarem.

---

## O Padrão "Agora Faz Sentido"

Ao final da Semana 2, já estávamos usando traces, metrics e logs juntos, mesmo sem entender completamente cada peça interna ainda.

Aqui vai um recap rápido:

```javascript
tracer.startActiveSpan("create_greeting", async (span) => {
  span.setAttribute("user.name", name); // TRACING: Adiciona atributos para descrever a operação
  requestsTotal.add(1); // METRICS: Conta essa requisição

  try {
    logger.emit({ severityText: "INFO", body: "Greeting created" }); // LOGGING: Registra o que está acontecendo
    greetingsTotal.add(1);
  } catch (error) {
    span.recordException(error);
    logger.emit({ severityText: "ERROR", body: "Greeting failed" });
    throw error;
  } finally {
    span.end();
  }
});
```

Nessa fase, o importante não é como o SDK processa isso, e sim que o código está instrumentado corretamente, que os dados aparecem e que tudo está conectado.

---

## Conceitos-Chave Dominados

### **1. Instrumentação Manual**
- Criar spans com `tracer.startActiveSpan()`
- Adicionar atributos significativos seguindo convenções semânticas
- Tratamento de erro apropriado com `span.recordException()`
- Definir o status do span para sucesso/falha

### **2. Integração de Telemetry**
- Traces para fluxos de requisição
- Metrics para padrões agregados
- Logs para contexto detalhado
- Correlação automática via span context

### **3. Configuração do SDK**
- Atributos de resource para identificação do serviço
- Configuração básica de exporter (console vs OTLP)
- Entender o padrão básico de configuração do SDK
- Configuração de auto-instrumentação

**O que realmente aprendemos sobre o SDK (mesmo que parecesse copiar e colar):**
Estivemos usando configuração de SDK sem mergulhar fundo nos detalhes internos. Aqui está o padrão básico de inicialização do SDK que aprendemos de forma implícita:

```javascript
const sdk = new NodeSDK({
  // Aprendemos como identificar nosso serviço (resource attributes)
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: "greeting-service",
    [ATTR_SERVICE_VERSION]: "1.0.0",
  }),
  
  // Como enviar traces para algum lugar (exporters)
  traceExporter: new OTLPTraceExporter({
    url: "http://localhost:4318/v1/traces",
  }),
  
  // Como enviar metrics para o console
  metricReader: new PeriodicExportingMetricReader({
    exporter: new ConsoleMetricExporter(),
    exportIntervalMillis: 10000,
  }),
  
  // Que auto-instrumentation existe e captura requisições HTTP automaticamente
  instrumentations: [getNodeAutoInstrumentations()],
});
```

**O que NÃO aprendemos (e tudo bem!):**
Não falamos sobre:
- batching processors
- estratégias de sampling
- pipelines do SDK
- por que os defaults foram escolhidos

A configuração padrão do SDK funciona perfeitamente para cenários de aprendizado. Conseguimos observabilidade funcionando sem sobrecarga cognitiva. Entender o porquê vem a seguir.

---

## Por Que Isso Nos Prepara Perfeitamente para a Semana 3

Na Semana 3, vamos além do SDK e entramos no Collector.

É lá que:
- pipelines se tornam explícitos
- processors finalmente fazem sentido
- roteamento e filtragem aparecem
- "por que não fazer isso no SDK?" se torna uma pergunta de verdade

A Semana 2 nos deu observabilidade funcionando.
A Semana 3 explica a maquinaria por trás.

---

## Considerações Finais

> Se você está se sentindo assim: "Sei como usar isso, mesmo que ainda não entenda completamente"
>
> Isso é sucesso.

Agora você tem:
- instrumentação de verdade
- telemetry de verdade
- uma base sólida

E você está pronto(a) para o Dia 15!
