# Status e Telas do Cliente

## Objetivo
Mostrar, de forma direta, qual status recebido vira qual tela no totem.

## Tabela principal
| Status recebido | Significado | Tela mostrada |
|---|---|---|
| `processed` | Pagamento aprovado | Sucesso |
| `failed` | Pagamento recusado/falhou | Falha |
| `error` | Erro de processamento | Falha |
| `canceled` | Pedido cancelado | Cancelado |
| `expired` | Pedido expirado de forma oficial | Expirado |
| `action_required` | Cliente precisa confirmar no terminal | Acao necessaria |
| `refunded` | Valor devolvido | Reembolsado |
| `created` | Pedido criado e aguardando terminal | Processando |
| `at_terminal` | Pedido esta na maquininha | Processando |
| `pending`/`processing` | Pedido ainda sem resultado final | Processando |

## Regra dos 60 segundos
1. O contador visual continua existindo.
2. Ao chegar em 60 segundos sem resposta final:
   - nao muda para "expirado";
   - mostra "ainda processando no terminal";
   - continua consultando o status real.

## Resultado esperado
1. O cliente sempre recebe uma mensagem coerente com o status real.
2. Evita situacao de "pagou mas apareceu expirado".
3. Evita tela errada por atraso de notificacao.

