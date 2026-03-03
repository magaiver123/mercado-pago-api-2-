# Configuracao de Webhook - Mercado Pago Point

Este projeto usa webhook com validacao obrigatoria de assinatura.

## URL do webhook
`https://SEU_DOMINIO/api/mercadopago/webhook`

## Variavel obrigatoria
`MERCADOPAGO_WEBHOOK_SECRET`

Sem essa variavel o webhook nao e processado.

## Evento que deve estar habilitado
`Order (Mercado Pago)`

## Como o sistema se comporta
1. Recebe webhook.
2. Valida assinatura.
3. Se valido, atualiza status da order.
4. Se invalido, recusa a notificacao.

## Referencias de operacao (documentacao didatica)
1. `docs/mercadopago-point-guia-operacional.md`
2. `docs/mercadopago-point-status-e-telas.md`
3. `docs/mercadopago-point-webhook-seguranca.md`
4. `docs/mercadopago-point-checklist-producao.md`

