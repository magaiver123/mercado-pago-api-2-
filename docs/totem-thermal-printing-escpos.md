# Impressao Termica por Totem (ESC/POS-first)

Este guia cobre a integracao completa de impressao automatica por totem:

- Vinculo de 1 impressora por totem
- Fila de jobs no backend
- Agente local (Android ou notebook) para imprimir na rede local
- Operacao e homologacao de modelos ESC/POS

## 1) Banco de dados

Execute a migration:

- `scripts/014_create_totem_printers_and_print_jobs.sql`

Tabelas novas:

- `public.totem_printers`: configuracao da impressora por totem (1:1)
- `public.print_jobs`: fila de impressao por totem, com idempotencia

Regras principais:

- Unico por totem: `uniq_totem_printers_totem_id`
- Idempotencia de comprovante: `uniq_print_jobs_totem_order_action`

## 2) Fluxo operacional

### 2.1 Fluxo do cliente no totem

1. Cliente conclui pagamento
2. Cliente toca em `Imprimir Nota`
3. Front chama `POST /api/print/receipt`
4. Backend cria job em `print_jobs`
5. Agente local do totem faz `claim-next-job`, imprime e confirma

### 2.2 Fluxo do agente local (Android ou notebook)

1. Heartbeat: `POST /api/print/agent/heartbeat`
2. Poll: `POST /api/print/agent/claim-next-job`
3. Se houver job:
   - Imprimir via ESC/POS (TCP) com a config retornada
4. Ack sucesso: `POST /api/print/agent/ack-success`
5. Ack falha: `POST /api/print/agent/ack-failure`

## 3) Endpoints

### Admin (exigem admin bypass ativo para loja)

- `GET /api/print/admin/totem-printers`
- `PUT /api/print/admin/totem-printers`
- `POST /api/print/admin/test-print`
- `GET /api/print/admin/jobs?limit=30`

### Admin global (exigem sessao admin valida)

- `GET /api/print/admin/global-settings`
- `PUT /api/print/admin/global-settings`
- `GET /api/print/admin/global-status`

### Runtime (totem)

- `POST /api/print/receipt`

### Agent

- `POST /api/print/agent/heartbeat`
- `POST /api/print/agent/claim-next-job`
- `POST /api/print/agent/ack-success`
- `POST /api/print/agent/ack-failure`

## 4) Configurar impressora por totem

Painel:

- `GET /userprofile/perfil/impressoras`

Passos:

1. Login com usuario admin
2. Informar slug da loja e ativar contexto admin
3. Para cada totem:
   - IP da impressora
   - Porta (`9100` na maioria dos modelos de rede)
   - Modelo (ex: `Bematech MP-4200 TH`)
   - Perfil ESC/POS
   - Largura do papel
4. Salvar
5. Rodar `Testar impressao`

## 5) Agente local sem app Android (teste imediato no notebook)

Arquivo:

- `scripts/print-agent-notebook.mjs`

Execucao no PowerShell:

```powershell
$env:DEVICE_ID = "DEVICE_ID_DO_TOTEM"
$env:API_BASE_URL = "http://localhost:3000"
$env:DRY_RUN = "false"
npm run print:agent:notebook
```

Se quiser testar sem mandar bytes para a impressora fisica:

```powershell
$env:DEVICE_ID = "DEVICE_ID_DO_TOTEM"
$env:API_BASE_URL = "http://localhost:3000"
$env:DRY_RUN = "true"
npm run print:agent:notebook
```

Como usar para validar agora:

1. Configure impressora no painel `/userprofile/perfil/impressoras`
2. Rode o agente no notebook com o `DEVICE_ID` do totem
3. Clique em `Testar impressao` no painel
4. Verifique o job mudando para `printed`

## 5.1 Companion app Android (quando for evoluir)

Loop recomendado:

1. Heartbeat a cada 5-15s
2. Poll de jobs em 1-3s
3. Em job recebido:
   - Abrir socket TCP para `printer.ip:printer.port`
   - Enviar bytes ESC/POS
   - Fechar conexao
4. Ack de sucesso/falha

Campos importantes retornados pelo backend no claim:

- `printer.ip`
- `printer.port`
- `printer.model`
- `printer.escposProfile`
- `printer.paperWidthMm`
- `job.payload.receipt`

## 6) Perfil ESC/POS e compatibilidade

Perfis implementados:

- `generic`
- `bematech-mp4200`

Politica recomendada:

- ESC/POS-first
- Homologar cada modelo com checklist antes de producao

Checklist de homologacao:

1. Acentuacao PT-BR e codepage correta
2. Corte parcial/total
3. QR/barcode
4. Papel 58/80mm
5. Impressora offline/papel ausente
6. Retry e idempotencia

## 6.1 Mock agent para homologacao

Arquivo:

- `scripts/print-agent-mock.mjs`

Execucao local:

```bash
DEVICE_ID=SEU_DEVICE_ID API_BASE_URL=http://localhost:3000 node scripts/print-agent-mock.mjs
```

O mock nao envia bytes ESC/POS reais; ele valida o protocolo de fila:

- heartbeat
- claim de job
- ack de sucesso

## 7) MP-4200 TH (piloto)

Use inicialmente:

- Modelo: `Bematech MP-4200 TH`
- Perfil: `bematech-mp4200`
- Conexao: TCP
- Porta: `9100` (ou a configurada na interface de rede da impressora)

Observacao:

- Garantir que a impressora esteja no modo ESC/POS quando necessario para o firmware/configuracao atual.

## 8) Observabilidade

No painel admin:

- `last_heartbeat_at`
- `last_status`
- `last_error`
- Jobs recentes por totem

Sinais de alerta:

- Heartbeat antigo
- Jobs em `pending` sem consumo
- Jobs em `failed` com mesmo erro recorrente
