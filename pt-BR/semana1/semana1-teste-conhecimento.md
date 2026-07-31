# Teste de Conhecimento da Semana 1: Fundamentos de Observabilidade

Teste seu entendimento dos conceitos da Semana 1 (Dias 1-6). Esse teste cobre os fundamentos de observabilidade, traces, metrics, logs, spans, convenções semânticas e instrumentação.

**Guia de Pontuação:**
- 0-8 acertos: Revise o material da Semana 1
- 9-13 acertos: Boa base, mas revise os pontos fracos
- 14-18 acertos: Entendimento sólido, pronto para a Semana 2
- 19-22 acertos: Excelente! Você dominou a Semana 1

---

## Seção 1: Fundamentos de Observabilidade (Dias 1-3)

### Pergunta 1
**Qual é a principal diferença entre monitoramento e observabilidade?**

A) Monitoramento te diz *o que* está quebrado, observabilidade te permite perguntar *por quê*  
B) Monitoramento é para logs, observabilidade é para metrics  
C) Monitoramento é para produção, observabilidade é para desenvolvimento  
D) Não há diferença, são a mesma coisa  

<details>
<summary>Ver resposta</summary>

**Resposta: A**

Monitoramento normalmente responde perguntas predefinidas ("A CPU está > 80%?"). Observabilidade te permite explorar e fazer perguntas novas que você não tinha previsto ("Por que o checkout desse usuário específico está lento?").

</details>

---

### Pergunta 2
**Uma requisição distribuída passa por Order Service → Inventory Service → Database. A requisição total leva 1200ms. Qual sinal te diz ONDE a maior parte do tempo foi gasta?**

A) Metrics  
B) Logs  
C) Traces  
D) Os três igualmente  

<details>
<summary>Ver resposta</summary>

**Resposta: C**

**Traces** mostram a linha do tempo de uma única requisição através dos serviços. Metrics te dizem *quando* algo está lento (padrões agregados). Logs te dizem *o que* de erro aconteceu (detalhes do evento). Mas só traces mostram *onde* no fluxo da requisição o tempo foi gasto.

</details>

---

### Pergunta 3
**Você vê isso nas suas metrics: `checkout_latency_p99 = 3.5s` (normalmente 500ms). O que você deve fazer PRIMEIRO?**

A) Reiniciar o checkout service  
B) Escalar as instâncias do checkout service  
C) Puxar traces de amostra daquela janela de tempo para ver o que está lento  
D) Verificar os logs em busca de erros no checkout service  

<details>
<summary>Ver resposta</summary>

**Resposta: C**

Metrics te dizem **quando** algo está errado. Traces te dizem **onde**. Logs te dizem **o que**. O fluxo de trabalho é: metrics (detectar) → traces (localizar) → logs (explicar). Puxe os traces primeiro para ver qual parte da requisição está realmente lenta (pode ser uma dependência downstream, não o checkout service em si).

</details>

---

### Pergunta 4
**Qual é o principal problema de depender só de logs para debugar sistemas distribuídos?**

A) Logs são caros demais para armazenar  
B) Logs não capturam informação de tempo  
C) Logs não conseguem capturar erros  
D) Sem correlation IDs, você não consegue reconstruir quais logs pertencem à mesma requisição  

<details>
<summary>Ver resposta</summary>

**Resposta: D**

Logs de serviços diferentes são armazenados separadamente. Sem um identificador compartilhado (trace ID), você não sabe quais logs pertencem à mesma requisição do usuário. Você acaba dando grep em milhões de linhas de log tentando montar a história manualmente.

</details>

---

## Seção 2: Traces e Spans (Dia 4)

### Pergunta 5
**Qual afirmação sobre spans é VERDADEIRA?**

A) Um span representa um trace distribuído inteiro  
B) Spans só podem ser criados automaticamente por bibliotecas de instrumentação  
C) Todos os spans em um trace precisam ser do mesmo serviço  
D) Um span representa uma operação cronometrada dentro de um trace  

<details>
<summary>Ver resposta</summary>

**Resposta: D**

Um span é uma unidade cronometrada de trabalho (por exemplo, "requisição HTTP", "query no banco de dados", "validar pedido"). Um trace é uma coleção de spans relacionados. Spans podem ser criados automaticamente (auto-instrumentação) ou manualmente. Spans em um trace podem vir de múltiplos serviços (isso é distributed tracing).

</details>

---

### Pergunta 6
**Olhe para essa estrutura de trace:**

```
Trace xyz789 (1500ms)
└─ GET /orders (1500ms)          [span-100, parent: null]
   ├─ Check inventory (20ms)     [span-101, parent: span-100]
   ├─ Call shipping (1200ms)     [span-102, parent: span-100]
   │  └─ Calculate rate (1100ms) [span-103, parent: span-102]
   └─ Update status (100ms)      [span-104, parent: span-100]
```

**Qual é o `parent_span_id` do span "Calculate rate"?**

A) `null`  
B) `span-100`  
C) `span-102`  
D) `span-103`  

<details>
<summary>Ver resposta</summary>

**Resposta: C**

O parent do span "Calculate rate" é o span "Call shipping" (span-102), porque o Shipping Service fez a chamada de cálculo. As relações parent-child mostram a hierarquia de chamadas.

</details>

---

### Pergunta 7
**Um desenvolvedor está debugando um API endpoint lento. Com auto-instrumentação, ele vê que a requisição levou 800ms, mas a única chamada ao banco de dados dentro dela levou só 100ms. Qual é o motivo mais provável para os 700ms de diferença?**

A) O trace está quebrado  
B) Latência de rede  
C) A query no banco de dados está mentindo sobre sua duração  
D) Tempo não explicado (overhead do framework, serialization, lógica de negócio não instrumentada)  

<details>
<summary>Ver resposta</summary>

**Resposta: D**

Os 700ms são **tempo não explicado** — trabalho que aconteceu no span parent mas não foi capturado pelos spans filhos. Isso normalmente é:
- Overhead do framework (parsing da requisição, roteamento)
- Serialization/deserialization
- Lógica de negócio que não está instrumentada (funções customizadas)
- Espera por thread pools ou locks

É por isso que instrumentação manual importa — ela preenche essas lacunas.

</details>

---

### Pergunta 8
**Qual é a diferença entre span attributes e resource attributes?**

A) Não há diferença, são a mesma coisa  
B) Attributes são opcionais; resources são obrigatórios  
C) Attributes descrevem a operação; resources descrevem o serviço/host  
D) Attributes são para traces; resources são para metrics  

<details>
<summary>Ver resposta</summary>

**Resposta: C**

**Span attributes** descrevem a operação específica:
- `http.request.method = "POST"`
- `db.statement = "SELECT * FROM orders"`
- `customer.id = "67890"`

**Resource attributes** descrevem quem criou o span:
- `service.name = "order-service"`
- `service.version = "1.5.2"`
- `k8s.pod.name = "order-service-8a3c2-def45"`

Resources são anexados a todos os spans daquele serviço.

</details>

---

### Pergunta 9
**Olhe para esse waterfall chart:**

```
GET /checkout (1500ms)   |████████████████████████|
├─ Task X (200ms)        |████|
├─ Task Y (300ms)        |    ██████|
└─ Task Z (400ms)        |          ████████|
```

**O que você pode concluir sobre as Tasks X, Y e Z?**

A) Elas rodaram em paralelo  
B) As Tasks Y e Z rodaram em paralelo  
C) O trace está quebrado  
D) Elas rodaram sequencialmente (uma depois da outra)  

<details>
<summary>Ver resposta</summary>

**Resposta: D**

As barras não se sobrepõem, o que significa que as operações aconteceram uma depois da outra (sequencial). Se elas se sobrepusessem na linha do tempo, seriam paralelas. Repare também: 200ms + 300ms + 400ms = 900ms, mas o parent é de 1500ms. Os outros 600ms são tempo não explicado (overhead do framework, lógica de negócio, etc.).

</details>

---

## Seção 3: Convenções Semânticas (Dia 5)

### Pergunta 10
**Por que convenções semânticas existem?**

A) Para deixar o código do OpenTelemetry mais limpo  
B) Para reduzir o tamanho dos dados de telemetry  
C) São boas práticas opcionais, não realmente necessárias  
D) Para garantir que spans de serviços/linguagens diferentes possam ser consultados de forma consistente  

<details>
<summary>Ver resposta</summary>

**Resposta: D**

Sem convenções, um serviço pode usar `request_method`, outro `http.request.method`, outro `method`. Você não consegue escrever uma única query que funcione em todo lugar. Convenções semânticas padronizam os nomes de attributes para que a telemetry seja interoperável.

</details>

---

### Pergunta 11
**Qual dessas opções segue as convenções semânticas do OpenTelemetry para uma requisição HTTP?**

A) `method: "post"`, `path: "/orders"`, `status: "200"`  
B) `request.method: "POST"`, `request.path: "/orders"`, `response.code: 200`  
C) `http.request.method: "POST"`, `http.route: "/orders"`, `http.response.status_code: 200`  
D) `httpMethod: "POST"`, `httpRoute: "/orders"`, `statusCode: 200`  

<details>
<summary>Ver resposta</summary>

**Resposta: C**

Convenções semânticas especificam:
- `http.request.method` (maiúsculo: GET, POST, PUT)
- `http.route` (padrão de rota, não a URL completa)
- `http.response.status_code` (inteiro, não string)

Repare no padrão: `namespace.attribute_name` (tudo minúsculo com underscores).

</details>

---

### Pergunta 12
**Você está instrumentando uma função de processamento de pedidos. Quais attributes seguem as melhores práticas?**

A) 
```python
span.set_attribute('total', 129.99)
span.set_attribute('currency', 'EUR')
```

B) 
```python
span.set_attribute('order.total', 129.99)
span.set_attribute('order.currency', 'EUR')
```

C) 
```python
span.set_attribute('OrderTotal', 129.99)
span.set_attribute('OrderCurrency', 'EUR')
```

D) 
```python
span.set_attribute('order_total', 129.99)
span.set_attribute('order_currency', 'EUR')
```

<details>
<summary>Ver resposta</summary>

**Resposta: B**

Siga o padrão de convenção semântica mesmo para attributes customizados:
- Use um namespace (`order.*` para attributes relacionados a pedidos)
- Use notação de ponto (`order.total`, não `order_total`)
- Use minúsculo com underscores dentro dos nomes (`http.response.status_code`)

Isso mantém seus attributes customizados consistentes com os padrões do OpenTelemetry.

</details>

---

### Pergunta 13
**Qual é a diferença entre attributes de high-cardinality e low-cardinality?**

A) Attributes de high-cardinality são mais importantes  
B) Attributes de high-cardinality são mais rápidos de consultar  
C) Não há diferença  
D) Attributes de high-cardinality têm muitos valores únicos; low-cardinality têm poucos  

<details>
<summary>Ver resposta</summary>

**Resposta: D**

**Low cardinality:** `http.request.method` (GET, POST, PUT, DELETE... ~10 valores)  
**High cardinality:** `customer.id` (milhões de clientes únicos)

Attributes de high-cardinality são úteis para debugging, mas caros para armazenar e consultar em escala. Use-os deliberadamente.

</details>

---

## Seção 4: Instrumentação (Dia 6)

### Pergunta 14
**Qual é a diferença entre auto-instrumentação e instrumentação manual?**

A) Auto-instrumentação é para produção; manual é para desenvolvimento  
B) Auto-instrumentação é sempre melhor  
C) São a mesma coisa, só com nomes diferentes  
D) Auto-instrumentação instrumenta bibliotecas (HTTP, DB); manual instrumenta sua lógica de negócio  

<details>
<summary>Ver resposta</summary>

**Resposta: D**

**Auto-instrumentação:** Envolve (wraps) as bibliotecas que você já usa (Flask, PostgreSQL, requests) e cria spans automaticamente. Ela enxerga requisições HTTP, queries no banco de dados, etc.

**Instrumentação manual:** Você escreve código para criar spans para sua lógica de negócio customizada (por exemplo, `calculateDiscount()`, `checkInventory()`). Auto-instrumentação não consegue ver suas funções.

Sistemas em produção precisam das duas.

</details>

---

### Pergunta 15
**Olhe para esse código:**

```python
@app.route('/checkout', methods=['POST'])
def checkout():
    verify_payment(request.json)           # Line A
    discount = apply_coupons(request.json) # Line B
    db.execute('INSERT INTO orders ...')   # Line C
    send_sms(request.json['phone'])        # Line D
    return jsonify({'status': 'success'})
```

**Com só auto-instrumentação habilitado, quais linhas criam spans?**

A) Todas elas  
B) Linhas A e B  
C) Linhas C e D  
D) Só a Linha C (query no banco de dados)  

<details>
<summary>Ver resposta</summary>

**Resposta: D**

Só a Linha C (query no banco de dados) cria um span automaticamente, porque a instrumentação do PostgreSQL/MySQL envolve o cliente do banco de dados.

As Linhas A, B e D são suas funções customizadas. Auto-instrumentação não consegue ver dentro delas. Você precisa de instrumentação manual para criar spans para essas operações.

(A Linha D pode criar um span se `send_sms()` usar um cliente HTTP como `requests`, que é auto-instrumentado. Mas se for uma implementação customizada de API de SMS, não haverá span.)

</details>

---

### Pergunta 16
**Como auto-instrumentação funciona por baixo dos panos?**

A) Ela modifica seu código-fonte em tempo de compilação  
B) Ela roda como um processo separado que observa sua aplicação  
C) Ela exige que você chame APIs de instrumentação manualmente  
D) Ela usa monkey-patching para envolver funções de bibliotecas  

<details>
<summary>Ver resposta</summary>

**Resposta: D**

Auto-instrumentação usa **monkey-patching** (também chamado de wrapping). Ela intercepta funções de bibliotecas (como `flask.route()` ou `cursor.execute()`) e as envolve com a lógica de criação de spans:

```python
# Simplified example
original_execute = cursor.execute
def wrapped_execute(sql, params=None):
    span = tracer.start_span('db.query')
    result = original_execute(sql, params)
    span.end()
    return result
cursor.execute = wrapped_execute
```

Seu código de aplicação não muda. O comportamento da biblioteca é aprimorado em tempo de execução.

</details>

---

### Pergunta 17
**O que esse código faz?**

```python
with tracer.start_as_current_span('check_inventory'):
    current_span = trace.get_current_span()
    current_span.set_attribute('product.sku', sku)
    available = check_inventory_levels(sku)
```

A) Ele instrumenta automaticamente a função `check_inventory_levels()`  
B) Ele envia dados do produto para o backend  
C) É um código inválido e não vai funcionar  
D) Ele cria manualmente um span ao redor da chamada de função  

<details>
<summary>Ver resposta</summary>

**Resposta: D**

Isso é **instrumentação manual**. Você está explicitamente:
1. Iniciando um span (`start_as_current_span`)
2. Pegando uma referência a ele (`get_current_span`)
3. Adicionando um attribute (`set_attribute`)
4. Rodando sua lógica de negócio (`check_inventory_levels`)
5. O span termina automaticamente ao sair do bloco `with`

Isso cria um span que vai aparecer no seu trace, mostrando quanto tempo `check_inventory_levels()` levou.

</details>

---

### Pergunta 18
**Qual afirmação sobre context propagation é VERDADEIRA?**

A) Context propagation só funciona dentro de um único serviço  
B) Context propagation exige código manual em cada serviço  
C) Context propagation é opcional para distributed tracing  
D) Context propagation passa trace IDs entre serviços via HTTP headers  

<details>
<summary>Ver resposta</summary>

**Resposta: D**

Context propagation é como os trace IDs viajam entre serviços. Quando o Order Service chama o Shipping Service, o trace context é injetado nos HTTP headers:

```http
GET /shipping HTTP/1.1
traceparent: 00-xyz789-span102-01
            └──┬──┘ └──┬──┘
          trace_id  span_id
```

O Shipping Service extrai esse header e continua o trace. Isso acontece automaticamente com auto-instrumentação.

</details>

---

## Seção 5: Cenários Práticos

### Pergunta 19
**Você instrumenta seu código e roda ele, mas nenhum trace aparece no seu observabilidade backend. Qual é a causa MENOS provável?**

A) Você esqueceu de iniciar o OpenTelemetry SDK  
B) O trace foi descartado pelo sampling (a sampling rate está baixa demais)  
C) A URL do exporter está incorreta  
D) Você usou convenções semânticas incorretamente  

<details>
<summary>Ver resposta</summary>

**Resposta: D**

Convenções semânticas incorretas (por exemplo, usar `request_type` em vez de `http.request.method`) não impedem que os traces apareçam. Elas só deixam os attributes inconsistentes.

Causas comuns de traces ausentes:
- SDK não inicializado
- Exporter mal configurado (URL errada)
- Sampling rate baixa demais (por exemplo, 0.01 = 1% dos traces)
- Problemas de rede entre a aplicação e o backend

</details>

---

### Pergunta 20
**Dado esse trace:**

```
POST /order (2500ms)
├─ Validate items (15ms)
├─ Call inventory (2200ms)
│  └─ Check stock (1800ms)
└─ Create record (150ms)
```

**O inventory service tem 400ms de tempo não explicado (2200ms - 1800ms). Você adiciona instrumentação manual e encontra:**

```
POST /order (2500ms)
├─ Validate items (15ms)
├─ Call inventory (2200ms)
│  ├─ Reserve items (350ms)      ← NEW
│  └─ Check stock (1800ms)
└─ Create record (150ms)
```

**O que eram os 400ms não explicados?**

A) Latência de rede  
B) Tempo de conexão com o banco de dados  
C) Overhead do framework  
D) A operação de reserva de item que não estava instrumentada antes  

<details>
<summary>Ver resposta</summary>

**Resposta: D**

A operação de reserva de 350ms era lógica de negócio que auto-instrumentação não conseguia enxergar. Instrumentação manual revelou isso. Os 50ms restantes (2200 - 350 - 1800) provavelmente são overhead do framework ou serialization.

É por isso que instrumentação manual importa — ela preenche as lacunas de visibilidade.

</details>

---

### Pergunta 21
**Você quer ver todas as queries no banco de dados de todos os serviços que levaram mais de 2 segundos. Qual query funciona por causa das convenções semânticas?**

A) `db.query.duration > 2000ms`  
B) `database.statement.time > 2s`  
C) `query.execution_time > 2000`  
D) `db.system = "postgresql" AND duration > 2000ms`  

<details>
<summary>Ver resposta</summary>

**Resposta: D**

Porque todos os serviços seguem as convenções semânticas:
- Spans de banco de dados têm o attribute `db.system` (postgresql, mysql, mongodb, etc.)
- Todos os spans têm um campo `duration`
- Você consegue fazer query em todos os serviços com uma única query consistente

Sem convenções, cada serviço usaria nomes de attributes diferentes, tornando essa query impossível.

</details>

---

### Pergunta 22
**Você está configurando o OpenTelemetry pela primeira vez. Qual é a ordem recomendada?**

A) Instrumentação manual → Auto-instrumentação → Configurar o SDK  
B) Auto-instrumentação → Instrumentação manual → Configurar o SDK  
C) Configurar o SDK → Auto-instrumentação → Instrumentação manual  
D) Instrumentação manual → Configurar o SDK → Auto-instrumentação  

<details>
<summary>Ver resposta</summary>

**Resposta: C**

**Ordem recomendada:**
1. **Configurar o SDK** (definir nome do serviço, exporter, sampling)
2. **Habilitar auto-instrumentação** (ganhar 80% de cobertura de graça)
3. **Adicionar instrumentação manual** (preencher as lacunas na lógica de negócio)

Isso te dá vitórias rápidas (auto-instrumentação) antes de investir tempo em spans manuais.

</details>

---

## Gabarito

| Pergunta | Resposta | Tópico |
|----------|--------|-------|
| 1 | A | Observabilidade vs Monitoramento |
| 2 | C | Traces vs Metrics vs Logs |
| 3 | C | Fluxo de debugging |
| 4 | D | Logs em sistemas distribuídos |
| 5 | D | Fundamentos de spans |
| 6 | C | Relações parent-child |
| 7 | D | Tempo não explicado |
| 8 | C | Attributes vs Resources |
| 9 | D | Lendo waterfall charts |
| 10 | D | Propósito das convenções semânticas |
| 11 | C | Convenções semânticas de HTTP |
| 12 | B | Nomenclatura de attributes customizados |
| 13 | D | Cardinality |
| 14 | D | Auto vs Manual |
| 15 | D | O que auto-instrumentação enxerga |
| 16 | D | Como auto-instrumentação funciona |
| 17 | D | Código de instrumentação manual |
| 18 | D | Context propagation |
| 19 | D | Troubleshooting de traces ausentes |
| 20 | D | Descoberta de tempo não explicado |
| 21 | D | Fazendo query com conventions |
| 22 | C | Ordem de configuração |

---

## Como você se saiu?

- **0-8 acertos:** Revise o material da Semana 1, especialmente os Dias 4-6
- **9-13 acertos:** Boa base, mas revisite convenções semânticas e instrumentação
- **14-18 acertos:** Entendimento sólido! Pronto para a Semana 2
- **19-22 acertos:** Excelente! Você dominou os conceitos da Semana 1

**Próximo passo:** Avance para a Semana 2 (APIs e SDK do OpenTelemetry) ou revise qualquer tópico em que você teve dificuldade.

---

**Quer mais prática?** Tente construir uma aplicação simples instrumentada usando o que você aprendeu na Semana 1!
