import Link from "next/link";
import { Montserrat } from "next/font/google";
import { cn } from "@/lib/utils";

type SectionsHeaderProps = {
  active: "como-comprar" | "ajuda";
};

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["700", "800", "900"],
});

export function SectionsHeader({ active }: SectionsHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-orange-600 bg-orange-500">
      <div className="flex w-full flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <Link href="/userprofile/como-comprar" className="leading-none">
          <h1
            className={`${montserrat.className} text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl`}
          >
            Mr <span className="text-white">Smart</span>
          </h1>
        </Link>

        <nav className="flex items-center gap-6 sm:gap-8">
          <Link
            href="/userprofile/como-comprar"
            className={cn(
              "text-lg font-semibold text-zinc-950 transition hover:opacity-80",
              active === "como-comprar"
                ? "underline decoration-2 underline-offset-8"
                : ""
            )}
          >
            Como comprar
          </Link>
          <Link
            href="/userprofile/ajuda"
            className={cn(
              "text-lg font-semibold text-zinc-950 transition hover:opacity-80",
              active === "ajuda"
                ? "underline decoration-2 underline-offset-8"
                : ""
            )}
          >
            Ajuda
          </Link>
        </nav>
      </div>
    </header>
  );
}
