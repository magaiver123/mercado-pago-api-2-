import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  CreditCard,
  Fingerprint,
  LockKeyhole,
  QrCode,
  ReceiptText,
  ShieldCheck,
  ShoppingBasket,
  Smartphone,
  Sparkles,
  TerminalSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import styles from "./page.module.css";

type PurchaseStep = {
  number: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

const purchaseSteps: PurchaseStep[] = [
  {
    number: "01",
    title: "Cadastre-se pelo celular",
    description:
      "Escaneie o QR Code, preencha nome, CPF, telefone, e-mail e senha.",
    icon: Smartphone,
  },
  {
    number: "02",
    title: "Chegue no totem e se identifique",
    description:
      "Toque em iniciar compra e informe seu CPF para acessar sua conta na hora.",
    icon: Fingerprint,
  },
  {
    number: "03",
    title: "Escolha os produtos no menu",
    description:
      "Navegue com calma, monte seu pedido e ajuste quantidades com poucos toques.",
    icon: ShoppingBasket,
  },
  {
    number: "04",
    title: "Revise o resumo do pedido",
    description:
      "Confira os itens, o valor total e siga para pagamento sem surpresa no final.",
    icon: ReceiptText,
  },
  {
    number: "05",
    title: "Selecione a forma de pagamento",
    description:
      "Pague com cartão de crédito, débito ou Pix direto no fluxo do terminal.",
    icon: CreditCard,
  },
  {
    number: "06",
    title: "Finalize e acompanhe o status",
    description:
      "Após confirmar, o sistema informa o andamento e mostra o resultado da compra.",
    icon: BadgeCheck,
  },
];

const securityItems = [
  {
    title: "Dados protegidos",
    description:
      "Suas informações passam por boas práticas de proteção durante todo o processo.",
    icon: ShieldCheck,
  },
  {
    title: "Confirmação em cada etapa",
    description:
      "Antes de concluir, você sempre visualiza pedido, forma de pagamento e valor total.",
    icon: LockKeyhole,
  },
  {
    title: "Fluxo claro e transparente",
    description:
      "Você acompanha o status do pagamento em tempo real até a finalização.",
    icon: Sparkles,
  },
] as const;

const paymentMethods = ["Crédito", "Débito", "Pix"] as const;

function getDelayClass(index: number) {
  const delays = [styles.delay0, styles.delay1, styles.delay2, styles.delay3];
  return delays[index % delays.length];
}

export default function UserProfileLandingPage() {
  return (
    <main className={`min-h-screen text-foreground ${styles.page}`}>
      <div className={styles.gridOverlay} aria-hidden />
      <div className={styles.bgGlowLeft} aria-hidden />
      <div className={styles.bgGlowRight} aria-hidden />

      <header className="sticky top-0 z-50 border-b border-border/80 bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/userprofile" className="flex items-center gap-3">
            <Image
              src="/logo.svg"
              alt="Logo Mr Smart"
              width={44}
              height={44}
              className="h-11 w-11 object-contain"
              priority
            />
            <div className="leading-tight">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Autoatendimento
              </p>
              <p className="text-lg font-bold">
                Mr <span className="text-primary">Smart</span>
              </p>
            </div>
          </Link>

          <Link href="/userprofile/login">
            <Button variant="outline" className={styles.outlineButton}>
              Entrar
            </Button>
          </Link>
        </div>
      </header>

      <section className="relative px-4 pb-16 pt-14 md:pt-20">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.18fr_0.82fr]">
          <div className={`${styles.reveal} ${styles.delay0}`}>
            <span className={styles.kicker}>
              <QrCode className="h-4 w-4" />
              Cadastro rápido pelo celular
            </span>

            <h1 className="mt-5 text-balance text-4xl font-bold leading-tight text-foreground sm:text-5xl">
              Entenda o passo a passo para comprar no totem sem complicação
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Aqui você vê exatamente como funciona: cadastro, identificação,
              seleção dos produtos, pagamento e finalização. Tudo explicado de
              forma simples para você começar com confiança.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/userprofile/cadastro">
                <Button size="lg" className={styles.primaryButton}>
                  Criar conta agora
                </Button>
              </Link>

              <Link href="/userprofile/login">
                <Button
                  size="lg"
                  variant="outline"
                  className={styles.outlineButton}
                >
                  Já tenho conta
                </Button>
              </Link>
            </div>

            <p className="mt-4 text-sm text-muted-foreground">
              Leva menos de 1 minuto para se cadastrar.
            </p>
          </div>

          <div className={`${styles.reveal} ${styles.delay1}`}>
            <article className={styles.heroPanel}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">
                  Fluxo completo da compra
                </p>
                <span className={styles.badgePill}>6 etapas</span>
              </div>

              <ul className="mt-5 space-y-3">
                <li className={styles.heroListItem}>
                  <Smartphone className="h-4 w-4 text-primary" />
                  Cadastro no celular
                </li>
                <li className={styles.heroListItem}>
                  <TerminalSquare className="h-4 w-4 text-primary" />
                  Identificação no totem
                </li>
                <li className={styles.heroListItem}>
                  <CreditCard className="h-4 w-4 text-primary" />
                  Pagamento com crédito, débito ou Pix
                </li>
              </ul>

              <div className={styles.securityStripe}>
                <ShieldCheck className="h-4 w-4" />
                Ambiente com foco em segurança e transparência
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="relative px-4 pb-10">
        <div className="mx-auto w-full max-w-6xl">
          <div className={`${styles.sectionHeader} ${styles.reveal} ${styles.delay0}`}>
            <h2 className="text-3xl font-bold sm:text-4xl">
              Como comprar no totem, do cadastro à finalização
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Esse é o fluxo real da experiência. Você sabe exatamente o que vai
              acontecer em cada etapa e compra com mais tranquilidade.
            </p>
          </div>

          <div className={styles.stepList}>
            {purchaseSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <article
                  key={step.number}
                  className={`${styles.stepCard} ${styles.reveal} ${getDelayClass(index + 1)}`}
                >
                  <div className={styles.stepIconWrap}>
                    <span className={styles.stepNumber}>{step.number}</span>
                    <Icon className="h-5 w-5 text-primary" />
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {step.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 py-10">
        <div className="mx-auto w-full max-w-6xl">
          <div className={`${styles.sectionHeader} ${styles.reveal} ${styles.delay1}`}>
            <h2 className="text-3xl font-bold sm:text-4xl">Segurança e confiança</h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Nosso foco é te deixar confortável para usar o sistema desde o
              primeiro acesso.
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {securityItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className={`${styles.securityCard} ${styles.reveal} ${getDelayClass(index + 2)}`}
                >
                  <div className={styles.securityIcon}>
                    <Icon className="h-5 w-5 text-success" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 pt-4">
        <div className="mx-auto w-full max-w-6xl">
          <article className={`${styles.ctaPanel} ${styles.reveal} ${styles.delay2}`}>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className={styles.ctaKicker}>Pagamento aceito no fluxo</p>
                <h2 className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">
                  Cadastro feito, compra liberada
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Assim que sua conta estiver pronta, você já pode iniciar o
                  pedido no totem e pagar da forma que preferir.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {paymentMethods.map((method) => (
                    <span key={method} className={styles.methodChip}>
                      {method}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/userprofile/cadastro">
                  <Button size="lg" className={styles.primaryButton}>
                    Quero me cadastrar
                  </Button>
                </Link>
                <Link href="/userprofile/login">
                  <Button
                    size="lg"
                    variant="outline"
                    className={styles.outlineButton}
                  >
                    Entrar agora
                  </Button>
                </Link>
              </div>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
