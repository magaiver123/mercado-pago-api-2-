# Configuração de Webhooks do Mercado Pago Point

Este guia explica como configurar webhooks para receber notificações em tempo real sobre mudanças no status dos pagamentos.

## Benefícios dos Webhooks

- **Tempo Real**: Receba notificações instantâneas quando o pagamento muda de status
- **Eficiência**: Elimina a necessidade de polling constante da API
- **Confiabilidade**: O Mercado Pago garante a entrega das notificações

## Passo a Passo para Configuração

### 1. Obtenha a URL do Webhook

Sua URL de webhook é:
```
https://seu-dominio.vercel.app/api/mercadopago/webhook
```

**Importante**: A URL deve ser HTTPS e estar acessível publicamente. Em desenvolvimento local, você pode usar ferramentas como ngrok.

### 2. Configure no Painel do Mercado Pago

1. Acesse [Suas Integrações](https://www.mercadopago.com.br/developers/panel/app)
2. Selecione sua aplicação
3. No menu lateral, vá em **Webhooks > Configurar notificações**
4. Configure as URLs:
   - **URL modo produção**: `https://seu-dominio.vercel.app/api/mercadopago/webhook`
   - **URL modo teste**: `https://seu-dominio-teste.vercel.app/api/mercadopago/webhook`

### 3. Selecione os Eventos

Marque a opção **Integrações Point** para receber as seguintes notificações:

- ✅ **FINISHED** (order.processed) - Pagamento processado com sucesso
- ✅ **CANCELED** (order.canceled) - Pagamento cancelado
- ✅ **ERROR** (order.failed) - Erro no processamento
- ✅ **CONFIRMATION_REQUIRED** (order.action_required) - Requer confirmação manual

### 4. Salve e Obtenha a Assinatura Secreta

Após salvar, o Mercado Pago irá gerar uma **assinatura secreta**. Adicione-a como variável de ambiente:

```env
MERCADOPAGO_WEBHOOK_SECRET=sua_assinatura_secreta_aqui
```

### 5. Descomente a Validação (Opcional mas Recomendado)

No arquivo `app/api/mercadopago/webhook/route.ts`, descomente as linhas de validação:

```typescript
const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET
if (secret && xSignature && xRequestId) {
  const isValid = validateWebhookSignature(xSignature, xRequestId, body, secret)
  if (!isValid) {
    console.log('[v0] Invalid webhook signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }
}
```

## Como Funciona

1. Cliente cria um pedido e seleciona o método de pagamento
2. Pedido é enviado para o terminal Point
3. Cliente realiza o pagamento no terminal
4. **Mercado Pago envia webhook** com o status atualizado
5. Sistema recebe webhook e armazena status em memória
6. Página de processamento verifica status (webhook primeiro, depois API)
7. Cliente é redirecionado para tela de sucesso/erro automaticamente

## Estrutura do Webhook

Os webhooks do Point Integration têm o seguinte formato:

```json
{
  "id": "abcdef123-8ab5-4139-9aa3-abcd123",
  "state": "FINISHED",
  "amount": 100,
  "payment": {
    "id": 123456789,
    "state": "approved",
    "type": "credit_card"
  },
  "created_at": "2021-11-29 17:10:37",
  "additional_info": {
    "external_reference": "information"
  }
}
```

## Estados Possíveis

| Estado | Descrição | Ação do Sistema |
|--------|-----------|-----------------|
| `FINISHED` | Pagamento concluído | Verifica `payment.state` e redireciona |
| `CANCELED` | Pagamento cancelado | Redireciona para tela de erro |
| `ERROR` | Erro no processamento | Redireciona para tela de erro |
| `CONFIRMATION_REQUIRED` | Requer confirmação manual | Continua aguardando |

## Testando Webhooks

### Em Desenvolvimento Local

Use ngrok para expor sua aplicação local:

```bash
ngrok http 3000
```

Use a URL fornecida pelo ngrok na configuração do webhook no Mercado Pago.

### Simulador de Webhooks

O Mercado Pago oferece um [simulador de webhooks](https://www.mercadopago.com.br/developers/panel/app) para testar sua integração sem precisar fazer transações reais.

## Troubleshooting

### Webhook não está sendo recebido

1. Verifique se a URL está correta e acessível publicamente
2. Confirme que o evento "Integrações Point" está marcado
3. Verifique os logs do servidor para erros
4. Use o simulador de webhooks para testar

### Validação de assinatura falhando

1. Confirme que o `MERCADOPAGO_WEBHOOK_SECRET` está correto
2. Verifique se você está usando a assinatura correta (modo teste vs produção)
3. Certifique-se de que o formato da mensagem está correto

## Notas de Produção

- **Idempotência**: Webhooks podem ser enviados múltiplas vezes. Implemente lógica idempotente.
- **Timeout**: Responda ao webhook em até 10 segundos.
- **Armazenamento**: Em produção, use um banco de dados ou Redis ao invés de memória.
- **Retry**: O Mercado Pago tentará reenviar webhooks que falharam.

## Próximos Passos

Com os webhooks configurados, você tem um sistema de pagamento em tempo real totalmente funcional! O sistema agora:

- ✅ Recebe notificações instantâneas
- ✅ Elimina polling desnecessário
- ✅ Proporciona melhor experiência ao usuário
- ✅ Reduz carga na API do Mercado Pago
