"use client";

export default function TotemMaintenancePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute -left-32 top-[-6rem] h-80 w-80 rounded-full bg-orange-500/35 blur-3xl" />
      <div className="pointer-events-none absolute -right-36 bottom-[-8rem] h-96 w-96 rounded-full bg-orange-400/25 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(249,115,22,0.35),transparent_55%)]" />

      <section className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-10 text-center">
        <div className="w-full max-w-3xl space-y-8">
          <div className="relative mx-auto flex h-44 w-44 items-center justify-center rounded-full border-2 border-orange-500/80 bg-orange-500/10 shadow-[0_0_55px_rgba(249,115,22,0.35)] sm:h-52 sm:w-52">
            <span className="maintenance-emoji text-[4.8rem] leading-none sm:text-[5.6rem]" aria-hidden>
              {"\u{1F634}"}
            </span>
            <span className="maintenance-zzz absolute -right-3 top-7 text-xl font-black uppercase tracking-[0.3em] text-orange-300 sm:-right-4 sm:top-8 sm:text-2xl">
              zzz
            </span>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.45em] text-orange-300/90">
              Modo manutencao
            </p>
            <h1 className="text-balance text-3xl font-black leading-tight text-white sm:text-5xl">
              A maquina tirou uma pausa rapida para recarregar as energias.
            </h1>
            <p className="mx-auto max-w-2xl text-pretty text-base leading-relaxed text-white/80 sm:text-lg">
              Estamos ajustando os ultimos detalhes para sua experiencia voltar
              ainda mais redonda. Daqui a pouco, esse totem abre os olhos e
              volta com tudo.
            </p>
          </div>

          <div className="mx-auto inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/90 backdrop-blur-sm">
            <span className="maintenance-dot" />
            <span className="maintenance-dot maintenance-dot-delay-1" />
            <span className="maintenance-dot maintenance-dot-delay-2" />
            <span>Atualizamos esta tela automaticamente assim que terminar.</span>
          </div>
        </div>
      </section>

      <div className="maintenance-progress pointer-events-none absolute inset-x-0 bottom-0 h-1.5 bg-gradient-to-r from-orange-500 via-orange-300 to-orange-500" />

      <style jsx>{`
        @keyframes sleepy-float {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(8px) rotate(-4deg);
          }
        }

        @keyframes sleepy-zzz {
          0%,
          100% {
            transform: translateY(0);
            opacity: 0.35;
          }
          45% {
            opacity: 1;
          }
          60% {
            transform: translateY(-12px);
            opacity: 0.9;
          }
        }

        @keyframes dot-pulse {
          0%,
          100% {
            transform: scale(0.8);
            opacity: 0.35;
          }
          50% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes progress-slide {
          0% {
            background-position: 0% 50%;
          }
          100% {
            background-position: 200% 50%;
          }
        }

        .maintenance-emoji {
          display: inline-block;
          animation: sleepy-float 2.9s ease-in-out infinite;
          will-change: transform;
        }

        .maintenance-zzz {
          animation: sleepy-zzz 2.3s ease-in-out infinite;
          will-change: transform, opacity;
        }

        .maintenance-dot {
          height: 0.5rem;
          width: 0.5rem;
          flex: 0 0 auto;
          border-radius: 9999px;
          background: #fb923c;
          animation: dot-pulse 1.3s ease-in-out infinite;
          will-change: transform, opacity;
        }

        .maintenance-dot-delay-1 {
          animation-delay: 0.2s;
        }

        .maintenance-dot-delay-2 {
          animation-delay: 0.4s;
        }

        .maintenance-progress {
          background-size: 220% 100%;
          animation: progress-slide 2.8s linear infinite;
        }
      `}</style>
    </main>
  );
}
