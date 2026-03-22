#!/usr/bin/env node

/**
 * Desktop/notebook print agent for ESC/POS queue consumption.
 *
 * Required env:
 * - DEVICE_ID=<device_id do totem cadastrado>
 *
 * Optional env:
 * - API_BASE_URL=http://localhost:3000
 * - AGENT_ID=notebook-agent-01
 * - AGENT_VERSION=notebook-1.0.0
 * - CLAIM_INTERVAL_MS=2500
 * - HEARTBEAT_INTERVAL_MS=10000
 * - PRINTER_TIMEOUT_MS=7000
 * - DRY_RUN=false            (true = nao envia para impressora)
 * - FORCE_PRINTER_IP=        (override IP retornado da API)
 * - FORCE_PRINTER_PORT=      (override porta retornada da API)
 * - SAVE_BYTES_PATH=         (salva bytes ESC/POS para debug)
 */

import net from "node:net";
import fs from "node:fs/promises";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";
const DEVICE_ID = process.env.DEVICE_ID;
const AGENT_ID = process.env.AGENT_ID || "notebook-agent-01";
const AGENT_VERSION = process.env.AGENT_VERSION || "notebook-1.0.0";
const CLAIM_INTERVAL_MS = Number(process.env.CLAIM_INTERVAL_MS || 2500);
const HEARTBEAT_INTERVAL_MS = Number(process.env.HEARTBEAT_INTERVAL_MS || 10000);
const PRINTER_TIMEOUT_MS = Number(process.env.PRINTER_TIMEOUT_MS || 7000);
const DRY_RUN = String(process.env.DRY_RUN || "false").toLowerCase() === "true";
const FORCE_PRINTER_IP = process.env.FORCE_PRINTER_IP || "";
const FORCE_PRINTER_PORT = process.env.FORCE_PRINTER_PORT
  ? Number(process.env.FORCE_PRINTER_PORT)
  : null;
const SAVE_BYTES_PATH = process.env.SAVE_BYTES_PATH || "";

if (!DEVICE_ID) {
  console.error("Missing DEVICE_ID env var.");
  process.exit(1);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toAscii(value) {
  const text = String(value ?? "");
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E\n]/g, "?");
}

function formatCurrency(value) {
  const amount = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return `R$ ${amount.toFixed(2).replace(".", ",")}`;
}

function escInit() {
  return Buffer.from([0x1b, 0x40]);
}

function escAlign(mode) {
  const n = mode === "center" ? 1 : mode === "right" ? 2 : 0;
  return Buffer.from([0x1b, 0x61, n]);
}

function escBold(enabled) {
  return Buffer.from([0x1b, 0x45, enabled ? 1 : 0]);
}

function escCutPartial() {
  return Buffer.from([0x1d, 0x56, 0x42, 0x00]);
}

function textLine(value = "") {
  return Buffer.from(`${toAscii(value)}\n`, "ascii");
}

function buildReceiptBytes(payload, printer) {
  const receipt = payload?.receipt ?? {};
  const items = Array.isArray(receipt.items) ? receipt.items : [];
  const parts = [];

  parts.push(escInit());
  parts.push(escAlign("center"));
  parts.push(escBold(true));
  parts.push(textLine(receipt.storeName || "AUTOATENDIMENTO"));
  parts.push(escBold(false));
  parts.push(textLine(receipt.storeAddress || ""));
  parts.push(textLine(receipt.storeTaxId || ""));
  parts.push(textLine("--------------------------------"));

  parts.push(escAlign("left"));
  parts.push(textLine(`Pedido: ${receipt.orderId || payload?.orderId || "-"}`));
  parts.push(textLine(`Data: ${receipt.createdAt || new Date().toISOString()}`));
  parts.push(textLine(`Pagamento: ${receipt.paymentMethod || "Nao informado"}`));
  parts.push(textLine("--------------------------------"));

  for (const item of items) {
    const quantity =
      typeof item?.quantity === "number" && Number.isFinite(item.quantity)
        ? item.quantity
        : 1;
    const unitPrice =
      typeof item?.unitPrice === "number" && Number.isFinite(item.unitPrice)
        ? item.unitPrice
        : 0;
    const name = item?.name || "Item";
    parts.push(textLine(`${quantity}x ${name}`));
    parts.push(textLine(`  ${formatCurrency(unitPrice)} cada`));
  }

  parts.push(textLine("--------------------------------"));
  parts.push(escBold(true));
  parts.push(textLine(`TOTAL: ${formatCurrency(receipt.total)}`));
  parts.push(escBold(false));
  parts.push(textLine(""));
  parts.push(textLine(receipt.additionalMessage || "Obrigado pela preferencia!"));
  parts.push(textLine(""));

  parts.push(escAlign("center"));
  parts.push(textLine(`Perfil ESC/POS: ${printer?.escposProfile || "generic"}`));
  parts.push(textLine(`Largura: ${printer?.paperWidthMm || 80}mm`));
  parts.push(textLine(""));
  parts.push(textLine(""));
  parts.push(textLine(""));
  parts.push(escCutPartial());

  return Buffer.concat(parts);
}

async function postJson(path, body) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`${path}: ${data?.error || `HTTP ${response.status}`}`);
  }

  return data;
}

async function sendHeartbeat(status = "online", error = null) {
  return postJson("/api/print/agent/heartbeat", {
    deviceId: DEVICE_ID,
    status,
    error,
    agentVersion: AGENT_VERSION,
  });
}

async function claimNextJob() {
  return postJson("/api/print/agent/claim-next-job", {
    deviceId: DEVICE_ID,
    agentId: AGENT_ID,
    agentVersion: AGENT_VERSION,
  });
}

async function ackSuccess(jobId) {
  return postJson("/api/print/agent/ack-success", {
    deviceId: DEVICE_ID,
    jobId,
  });
}

async function ackFailure(jobId, error, retryable = true) {
  return postJson("/api/print/agent/ack-failure", {
    deviceId: DEVICE_ID,
    jobId,
    error,
    retryable,
  });
}

function sendBytesTcp({ host, port, data, timeoutMs }) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let done = false;

    const settle = (err) => {
      if (done) return;
      done = true;
      socket.removeAllListeners();
      socket.destroy();
      if (err) reject(err);
      else resolve();
    };

    socket.setTimeout(timeoutMs);
    socket.once("timeout", () => settle(new Error("Printer TCP timeout")));
    socket.once("error", (err) => settle(err));

    socket.connect(port, host, () => {
      socket.write(data, (writeErr) => {
        if (writeErr) {
          settle(writeErr);
          return;
        }
        socket.end(() => settle());
      });
    });
  });
}

async function processJob(job, printer) {
  const host = FORCE_PRINTER_IP || printer?.ip;
  const port = FORCE_PRINTER_PORT || printer?.port;

  if (!host || !port) {
    throw new Error("Printer IP/port missing from job.");
  }

  if (printer?.connectionType && printer.connectionType !== "tcp") {
    throw new Error(`Unsupported connection type: ${printer.connectionType}`);
  }

  const bytes = buildReceiptBytes(job?.payload, printer);
  if (SAVE_BYTES_PATH) {
    await fs.writeFile(SAVE_BYTES_PATH, bytes);
  }

  if (DRY_RUN) {
    console.log(
      `[agent] DRY_RUN: simulated print for job=${job.id} host=${host} port=${port} bytes=${bytes.length}`
    );
    return;
  }

  await sendBytesTcp({
    host,
    port,
    data: bytes,
    timeoutMs: PRINTER_TIMEOUT_MS,
  });
}

async function main() {
  console.log(`[agent] started device=${DEVICE_ID} api=${API_BASE_URL} dryRun=${DRY_RUN}`);

  await sendHeartbeat("online", null);

  setInterval(async () => {
    try {
      await sendHeartbeat("online", null);
    } catch (error) {
      console.error("[agent] heartbeat error:", error.message);
    }
  }, HEARTBEAT_INTERVAL_MS);

  while (true) {
    try {
      const claim = await claimNextJob();
      if (!claim?.hasJob || !claim?.job) {
        await sleep(CLAIM_INTERVAL_MS);
        continue;
      }

      const { job, printer } = claim;
      console.log(
        `[agent] claimed job=${job.id} order=${job.orderId} printer=${printer?.model || "n/a"} ${printer?.ip || "?"}:${printer?.port || "?"}`
      );

      try {
        await processJob(job, printer);
        await ackSuccess(job.id);
        await sendHeartbeat("printed", null);
        console.log(`[agent] job printed: ${job.id}`);
      } catch (printError) {
        const message = printError instanceof Error ? printError.message : "print_error";
        await ackFailure(job.id, message, true);
        await sendHeartbeat("retrying", message);
        console.error(`[agent] print failure job=${job.id}: ${message}`);
      }
    } catch (loopError) {
      const message = loopError instanceof Error ? loopError.message : "loop_error";
      console.error(`[agent] loop error: ${message}`);
      await sleep(CLAIM_INTERVAL_MS);
    }
  }
}

main().catch((error) => {
  console.error("[agent] fatal:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
