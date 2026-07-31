# Dia 3 – Traces, Metrics, Logs (e como um request realmente se move)

A maioria das explicações sobre observabilidade começa com "signals" e definições. Isso é ao contrário para iniciantes. A parte difícil geralmente é esta: **o que um único request faz fisicamente enquanto se move por um sistema?**

Depois que você conseguir visualizar o request se movendo, traces/metrics/logs param de parecer três tipos de dados aleatórios e passam a parecer três ângulos de câmera diferentes.

Então vamos acompanhar um request real enquanto ele viaja, e depois mapear cada telemetry signal para o que você observaria.

## Um request, do início ao fim (o que acontece na rede e na memória)

<img width="1536" height="1024" alt="Payment request end to end" src="https://github.com/user-attachments/assets/df07db32-59cc-4699-a044-31f614520ea2" />

Um usuário clica em **"Pagar"** em um navegador ou aplicativo mobile. Esse clique se transforma em um HTTP request enviado pela rede. O request tem um método (`POST`), um path (`/pay`), headers (metadados) e um body (dados como itens do carrinho ou token de pagamento).

Esse request chega primeiro a um load balancer ou API gateway (geralmente), e depois é roteado para uma instância do seu **Payment Service**. Nesse momento, existe uma conexão TCP física (ou um stream HTTP/2), bytes chegando, e o runtime do seu serviço (Node/Java/Go/etc.) decodificando esses bytes em um objeto de request.

Agora o código da sua aplicação é executado. Ele pode validar o input, checar autenticação, calcular totais, e então... precisa de uma informação que não tem localmente. Talvez precise de regras de fraude, conversão de moeda, ou feature flags. Então o Payment Service se torna um cliente e faz seu próprio request de saída para outro serviço, como o **Config Service**.

Este é um ponto-chave: o request original de "Pagar" ainda está *em andamento*. O Payment Service agora está esperando pelas chamadas de dependências. O usuário também está esperando, indiretamente, porque o request dele não pode terminar até que essas dependências terminem.

Então o Payment Service envia um segundo HTTP request para o Config Service. Novo salto de rede, nova conexão ou conexão reutilizada, novos headers, novos bytes. O Config Service recebe, decodifica em um objeto de request, executa código, e descobre que também precisa de dados. Ele chama outro componente downstream, como um proxy de config ou um serviço de acesso a banco de dados, que então chama o banco de dados. O banco de dados executa uma query, retorna linhas, e a resposta flui de volta pela cadeia:

Database → proxy → Config Service → Payment Service → usuário

Esse é o formato físico de um request distribuído: uma **pilha de espera** entre serviços. Cada serviço faz algum trabalho, depois pausa enquanto espera pelo trabalho downstream, e então retoma.

>[!NOTE]
> Por que espera, e não trabalho em paralelo?
>
> Cada serviço precisa do resultado do anterior. O Payment não consegue terminar de calcular o total até saber a taxa de câmbio atual do Config. O Config não consegue retornar taxas de câmbio até lê-las do banco de dados. É sequencial por causa de dependências de dados, não por causa de um design ruim.

Se esse request leva 1200 ms, raramente é porque o Payment Service "gastou" 1200 ms de CPU. Normalmente ele gastou algum tempo de CPU, e o resto foi esperando por outros serviços, esperando pelo banco de dados, esperando pela rede, ou esperando em locks/filas.

É por isso que debugar um "request lento" é difícil sem observabilidade. Você não está debugando um programa. Você está debugando uma reação em cadeia.

## Uma imagem mental concreta: três lentes sobre o mesmo request lento

Imagine que você executa exatamente o mesmo payment request, e coleta os três signals:

**Metrics (o alarme de incêndio):**
"A latência do payment está pior entre 14h30–14h40"
→ Diz QUANDO algo está errado

**Traces (a trilha de migalhas):**
"O request abc123 gastou 800ms no Config Service → DB query"
→ Diz ONDE no fluxo do request

**Logs (as notas forenses):**
"Connection pool esgotado, query deu timeout depois de 30s"
→ Diz O QUE especificamente falhou

Cada signal é incompleto sozinho. Juntos, eles explicam a realidade.

## O que é tracing, usando aquele mesmo request

Tracing é o que acontece quando decidimos: **para este request, registrar a história do que ele tocou e quanto tempo cada parte levou**.

Quando o tracing está habilitado, o sistema gera um **trace ID** perto do início do request (geralmente bem quando ele entra no primeiro serviço). Esse trace ID é apenas um identificador, mas é poderoso porque é o fio que conecta toda a jornada.

Quando o Payment Service chama o Config Service, ele inclui essa informação de trace nos metadados do request de saída (geralmente HTTP headers). O Config Service lê isso, percebe "eu faço parte da mesma história de request", e continua o trace quando faz chamadas downstream. Isso se repete até o request terminar.

Em uma trace view, você verá depois esse request como uma timeline. Um request se torna uma narrativa: "Payment tratou o `/pay` recebido, depois chamou o config, o config chamou o database, o database levou 800 ms, tudo retornou, request completo."

Forma fácil de lembrar: **Um trace é a jornada registrada de um request pelo sistema.**

Amanhã vamos aprender sobre spans, mas por hoje basta saber que um trace é feito de segmentos cronometrados (spans) que representam as etapas ao longo dessa jornada.

## Metrics, e por que elas não conseguem responder "qual request?"

Metrics não são sobre jornadas individuais. Metrics são sobre **agregados ao longo do tempo**.

Se tracing é "me conte a história de um request", metrics são "como os requests estão se comportando no geral?" Metrics respondem perguntas como: "A latência está aumentando esta tarde?" ou "A taxa de erro deu um pico depois do deploy?" ou "Quantos requests por segundo estamos lidando?"

Essa natureza agregada é o ponto principal. Metrics são baratas de coletar, estáveis ao longo do tempo, e perfeitas para alerting. Uma boa metric pode te acordar às 2h07 da manhã e estar correta sobre o fato de que os usuários estão sofrendo.

Mas metrics não conseguem te dizer *por que* um request específico foi lento. Um histograma de latência pode te dizer que o p95 foi de 300 ms para 1,2 s. Ele não pode te dizer, sozinho, "o Config Service começou a levar 900 ms porque uma query perdeu um índice."

>[!IMPORTANT]
>
>Metrics te dizem que **algo está errado**.
>Traces te mostram **onde deu errado para requests reais**.
>
>É por isso que as pessoas costumam "começar com metrics" e "debugar com traces".

## Logs, e por que parecem úteis até não parecerem mais

Logs são registros de eventos. Um serviço imprime: "request iniciado", "chamando dependência", "timeout no db", "pagamento realizado com sucesso", e assim por diante. Historicamente, logs eram a principal forma de debugar produção.

Logs ainda são valiosos, mas iniciantes frequentemente ficam presos em um loop doloroso: buscar em logs, adivinhar correlações, copiar IDs para outra busca, e tentar reconstruir timelines manualmente.

A razão pela qual logs sofrem em sistemas distribuídos é que a história interessante está dividida entre várias máquinas e serviços. Sem um identificador compartilhado, você não tem de fato "um request"; você tem milhares de linhas que *podem* estar relacionadas.

Logs se tornam dramaticamente mais poderosos quando são correlacionados com traces. Se uma linha de log carrega o trace ID (e o span ID), você pode pular de "log de erro no Config Service" direto para a jornada exata do request que o produziu, e ver o que mais estava acontecendo ao redor dele.

>[!NOTE]
>**Debugando sem correlação de trace (o jeito antigo):**
>1. Checar metrics → ver pico às 14h35
>2. Grep nos logs por "14:35" → 47.000 linhas
>3. Grep por "timeout" → 8.000 linhas
>4. Grep por IDs de pagamento → reconstruir a timeline manualmente
>5. 2 horas depois, ainda adivinhando
>
>**Com correlação de trace:**
>1. Checar metrics → ver pico às 14h35
>2. Amostrar um trace lento → abc123
>3. Buscar nos logs por abc123 → 8 linhas relevantes
>4. Causa raiz encontrada em 3 minutos

Esta é a relação prática:

>[!IMPORTANT]
>
>Um trace é o mapa.
>Logs são as anotações de rua fixadas no mapa.

## Context propagation: a cola que torna a correlação possível

Se você só for lembrar de uma coisa hoje, lembre desta:

**Context propagation é como o request carrega sua identidade (trace ID) através das fronteiras de serviços.** (_Isso parece abstrato, mas não se preocupe, vamos voltar a esse assunto por volta do Dia 12._)

"Context" é um pequeno pacote de informações de identidade, que tipicamente inclui o trace ID e um parent span ID. "Propagation" é o ato de injetar esse context nos requests de saída (como headers) e extraí-lo do lado receptor.

É por isso que um Payment Service pode "ver" o trabalho do banco de dados em um trace mesmo sem nunca ter conversado diretamente com o banco de dados. Ele não observou o banco de dados magicamente. O trace simplesmente se manteve intacto enquanto o request se movia por outros serviços que *conversaram* diretamente com o banco de dados.

Quando o context propagation está ausente ou quebrado, um trace se fragmenta em ilhas separadas. Você pode ver um trace do Payment e um trace do Config que parecem não relacionados, mesmo que fizessem parte do mesmo clique do usuário. Essa é uma das falhas mais comuns de "por que o tracing não funciona?".

Isso responde ao maior mistério do iniciante: "Como o sistema sabe que essas partes pertencem umas às outras?"

## (Extra) Baggage

Baggage é context que também se propaga, mas não é primariamente sobre a estrutura do tracing. É mais como "labels extras que viajam com o request", como tenant ID, tier do usuário, ou grupo de experimento.

Baggage é útil, mas também é fácil de usar em excesso porque aumenta o que é enviado downstream. Por enquanto, basta saber que ela existe e que ela viaja junto com o context propagation. Vou dedicar um dia próprio a ela mais adiante.

## O que isso significa para o seu primeiro setup de observabilidade

**Objetivo: Responder "por que aquele request foi lento?" em menos de 5 minutos em vez de 2 horas.**

Como chegar lá:

1. Comece com metrics – Elas são as mais baratas e capturam a maioria dos problemas
2. Adicione tracing seletivamente – Mesmo 1% dos requests traçados já é útil
3. Correlacione logs – Emita trace IDs nas suas linhas de log

Metrics encontram o problema, traces mostram o caminho, logs explicam a falha

## O que estou levando para o Dia 4

Amanhã vamos dar zoom nos spans: os segmentos individuais que compõem a timeline de um trace. Depois que os spans fizerem sentido, vamos conseguir ler um trace: o que aconteceu, em que ordem, e o que estava esperando por o quê.

Para o Dia 3, o ganho é este modelo mental:

- Um único request se move como uma cadeia de chamadas de rede e esperas.
- Tracing registra essa cadeia para um request.
- Metrics resumem muitos requests ao longo do tempo.
- Logs descrevem eventos, e se tornam muito mais úteis quando correlacionados com traces através de context propagado.

Nos vemos no Dia 4!
