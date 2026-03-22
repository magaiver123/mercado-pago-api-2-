# Operacao de Impressao por Totem (Guia Didatico)

Este documento explica em linguagem simples como o sistema de impressao funciona e o que fazer ao inaugurar uma loja.

## Como funciona (sem linguagem tecnica)

1. O cliente faz o pedido no totem.
2. Quando ele toca em `Imprimir Nota`, o pedido entra em uma fila.
3. Um agente local da loja (pode ser notebook ou app) pega esse item da fila.
4. O agente envia o comprovante para a impressora certa daquele totem.
5. O sistema marca se imprimiu com sucesso ou se houve erro.

Resumo:

- Totem nao imprime direto.
- Totem pede para a fila.
- Agente da loja imprime.
- Sistema acompanha status.

## O que e global x por loja

- Global:
  - Regras gerais de impressao (porta padrao, perfil padrao ESC/POS, tempos de heartbeat/fila).
  - Status geral de todas as impressoras (online, offline, erro, etc.).
- Por loja:
  - Qual impressora esta ligada a qual totem.
  - Teste de impressao daquela loja.

## Checklist de inauguracao de loja

1. Confirmar rede
   - Impressoras e totens na mesma rede local.
   - Impressora respondendo na porta 9100.
2. Cadastrar loja e totens no sistema.
3. Configurar impressora de cada totem.
4. Ligar agente local da loja (notebook ou app).
5. Fazer teste real:
   - Clique `Testar impressao`.
   - Fazer pedido real e tocar em `Imprimir Nota`.
6. Validar status no painel global:
   - Online.
   - Sem erros pendentes.
   - Fila zerando.

## Rotina diaria recomendada

1. Ver painel global pela manha.
2. Tratar qualquer impressora em offline antes de abrir ao publico.
3. A cada troca de impressora:
   - Atualizar vinculo do totem.
   - Rodar teste.

## Quando der problema

Sinais comuns:

- Nao imprime.
- Impressora aparece offline.
- Fila acumulada.

Passos:

1. Verificar energia e cabo de rede da impressora.
2. Verificar se o agente local esta rodando.
3. Verificar se IP/porta continuam corretos.
4. Rodar teste de impressao.
5. Se persistir, registrar erro e escalar suporte.
