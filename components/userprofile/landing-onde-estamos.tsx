"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { motion, useInView } from "framer-motion"
import { Loader2, Navigation, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type PublicStore = {
  id: string
  name: string
  addressLine: string
  neighborhood: string | null
  city: string
  state: string
  mapsUrl: string
  visualStatus: "normal" | "manutencao" | "inauguracao"
  visualText: string | null
  overlayActive: boolean
  disableMaps: boolean
}

type ApiStoresResponse = {
  items: PublicStore[]
  cities?: string[]
}

const FETCH_PAGE_SIZE = 1000
const LIST_PAGE_SIZE = 6

function getVisualSashClasses(status: PublicStore["visualStatus"]) {
  if (status === "manutencao") {
    return "border-amber-300/70 bg-amber-400/90 text-zinc-950"
  }

  if (status === "inauguracao") {
    return "border-emerald-300/70 bg-emerald-400/90 text-zinc-950"
  }

  return "border-zinc-600 bg-zinc-700/85 text-zinc-100"
}

export function UserprofileLandingOndeEstamos() {
  const sectionRef = useRef<HTMLElement | null>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })

  const [stores, setStores] = useState<PublicStore[]>([])
  const [cities, setCities] = useState<string[]>([])
  const [listPage, setListPage] = useState(1)
  const [searchInput, setSearchInput] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [cityFilter, setCityFilter] = useState("")
  const [loadingStores, setLoadingStores] = useState(true)
  const [storesError, setStoresError] = useState<string | null>(null)

  const totalListPages = Math.max(1, Math.ceil(stores.length / LIST_PAGE_SIZE))

  const paginatedStores = useMemo(() => {
    const start = (listPage - 1) * LIST_PAGE_SIZE
    return stores.slice(start, start + LIST_PAGE_SIZE)
  }, [stores, listPage])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
      setListPage(1)
    }, 300)

    return () => window.clearTimeout(timeout)
  }, [searchInput])

  useEffect(() => {
    setListPage(1)
  }, [cityFilter])

  useEffect(() => {
    if (listPage > totalListPages) {
      setListPage(totalListPages)
    }
  }, [listPage, totalListPages])

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    async function fetchStores() {
      setLoadingStores(true)
      setStoresError(null)

      try {
        const params = new URLSearchParams({
          page: "1",
          pageSize: String(FETCH_PAGE_SIZE),
        })

        if (debouncedSearch.length > 0) {
          params.set("search", debouncedSearch)
        }

        if (cityFilter.length > 0) {
          params.set("city", cityFilter)
        }

        const response = await fetch(`/api/userprofile/stores?${params.toString()}`, {
          method: "GET",
          signal: controller.signal,
          cache: "no-store",
        })

        if (!response.ok) {
          throw new Error("Falha ao carregar unidades")
        }

        const payload = (await response.json()) as ApiStoresResponse
        if (cancelled) return

        setStores(payload.items ?? [])
        setCities((payload.cities ?? []).filter(Boolean))
      } catch (error) {
        if (cancelled) return
        if ((error as { name?: string }).name === "AbortError") return
        setStores([])
        setStoresError("Não foi possível carregar as unidades agora.")
      } finally {
        if (!cancelled) {
          setLoadingStores(false)
        }
      }
    }

    fetchStores()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [cityFilter, debouncedSearch])

  return (
    <section
      id="onde-estamos"
      ref={sectionRef}
      className="relative py-24 sm:py-32 px-6 sm:px-4 overflow-hidden"
      aria-label="Escolha a unidade mais próxima"
    >
      <div className="absolute inset-0 bg-zinc-950 pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55, delay: 0.05 }}
          className="rounded-3xl border border-zinc-800 bg-zinc-900/45 p-5 sm:p-7"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Escolha a unidade mais próxima</h3>
          </div>

          <p className="mt-3 text-zinc-400">Use os filtros para encontrar rapidamente a unidade ideal.</p>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Buscar por nome, bairro, cidade ou endereço"
                className="h-11 rounded-xl border-zinc-700 bg-zinc-900/80 pl-10 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>

            <select
              value={cityFilter}
              onChange={(event) => setCityFilter(event.target.value)}
              className="h-11 rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 text-zinc-100 outline-none transition-colors focus:border-orange-500"
              aria-label="Filtrar por cidade"
            >
              <option value="">Todas as cidades</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>

          {storesError && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{storesError}</div>
          )}

          <div className="mt-6 min-h-[180px]">
            {loadingStores ? (
              <div className="flex h-[180px] items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/35">
                <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
              </div>
            ) : stores.length === 0 ? (
              <div className="flex h-[180px] items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/35 text-zinc-400">
                Nenhuma unidade encontrada para os filtros selecionados.
              </div>
            ) : (
              <div className="max-h-[620px] overflow-y-auto pr-1 hide-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {paginatedStores.map((store, index) => {
                    const absoluteIndex = (listPage - 1) * LIST_PAGE_SIZE + index + 1

                    return (
                      <article
                        key={store.id}
                        className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/55 p-4 transition-colors hover:border-zinc-700"
                      >
                        {store.overlayActive && store.visualText && (
                          <div className="pointer-events-none absolute inset-0 z-20 rounded-2xl bg-zinc-950/55" aria-hidden="true">
                            <div className="absolute left-1/2 top-1/2 w-[175%] -translate-x-1/2 -translate-y-1/2 rotate-[15deg]">
                              <div
                                className={`flex min-h-12 items-center justify-center border-y px-8 py-3 text-center text-xs font-bold uppercase tracking-[0.16em] shadow-[0_10px_30px_rgba(0,0,0,0.45)] sm:text-sm ${getVisualSashClasses(
                                  store.visualStatus,
                                )}`}
                              >
                                <span className="max-w-full truncate">{store.visualText}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex items-start justify-between gap-3">
                          <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800/80 px-2 text-sm font-semibold text-zinc-200">
                            {String(absoluteIndex).padStart(2, "0")}
                          </span>
                        </div>

                        <h4 className="mt-4 text-xl font-semibold text-white">{store.name}</h4>
                        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                          {store.addressLine}
                          {store.neighborhood ? ` - ${store.neighborhood}` : ""}
                          <br />
                          {store.city} - {store.state}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {store.disableMaps ? (
                            <button
                              type="button"
                              disabled
                              className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-400 cursor-not-allowed"
                            >
                              <Navigation className="h-4 w-4" />
                              Abrir no Maps
                            </button>
                          ) : (
                            <a
                              href={store.mapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600"
                            >
                              <Navigation className="h-4 w-4" />
                              Abrir no Maps
                            </a>
                          )}
                        </div>
                      </article>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {!loadingStores && stores.length > LIST_PAGE_SIZE && (
            <div className="mt-5 flex items-center justify-between gap-3">
              <p className="text-sm text-zinc-400">
                Mostrando {Math.min((listPage - 1) * LIST_PAGE_SIZE + 1, stores.length)}-
                {Math.min(listPage * LIST_PAGE_SIZE, stores.length)} de {stores.length} unidades
              </p>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={listPage <= 1}
                  onClick={() => setListPage((current) => Math.max(1, current - 1))}
                  className="rounded-full border-zinc-700 bg-zinc-900/80 text-zinc-200 hover:bg-zinc-800 hover:text-white disabled:opacity-40"
                >
                  Anterior
                </Button>
                <span className="text-sm text-zinc-400">
                  {listPage}/{totalListPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  disabled={listPage >= totalListPages}
                  onClick={() => setListPage((current) => Math.min(totalListPages, current + 1))}
                  className="rounded-full border-zinc-700 bg-zinc-900/80 text-zinc-200 hover:bg-zinc-800 hover:text-white disabled:opacity-40"
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  )
}
