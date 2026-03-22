# Modulo Impressoras para o PROJETO 2 -ADMIN

Objetivo: mover a gestao de impressoras para o sistema ADMIN, separando:

- Contexto global de operacao
- Contexto por loja/totem

## Visao de telas (ADMIN)

1. Aba `Global`
   - Configuracoes globais da impressao
   - Status geral de todas as impressoras
2. Aba `Por Loja`
   - Seleciona loja
   - Lista totens da loja
   - Vincula impressora por totem
   - Aciona teste de impressao

## APIs prontas neste backend

Global:

- `GET /api/print/admin/global-settings`
- `PUT /api/print/admin/global-settings`
- `GET /api/print/admin/global-status`

Por loja:

- `GET /api/print/admin/totem-printers`
- `PUT /api/print/admin/totem-printers`
- `POST /api/print/admin/test-print`
- `GET /api/print/admin/jobs`

Runtime:

- `POST /api/print/receipt`

Agente:

- `POST /api/print/agent/heartbeat`
- `POST /api/print/agent/claim-next-job`
- `POST /api/print/agent/ack-success`
- `POST /api/print/agent/ack-failure`

## Regras de negocio

1. 1 impressora ativa por totem.
2. Configuracao global nao substitui vinculo por loja; ela define padroes.
3. Status operacional deve ser acompanhado no contexto global.
4. Teste por loja/totem continua existindo.
