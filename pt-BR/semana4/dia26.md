# Dia 26 – Se Preparando para o Uso Real: Noções Básicas de Segurança e Performance

Ontem você aprendeu o que acontece quando os sistemas de observabilidade ficam sobrecarregados. Hoje você vai aprender o básico para deixar sua configuração de OpenTelemetry segura e performática, seja para um projeto pessoal, uma demo, ou eventualmente produção.

> **O objetivo:** Criar bons hábitos desde o início, para você não precisar corrigir problemas depois.

> **Observação:** Os exemplos de configuração desta lição usam o batch processor para fins didáticos. Em produção, considere exporters com batching embutido e armazenamento persistente para mais confiabilidade ([OpenTelemetry issue #8122](https://github.com/open-telemetry/opentelemetry-collector/issues/8122)).

---

## Por Que Aprender Isso Agora?

Você deve estar pensando: "Eu ainda estou aprendendo OpenTelemetry, por que eu preciso me preocupar com segurança e performance?"

Aqui está o motivo de isso importar mesmo para quem está começando:

- **Você pode expor dados sensíveis sem querer** ao logar senhas em spans
- **Seu notebook fica mais lento** quando você faz trace de cada request
- **Bons hábitos são mais fáceis** de aprender desde o começo do que de corrigir depois
- **Esses conceitos aparecem** em entrevistas e em projetos reais

**Pense como aprender a dirigir:** você aprende a checar os espelhos e usar a seta desde o primeiro dia, não depois do seu primeiro acidente.

---

## Segurança: Não Exponha Segredos sem Querer

Quando você está aprendendo e experimentando, é fácil capturar informações sensíveis sem perceber:

```javascript
// Oops! This captures a password
app.post('/login', (req, res) => {
  const span = trace.getActiveSpan();
  span.setAttributes({
    'user.email': req.body.email,
    'user.password': req.body.password,  // ❌ Don't do this!
    'request.body': JSON.stringify(req.body)  // ❌ This too - it captures everything!
  });
});
```

**Correção Simples: Seja Seletivo com o que Você Captura**

```javascript
// Better: Only capture safe information
app.post('/login', (req, res) => {
  const span = trace.getActiveSpan();
  span.setAttributes({
    'user.email': req.body.email,
    'login.attempt': 'true',
    'request.method': req.method
    // No passwords, no full request bodies
  });
});
```

### Regras Básicas de Segurança

**Seguro capturar:**
- IDs de usuário (não usernames, se forem sensíveis)
- Métodos de request (GET, POST)
- Códigos de status da resposta
- Informações de timing
- Mensagens de erro (sem detalhes sensíveis)

**Nunca capturar:**
- Senhas
- API keys ou tokens
- Números de cartão de crédito
- Informações pessoais (a menos que você saiba exatamente o que está fazendo)
- Corpos completos de request/response

### Dicas Rápidas de Segurança

1. **Revise seus attributes** - Olhe com atenção para o que você realmente está capturando
2. **Use variáveis de ambiente** para configurações sensíveis (API keys, endpoints)
3. **Cuidado com auto-instrumentação** - Ela pode capturar mais do que você imagina
4. **Na dúvida, não logue** - Você sempre pode adicionar mais depois

---

## Performance: Não Deixe Seu App Lento

### O Problema: Coletar Telemetry Demais Pode Prejudicar a Performance

Quando você está animado com tracing, é tentador querer rastrear tudo:

```javascript
// This will slow down your app!
app.get('/users', async (req, res) => {
  const users = await User.findAll();
  
  // Creating a span for every user - bad idea!
  users.forEach(user => {
    const span = tracer.startSpan(`process-user-${user.id}`);
    // ... do something with user
    span.end();
  });
});
```

### Correção Simples: Faça Trace de Operações, Não de Itens Individuais

```javascript
// Better: One span for the whole operation
app.get('/users', async (req, res) => {
  const span = tracer.startSpan('get-all-users');
  
  const users = await User.findAll();
  span.setAttributes({
    'users.count': users.length,
    'database.operation': 'findAll'
  });
  
  span.end();
});
```

### Boas Práticas de Performance para Iniciantes

**1. Não faça trace de tudo:**
```javascript
// Good: Trace important operations
app.post('/orders', createOrder);  // ✅ Trace this
app.get('/health', healthCheck);   // ❌ Don't trace this

// Good: Trace business logic
function processPayment() { /* trace this */ }

// Bad: Trace utility functions
function formatDate() { /* don't trace this */ }
```

**2. Use sampling:**
```javascript
// Even for learning, don't trace 100% of requests
const sdk = new NodeSDK({
  sampler: new TraceIdRatioBasedSampler(0.1), // 10% is plenty for learning
});
```

**3. Configure o batching:**
```yaml
# In your Collector config (educational example)
# Note: Modern exporters can handle batching internally for better reliability
processors:
  batch:
    timeout: 1s
    send_batch_size: 100  # Small batches for learning

# Alternative: Modern exporter-native batching (recommended for production)
exporters:
  otlp:
    endpoint: http://backend:4317
    sending_queue:
      enabled: true
      queue_size: 1000
      persistent_storage_enabled: true  # Survives crashes
    retry_on_failure:
      enabled: true
```

### Quando a Performance Importa Mais

- **Loops:** Nunca crie spans dentro de loops sobre muitos itens
- **Operações de alta frequência:** Queries de banco de dados, chamadas de API
- **Funções utilitárias:** Formatação de datas, manipulação de strings
- **Health checks:** Geralmente não precisam de tracing

---

## Juntando Tudo: Um Checklist para Iniciantes

Antes de mostrar seu projeto de OpenTelemetry para outras pessoas:

### Básico de Segurança
- [ ] Nenhuma senha ou API key nos attributes dos spans
- [ ] Nenhum corpo completo de request/response sendo logado
- [ ] Você revisou o que a auto-instrumentação captura
- [ ] Está usando variáveis de ambiente para configurações sensíveis

### Básico de Performance
- [ ] Não está criando spans dentro de loops
- [ ] Está usando sampling (mesmo 10-50% já é suficiente para aprender)
- [ ] Batching eficiente configurado (via processor ou nativo do exporter)
- [ ] Só está fazendo trace de operações importantes

---

## Erros Comuns de Iniciante

### Erro 1: "Eu Adiciono Segurança Depois"
**Problema:** Você se acostuma com maus hábitos e acaba expondo dados sem querer
**Solução:** Comece com boas práticas desde o primeiro dia

### Erro 2: "Mais Tracing = Melhor Observabilidade"
**Problema:** Seu app fica lento e os traces ficam cheios de ruído
**Solução:** Faça trace de operações importantes, não de tudo

### Erro 3: "A Auto-instrumentação Resolve Tudo"
**Problema:** Você não sabe o que está sendo capturado automaticamente
**Solução:** Revise o que a auto-instrumentação captura e complemente com cuidado

### Erro 4: "As Configurações Padrão Já Estão Boas"
**Problema:** Os defaults geralmente não são otimizados para o seu caso de uso
**Solução:** Aprenda configurações básicas (sampling, batching)

---

## O Que Estou Levando para o Dia 27

O grande insight de hoje foi que **bons hábitos de observabilidade são mais fáceis de aprender desde o início do que de corrigir depois. Mesmo sendo iniciante, você já consegue construir uma observabilidade segura e performática.**

As duas coisas básicas para lembrar:
1. **Segurança:** Não logue dados sensíveis sem querer, seja seletivo com os attributes
2. **Performance:** Não faça trace de tudo, foque nas operações importantes e use sampling

Amanhã vamos explorar o **OpenTelemetry Operator**, uma ferramenta que ajuda a gerenciar automaticamente várias dessas preocupações em ambientes Kubernetes.
