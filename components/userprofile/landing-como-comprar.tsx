"use client"

import { useRef } from "react"
import { motion, useInView } from "framer-motion"
import { Monitor, ShoppingBag, UserPlus } from "lucide-react"

const steps = [
  {
    number: "01",
    title: "Cadastre-se",
    description: "Crie sua conta em segundos. Basta informar seu nome, telefone, e-mail, senha e CPF.",
    icon: UserPlus,
  },
  {
    number: "02",
    title: "Acesse o Totem",
    description: "Vá até uma de nossas lojas e faça login no totem usando seu CPF.",
    icon: Monitor,
  },
  {
    number: "03",
    title: "Escolha e Retire",
    description: "Selecione seus produtos, pague no totem e retire na geladeira. Simples assim.",
    icon: ShoppingBag,
  },
]

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

export function UserprofileLandingComoComprar() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section id="como-comprar" className="relative py-16 sm:py-24 px-6 sm:px-4 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-950 pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-4">Como comprar</h2>
          <p className="text-lg text-zinc-400 max-w-xl mx-auto">Em apenas 3 passos, você já pode aproveitar nossos produtos.</p>
        </motion.div>

        <motion.div
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8"
        >
          {steps.map((step) => (
            <motion.div key={step.number} variants={itemVariants} className="relative group">
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 md:p-8 h-full transition-all duration-300 hover:border-orange-500/50 hover:bg-zinc-900/80">
                <span className="text-6xl font-bold text-zinc-800 group-hover:text-orange-500/20 transition-colors">{step.number}</span>

                <div className="w-14 h-14 rounded-xl bg-orange-500/10 flex items-center justify-center mt-4 mb-6 group-hover:bg-orange-500/20 transition-colors">
                  <step.icon className="w-7 h-7 text-orange-500" strokeWidth={1.5} />
                </div>

                <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
                <p className="text-zinc-400 leading-relaxed">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
