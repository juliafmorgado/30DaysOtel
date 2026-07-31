## Simulado: 60 Questões

**Instruções:** Responda todas as questões. A nota de aprovação é 75% (45/60). Tempo limite: 90 minutos.

Este simulado inclui questões baseadas em cenários que testam um entendimento mais profundo dos conceitos de OpenTelemetry.

**Como usar este simulado:**
1. Responda as 60 questões sem olhar as respostas
2. Confira suas respostas e calcule sua pontuação
3. Revise as explicações detalhadas das questões que você errou para entender o porquê

---

**1.** Onde os atributos de Resource se encaixam conceitualmente?

A) Apenas em cada span, como atributos de span  
B) No telemetry data, como metadata que descreve a entidade que produz o telemetry (service/process/host)  
C) Apenas dentro dos headers de baggage  
D) Apenas na configuração do Collector

<details>
<summary><strong>Resposta</strong></summary>

**B** - Resources são metadata anexados uma única vez na inicialização do SDK e se aplicam a todos os signals de telemetry (traces, metrics, logs) daquela entidade. É por isso que service.name fica no resource, e não em spans individuais.

**Por que as outras estão erradas:**
- A: Atributos de span servem para dados específicos da requisição, não para identidade da entidade. Colocar informação de resource em todo span como atributo seria uma duplicação desnecessária.
- C: Baggage serve para contexto transversal da requisição, não para metadata da entidade. Baggage se propaga junto com as requisições; resources não.
- D: Embora o Collector possa adicionar/modificar resources, conceitualmente eles pertencem ao próprio telemetry data, não só à configuração.

</details>

---

**2.** A ordem correta do pipeline do Collector é:

A) Exporters → Receivers → Processors  
B) Receivers → Exporters → Processors  
C) Receivers → Processors → Exporters  
D) Processors → Receivers → Exporters

<details>
<summary><strong>Resposta</strong></summary>

**C** - Essa é a arquitetura central do Collector. Os dados entram pelos receivers, são transformados/filtrados pelos processors e saem pelos exporters. Esse fluxo unidirecional é consistente em todos os tipos de signal (traces, metrics, logs).

**Por que as outras estão erradas:**
- A: Exporters vêm por último, não primeiro. Eles enviam os dados para fora depois do processamento.
- B: Processors precisam ficar entre receivers e exporters para transformar os dados antes da exportação.
- D: Processors não podem vir antes dos receivers - ainda não há dado nenhum para processar.

</details>

---

**3.** Você vê spans sendo exportados com service.name="unknown_service". O mais provável é que o problema seja:

A) W3C Trace Context desabilitado  
B) Configuração de resource ausente (OTEL_SERVICE_NAME ou OTEL_RESOURCE_ATTRIBUTES não configurados)  
C) Span kind ausente  
D) O exporter está descartando atributos por design

<details>
<summary><strong>Resposta</strong></summary>

**B** - service.name é um atributo de resource que precisa ser configurado explicitamente. Se não for informado, muitos SDKs assumem "unknown_service" (ou "unknown_service:node", etc.) como padrão. Isso acontece quando OTEL_SERVICE_NAME não está configurado, OTEL_RESOURCE_ATTRIBUTES não o inclui, e nenhuma configuração programática de resource o fornece.

**Por que as outras estão erradas:**
- A: W3C Trace Context serve para propagar contexto de trace entre serviços, não para nomear serviços.
- C: Span kind (CLIENT/SERVER/INTERNAL/etc.) descreve o papel do span, não a identidade do serviço.
- D: Exporters geralmente não descartam service.name por design - se está faltando, é porque nunca foi configurado.

</details>

---

**4.** Qual componente é mais apropriado para reduzir o uso de banda enviando o telemetry em payloads maiores e em menor quantidade?

A) Memory limiter processor  
B) Batch processor  
C) OTLP receiver  
D) Logging exporter

<details>
<summary><strong>Resposta</strong></summary>

**B** - O batch processor acumula telemetry data e envia em lotes maiores em vez de um por um. Isso reduz drasticamente as chamadas de rede, o overhead de conexão e a carga de ingestão no backend.

**Por que as outras estão erradas:**
- A: Memory limiter protege contra OOM, não otimiza o uso de banda.
- C: OTLP receiver aceita dados dentro do Collector, não controla o batching.
- D: Logging exporter serve para debug, não para otimização de banda.

</details>

---

**5.** No OTel, o mecanismo de context propagation é responsável principalmente por:

A) Converter logs em spans  
B) Transportar trace context e baggage entre process boundaries  
C) Criar views de metrics  
D) Fazer retry de exporters

<details>
<summary><strong>Resposta</strong></summary>

**B** - Context propagation é o mecanismo que carrega trace_id, span_id e baggage entre process boundaries (tipicamente via headers HTTP como traceparent). Isso viabiliza o distributed tracing - sem ele, cada serviço iniciaria novos traces.

**Por que as outras estão erradas:**
- A: Logs e spans são signals separados. Context propagation não converte entre eles.
- C: Views de metrics são configuradas no SDK, sem relação com context propagation.
- D: Retries de exporter são sobre confiabilidade, não sobre context propagation.

</details>

---

**6.** Você quer gerar metrics a partir de trace spans (por exemplo, contagem de requisições, latência) dentro do Collector antes de exportar. A abordagem mais correta é:

A) Usar pipelines separados com criação manual de metric  
B) Usar o transform processor  
C) Exportar traces duas vezes para backends diferentes  
D) Usar um span metrics connector para ligar o pipeline de traces a um pipeline de metrics

<details>
<summary><strong>Resposta</strong></summary>

**D** - Connectors funcionam tanto como exporter (a partir do pipeline de traces) quanto como receiver (para o pipeline de metrics), permitindo gerar metrics a partir de trace data dentro do Collector.

**Por que as outras estão erradas:**
- A: Criação manual de metric não aproveita as capacidades nativas do Collector
- B: Transform processor transforma dados, mas não gera metrics a partir de spans
- C: Exportar traces duas vezes desperdiça banda e não cria metrics

</details>

---

**7.** Qual afirmação sobre OpenTelemetry API vs SDK é mais precisa?

A) A API exporta telemetry; o SDK só define interfaces  
B) A API fornece interfaces; o SDK fornece implementações como samplers, processors, exporters  
C) O SDK é opcional para qualquer instrumentação funcionar  
D) A API inclui componentes de pipeline do Collector

<details>
<summary><strong>Resposta</strong></summary>

**B** - A API define interfaces (como criar spans, registrar metrics, etc.), enquanto o SDK fornece as implementações reais (samplers, processors, exporters). Essa separação permite que bibliotecas de instrumentação dependam apenas da API estável, enquanto a aplicação configura a implementação do SDK.

**Por que as outras estão erradas:**
- A: Invertido - a API define interfaces, o SDK exporta telemetry através das suas implementações.
- C: O SDK é necessário para que o telemetry seja de fato registrado e exportado. Sem ele, a API vira um no-op.
- D: Os componentes do Collector são separados do SDK. A API/SDK servem para instrumentação da aplicação.

</details>

---

**8.** Ao fazer deploy de Collectors, quando a coleta local (padrão agent) é preferível a uma coleta puramente centralizada?

A) Quando você quer maior latência de rede  
B) Quando você quer evitar rodar qualquer coisa nos nodes  
C) Quando você quer reduzir o egress da aplicação, capturar telemetry a nível de host e isolar falhas perto da origem  
D) Quando você tem apenas um serviço

<details>
<summary><strong>Resposta</strong></summary>

**C** - Rodar um Collector agent em cada node/host permite: reduzir o egress de rede das aplicações (os dados vão para localhost), coletar metrics a nível de host (CPU, memória, disco) e isolar falhas (se um agent falha, os outros continuam).

**Por que as outras estão erradas:**
- A: O padrão agent reduz latência (localhost), não aumenta.
- B: O padrão agent significa exatamente rodar algo nos nodes - esse é o ponto.
- D: Mesmo com um único serviço, agents trazem benefícios como metrics de host e buffering local.

</details>

---

**9.** Você quer garantir que os spans de uma única requisição, passando por HTTP → gRPC → DB, compartilhem o mesmo trace. O requisito crítico é:

A) Todos os spans devem ser criados com SpanKind.INTERNAL  
B) Todos os serviços devem usar o mesmo endpoint de trace exporter  
C) Todos os serviços devem ter a mesma configuração de OTEL_TRACES_SAMPLER  
D) O contexto do parent deve ser propagado e usado para iniciar os child spans

<details>
<summary><strong>Resposta</strong></summary>

**D** - O contexto do parent (contendo trace_id e span_id) precisa ser propagado entre os service boundaries e usado ao criar os child spans. É assim que todos os spans de uma requisição distribuída compartilham o mesmo trace_id.

**Por que as outras estão erradas:**
- A: Span kind (CLIENT/SERVER/INTERNAL) descreve o papel do span, não a continuidade do trace
- B: **Pegadinha!** Os serviços podem exportar para backends diferentes ou até por meio de collectors diferentes - o que importa é que o contexto seja propagado no momento de criação do span, não para onde os spans são exportados
- C: **Pegadinha!** A configuração de sampling pode diferir entre serviços (embora isso não seja recomendado). Um serviço parent pode amostrar em 10% enquanto um child amostra em 100%. O sampler ParentBased garante que os children respeitem a decisão do parent, mas o requisito não é a configuração idêntica - é a context propagation

</details>

---

**10.** Qual processor é feito principalmente para proteger o Collector de OOM causado por picos repentinos de ingestão?

A) Resource processor  
B) Memory limiter processor  
C) Attributes processor  
D) Span metrics connector

<details>
<summary><strong>Resposta</strong></summary>

**B** - O memory limiter processor monitora o uso de memória do Collector e aplica pressão de memória que faz os dados serem descartados a montante quando os limites configurados estão sendo atingidos. Isso evita que o Collector trave por esgotamento de memória durante picos de tráfego.

**Por que as outras estão erradas:**
- A: Resource processor adiciona/modifica atributos de resource, não protege memória.
- C: Attributes processor modifica atributos, não protege memória.
- D: Span metrics connector gera metrics a partir de spans, não protege memória.

</details>

---

**11.** Quando você usaria Links em um span em vez de relações parent/child?

A) Quando você quer conectar um span ao seu caller imediato em uma requisição síncrona  
B) Quando um span é causalmente relacionado a múltiplos traces ou múltiplos parents (por exemplo, processamento em lote)  
C) Quando você precisa propagar trace context através de boundaries assíncronos  
D) Quando você quer criar um child span que continua o mesmo trace

<details>
<summary><strong>Resposta</strong></summary>

**B** - Links são usados quando um span é causalmente relacionado a múltiplos traces ou parents. Por exemplo, um job de processamento em lote disparado por 100 requisições de usuários diferentes usaria links para referenciar os 100 traces de origem, já que só pode ter um parent mas precisa mostrar a relação com múltiplos traces.

**Por que as outras estão erradas:**
- A: **Pegadinha!** Isso descreve relações parent/child, não links. Caller imediato em requisições síncronas = parent/child
- C: **Pegadinha!** A maioria dos boundaries assíncronos usa relações parent/child via context propagation. Porém, links podem ser usados em alguns cenários assíncronos/de mensageria em que você quer mostrar relações causais sem uma hierarquia parent/child estrita (por exemplo, consumers de fila de mensagens referenciando spans de producers)
- D: **Pegadinha!** É exatamente para isso que serve parent/child - continuar o mesmo trace. Links normalmente servem para se relacionar com spans em *outros* traces, embora também possam ser usados dentro do mesmo trace para relações não hierárquicas

**Distinção-chave:** Parent/child = relação hierárquica dentro de um trace. Links = relações causais que podem cruzar boundaries de trace ou representar conexões não hierárquicas.

</details>

---

**12.** Você vê erros de "exporter timeout" e o tamanho da queue aumentando. Qual o melhor primeiro ponto de ajuste?

A) Aumentar o sampling para 100%  
B) Aumentar o batch timeout para um valor enorme  
C) Checar a conectividade/latência do endpoint do exporter e ajustar o tamanho de queue/retry/batch adequadamente  
D) Desabilitar os processors

<details>
<summary><strong>Resposta</strong></summary>

**C** - Quando você vê exporter timeouts e a queue crescendo, isso significa que o backend não está conseguindo acompanhar ou há um problema de rede. A solução é diagnosticar o problema de conectividade/latência e então ajustar tamanhos de queue, configurações de retry e tamanhos de batch para lidar com as características reais de performance do backend.

**Por que as outras estão erradas:**
- A: Aumentar o sampling para 100% pioraria o problema ao enviar mais dados.
- B: Só aumentar o batch timeout não resolve backends lentos - você precisa atacar a causa raiz.
- D: Desabilitar processors remove funcionalidades importantes e não resolve problemas de backend.

</details>

---

**13.** Qual é o melhor exemplo de uso de Baggage (quando usado com cuidado)?

A) Carregar um identificador de negócio de baixa cardinalidade (por exemplo, tenant_id) para correlacionar entre serviços  
B) Colocar tokens JWT completos no baggage para debug  
C) Carregar corpos de requisição inteiros para evitar logging  
D) Substituir atributos de span por baggage em todo lugar

<details>
<summary><strong>Resposta</strong></summary>

**A** - Baggage deve carregar valores de baixa cardinalidade (número limitado de valores distintos) que precisam estar disponíveis em todos os serviços de uma requisição. tenant_id é ideal - tem cardinalidade limitada e é útil para filtrar/agrupar entre serviços. Ele se propaga automaticamente junto com o trace context.

**Por que as outras estão erradas:**
- B: Tokens JWT são grandes, de alta cardinalidade e contêm dados sensíveis. Nunca coloque isso no baggage (que é propagado em headers).
- C: Corpos de requisição são grandes e de alta cardinalidade. Baggage tem limites de tamanho e se propaga em toda chamada downstream.
- D: Atributos de span são melhores para a maioria dos dados. Baggage serve apenas para dados que precisam estar disponíveis entre service boundaries.

</details>

---

**14.** A prática de segurança recomendada para ingestão OTLP via gRPC/HTTP geralmente é:

A) Usar plaintext para evitar custo de CPU  
B) Usar TLS/mTLS quando apropriado, além de authN/authZ se estiver exposto  
C) Desabilitar batching  
D) Usar baggage para segredos

<details>
<summary><strong>Resposta</strong></summary>

**B** - Endpoints OTLP devem usar TLS para criptografar o telemetry data em trânsito (que pode conter informação sensível). Se o endpoint for exposto além do localhost, adicione autenticação/autorização para evitar envio não autorizado de dados ou exfiltração de dados.

**Por que as outras estão erradas:**
- A: Plaintext expõe o telemetry data (que pode conter PII, segredos, lógica de negócio) a sniffing de rede.
- C: Batching não tem relação com segurança - é uma otimização de performance.
- D: Baggage serve para contexto da requisição, não para segredos. Segredos nunca devem ficar no baggage (que é propagado em headers).

</details>

---

**15.** Um time reclama: "ativamos o auto-instrumentação mas ainda não vemos spans de DB." A melhor primeira hipótese é:

A) O Collector está filtrando os spans de DB no pipeline  
B) A biblioteca cliente do DB não é suportada por esse agent de auto-instrumentação, ou está sendo usada de um jeito não suportado  
C) A taxa de sampling está muito baixa e os spans de DB estão sendo descartados  
D) O endpoint do exporter está mal configurado

<details>
<summary><strong>Resposta</strong></summary>

**B** - Auto-instrumentação só funciona com bibliotecas que ela conhece. Se o time está usando um client de DB que não está na lista suportada pelo auto-instrumentação, ou usando de um jeito incomum (por exemplo, connection pooling customizado), nenhum span de DB será criado.

**Por que as outras estão erradas:**
- A: **Pegadinha!** Embora o Collector *pudesse* filtrar spans, se você vê spans de HTTP mas nenhum de DB, o problema está no momento da criação do span, não na filtragem. O Collector não descarta tipos de span seletivamente por padrão.
- C: **Pegadinha!** Se o sampling fosse o problema, você veria *alguns* spans de DB (só que menos). Ver *zero* spans de DB sugere que eles não estão sendo criados, e não que estão sendo amostrados para fora.
- D: **Pegadinha!** Se o exporter estivesse mal configurado, você não veria *nenhum* span (nem HTTP, nem DB, nem nada). Ver spans de HTTP mas nenhum de DB aponta para cobertura de instrumentação, não para problemas de exportação.

</details>

---

**16.** Se você precisa descartar atributos que contêm segredos no Collector, o melhor lugar é:

A) Apenas no backend  
B) Em um attributes/transform processor antes de exportar  
C) Apenas no receiver  
D) Nos headers de context propagation

<details>
<summary><strong>Resposta</strong></summary>

**B** - O Collector é o lugar ideal para redigir segredos porque é um ponto de controle centralizado antes que os dados cheguem aos backends. Use attributes ou transform processors para detectar e remover/mascarar atributos sensíveis. Isso oferece defesa em profundidade - mesmo se as aplicações logarem segredos por acidente, eles são pegos antes do armazenamento.

**Por que as outras estão erradas:**
- A: Esperar até o backend significa que os segredos já foram transmitidos e podem ter sido logados/cacheados ao longo do caminho.
- C: Receivers aceitam os dados como estão. O processamento acontece nos processors, não nos receivers.
- D: Headers de context propagation servem para trace context, não para filtrar segredos do telemetry data.

</details>

---

**17.** Na maioria dos SDKs de linguagem, qual componente decide mais diretamente se um span é registrado/exportado?

A) Resource detector  
B) Decisão do sampler na criação do span  
C) Decisão de tail-based sampling após o trace completo  
D) Apenas a lógica de retry do exporter

<details>
<summary><strong>Resposta</strong></summary>

**B** - Na maioria dos SDKs de linguagem, o sampler toma a decisão no momento de criação do span (head-based sampling). É nesse momento que o SDK decide se vai registrar o span ou criar um span não registrado.

**Por que as outras estão erradas:**
- A: Resource detector identifica o serviço, não toma decisões de sampling
- C: **Pegadinha!** Tail-based sampling acontece no Collector, não no SDK. A questão pergunta sobre "a maioria dos SDKs de linguagem", que usam head-based sampling no momento de criação do span. Tail-based sampling exige bufferizar traces completos e normalmente é feito a nível de Collector, não nos SDKs de aplicação.
- D: A lógica de retry do exporter acontece depois que a decisão de sampling já foi tomada

**Distinção-chave:** Head-based (SDK, na criação do span) vs Tail-based (Collector, depois do trace completo).

</details>

---

**18.** Ao inicializar o SDK do OpenTelemetry, qual componente precisa ser configurado primeiro, antes de criar spans?

A) Configuração do exporter  
B) O TracerProvider  
C) Configuração do span processor  
D) Configuração do sampler

<details>
<summary><strong>Resposta</strong></summary>

**B** - Antes de criar spans via get_tracer() na instrumentação típica, o TracerProvider precisa estar configurado e definido como provider global; caso contrário, você vai receber um tracer no-op.

**Por que as outras estão erradas:**
- A: **Pegadinha!** Embora exporters sejam importantes, eles são configurados como parte da configuração do TracerProvider, não antes dele. Você pode criar um TracerProvider sem exporter (embora os spans não sejam exportados).
- C: **Pegadinha!** Span processors são configurados ao criar o TracerProvider, não antes. A inicialização do TracerProvider é o que vem primeiro.
- D: **Pegadinha!** Samplers também são configurados durante a criação do TracerProvider, não como uma etapa separada anterior. O TracerProvider é a base que contém todos esses componentes.

**Conceito-chave:** TracerProvider → get_tracer() → criação de spans. O provider precisa existir primeiro.

</details>

---

**19.** Qual é a diferença entre propagators e exporters?

A) Propagators enviam telemetry para backends; exporters injetam headers  
B) Propagators cuidam da injeção/extração de contexto; exporters enviam telemetry para fora do processo  
C) Ambos fazem a mesma coisa; só o nome muda conforme a linguagem  
D) Exporters decidem o sampling

<details>
<summary><strong>Resposta</strong></summary>

**B** - Propagators cuidam da injeção do contexto (trace_id, span_id, baggage) em carriers (headers HTTP, metadata de mensagens) e da extração a partir dos carriers. Exporters cuidam do envio de telemetry data já finalizado (spans, metrics, logs) para os backends. São responsabilidades completamente diferentes.

**Por que as outras estão erradas:**
- A: Completamente invertido - propagators cuidam de headers, exporters enviam para os backends.
- C: Eles têm papéis distintos e bem definidos em todas as linguagens.
- D: Samplers decidem o sampling, não exporters. Exporters só enviam o que recebem.

</details>

---

**20.** Qual é a razão mais correta para usar uma camada central de Collector mesmo quando você também tem agents implantados?

A) Ela elimina a necessidade de exporters  
B) Ela centraliza políticas (sampling, transforms, roteamento), reduz o fanout no backend e melhora o controle operacional  
C) Ela torna a context propagation desnecessária  
D) Ela converte traces em logs automaticamente

<details>
<summary><strong>Resposta</strong></summary>

**B** - Mesmo com agents em cada node, uma camada central de Collector oferece: aplicação centralizada de políticas (tail-based sampling, redação de PII), redução do fanout no backend (N agents → 1 gateway → backends em vez de N agents → backends), mudanças operacionais mais fáceis (atualizar a config do gateway em vez de atualizar todos os agents) e capacidades de correlação entre serviços.

**Por que as outras estão erradas:**
- A: Exporters continuam necessários - o Collector central usa exporters para enviar para os backends.
- C: A context propagation continua acontecendo entre os serviços. O Collector não a substitui.
- D: Collectors podem rotear/transformar signals, mas não convertem traces em logs automaticamente.

</details>

**21.** Se você criar acidentalmente um novo root span para cada chamada HTTP de saída, qual sintoma é mais provável?

A) Os traces ficam muito longos, com muitos children  
B) Os traces se fragmentam; você vê muitos traces de span único em vez de traces de ponta a ponta  
C) Os timeouts do exporter aumentam, mas os traces continuam conectados  
D) Só as metrics quebram

<details>
<summary><strong>Resposta</strong></summary>

**B** - Quando você cria um root span para cada chamada de saída em vez de usar o contexto atual como parent, cada chamada inicia um novo trace. Você acaba com muitos traces desconectados de span único, em vez de um trace conectado mostrando o fluxo completo da requisição. Esse é um bug clássico de context propagation.

**Por que as outras estão erradas:**
- A: Os traces ficariam mais curtos (spans únicos), não mais longos. Nenhuma relação parent/child é formada.
- C: O comportamento do exporter não tem relação com relações parent/child de spans.
- D: As metrics continuam funcionando independentemente da estrutura do trace.

</details>

---

**22.** Qual afirmação sobre "extensions" do Collector é mais precisa?

A) São obrigatórias em todo pipeline  
B) Elas oferecem capacidades como health checks, pprof, zpages, auth, storage, etc., não processamento de signal  
C) São processors que rodam depois dos exporters  
D) Só existem para metrics

<details>
<summary><strong>Resposta</strong></summary>

**B** - Extensions são componentes opcionais que adicionam capacidades operacionais ao Collector: health_check (endpoints de liveness/readiness), pprof (profiling em Go), zpages (diagnósticos internos), file_storage (queues persistentes), etc. Elas não processam signals de telemetry - isso é papel dos processors.

**Por que as outras estão erradas:**
- A: Extensions são opcionais. Um Collector mínimo pode rodar sem nenhuma extension.
- C: Extensions são separadas do pipeline. Processors rodam no pipeline, entre receivers e exporters.
- D: Extensions funcionam em todos os tipos de signal, não só em metrics.

</details>

---

**23.** Qual afirmação sobre atributos de span vs eventos é mais correta?

A) Eventos são pares chave/valor sem timestamp  
B) Atributos devem capturar metadata estável; eventos capturam ocorrências com timestamp durante o span  
C) Atributos são só para erros; eventos são só para info  
D) Eventos substituem logs completamente

<details>
<summary><strong>Resposta</strong></summary>

**B** - Atributos são pares chave-valor descrevendo o span (http.method, db.statement, etc.) - metadata relativamente estável. Eventos são ocorrências com timestamp que acontecem durante o span (exceptions, retries, cache hits) - eles têm um timestamp e podem ter seus próprios atributos. São propósitos diferentes.

**Por que as outras estão erradas:**
- A: Eventos TÊM timestamps - essa é a característica que os define. Eles marcam quando algo aconteceu durante o span.
- C: Tanto atributos quanto eventos podem ser usados para diversos fins. Não existe essa restrição.
- D: Eventos complementam logs, mas não os substituem. Logs são um signal separado, com casos de uso diferentes.

</details>

---

**24.** Você suspeita que spans estão sendo descartados no Collector sob carga. Qual combinação é mais diagnóstica?

A) Apenas dashboards de backend mostrando taxas de ingestão  
B) Self-telemetry do Collector + logs do memory limiter + metrics de queue do exporter  
C) Metrics de criação de span do lado da aplicação e tamanhos de queue do SDK  
D) Aumentar o timeout do batch processor para ver se os spans acabam chegando

<details>
<summary><strong>Resposta</strong></summary>

**B** - Ao depurar spans descartados no Collector, você precisa de visibilidade sobre o estado interno do Collector. Metrics de self-telemetry (como otelcol_processor_dropped_spans), logs do memory limiter (mostrando quando a backpressure é aplicada) e metrics de queue do exporter (mostrando profundidade e capacidade da queue) juntos dão o quadro completo de onde e por que os spans estão sendo descartados.

**Por que as outras estão erradas:**
- A: **Pegadinha!** Dashboards de backend mostram o que chegou, mas não conseguem dizer *por que* os spans não chegaram ou *onde* no pipeline do Collector eles foram descartados
- C: **Pegadinha!** Metrics do lado da aplicação mostram se os spans saíram da aplicação, mas se o problema está no Collector sob carga, essas metrics não vão revelar problemas específicos do Collector, como limites de memória ou overflow de queue do exporter
- D: **Pegadinha!** Aumentar o batch timeout pode ajudar com problemas de throughput, mas não diagnostica *por que* os spans estão sendo descartados. Se o Collector está descartando spans por pressão de memória ou overflow de queue, esperar mais tempo não vai resolver

</details>

---

**25.** Em um SDK de linguagem, onde o "span atual" costuma ser armazenado?

A) Em uma variável global compartilhada entre threads  
B) Em um mecanismo de contexto (thread-local/async-local) gerenciado pelo runtime/framework  
C) Dentro da queue do exporter  
D) Só no Collector

<details>
<summary><strong>Resposta</strong></summary>

**B** - O "span atual" é armazenado em um objeto de contexto gerenciado pelo runtime da linguagem (thread-local storage em linguagens com threads, contexto assíncrono em linguagens assíncronas). Isso permite que child spans encontrem automaticamente seu parent sem passagem explícita. O SDK fornece context managers/decorators para lidar com isso.

**Por que as outras estão erradas:**
- A: Variáveis globais compartilhadas entre threads causariam race conditions e relações parent/child incorretas em código concorrente.
- C: A queue do exporter guarda spans já finalizados esperando exportação, não o span ativo atual.
- D: O Collector não rastreia o "span atual" do lado da aplicação - isso é responsabilidade do SDK.

</details>

---

**26.** Em um sistema bem instrumentado, a forma mais rápida de distinguir "nenhum telemetry produzido" de "telemetry produzido mas não exportado" é:

A) Checar metrics de ingestão do backend e comparar com a contagem de requisições da aplicação  
B) Adicionar temporariamente um debug/logging exporter e comparar as contagens com a ingestão no backend  
C) Trocar de OTLP para Zipkin para ver se o protocolo é o problema  
D) Habilitar o debug logging do SDK para ver se os spans estão sendo criados

<details>
<summary><strong>Resposta</strong></summary>

**B** - Adicionar um debug/logging exporter (seja no SDK ou no Collector) permite ver exatamente qual telemetry está sendo produzido e enviado. Ao comparar a contagem/conteúdo na saída de debug com o que chega no backend, você consegue identificar rapidamente se o problema está na criação (nenhum telemetry na saída de debug) ou na exportação (telemetry na saída de debug, mas não no backend).

**Por que as outras estão erradas:**
- A: **Pegadinha!** Metrics de backend + contagem de requisições podem mostrar que existe uma discrepância, mas não dizem *onde* está o problema. Se você vê 1000 requisições mas só 100 traces no backend, você ainda não sabe se 900 spans nunca foram criados ou se foram criados e descartados em algum ponto do pipeline.
- C: **Pegadinha!** Trocar de protocolo pode ajudar se houver um bug específico do protocolo, mas não diagnostica a causa raiz. Se os spans não estão sendo criados, mudar o protocolo do exporter não vai ajudar.
- D: **Pegadinha!** O debug logging do SDK mostra a criação do span, mas não mostra o que acontece depois da exportação. Se os spans são criados mas descartados pelo Collector ou perdidos em trânsito, os logs do SDK não vão revelar isso. Você precisa de visibilidade no ponto de exportação.

</details>

---

**27.** Um serviço usa instrumentação tanto de OpenTelemetry quanto de OpenTracing. Qual é a expectativa mais correta?

A) Eles não conseguem coexistir de jeito nenhum  
B) Camadas de bridge/shim podem existir, mas a fidelidade semântica pode ser imperfeita e exige configuração cuidadosa  
C) OpenTracing converte metrics em spans automaticamente  
D) OpenTelemetry precisa do OpenTracing para funcionar

<details>
<summary><strong>Resposta</strong></summary>

**B** - OpenTelemetry oferece camadas de bridge/shim para interoperar com instrumentação de OpenTracing. Porém, as duas APIs têm semânticas diferentes (OTel tem mais recursos, como eventos, links, status), então o mapeamento não é perfeito. Alguma informação pode se perder ou ser aproximada na tradução.

**Por que as outras estão erradas:**
- A: Eles conseguem coexistir usando camadas de bridge. Muitas organizações rodam as duas durante uma migração.
- C: OpenTracing é apenas uma API de tracing, e não lida com metrics de forma alguma.
- D: OpenTelemetry é independente e não precisa do OpenTracing. OpenTracing é o padrão mais antigo sendo substituído.

</details>

---

**28.** Seus traces mostram nomes de serviço corretos em desenvolvimento, mas "unknown_service" em produção. A causa raiz mais provável é:

A) O batch processor foi desabilitado em produção  
B) O ambiente de produção não tem OTEL_SERVICE_NAME nem OTEL_RESOURCE_ATTRIBUTES configurados, e não há configuração programática de resource  
C) Os headers de context propagation mudaram entre os ambientes  
D) Os logs foram desabilitados em produção

<details>
<summary><strong>Resposta</strong></summary>

**B** - Quando os nomes de serviço funcionam em desenvolvimento mas aparecem como "unknown_service" (ou "unknown_service:node", etc.) em produção, isso significa que o ambiente de produção está sem a configuração de resource que existia em dev. Isso costuma acontecer quando desenvolvedores configuram OTEL_SERVICE_NAME localmente mas esquecem de configurá-lo nas configs de deploy de produção, ou quando a configuração programática de resource não está sendo aplicada no runtime de produção.

**Por que as outras estão erradas:**
- A: **Pegadinha!** O batch processor afeta o timing e o agrupamento da exportação, não o nome do serviço. Nomes de serviço vêm de atributos de resource, não de processors.
- C: **Pegadinha!** Headers de context propagation (traceparent/tracestate) carregam trace context entre os serviços, não a identidade do serviço. O nome de cada serviço vem da sua própria configuração de resource.
- D: **Pegadinha!** Logs desabilitados não afetariam os nomes de serviço nos traces. São signals separados com configuração independente.

</details>

---

**29.** Você configura OTEL_RESOURCE_ATTRIBUTES=service.name=payments,service.version=1.2.3 mas seus spans mostram service.name=unknown_service. A causa mais provável é:

A) O Collector sobrescreveu o resource com o dele próprio  
B) A variável de ambiente não está configurada no processo, ou a configuração programática está sobrescrevendo-a  
C) W3C Trace Context não está habilitado  
D) O span kind está errado

<details>
<summary><strong>Resposta</strong></summary>

**B** - Segundo a spec, os SDKs DEVEM ler OTEL_RESOURCE_ATTRIBUTES, mas resources vindos de variável de ambiente têm prioridade menor que resources programáticos. O mais provável: a variável de ambiente não está de fato configurada no processo (confira com `printenv`), tem problema de formatação, ou a configuração programática está sobrescrevendo-a.

**Por que as outras estão erradas:**
- A: O Collector não sobrescreve os atributos de resource da aplicação, a menos que esteja explicitamente configurado com um resource processor.
- C: W3C Trace Context serve para propagar contexto de trace entre serviços, não para atributos de resource.
- D: Span kind descreve o papel do span, completamente sem relação com atributos de resource.

</details>

---

**30.** Ajuste de performance: qual é o principal trade-off ao aumentar o tamanho do batch?

A) Menor throughput, mas menor CPU  
B) Maior throughput/eficiência, mas maior latência e uso de memória durante o buffering  
C) Timestamps mais precisos  
D) Menos necessidade de TLS

<details>
<summary><strong>Resposta</strong></summary>

**B** - Aumentar o tamanho do batch significa que mais telemetry é acumulado antes de ser enviado. Isso melhora o throughput (menos chamadas de rede, melhor compressão), mas aumenta a latência (os dados esperam mais tempo antes de serem exportados) e o uso de memória (mais dados em buffer). É o clássico trade-off throughput vs latência.

**Por que as outras estão erradas:**
- A: Batches maiores aumentam o throughput (mais eficiente), não o contrário. A CPU pode ficar um pouco mais alta por causa da compressão.
- C: Timestamps são definidos quando o telemetry é criado, sem relação com o tamanho do batch.
- D: A necessidade de TLS é independente do tamanho do batch. Você ainda precisa de TLS por segurança, independentemente do batching.

</details>

---

**31.** Qual afirmação sobre convenções semânticas é mais correta?

A) São obrigatórias e aplicadas pelo Collector  
B) São esquemas recomendados de nomenclatura/atributos para melhorar interoperabilidade e capacidade de consulta  
C) São só para metrics, não para traces/logs  
D) Estão obsoletas em favor do baggage

<details>
<summary><strong>Resposta</strong></summary>

**B** - Convenções semânticas definem esquemas padrão de nomenclatura e atributos (como http.request.method, db.system) para garantir consistência entre implementações. Elas são fortemente recomendadas para interoperabilidade, mas não são impostas pela spec. Backends e ferramentas funcionam melhor quando você as segue.

**Por que as outras estão erradas:**
- A: Elas não são obrigatórias. O SDK/Collector não vai rejeitar telemetry que não as siga.
- C: Convenções semânticas existem para todos os signals - traces, metrics e logs.
- D: Convenções semânticas são mantidas e evoluídas ativamente. Baggage é um conceito separado, para contexto de requisição.

</details>

---

**32.** Qual prática de nomenclatura tende a criar a pior dor de longo prazo?

A) Usar nomes de span de baixa cardinalidade, como padrões GET /orders/{id} (templated)  
B) Colocar IDs únicos nos nomes de span (por exemplo, GET /orders/12345)  
C) Usar atributos de convenção semântica para templates de rota  
D) Manter service.name estável por unidade implantável

<details>
<summary><strong>Resposta</strong></summary>

**B** - Nomes de span devem ter baixa cardinalidade (número limitado de valores distintos), como "GET /orders/{id}" e não "GET /orders/12345". Nomes de span de alta cardinalidade tornam impossível agregar metrics por nome de span, quebram a indexação do backend e tornam os traces impossíveis de buscar. Coloque os IDs em atributos, em vez disso.

**Por que as outras estão erradas:**
- A: Essa é a prática correta - usar nomes templated/parametrizados com baixa cardinalidade.
- C: Isso também é correto - usar convenções semânticas para templates de rota em atributos.
- D: Isso também é correto - service.name deve ser estável por unidade implantável, e não mudar por instância.

</details>

---

**33.** Nas metrics de OpenTelemetry, qual é o propósito de alto nível mais correto para as Views (onde suportadas)?

A) Controlar agregação e seleção de atributos para os streams de metric  
B) Definir a probabilidade de trace sampling  
C) Mudar o backoff de retry do exporter  
D) Renomear eventos de span

<details>
<summary><strong>Resposta</strong></summary>

**A** - Views permitem que você personalize como as metrics são agregadas e exportadas: mudar a temporalidade da agregação, selecionar quais atributos incluir/excluir (gerenciamento de cardinalidade), mudar os limites de bucket do histogram, renomear metrics, etc. Elas são configuradas no SDK e controlam o que é exportado.

**Por que as outras estão erradas:**
- B: Sampling é configurado via samplers, não via views. Views são para metrics, sampling é para traces.
- C: O backoff de retry do exporter é configurado nas configurações do exporter, não nas views.
- D: Eventos de span fazem parte de traces, não de metrics. Views não afetam trace data.

</details>

---

**34.** Ao depurar context propagation entre serviços HTTP, a coisa mais direta a checar é:

A) Que todos os serviços compartilham o mesmo endpoint de exporter  
B) Que as requisições de entrada carregam os headers traceparent (e opcionalmente tracestate) e que os frameworks extraem/injetam eles  
C) Que todos os spans têm o mesmo span.kind  
D) Que as metrics estão habilitadas

<details>
<summary><strong>Resposta</strong></summary>

**B** - Para serviços HTTP, o trace context é propagado via o header traceparent (obrigatório, contém trace_id e span_id) e o header tracestate (opcional, dados específicos de vendor). Confira se: as requisições de saída injetam esses headers, as requisições de entrada os extraem, e os frameworks/bibliotecas suportam o formato W3C Trace Context.

**Por que as outras estão erradas:**
- A: Os serviços podem exportar para backends diferentes. Context propagation acontece no momento da requisição, não no momento da exportação.
- C: Span kind descreve o papel do span, não afeta context propagation.
- D: Metrics são independentes de context propagation de trace.

</details>

---

**35.** Um histogram mostra a latência p99. Qual é a intuição correta sobre de onde vem o p99?

A) É armazenado como um único ponto de metric por padrão  
B) É calculado a partir de uma distribuição (histogram ou summary) no momento da query (dependendo do backend/formato)  
C) É um atributo de span  
D) É derivado da severidade dos logs

<details>
<summary><strong>Resposta</strong></summary>

**B** - Histograms registram distribuições contando observações em buckets. O p99 (percentil 99) é calculado no momento da query a partir das contagens dos buckets. Ele não é armazenado como um único valor - o histogram armazena a distribuição, e os percentis são derivados dela.

**Por que as outras estão erradas:**
- A: Histograms armazenam contagens de bucket, não valores individuais de percentil. Percentis são calculados a partir da distribuição.
- C: Atributos de span são pares chave-valor em traces, sem relação com cálculo de percentil de metric.
- D: Severidade de log serve para logs, sem relação com cálculo de percentil de metric.

</details>

---

**36.** Você vê traces, mas as relações parent/child estão erradas em código assíncrono. Qual é o culpado mais comum?

A) Exporter errado  
B) Contexto não vinculado corretamente à execução assíncrona (instrumentação ou context manager ausente)  
C) Batch processor mal configurado  
D) Atributos de resource ausentes

<details>
<summary><strong>Resposta</strong></summary>

**B** - Em código assíncrono (promises, async/await, callbacks), o contexto precisa ser explicitamente vinculado à execução assíncrona. Se o framework/instrumentação não cuidar disso, child spans criados em callbacks assíncronos não vão encontrar o contexto do parent, resultando em traces desconectados ou relações parent/child incorretas.

**Por que as outras estão erradas:**
- A: A escolha do exporter não afeta as relações parent/child de span - isso é determinado no momento de criação do span.
- C: O batch processor afeta o timing da exportação, não as relações entre spans.
- D: Atributos de resource descrevem o serviço, não afetam relações parent/child de span.

</details>

---

**37.** Você quer que spans de cliente HTTP incluam o nome do serviço peer para construção de service graph. Qual é a melhor abordagem?

A) Colocar o nome do serviço peer sempre no baggage  
B) Configurar os atributos de span apropriados segundo as convenções semânticas (por exemplo, server.address, server.port, ou network.peer.address)  
C) Colocar o nome do peer só no nome do span  
D) Usar o atributo de resource service.name no span do cliente

<details>
<summary><strong>Resposta</strong></summary>

**B** - Service graphs são construídos a partir de atributos de span que identificam o serviço peer. service.peer.name quando conhecido; caso contrário, recorra a atributos de rede como server.address ou network.peer.address.

**Por que as outras estão erradas:**
- A: Baggage se propaga com as requisições, mas não é o lugar certo para identificação do serviço peer. Use atributos de span.
- C: O nome do span deve descrever a operação, não o serviço peer. Atributos servem para metadata como o serviço peer.
- D: service.name é um atributo de resource que identifica o serviço atual, não o peer. Cada serviço tem seu próprio service.name.

</details>

---

**38.** A melhor prática para tagueamento de resource é:

A) Colocar valores aleatórios específicos de deployment em service.name  
B) Colocar a identidade estável do serviço em service.name, e detalhes de deployment em atributos como service.version/deployment.environment  
C) Colocar o hostname no nome do span  
D) Colocar trace_id em atributos de resource

<details>
<summary><strong>Resposta</strong></summary>

**B** - service.name deve ser estável e identificar o serviço lógico (por exemplo, "payment-service"), sem mudar a cada deployment. Use outros atributos de resource para detalhes específicos de deployment: service.version para a versão, deployment.environment para o ambiente (prod/staging), service.instance.id para a identidade da instância. Isso possibilita agregação e comparação adequadas entre deployments.

**Por que as outras estão erradas:**
- A: Valores aleatórios ou específicos de deployment em service.name quebram a agregação e tornam a comparação histórica impossível.
- C: Hostname pertence aos atributos de resource (host.name), não ao nome do span. O nome do span descreve a operação.
- D: trace_id é por requisição, não por serviço. Ele pertence ao trace context, não aos atributos de resource.

</details>

---

**39.** No Collector, qual configuração reflete melhor "o pipeline de traces recebe OTLP e exporta para OTLP"?

A) receivers: [otlp] processors: [batch] exporters: [otlp] sob service.pipelines.traces  
B) Colocar exporters dentro de receivers  
C) Colocar receivers dentro de exporters  
D) Colocar tudo dentro de extensions

<details>
<summary><strong>Resposta</strong></summary>

**A** - Isso mostra a estrutura YAML correta para um pipeline do Collector. Sob service.pipelines.traces, você lista os receivers, processors e exporters a usar. O Collector os conecta em ordem: OTLP receiver → batch processor → OTLP exporter.

**Por que as outras estão erradas:**
- B: Exporters não ficam aninhados dentro de receivers. São listas separadas no mesmo nível.
- C: Receivers não ficam aninhados dentro de exporters. São listas separadas no mesmo nível.
- D: Extensions são separadas dos pipelines. Pipelines ficam sob service.pipelines, extensions sob service.extensions.

</details>

---

**40.** Qual é a afirmação mais correta sobre sampling e debugging?

A) Sampling nunca afeta o debugging porque você pode extrapolar traces ausentes  
B) Se você amostrar de forma muito agressiva, pode perder traces raros de falha, então ajuste a estratégia de sampling ou use tail sampling para traces "interessantes"  
C) Sampling só se aplica a metrics  
D) O sampling é decidido apenas pelo Collector

<details>
<summary><strong>Resposta</strong></summary>

**B** - Se você amostra em 1%, vai perder 99% dos traces, incluindo erros raros. Para debugging, você precisa dos traces de erro. Soluções: aumentar a taxa de sampling, usar parent-based sampling (se o parent foi amostrado, amostrar os children), ou usar tail-based sampling no Collector para manter traces com erro e amostrar os bem-sucedidos.

**Por que as outras estão erradas:**
- A: Você não consegue extrapolar de forma confiável traces ausentes, especialmente para erros raros ou casos extremos.
- C: Sampling se aplica a traces, não a metrics. Metrics tipicamente não são amostradas (elas já são agregadas).
- D: O sampling pode ser decidido pelo SDK (head-based) ou pelo Collector (tail-based). As duas abordagens são válidas.

</details>

**41.** Um receiver é mais bem descrito como:

A) Um componente que envia dados para um backend  
B) Um componente que aceita telemetry data no Collector (push ou pull)  
C) Um componente que faz batch de spans  
D) Um componente que só transforma atributos

<details>
<summary><strong>Resposta</strong></summary>

**B** - Receivers são o ponto de entrada de dados no Collector. Eles podem aceitar dados enviados via push (o OTLP receiver aceita gRPC/HTTP), coletar via pull (o Prometheus receiver faz scrape de metrics), ou ler de arquivos (filelog receiver). São o primeiro componente do pipeline.

**Por que as outras estão erradas:**
- A: Isso é um exporter - envia dados para backends.
- C: Isso é o batch processor - faz batch dos dados para exportação eficiente.
- D: Isso é o que os processors fazem - receivers apenas aceitam os dados como estão.

</details>

---

**42.** Se você precisa escolher um primeiro passo para melhorar a confiabilidade do pipeline durante outages intermitentes de backend:

A) Desabilitar retries para que as falhas apareçam rapidamente  
B) Habilitar/dimensionar queues + retries adequadamente, e garantir que a backpressure não trave o Collector  
C) Aumentar a verbosidade de log em produção permanentemente  
D) Remover o batch processor

<details>
<summary><strong>Resposta</strong></summary>

**B** - Queues fazem buffer dos dados durante outages temporárias de backend, retries lidam com falhas transitórias. O dimensionamento correto evita perda de dados durante outages curtas, e ao mesmo tempo evita OOM durante outages longas. Configure sending_queue (tamanho, storage persistente) e retry_on_failure (habilitado, intervalo inicial/máximo) nos exporters.

**Por que as outras estão erradas:**
- A: Desabilitar retries significa perda de dados em qualquer falha transitória. Retries são essenciais para confiabilidade.
- C: Aumentar a verbosidade de log ajuda no debugging, mas não melhora a confiabilidade. Na verdade, pode até prejudicar a performance.
- D: O batch processor melhora a eficiência e reduz a carga no backend. Removê-lo piora as coisas.

</details>

---

**43.** Qual é a melhor descrição para connectors no Collector?

A) São exporters que também conseguem receber dados, permitindo a ligação entre pipelines  
B) São blocos de configuração de TLS  
C) São obrigatórios para OTLP  
D) Só funcionam para logs

<details>
<summary><strong>Resposta</strong></summary>

**A** - Connectors funcionam tanto como exporter (de um pipeline) quanto como receiver (para outro pipeline). Exemplo: o connector spanmetrics exporta a partir do pipeline de traces e recebe no pipeline de metrics, gerando metrics a partir de trace data. Eles permitem transformação de signal dentro do Collector.

**Por que as outras estão erradas:**
- B: Configurações de TLS são feitas em receivers/exporters, não em connectors.
- C: OTLP funciona sem connectors. Connectors servem para ligar pipelines entre si.
- D: Connectors funcionam para todos os tipos de signal - traces, metrics e logs.

</details>

---

**44.** Qual é a razão mais forte para evitar atributos de alta cardinalidade em metrics e logs?

A) Eles quebram o trace context  
B) Eles fazem os custos de storage/query e a performance explodirem, reduzindo a usabilidade do sistema  
C) Eles impedem o uso de TLS  
D) Eles são proibidos pela spec do OpenTelemetry

<details>
<summary><strong>Resposta</strong></summary>

**B** - Atributos de alta cardinalidade (user_id, request_id, etc.) criam um número enorme de séries temporais únicas em metrics ou entradas de log. Isso causa: crescimento exponencial de storage, queries lentas, alto uso de memória e, potencialmente, travamento de backends. Mantenha os atributos de metric/log com baixa cardinalidade (número limitado de valores distintos).

**Por que as outras estão erradas:**
- A: Alta cardinalidade não quebra o trace context. É um problema de storage/performance.
- C: TLS não tem relação com cardinalidade. É sobre criptografia.
- D: A spec permite atributos de alta cardinalidade, mas é uma prática terrível que quebra sistemas.

</details>

---

**45.** Você quer adicionar um atributo team=backend a todos os spans no Collector. Qual processor?

A) Batch processor  
B) Attributes processor ou resource processor  
C) Memory limiter  
D) Filter processor

<details>
<summary><strong>Resposta</strong></summary>

**B** - O attributes processor pode adicionar/modificar/remover atributos de span. O resource processor pode adicionar/modificar/remover atributos de resource (que se aplicam a todo o telemetry). Ambos podem adicionar um atributo team=backend, dependendo de você querer que seja um atributo de span ou de resource.

**Por que as outras estão erradas:**
- A: Batch processor agrupa dados para exportação, não modifica atributos.
- C: Memory limiter protege contra OOM, não modifica atributos.
- D: Filter processor descarta spans/metrics/logs inteiros com base em condições, não adiciona atributos.

</details>

---

**46.** Qual afirmação sobre span status é mais correta?

A) O status é opcional e raramente usado  
B) O status (OK, ERROR, UNSET) indica o resultado do span; ERROR normalmente significa que a operação falhou  
C) O status é só para spans HTTP  
D) O status substitui os atributos de span

<details>
<summary><strong>Resposta</strong></summary>

**B** - O status do span é uma forma padronizada de indicar se a operação teve sucesso ou falhou. UNSET (padrão), OK (sucesso explícito), ERROR (a operação falhou). Backends usam o status para identificar erros, calcular taxas de erro e destacar operações que falharam. Defina o status como ERROR quando exceptions ocorrerem ou operações falharem.

**Por que as outras estão erradas:**
- A: O status é importante para rastreamento de erros e deve ser definido adequadamente. É amplamente usado.
- C: O status se aplica a todos os tipos de span, não só HTTP. Spans de DB, spans de RPC, etc., todos usam status.
- D: O status complementa os atributos, não os substitui. Use os dois: status para o resultado, atributos para os detalhes.

</details>

---

**47.** Em um sampler ParentBased, o que acontece com os child spans quando o parent é amostrado?

A) Os children são sempre descartados  
B) Os children herdam a decisão de sampling do parent  
C) Os children usam um sampler diferente  
D) Os children são sempre amostrados em 100%

<details>
<summary><strong>Resposta</strong></summary>

**B** - O sampler ParentBased garante um sampling consistente em um trace distribuído. Se o span parent foi amostrado, todos os children são amostrados. Se o parent não foi amostrado, os children também não são. Isso evita traces parciais (alguns spans amostrados, outros não), que são difíceis de analisar.

**Por que as outras estão erradas:**
- A: Os children herdam a decisão do parent, não são descartados automaticamente.
- C: Os children usam a decisão do parent, não um sampler diferente.
- D: Os children podem ser amostrados em 100% se o parent foi amostrado, mas também podem não ser amostrados se o parent não foi. Eles herdam a decisão.

</details>

---

**48.** O que acontece quando a queue do BatchSpanProcessor está cheia?

A) O Collector trava  
B) Novos spans são descartados  
C) A exportação acontece imediatamente  
D) Os spans são enviados para um exporter diferente

<details>
<summary><strong>Resposta</strong></summary>

**B** - O BatchSpanProcessor tem um tamanho máximo de queue (max_queue_size). Quando ela está cheia, novos spans são descartados em vez de enfileirados. Isso evita crescimento ilimitado de memória. O SDK pode logar avisos sobre spans descartados. Monitore as metrics do SDK para detectar essa condição.

**Por que as outras estão erradas:**
- A: O SDK não trava - ele descarta spans de forma controlada para se proteger de esgotamento de memória.
- C: A exportação acontece na programação (OTEL_BSP_SCHEDULE_DELAY) ou quando o batch está cheio, não quando a queue está cheia.
- D: Os spans não são redirecionados. Eles simplesmente são descartados. Configure um exporter por processor.

</details>

---

**49.** OTEL_BSP_SCHEDULE_DELAY controla:

A) Quanto tempo esperar antes de iniciar o SDK  
B) O tempo máximo que o batch processor espera antes de exportar, mesmo que o batch não esteja cheio  
C) A probabilidade de sampling  
D) O intervalo de retry do exporter

<details>
<summary><strong>Resposta</strong></summary>

**B** - Isso controla o intervalo de espera entre exportações consecutivas. O batch processor exporta quando: o batch atinge max_export_batch_size OU o tempo de schedule_delay passa (o que vier primeiro). Valores mais baixos = menor latência, mas exportações mais frequentes. O padrão é tipicamente 5000 milissegundos.

**Por que as outras estão erradas:**
- A: O SDK inicia imediatamente. Isso controla o timing das exportações contínuas, não o start.
- C: A probabilidade de sampling é controlada pela configuração do sampler (OTEL_TRACES_SAMPLER), não pelo batch processor.
- D: O intervalo de retry do exporter é controlado pelas configurações de retry do exporter, não pelo schedule delay do batch processor.

</details>

---

**50.** Se o contexto de parent de um span não estiver configurado corretamente, o que acontece?

A) O span vira um root span (novo trace)  
B) O span é descartado  
C) O exporter falha  
D) As metrics param de funcionar

<details>
<summary><strong>Resposta</strong></summary>

**A** - Quando você cria um span sem fornecer contexto de parent (ou se o contexto não é propagado corretamente), o SDK cria um root span com um novo trace_id. É por isso que a context propagation quebrada resulta em traces fragmentados - cada serviço inicia um novo trace em vez de continuar o existente.

**Por que as outras estão erradas:**
- B: Spans não são descartados por falta de contexto de parent. Eles são criados como root spans.
- C: O exporter funciona independentemente do contexto de parent. Ele exporta os spans que forem criados.
- D: As metrics são independentes do contexto de parent do span.

</details>

---

**51.** Qual é o melhor motivo para NÃO colocar trace_id como label de metric em todas as metrics?

A) Isso quebra o W3C Trace Context  
B) Isso aumenta a cardinalidade drasticamente e pode desestabilizar backends de metric  
C) Isso impede a exportação para o Prometheus  
D) Isso força o sampling always-on

<details>
<summary><strong>Resposta</strong></summary>

**B** - Cada trace_id único cria uma nova série temporal. Com milhões de requisições, você gera milhões de séries temporais, causando: custos massivos de storage, queries lentas, alto uso de memória e instabilidade no backend. Isso é chamado de "napalm de cardinalidade" - ele destrói sistemas de metric. Nunca use valores de alta cardinalidade como atributos de metric.

**Por que as outras estão erradas:**
- A: W3C Trace Context serve para propagar trace context, sem relação com labels de metric.
- C: O Prometheus tecnicamente consegue aceitar isso, mas vai destruir sua instância do Prometheus com uma explosão de cardinalidade.
- D: O sampling é independente dos labels de metric. Mas o problema de cardinalidade permanece de qualquer forma.

</details>

---

**52.** SimpleSpanProcessor vs BatchSpanProcessor - qual é a diferença principal?

A) O Simple é mais rápido  
B) O Simple exporta cada span de forma síncrona (bloqueante); o Batch enfileira e exporta de forma assíncrona  
C) O Simple só funciona com OTLP  
D) O Batch não suporta sampling

<details>
<summary><strong>Resposta</strong></summary>

**B** - O SimpleSpanProcessor chama o exporter imediatamente para cada span (síncrono, bloqueia a thread da aplicação). O BatchSpanProcessor enfileira os spans e os exporta de forma assíncrona em batches. O Batch é quase sempre preferido em produção - o Simple é mais usado para testes/debug.

**Por que as outras estão erradas:**
- A: O Simple é mais lento porque bloqueia em cada span. O Batch é mais rápido por ser assíncrono e agrupado.
- C: Ambos funcionam com qualquer exporter (OTLP, Jaeger, etc.). O processor é independente da escolha do exporter.
- D: O sampling acontece antes dos processors. Os dois tipos de processor funcionam com qualquer sampler.

</details>

---

**53.** A maioria dos SDKs de OpenTelemetry lida com valores de atributo null/None:

A) Armazenando como a string "null"  
B) Ignorando ou removendo (null não é um valor de atributo válido)  
C) Convertendo para strings vazias  
D) Lançando um erro

<details>
<summary><strong>Resposta</strong></summary>

**B** - A spec do OpenTelemetry define os tipos válidos de valor de atributo: string, boolean, int, double, array desses tipos. Null/None não é um tipo válido. A maioria dos SDKs ignora silenciosamente tentativas de definir valores null em vez de lançar erros. Se você precisa representar "sem valor", simplesmente omita o atributo.

**Por que as outras estão erradas:**
- A: Null não é armazenado como a string "null". Ele é ignorado/removido.
- C: Null não é convertido para string vazia. String vazia é um valor válido, null não é.
- D: A maioria dos SDKs não lança erros, eles ignoram silenciosamente valores null por robustez.

</details>

---

**54.** trace.get_tracer() usa qual tracer provider?

A) Um novo provider criado a cada chamada  
B) O tracer provider global, definido via trace.set_tracer_provider()  
C) O provider do Collector  
D) Um provider aleatório

<details>
<summary><strong>Resposta</strong></summary>

**B** - O SDK usa um padrão de tracer provider global. Você configura e define o provider global uma única vez, no start (trace.set_tracer_provider(provider)). Depois, ao longo do código, trace.get_tracer() retorna um tracer daquele provider global. Isso permite que bibliotecas de instrumentação obtenham tracers sem saber nada sobre sua configuração específica.

**Por que as outras estão erradas:**
- A: Criar um novo provider a cada chamada seria um desperdício e perderia a configuração. O provider global é reutilizado.
- C: O Collector não fornece tracers para as aplicações. Cada aplicação tem seu próprio SDK, com seu próprio tracer provider.
- D: Não há aleatoriedade nenhuma. Ele usa o provider global explicitamente configurado.

</details>

---

**55.** Um exporter lento (5 segundos por batch) com uma taxa alta de criação de span vai provavelmente causar:

A) Exportações mais rápidas  
B) Acúmulo na queue e descarte eventual de spans  
C) Escalonamento automático  
D) Aumento no sampling

<details>
<summary><strong>Resposta</strong></summary>

**B** - Se os spans são criados mais rápido do que o exporter consegue enviá-los (5 segundos por batch é muito lento), a queue enche. Quando max_queue_size é atingido, novos spans são descartados. Esse é um problema clássico de backpressure. Soluções: corrigir a performance do exporter, aumentar o tamanho da queue, reduzir a taxa de criação de span, ou melhorar o sampling.

**Por que as outras estão erradas:**
- A: Um exporter lento torna as exportações mais lentas, não mais rápidas.
- C: O SDK não escala automaticamente. Você precisa ajustar a configuração ou corrigir o gargalo.
- D: A taxa de sampling é configurada separadamente. Ela não aumenta automaticamente por causa de exporters lentos.

</details>

---

**56.** É possível chamar set_attribute() em um span depois de chamar end()?

A) Sim, funciona normalmente  
B) Não, geralmente é ignorado (no-op) - spans são imutáveis depois do end()  
C) Sim, mas só para atributos de resource  
D) Sempre lança um erro

<details>
<summary><strong>Resposta</strong></summary>

**B** - Depois que você chama span.end(), o span é considerado completo e imutável. Tentativas de modificá-lo (set_attribute, add_event, set_status) geralmente são ignoradas como no-op. Isso evita modificação acidental de spans já finalizados e permite que o SDK os exporte com segurança.

**Por que as outras estão erradas:**
- A: Não funciona normalmente. O span é imutável depois do end().
- C: Atributos de resource são definidos na inicialização do SDK, não em spans individuais. E eles também não podem ser modificados depois do span.end().
- D: A maioria dos SDKs ignora silenciosamente (no-op) em vez de lançar erros, por robustez.

</details>

---

**57.** O sampler ParentBased, com um contexto de parent recebido já amostrado, vai:

A) Ignorar o parent e usar o root sampler  
B) Respeitar a decisão de sampling do parent e amostrar o span  
C) Sempre descartar o span  
D) Só funcionar com OTLP

<details>
<summary><strong>Resposta</strong></summary>

**B** - Quando um sampler ParentBased vê um contexto de entrada com um parent amostrado, ele amostra o span para manter a continuidade do trace. Isso garante traces completos - se o root foi amostrado, todos os descendentes são amostrados. Se não há contexto de parent, ele recorre ao root sampler configurado.

**Por que as outras estão erradas:**
- A: Ele respeita o parent, não o ignora. Esse é justamente o propósito do ParentBased.
- C: Ele amostra o span (respeitando a decisão do parent), não o descarta.
- D: O sampler ParentBased funciona com qualquer exporter/protocolo. É lógica de sampling do lado do SDK.

</details>

---

**58.** Remover todos os atributos de uma metric via uma View resulta em:

A) A metric é apagada  
B) A cardinalidade vira 1 (todos os data points colapsam em uma única série temporal)  
C) A metric vira um trace  
D) A exportação falha

<details>
<summary><strong>Resposta</strong></summary>

**B** - Atributos são o que diferencia as várias séries temporais. Se você remove todos os atributos, todos os data points daquela metric colapsam em uma única série temporal (cardinalidade = 1). Isso pode ser útil para obter um total entre todas as dimensões, mas você perde a capacidade de filtrar/agrupar por atributos.

**Por que as outras estão erradas:**
- A: A metric continua existindo, só que sem atributos (série temporal única).
- C: Metrics e traces são signals separados. Remover atributos não converte entre eles.
- D: A exportação funciona normalmente. Uma metric sem atributos é válida, só que não é muito útil para análise.

</details>

---

**59.** Counters no OpenTelemetry são:

A) Podem aumentar ou diminuir  
B) Monotônicos (não decrescem) - chamar add() com valor negativo é inválido  
C) Só para requisições HTTP  
D) Armazenados como strings

<details>
<summary><strong>Resposta</strong></summary>

**B** - Counters representam valores cumulativos que só sobem (requisições atendidas, bytes enviados, erros). Chamar add() com valor negativo é inválido. Se você precisa de um valor que pode aumentar ou diminuir (tamanho de queue, conexões ativas), use UpDownCounter em vez disso.

**Por que as outras estão erradas:**
- A: Isso é o UpDownCounter. Counter é só monotônico.
- C: Counters podem medir qualquer coisa cumulativa, não só requisições HTTP.
- D: Counters são numéricos (int ou double), não strings.

</details>

---

**60.** Se spans estão sendo descartados por overflow de queue, o que você deve fazer?

A) Diminuir max_queue_size  
B) Aumentar max_queue_size e/ou max_export_batch_size, e garantir que o exporter tenha boa performance  
C) Desabilitar o batching  
D) Remover todos os processors

<details>
<summary><strong>Resposta</strong></summary>

**B** - Overflow de queue significa que os spans estão sendo criados mais rápido do que conseguem ser exportados. Soluções: aumentar o tamanho da queue (mais buffer), aumentar o tamanho do batch (exportação mais eficiente), garantir que o exporter seja rápido (checar rede/backend), ou reduzir a taxa de criação de span (sampling). Também verifique se o backend consegue lidar com a carga.

**Por que as outras estão erradas:**
- A: Diminuir o tamanho da queue piora o problema - menos buffer significa mais descartes.
- C: Desabilitar o batching torna a exportação menos eficiente, provavelmente piorando o problema.
- D: Remover processors não resolve o overflow de queue. A queue está no próprio span processor.

</details>

---

## Guia de Pontuação

- **54-60 (90%+)**: Excelente! Você está bem preparado para o exame OTCA
- **45-53 (75-89%)**: Bom! Revise os tópicos que errou e você vai estar pronto
- **36-44 (60-74%)**: Precisa estudar mais - foque nas seções de SDK e Collector
- **Abaixo de 36 (<60%)**: Revisite o currículo de 30 dias, especialmente as semanas 2-3

**Áreas-Chave para Revisar se Você Pontuou Baixo:**
- Configuração de SDK e atributos de resource (Questões 1, 3, 28, 29, 38)
- Arquitetura de pipeline do Collector (Questões 2, 6, 17, 39, 41, 43)
- Mecanismos de context propagation (Questões 5, 9, 19, 21, 34, 50)
- Estratégias de sampling (Questões 10, 15, 47, 57)
- Batch processing e performance (Questões 4, 12, 30, 48, 49, 52)
- Debugging e troubleshooting (Questões 24, 26, 36, 42)
