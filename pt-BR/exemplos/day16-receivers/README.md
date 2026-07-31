# Dia 16 - Exemplos de Receivers

Este diretório contém configurações de exemplo para diferentes receivers do OpenTelemetry Collector.

## Arquivos

- `basic-otlp.yaml` - Receiver OTLP básico para SDKs do OpenTelemetry
- `prometheus-scraping.yaml` - Receiver do Prometheus para fazer scraping de metrics
- `filelog-parsing.yaml` - Receiver filelog para fazer parsing de arquivos de log
- `multi-source.yaml` - Múltiplos receivers em uma única configuração

## Rodando os Exemplos

### Pré-requisitos

1. **Instale o OpenTelemetry Collector:**
   ```bash
   # Baixe a versão mais recente
   curl -L -o otelcol https://github.com/open-telemetry/opentelemetry-collector-releases/releases/latest/download/otelcol_linux_amd64
   chmod +x otelcol
   ```

2. **Crie arquivos de log de teste (para os exemplos de filelog):**
   ```bash
   mkdir -p /var/log/app
   echo "2026-01-16 10:30:45 INFO User login successful" >> /var/log/app/app.log
   echo "2026-01-16 10:31:12 ERROR Database connection failed" >> /var/log/app/app.log
   echo "2026-01-16 10:31:45 WARN High memory usage detected" >> /var/log/app/app.log
   ```

### Rodando Cada Exemplo

**1. Receiver OTLP Básico:**
```bash
./otelcol --config=basic-otlp.yaml
```
Depois envie dados de teste:
```bash
# Teste com curl (se você tiver uma aplicação enviando dados OTLP)
curl -X POST http://localhost:4318/v1/traces \
  -H "Content-Type: application/json" \
  -d '{"resourceSpans":[]}'
```

**2. Scraping do Prometheus:**
```bash
# Primeiro, suba um servidor de metrics simples (opcional)
python3 -m http.server 8080 &

# Rode o collector
./otelcol --config=prometheus-scraping.yaml
```

**3. Parsing de Filelog:**
```bash
# Garanta que os arquivos de log existam e estejam legíveis
sudo chmod 644 /var/log/app/*.log

# Rode o collector
./otelcol --config=filelog-parsing.yaml

# Adicione mais entradas de log para vê-las sendo processadas
echo "2026-01-16 10:32:00 INFO New user registered" >> /var/log/app/app.log
```

**4. Configuração Multi-Source:**
```bash
./otelcol --config=multi-source.yaml
```

## O Que Você Vai Ver

Ao rodar esses exemplos, você vai ver uma saída de log mostrando:
- Mensagens de inicialização dos receivers
- Dados de telemetry chegando
- Dados processados e exportados (via logging exporter)

Exemplo de saída:
```
2026-01-16T10:30:45.123Z info service/service.go:123 Starting receivers...
2026-01-16T10:30:45.124Z info otlpreceiver/otlp.go:45 Starting OTLP receiver on 0.0.0.0:4317
2026-01-16T10:30:45.125Z info prometheusreceiver/prometheus.go:67 Starting Prometheus scraping
```

## Troubleshooting

**Porta já em uso:**
```bash
# Verifique o que está usando a porta
netstat -tulpn | grep :4317
# Mate o processo ou mude a porta na configuração
```

**Permissão negada (arquivos de log):**
```bash
# Garanta que o collector consiga ler os arquivos de log
sudo chmod 644 /var/log/app/*.log
# Ou rode o collector com as permissões adequadas
```

**Nenhum dado aparecendo:**
- Verifique se as aplicações estão enviando dados para os endpoints corretos
- Confirme se as configurações de firewall permitem as conexões
- Use o logging exporter para ver se os dados estão sendo recebidos

## Próximos Passos

Depois de testar esses exemplos:
1. Modifique as configurações para se adequar ao seu ambiente
2. Tente combinar diferentes receivers
3. Experimente diferentes intervalos de scraping e padrões de arquivo
4. Siga para o Dia 17 para aprender sobre processors!
