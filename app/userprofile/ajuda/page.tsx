import { MessageCircle, ShieldCheck } from "lucide-react";
import { SectionsHeader } from "../_components/sections-header";
import styles from "./page.module.css";

const WHATSAPP_URL = "https://wa.me/5551995881730";

export default function AjudaPage() {
  return (
    <main className={`min-h-screen bg-background ${styles.page}`}>
      <SectionsHeader active="ajuda" />

      <section className="mx-auto w-full max-w-4xl px-4 pb-14 pt-12">
        <article className={styles.helpCard}>
          <p className={styles.kicker}>Ajuda e suporte</p>
          <h1 className="mt-3 text-4xl font-bold text-zinc-900">
            Precisa de ajuda?
          </h1>
          <p className="mt-3 text-base leading-relaxed text-zinc-600">
            Nosso time esta pronto para te atender no WhatsApp.
          </p>

          <div className="mt-6">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.whatsappCard}
            >
              <div className={styles.iconWrap}>
                <MessageCircle className="h-6 w-6 text-white" />
              </div>

              <div className="flex-1">
                <p className="text-sm font-semibold uppercase tracking-[0.09em] text-zinc-500">
                  Suporte via WhatsApp
                </p>
                <p className="mt-1 text-2xl font-bold text-zinc-900">
                  51 99588-1730
                </p>
                <p className="mt-1 text-sm text-zinc-600">
                  Clique para abrir a conversa agora.
                </p>
              </div>
            </a>
          </div>

          <div className={styles.trustHint}>
            <ShieldCheck className="h-5 w-5 text-green-600" />
            Atendimento com foco em orientacao clara e rapida.
          </div>
        </article>
      </section>
    </main>
  );
}
