# Dia 22 – Debugando o Collector: Quando Sua Ferramenta de Observabilidade Precisa Ser Observada

Bem-vindo à Semana 4! Essa semana o foco é troubleshooting, prontidão para produção e desafios do mundo real. Hoje vamos aprender a debugar problemas do Collector quando eles (inevitavelmente) aparecerem em produção.

> [!NOTE]
> Não se preocupe se os próximos dias parecerem meio confusos. Vamos fazer bastante debugging, e é totalmente normal misturar um pouco o "o quê" com o "quando" no começo. Tudo vai se encaixar mais para frente.
>
> No Dia 29, vamos fazer uma recapitulação completa e deixar tudo mais claro.
>
> Aguenta firme, isso faz parte do processo!

---

## O Problema: Quando o Observador Vira o Problema

Imagine esse cenário: seu time reporta que os traces não estão aparecendo no Jaeger. Será que é:
- A aplicação que não está enviando os traces?
- O Collector que não está recebendo eles?
- O Collector que não está processando corretamente?
- O Collector que não está exportando?
- O Jaeger que não está aceitando?

**Sem habilidades de debugging do Collector, você fica no chute.** Com elas, você consegue identificar e corrigir o problema de forma sistemática.

---

## Por Que Debugar o Collector Importa

Quando o seu Collector falha em produção, você perde visibilidade do seu sistema inteiro justamente durante os incidentes. Você não consegue debugar o que não consegue ver, e cada minuto sem dados de observabilidade sai caro.

O Collector parece simples -> recebe dados, processa, exporta. Mas os dados podem ser descartados silenciosamente, e um único erro de digitação na configuração pode quebrar tudo. É por isso que o debugging sistemático é essencial.

---

## A Observabilidade Nativa do Collector

O Collector pratica o que prega: ele gera telemetry sobre ele mesmo.

### Endpoint de Health Check

A ferramenta de debugging mais simples que existe:

```bash
# Verifica se o Collector está rodando
curl http://localhost:13133/

# Resposta quando está saudável:
{"status":"Server available","upSince":"2024-01-04T10:30:00Z","uptime":"2h15m30s"}
```

**O que isso nos diz:**
O endpoint de health check é a ferramenta de debugging mais simples, mas ele só te diz se o processo do Collector está rodando e há quanto tempo ele está de pé. Isso é útil para detectar crashes, mas não te diz se as pipelines estão funcionando, se os dados estão fluindo, ou como está a performance.

### Métricas do Collector (o Verdadeiro Poder de Debugging)

O verdadeiro poder de debugging vem das métricas detalhadas que o Collector gera sobre a própria operação. Essas métricas mostram exatamente em que ponto da pipeline os dados estão travando, ajudam você a isolar problemas em componentes específicos, e trazem evidência quantitativa em vez de te forçar a chutar. E o mais importante: elas ajudam você a acompanhar as melhorias depois que você faz alguma mudança.

```yaml
service:
  telemetry:
    metrics:
      address: 0.0.0.0:8888  # Metrics endpoint
      level: detailed         # More detailed metrics
```

```bash
# Verifica as métricas do exporter (a abordagem moderna foca nas filas do exporter)
curl http://localhost:8888/metrics | grep otelcol_exporter
```

**O que observar:**
- `otelcol_receiver_accepted_spans` - **Os spans estão chegando?** (Se for zero, o problema está antes do Collector)
- `otelcol_exporter_queue_size` - **Os spans estão enfileirados para exportação?** (Mostra que os dados estão sendo processados)
- `otelcol_exporter_sent_spans` - **Os spans estão saindo?** (Se for zero mas o recebido for maior que 0, é problema de exportação)
- `otelcol_exporter_send_failed_spans` - **As exportações estão falhando?** (Problemas de rede, autenticação ou no backend)

**Por que essas métricas importam:**
- Elas mostram **exatamente em que ponto da pipeline** os dados estão travando
- Elas ajudam você a **isolar o problema** no receiver, no processor ou no exporter
- Elas trazem **evidência quantitativa** em vez de você ter que chutar
- Elas ajudam você a **acompanhar as melhorias** depois de fazer mudanças

---

## O Logging Exporter: Nosso Melhor Amigo no Debugging

A ferramenta de debugging mais poderosa é o logging exporter. Ele mostra exatamente quais dados estão passando pelas suas pipelines.

### Configuração Básica de Logging

```yaml
exporters:
  logging:
    loglevel: debug
    sampling_initial: 5      # Log first 5 items
    sampling_thereafter: 100 # Then every 100th item

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [attributes]  # Modern approach - no batch processor needed
      exporters: [logging, jaeger]  # Add logging alongside real exporter
```

**O que vamos ver:**
```
2024-01-04T10:30:00.000Z	DEBUG	Span	{
  "traceID": "abc123...",
  "spanID": "def456...", 
  "name": "GET /api/users",
  "attributes": {
    "http.request.method": "GET",
    "http.response.status_code": 200
  }
}
```

### Logging Avançado para Debugging Específico

**Debugando só os erros:**
```yaml
processors:
  filter/debug-errors:
    traces:
      span:
        - 'attributes["http.response.status_code"] >= 400'

exporters:
  logging/errors:
    loglevel: debug

service:
  pipelines:
    traces/debug:
      receivers: [otlp]
      processors: [filter/debug-errors]
      exporters: [logging/errors]
```

**Debugando serviços específicos:**
```yaml
processors:
  filter/debug-payment:
    traces:
      span:
        - 'resource.attributes["service.name"] == "payment-service"'
```

---

## Abordagem Sistemática de Debugging

Quando traces/metrics/logs não estão fluindo, siga essa abordagem sistemática:

### Passo 1: Verifique a Saúde do Collector
```bash
# O Collector está rodando?
curl http://localhost:13133/

# As portas estão escutando?
netstat -tlnp | grep -E "(4317|4318|8888|13133)"
```

### Passo 2: Verifique as Métricas do Receiver
```bash
# Os spans estão sendo recebidos?
curl -s http://localhost:8888/metrics | grep "otelcol_receiver_accepted_spans"

# Se for zero, o problema está antes do Collector (app não está enviando, problemas de rede)
```

### Passo 3: Adicione o Logging Exporter
```yaml
exporters:
  logging/debug:
    loglevel: debug

service:
  pipelines:
    traces:
      exporters: [logging/debug, jaeger]  # Add logging
```

**Se você vê os dados nos logs mas não no Jaeger, o problema está no exporter.**

### Passo 4: Verifique as Métricas do Exporter
```bash
# As exportações estão dando certo?
curl -s http://localhost:8888/metrics | grep "otelcol_exporter_sent_spans"

# As exportações estão falhando?
curl -s http://localhost:8888/metrics | grep "otelcol_exporter_send_failed_spans"

# Verifique a saúde da fila do exporter (exporters modernos)
curl -s http://localhost:8888/metrics | grep "otelcol_exporter_queue_size"
```

### Passo 5: Verifique os Logs do Collector
```bash
# Procure por mensagens de erro
docker logs collector-container 2>&1 | grep -i error

# Procure por problemas de conexão
docker logs collector-container 2>&1 | grep -i "connection\|timeout\|refused"
```

---

## Cenários Comuns de Debugging

### Cenário 1: Nenhum Dado Fluindo

**Sintomas:** Métrica `otelcol_receiver_accepted_spans` zerada

**Passos de debug:**
1. Verifique se a aplicação está enviando para o endpoint correto
2. Confirme a conectividade de rede: `curl http://collector:4318/v1/traces`
3. Verifique a configuração do receiver do Collector

### Cenário 2: Dado Entrando, Mas Não Saindo

**Sintomas:** `otelcol_receiver_accepted_spans > 0` mas `otelcol_exporter_sent_spans = 0`

**Passos de debug:**
1. Adicione o logging exporter para ver os dados processados
2. Verifique as configurações dos processors (os filters podem estar descartando tudo)
3. Confirme o endpoint e a autenticação do exporter
4. Verifique `otelcol_exporter_send_failed_spans` para erros de exportação

## Principais Aprendizados

**A abordagem sistemática é o seu superpoder.** Não chute, siga o processo de 5 passos para isolar os problemas rapidamente. Use as métricas para ver o quadro geral, depois use os logging exporters para ver os detalhes.

**Sempre adicione um logging exporter quando estiver debugando.** Ele é o seu melhor amigo para ver exatamente quais dados estão passando pelas suas pipelines.

**Monitore o seu Collector de forma proativa.** Configure alertas básicos para falhas de exportação e uso de memória. Não espere os problemas te encontrarem.

---

## Amanhã: Troubleshooting de Telemetry Ausente

**Agora temos a base pronta, já que o nosso Collector está observável. O próximo passo é garantir que os dados realmente fluam pela pipeline.**

Hoje você aprendeu a debugar o próprio Collector. Amanhã, no dia 23, vamos encarar a frustração mais comum de todas: "Cadê os meus dados, afinal?" - fazendo troubleshooting sistemático de quando os dados de telemetry somem em qualquer ponto da pipeline, da aplicação até o backend.

---

> *"A melhor ferramenta de debugging é um sistema bem instrumentado. A segunda melhor é saber usar a primeira."*
>
> *Hoje você aprendeu as duas coisas.*
