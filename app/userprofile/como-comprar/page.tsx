"use client";

import Image from "next/image";
import { useEffect, type CSSProperties } from "react";
import { CheckCircle2, CreditCard, Fingerprint, ShoppingBasket, UserPlus } from "lucide-react";
import { SectionsHeader } from "../_components/sections-header";
import styles from "./page.module.css";

type DetailStep = {
  title: string;
  description: string;
};

const detailSteps: DetailStep[] = [
  {
    title: "3.1 Escolha os produtos",
    description:
      "Navegue pelas categorias, toque nos itens desejados e monte sua sacola no totem.",
  },
  {
    title: "3.2 Revise seu pedido",
    description:
      "Confira quantidades e total para garantir que esta tudo certo antes de pagar.",
  },
  {
    title: "3.3 Escolha a forma de pagamento",
    description:
      "Selecione credito, debito ou Pix conforme sua preferencia no checkout.",
  },
  {
    title: "3.4 Confirme no terminal",
    description:
      "Finalize a compra no terminal e acompanhe a confirmacao de status na tela.",
  },
];

function revealDelay(index: number): CSSProperties {
  return { "--reveal-delay": `${80 + index * 70}ms` } as CSSProperties;
}

export default function ComoComprarPage() {
  useEffect(() => {
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]")
    );
    if (!elements.length) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    if (!("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.2,
        rootMargin: "0px 0px -8% 0px",
      }
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return (
    <main className={`min-h-screen bg-background ${styles.page}`}>
      <SectionsHeader active="como-comprar" />

      <section className="mx-auto w-full max-w-6xl px-4 pb-10 pt-10">
        <div data-reveal style={revealDelay(0)} className={styles.heroCard}>
          <p className={styles.heroTag}>passo a passo</p>
          <h1 className="mt-3 text-balance text-4xl font-bold text-zinc-900 sm:text-5xl">
            Como comprar no totem
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-zinc-600 sm:text-lg">
            Aqui voce visualiza cada etapa da compra com clareza. Depois e so
            substituir as imagens pelos materiais finais.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-8">
        <article data-reveal style={revealDelay(1)} className={styles.stepCard}>
          <div className={styles.stepRow}>
            <div className={styles.realImageFrame}>
              <Image
                src="/como-comprar-1-min.webp"
                alt="Cadastro pelo app no celular"
                fill
                className="object-cover"
                priority
              />
            </div>
            <div className={styles.stepTextContent}>
              <div className={styles.stepHeader}>
                <div className={styles.stepIcon}>
                  <UserPlus className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-zinc-900">
                    Passo 1: Cadastre-se
                  </h2>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-zinc-600 sm:text-base">
                Faca seu cadastro para liberar o acesso rapido no totem.
                Preencha seus dados com calma e finalize a criacao da conta.
              </p>
            </div>
          </div>
        </article>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-8">
        <article data-reveal style={revealDelay(2)} className={styles.stepCard}>
          <div className={styles.stepRow}>
            <div className={styles.imagePlaceholder}>Imagem do Passo 2</div>
            <div className={styles.stepTextContent}>
              <div className={styles.stepHeader}>
                <div className={styles.stepIcon}>
                  <Fingerprint className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-zinc-900">
                    Passo 2: Acesse sua conta em um totem
                  </h2>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-zinc-600 sm:text-base">
                No totem, informe seu CPF para se identificar e iniciar a jornada.
                Assim, seu atendimento fica mais rapido e personalizado.
              </p>
            </div>
          </div>
        </article>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-16">
        <article data-reveal style={revealDelay(3)} className={styles.stepCard}>
          <div className={styles.stepRow}>
            <div className={styles.imagePlaceholder}>Imagem do Passo 3</div>
            <div className={styles.stepTextContent}>
              <div className={styles.stepHeader}>
                <div className={styles.stepIcon}>
                  <ShoppingBasket className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-zinc-900">
                    Passo 3: Faca sua compra
                  </h2>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-zinc-600 sm:text-base">
                Veja os detalhes 1 por 1 da compra no totem.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {detailSteps.map((detailStep, index) => (
              <article
                key={detailStep.title}
                data-reveal
                style={revealDelay(index + 4)}
                className={styles.detailCard}
              >
                <div className={styles.detailRow}>
                  <div className={styles.imagePlaceholderSmall}>
                    Imagem de {detailStep.title}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-900">
                      {detailStep.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-600">
                      {detailStep.description}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div data-reveal style={revealDelay(8)} className={styles.paymentHint}>
            <CreditCard className="h-5 w-5 text-orange-600" />
            <span>Pagamento aceito: Credito, Debito e Pix.</span>
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </div>
        </article>
      </section>
    </main>
  );
}
