"use client"

import { useRef } from "react"
import { motion, useInView } from "framer-motion"

export function UserprofileLandingFooter() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })

  return (
    <footer ref={ref} className="border-t border-zinc-800 bg-zinc-950">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center justify-center gap-4"
        >
          <a href="#inicio" className="flex items-center gap-2">
            <img src="/LOGOMR.png" alt="Mr Smart" className="w-9 h-9 object-contain" />
            <span className="font-semibold">
              <span className="text-orange-500">Mr</span>
              <span className="text-white"> Smart</span>
            </span>
          </a>

          <p className="text-sm text-zinc-500">&copy; {new Date().getFullYear()} Mr Smart. Todos os direitos reservados.</p>
        </motion.div>
      </div>
    </footer>
  )
}
