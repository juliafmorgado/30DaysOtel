# Troubleshooting

When things go wrong **right now**, start here instead of digging through the day-by-day guides.

Jump to your symptom:

- ["I ran `npm install` and got error XYZ"](#npm-install-errors)
- ["`npm start` / `node app.js` doesn't work"](#runtime-errors)
- ["I don't see my trace anywhere"](#i-dont-see-my-trace-anywhere)
- ["The Collector isn't receiving data"](#the-collector-isnt-receiving-data)
- [How to debug if nothing works](#how-to-debug-if-nothing-works)
- [Open issues with the same problem](#open-issues-with-the-same-problem)

---

## npm install errors

All Node.js examples live under [`examples/`](examples/) (`day9-tracing-api`, `day10-metrics-api`, `day11-logs-api`, `day12-context-propagation`). Each has its own `package.json` — make sure you're **inside that folder**, not the repo root, before running `npm install`.

```bash
cd examples/day9-tracing-api
npm install
```

### `EBADENGINE` / `Unsupported engine`

The OpenTelemetry SDK packages (`@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node`) require a reasonably recent Node.js. If you see engine warnings or install failures:

```bash
node -v   # should be Node 18+ (Node 20 LTS recommended)
```

Use [nvm](https://github.com/nvm-sh/nvm) to switch versions if needed:

```bash
nvm install 20
nvm use 20
```

### `ERESOLVE` / peer dependency conflicts

This usually means npm can't reconcile versions across `@opentelemetry/*` packages. First, delete any leftover install state and retry cleanly:

```bash
rm -rf node_modules package-lock.json
npm install
```

If it still fails, `npm install --legacy-peer-deps` is a reasonable workaround for these examples (they're teaching demos, not production packages), but treat it as a last resort.

### `npm ERR! code ENOENT` (no `package.json` found)

You're in the wrong directory. Each example is self-contained — `cd` into the specific `examples/dayN-*` folder first.

### Install works but takes forever / hangs

Usually a slow/blocked registry, not a broken project. Try:

```bash
npm install --verbose
```

and check for proxy or registry issues (`npm config get registry` should be `https://registry.npmjs.org/`).

---

## Runtime errors

### `Error: Cannot find module '@opentelemetry/...'`

`npm install` didn't finish successfully, or you ran the app from the wrong directory. Re-run `npm install` inside the example folder and confirm `node_modules/@opentelemetry` exists.

### `npm start` does nothing / exits immediately

Check the example's own README first — some examples (like `day9-tracing-api`) are started with:

```bash
node --require ./instrumentation.js app.js
```

not `npm start`. If a `package.json` has no `start` script defined, `npm start` will fail with `missing script: start`. Look at the `scripts` block in `package.json`, or just follow the exact command in the example's `README.md`.

### `EADDRINUSE: address already in use :::3000`

Another process (often a previous run of the same demo) is still bound to the port. Find and stop it:

```bash
lsof -i :3000
kill <PID>
```

### App starts but crashes with `ECONNREFUSED` on OTLP export

This means the app itself is fine — it's the **exporter** that can't reach anything at `http://localhost:4318`. That's expected if you haven't started a collector/backend yet. See [The Collector isn't receiving data](#the-collector-isnt-receiving-data) below — this is the same root cause as "I don't see my trace anywhere."

---

## I don't see my trace anywhere

Work through these in order — in practice, 90% of "no trace" reports are one of the first three.

1. **Is anything listening on the OTLP port?**
   The demos export to `http://localhost:4318/v1/traces` (see `instrumentation.js` in each example). If you haven't started Jaeger or a Collector yet, there's nothing listening and the export silently fails or errors.

   ```bash
   docker run -d --name jaeger \
     -p 16686:16686 \
     -p 4318:4318 \
     jaegertracing/all-in-one:latest
   ```

2. **Did you actually load the instrumentation file?**
   OpenTelemetry auto-instrumentation must be `require`d **before** your app code runs, using `--require`:

   ```bash
   node --require ./instrumentation.js app.js
   ```

   Running `node app.js` on its own skips instrumentation entirely — there is nothing to see because nothing was ever recorded.

3. **Did you actually generate a request?**
   No spans are created until you hit an instrumented route. `curl` the app after it starts:

   ```bash
   curl http://localhost:3000/hello/Alice
   ```

4. **Are you looking in the right UI, and did you refresh?**
   Jaeger's UI is at `http://localhost:16686`. You must select the **service name** (e.g. `greeting-service`) from the dropdown and click **Find Traces** — the page doesn't auto-load traces for you.

5. **Console errors from the exporter?**
   Look at the terminal running the Node app. Export errors (`ECONNREFUSED`, timeouts, TLS errors) print there, not in Jaeger. If you see `ECONNREFUSED 127.0.0.1:4318`, nothing is listening on that port — go back to step 1.

6. **Port mismatch.**
   If you started your own Collector instead of Jaeger directly, confirm it's actually listening on `4318` (HTTP) or `4317` (gRPC) and that the app's exporter URL matches the protocol (HTTP exporter → `4318`, gRPC exporter → `4317`).

---

## The Collector isn't receiving data

1. **Is the Collector actually running?**
   ```bash
   otelcol --config=your-config.yaml
   ```
   Check the startup logs — a malformed YAML config will fail at startup with a parsing error, not a runtime one.

2. **`Error: unknown exporter type "logging"` (or `unknown exporter factory`)**
   Several example configs in [`examples/day16-receivers`](examples/day16-receivers/), [`day17-processors`](examples/day17-processors/), and [`day18-exporters`](examples/day18-exporters/) use a `logging` exporter for debug output. In current Collector releases this exporter was **renamed to `debug`**. If your Collector version rejects `logging`, swap it in the config:

   ```yaml
   exporters:
     debug:            # was: logging
       verbosity: detailed
   ```
   and update the pipeline's `exporters:` list to reference `debug` instead of `logging`.

3. **Receiver endpoint doesn't match what your app is sending to.**
   The example configs expose:
   ```yaml
   receivers:
     otlp:
       protocols:
         grpc:
           endpoint: 0.0.0.0:4317
         http:
           endpoint: 0.0.0.0:4318
   ```
   Your app's exporter URL must point at the **same protocol and port**: `http://localhost:4318/v1/traces` for HTTP, `localhost:4317` for gRPC. Mixing them up (e.g. app sends gRPC to the HTTP port) fails silently or with a protocol error.

4. **Port already bound by another Collector/agent.**
   Only one process can bind `4317`/`4318` at a time. If you also have a Dash0 agent, another Collector, or a previous `otelcol` process still running, the new one will fail to start or the data will go to the *other* process instead.

   ```bash
   lsof -i :4317 -i :4318
   ```

5. **No pipeline wired for the signal you're sending.**
   Traces, metrics, and logs each need their own entry under `service.pipelines`. If you're sending metrics but the config only defines a `traces` pipeline, the data is accepted by the receiver and then dropped — no error, no output.

6. **Nothing prints even with a `debug`/`logging` exporter.**
   Confirm the exporter is actually listed in the pipeline's `exporters:` array, not just defined under `exporters:`. A config can define an exporter and simply forget to attach it to a pipeline — this is the single most common reason "the debug exporter isn't showing anything."

---

## How to debug if nothing works

Use this as a systematic checklist rather than guessing:

1. **Isolate the layer.** Is the problem in (a) your app failing to *emit* telemetry, or (b) the Collector/backend failing to *receive/display* it? Add the `debug` exporter (see above) to your Collector config — if data shows up there but not in Jaeger/your backend, the problem is downstream of the Collector, not in your app.
2. **Turn on verbose logging everywhere.**
   - Node app: run with `OTEL_LOG_LEVEL=debug node --require ./instrumentation.js app.js` — this makes the SDK print what it's trying to export and any errors.
   - Collector: use `debug`/`logging` exporter with `verbosity: detailed`.
3. **Check every port and process in one shot:**
   ```bash
   lsof -i :3000 -i :4317 -i :4318 -i :16686
   ```
4. **Confirm Docker containers are actually up**, not just started-and-crashed:
   ```bash
   docker ps
   docker logs jaeger
   ```
5. **Strip it down to the minimum.** Comment out processors/extra exporters in your Collector config and go back to the exact `basic-otlp.yaml` from [`examples/day16-receivers`](examples/day16-receivers/basic-otlp.yaml). If that works, reintroduce your changes one at a time until it breaks again — that's your culprit.
6. **Diff against the working example.** Every `examples/dayN-*` folder is a known-good baseline with its own README and exact run commands. If your own variation doesn't work, run the example unmodified first to rule out environment issues (Node version, Docker, ports) before debugging your changes.
7. **Read the actual error, not just the fact that it failed.** OTel SDK/Collector error messages are usually specific (`ECONNREFUSED`, `unknown exporter type`, `context deadline exceeded`) — they almost always point straight at one of the sections above.

If you've done all of the above and are still stuck, open an issue (see below) with:
- The exact command you ran and from which directory
- The full error output
- Your Node version (`node -v`) or Collector version (`otelcol --version`)
- The config file or `instrumentation.js`/`app.js` you're using, if modified from the example

---

## Open issues with the same problem

Before opening a new issue, search existing ones — someone may have already hit (and solved) it:

- [Search open issues in this repo](https://github.com/juliafmorgado/30DaysOtel/issues?q=is%3Aissue+is%3Aopen)
- [Open a new issue](https://github.com/juliafmorgado/30DaysOtel/issues/new)

For problems with the underlying tools rather than this project's examples:

- [OpenTelemetry JS SDK issues](https://github.com/open-telemetry/opentelemetry-js/issues)
- [OpenTelemetry Collector issues](https://github.com/open-telemetry/opentelemetry-collector/issues)
- [OpenTelemetry Collector Contrib issues](https://github.com/open-telemetry/opentelemetry-collector-contrib/issues) (covers most receivers/processors/exporters used in this project, e.g. Jaeger, Prometheus, Loki)
