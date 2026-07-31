# Dia 17 – Processors: Transformando Dados no Pipeline

Ontem aprendemos como os receivers trazem dados para o Collector. Hoje vamos explorar os **processors**, os componentes que transformam, filtram e enriquecem os dados de telemetry antes de serem exportados.

> **Exemplos práticos:** Configurações completas estão disponíveis em [`examples/day17-processors/`](../examples/day17-processors/)

---

## O Que Já Sabemos

Como vimos no [Dia 15](./dia15.md), os processors são o **meio** do pipeline. É aí que o verdadeiro poder do Collector aparece. Eles conseguem fazer coisas que o SDK simplesmente não consegue.

```
Receivers → Processors → Exporters
              ↓
        "Transform, filter, enhance data..."
```

---

## Como os Processors Funcionam

Os processors rodam **em ordem** dentro de um pipeline. Eles podem:
- adicionar/remover/alterar attributes
- descartar dados (filter/sampling)
- reformatar dados (transform)

Eles não conseguem:
- "recuperar" telemetry que nunca foi enviada
- mudar o que sua aplicação instrumentou (eles só modificam o que chega)

---

## Os Processors Essenciais

### A Evolução do Batching no OpenTelemetry

**O Jeito Antigo: Batch Processor (Ainda Funciona, Mas Está Sendo Substituído)**

Por anos, o batch processor foi a abordagem recomendada para exportar telemetry de forma eficiente. Só que agora o OpenTelemetry está movendo a funcionalidade de batching dos processors para os exporters, buscando mais confiabilidade ([GitHub issue #8122](https://github.com/open-telemetry/opentelemetry-collector/issues/8122), [#13582](https://github.com/open-telemetry/opentelemetry-collector/issues/13582)).

O problema é que o batch processor acumula dados na memória e **se o Collector cair, todos os dados que estavam na memória são perdidos para sempre**. 

**O Jeito Novo: Batching no Lado do Exporter (vamos explorar isso amanhã, no Dia 18)**

Exporters modernos cuidam do batching internamente, com armazenamento persistente, para garantir mais confiabilidade.

> **Para fins de aprendizado**: vamos mostrar exemplos do batch processor no diretório [`examples/`](../examples/day17-processors/) para entender os conceitos, mas saiba que os deployments modernos estão deixando de usá-lo.

---

### Attributes Processor: Adicionando Contexto

O attributes processor adiciona, modifica ou remove attributes de spans, metrics e logs.

> Analogia: é como colocar etiquetas de endereço em pacotes ou remover adesivos antigos de envio.

**Exemplo básico:**
```yaml
processors:
  attributes:
    actions:
      - key: environment
        value: production
        action: insert
```

**Principais capacidades:**
- **Adicionar** contexto de negócio (environment, team, region)
- **Modificar** attributes existentes (renomear, atualizar valores)
- **Remover** dados sensíveis (hash de e-mails, apagar informações de debug)
- Processamento **condicional** (só para services específicos)

> **Veja exemplos detalhados:** confira os arquivos YAML individuais nesse diretório para configurações específicas de processors.

---

### Filter Processor: Removendo Dados Indesejados

O filter processor descarta telemetry indesejada para reduzir custos e ruído.

> Analogia: é como o segurança de uma balada, que só deixa passar os dados certos.

**Exemplo básico:**
```yaml
processors:
  filter:
    traces:
      span:
        - 'name == "GET /health"'  # Remove health checks
        - 'duration < 1000000'     # Remove spans < 1ms
```

**Principais capacidades:**
- **Otimização de custo** (remover health checks, aplicar sampling em endpoints de alto volume)
- **Redução de ruído** (filtrar dados de debug, services de teste)
- **Condições complexas** (combinar múltiplos critérios)
- Filtragem **multi-signal** (traces, metrics, logs)

---

### Resource Processor: Metadados do Service

O resource processor modifica os resource attributes que descrevem o próprio service.

**Diferença importante:**
- **Resource processor**: fala "sobre o service" (environment, cluster, team)
- **Attributes processor**: fala "sobre a operação" (HTTP route, user ID, tamanho da request)

**Exemplo básico:**
```yaml
processors:
  resource:
    attributes:
      - key: deployment.environment
        value: production
        action: insert
```

---

### Transform Processor: Lógica Avançada

O transform processor usa a OTTL (OpenTelemetry Transformation Language) para manipulações complexas de dados.

> **Comece simples**: use `attributes` e `filter` primeiro. Recorra ao `transform` quando as regras ficarem complexas demais.

**Quando usar o transform:**
- Renomear spans com base em condições complexas
- Adicionar attributes calculados
- Extrair dados de um attribute para criar outros novos
- Transformações complexas de lógica de negócio

---

## A Ordem dos Processors Importa

Os processors rodam na ordem em que estão listados. **A ordem impacta bastante o resultado.**

### Estratégia de Ordenação Ideal

```yaml
processors: [resource, filter, attributes, transform]
```

**Por que essa ordem funciona:**
1. **Resource primeiro** - estabelece o contexto do service
2. **Filter em segundo** - remove dados indesejados logo no início (economiza processamento)
3. **Attributes em terceiro** - adiciona contexto aos dados restantes
4. **Transform por último** - lógica complexa no conjunto de dados final

---

## Padrões do Mundo Real

### Estratégia de Pipeline Pronta para Produção

```yaml
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [
        resource,              # Service context
        filter/noise-reduction, # Remove noise early
        attributes/business,   # Add business context
        filter/sampling       # Apply sampling
      ]
      exporters: [modern-exporter]  # Handles batching internally
```

### Otimização de Performance

**Princípios-chave:**
- **Filtre cedo** para reduzir a carga de processamento
- **Evite transforms desnecessários** em dados de alto volume
- **Use condições adequadas** para minimizar o processamento
- **Monitore as metrics dos processors** para identificar gargalos

---

## Debugando Processors

### Veja o Que os Processors Fazem

Adicione um logging exporter para debugar o comportamento dos processors:

```yaml
exporters:
  logging/debug:
    loglevel: debug

service:
  pipelines:
    traces:
      processors: [your-processors]
      exporters: [logging/debug, your-real-exporter]
```

### Monitore a Performance

Habilite o self-monitoring do Collector:

```yaml
service:
  telemetry:
    metrics:
      address: 0.0.0.0:8888
```

Confira as metrics dos processors: `curl http://localhost:8888/metrics | grep processor`

---

## O Que Levamos Para o Dia 18

Hoje aprendemos como **transformar** dados no pipeline do Collector:

**Conceitos-chave:**
- **Evolução do batching** - migrando dos processors para os exporters em busca de confiabilidade
- **Tipos de processors** - attributes, filter, resource, transform
- **Estratégia de ordenação** - resource → filter → attributes → transform
- **Otimização de performance** - filtrar cedo, processar com eficiência

**Amanhã (Dia 18)** vamos aprender sobre **Exporters**, como eles enviam os dados processados para os backends, e por que os exporters modernos cuidam do batching internamente para garantir mais confiabilidade.

Nos vemos no Dia 18!