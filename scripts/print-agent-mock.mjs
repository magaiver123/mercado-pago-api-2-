#!/usr/bin/env node

/**
 * Mock de agente de impressao para testes locais.
 *
 * Uso:
 *   DEVICE_ID=SEU_DEVICE_ID API_BASE_URL=http://localhost:3000 node scripts/print-agent-mock.mjs
 */

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";
const DEVICE_ID = process.env.DEVICE_ID;
const AGENT_ID = process.env.AGENT_ID || "mock-agent-local";
const AGENT_VERSION = process.env.AGENT_VERSION || "mock-1.0.0";
const CLAIM_INTERVAL_MS = Number(process.env.CLAIM_INTERVAL_MS || 2500);
const PRINT_DELAY_MS = Number(process.env.PRINT_DELAY_MS || 800);

if (!DEVICE_ID) {
  console.error("Missing DEVICE_ID env var");
  process.exit(1);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
    const message = data?.error || `HTTP ${response.status}`;
    throw new Error(`${path}: ${message}`);
  }

  return data;
}

async function sendHeartbeat() {
  return postJson("/api/print/agent/heartbeat", {
    deviceId: DEVICE_ID,
    status: "online",
    error: null,
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

async function run() {
  console.log(`[mock-agent] started for device ${DEVICE_ID}`);
  await sendHeartbeat();

  // heartbeat loop
  setInterval(async () => {
    try {
      await sendHeartbeat();
    } catch (error) {
      console.error("[mock-agent] heartbeat error:", error.message);
    }
  }, 10000);

  while (true) {
    try {
      const data = await claimNextJob();
      if (!data?.hasJob || !data?.job) {
        await sleep(CLAIM_INTERVAL_MS);
        continue;
      }

      const { job, printer } = data;
      console.log(
        `[mock-agent] print job ${job.id} order=${job.orderId} printer=${printer?.model} ${printer?.ip}:${printer?.port}`
      );

      // Simula tempo de impressao.
      await sleep(PRINT_DELAY_MS);

      // Simulacao de erro opcional:
      // if (job.attempts < 2) throw new Error("simulated printer timeout");

      await ackSuccess(job.id);
      console.log(`[mock-agent] ack success ${job.id}`);
    } catch (error) {
      console.error("[mock-agent] loop error:", error.message);
      await sleep(CLAIM_INTERVAL_MS);

      // Se houver ID de job no futuro, podemos enviar ack-failure aqui.
      // Mantido intencionalmente simples para uso de homologacao inicial.
      if (false) {
        await ackFailure("job-id", error.message, true);
      }
    }
  }
}

run().catch((error) => {
  console.error("[mock-agent] fatal:", error.message);
  process.exit(1);
});
