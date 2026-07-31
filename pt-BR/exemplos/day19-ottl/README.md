# Dia 19 - OTTL: Transformações Avançadas de Dados

Este diretório contém exemplos de configuração para transformações usando a OpenTelemetry Transformation Language (OTTL).

> **Nota Importante**: Esses exemplos usam o batch processor para fins didáticos. O OpenTelemetry está movendo a funcionalidade de batching para os exporters, buscando mais confiabilidade ([GitHub issue #8122](https://github.com/open-telemetry/opentelemetry-collector/issues/8122)). Em produção, prefira exporters com batching e armazenamento persistente embutidos.

## Arquivos

- `basic-transformations.yaml` - Funções e padrões básicos de OTTL
- `business-logic.yaml` - Transformações voltadas para lógica de negócio
- `data-enrichment.yaml` - Extração de headers e enriquecimento de dados
- `performance-classification.yaml` - Categorização de performance
- `ecommerce-example.yaml` - Transformações reais de e-commerce
- `metrics-transformations.yaml` - Exemplos de OTTL específicos para metrics
- `logs-transformations.yaml` - Exemplos de OTTL específicos para logs
- `debug-config.yaml` - Configuração para debugar transformações OTTL

## Rodando os Exemplos

1. **Suba o Collector:**
   ```bash
   otelcol --config-file=basic-transformations.yaml
   ```

2. **Envie dados de teste:**
   Use o gerador de dados de teste ou envie traces da sua aplicação para ver as transformações em ação.

3. **Observe os resultados:**
   Confira os dados exportados para ver como as transformações OTTL modificaram a sua telemetry.

## Conceitos-Chave do OTTL

- **Contexts**: resource, span, metric, datapoint, log
- **Funções**: set(), delete_key(), Concat(), Split(), Replace()
- **Conditions**: cláusulas WHERE para transformações condicionais
- **Performance**: otimize para hot paths e condições específicas

## Próximos Passos

- Experimente diferentes statements OTTL
- Combine múltiplos transform processors
- Teste o impacto de performance de transformações complexas
- Vá para o Dia 20 para padrões de deployment
