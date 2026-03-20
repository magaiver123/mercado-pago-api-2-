# Contrato Admin - Status Visual de Loja

## Campos em `stores`
- `visual_status` (`text`, default `normal`)
Valores permitidos: `normal`, `manutencao`, `inauguracao`.
- `visual_text` (`text`, nullable)
Texto exibido na tarja do card quando `visual_status != normal`.

## Regras no Formulario de Loja
- Campo `Status visual` (select):
`Normal`, `Manutencao`, `Inauguracao`.
- Campo `Texto da tarja` (input texto):
obrigatorio quando `Status visual` for `Manutencao` ou `Inauguracao`.
- Quando `Status visual = Normal`, limpar `Texto da tarja` (opcional) ou ignorar no backend.

## Persistencia
- Criacao de loja:
salvar `visual_status` e `visual_text` junto com os demais campos.
- Edicao de loja:
atualizar `visual_status` e `visual_text`.

## Comportamento esperado na Landing
- `status = false`: loja nao aparece.
- `status = true` e `visual_status = normal`: card normal.
- `status = true` e `visual_status != normal` com `visual_text`: exibir sobreposicao/tarja no card e desativar `Abrir no Maps`.
