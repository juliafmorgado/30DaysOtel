# 30 Dias de OpenTelemetry

Bem-vindos!

> **Nota:** Esta tradução para português foi feita com auxílio de IA. Estou revisando o conteúdo aos poucos para corrigir eventuais erros ou termos estranhos. Se encontrar algo esquisito, tenha paciência comigo ou abra um PR. 🙂

> **O que é OpenTelemetry?**
> 
> É o framework padrão da indústria para coletar e exportar dados de observabilidade (traces, metrics, logs) de forma neutra em relação a vendors/backends. Pense em OTel como a linguagem unificada que permite entender o que está acontecendo dentro dos seus sistemas distribuídos.

Este é um **projeto de aprendizado público** criado para ajudar outras pessoas a acompanhar e desenvolver habilidades de observabilidade prontas para produção, passo a passo. Seja você um iniciante completo ou alguém buscando certificação, você vai encontrar aqui conteúdo estruturado, exemplos práticos e uma preparação completa para o exame.

> Chegou agora? Confira **[COMECE-AQUI.md](COMECE-AQUI.md)** para encontrar o melhor ponto de entrada de acordo com o seu jeito de aprender.
>
> Algo quebrado? Confira **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** para erros comuns de instalação/execução e como debugar traces ausentes ou problemas no Collector.

---

## Estrutura Semanal

| Semana   | Tema | Foco | O Que Vamos Construir |
|--------|-------|-------|-------------------|
| **1** | Fundamentos de Observabilidade | Entendendo traces, metrics, logs; convenções semânticas; instrumentação automática vs manual | Modelos mentais + leitura de traces reais |
| **2** | APIs & SDK do OpenTelemetry | Prática com a Tracing API, Metrics API, Logs API, context propagation, pipelines do SDK | Apps Node.js instrumentados |
| **3** | OpenTelemetry Collector | Receivers, processors, exporters, transformações (OTTL), modelos de deployment, escalabilidade | Pipeline completo de collector com transformações OTTL |
| **4** | Prontidão para Produção & Certificação | Troubleshooting, debugging, segurança, Kubernetes Operator, boas práticas para produção, preparação para o exame OTCA | Sistema observável completo + prontidão para certificação |

---

## Objetivos Deste Projeto

- Entender os **fundamentos de observabilidade** (por que isso importa, quais problemas resolve)
- Ficar fluente em **tracing, metrics e logs** (os três pilares da observabilidade)
- Dominar a **API & SDK do OpenTelemetry** (criando telemetry no código)
- Construir e configurar o **OpenTelemetry Collector** (processando e roteando telemetry)
- Aprender **padrões de produção**, incluindo:
  - Debugging de distributed traces e telemetry ausente
  - Troubleshooting de pipelines do collector
  - Boas práticas de produção (segurança, performance, otimização de custos)
  - Deployment em Kubernetes com o OpenTelemetry Operator
- **Passar no exame OpenTelemetry Certified Associate (OTCA)** com uma preparação completa incluindo:
  - Cobertura completa dos 4 domínios da certificação
  - Perguntas práticas e um mock exam
  - Guia de referência rápida e estratégias para o exame

---

## Estrutura Diária

<details>
<summary><strong>Semana 1: Fundamentos de Observabilidade</strong></summary>

| Dia | Tópico | O Que Vamos Aprender |
|-----|-------|-------------------|
| 1 | Por Que Observabilidade Importa | A mudança de monólitos para microservices e por que o monitoramento tradicional não é mais suficiente |
| 2 | O Que é OpenTelemetry? | Telemetry neutra em relação a fornecedores, a separação API/SDK e por que ela venceu |
| 3 | Traces, Metrics, Logs | Como as requisições fluem através de sistemas distribuídos; três lentes sobre o mesmo evento |
| 4 | Spans | Anatomia de um span, relações pai-filho, leitura de waterfall charts |
| 5 | Convenções Semânticas | Por que `http.method` e não `request_method`; a linguagem compartilhada da observabilidade |
| 6 | Instrumentação | Instrumentação automática vs manual; quando usar cada uma; como os spans são criados |
| 7 | Revisão da Semana 1 | Consolidação + peças faltantes (prévia de sampling, detalhes de context propagation) |

[Teste de Conhecimento da Semana 1](semana1/semana1-teste-conhecimento.md)

</details>

<details>
<summary><strong>Semana 2: APIs & SDK do OpenTelemetry</strong></summary>

| Dia | Tópico | O Que Vamos Aprender |
|-----|-------|-------------------|
| 8 | API vs SDK | A arquitetura que torna o OpenTelemetry portátil; separação de responsabilidades |
| 9 | Tracing API | Criando spans aninhados, span events, adicionando attributes; exemplos práticos |
| 10 | Metrics API | Counters, gauges, histograms; medindo o que importa |
| 11 | Logs API | Structured logging + correlação com traces; logs como parte da história da telemetry |
| 12 | Context Propagation | Como o trace context flui pela sua aplicação e entre serviços |
| 13 | Dia de Descanso | Descanse e recarregue as energias |
| 14 | Revisão da Semana 2 | Recapitulação das APIs, fundamentos do SDK e o que conquistamos |

[Teste de Conhecimento da Semana 2](semana2/semana2-teste-conhecimento.md)

</details>

<details>
<summary><strong>Semana 3: Aprofundamento no OpenTelemetry Collector</strong></summary>

| Dia | Tópico | O Que Vamos Aprender |
|-----|-------|-------------------|
| 15 | Arquitetura do Collector | Por que o Collector existe; o fluxo do pipeline receivers → processors → exporters |
| 16 | Receivers | OTLP, Filelog, Prometheus; como a telemetry entra no Collector |
| 17 | Processors | Batch, attributes, filter, transform; padrões essenciais de processamento de dados |
| 18 | Exporters | Estratégias multi-backend; roteamento para Jaeger, Prometheus, Loki |
| 19 | Transformações (OTTL) | OpenTelemetry Transformation Language; manipulação de dados amigável para o negócio |
| 20 | Deployment & Escalabilidade | Padrões Agent vs Gateway; conceitos básicos de escalabilidade |
| 21 | Recapitulação da Semana 3 | Insights e aprendizados; mudança de mentalidade de aprender para arquitetar |

[Teste de Conhecimento da Semana 3](semana3/semana3-teste-conhecimento.md)

</details>

<details>
<summary><strong>Semana 4: Padrões de Produção & Preparação para Certificação</strong></summary>

| Dia | Tópico | O Que Vamos Aprender |
|-----|-------|-------------------|
| 22 | Debugando o Collector | Abordagens sistemáticas de debugging, logging exporters, health checks, análise de metrics |
| 23 | Onde Diabos Estão Meus Dados? | Troubleshooting de telemetry ausente por todo o pipeline (aplicação → SDK → collector → backend) |
| 24 | Debugando Distributed Traces | Encontrando spans perdidos, context propagation quebrada, workflows sistemáticos de troubleshooting |
| 25 | Problemas de Produção em Escala | Gerenciamento de backpressure, spans descartados, tratamento de erros, gerenciamento de recursos |
| 26 | Boas Práticas de Produção | Segurança (TLS, proteção de PII), otimização de performance, estratégias de monitoramento |
| 27 | Visão Geral do OpenTelemetry Operator | Observabilidade nativa para Kubernetes, injetor de auto-instrumentação, CRDs, modos de deployment |
| 28 | Projeto Final | Construa um stack completo de observabilidade com integração ao Dash0 |
| 29 | Recapitulação da Semana 4 | Revisão sistemática da trilogia de debugging, padrões de produção e conceitos-chave dominados |
| 30 | O Que Vem a Seguir | Tópicos avançados de OpenTelemetry e como continuar sua jornada de observabilidade |

[Teste de Conhecimento da Semana 4](semana4/semana4-teste-conhecimento.md)

**Materiais para Certificação OTCA:**
- [Guia de Preparação para o Exame OTCA](semana4/otca-preparacao-prova.md) - Guia de estudo completo cobrindo os 4 domínios
- [Mock Exam OTCA](semana4/otca-simulado.md) - 20 perguntas práticas com respostas detalhadas
- [Referência Rápida OTCA](semana4/otca-referencia-rapida.md) - Conceitos e comandos essenciais para o dia do exame


</details>

---

## Pré-requisitos

**Para acompanhar, você vai precisar de:**
- Conhecimento básico de JavaScript/Node.js (os exemplos usam Express.js, mas você pode usar qualquer linguagem com suporte a OpenTelemetry)
- Docker instalado (para rodar o Jaeger e outros backends)
- Familiaridade com terminal/linha de comando
- Curiosidade sobre observabilidade!

**Observação:** Embora nossos exemplos usem Node.js, o OpenTelemetry oferece suporte a diversas linguagens, incluindo Python, Go, Java, .NET, Ruby, PHP e mais. Os conceitos são os mesmos em todas as linguagens.

**Opcional, mas útil:**
- Experiência com sistemas distribuídos
- Entendimento básico de HTTP e APIs
- Familiaridade com conceitos de monitoramento

---
## Contribuindo

Este é um projeto de aprendizado, o que significa que **eu vou cometer erros**. Se você notar:

- ❌ Erros técnicos ou informações desatualizadas
- 💡 Formas melhores de explicar conceitos
- 🐛 Exemplos de código quebrados
- 📚 Materiais que eu deveria conferir
- ❓ Perguntas que eu deveria explorar

**Por favor:**
1. Abra uma Issue (para discussão)
2. Envie um PR (para correções)
3. Deixe um comentário nos posts das redes sociais
4. Me chame no direct

Todas as contribuições são bem-vindas, desde correções de digitação até correções importantes.

---

## Materiais de Aprendizado Que Estou Usando

**Documentação Oficial:**
- [OpenTelemetry Docs](https://opentelemetry.io/docs/)
- [OTCA Exam Guide](https://training.linuxfoundation.org/certification/opentelemetry-certified-associate-otca/)
- [Dash0 docs](https://www.dash0.com/documentation/dash0)

**Livros:**
- [Practical OpenTelemetry: Adopting Open Observability Standards Across Your Organization](https://www.amazon.com/Practical-OpenTelemetry-Observability-Standards-Organization/dp/1484290747) por [Daniel Gomez Blanco](https://www.linkedin.com/in/danielgblanco86/)
- [Learning OpenTelemetry](https://www.oreilly.com/library/view/learning-opentelemetry/9781098147174/) por [Ted Young](https://www.linkedin.com/in/ted-young/) e [Austin Parker](https://www.linkedin.com/in/austinlparker/)

**Comunidade:**
- [OpenTelemetry Slack](https://cloud-native.slack.com/) (canal #opentelemetry)
- [Reuniões do CNCF OpenTelemetry SIG](https://github.com/open-telemetry/community)

Vou adicionar mais conforme eu for descobrindo.

---

# Conecte-se Comigo

- [**LinkedIn**](https://www.linkedin.com/in/juliafmorgado/)
- [**X/Twitter**](https://x.com/juliafmorgado)
- [**YouTube**](https://www.youtube.com/juliafmorgado) 
- [**Instagram**](https://www.instagram.com/juliafmorgado/)
- [**Twitch**](https://www.twitch.tv/juliafmorgado)
- [**Blog**](https://www.juliafmorgado.com/)

**Também está aprendendo OpenTelemetry?** Fique à vontade para entrar em contato! Eu adoraria me conectar com outros aprendizes e trocar ideias.

---

## Agradecimentos

Inspirado por:
- A comunidade OpenTelemetry
- [OpenTelemetry Official Docs](https://opentelemetry.io/docs/)
- [90DaysofDevOps](https://github.com/MichaelCade/90DaysOfDevOps) do meu amigo [Michael Cade](https://www.linkedin.com/in/michaelcade1)
- Todo mundo que compartilha sua jornada com OpenTelemetry online

---

**⭐ Dê uma estrela neste repositório se você achar útil!**

Vamos tornar a observabilidade acessível para todo mundo. Bons estudos!

---

# Licença

Este projeto é open source sob a Licença MIT. 
