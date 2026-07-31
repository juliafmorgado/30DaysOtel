# Troubleshooting

Quando algo dá errado **agora mesmo**, comece por aqui em vez de vasculhar os guias dia a dia.

Vá direto para o seu sintoma:

- ["Rodei `npm install` e recebi o erro XYZ"](#npm-install-errors)
- ["`npm start` / `node app.js` não funciona"](#runtime-errors)
- ["Não vejo meu trace em lugar nenhum"](#i-dont-see-my-trace-anywhere)
- ["O Collector não está recebendo dados"](#the-collector-isnt-receiving-data)
- [Como debugar quando nada funciona](#how-to-debug-if-nothing-works)
- [Issues abertas com o mesmo problema](#open-issues-with-the-same-problem)

---

## npm install errors

Todos os exemplos em Node.js estão em [`exemplos/`](exemplos/) (`day9-tracing-api`, `day10-metrics-api`, `day11-logs-api`, `day12-context-propagation`). Cada um tem seu próprio `package.json` — garanta que você está **dentro dessa pasta**, e não na raiz do repositório, antes de rodar `npm install`.

```bash
cd exemplos/day9-tracing-api
npm install
```

### `EBADENGINE` / `Unsupported engine`

Os pacotes do OpenTelemetry SDK (`@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node`) exigem uma versão razoavelmente recente do Node.js. Se você ver avisos de engine ou falhas de instalação:

```bash
node -v   # deve ser Node 18+ (Node 20 LTS recomendado)
```

Use o [nvm](https://github.com/nvm-sh/nvm) para trocar de versão se necessário:

```bash
nvm install 20
nvm use 20
```

### `ERESOLVE` / conflitos de peer dependency

Isso geralmente significa que o npm não conseguiu reconciliar versões entre os pacotes `@opentelemetry/*`. Primeiro, apague qualquer estado de instalação restante e tente de novo do zero:

```bash
rm -rf node_modules package-lock.json
npm install
```

Se ainda assim falhar, `npm install --legacy-peer-deps` é uma solução razoável para esses exemplos (eles são demos didáticas, não pacotes de produção), mas trate isso como último recurso.

### `npm ERR! code ENOENT` (nenhum `package.json` encontrado)

Você está no diretório errado. Cada exemplo é autocontido — entre (`cd`) na pasta específica `exemplos/dayN-*` primeiro.

### A instalação funciona mas demora muito / trava

Normalmente é um registry lento ou bloqueado, não um projeto quebrado. Tente:

```bash
npm install --verbose
```

e verifique se há problemas de proxy ou registry (`npm config get registry` deveria retornar `https://registry.npmjs.org/`).

---

## Runtime errors

### `Error: Cannot find module '@opentelemetry/...'`

O `npm install` não terminou com sucesso, ou você rodou o app a partir do diretório errado. Rode `npm install` novamente dentro da pasta do exemplo e confirme que `node_modules/@opentelemetry` existe.

### `npm start` não faz nada / encerra imediatamente

Primeiro, confira o README do próprio exemplo — alguns exemplos (como o `day9-tracing-api`) são iniciados com:

```bash
node --require ./instrumentation.js app.js
```

e não com `npm start`. Se um `package.json` não tiver um script `start` definido, `npm start` falhará com `missing script: start`. Olhe o bloco `scripts` no `package.json`, ou simplesmente siga o comando exato no `README.md` do exemplo.

### `EADDRINUSE: address already in use :::3000`

Outro processo (muitas vezes uma execução anterior da mesma demo) ainda está vinculado à porta. Encontre e pare-o:

```bash
lsof -i :3000
kill <PID>
```

### O app inicia mas trava com `ECONNREFUSED` na exportação OTLP

Isso significa que o app em si está bem — é o **exporter** que não consegue alcançar nada em `http://localhost:4318`. Isso é esperado se você ainda não iniciou um collector/backend. Veja [O Collector não está recebendo dados](#the-collector-isnt-receiving-data) abaixo — essa é a mesma causa raiz de "não vejo meu trace em lugar nenhum".

---

## Não vejo meu trace em lugar nenhum

Passe por estes passos em ordem — na prática, 90% dos relatos de "sem trace" se enquadram em um dos três primeiros.

1. **Há algo escutando na porta OTLP?**
   As demos exportam para `http://localhost:4318/v1/traces` (veja `instrumentation.js` em cada exemplo). Se você ainda não iniciou o Jaeger ou um Collector, não há nada escutando e a exportação falha silenciosamente ou gera erro.

   ```bash
   docker run -d --name jaeger \
     -p 16686:16686 \
     -p 4318:4318 \
     jaegertracing/all-in-one:latest
   ```

2. **Você realmente carregou o arquivo de instrumentação?**
   A auto-instrumentação do OpenTelemetry precisa ser carregada via `require` **antes** do código do seu app rodar, usando `--require`:

   ```bash
   node --require ./instrumentation.js app.js
   ```

   Rodar `node app.js` sozinho pula a instrumentação completamente — não há nada para ver porque nada nunca foi registrado.

3. **Você realmente gerou uma requisição?**
   Nenhum span é criado até você acessar uma rota instrumentada. Faça um `curl` no app depois que ele iniciar:

   ```bash
   curl http://localhost:3000/hello/Alice
   ```

4. **Você está olhando na UI certa, e atualizou a página?**
   A UI do Jaeger fica em `http://localhost:16686`. Você precisa selecionar o **nome do serviço** (por exemplo, `greeting-service`) no dropdown e clicar em **Find Traces** — a página não carrega traces automaticamente para você.

5. **Erros de console vindos do exporter?**
   Olhe o terminal rodando o app Node. Erros de exportação (`ECONNREFUSED`, timeouts, erros de TLS) aparecem ali, não no Jaeger. Se você ver `ECONNREFUSED 127.0.0.1:4318`, nada está escutando nessa porta — volte ao passo 1.

6. **Porta incompatível.**
   Se você iniciou seu próprio Collector em vez do Jaeger diretamente, confirme que ele está realmente escutando na `4318` (HTTP) ou `4317` (gRPC) e que a URL do exporter do app corresponde ao protocolo (exporter HTTP → `4318`, exporter gRPC → `4317`).

---

## O Collector não está recebendo dados

1. **O Collector está realmente rodando?**
   ```bash
   otelcol --config=your-config.yaml
   ```
   Verifique os logs de inicialização — um config YAML malformado vai falhar na inicialização com um erro de parsing, não em tempo de execução.

2. **`Error: unknown exporter type "logging"` (ou `unknown exporter factory`)**
   Vários configs de exemplo em [`exemplos/day16-receivers`](exemplos/day16-receivers/), [`day17-processors`](exemplos/day17-processors/) e [`day18-exporters`](exemplos/day18-exporters/) usam um exporter `logging` para saída de debug. Nas versões atuais do Collector, esse exporter foi **renomeado para `debug`**. Se sua versão do Collector rejeitar `logging`, troque no config:

   ```yaml
   exporters:
     debug:            # era: logging
       verbosity: detailed
   ```
   e atualize a lista `exporters:` do pipeline para referenciar `debug` em vez de `logging`.

3. **O endpoint do receiver não corresponde ao que seu app está enviando.**
   Os configs de exemplo expõem:
   ```yaml
   receivers:
     otlp:
       protocols:
         grpc:
           endpoint: 0.0.0.0:4317
         http:
           endpoint: 0.0.0.0:4318
   ```
   A URL do exporter do seu app precisa apontar para o **mesmo protocolo e porta**: `http://localhost:4318/v1/traces` para HTTP, `localhost:4317` para gRPC. Misturar os dois (por exemplo, o app envia gRPC para a porta HTTP) falha silenciosamente ou com um erro de protocolo.

4. **Porta já ocupada por outro Collector/agent.**
   Apenas um processo pode se vincular à `4317`/`4318` por vez. Se você também tem um agent do Dash0, outro Collector, ou um processo `otelcol` anterior ainda rodando, o novo vai falhar ao iniciar ou os dados vão parar no *outro* processo.

   ```bash
   lsof -i :4317 -i :4318
   ```

5. **Nenhum pipeline configurado para o sinal que você está enviando.**
   Traces, metrics e logs precisam cada um da sua própria entrada em `service.pipelines`. Se você está enviando metrics mas o config só define um pipeline de `traces`, os dados são aceitos pelo receiver e depois descartados — sem erro, sem saída.

6. **Nada aparece mesmo com um exporter `debug`/`logging`.**
   Confirme que o exporter está de fato listado no array `exporters:` do pipeline, e não apenas definido em `exporters:`. Um config pode definir um exporter e simplesmente esquecer de anexá-lo a um pipeline — esse é o motivo mais comum de "o exporter debug não está mostrando nada."

---

## Como debugar quando nada funciona

Use isto como um checklist sistemático em vez de ficar chutando:

1. **Isole a camada.** O problema está em (a) seu app falhando ao *emitir* telemetry, ou (b) o Collector/backend falhando ao *receber/exibir* isso? Adicione o exporter `debug` (veja acima) ao seu config do Collector — se os dados aparecerem ali mas não no Jaeger/seu backend, o problema está depois do Collector, não no seu app.
2. **Ative logging verboso em tudo.**
   - App Node: rode com `OTEL_LOG_LEVEL=debug node --require ./instrumentation.js app.js` — isso faz o SDK imprimir o que está tentando exportar e quaisquer erros.
   - Collector: use o exporter `debug`/`logging` com `verbosity: detailed`.
3. **Verifique todas as portas e processos de uma vez:**
   ```bash
   lsof -i :3000 -i :4317 -i :4318 -i :16686
   ```
4. **Confirme que os containers Docker estão realmente ativos**, não apenas iniciados-e-travados:
   ```bash
   docker ps
   docker logs jaeger
   ```
5. **Reduza ao mínimo.** Comente processors/exporters extras no seu config do Collector e volte para o exato `basic-otlp.yaml` de [`exemplos/day16-receivers`](exemplos/day16-receivers/basic-otlp.yaml). Se isso funcionar, reintroduza suas mudanças uma de cada vez até quebrar de novo — esse é o culpado.
6. **Compare com o exemplo funcional.** Cada pasta `exemplos/dayN-*` é uma baseline conhecida-boa com seu próprio README e comandos de execução exatos. Se sua própria variação não funcionar, rode o exemplo sem modificações primeiro para descartar problemas de ambiente (versão do Node, Docker, portas) antes de debugar suas mudanças.
7. **Leia o erro de verdade, não só o fato de que falhou.** As mensagens de erro do SDK/Collector do OTel geralmente são específicas (`ECONNREFUSED`, `unknown exporter type`, `context deadline exceeded`) — elas quase sempre apontam direto para uma das seções acima.

Se você já fez tudo isso e ainda está travado, abra uma issue (veja abaixo) com:
- O comando exato que você rodou e de qual diretório
- A saída completa do erro
- Sua versão do Node (`node -v`) ou versão do Collector (`otelcol --version`)
- O arquivo de config ou `instrumentation.js`/`app.js` que você está usando, se modificado em relação ao exemplo

---

## Issues abertas com o mesmo problema

Antes de abrir uma nova issue, pesquise as existentes — alguém pode já ter passado por isso (e resolvido):

- [Pesquisar issues abertas neste repositório](https://github.com/juliafmorgado/30DaysOtel/issues?q=is%3Aissue+is%3Aopen)
- [Abrir uma nova issue](https://github.com/juliafmorgado/30DaysOtel/issues/new)

Para problemas com as ferramentas subjacentes em vez dos exemplos deste projeto:

- [Issues do OpenTelemetry JS SDK](https://github.com/open-telemetry/opentelemetry-js/issues)
- [Issues do OpenTelemetry Collector](https://github.com/open-telemetry/opentelemetry-collector/issues)
- [Issues do OpenTelemetry Collector Contrib](https://github.com/open-telemetry/opentelemetry-collector-contrib/issues) (cobre a maioria dos receivers/processors/exporters usados neste projeto, por exemplo Jaeger, Prometheus, Loki)
