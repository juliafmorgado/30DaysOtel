# Dia 10 - Exemplo de Metrics API

Esse exemplo mostra o uso básico de metrics com OpenTelemetry, continuando a partir do serviço de saudação (greeting) do Dia 9.

## O que esse exemplo mostra

- **Counters simples** que rastreiam requisições de saudação
- **Padrões básicos de metrics** para iniciantes
- **Integração** de metrics com o código de tracing já existente
- **Labels/dimensões** para fatiar e analisar os dados de diferentes formas

## Metrics que rastreamos

1. `greetings_sent_total` - Total de saudações enviadas
2. `requests_received_total` - Total de requisições recebidas
3. `popular_names_total` - Contagem de cada nome solicitado (com labels)

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
   # Envia saudações para nomes diferentes
   curl http://localhost:3000/hello/Alice
   curl http://localhost:3000/hello/Bob
   curl http://localhost:3000/hello/Alice
   curl http://localhost:3000/hello/Charlie
   curl http://localhost:3000/hello/Alice
   
   # Gera mais dados
   for i in {1..10}; do
     curl http://localhost:3000/hello/User$i
   done
   ```

5. **Veja os traces no Jaeger:**
   - Abra http://localhost:16686
   - Selecione "greeting-service"
   - Clique em "Find Traces"

6. **Veja as metrics no console:**
   - As metrics são exportadas a cada 10 segundos para o seu terminal
   - Procure pelas metrics chamadas `greetings_sent_total`, `requests_received_total` e `popular_names_total`
   - Você também vai ver metrics de runtime do Node.js (elas aparecem automaticamente)

## O que você vai ver

- **Traces**: Os fluxos individuais de saudação no Jaeger (do Dia 9)
- **Metrics**: Counters no seu terminal mostrando o total de saudações, nomes mais populares, etc.
- **Labels**: `popular_names_total{name="Alice"} = 3` mostra que Alice foi solicitada 3 vezes

## Saída Esperada das Metrics

Você vai ver uma saída parecida com essa no seu terminal:

```javascript
{
  descriptor: {
    name: 'greetings_sent_total',
    description: 'Total number of greetings sent',
    unit: '',
    type: 'COUNTER'
  },
  dataPoints: [ { attributes: {}, value: 15 } ]
}

{
  descriptor: {
    name: 'popular_names_total',
    description: 'Count of greetings by name',
    unit: '',
    type: 'COUNTER'
  },
  dataPoints: [
    { attributes: { name: 'Alice' }, value: 3 },
    { attributes: { name: 'Bob' }, value: 1 },
    { attributes: { name: 'Charlie' }, value: 1 }
  ]
}
```

## Principais Pontos de Aprendizado

- Metrics mostram **padrões** em várias requisições
- Traces mostram **detalhes** de requisições individuais
- Counters simples são perfeitos para quem está começando
- Labels adicionam dimensões para fatiar os dados por nome, tipo, etc.
- Metrics e traces trabalham juntos para uma observabilidade completa

## Arquivos

- `app.js` - Aplicação Express de saudação com tracing (Dia 9) + metrics (Dia 10)
- `instrumentation.js` - Configuração do OpenTelemetry para traces e metrics
- `package.json` - Dependências

## Próximos Passos

Esse exemplo prepara você para o Dia 11, onde vamos adicionar structured logging.
