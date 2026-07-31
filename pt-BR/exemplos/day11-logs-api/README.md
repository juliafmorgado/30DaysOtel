# Dia 11 - Exemplo de Logs API

Esse exemplo mostra como fazer structured logging básico usando OpenTelemetry, construindo em cima do greeting service dos Dias 9 e 10.

## O que esse exemplo mostra

- **Structured logging simples** com correlação automática de trace
- **Padrões básicos de logging** para iniciantes
- **Integração** dos logs com o código de tracing e metrics já existente
- **Error logging** com validação simples

## Logs que criamos

1. **Greeting started** - Quando o processamento começa (nível INFO)
2. **Greeting completed** - Quando o greeting é bem-sucedido (nível INFO)
3. **Greeting failed** - Quando a validação falha (nível ERROR)

Todos os logs incluem automaticamente `traceId` e `spanId` para correlação.

## Começando Rápido

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Suba o Jaeger (para os traces):**
   ```bash
   docker run -d --name jaeger \
     -p 16686:16686 \
     -p 4318:4318 \
     jaegertracing/all-in-one:latest
   ```

3. **Rode a aplicação:**
   ```bash
   node --require ./instrumentation.js app.js
   ```

4. **Envie requisições de teste:**
   ```bash
   # Envia greetings que vão dar certo
   curl http://localhost:3000/hello/Alice
   curl http://localhost:3000/hello/Bob
   curl http://localhost:3000/hello/Charlie

   # Envia um greeting que vai falhar (nome longo demais)
   curl http://localhost:3000/hello/ThisNameIsWayTooLongAndWillCauseAnErrorBecauseItExceedsFiftyCharacters

   # Envia mais greetings que vão dar certo
   curl http://localhost:3000/hello/Alice
   curl http://localhost:3000/hello/David

   # Gera mais dados
   for i in {1..5}; do
     curl http://localhost:3000/hello/User$i
   done
   ```

5. **Veja os traces no Jaeger:**
   - Abra http://localhost:16686
   - Selecione "greeting-service"
   - Clique em "Find Traces"

6. **Veja os metrics no console:**
   - Os metrics são exportados a cada 10 segundos para o seu terminal
   - Procure por `greetings_sent_total`, `requests_received_total`, `popular_names_total` e `greeting_errors_total`

## O que você vai ver

- **Traces**: Fluxos individuais de greeting no Jaeger (do Dia 9)
- **Metrics**: Counters no seu terminal mostrando greetings, nomes populares, erros (do Dia 10)
- **Logs**: Mensagens de log estruturadas com correlação automática de trace (NOVIDADE!)

## Exemplo de Saída de Log

**Greeting Started:**
```json
{
  "severityText": "INFO",
  "body": "Greeting processing started",
  "traceId": "abc123...",
  "spanId": "def456...",
  "attributes": {
    "user.name": "Alice",
    "greeting.type": "personal"
  }
}
```

**Greeting Completed:**
```json
{
  "severityText": "INFO",
  "body": "Greeting processing completed successfully",
  "traceId": "abc123...",
  "spanId": "def456...",
  "attributes": {
    "user.name": "Alice",
    "message.length": 67,
    "processing.duration_ms": 100
  }
}
```

**Greeting Failed:**
```json
{
  "severityText": "ERROR",
  "body": "Greeting processing failed",
  "traceId": "abc123...",
  "spanId": "def456...",
  "attributes": {
    "user.name": "ThisNameIsWayTooLong...",
    "error.message": "name too long",
    "name.length": 85
  }
}
```

## Principais Pontos de Aprendizado

- **Structured logs** são legíveis por máquina e pesquisáveis
- **Correlação automática** conecta logs aos traces através de traceId/spanId
- **Níveis de severidade** ajudam a categorizar a importância do log (INFO vs ERROR)
- **Attributes** fornecem contexto estruturado para filtragem e análise
- **Observabilidade completa** = traces + metrics + logs trabalhando juntos

## Arquivos

- `app.js` - App Express de greeting com tracing (Dia 9) + metrics (Dia 10) + logs (Dia 11)
- `instrumentation.js` - Configuração do OpenTelemetry para traces, metrics e logs
- `package.json` - Dependências

## Próximos Passos

Esse exemplo te prepara para o Dia 12, onde vamos aprender sobre context propagation e como o trace context flui através da sua aplicação.
