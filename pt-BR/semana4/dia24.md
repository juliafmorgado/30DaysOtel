# Dia 24 – Debugando Traces Distribuídos: Encontrando Spans Perdidos

Ontem aprendemos a fazer troubleshooting de dados de telemetry ausentes no pipeline.

Hoje vamos um passo além e entender como **debugar traces distribuídos** propriamente ditos.

Mas lembre-se: sempre debugue o Collector primeiro. Depois debugue o context entre os serviços.
---

## O Desafio do Distributed Tracing

Em um sistema distribuído, a requisição de um usuário não fica restrita a um único serviço. Pense neste fluxo de checkout de e-commerce:
```
Frontend → API Gateway → User Service → Payment Service → Inventory Service
```
Uma requisição deveria criar um trace só, com spans de cada serviço.

Mas, na prática, o que você costuma ver é:
- **Spans ausentes** - alguns serviços não aparecem nos traces
- **Context quebrado** - os spans existem, mas não estão conectados
- **Spans órfãos** - spans sem relação de parentesco com nenhum outro
- **Traces incompletos** - traces que terminam abruptamente

> [!IMPORTANT]
> NÃO CONFUNDA A REQUISIÇÃO FALHANDO COM O TRACE FALHANDO!
>
> Leia a próxima seção que você vai entender melhor

## A Confusão Mais Comum: "A requisição quebrou ou o tracing quebrou?"

Quando as pessoas estão aprendendo distributed tracing, é comum confundir duas falhas bem diferentes: a requisição e o trace. Elas parecem a mesma coisa porque as duas aparecem como "spans ausentes". Mas a requisição é o trabalho em si, e o trace é o metadado que descreve esse trabalho (ele viaja junto com a requisição).

### Caso 1: A Requisição Quebra
Quando um serviço nunca recebe a requisição, ou trava antes de fazer qualquer trabalho, você não vê nenhum span daquele serviço e/ou o trace termina antes da hora.

Isso NÃO significa que é um problema de tracing, geralmente é um erro de **rede, timeout ou da aplicação**.

Exemplo: a API chama o Payment -> o Payment trava -> não existe span do Payment porque nenhum trabalho aconteceu

👉 Nada para colocar no trace, porque nada rodou

### Caso 2: A Requisição Funciona, mas o Context Quebra
Aqui a requisição chega no serviço, o serviço roda normalmente, um span é criado, MAS o trace context não é passado nem extraído. Então o serviço aparece, só que em um **trace diferente** ou como um span órfão.

Isso significa que a aplicação e a requisição estão ok, mas o **tracing está quebrado**.

Exemplo: a API chama o Payment -> o Payment roda com sucesso -> mas esquece de repassar o traceparent -> o Payment cria um trace novo do zero

👉 O trabalho aconteceu, mas a história se perdeu

> Se o serviço rodou, mas o trace está desconectado, o context quebrou.
>
> Se o serviço nunca rodou, a requisição quebrou.
>
> Seu trabalho é descobrir se o trabalho parou… ou se a história parou.

## Por Que Isso Importa na Prática
Porque as correções são completamente diferentes:

| Problema | Correção |
|---------|-----|
| Requisição quebrou | Corrigir rede, retries, timeouts |
| Context quebrou | Corrigir propagation, headers, instrumentação |
| Spans ausentes | Verificar se o serviço chegou a rodar |
| Spans órfãos | Verificar o trace context |

---

## A Única Regra do Distributed Tracing

Como vimos no [dia 12](../semana2/dia12.md) sobre context propagation, **distributed tracing só funciona se o context for passado entre os serviços**.

O trace context (trace ID + informação do parent) é passado através dos request headers.
Se esses headers não atravessarem a fronteira entre os serviços, o trace quebra.
---

## O Que "Quebrar" Realmente Significa

Quando o context não flui corretamente, você vai ver uma dessas três coisas:

### 1. Spans ausentes (Serviço Não Aparece)
O serviço está rodando e processando requisições normalmente, mas nunca aparece no trace, e os outros serviços do fluxo continuam funcionando bem.

**Perguntas-chave para fazer:**
- O serviço está instrumentado com OpenTelemetry?
- Ele está enviando telemetry para o endpoint certo do Collector?
- O serviço consegue alcançar o Collector?

Isso geralmente significa que o serviço não está instrumentado ou não está enviando dados para lugar nenhum (porque o endpoint do Collector está errado, há problemas de conectividade de rede ou um mismatch no nome do serviço).


### 2. Context Propagation Quebrado
Todos os serviços criam spans, mas cada um começa um trace novo com trace IDs diferentes. Não existe relação de parent-child entre eles.

Isso significa que os serviços estão instrumentados corretamente, mas o trace context não está fluindo entre eles. Cada serviço começa um trace novo em vez de continuar o que já existia.

**Perguntas-chave para fazer:**
- Os HTTP headers estão sendo passados entre os serviços?
- O SDK está configurado para extrair o context das requisições recebidas?
- O SDK está configurado para injetar o context nas requisições enviadas?
- Os propagators corretos estão configurados (W3C Trace Context)?

Isso geralmente significa que os headers de context não foram extraídos ou não foram repassados para o próximo serviço.

### 3. Traces incompletos
O trace começa bem, alguns spans aparecem, mas de repente ele para (faltam os spans downstream).
 
Isso provavelmente é um **problema de requisição**, não um problema de tracing. O serviço downstream nunca recebeu a requisição ou travou antes de criar qualquer span.

**Perguntas-chave para fazer:**
- O serviço que está faltando realmente está rodando e saudável?
- Ele está recebendo requisições HTTP dos serviços upstream?
- Existe algum erro nos logs do serviço?
- Os serviços conseguem se comunicar entre si pela rede?
- O sampling está configurado baixo demais (descartando spans sem querer)?

**Causas comuns:**
- Serviço travou ou não está rodando
- Problemas de conectividade de rede entre os serviços
- Problemas de roteamento no load balancer ou service mesh
- Configuração de sampling agressiva demais
- Timeouts de serviço ou circuit breakers

---
## Onde o Tracing Mais Quebra

Quase todos os problemas de distributed tracing acontecem nas fronteiras entre serviços:
- Chamadas HTTP entre serviços
- Message queues
- Jobs assíncronos
- Background workers

Se o context não é repassado ali, o tracing para.

---
## Um Checklist Simples de Debugging

Quando um trace parece estranho, verifique nesta ordem:
1. Todo serviço está criando spans? Se não, falta instrumentação.
2. Os spans compartilham o mesmo trace ID? Se não, o context não está propagando.
3. O trace quebra em um hop específico entre serviços? É ali que os headers estão se perdendo.

Isso já é suficiente para encontrar a maioria dos problemas.

---
## Por Que Isso Parece Difícil no Começo
O tracing parece mágica quando funciona e uma confusão quando não funciona.

Quando você entende que os headers carregam o trace, tudo fica mais fácil de entender.

---

## Amanhã: Lidando com Problemas em Produção

Hoje aprendemos a debugar traces distribuídos de forma sistemática. Amanhã vamos encarar desafios mais amplos de produção, como lidar com backpressure, spans descartados e gerenciar erros em escala.

**Agora você consegue debugar as conexões invisíveis entre os seus serviços. A seguir, vamos garantir que essas conexões continuem confiáveis sob pressão.**

Nos vemos no Dia 25!