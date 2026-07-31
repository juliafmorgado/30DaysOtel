# Dia 12 - Exemplo de Context Propagation

Este exemplo demonstra os conceitos básicos de context propagation usando OpenTelemetry, mostrando quando ela funciona automaticamente e quando precisa de uma ajudinha manual.

## O que este exemplo mostra

- **Context propagation automática** (o caso normal, o "happy path")
- **Context propagation quebrada** (quando o setTimeout quebra a conexão)

## Cenários de context propagation

1. **Automático** - async/await preserva o contexto (funciona muito bem)
2. **Quebrado** - setTimeout perde o contexto (cria traces separados)

## Início Rápido

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

4. **Teste cada cenário:**
   ```bash
   # Testa a propagação automática (deve funcionar perfeitamente)
   curl http://localhost:3000/automatic
   
   # Testa a propagação quebrada (o child span vai ficar órfão)
   curl http://localhost:3000/broken
   ```

5. **Veja os traces no Jaeger:**
   - Abra http://localhost:16686
   - Selecione "context-demo"
   - Clique em "Find Traces"

## O que você vai ver no Jaeger

### Propagação Automática ✅
```
GET /automatic
└─ parent_operation
   └─ child_operation
      └─ grandchild_operation
```
Uma árvore genealógica perfeita - o contexto flui automaticamente.

### Propagação Quebrada ❌
```
GET /broken
└─ parent_operation

orphaned_child (trace separado!)
```
O child span inicia um novo trace porque o contexto foi perdido.


## Principais Pontos de Aprendizado

- **A context propagation geralmente funciona automaticamente** em código async/await normal
- **setTimeout e setInterval podem quebrar** a context propagation
- **A correção é simples**: capture o contexto com `context.active()` e restaure com `context.with()`
- **A maioria dos iniciantes não precisa se preocupar** com isso até ver traces quebrados
- **Debug visual**: o Jaeger facilita identificar uma context propagation quebrada

## O Padrão de Correção Simples

```javascript
// 1. Captura o contexto atual
const currentContext = context.active();

// 2. Depois, dentro de um callback, restaura o contexto
setTimeout(() => {
  context.with(currentContext, () => {
    // O código aqui enxerga o contexto capturado
    tracer.startActiveSpan('child', (span) => {
      // Esse span vai ficar conectado corretamente
      span.end();
    });
  });
}, 1000);
```

## Arquivos

- `app.js` - Três exemplos simples mostrando cenários de context propagation
- `instrumentation.js` - Configuração básica do OpenTelemetry (apenas traces)
- `package.json` - Dependências

## Próximos Passos

Este exemplo te prepara para o Dia 13, onde vamos aprender sobre conceitos básicos do SDK como samplers, processors e exporters.
