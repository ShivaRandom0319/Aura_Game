import { motion } from 'framer-motion'
import GameCard from '../components/GameCard'
import GlowingButton from '../components/GlowingButton'
import StarsBackground from '../components/StarsBackground'

function LobbyPlaceholderPage({ onBack }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-6 py-7 text-white">
      <StarsBackground />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-3xl items-center justify-center">
        <GameCard className="w-full text-center">
          <motion.h1
            className="text-4xl font-black tracking-normal text-white md:text-5xl"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            Lobby coming next
          </motion.h1>
          <div className="mt-7 flex justify-center">
            <GlowingButton variant="secondary" onClick={onBack}>
              Back
            </GlowingButton>
          </div>
        </GameCard>
      </div>
    </main>
  )
}

export default LobbyPlaceholderPage
