# MQTT Fechadura - Setup Completo (Mosquitto proprio)

Este guia replica a mesma logica do projeto antigo, agora na sua infraestrutura.

## 1) Subir broker MQTT (VPS Ubuntu)

1. Instale Docker + Docker Compose.
2. Copie a pasta `infra/mqtt` para a VPS.
3. Entre na pasta:

```bash
cd infra/mqtt
```

4. Gere o arquivo de senha do Mosquitto:

```bash
docker run --rm -it -v "$PWD/mosquitto/config:/mosquitto/config" eclipse-mosquitto:2 \
  mosquitto_passwd -c /mosquitto/config/passwd backend_publisher
```

5. Adicione o usuario do ESP:

```bash
docker run --rm -it -v "$PWD/mosquitto/config:/mosquitto/config" eclipse-mosquitto:2 \
  mosquitto_passwd /mosquitto/config/passwd esp_lock_client
```

6. Suba o broker:

```bash
docker compose up -d
```

7. Verifique se subiu:

```bash
docker ps
docker logs -f mqtt_broker
```

## 2) Firewall minimo

Liberar apenas portas necessarias:

```bash
sudo ufw allow 1883/tcp
sudo ufw allow 9001/tcp
```

Se nao usar WebSocket, nao exponha `9001`.

## 3) Configurar backend

Defina no ambiente da API:

```env
MQTT_URL=mqtt://SEU_IP_OU_DOMINIO:1883
MQTT_USER=backend_publisher
MQTT_PASS=SUA_SENHA_BACKEND
MQTT_CONNECT_TIMEOUT_MS=5000
```

Se o broker estiver com `allow_anonymous true`, `MQTT_USER` e `MQTT_PASS` podem ficar vazios.

## 4) Criar tabela e vinculo por loja

Execute o script:

`scripts/011_create_store_locks_table.sql`

Depois cadastre uma fechadura por loja (exemplo):

```sql
insert into public.store_locks (store_id, device_id, enabled, is_primary)
values ('UUID_DA_LOJA', 'ESP_ab12cd', true, true);
```

`device_id` deve ser o ID MQTT do ESP (ex.: `ESP_<chipid>`).

## 5) Configurar ESP (captive portal)

Preencha no ESP:

- Servidor MQTT: `SEU_IP_OU_DOMINIO`
- Porta MQTT: `1883`
- Usuario MQTT: `esp_lock_client`
- Senha MQTT: `SUA_SENHA_ESP`

Topicos usados:

- Subscribe: `devices/{deviceId}/commands`
- Publish: `devices/{deviceId}/responses`
- Publish: `devices/{deviceId}/status`

## 6) Testes operacionais

### 6.1 Teste manual protegido (admin)

Endpoint:

- `POST /api/locks/test-open`

Requisitos:

- Sessao admin valida.
- Admin bypass ativo para a loja alvo.

Payload opcional:

```json
{
  "socketId": "teste-manual-001"
}
```

### 6.2 Teste de pagamento

Quando o webhook receber `order.processed`, o backend publica:

- Topic: `devices/{deviceId}/commands`
- Payload: `{"action":"openDoor","socketId":"<mercadopagoOrderId>",...}`

### 6.2.1 Reconciliacao de pedidos antigos (quando `stock_processed=false`)

Se pedidos antigos ficaram sem baixa de estoque por falha de webhook, rode:

- `POST /api/orders/reconcile-processed`

Requisitos:

- Sessao admin valida.
- Admin bypass ativo para a loja alvo.

Payload opcional:

```json
{
  "limit": 30
}
```

O endpoint consulta o status no Mercado Pago para os pedidos pendentes da loja e aplica os efeitos de `processed` (baixa de estoque + comando MQTT de abertura), de forma idempotente.

### 6.3 Observabilidade MQTT

No servidor do broker:

```bash
docker exec -it mqtt_broker sh -c "mosquitto_sub -h localhost -p 1883 -u backend_publisher -P 'SUA_SENHA_BACKEND' -t 'devices/+/status' -v"
```

```bash
docker exec -it mqtt_broker sh -c "mosquitto_sub -h localhost -p 1883 -u backend_publisher -P 'SUA_SENHA_BACKEND' -t 'devices/+/responses' -v"
```

```bash
docker exec -it mqtt_broker sh -c "mosquitto_sub -h localhost -p 1883 -u backend_publisher -P 'SUA_SENHA_BACKEND' -t 'devices/+/commands' -v"
```

Para broker anonimo, remova `-u` e `-P` nos comandos acima.

## 7) Comportamento esperado de resiliencia

- Sem lock configurada para a loja: webhook continua `ok`, com log de alerta.
- Broker indisponivel: webhook continua `ok`, com log de erro MQTT.
- Reentrega de webhook do mesmo pedido `processed`: nao abre duas vezes (idempotencia por `stock_processed`).
