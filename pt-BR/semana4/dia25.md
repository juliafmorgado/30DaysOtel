# Dia 25 – Quando as Coisas Dão Errado: Lidando com Problemas de Produção em Escala

Ontem aprendemos a encontrar spans individuais que estavam faltando e falhas na propagação de contexto ao debugar traces distribuídos. Nos últimos dias, dominamos o debugging sistemático:

- **Dia 22:** Debugando o Collector (foco em infraestrutura) - "O Collector em si está funcionando?"
- **Dia 23:** Solucionando problemas de dados ausentes (foco no pipeline de ponta a ponta) - "Onde meus dados estão se perdendo?"
- **Dia 24:** Debugando traces distribuídos (foco na completude do trace) - "Por que esse span específico está faltando?"
- **Dia 25:** Confiabilidade do sistema sob carga (foco no sistema como um todo) - "Como mantemos o sistema inteiro funcionando quando ele está sobrecarregado?"

> **Lei de Murphy da observabilidade:** Seu sistema de observabilidade vai falhar exatamente quando você mais precisar dele - a menos que você o projete para não falhar.

---

## Um Choque de Realidade da Produção

É Black Friday. Seu e-commerce está recebendo 10x o tráfego normal. Mais usuários visitando seu site. Mais chamadas de API sendo feitas. Mais queries no banco de dados acontecendo.

Isso gera mais dados de telemetry. Cada request cria spans, então 10x de tráfego = 10x de spans para processar.

Como consequência, sua infraestrutura de observabilidade fica sobrecarregada. O Collector recebe 10x mais spans, e precisa processar e exportar 10x mais dados. Ele pode não ter CPU/memória suficiente para essa carga.

Ao mesmo tempo, seus backends de observabilidade também ficam sob pressão. O Jaeger precisa armazenar 10x mais traces, o Prometheus precisa lidar com 10x mais metrics... Esses sistemas podem estar rodando nos mesmos servidores que suas aplicações.

**Por Que Isso É um Problema?**
Seu serviço de pagamento está lento (problema da aplicação) -> Você quer checar os traces para entender o motivo -> Mas seu Collector caiu por causa do excesso de dados (problema de observabilidade) -> Então você não consegue ver os traces que te ajudariam a debugar o problema de pagamento

Isso acontece com mais frequência do que você imagina.

**A ironia cruel** é que o momento em que você mais precisa de observabilidade (durante incidentes) é exatamente quando ela tem mais chance de falhar (por causa do aumento de carga).

---

## Entendendo o Backpressure

### O Que É Backpressure?

Pense numa rodovia que de repente passa de três faixas para uma só. Os carros chegam ao ponto de fusão mais rápido do que conseguem passar por ele. Resultado? Um engarrafamento gigante que se estende por quilômetros.

Isso é backpressure em sistemas de observabilidade:
- As aplicações são os carros, enviando telemetry constantemente
- O Collector é a rodovia, processando e encaminhando os dados
- O backend (Jaeger) é o destino

Quando qualquer parte desacelera, você tem um engarrafamento de dados de telemetry.

### Gatilhos Comuns

**Picos de tráfego** são o culpado óbvio (Black Friday, conteúdo viral, ataques DDoS). Mas nem sempre é uma questão de volume:

- O banco de dados do backend tem problemas e responde devagar
- Partição de rede entre o Collector e o backend
- Collector mal configurado cria gargalos
- Esgotamento de recursos (memória, CPU, rede)

A parte complicada é que o backpressure se propaga em cascata. O Collector não consegue exportar → a memória sobe → começa a descartar dados → cai → todas as aplicações perdem telemetry.

### A Defesa em Três Camadas

**Camada 1: Memory Limiter (Válvula de Emergência)**
```yaml
processors:
  memory_limiter:
    limit_mib: 512
```
Quando a memória atinge um nível perigosamente alto, descarte os dados recebidos para evitar uma queda. É duro, mas necessário - perder alguns dados é melhor do que perder o sistema inteiro.

**Camada 2: Gerenciamento de Filas (Reservatório)**
```yaml
exporters:
  otlp/jaeger:
    sending_queue:
      enabled: true
      queue_size: 1000
```
Armazene os dados temporariamente quando o backend estiver lento. Isso lida bem com flutuações normais de performance.

**Camada 3: Sampling Adaptativo (Válvula de Alívio)**
```yaml
processors:
  probabilistic_sampler:
    sampling_percentage: 10.0  # Reduzir de 100% sob pressão
```
Quando a sobrecarga é constante, reduza o volume de dados. Ter alguns dados é infinitamente melhor do que não ter dados nenhum.

Essas camadas trabalham juntas de forma automática:
1. **Operação normal:** Tudo inativo, 100% de qualidade
2. **Pressão leve:** As filas entram em ação, mantendo a qualidade
3. **Pressão pesada:** O sampling reduz o volume
4. **Pressão crítica:** O memory limiter evita a queda do sistema
5. **Recuperação:** Retorno automático à qualidade total

Isso se chama **graceful degradation** (degradação graciosa) - o sistema mantém sua funcionalidade reduzindo temporariamente a qualidade em vez de falhar por completo.

---

## Prevenção de Perda de Dados

Em sistemas distribuídos, a perda de dados é inevitável. Redes falham, serviços caem, recursos se esgotam. A questão não é se você vai perder dados de telemetry, e sim como você vai lidar com isso.

### O Problema do Assassino Silencioso

A perda de dados mais perigosa é aquela que você nem percebe. Diferente de serviços que caem (o que é óbvio), spans descartados falham silenciosamente. Seus traces parecem normais, mas estão incompletos.

> [!IMPORTANT]
>
> Não confunda isso com o que vimos no [Dia 24](./dia24.md), sobre spans ausentes (problema de debugging). O foco ali era "Por que eu não estou vendo spans que deveriam estar lá?". Naquele caso, a causa eram problemas de configuração, instrumentação quebrada, problemas de rede.
>
> `App cria o span → Nunca chega ao Collector → Fica faltando nos traces`
> (Debugging: "Por que esse span não foi criado/enviado?")
>
> Aqui estamos falando de problemas de produção, quando "os spans foram criados e enviados, mas se perderam no pipeline". Na maioria das vezes, a causa é sobrecarga do sistema, esgotamento de recursos, falhas no backend.
>
> `App cria o span → Chega ao Collector → É descartado por sobrecarga → Fica faltando nos traces`
> (Produção: "Como lidamos com a perda de dados quando os sistemas estão sobrecarregados?")

**Monitoramento chave:**
- Entrada vs saída: está recebendo mais spans do que exportando?
- Utilização da fila: está constantemente cheia?
- Uso de memória: está se aproximando dos limites?
- Taxa de sucesso na exportação: qual percentual dá certo?

### Estratégias de Prevenção

**Filas Persistentes**
```yaml
exporters:
  otlp/jaeger:
    sending_queue:
      storage: file_storage
```
Salve os dados enfileirados em disco, não só em memória. Isso sobrevive a reinicializações e quedas do Collector.

**Múltiplos Caminhos de Exportação**
```yaml
service:
  pipelines:
    traces/primary:
      exporters: [otlp/jaeger]
    traces/backup:
      exporters: [file/backup]
```
Envie os dados para múltiplos destinos. Se o Jaeger cair, o backup continua recebendo os dados.

**Dead Letter Queues**
Quando dados falham consistentemente ao serem processados (spans malformados, trace IDs inválidos), envie-os para uma fila separada para inspeção manual. Isso evita que dados "envenenados" bloqueiem os dados saudáveis.

---

## Tratamento de Erros e Recuperação

### Exponential Backoff

Quando uma exportação falha, não tente novamente na hora - isso só martela backends que já estão com dificuldades. Em vez disso, espere progressivamente mais tempo entre as tentativas. Primeira nova tentativa depois de 1s, depois 2s, depois 4s, 8s, e assim por diante. Isso dá tempo para os backends se recuperarem.

```yaml
retry_on_failure:
  initial_interval: 1s
  max_interval: 60s
  multiplier: 2.0
```

### Processamento Baseado em Prioridade

Nem toda telemetry tem a mesma importância:
- **Crítico:** traces de erro, eventos de segurança, transações de negócio
- **Importante:** traces de performance, interações do usuário
- **Bom ter:** traces de debug, health checks

Durante restrições de recursos, priorize os dados críticos. Crie pipelines separados com taxas de sampling diferentes.

### Health Checks

```yaml
extensions:
  health_check:
    endpoint: 0.0.0.0:13133
```

Exponha endpoints de health para monitoramento e recuperação automatizada.

---

## Gerenciamento de Recursos

A realidade é que todo sistema tem recursos finitos (memória, CPU, rede...). O volume de telemetry pode crescer de forma imprevisível, mas os recursos são fixos.

Então sempre **defina limites explícitos**. Não deixe o Collector consumir toda a memória do servidor:
```yaml
resources:
  limits:
    memory: "512Mi"
    cpu: "500m"
```

Além disso, **monitore as tendências de uso**, acompanhe o consumo de memória, alerte antes de atingir os limites, planeje aumentos de capacidade de forma proativa.

---

## A Mentalidade de Produção

A maior mudança não é técnica, é mental:

**Mentalidade de desenvolvimento:** "Faça funcionar"
**Mentalidade de produção:** "Faça funcionar quando tudo mais estiver quebrado"

Isso muda a forma como você projeta os sistemas:
- Assuma que falhas vão acontecer
- Projete pensando em graceful degradation
- Monitore os monitores
- Planeje para os piores cenários possíveis

Lembre-se, o perfeito é inimigo do bom. Você precisa de:
- Confiabilidade boa o suficiente para o seu caso de uso
- Visibilidade quando as coisas dão errado
- Recuperação rápida quando as falhas acontecem
- Aprendizado a partir dos incidentes para melhorar

**O objetivo não é evitar todas as falhas, é lidar com elas de forma graciosa quando acontecem.**

---

## Amanhã: Melhores Práticas de Produção

Hoje aprendemos a lidar com crises de produção. Amanhã vamos aprender a preveni-las: melhores práticas de segurança, performance e monitoramento que tornam os sistemas de observabilidade prontos para produção desde o primeiro dia.

**Agora você já consegue manter seu sistema de observabilidade funcionando enquanto tudo mais está desmoronando. Em seguida, vamos garantir que ele nunca precise disso.**

Nos vemos no Dia 26!
