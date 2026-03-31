"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { getUserprofileAuthUser } from "@/lib/userprofile-auth-store"

type TotemPrinterRecord = {
  id: string
  totem_id: string
  store_id: string
  connection_type: "tcp"
  ip: string
  port: number
  model: string
  escpos_profile: string
  paper_width_mm: number
  is_active: boolean
  last_heartbeat_at: string | null
  last_status: string | null
  last_error: string | null
  agent_version: string | null
}

type TotemWithPrinter = {
  id: string
  status: string
  deviceId: string | null
  maintenanceMode: boolean
  printer: TotemPrinterRecord | null
}

type PrinterDraft = {
  ip: string
  port: string
  model: string
  escposProfile: string
  paperWidthMm: "58" | "76" | "80" | "82"
  isActive: boolean
}

type PrintJob = {
  id: string
  totem_id: string
  order_id: string
  status: string
  attempts: number
  created_at: string
  printed_at: string | null
  last_error: string | null
}

const PROFILE_OPTIONS = [
  { value: "generic", label: "ESC/POS Generico" },
  { value: "bematech-mp4200", label: "Bematech MP-4200 TH" },
]

function defaultDraft(): PrinterDraft {
  return {
    ip: "",
    port: "9100",
    model: "",
    escposProfile: "generic",
    paperWidthMm: "80",
    isActive: true,
  }
}

function mapPrinterToDraft(printer: TotemPrinterRecord | null): PrinterDraft {
  if (!printer) return defaultDraft()
  return {
    ip: printer.ip,
    port: String(printer.port ?? 9100),
    model: printer.model ?? "",
    escposProfile: printer.escpos_profile || "generic",
    paperWidthMm: String(printer.paper_width_mm ?? 80) as "58" | "76" | "80" | "82",
    isActive: printer.is_active !== false,
  }
}

export default function ImpressorasPage() {
  const router = useRouter()
  const [storeSlug, setStoreSlug] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isActivating, setIsActivating] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [totems, setTotems] = useState<TotemWithPrinter[]>([])
  const [jobs, setJobs] = useState<PrintJob[]>([])
  const [drafts, setDrafts] = useState<Record<string, PrinterDraft>>({})
  const [savingByTotem, setSavingByTotem] = useState<Record<string, boolean>>({})
  const [testingByTotem, setTestingByTotem] = useState<Record<string, boolean>>({})
  const [banner, setBanner] = useState<string | null>(null)

  useEffect(() => {
    const user = getUserprofileAuthUser()
    if (!user) {
      router.replace("/userprofile/login")
      return
    }
    if (user.role !== "admin") {
      router.replace("/userprofile/perfil")
      return
    }
  }, [router])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setBanner(null)

    try {
      const [totemsResponse, jobsResponse] = await Promise.all([
        fetch("/api/print/admin/totem-printers", { cache: "no-store" }),
        fetch("/api/print/admin/jobs?limit=30", { cache: "no-store" }),
      ])

      const totemsData = await totemsResponse.json().catch(() => null)
      const jobsData = await jobsResponse.json().catch(() => null)

      if (!totemsResponse.ok) {
        throw new Error(
          totemsData?.error ||
            "Não foi possível carregar configurações. Ative o contexto da loja primeiro.",
        )
      }

      const loadedTotems = Array.isArray(totemsData?.totems)
        ? (totemsData.totems as TotemWithPrinter[])
        : []
      setTotems(loadedTotems)
      setJobs(Array.isArray(jobsData?.jobs) ? (jobsData.jobs as PrintJob[]) : [])

      const nextDrafts: Record<string, PrinterDraft> = {}
      for (const totem of loadedTotems) {
        nextDrafts[totem.id] = mapPrinterToDraft(totem.printer ?? null)
      }
      setDrafts(nextDrafts)
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Erro ao carregar dados de impressão",
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  const activateBypass = async () => {
    setError(null)
    setBanner(null)
    const slug = storeSlug.trim().toLowerCase()
    if (!slug) {
      setError("Informe o slug da loja para ativar o contexto admin.")
      return
    }

    try {
      setIsActivating(true)
      const response = await fetch("/api/totem/admin-bypass/activate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ storeSlug: slug }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error ?? "Não foi possível ativar o contexto admin")
      }

      setBanner("Contexto admin ativado. Carregando impressoras dos totens...")
      await loadData()
    } catch (activationError) {
      setError(
        activationError instanceof Error
          ? activationError.message
          : "Erro ao ativar contexto admin",
      )
    } finally {
      setIsActivating(false)
    }
  }

  const handleDraftChange = (totemId: string, patch: Partial<PrinterDraft>) => {
    setDrafts((current) => ({
      ...current,
      [totemId]: {
        ...(current[totemId] ?? defaultDraft()),
        ...patch,
      },
    }))
  }

  const saveTotemPrinter = async (totemId: string) => {
    const draft = drafts[totemId]
    if (!draft) return

    setSavingByTotem((current) => ({ ...current, [totemId]: true }))
    setError(null)
    setBanner(null)

    try {
      const response = await fetch("/api/print/admin/totem-printers", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          totemId,
          connectionType: "tcp",
          ip: draft.ip,
          port: Number.parseInt(draft.port, 10),
          model: draft.model,
          escposProfile: draft.escposProfile,
          paperWidthMm: Number.parseInt(draft.paperWidthMm, 10),
          isActive: draft.isActive,
        }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error ?? "Falha ao salvar impressora")
      }

      setBanner("Configuração salva com sucesso.")
      await loadData()
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Erro ao salvar impressora",
      )
    } finally {
      setSavingByTotem((current) => ({ ...current, [totemId]: false }))
    }
  }

  const sendTestPrint = async (totemId: string) => {
    setTestingByTotem((current) => ({ ...current, [totemId]: true }))
    setError(null)
    setBanner(null)

    try {
      const response = await fetch("/api/print/admin/test-print", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ totemId }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error ?? "Não foi possível enviar teste")
      }

      setBanner("Teste enviado para a fila de impressão do totem.")
      await loadData()
    } catch (testError) {
      setError(testError instanceof Error ? testError.message : "Erro no teste de impressão")
    } finally {
      setTestingByTotem((current) => ({ ...current, [totemId]: false }))
    }
  }

  const groupedJobs = useMemo(() => {
    const map = new Map<string, PrintJob[]>()
    for (const job of jobs) {
      const bucket = map.get(job.totem_id) ?? []
      bucket.push(job)
      map.set(job.totem_id, bucket)
    }
    return map
  }, [jobs])

  return (
    <main className="min-h-screen bg-[#0f1115] text-white p-4 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-2xl border border-zinc-800 bg-zinc-900/45 p-5">
          <h1 className="text-2xl font-semibold">Impressoras dos Totens (ESC/POS)</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Ative o contexto admin da loja e configure 1 impressora termica por totem.
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="w-full sm:max-w-xs">
              <Label htmlFor="store-slug">Slug da loja</Label>
              <Input
                id="store-slug"
                value={storeSlug}
                onChange={(event) => setStoreSlug(event.target.value)}
                placeholder="ex: minha-loja-centro"
                className="mt-1 bg-zinc-950/50"
              />
            </div>
            <Button onClick={activateBypass} disabled={isActivating}>
              {isActivating ? "Ativando..." : "Ativar contexto admin"}
            </Button>
            <Button variant="outline" onClick={loadData} disabled={isLoading}>
              {isLoading ? "Atualizando..." : "Atualizar dados"}
            </Button>
          </div>
        </header>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {banner && (
          <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm text-orange-200">
            {banner}
          </div>
        )}

        <section className="space-y-4">
          {totems.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/45 p-5 text-sm text-zinc-400">
              Nenhum totem carregado. Ative o contexto da loja e clique em atualizar.
            </div>
          ) : (
            totems.map((totem) => {
              const draft = drafts[totem.id] ?? defaultDraft()
              const isSaving = savingByTotem[totem.id] === true
              const isTesting = testingByTotem[totem.id] === true
              const recentJobs = groupedJobs.get(totem.id) ?? []

              return (
                <article
                  key={totem.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900/45 p-5"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold">Totem {totem.id.slice(0, 8)}</h2>
                      <p className="text-xs text-zinc-400">
                        deviceId: {totem.deviceId ?? "Não vinculado"} | status: {totem.status}
                        {totem.maintenanceMode ? " | manutencao" : ""}
                      </p>
                    </div>
                    <div className="text-xs text-zinc-400">
                      Heartbeat: {totem.printer?.last_heartbeat_at ?? "nunca"}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <Label>IP</Label>
                      <Input
                        value={draft.ip}
                        onChange={(event) =>
                          handleDraftChange(totem.id, { ip: event.target.value })
                        }
                        placeholder="192.168.1.80"
                        className="mt-1 bg-zinc-950/50"
                      />
                    </div>
                    <div>
                      <Label>Porta</Label>
                      <Input
                        value={draft.port}
                        onChange={(event) =>
                          handleDraftChange(totem.id, { port: event.target.value })
                        }
                        placeholder="9100"
                        className="mt-1 bg-zinc-950/50"
                      />
                    </div>
                    <div>
                      <Label>Modelo</Label>
                      <Input
                        value={draft.model}
                        onChange={(event) =>
                          handleDraftChange(totem.id, { model: event.target.value })
                        }
                        placeholder="Bematech MP-4200 TH"
                        className="mt-1 bg-zinc-950/50"
                      />
                    </div>
                    <div>
                      <Label>Perfil ESC/POS</Label>
                      <select
                        value={draft.escposProfile}
                        onChange={(event) =>
                          handleDraftChange(totem.id, {
                            escposProfile: event.target.value,
                          })
                        }
                        className="mt-1 h-10 w-full rounded-md border border-zinc-700 bg-zinc-950/60 px-3 text-sm"
                      >
                        {PROFILE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label>Largura</Label>
                      <select
                        value={draft.paperWidthMm}
                        onChange={(event) =>
                          handleDraftChange(totem.id, {
                            paperWidthMm: event.target.value as "58" | "76" | "80" | "82",
                          })
                        }
                        className="h-10 rounded-md border border-zinc-700 bg-zinc-950/60 px-3 text-sm"
                      >
                        <option value="58">58mm</option>
                        <option value="76">76mm</option>
                        <option value="80">80mm</option>
                        <option value="82">82mm</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <Label htmlFor={`active-${totem.id}`}>Ativa</Label>
                      <Switch
                        id={`active-${totem.id}`}
                        checked={draft.isActive}
                        onCheckedChange={(checked) =>
                          handleDraftChange(totem.id, { isActive: checked })
                        }
                      />
                    </div>

                    <Button onClick={() => saveTotemPrinter(totem.id)} disabled={isSaving}>
                      {isSaving ? "Salvando..." : "Salvar impressora"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => sendTestPrint(totem.id)}
                      disabled={isTesting}
                    >
                      {isTesting ? "Enviando..." : "Testar impressão"}
                    </Button>
                  </div>

                  {totem.printer?.last_error && (
                    <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                      Último erro: {totem.printer.last_error}
                    </div>
                  )}

                  <div className="mt-4">
                    <h3 className="text-sm font-semibold text-zinc-300">Últimos jobs</h3>
                    {recentJobs.length === 0 ? (
                      <p className="mt-2 text-xs text-zinc-500">
                        Nenhum job recente para este totem.
                      </p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {recentJobs.slice(0, 5).map((job) => (
                          <div
                            key={job.id}
                            className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-2 text-xs text-zinc-300"
                          >
                            <div>Pedido: {job.order_id}</div>
                            <div>
                              Status: {job.status} | Tentativas: {job.attempts}
                            </div>
                            <div>Criado: {job.created_at}</div>
                            {job.last_error ? <div>Erro: {job.last_error}</div> : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              )
            })
          )}
        </section>
      </div>
    </main>
  )
}
