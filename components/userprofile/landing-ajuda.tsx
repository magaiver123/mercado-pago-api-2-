"use client"

import { useRef } from "react"
import { motion, useInView } from "framer-motion"
import { MessageCircle } from "lucide-react"

const WHATSAPP_URL = "https://wa.me/message/EC3OBFDLFSMTH1"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
    },
  },
}

export function UserprofileLandingAjuda() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section id="ajuda" className="relative py-16 sm:py-24 px-6 sm:px-4 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 pointer-events-none" />

      <div className="relative z-10 max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-4">Vamos te ajudar</h2>
          <p className="text-lg text-zinc-400 max-w-xl mx-auto">Entre em contato conosco atraves das opcoes abaixo.</p>
        </motion.div>

        <motion.div
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="flex justify-center"
        >
          <motion.a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            variants={itemVariants}
            className="relative group w-full max-w-md"
          >
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 md:p-8 transition-all duration-300 hover:border-green-500/50 hover:bg-zinc-900/80 cursor-pointer">
              <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-6 group-hover:bg-green-500/20 transition-colors">
                <MessageCircle className="w-8 h-8 text-green-500" strokeWidth={1.5} />
              </div>

              <h3 className="text-2xl font-semibold text-white mb-3 text-center">WhatsApp</h3>
              <p className="text-zinc-400 leading-relaxed text-center mb-6">
                Fale diretamente com nossa equipe pelo WhatsApp. Estamos prontos para ajudar.
              </p>

              <div className="flex justify-center">
                <span className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 text-white font-medium rounded-full group-hover:bg-green-600 transition-colors">
                  <MessageCircle className="w-5 h-5" />
                  Iniciar conversa
                </span>
              </div>
            </div>
          </motion.a>
        </motion.div>
      </div>
    </section>
  )
}
