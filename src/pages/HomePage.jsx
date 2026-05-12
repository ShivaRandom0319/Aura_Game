import { motion } from 'framer-motion'
import GlowingButton from '../components/GlowingButton'
import StarsBackground from '../components/StarsBackground'

function HomePage({ onPlay, onAbout }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-6 py-7 text-white">
      <StarsBackground />

      <section className="relative z-10 flex min-h-[calc(100vh-3.5rem)] flex-col">
        <motion.div
          className="mx-auto max-w-4xl pt-4 text-center"
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        >
          <h1 className="text-6xl font-black tracking-normal text-white drop-shadow-[0_0_24px_rgba(34,211,238,0.75)] md:text-8xl">
            Aura
          </h1>
          <p className="mt-4 text-lg font-semibold text-cyan-100/90 md:text-2xl">
            A secret word. Hidden impostors. One suspicious lobby.
          </p>
          <p className="mt-3 text-base font-black uppercase tracking-[0.16em] text-fuchsia-100 drop-shadow-[0_0_16px_rgba(217,70,239,0.45)] md:text-lg">
            Play on laptop. Debate on phone.
          </p>
        </motion.div>

        <motion.div
          className="mx-auto mt-8 flex w-full max-w-5xl flex-1 items-center justify-center"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.12, ease: 'easeOut' }}
        >
          <div className="h-48 w-48 rounded-full border border-cyan-200/20 bg-cyan-200/10 shadow-[0_0_60px_rgba(34,211,238,0.18),inset_0_0_32px_rgba(255,255,255,0.08)] md:h-64 md:w-64" />
        </motion.div>

        <motion.div
          className="grid gap-4 sm:grid-cols-2"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.25, ease: 'easeOut' }}
        >
          <div className="flex justify-start">
            <GlowingButton className="min-w-44" onClick={onPlay}>
              Play
            </GlowingButton>
          </div>
          <div className="flex justify-start sm:justify-end">
            <GlowingButton className="min-w-44" variant="secondary" onClick={onAbout}>
              About
            </GlowingButton>
          </div>
        </motion.div>
      </section>
    </main>
  )
}

export default HomePage
