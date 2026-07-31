# Teste de Conhecimento da Semana 4: Dominando OpenTelemetry em Produção

**Hora de validar o que você aprendeu na Semana 4!** Esse teste de conhecimento cobre troubleshooting, padrões de produção, segurança e estratégias avançadas de deployment.

**Áreas de Foco da Semana 4:**
- Abordagens sistemáticas de debugging (Dias 22-24)
- Resiliência e escalabilidade em produção (Dias 25-27)  
- Integração completa do sistema (Dia 28)
- Consciência sobre tópicos avançados (Dias 29-30)

---

### Pergunta 1: Abordagem de Debugging
Você está fazendo troubleshooting de traces que estão sumindo em produção. Qual abordagem de debugging melhor restringe o domínio da falha?

A) Verificar logs da aplicação → Testar conectividade de rede → Verificar config do Collector → Verificar status do backend  
B) Verificar a geração de dados na origem → Verificar métricas do pipeline do Collector → Confirmar a ingestão no backend  
C) Reiniciar o Collector → Verificar a instrumentação da aplicação → Verificar conectividade com o backend  
D) Verificar armazenamento do backend → Verificar processamento do Collector → Testar instrumentação da aplicação

<details>
<summary><strong>Resposta</strong></summary>

**Resposta: B**

A abordagem sistemática restringe o domínio da falha checando cada etapa do pipeline:
1. **Verificar a geração de dados:** A aplicação está criando telemetry? (debug exporter, logs)
2. **Verificar métricas do Collector:** Os dados estão fluindo pelo pipeline? (métricas de receiver → processor → exporter)
3. **Confirmar a ingestão no backend:** O backend está recebendo e armazenando os dados?

Essa abordagem isola o problema em um componente específico em vez de ficar chutando. Cada etapa confirma que aquele estágio funciona ou identifica onde os dados estão se perdendo.

**Por que as outras estão erradas:**
- A: Muito vaga e não segue o fluxo de dados de forma sistemática
- C: Reiniciar componentes desperdiça tempo sem entender o problema
- D: Trabalha de trás para frente a partir do backend, dificultando isolar o problema

</details>

---

### Pergunta 2: Debugging da Saúde do Collector
O health check do seu Collector retorna 200 OK, mas nenhum trace aparece no Jaeger. O que você deveria verificar em seguida?

A) Reiniciar o serviço do Collector  
B) Verificar as métricas do Collector para spans recebidos/processados/exportados  
C) Verificar se o Jaeger está rodando  
D) Aumentar os limites de memória do Collector

<details>
<summary><strong>Resposta</strong></summary>

**Resposta: B**

Um status saudável só significa que o processo do Collector está rodando. Você precisa verificar as métricas do pipeline para ver onde os dados estão se perdendo:
- `otelcol_receiver_accepted_spans_total` - Os dados estão chegando?
- `otelcol_processor_accepted_spans_total` - Os dados estão sendo processados?  
- `otelcol_exporter_sent_spans_total` - Os dados estão sendo exportados?

Essas métricas dizem exatamente em qual ponto do pipeline os dados estão sendo perdidos.

**Por que as outras estão erradas:**
- A: Reiniciar sem entender o problema raramente ajuda
- C: Se o Jaeger estivesse fora do ar, você veria erros de exporter nos logs do Collector
- D: Limites de memória não causariam zero traces (você veria alguns dados ou erros de OOM)

</details>

---

### Pergunta 3: Cenário de Dados Ausentes
Você configurou o OpenTelemetry mas não vê dado nenhum em lugar nenhum. Qual é o primeiro passo de debugging?

A) Verificar se o backend está acessível  
B) Verificar a configuração do Collector  
C) Ativar debug logging e verificar se a aplicação está gerando telemetry  
D) Testar conectividade de rede entre os serviços

<details>
<summary><strong>Resposta</strong></summary>

**Resposta: C**

Seguindo a abordagem sistemática do Dia 23, comece do início do pipeline:
1. A aplicação está gerando telemetry de fato? (Ativar debug logging, adicionar console exporter)
2. O SDK está exportando os dados?
3. O Collector está recebendo os dados?
4. O backend está recebendo os dados?

Sempre comece verificando a geração de dados antes de checar os componentes mais abaixo no fluxo.

</details>

---

### Pergunta 4: Debugging de Context Propagation
Você vê spans do seu serviço de API mas nada do serviço de Payment que vem depois, mesmo que os pagamentos sejam concluídos com sucesso. Os logs do serviço de Payment mostram que ele está processando as requisições. Qual é o problema mais provável?

A) O serviço de Payment está fora do ar  
B) O context propagation está quebrado entre os serviços de API e Payment  
C) O Collector está descartando os spans do serviço de Payment  
D) O serviço de Payment não tem instrumentação

<details>
<summary><strong>Resposta</strong></summary>

**Resposta: B**

As pistas principais apontam para context propagation quebrado:
- Os pagamentos são concluídos com sucesso (o serviço está funcionando)
- Os logs do serviço de Payment mostram processamento (o serviço está rodando e instrumentado)
- Nenhum span do Payment aparece nos traces (o context não está sendo extraído)

O serviço de Payment provavelmente está criando spans, mas em um trace novo, porque não está extraindo o trace context das requisições recebidas. Isso cria spans órfãos que não se conectam ao trace do serviço de API.

**Por que as outras estão erradas:**
- A: O pagamento é concluído com sucesso, então o serviço está rodando
- C: Se o Collector estivesse descartando spans, você veria lacunas em todos os serviços
- D: A pista extra (logs mostrando processamento) indica que o serviço tem algum tipo de instrumentação

</details>

---

### Pergunta 5: Lidando com Backpressure
Durante um pico de tráfego, seu Collector começa a sofrer com pressão de memória. Qual é a ordem correta de configuração da defesa em três camadas?

A) Batch processor → Gerenciamento de fila → Memory limiter  
B) Memory limiter → Gerenciamento de fila → Decisões de sampling  
C) Gerenciamento de fila → Decisões de sampling → Memory limiter  
D) Decisões de sampling → Memory limiter → Gerenciamento de fila

<details>
<summary><strong>Resposta</strong></summary>

**Resposta: B**

A defesa em três camadas precisa ser configurada nesta ordem:
1. **Memory Limiter (Camada 1):** Primeiro no pipeline de processors - previne OOM recusando novos dados quando o limite de memória é atingido
2. **Gerenciamento de Fila (Camada 2):** As filas do exporter armazenam dados temporariamente durante picos passageiros
3. **Decisões de Sampling (Camada 3):** Reduz o volume de dados na origem (SDK ou tail-based sampling no Collector)

Essa configuração garante que o Collector nunca trave por esgotamento de memória, mantendo o máximo de observabilidade possível durante a pressão.

**Por que as outras estão erradas:**
- A: O batch processor não protege contra pressão de memória
- C: O memory limiter precisa vir primeiro para proteger o processo
- D: O sampling acontece no nível do SDK/origem, não na ordem do pipeline de processors

</details>

---

### Pergunta 6: Segurança em Produção
Qual prática de segurança é mais crítica para deployments de OpenTelemetry em produção, segundo o Dia 26?

A) Usar senhas fortes para autenticação do Collector  
B) Não capturar dados sensíveis (senhas, API keys, PII) desde o início  
C) Criptografar os dados de telemetry em repouso  
D) Usar redes privadas para toda a comunicação

<details>
<summary><strong>Resposta</strong></summary>

**Resposta: B**

Segundo o Dia 26, a prática de segurança mais crítica é **prevenção - não capturar dados sensíveis desde o início**:
- Seja seletivo sobre quais atributos você captura
- Nunca capture senhas, API keys, números de cartão de crédito ou corpos completos de request/response
- Revise o que a auto-instrumentação está capturando
- Na dúvida, não logue - você sempre pode adicionar mais depois

O Dia 26 enfatiza: "Correção Simples: Seja Seletivo Sobre o Que Você Captura" em vez de tentar redigir os dados depois que já foram capturados.

Embora as outras opções sejam importantes, prevenir que dados sensíveis entrem no seu pipeline de observabilidade é a base da segurança.

</details>

---

### Pergunta 7: OpenTelemetry Operator
O que o injetor de auto-instrumentação do OpenTelemetry Operator realmente faz?

A) Instala automaticamente o OpenTelemetry no seu cluster  
B) Modifica as specs dos pods para adicionar bibliotecas de instrumentação via init containers  
C) Monitora as aplicações e adiciona spans quando necessário  
D) Configura o Collector para receber dados das aplicações

<details>
<summary><strong>Resposta</strong></summary>

**Resposta: B**

Segundo o Dia 27, o injetor é um admission controller do Kubernetes que:
1. Intercepta as requisições de criação de pods
2. Modifica as specs dos pods para adicionar init containers com bibliotecas de instrumentação
3. Configura variáveis de ambiente para o SDK do OpenTelemetry
4. Monta volumes compartilhados para que o container principal possa acessar as bibliotecas

Ele age no momento da criação do pod, não em monitoramento em tempo de execução.

</details>

---

### Pergunta 8: Estratégia de Sampling
Para um site de e-commerce de alto tráfego, qual é a melhor abordagem de sampling?

A) Sampling probabilístico fixo de 1% em todos os serviços  
B) Tail-based sampling com taxas diferentes para erros, transações de alto valor e tráfego normal  
C) Nenhum sampling - coletar tudo para visibilidade completa  
D) Head-based sampling com taxa de 10% durante o horário comercial

<details>
<summary><strong>Resposta</strong></summary>

**Resposta: B**

O tail-based sampling permite decisões inteligentes:
- Sempre fazer sampling dos erros (100%)
- Sempre fazer sampling de transações de alto valor (críticas para o negócio)
- Fazer sampling do tráfego normal com taxas menores (otimização de custo)
- Adaptar o sampling de acordo com a carga do sistema

Isso equilibra custo, performance e necessidades de observabilidade melhor do que um sampling de taxa fixa.

</details>

---

### Pergunta 9: Configuração do Collector
Seu projeto do Dia 28 envia toda a telemetry para o Dash0. Qual é o principal benefício de usar o Collector como intermediário em vez de exportar diretamente pelo SDK?

A) O Collector é mais rápido do que a exportação direta  
B) O Collector permite processamento, filtragem e mudanças futuras de roteamento sem modificar o código da aplicação  
C) O Collector é obrigatório para a integração com o Dash0  
D) O Collector reduz o uso de banda de rede

<details>
<summary><strong>Resposta</strong></summary>

**Resposta: B**

Usar o Collector como intermediário oferece flexibilidade:
- Processar e transformar dados (filtrar health checks, adicionar contexto de negócio)
- Trocar de backend sem precisar reimplantar as aplicações
- Implementar batching e lógica de retry de forma centralizada
- Adicionar múltiplos backends no futuro sem mudar código

No Dia 28, usamos esse padrão para filtrar health checks e agrupar telemetry em lote antes de enviar para o Dash0.

</details>

---

### Pergunta 10: Gerenciamento de Recursos
Em produção, qual é a configuração de recursos do Collector mais importante?

A) Definir requests de CPU iguais aos limits  
B) Configurar limites de memória alinhados com os tamanhos das filas e as configurações de batch  
C) Usar os maiores limites possíveis de CPU e memória  
D) Definir requests de recursos mas sem limits para ter mais flexibilidade

<details>
<summary><strong>Resposta</strong></summary>

**Resposta: B**

Os limites de memória precisam estar alinhados com a configuração do seu pipeline:
- Tamanho da fila × tamanho médio da telemetry = memória por fila
- Múltiplos exporters = múltiplas filas
- O batch processor (se usado) adiciona overhead extra de memória
- Limites de memória evitam OOM kills no Kubernetes

O cálculo: (tamanho_da_fila × tamanho_do_item × número_de_exporters) + overhead_de_batch + overhead_de_processamento = memória total necessária.

Limites de memória desalinhados com as configurações de fila/batch causam a maioria dos problemas em produção.

**Por que as outras estão erradas:**
- A: Requests iguais aos limits de CPU pode causar throttling; não é o problema mais crítico
- C: Desperdiça recursos e não evita OOM se a configuração estiver errada
- D: Sem limits pode causar OOM em nível de node e afetar outros pods

</details>

---

### Pergunta 11: Transformações OTTL
Você precisa adicionar um atributo de contexto de negócio baseado na rota HTTP. Qual statement OTTL está correto?

A) `set(attributes["business.area"], "payments") where http.route == "/api/payments"`  
B) `set(attributes["business.area"], "payments") where attributes["http.route"] == "/api/payments"`  
C) `attributes["business.area"] = "payments" if http.route == "/api/payments"`  
D) `transform(business.area, "payments") when route("/api/payments")`

<details>
<summary><strong>Resposta</strong></summary>

**Resposta: B**

A sintaxe do OTTL exige:
- A função `set()` para definir atributos
- `attributes["key"]` para acessar atributos do span  
- Uma cláusula `where` para condições
- Comparação de string correta com `==`

A opção A está sem o wrapper `attributes[]` na condição.

</details>

---

### Pergunta 12: Otimização de Performance
Sua aplicação de high-frequency trading precisa do menor impacto de latência possível vindo do tracing. Qual é a melhor abordagem no estilo OTCA?

A) Desativar o tracing completamente durante o horário de mercado  
B) Usar head-based sampling agressivo (0.01%) com instrumentação mínima e exportação assíncrona  
C) Implementar instrumentação com zero alocação e object pooling  
D) Só fazer trace de erros e requisições lentas

<details>
<summary><strong>Resposta</strong></summary>

**Resposta: B**

Para aplicações sensíveis à latência, a abordagem no estilo OTCA combina:
- **Sampling agressivo:** 0.01% ou menos para minimizar o overhead
- **Instrumentação mínima:** Só operações críticas, não toda chamada de função
- **Exportação assíncrona:** BatchSpanProcessor com exportação em background para não bloquear

Isso equilibra as necessidades de observabilidade com os requisitos de performance usando recursos padrão do OpenTelemetry.

**Por que as outras estão erradas:**
- A: Elimina a observabilidade justamente quando você mais precisa dela (durante o horário de trading)
- C: Muito específico de implementação e dependente de linguagem para o exame OTCA
- D: Exige lógica customizada e não resolve o overhead da decisão de sampling

</details>

---

### Pergunta 13: Debugging de Traces Distribuídos
Um trace mostra spans do Serviço A e do Serviço C, mas o Serviço B (que processa requisições entre eles) está ausente. Os logs do Serviço B mostram processamento bem-sucedido de requisições. Qual é a causa mais provável?

A) O Serviço B não tem instrumentação  
B) Os spans do Serviço B estão sendo descartados por sampling  
C) O Serviço B não está encaminhando o trace context  
D) O Collector não está recebendo os spans do Serviço B

<details>
<summary><strong>Resposta</strong></summary>

**Resposta: A**

Pistas principais:
- O Serviço B processa requisições com sucesso (os logs mostram isso)
- Os spans do Serviço A e C existem e estão conectados
- Os spans do Serviço B estão completamente ausentes

Isso indica que o Serviço B não tem instrumentação nenhuma. Se ele tivesse instrumentação mas com context quebrado, você veria spans órfãos. Se o sampling estivesse descartando spans, você veria alguns spans do Serviço B de vez em quando.

</details>

---

### Pergunta 14: Resposta a Incidentes em Produção
Durante um incidente em produção, seu sistema de observabilidade está sobrecarregado e descartando dados. Qual é a ordem correta de prioridade para manter a observabilidade?

A) Aumentar as taxas de sampling → Escalar o Collector → Otimizar queries  
B) Escalar o Collector → Reduzir as taxas de sampling → Implementar circuit breakers  
C) Reduzir as taxas de sampling → Escalar o Collector → Implementar degradação graciosa  
D) Reiniciar todos os componentes → Aumentar recursos → Retomar operação normal

<details>
<summary><strong>Resposta</strong></summary>

**Resposta: C**

Durante incidentes, priorize a estabilidade imediata:
1. **Reduzir as taxas de sampling** - Redução imediata de carga
2. **Escalar o Collector** - Aumentar a capacidade de processamento  
3. **Implementar degradação graciosa** - Garantir que observabilidade parcial é melhor do que nenhuma

O objetivo é manter alguma observabilidade durante o incidente, não observabilidade perfeita.

</details>

---

### Pergunta 15: Integração de Contexto de Negócio
No seu projeto do Dia 28, você adicionou spans customizados para busca de usuários, listagem de produtos e criação de pedidos. Qual é o benefício de adicionar contexto de negócio a esses traces técnicos?

A) Fica mais fácil encontrar os traces no Dash0  
B) Conecta a performance técnica às operações de negócio, viabilizando observabilidade orientada ao negócio  
C) Reduz a quantidade de dados enviados ao backend  
D) É obrigatório para o Collector processar os dados

<details>
<summary><strong>Resposta</strong></summary>

**Resposta: B**

O contexto de negócio transforma observabilidade técnica em insights de negócio:
- "GET /api/users/:id" vira "acesso ao perfil do cliente"
- "POST /api/orders" vira "evento de geração de receita"
- Latência técnica vira "qualidade da experiência de checkout"

Isso permite que os times respondam perguntas como "Quantos pedidos foram criados?" e "Qual é a performance dos nossos endpoints que geram receita?" diretamente a partir dos dados de observabilidade.

</details>

---

## Guia de Pontuação

**13-15 corretas:** **Especialista em Produção** - Você dominou os conceitos da Semana 4 e está pronto para desafios avançados de OpenTelemetry!

**10-12 corretas:** **Pronto para Produção** - Entendimento sólido com pequenas lacunas. Revise os conceitos que você errou.

**7-9 corretas:** **Precisa Revisar** - Boa base, mas revisite os materiais da Semana 4, especialmente as abordagens de debugging e os padrões de produção.

**Menos de 7:** **Revisite a Semana 4** - Foque na trilogia de debugging (Dias 22-24) e nas melhores práticas de produção (Dias 25-27).

---

## Principais Aprendizados da Semana 4

Se você se saiu bem, você entende:

**Abordagens sistemáticas de debugging** para problemas de OpenTelemetry  
**Padrões de resiliência em produção** para lidar com escala e falhas  
**Melhores práticas de segurança** para deployments em produção  
**Padrões avançados de deployment** com o Kubernetes Operator  
**Técnicas de otimização de performance** para sistemas de alta carga  
**Integração de contexto de negócio** para uma observabilidade mais significativa

---

## Pronto para a Certificação?

**A Semana 4 cobriu habilidades críticas de produção que caem no exame OTCA:**
- Debugging sistemático (Dias 22-24) → Domínio 4 do Exame: Troubleshooting
- Padrões de produção (Dias 25-27) → Domínio 4 do Exame: Deployment & Operations
- Integração completa (Dia 28) → Aplicação prática em todos os domínios

### **Dicas Rápidas para a Certificação**

**1. Foque nos Domínios Grandes**
- Domínio 2 (Fundamentos do OpenTelemetry): 28% - Conheça API/SDK de cor
- Domínio 3 (Usando o OpenTelemetry): 28% - Domine a configuração do Collector
- Domínio 4 (Ecossistema): 26% - Entenda os padrões de deployment
- Domínio 1 (Fundamentos de Observabilidade): 18% - Base conceitual sólida

**2. Tópicos da Semana 4 no Exame**
- **Abordagens de debugging:** Troubleshooting sistemático de infraestrutura → pipeline → aplicação
- **Context propagation:** Como o trace context flui e onde ele quebra
- **Padrões de produção:** Backpressure, degradação graciosa, segurança
- **Estratégias de deployment:** Agent vs Gateway, Kubernetes Operator

**3. Pegadinhas Comuns do Exame**
- **Terminologia exata:** "Sampler" e não "estratégia de sampling", "propagator" e não "carregador de context"
- **Responsabilidades dos componentes:** Saiba o que fazem os receivers, processors e exporters
- **Ordem de configuração:** Memory limiter primeiro, batch por último nos pipelines de processors
- **Padrões de deployment:** Quando usar agent vs gateway (cenários práticos)

### **Próximo Passo: Preparação Completa para o OTCA**

Pronto para ir mais fundo? Confira o **[Guia de Preparação para o Exame OTCA](./otca-preparacao-prova.md)**.

**Sua jornada de 30 dias te preparou muito bem. O exame OTCA valida o que você já sabe!**

---

## Prática Adicional

**Exercícios práticos para reforçar o aprendizado:**

1. **Monte um cenário de debugging** - Quebre de propósito partes diferentes do seu pipeline de observabilidade e pratique a abordagem sistemática de debugging

2. **Implemente o tratamento de backpressure** - Configure gerenciamento de fila, limites de memória e sampling adaptativo para lidar com picos de tráfego

3. **Adicione camadas de segurança** - Pratique não capturar dados sensíveis, implemente TLS e configure autenticação

4. **Faça deploy com o Operator** - Use o OpenTelemetry Operator para implantar e gerenciar sua stack de observabilidade no Kubernetes

5. **Crie dashboards de negócio** - Construa dashboards que mostrem métricas de negócio derivadas da sua telemetry técnica
