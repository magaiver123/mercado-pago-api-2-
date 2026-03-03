# Seguranca das Notificacoes (Webhook)

## Objetivo
Garantir que o sistema aceite apenas notificacoes realmente enviadas pelo Mercado Pago.

## Como a seguranca funciona
1. O Mercado Pago envia uma assinatura junto da notificacao.
2. O sistema valida essa assinatura antes de processar.
3. Se a assinatura for invalida, a notificacao e recusada.

## O que isso evita
1. Atualizacao falsa de pagamento.
2. Mudanca indevida de status.
3. Inconsistencia de conciliacao.

## Checklist de operacao
1. Confirmar que a chave secreta do webhook esta configurada no ambiente.
2. Confirmar que a URL de webhook configurada no painel aponta para o ambiente correto.
3. Confirmar que os eventos de Order estao habilitados.
4. Rodar simulacao de notificacao no painel do Mercado Pago.

## Como validar rapidamente se esta funcionando
1. Simule um evento no painel.
2. Verifique se o sistema registrou recebimento com sucesso.
3. Confira se o status da compra mudou para a tela correta.

## Sinal de alerta
Se houver muitas notificacoes recusadas por assinatura invalida:
1. revisar chave secreta;
2. revisar URL configurada;
3. revisar se houve troca recente de chave no painel.

