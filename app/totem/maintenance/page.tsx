"use client";

const BREATHING_LINE_HEIGHTS = [6, 8, 10, 13, 16, 13, 10, 8, 6];
const FLOATING_ZS = [
  { left: "67%", size: "2.4rem", delay: "0s" },
  { left: "76%", size: "1.8rem", delay: "1s" },
  { left: "84%", size: "1.2rem", delay: "2s" },
];

export default function TotemMaintenancePage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white px-6 py-10 text-zinc-900">
      <div className="maintenance-dot-grid pointer-events-none absolute inset-0" />

      <div className="maintenance-arc maintenance-arc-top pointer-events-none" />
      <div className="maintenance-arc maintenance-arc-top-large pointer-events-none" />
      <div className="maintenance-arc maintenance-arc-bottom pointer-events-none" />
      <div className="maintenance-arc maintenance-arc-bottom-large pointer-events-none" />

      <div className="pointer-events-none absolute top-0 left-1/2 h-[3px] w-72 -translate-x-1/2 bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-55" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-[3px] w-72 -translate-x-1/2 bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-55" />

      <section className="relative z-10 flex w-full max-w-3xl flex-col items-center text-center">
        <div className="mb-14 inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-5 py-2">
          <span className="maintenance-badge-dot" />
          <span className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-orange-500">
            Em manutencao
          </span>
        </div>

        <div className="relative mb-12 flex h-64 w-64 items-center justify-center sm:h-72 sm:w-72">
          <span className="maintenance-ring maintenance-ring-1" />
          <span className="maintenance-ring maintenance-ring-2" />
          <span className="maintenance-ring maintenance-ring-3" />

          <span className="pointer-events-none absolute h-52 w-52 rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.16)_0%,transparent_70%)] sm:h-60 sm:w-60" />

          {FLOATING_ZS.map((item) => (
            <span
              key={item.delay}
              className="floating-z absolute top-10 font-extrabold lowercase text-orange-500"
              style={{
                left: item.left,
                fontSize: item.size,
                animationDelay: item.delay,
              }}
            >
              z
            </span>
          ))}

          <span className="sleepy-emoji relative block leading-none" aria-hidden>
            {"\u{1F634}"}
          </span>
        </div>

        <div className="mb-12 flex items-end gap-2">
          {BREATHING_LINE_HEIGHTS.map((height, index) => (
            <span
              key={index}
              className={`maintenance-wave-node ${
                index === Math.floor(BREATHING_LINE_HEIGHTS.length / 2)
                  ? "bg-orange-500"
                  : "bg-orange-300"
              }`}
              style={{
                height,
                animationDelay: `${index * 0.13}s`,
              }}
            />
          ))}
        </div>

        <div className="max-w-2xl">
          <h1 className="text-[clamp(2.1rem,5.2vw,2.9rem)] font-bold leading-tight tracking-[-0.02em] text-zinc-900">
            Maquina cansada,
          </h1>
          <p className="mt-1 text-[clamp(2rem,5vw,2.8rem)] font-light leading-tight tracking-[-0.02em] text-zinc-900">
            voltaremos em instantes.
          </p>
        </div>

        <div className="mt-10 flex items-center gap-3">
          <span className="h-px w-12 bg-gradient-to-r from-transparent to-orange-500" />
          <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
          <span className="h-px w-12 bg-gradient-to-l from-transparent to-orange-500" />
        </div>

        <p className="mt-7 text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
          Aguarde - o sistema esta ativo
        </p>
      </section>

      <div className="absolute bottom-12 z-10 flex items-center justify-center">
        <div className="relative h-0.5 w-28 overflow-hidden rounded-full bg-orange-500/20">
          <span className="loading-scanner absolute inset-y-0 left-0 w-2/5 rounded-full bg-orange-500" />
        </div>
      </div>

      <style jsx>{`
        @keyframes badge-pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.25;
          }
        }

        @keyframes ring-breathe {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.35;
          }
          50% {
            transform: scale(1.25);
            opacity: 0;
          }
        }

        @keyframes emoji-breathe {
          0%,
          100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-14px) scale(1.04);
          }
        }

        @keyframes float-z {
          0%,
          100% {
            transform: translateY(0) translateX(0) scale(0.6);
            opacity: 0;
          }
          30% {
            opacity: 0.9;
          }
          100% {
            transform: translateY(-110px) translateX(28px) scale(0.5);
            opacity: 0;
          }
        }

        @keyframes wave-node {
          0% {
            transform: scaleX(1) scaleY(1);
            opacity: 0.45;
          }
          50% {
            transform: scaleX(0.65) scaleY(1.8);
            opacity: 1;
          }
          100% {
            transform: scaleX(1) scaleY(1);
            opacity: 0.45;
          }
        }

        @keyframes scanner-slide {
          0% {
            transform: translateX(-120%);
          }
          100% {
            transform: translateX(260%);
          }
        }

        .maintenance-dot-grid {
          opacity: 0.3;
          background-image: radial-gradient(
            circle,
            rgba(249, 115, 22, 0.25) 1.2px,
            transparent 1.2px
          );
          background-size: 48px 48px;
          background-position: center;
        }

        .maintenance-arc {
          position: absolute;
          border-radius: 9999px;
          border: 1.5px solid rgba(249, 115, 22, 0.12);
        }

        .maintenance-arc-top {
          top: -180px;
          right: -180px;
          width: 520px;
          height: 520px;
        }

        .maintenance-arc-top-large {
          top: -240px;
          right: -240px;
          width: 680px;
          height: 680px;
          border-width: 1px;
          border-color: rgba(249, 115, 22, 0.06);
        }

        .maintenance-arc-bottom {
          bottom: -180px;
          left: -180px;
          width: 520px;
          height: 520px;
        }

        .maintenance-arc-bottom-large {
          bottom: -240px;
          left: -240px;
          width: 680px;
          height: 680px;
          border-width: 1px;
          border-color: rgba(249, 115, 22, 0.06);
        }

        .maintenance-badge-dot {
          width: 7px;
          height: 7px;
          border-radius: 9999px;
          background: #f97316;
          animation: badge-pulse 1.8s ease-in-out infinite;
        }

        .maintenance-ring {
          position: absolute;
          border-radius: 9999px;
          border: 1px solid rgba(249, 115, 22, 0.35);
          animation: ring-breathe 4s ease-in-out infinite;
          will-change: transform, opacity;
        }

        .maintenance-ring-1 {
          width: 180px;
          height: 180px;
        }

        .maintenance-ring-2 {
          width: 250px;
          height: 250px;
          border-color: rgba(249, 115, 22, 0.2);
          animation-delay: 0.6s;
        }

        .maintenance-ring-3 {
          width: 320px;
          height: 320px;
          border-color: rgba(249, 115, 22, 0.1);
          animation-delay: 1.2s;
        }

        .sleepy-emoji {
          font-size: clamp(5.8rem, 18vw, 9.2rem);
          user-select: none;
          animation: emoji-breathe 4.5s ease-in-out infinite;
          will-change: transform;
        }

        .floating-z {
          line-height: 1;
          user-select: none;
          pointer-events: none;
          animation: float-z 3.5s ease-out infinite;
          will-change: transform, opacity;
        }

        .maintenance-wave-node {
          width: 6px;
          border-radius: 9999px;
          animation: wave-node 2.4s ease-in-out infinite;
          transform-origin: center;
          will-change: transform, opacity;
        }

        .loading-scanner {
          animation: scanner-slide 2.2s ease-in-out infinite;
        }
      `}</style>
    </main>
  );
}
