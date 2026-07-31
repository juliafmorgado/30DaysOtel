# Comece Aqui

Bem-vindo ao 30 Days of OpenTelemetry! Se você não sabe por onde começar escolha uma das opções abaixo dependendo do que combina com o seu jeito de aprender.

---

## 1. Quero aprender lendo

Comece pelos fundamentos, sem precisar de código ainda.

**[Semana 1, Dia 1: Por Que Observabilidade Importa](semana1/dia1.md)**

Este é o início dos 30 dias: conceitos de observabilidade, os três pilares (traces, metrics, logs), convenções semânticas e noções básicas de instrumentação, antes mesmo de você tocar em qualquer código. Trabalhe a Semana 1 dia a dia e depois continue na Semana 2 (APIs & SDK) e a Semana 3 (Collector).

---

## 2. Quero aprender rodando código

Prefere colocar a mão na massa primeiro? Rode um exemplo de código imediatamente.

```bash
cd exemplos/day9-tracing-api
npm install
npm start
```

Este exemplo sobe a demo de Tracing API do Dia 9 (uma pequena aplicação Express instrumentada com OpenTelemetry) para você ver spans, attributes e context propagation em ação. Depois que estiver rodando, volte para [Semana 2, Dia 9](semana2/dia09.md) para entender o que o código está realmente fazendo, e então explore os outros exemplos em [`exemplos/`](exemplos/) (metrics, logs, context propagation, receivers/processors/exporters do collector, OTTL, padrões de deployment).

---

## 3. Quero me certificar

Está mirando no exame **OpenTelemetry Certified Associate (OTCA)**? Vá direto para a semana focada na certificação.

**[Semana 4: Prontidão para Produção & Certificação](semana4/)**

A Semana 4 cobre troubleshooting, segurança, deployment em Kubernetes e boas práticas para produção, além de materiais dedicados ao OTCA:

- [Guia de Preparação para o Exame OTCA](semana4/otca-preparacao-prova.md) — guia de estudo completo cobrindo os 4 domínios do exame
- [Simulado OTCA](semana4/otca-simulado.md) — 20 questões práticas com respostas detalhadas
- [Referência Rápida OTCA](semana4/otca-referencia-rapida.md) — conceitos e comandos essenciais para o dia da prova

Se você é novo em OpenTelemetry, ainda vale a pena passar pelas Semanas 1–3 primeiro, já que o exame cobre os fundamentos, a API/SDK e o Collector, não apenas os tópicos da Semana 4.

---

Não tem certeza de qual caminho combina com você? Confira o [README completo](README.md) para ver a estrutura semanal completa e os pré-requisitos.
