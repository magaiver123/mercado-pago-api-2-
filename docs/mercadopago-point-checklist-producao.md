# Checklist de Producao - Mercado Pago Point

## Antes de publicar
1. Confirmar credenciais de producao ativas.
2. Confirmar terminal correto vinculado em modo PDV.
3. Confirmar URL de webhook de producao.
4. Confirmar chave secreta do webhook no ambiente.
5. Confirmar formas de pagamento habilitadas no sistema:
   - PIX
   - Cartao de credito
   - Cartao de debito

## Teste de fumaca (obrigatorio)
1. Criar um pedido de teste.
2. Simular/validar status:
   - aprovado (`processed`)
   - falha (`failed`)
   - cancelado (`canceled`)
   - expirado (`expired`)
   - acao necessaria (`action_required`)
   - reembolsado (`refunded`)
3. Confirmar que cada status abre a tela correta.
4. Confirmar que apos 60s sem retorno final nao aparece expirado automatico.

## Conferencia pos-publicacao
1. Monitorar primeiros pedidos em tempo real.
2. Conferir se nao ha divergencia entre terminal e sistema.
3. Conferir taxa de notificacoes recusadas por assinatura.
4. Conferir se houve pedido sem status final por tempo anormal.

## Plano rapido de resposta
1. Se houver instabilidade:
   - pausar fluxo operacional no caixa afetado;
   - validar webhook e conectividade;
   - validar status real dos pedidos no painel Mercado Pago.
2. Registrar:
   - horario,
   - ID do pedido,
   - tela exibida,
   - resultado no terminal.

## Reset manual da numeracao de pedidos
Use quando houver limpeza operacional da tabela `orders` e for necessario recomecar o contador global de `order_number`.

### Opcao 1 (recomendado para zerar tudo)
```sql
TRUNCATE public.orders RESTART IDENTITY;
```

### Opcao 2 (quando usar DELETE em vez de TRUNCATE)
```sql
ALTER SEQUENCE public.order_number_seq RESTART WITH 1;
```

Observacao: o formato exibido no app e fixo em 8 digitos (`00000001`, `00000002`, ...), mas o valor armazenado no banco continua inteiro.
