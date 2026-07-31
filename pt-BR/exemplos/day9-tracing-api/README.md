# Dia 9: Demo de Tracing API

Uma API simples de saudação em Express demonstrando instrumentação manual com OpenTelemetry.

## Começando Rápido

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Suba o Jaeger:**
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
   # Basic greeting
   curl http://localhost:3000/hello/Alice
   
   # Try different names
   curl http://localhost:3000/hello/Bob
   curl http://localhost:3000/hello/Charlie
   
   # Health check (no manual spans)
   curl http://localhost:3000/health
   ```

5. **Veja os traces:** Abra http://localhost:16686

## O Que Você Vai Aprender

- Como criar spans manuais com `tracer.startActiveSpan()`
- Como adicionar atributos com `span.setAttribute()`
- Como registrar eventos com `span.addEvent()`
- Como criar spans aninhados para relações parent-child
- Como visualizar traces no Jaeger

## Resposta Esperada

```json
{
  "message": "Hello, Alice! Welcome to OpenTelemetry tracing.",
  "timestamp": "2024-01-09T10:30:00.000Z"
}
```

Veja o tutorial completo: [Day 9 - Tracing API](../../semana2/dia09.md)
