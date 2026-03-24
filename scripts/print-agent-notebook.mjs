#!/usr/bin/env node

/**
 * Production-grade print agent for ESC/POS queue consumption.
 *
 * Required env:
 * - DEVICE_ID=<device_id do totem cadastrado>
 * - PRINT_AGENT_HMAC_SECRET=<segredo compartilhado com backend>
 *
 * Optional env:
 * - API_BASE_URL=http://localhost:3000
 * - AGENT_ID=notebook-agent-01
 * - AGENT_VERSION=notebook-2.0.0
 * - CLAIM_INTERVAL_MS=2500
 * - HEARTBEAT_INTERVAL_MS=10000
 * - PRINTER_TIMEOUT_MS=7000
 * - DRY_RUN=false
 * - FORCE_PRINTER_OVERRIDE_ENABLED=false
 * - FORCE_PRINTER_IP=
 * - FORCE_PRINTER_PORT=
 * - SAVE_BYTES_PATH=
 * - MOCK_PRINT_DELAY_MS=0
 */

import net from "node:net"
import os from "node:os"
import fs from "node:fs/promises"
import { createHash, createHmac } from "node:crypto"
import { buildReceiptBytes } from "./receipt-print-layout.mjs"

function parsePositiveInt(value, fallback, min = 1, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(String(value ?? ""), 10)
  if (!Number.isFinite(parsed)) return fallback
  if (parsed < min || parsed > max) return fallback
  return parsed
}

function normalizeApiBaseUrl(value) {
  const raw = String(value || "http://localhost:3000").trim()
  let url
  try {
    url = new URL(raw)
  } catch {
    throw new Error("API_BASE_URL invalida.")
  }

  if (!url.protocol.startsWith("http")) {
    throw new Error("API_BASE_URL deve usar http ou https.")
  }

  return url.toString().replace(/\/+$/, "")
}

let API_BASE_URL = ""
try {
  API_BASE_URL = normalizeApiBaseUrl(process.env.API_BASE_URL)
} catch (error) {
  console.error(
    `[agent] ${error instanceof Error ? error.message : "API_BASE_URL invalida."}`,
  )
  process.exit(1)
}
const DEVICE_ID = process.env.DEVICE_ID
const AGENT_SECRET = process.env.PRINT_AGENT_HMAC_SECRET
const AGENT_ID = process.env.AGENT_ID || `notebook-${os.hostname().replace(/[^\w-]/g, "")}`
const AGENT_VERSION = process.env.AGENT_VERSION || "notebook-2.0.0"
const CLAIM_INTERVAL_MS = parsePositiveInt(process.env.CLAIM_INTERVAL_MS, 2500, 300, 60000)
const HEARTBEAT_INTERVAL_MS = parsePositiveInt(process.env.HEARTBEAT_INTERVAL_MS, 10000, 500, 120000)
const PRINTER_TIMEOUT_MS = parsePositiveInt(process.env.PRINTER_TIMEOUT_MS, 7000, 1000, 120000)
const DRY_RUN = String(process.env.DRY_RUN || "false").toLowerCase() === "true"
const FORCE_PRINTER_OVERRIDE_ENABLED =
  String(process.env.FORCE_PRINTER_OVERRIDE_ENABLED || "false").toLowerCase() === "true"
const FORCE_PRINTER_IP = process.env.FORCE_PRINTER_IP || ""
const FORCE_PRINTER_PORT = process.env.FORCE_PRINTER_PORT
  ? parsePositiveInt(process.env.FORCE_PRINTER_PORT, Number.NaN, 1, 65535)
  : null
const SAVE_BYTES_PATH = process.env.SAVE_BYTES_PATH || ""
const MOCK_PRINT_DELAY_MS = parsePositiveInt(process.env.MOCK_PRINT_DELAY_MS, 0, 0, 120000)

if (!DEVICE_ID) {
  console.error("[agent] Missing DEVICE_ID env var.")
  process.exit(1)
}

if (!AGENT_SECRET) {
  console.error("[agent] Missing PRINT_AGENT_HMAC_SECRET env var.")
  process.exit(1)
}

if (FORCE_PRINTER_OVERRIDE_ENABLED && (!FORCE_PRINTER_IP || !FORCE_PRINTER_PORT)) {
  console.error("[agent] FORCE_PRINTER_OVERRIDE_ENABLED=true requires FORCE_PRINTER_IP and FORCE_PRINTER_PORT.")
  process.exit(1)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function nowIso() {
  return new Date().toISOString()
}

function sha256Hex(value) {
  return createHash("sha256").update(value).digest("hex")
}

function signRequest({ method, path, timestamp, bodyString }) {
  const bodyHash = sha256Hex(bodyString)
  const message = `${timestamp}\n${method.toUpperCase()}\n${path}\n${bodyHash}`
  return createHmac("sha256", AGENT_SECRET).update(message).digest("hex")
}

function buildAgentHeaders(path, method, bodyString) {
  const timestamp = String(Date.now())
  const signature = signRequest({
    method,
    path,
    timestamp,
    bodyString,
  })

  return {
    "Content-Type": "application/json",
    "x-print-agent-id": AGENT_ID,
    "x-print-agent-version": AGENT_VERSION,
    "x-print-agent-ts": timestamp,
    "x-print-agent-signature": signature,
  }
}

async function postJson(path, body) {
  const method = "POST"
  const bodyString = JSON.stringify(body)
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: buildAgentHeaders(path, method, bodyString),
    body: bodyString,
  })

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const code = data?.code || `HTTP_${response.status}`
    const message = data?.error || `HTTP ${response.status}`
    const error = new Error(`${path}: ${message}`)
    error.code = code
    error.retryable = data?.retryable
    throw error
  }

  return data
}

async function sendHeartbeat(status = "online", error = null) {
  return postJson("/api/print/agent/heartbeat", {
    deviceId: DEVICE_ID,
    agentId: AGENT_ID,
    status,
    error,
    agentVersion: AGENT_VERSION,
    runtime: {
      at: nowIso(),
      dryRun: DRY_RUN,
      hostname: os.hostname(),
    },
  })
}

async function claimNextJob() {
  return postJson("/api/print/agent/claim-next-job", {
    deviceId: DEVICE_ID,
    agentId: AGENT_ID,
    agentVersion: AGENT_VERSION,
  })
}

async function ackSuccess(jobId) {
  return postJson("/api/print/agent/ack-success", {
    deviceId: DEVICE_ID,
    agentId: AGENT_ID,
    jobId,
  })
}

async function ackFailure(jobId, failure) {
  return postJson("/api/print/agent/ack-failure", {
    deviceId: DEVICE_ID,
    agentId: AGENT_ID,
    jobId,
    error: failure.message,
    retryable: failure.retryable,
    errorCode: failure.errorCode,
  })
}

function classifyPrintError(error) {
  const message = error instanceof Error ? error.message : String(error ?? "print_error")
  const normalized = message.toLowerCase()
  if (normalized.includes("timeout")) {
    return { message, retryable: true, errorCode: "PRINTER_TCP_TIMEOUT" }
  }
  if (normalized.includes("econnrefused") || normalized.includes("refused")) {
    return { message, retryable: true, errorCode: "PRINTER_CONNECTION_REFUSED" }
  }
  if (normalized.includes("paper") || normalized.includes("sem papel")) {
    return { message, retryable: true, errorCode: "PRINTER_OUT_OF_PAPER" }
  }
  if (normalized.includes("payload")) {
    return { message, retryable: false, errorCode: "RECEIPT_PAYLOAD_INVALID" }
  }
  if (normalized.includes("render")) {
    return { message, retryable: false, errorCode: "ESCPOS_RENDER_ERROR" }
  }
  return { message, retryable: true, errorCode: "API_UNAVAILABLE" }
}

function validateTcpTarget(host, port) {
  if (!host || typeof host !== "string" || host.trim() === "") {
    throw new Error("Printer host is missing.")
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("Printer port is invalid.")
  }
}

function sendBytesTcp({ host, port, data, timeoutMs }) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket()
    let settled = false
    const done = (err) => {
      if (settled) return
      settled = true
      socket.removeAllListeners()
      socket.destroy()
      if (err) reject(err)
      else resolve()
    }

    socket.setTimeout(timeoutMs)
    socket.once("timeout", () => done(new Error("Printer TCP timeout")))
    socket.once("error", (err) => done(err))

    socket.connect(port, host, () => {
      socket.write(data, (writeErr) => {
        if (writeErr) {
          done(writeErr)
          return
        }
        socket.end(() => done())
      })
    })
  })
}

async function processJob(job, printer) {
  const host = FORCE_PRINTER_OVERRIDE_ENABLED ? FORCE_PRINTER_IP : printer?.ip
  const port = FORCE_PRINTER_OVERRIDE_ENABLED ? FORCE_PRINTER_PORT : printer?.port
  validateTcpTarget(host, port)

  if (printer?.connectionType && printer.connectionType !== "tcp") {
    throw new Error(`Unsupported connection type: ${printer.connectionType}`)
  }

  const bytes = buildReceiptBytes(job?.payload, printer)
  if (!Buffer.isBuffer(bytes) || bytes.length === 0) {
    throw new Error("Invalid ESC/POS payload bytes.")
  }

  if (SAVE_BYTES_PATH) {
    await fs.writeFile(SAVE_BYTES_PATH, bytes)
  }

  if (MOCK_PRINT_DELAY_MS > 0) {
    await sleep(MOCK_PRINT_DELAY_MS)
  }

  if (DRY_RUN) {
    console.log(
      `[agent] DRY_RUN print job=${job.id} host=${host} port=${port} bytes=${bytes.length}`,
    )
    return
  }

  await sendBytesTcp({
    host,
    port,
    data: bytes,
    timeoutMs: PRINTER_TIMEOUT_MS,
  })
}

function computeBackoff(currentMs) {
  const base = currentMs <= 0 ? 1000 : Math.min(30000, currentMs * 2)
  const jitter = Math.floor(Math.random() * 500)
  return base + jitter
}

async function main() {
  console.log(`[agent] started device=${DEVICE_ID} agent=${AGENT_ID} api=${API_BASE_URL} dryRun=${DRY_RUN}`)
  if (FORCE_PRINTER_OVERRIDE_ENABLED) {
    console.warn(`[agent] FORCE_PRINTER override enabled -> ${FORCE_PRINTER_IP}:${FORCE_PRINTER_PORT}`)
  }

  let state = "boot"
  let pollIntervalMs = CLAIM_INTERVAL_MS
  let heartbeatIntervalMs = HEARTBEAT_INTERVAL_MS
  let nextHeartbeatAt = 0
  let nextClaimAt = 0
  let backoffMs = 0

  while (true) {
    try {
      const now = Date.now()
      if (state === "boot" || now >= nextHeartbeatAt) {
        state = "heartbeat"
        const heartbeat = await sendHeartbeat("online", null)
        if (typeof heartbeat?.pollIntervalMs === "number") {
          pollIntervalMs = Math.max(500, heartbeat.pollIntervalMs)
        }
        if (typeof heartbeat?.heartbeatIntervalMs === "number") {
          heartbeatIntervalMs = Math.max(1000, heartbeat.heartbeatIntervalMs)
        }
        nextHeartbeatAt = now + heartbeatIntervalMs
      }

      if (now < nextClaimAt) {
        const sleepMs = Math.max(150, Math.min(nextClaimAt - now, 1000))
        await sleep(sleepMs)
        continue
      }

      state = "claim"
      const claim = await claimNextJob()
      backoffMs = 0
      if (typeof claim?.pollIntervalMs === "number") {
        pollIntervalMs = Math.max(500, claim.pollIntervalMs)
      }
      if (typeof claim?.heartbeatIntervalMs === "number") {
        heartbeatIntervalMs = Math.max(1000, claim.heartbeatIntervalMs)
      }

      if (!claim?.hasJob || !claim?.job) {
        nextClaimAt = Date.now() + pollIntervalMs
        continue
      }

      const { job, printer } = claim
      console.log(
        `[agent] claimed job=${job.id} order=${job.orderId} attempts=${job.attempts} printer=${printer?.model || "n/a"} ${printer?.ip || "?"}:${printer?.port || "?"}`,
      )

      try {
        state = "printing"
        await processJob(job, printer)
        const ack = await ackSuccess(job.id)
        if (ack?.applied === false) {
          console.warn(`[agent] ack success ignored job=${job.id} code=${ack?.code}`)
        } else {
          console.log(`[agent] job printed: ${job.id}`)
        }
        await sendHeartbeat("printed", null)
      } catch (printError) {
        const classified = classifyPrintError(printError)
        const ack = await ackFailure(job.id, classified)
        if (ack?.applied === false) {
          console.warn(`[agent] ack failure ignored job=${job.id} code=${ack?.code}`)
        }
        await sendHeartbeat(classified.retryable ? "retrying" : "failed", classified.message)
        console.error(
          `[agent] print failure job=${job.id} code=${classified.errorCode} retryable=${classified.retryable} message=${classified.message}`,
        )
      }

      nextClaimAt = Date.now() + pollIntervalMs
    } catch (loopError) {
      const message = loopError instanceof Error ? loopError.message : String(loopError)
      backoffMs = computeBackoff(backoffMs)
      state = "backoff"
      console.error(`[agent] loop error state=${state}: ${message} | backoff=${backoffMs}ms`)
      await sleep(backoffMs)
      nextClaimAt = Date.now() + backoffMs
      nextHeartbeatAt = Date.now() + Math.min(backoffMs, heartbeatIntervalMs)
    }
  }
}

main().catch((error) => {
  console.error("[agent] fatal:", error instanceof Error ? error.message : String(error))
  process.exit(1)
})
