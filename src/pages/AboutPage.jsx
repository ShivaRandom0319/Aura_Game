import { motion } from 'framer-motion'
import GameCard from '../components/GameCard'
import GlowingButton from '../components/GlowingButton'
import StarsBackground from '../components/StarsBackground'

const rules = [
  'Join using room code ABC123',
  'First player becomes host',
  'Host starts the game',
  'Crewmates see the secret word',
  'Impostors must guess the word',
  'Everyone types one clue',
  'Vote to find the impostor',
]

function AboutPage({ onBack }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-6 py-7 text-white">
      <StarsBackground />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-5xl items-center">
        <GameCard className="grid w-full gap-7 lg:grid-cols-[1.1fr_0.9fr]">
          <motion.section
            className="flex flex-col justify-center"
            initial={{ opacity: 0, x: -18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          >
            <p className="rounded-full border border-cyan-200/20 bg-slate-950/70 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.18)]">
              © Aura by Shiva — Classified multiplayer project
            </p>
            <p className="mt-5 text-sm font-black uppercase tracking-[0.18em] text-cyan-200">
              About Aura
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-normal text-white md:text-5xl">
              Blend in or call them out.
            </h1>
            <p className="mt-5 text-base font-medium leading-8 text-slate-300 md:text-lg">
              Aura is a multiplayer word guessing game. Crewmates receive a secret
              word. Impostors do not know the word and must blend in by guessing
              from others. Each player types one clue. After all rounds, everyone
              votes to find the impostor.
            </p>

            <div className="mt-7">
              <GlowingButton variant="secondary" onClick={onBack}>
                Back
              </GlowingButton>
            </div>
          </motion.section>

          <motion.section
            className="rounded-2xl border border-white/10 bg-white/5 p-5"
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.1, ease: 'easeOut' }}
          >
            <h2 className="text-xl font-black tracking-normal text-cyan-100">
              Simple rules
            </h2>
            <ul className="mt-5 space-y-3">
              {rules.map((rule) => (
                <li
                  key={rule}
                  className="rounded-2xl border border-cyan-200/10 bg-slate-950/45 px-4 py-3 text-sm font-semibold text-slate-200"
                >
                  {rule}
                </li>
              ))}
            </ul>
          </motion.section>
        </GameCard>
      </div>
    </main>
  )
}

export default AboutPage
