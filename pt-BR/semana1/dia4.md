# Dia 4 – Spans: Lendo a linha do tempo de uma requisição

Ontem seguimos uma requisição de ponta a ponta e aprendemos o que é um **trace**: o registro da jornada de uma requisição através de um sistema distribuído.

Hoje vamos dar um zoom e responder: **do que essa jornada é realmente feita?**

## A resposta em uma frase

Um trace é feito de **spans**, e cada span é uma unidade de trabalho cronometrada. É isso. Tudo mais hoje é só para ajudar você a enxergar isso com clareza.

## Começando pelo que já sabemos: uma requisição lenta

Recebemos um alerta:

> "O endpoint `/pay` está lento."

Olhamos as metrics e vemos que a latência p95 saltou de 300ms para 2.1 segundos. Abrimos um trace. Aqui está o que vemos:

<img width="1026" height="514" alt="trace hierarchy" src="https://github.com/user-attachments/assets/e6bb8119-f4aa-4def-b4c2-1f26d57f98bb" />

Essa imagem mostra **um trace**: uma requisição.

Cada barra horizontal é um **span**.
O comprimento da barra é quanto tempo aquela operação levou.
A indentação mostra quem chamou quem.

- A barra do topo (`POST /pay`) é a requisição inteira.
- As barras abaixo são o trabalho feito dentro dela.
- A barra mais longa geralmente explica a lentidão.

Nesse trace, a maioria dos spans é curta.
Um span não é.

Essa é a pista.

---

## O que é um span, afinal?

Um span é um registro que diz: "Eu fiz essa coisa, ela começou nesse horário, e levou esse tempo."

É isso.

### Span para "POST /pay"

```
name: "POST /pay"
start_time: 14:32.000
end_time: 14:32.100
duration: 2100ms
```

### Span para "Database query"
```
name: "SELECT * FROM rates"
start_time: 14:32.050
end_time: 14:32.000
duration: 1950ms
```

Percebeu algo? O tempo do span do database está **dentro** do tempo do span do `/pay`. Isso acontece porque o trabalho no database aconteceu **durante** a requisição de pagamento.

Isso nos leva à coisa mais importante sobre spans:

## Spans formam uma hierarquia (relações pai-filho)

A requisição `/pay` **criou** a chamada ao config service.
A chamada ao config service **criou** a query no database.

<img width="948" height="496" alt="Trace hierarchy flowchart" src="https://github.com/user-attachments/assets/72761125-f99e-43ad-a32a-682106b43d2b" />

Em termos de tracing:
- O Span A "POST /pay" é o **pai** do Span C "Call Config Service"
- O Span C "Call Config Service" é o **pai** do Span E "Database query"

**Por que isso importa?**

Porque essa hierarquia mostra o **caminho que a requisição percorreu**. Quando você vê um span lento, pode rastreá-lo de volta: "A query no database estava lenta → que foi chamada pelo Config Service → que foi chamado pela requisição de pagamento." Essa é a sua trilha de migalhas para debugging.

## Como os spans sabem quem são seus pais: a anatomia do span

Todo span armazena essas informações-chave:
```
trace_id: abc123              # Which request journey am I part of?
span_id: span-789             # My unique ID
parent_span_id: span-456      # Who created me?
name: "Database query"        # What am I?
start_time: 14:32.050         # When did I start?
duration: 1950ms              # How long did I take?
```

O **root span** (o primeiro span em um trace) tem `parent_span_id: null` porque nada o criou — é onde a requisição entrou no seu sistema.

>[!NOTE]
> **O trace ID é o fio que amarra tudo junto.**
> 
> Todos os spans com `trace_id: abc123` pertencem à mesma jornada de requisição. É assim que sua ferramenta de tracing sabe agrupá-los em uma única visualização de trace.

## Tornando os spans úteis: attributes

Até agora, um span só te diz 
> "algo levou 1950ms."
Não é muito útil.

**Attributes** são os detalhes que tornam os spans depuráveis. São pares chave-valor que descrevem o que aconteceu.

**Sem attributes:**
```
name: "Database query"
duration: 1950ms
```

**Com attributes:**
```
name: "Database query"
duration: 1950ms
attributes:
  db.system: "postgresql"
  db.statement: "SELECT * FROM rates WHERE currency = $1"
  db.name: "config_db"
  db.operation: "SELECT"
  db.rows_returned: 150000  ← Aha! Returning way too many rows
```

Agora você tem contexto. Você pode ver:
1. Qual database
2. Qual query
3. Qual instância do DB
4. Quantas linhas foram retornadas

**É isso que transforma "o database estava lento" em "essa query específica retornou 150 mil linhas em vez de 1."**

### Attributes comuns que você vai ver

**Para requisições HTTP:**
```
http.request.method: "POST"
http.route: "/pay"
http.response.status_code: 200
http.target: "/pay?user_id=12345"
```

**Queries no database:**
```
db.system: "postgresql"
db.statement: "SELECT * FROM users WHERE id = $1"
db.operation: "SELECT"
```

## Uma palavra rápida sobre cardinality (você vai ouvir esse termo)

**Cardinality** = quantos valores diferentes um attribute pode ter.

- `http.request.method` → Baixa cardinality (GET, POST, PUT, DELETE... ~10 valores)
- `user.id` → Alta cardinality (milhões de usuários possíveis)

Attributes de alta cardinality são ótimos para debugging de requisições individuais,
mas caros em escala.

Use-os de forma deliberada, não em todo lugar.

## Resources: "Quem criou esse span?"
**Attributes** descrevem a operação do span. **Resources** descrevem o serviço/processo que o criou.

Pense em resources como o "endereço de remetente" do span.
```
service.name: "payment-service"
service.version: "2.3.1"
deployment.environment: "production"
host.name: "ip-10-0-1-42"
k8s.pod.name: "payment-7d8f9-abc12"
```

>[!IMPORTANT]
> **Referência rápida:**
> - **Attributes** → O que aconteceu
> - **Resources** → Quem fez

## Como os spans viajam entre serviços: context propagation

Aqui está a pergunta que confunde muita gente: **"Como o Config Service sabe que faz parte do mesmo trace que o Payment Service?"**

Resposta: **O Payment Service avisa.**

Quando o Payment Service chama o Config Service, ele inclui as informações do trace nos headers HTTP:

```http
POST /config/rates HTTP/1.1
Host: config-service
traceparent: 00-abc123-span456-01
            └─┬──┘ └──┬──┘ └─┬─┘
          version  trace_id  span_id
```

O Config Service lê esse header e pensa: "Ah, eu faço parte do trace abc123, e meu pai é o span456."
Então o Config Service cria o próprio span:
```
trace_id: abc123              ← Same as Payment Service
span_id: span789              ← My new span ID
parent_span_id: span456       ← Payment's span ID
```

Isso se chama **context propagation**. O contexto do trace (trace ID + parent span ID) se propaga de serviço em serviço através dos headers HTTP.

## Baggage: rótulos extras que viajam com a requisição
Às vezes você quer anexar metadados que não fazem parte da estrutura do trace, mas que devem estar disponíveis para todos os spans da requisição.

Exemplos:
- `tenant.id = "acme_corp"` (para sistemas multi-tenant)
- `user.tier = "premium"` (para diferentes níveis de serviço)
- `experiment.group = "checkout_v2"` (para testes A/B)

Você define isso uma vez no ponto de entrada (API gateway), e isso se propaga automaticamente para todo serviço e span downstream.

**Por que não usar apenas span attributes?**
Span attributes são definidos individualmente em cada span. Baggage é definido uma vez e herdado por todos os spans. É como uma variável global com escopo de requisição.

## Distributed tracing: juntando tudo

**Distributed tracing** é a prática de criar traces que abrangem múltiplos serviços/processos/máquinas.

A parte "distributed" é o desafio, porque exige que:
1. Todo serviço gere trace/span IDs consistentes
2. Todo serviço propague o context corretamente
3. Todos os spans usem formatos compatíveis
4. Todos os spans vão para o mesmo backend (Jaeger, Tempo, etc.)
   
Historicamente, isso era difícil. Você precisava de bibliotecas de instrumentação para cada linguagem, gerenciamento cuidadoso de headers e formatos compatíveis em toda a sua stack.
**É por isso que o OpenTelemetry existe** (mais sobre isso lá pelo Dia 10). É um padrão que torna o distributed tracing interoperável entre linguagens, frameworks e backends.

## Um workflow real de debugging (usando spans)
Vamos reproduzir o cenário do início, mas agora com seu novo conhecimento:

**Alerta de metrics**: "a latência p95 para `POST /pay` está em 2.1s (normalmente 300ms)."

**Passo 1:** Pegue uma amostra de trace do período lento.

Você vê:
```
Trace abc123 (2100ms total)
└─ POST /pay (2100ms)
├─ Validate input (5ms)
├─ Call Config Service (2000ms) ← 🔥 This is the problem
│  └─ Database query (1950ms)    ← 🔥 And specifically this
└─ Process payment (50ms)
```

**Passo 2:** Clique no span do database. Verifique seus attributes:
```
db.statement = "SELECT * FROM rates WHERE currency = $1"
db.rows_affected = 150000 ← Way too many rows!
```

**Passo 3:** Hipótese: "A query está fazendo um full table scan porque perdemos um índice."

**Passo 4:** Busque nos logs pelo `span_id` desse span. Encontre: `[span_id=span789] WARN: Sequential scan on rates table (no index used)`

**Causa raiz encontrada em 3 minutos:** índice ausente em `rates.currency`.

É isso que os spans te dão: **uma linha do tempo com contexto que aponta exatamente para a operação problemática.**

>[!NOTE]
> **Por que os números não batem?**
>
> Você deve ter percebido: o span pai tem 2100ms, mas os filhos (5ms + 2000ms + 50ms) somam apenas 2055ms.
>
> Onde estão os outros 45ms?
>
> Isso é **tempo não explicado** — trabalho que aconteceu no span pai, mas que não foi capturado pelos spans filhos. Geralmente:
> - Overhead do framework (parsing de requisições, roteamento)
> - Serialização/deserialização
> - Espera por thread pools ou connection pools
> - Pausas de garbage collection
>
> Se essa lacuna for grande (tipo 500ms de 2000ms), é uma pista de que falta instrumentação para algumas operações.

## O que eu levo para o Dia 5

Eu sei que teve muita coisa pra absorver hoje! A conquista de hoje: **Spans são unidades de trabalho cronometradas que se aninham para formar um trace. Attributes e resources adicionam contexto. Context propagation (via propagators) é como os spans permanecem conectados entre serviços.**

Amanhã vamos olhar para **instrumentação**: como os spans realmente são criados no seu código (manual vs automática), e quais bibliotecas/ferramentas fazem isso por você.

Para o Dia 4, aqui está nosso modelo mental:

- **Trace** = a jornada inteira da requisição
- **Span** = um passo dessa jornada
- **Attributes** = o que aconteceu nesse passo
- **Resources** = quem realizou esse passo (o emissor)
- **Context propagation** = como os passos permanecem conectados entre serviços

Nos vemos no Dia 5!
