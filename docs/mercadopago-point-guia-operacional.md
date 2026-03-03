# Guia Operacional Mercado Pago Point

## Objetivo
Este documento explica, de forma simples, como o pagamento no Point funciona no sistema e o que cada pessoa da operacao precisa observar.

## O que esta configurado
1. O sistema cria uma cobranca para a maquininha Point.
2. O cliente paga no terminal.
3. O Mercado Pago envia atualizacoes automáticas para o sistema.
4. O sistema mostra a tela correta para o cliente em cada situacao.
5. Quando necessario, o sistema faz uma confirmacao adicional para evitar status incorreto.

## Formas de pagamento aceitas
1. PIX
2. Cartao de credito
3. Cartao de debito

Nenhuma outra forma e aceita neste fluxo.

## Fluxo da compra (inicio ao fim)
1. Cliente escolhe os produtos e forma de pagamento.
2. O sistema envia o pedido para o Mercado Pago Point.
3. A maquininha recebe o pedido.
4. O cliente realiza o pagamento no terminal.
5. O sistema recebe o retorno do Mercado Pago e atualiza a tela.

## O que o cliente ve durante o pagamento
1. Tela de processamento.
2. Se demorar mais de 60 segundos, a tela muda para "ainda processando no terminal".
3. O sistema continua aguardando o retorno real, sem marcar expirado por conta propria.

## Resultado final para o cliente
1. Aprovado: tela de sucesso.
2. Recusado/falha: tela de falha.
3. Cancelado: tela de cancelado.
4. Expirado de verdade: tela de expirado.
5. Acao necessaria no terminal: tela de acao necessaria.
6. Reembolsado: tela de reembolsado.

## Como agir em casos comuns
1. Cliente diz que pagou e a tela nao atualizou: aguardar alguns segundos e conferir status no sistema; ele continua consultando ate receber o retorno real.
2. Pedido travado no terminal: operador pode cancelar no terminal ou no sistema (quando permitido).
3. Falha recorrente: registrar horario, numero do pedido e chamar suporte interno.

## Regra de confiabilidade
O sistema nao decide sozinho que expirou apenas pelo tempo da tela. Ele usa retorno oficial para evitar erro fantasma.

