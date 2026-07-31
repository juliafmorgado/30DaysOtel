# Dia 19 – OTTL: Transformações Avançadas de Dados

Ontem aprendemos sobre exporters. Hoje vamos explorar o **OTTL (OpenTelemetry Transformation Language)**, uma forma poderosa de modificar nossos dados de telemetry antes que eles sejam exportados.

> **Exemplos completos:** Todas as configurações de OTTL discutidas hoje estão disponíveis em [`examples/day19-ottl/`](../examples/day19-ottl/)

---

## O Que é OTTL e Por Que Precisamos Dele?

Imagine que estamos coletando traces da nossa aplicação, mas percebemos que:
- Os nomes dos nossos spans são técnicos demais: `POST /api/v1/users/create` 
- Queremos nomes mais amigáveis ao negócio: `user_registration`
- Precisamos remover dados sensíveis, como senhas, dos attributes
- Queremos adicionar categorias de performance: "fast", "slow", "critical"

**O OTTL (OpenTelemetry Transformation Language) resolve esses problemas.** É como ter um filtro inteligente que consegue ler, modificar e enriquecer nossos dados de telemetry enquanto eles passam pelo Collector.

**Pense no OTTL como um "localizar e substituir" turbinado**, só que, em vez de mexer só em texto, conseguimos transformar qualquer parte dos nossos dados de telemetry com base em condições que definimos.

> [!Note]
> Não confunda OTTL com OTLP
> Como vimos no [Dia 15](./dia15.md), o OTLP é um protocolo, uma forma de enviar dados do ponto A ao ponto B. Já o OTTL é uma forma de modificar dados.
---

## Como o OTTL Funciona: O Básico

O OTTL funciona dentro do **Transform processor** na configuração do nosso Collector. Aqui está o padrão básico:

```yaml
processors:
  transform:
    trace_statements:
      - context: span
        statements:
          - set(name, "user_registration") where name == "POST /api/users"
```

**O que isso faz:**
1. **Olha para cada span** (`context: span`)
2. **Encontra os spans** cujo nome é igual a "POST /api/users" (`where name == "POST /api/users"`)
3. **Muda o nome** para "user_registration" (`set(name, "user_registration")`)

**O padrão é sempre:** `FUNCTION(what_to_change, new_value) WHERE condition`

---

## Entendendo os Contexts do OTTL

O OTTL pode atuar em diferentes partes dos nossos dados de telemetry. Pense nos contexts como "o que estou olhando agora?"

**Para Traces:**
- `resource` - Informações sobre nosso serviço (nome do serviço, versão)
- `span` - Operações individuais (requisições HTTP, chamadas ao banco de dados)

**Para Metrics:**
- `resource` - Informações do serviço
- `metric` - A própria metric (nome, descrição)
- `datapoint` - Valores individuais da metric

**Para Logs:**
- `resource` - Informações do serviço  
- `log` - Entradas individuais de log

**Na maior parte do tempo, vamos trabalhar com o context `span`** -> é ali que vivem as operações da nossa aplicação.

---

## As Funções Mais Úteis do OTTL

### 1. set() - Alterando Valores

**O que faz:** Altera ou adiciona valores aos nossos dados de telemetry.

**Usos comuns:**
- Renomear spans para ficarem mais amigáveis ao negócio
- Adicionar novos attributes com base em dados já existentes
- Categorizar operações

**Exemplos:**
```yaml
# Make span names more readable
- set(name, "user_registration") where name == "POST /api/users"

# Add business categories
- set(attributes["business.area"], "payments") where name matches ".*payment.*"

# Add performance labels  
- set(attributes["performance.category"], "slow") where duration > 1000000000  # > 1 second
```

> **Veja os exemplos completos:** [`basic-transformations.yaml`](../examples/day19-ottl/basic-transformations.yaml)

### 2. delete_key() - Removendo Dados Sensíveis

**O que faz:** Remove attributes que não queremos manter.

**Usos comuns:**
- Remover senhas, números de cartão de crédito, API keys
- Limpar informações de debug em produção
- Remover attributes temporários

**Exemplos:**
```yaml
# Remove sensitive information
- delete_key(attributes, "user.password")
- delete_key(attributes, "credit_card.number")

# Remove debug info in production
- delete_key(attributes, "debug.info") where resource.attributes["environment"] == "production"
```

### 3. Funções de String - Manipulação de Texto

**Concat()** - Combinando texto:
```yaml
# Create descriptive endpoint names
- set(attributes["http.endpoint"], Concat([attributes["http.request.method"], " ", attributes["http.route"]], ""))
```

**Split()** - Separando texto:
```yaml
# Extract domain from email
- set(attributes["user.domain"], Split(attributes["user.email"], "@")[1])
```

**Replace()** - Localizando e substituindo texto:
```yaml
# Clean up service names
- set(resource.attributes["service.name"], replace_pattern(resource.attributes["service.name"], "[-_]", "."))
```

---

## Casos de Uso Reais do OTTL

### Caso de Uso 1: Tornando os Spans Amigáveis ao Negócio
**Problema:** Nomes técnicos de spans, como `POST /api/v1/users/create`  
**Solução:** Renomear para termos de negócio, como `user_registration`  
> **Veja o exemplo completo:** [`business-logic.yaml`](../examples/day19-ottl/business-logic.yaml)

### Caso de Uso 2: Adicionando Categorias de Performance  
**Problema:** Números brutos de duração são difíceis de interpretar  
**Solução:** Adicionar labels como "fast", "slow", "critical" com base na duração  
> **Veja o exemplo completo:** [`performance-classification.yaml`](../examples/day19-ottl/performance-classification.yaml)

### Caso de Uso 3: Extraindo Informações do Usuário
**Problema:** Dados do usuário escondidos nos headers HTTP  
**Solução:** Extrair os headers para attributes de span adequados, facilitando os filtros  
> **Veja o exemplo completo:** [`data-enrichment.yaml`](../examples/day19-ottl/data-enrichment.yaml)

### Caso de Uso 4: Business Intelligence para E-commerce
**Problema:** Precisamos categorizar operações pelo valor que representam para o negócio  
**Solução:** Adicionar contexto de negócio com base nos padrões das operações  
> **Veja o exemplo completo:** [`ecommerce-example.yaml`](../examples/day19-ottl/ecommerce-example.yaml)

---

## Trabalhando com Diferentes Tipos de Dados

O OTTL consegue lidar com vários tipos de dados e operações:

**Números e Matemática:**
- Converter unidades: bytes para MB, nanosegundos para segundos
- Calcular porcentagens e proporções
- Comparar valores com `>`, `<`, `>=`, `<=`

**Múltiplas Condições:**
- Combine com `and`: `where status >= 500 and name == "payment"`
- Combine com `or`: `where duration > 1000 or status >= 400`
- Verifique listas: `where method in ["POST", "PUT", "DELETE"]`

**Padrões de Texto:**
- Encontrar texto: `where name matches ".*login.*"` (contém "login")
- Correspondência de padrões: `where route matches "/api/v1/.*"` (começa com /api/v1/)

### Seguindo as Convenções Semânticas

Ao adicionar attributes customizados, siga as convenções semânticas do OpenTelemetry:

**Boas práticas:**
- Use attributes com namespace: `business.area`, `performance.category`
- Siga os padrões já existentes: `user.domain`, `debug.info`
- Use os attributes HTTP padrão: `http.request.method`, `http.response.status_code`

**Exemplos:**
```yaml
# Good: Properly namespaced custom attributes
- set(attributes["business.priority"], "high") where name matches ".*payment.*"
- set(attributes["performance.tier"], "premium") where duration < 100000000

# Good: Standard semantic convention attributes
- set(attributes["http.request.method"], "POST") where name == "user_registration"
```

---

## OTTL para Metrics e Logs

O OTTL funciona com todos os tipos de telemetry, não só com traces:
- **Metrics:** Renomear metrics, adicionar labels a partir dos resource attributes
- **Logs:** Extrair dados estruturados das mensagens de log, normalizar os níveis de log

> **Exemplos completos:** [`metrics-transformations.yaml`](../examples/day19-ottl/metrics-transformations.yaml) e [`logs-transformations.yaml`](../examples/day19-ottl/logs-transformations.yaml)


---

## Dicas de Performance para o OTTL

**Mantenha as condições simples:** Use `==` em vez de padrões `matches` complexos sempre que possível - é bem mais rápido.

**Seja específico:** Aponte exatamente o que você quer transformar com condições `where` precisas. Evite transformações que rodam em todo e qualquer span.

**Use múltiplos processors:** Divida transformações complexas em processors menores e mais focados, em vez de um processor gigante só.

**O segredo:** o OTTL é poderoso, mas com grandes poderes vêm a necessidade de condições bem pensadas!
---

## Debugando Nossas Transformações OTTL

Quando o nosso OTTL não está funcionando como esperado:

**1. Use o logging exporter** para ver o que está acontecendo:
```yaml
exporters:
  logging:
    loglevel: debug

service:
  pipelines:
    traces:
      processors: [transform/my-transforms]
      exporters: [logging, jaeger]  # Send to both
```

**2. Adicione debug attributes** para acompanhar nossas transformações:
```yaml
statements:
  - set(attributes["debug.original_name"], name)  # Keep original
  - set(name, "user_registration") where name == "POST /api/users"
  - set(attributes["debug.transformed"], "true") where name == "user_registration"
```

**3. Comece simples** e vá adicionando complexidade aos poucos:
```yaml
# Test basic condition first
- set(attributes["debug.test"], "found") where name == "POST /api/users"

# Then add more conditions
- set(attributes["debug.test"], "found") where name == "POST /api/users" and attributes["http.response.status_code"] >= 400
```

> **Configuração completa de debug:** [`debug-config.yaml`](../examples/day19-ottl/debug-config.yaml)

---

## Quando Usar OTTL vs Outros Processors

**Use o OTTL quando você precisar:**
- Renomear spans com base em condições complexas
- Adicionar contexto de negócio à sua telemetry
- Extrair dados de um attribute para criar novos attributes
- Remover informações sensíveis de forma condicional
- Fazer cálculos ou enriquecimento de dados

**Use outros processors quando você precisar:**
- **Attributes processor** - Adicionar/remover/atualizar attributes de forma simples
- **Resource processor** - Modificar só os resource attributes
- **Batching** - Os exporters modernos já cuidam disso internamente para garantir confiabilidade
- **Filter processor** - Descartar spans/metrics/logs inteiros

**O OTTL é mais poderoso, mas também mais complexo.** Comece com processors mais simples e migre para o OTTL quando precisar dessa flexibilidade extra.

---

## O Que Levamos Para o Dia 20

Hoje aprendemos sobre o OTTL e como ele nos permite modificar os dados de telemetry enquanto eles passam pelo Collector, transformando spans técnicos em informações com significado para o negócio.

**O que já conseguimos fazer:**
- Transformar nomes técnicos de spans em labels amigáveis ao negócio
- Adicionar categorias de performance com base na duração
- Extrair dados importantes dos headers HTTP
- Debugar transformações OTTL quando elas não funcionam como esperado

**O padrão:** `FUNCTION(what, new_value) WHERE condition` -> simples, mas poderoso!

**Amanhã (Dia 20)** vamos aprender sobre **Deployment & Scaling** (onde colocar nossos Collectors e como lidar com o crescimento).

Agora temos um pipeline completo de Collector: receber os dados, processá-los, transformá-los com OTTL e exportá-los. Amanhã vamos ver como colocar tudo isso em produção no mundo real!