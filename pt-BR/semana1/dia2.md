# Dia 2 – Tentando Entender Observabilidade (e Por Que o OpenTelemetry Existe)

Hoje é o **dia 2** da minha jornada de 30 dias aprendendo OpenTelemetry. 

Hoje o assunto foi: **"Por que observabilidade importa tanto, e por que o OpenTelemetry é um assunto tão relevante?"**

<img width="800" height="600" alt="OTel and Observabilidade" src="https://github.com/user-attachments/assets/9ff5f351-a09b-430a-90ed-52cafe93fdce" />

---

## Partindo do problema real: sistemas modernos são difíceis de entender

Sistemas de software modernos são difíceis de operar, mesmo quando construídos corretamente.

Os usuários esperam respostas rápidas e uptime quase perfeito. Os sistemas são distribuídos por padrão. Uma única requisição pode passar por múltiplos serviços, de propriedade de times diferentes, e tocar bancos de dados ou infraestrutura que você não controla diretamente. Ao mesmo tempo, mudanças são implantadas com frequência.

Quando algo quebra, a falha raramente aponta claramente para sua causa. Uma lentidão pode aparecer em um serviço, mas ser causada por algo muito mais profundo no sistema. Engenheiros costumam pular entre logs, metrics, dashboards e traces, tentando reconstruir manualmente o que aconteceu.

Esse é o ambiente para o qual observabilidade existe.

---
# O pesadelo de debugging que a observabilidade resolve

**Sem observabilidade (o jeito antigo):**

Um usuário reporta: "O checkout está lento."

Você verifica:
- Logs da aplicação em 12 servidores diferentes (grep, grep, grep...)
- Metrics de CPU em um dashboard
- Contagem de erros em outro dashboard
- Logs de queries lentas do banco de dados em um terceiro lugar
- Logs do load balancer em ainda outro sistema

Duas horas depois, você ainda está adivinhando qual serviço causou a lentidão, ou se essas linhas de log são sequer da mesma requisição.

**Com observabilidade:**

Você busca pelo transaction ID daquele usuário, abre o trace, e vê:

Checkout request (2.4s total)
├─ API Gateway: 20ms
├─ Cart Service: 50ms
└─ Payment Service: 2,330ms  ← o culpado
   └─ Fraud Check API: 2,300ms (timeout + retry)

Causa raiz encontrada em 90 segundos.

---

## Histórias do mundo real: como isso se parece na prática

Aqui estão três incidentes reais em que observabilidade fez a diferença entre minutos e horas (ou dias) de indisponibilidade.

<details>
<summary><strong>E-commerce: falhas no checkout na Black Friday</strong></summary>

**A situação:** Durante a Black Friday, o checkout começou a falhar para 30% dos clientes. O monitoramento tradicional só mostrava "alto uso de CPU" — nada acionável.

**Sem observabilidade:** Engenheiros ficariam vasculhando logs em 12 servidores diferentes, verificando dashboards de CPU, logs de queries lentas do banco de dados e logs do load balancer — tudo em lugares separados. Duas horas depois, ainda adivinhando.

**O que observabilidade revelou:** Traces distribuídos mostraram o caminho exato da falha:

```
Checkout request (2.4s total)
├─ API Gateway: 20ms ✓
├─ Cart Service: 50ms ✓
└─ Payment Service: 2,330ms ✗
   └─ Stripe (primary): timeout + retry
```

O provedor de pagamento terceirizado estava dando timeout e causando falhas em cascata. O time redirecionou o tráfego para um provedor backup em minutos.

**O resultado:** As falhas no checkout caíram de 30% para menos de 1%. Estimativa de $2,3 milhões em vendas perdidas evitadas. Tempo total até a resolução: 8 minutos.

**A lição:** O problema *parecia* estar no serviço de pagamento, mas na verdade foi causado por uma dependência externa. Sem um trace conectando todos os pontos, você jamais encontraria isso rapidamente.

</details>

<details>
<summary><strong>Serviço de streaming: buffering de vídeo em certas TVs</strong></summary>

**A situação:** Usuários reportaram buffering de vídeo, mas as metrics tradicionais mostravam desempenho de rede normal. Os tickets de suporte estavam se acumulando sem um padrão claro.

**Sem observabilidade:** Os times de suporte respondiam reclamações individuais. Os engenheiros não viam nada de anormal em seus dashboards. Não havia como saber se isso era generalizado ou isolado.

**O que observabilidade revelou:** Ao correlacionar telemetry entre tipos de dispositivo, os engenheiros descobriram que a taxa de buffering era de 12% em smart TVs, mas abaixo de 0,5% em todo o resto. Aprofundando mais: modelos Samsung 2019 com um codec de vídeo específico (HEVC) tinham uma taxa de buffer de 45% — enquanto os mesmos dispositivos usando um codec diferente estavam completamente bem.

**O resultado:** Uma correção direcionada foi implantada apenas nos dispositivos afetados. As reclamações de usuários caíram 94% da noite para o dia. Tempo total até a causa raiz: 45 minutos.

**A lição:** O problema não era a rede, os servidores, nem mesmo os dispositivos em geral — era uma combinação específica de modelo de dispositivo e codec. Você só consegue encontrar esse tipo de padrão quando sua telemetry carrega contexto rico (como tipo de dispositivo e codec) e você pode fazer queries através dele.

</details>

<details>
<summary><strong>Plataforma bancária: falhas intermitentes de pagamento</strong></summary>

**A situação:** Falhas intermitentes de pagamento estavam ocorrendo, mas apenas para certos clientes. O monitoramento tradicional não mostrava erros — as taxas de erro pareciam normais.

**Sem observabilidade:** Como os erros eram intermitentes e não apareciam nas metrics agregadas, isso era praticamente invisível. Os clientes afetados abriam tickets de suporte, mas os engenheiros não conseguiam reproduzir o problema.

**O que observabilidade revelou:** Os dados de trace mostraram que uma query específica do banco de dados (`get_account_transactions`) ocasionalmente levava mais de 4 segundos em vez dos 100ms normais. O padrão: só acontecia com contas do tier "enterprise" — clientes com alto histórico de transações. Mais linhas no banco de dados = query mais lenta = timeout downstream.

**O resultado:** Adicionar um índice ao banco de dados reduziu o tempo de query em 95%. A confiabilidade dos pagamentos melhorou para 99,99%. Tempo total para identificar o padrão: 2 horas.

**A lição:** Metrics agregadas mentem ao fazer médias. Uma query que é lenta para 5% dos usuários, mas rápida para 95%, vai parecer normal nos seus dashboards. Traces permitem encontrar os outliers — as requisições específicas em que as coisas realmente deram errado.

</details>


> **Perceba o padrão nos três casos:** Comece amplo (qual serviço está falhando?), vá restringindo (qual dependência? qual segmento de usuário?), confirme (verifique a hipótese com dados). Esse é o fluxo de debugging de observabilidade ao qual você vai voltar sempre.

---

## O que observabilidade realmente significa

Observabilidade é a capacidade de entender o que o seu sistema está fazendo **de fora**, especialmente quando ele está rodando em produção e não está se comportando como esperado.

Não é apenas saber *que* algo está errado.  
É ser capaz de explicar *por que* está errado.

Uma forma simples de enquadrar isso é:

> Observabilidade = telemetry + análise holística

Telemetry são os dados brutos que um sistema produz: logs, metrics e traces.  
Análise holística significa que esses sinais precisam estar **conectados**, não vistos isoladamente.

Se a telemetry está fragmentada, os engenheiros ficam adivinhando. Quando a telemetry está conectada, os engenheiros conseguem raciocinar sobre causa e efeito.

Essa ideia de conexão leva diretamente à **correlação**.

---

## Por que dados sozinhos não bastam

> Mais dados ≠ melhor compreensão

Um sistema pode produzir enormes volumes de logs, metrics e dashboards e ainda assim ser extremamente difícil de debugar. O problema não é escassez de dados. O problema são **dados não correlacionados**.

Se os logs mostram uma coisa, as metrics mostram outra, e os traces vivem em outro lugar, os engenheiros precisam costurar tudo isso mentalmente. Essa abordagem não escala em sistemas distribuídos.

Observabilidade exige que a telemetry conte uma **única história conectada**, não três histórias separadas.

---

## Correlação e contexto

**Correlação** é a capacidade de ligar sinais de telemetry entre si de modo que descrevam a mesma execução ou evento. Isso é possível através do **contexto**.

Contexto é uma identidade compartilhada que viaja com uma requisição enquanto ela se move por um sistema. Inclui coisas como trace IDs, transaction IDs e metadados da requisição.

Um modelo mental útil é pensar no contexto como um passaporte que a requisição carrega.

Toda vez que a requisição entra em um serviço, esse serviço:
- lê o passaporte
- adiciona seu próprio carimbo (telemetry)
- passa o passaporte adiante

Por exemplo, uma única requisição pode passar por um Payment Service, depois um Config Service, depois um proxy, e finalmente um banco de dados. Cada componente emite sua própria telemetry. O contexto permite que toda essa telemetry seja vinculada de volta à mesma requisição.

Por causa desse contexto compartilhado, os engenheiros conseguem acompanhar uma execução real através das fronteiras de serviços e ver exatamente onde o tempo foi gasto e onde as coisas deram errado. Isso não se baseia em médias ou suposições, mas no que realmente aconteceu.

Essa capacidade de rastrear causa e efeito através de sistemas distribuídos é o que torna observabilidade eficaz.

---

## Onde o OpenTelemetry se encaixa nesse quadro

OpenTelemetry (OTel) é um projeto open-source hospedado pela [CNCF](https://www.cncf.io/) que resolve um problema: como gerar e conectar telemetry usando APIs padronizadas e neutras em relação a fornecedores

Em vez disso, ele padroniza as *entradas* dessas ferramentas.

Pense no OpenTelemetry como encanamento (plumbing).

Ele garante:
- que a telemetry seja produzida em um formato consistente
- que o contexto flua corretamente entre serviços
- que os sinais possam ser correlacionados depois

O que você constrói em cima desse encanamento (dashboards, alertas, analytics) é uma questão separada.

A utilidade do OpenTelemetry depende de ampla adoção e confiança. A CNCF fornece governança neutra, propriedade compartilhada, legitimidade e estabilidade de longo prazo.

Saber que o OpenTelemetry foi aceito na CNCF em 2019, avançou para incubation em 2021, e começou o processo de graduation em 2025 o transforma em um projeto estável e de longo prazo, e não em um experimento.

---

## O que o OpenTelemetry realmente padroniza

O OpenTelemetry define:
- APIs para gerar telemetry
- SDKs para implementar essas APIs
- protocolos para exportar dados
- convenções semânticas para nomear as coisas
- regras para propagar contexto

Um princípio de design fundamental é que **instrumentação e exportação são desacopladas**.

Você instrumenta seu código uma vez, usando APIs estáveis.  
Você decide para onde os dados vão depois.

Isso leva a uma regra simples:

>[!IMPORTANT]
> Instrumente uma vez. Exporte para qualquer lugar.

Isso torna a telemetry mais fácil de manter e reduz o lock-in de longo prazo.

---

## Separação de responsabilidades

O OpenTelemetry também introduz uma separação clara de responsabilidades.

Mantenedores de bibliotecas instrumentam bibliotecas usando as APIs do OpenTelemetry. Eles descrevem o que acontece dentro da biblioteca (por exemplo, 'requisição HTTP feita', 'query de banco de dados executada'), mas **não** escolhem para onde esses dados são enviados.

Os donos das aplicações decidem:
- qual SDK usar
- quais exporters habilitar
- para onde a telemetry é enviada

Isso mantém a instrumentação reutilizável e evita empurrar decisões de fornecedor para dependências compartilhadas.

---

## Como o OpenTelemetry muda o ecossistema de observabilidade

Antes do OpenTelemetry, os fornecedores de observabilidade geralmente controlavam tudo, desde agentes até dashboards.

Com o OpenTelemetry:
- a geração de telemetry é padronizada
- a propagação de contexto é compartilhada
- os fornecedores não controlam mais a instrumentação

Isso desloca a competição para:
- análise e correlação
- experiência do usuário
- performance e eficiência de custo
- ajudar humanos a entender sistemas mais rápido

Instrumentação se torna infraestrutura compartilhada.  
Compreensão se torna o diferencial.

Para desenvolvedores, isso significa menos medo de se comprometer com a ferramenta errada cedo demais. A instrumentação pode permanecer estável mesmo quando os backends mudam.

Para organizações, isso reduz o risco de longo prazo. Fica mais fácil misturar ferramentas open-source e comerciais, trocar de fornecedor ao longo do tempo, e proteger o investimento de engenharia.

---
>[!TIP]
>## Uma analogia: o OpenTelemetry como o SQL da observabilidade
>
>Pensar em observabilidade em termos de bancos de dados ajudou a clarear essa mudança para mim.
>
>**Antes do SQL:** Cada banco de dados tinha linguagens de query proprietárias. Trocar de banco de dados significava reescrever todas as queries.
>
>**Depois do SQL:** SQL é um padrão. Bancos de dados competem em performance, ferramental, confiabilidade e experiência do usuário.
>
>O OpenTelemetry está se tornando o padrão equivalente para observabilidade. A telemetry não deveria precisar ser reescrita para trocar de ferramenta. Só o destino deveria mudar.
>
>**Antes do OpenTelemetry:** Cada fornecedor tinha agentes proprietários. Trocar de ferramenta significava reinstrumentar seu código.
>
>**Depois do OpenTelemetry:** Fornecedores competem em análise, UX e insights — não em instrumentação. A telemetry não precisa ser reescrita para trocar de ferramenta. Só o destino precisa ser alterado.
>
>Telemetry se torna **infraestrutura portátil**, não lock-in de fornecedor.
>
---

## Equívocos comuns sobre observabilidade

❌ "Observabilidade = muitos dashboards"  
✅ Observabilidade = capacidade de fazer novas perguntas ao seu sistema

❌ "Mais logs = melhor debugging"  
✅ Sinais correlacionados = melhor debugging

❌ "OpenTelemetry substitui Prometheus/Jaeger/etc."  
✅ OpenTelemetry alimenta essas ferramentas com dados

---

## O que estou levando do Dia 2

Observabilidade é sobre entender comportamento, não coletar sinais. Correlação é a chave que transforma telemetry em explicações. Contexto é o que torna a correlação possível. E o OpenTelemetry existe para tornar tudo isso consistente e escalável.

Ainda há pontos nebulosos em alguns lugares, mas sinto que agora sei *qual problema o OpenTelemetry realmente resolve*.

Vamos para o dia 3.
