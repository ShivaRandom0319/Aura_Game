import { motion } from 'framer-motion'
import GameCard from '../components/GameCard'
import GlowingButton from '../components/GlowingButton'
import StarsBackground from '../components/StarsBackground'

const rules = [
  'Aura is a multiplayer word guessing game for 3 to 11 players.',
  'There are five rooms to join: Biriyani, Dosa, Ice Cream, Chocolate, and Pizza.',
  'Each round, Crewmates receive a secret word. Impostor(s) do not.',
  'If the total players are 6 or fewer, there will be 1 Impostor.',
  'If the total players are more than 6, there will be 2 Impostors.',
  'Every player gets exactly one turn to type a clue.',
  'The first round is always a Crewmate.',
  'Impostor(s) can type their clue only after the first round, so they must observe carefully and guess the word from others.',
  'After all players finish their turn, discussion begins.',
  'Then everyone votes to identify the Impostor(s).',
  'If the Impostor(s) are correctly identified, Crewmates win.',
  'If not, the Impostor(s) win.',
]

const faqs = [
  {
    answer: 'Codex. Yes, I argued with it a lot.',
    question: 'Which AI was used to build Aura?',
  },
  {
    answer:
      'React, Vite, Tailwind CSS, Framer Motion, Firebase Realtime Database, Netlify.',
    question: 'What tech stack is used?',
  },
  {
    answer:
      'Around 100 words are stored in the database. They are randomly selected for each game.',
    question: 'Where do the words come from?',
  },
  {
    answer: 'There was an attempt. It failed. Reason: bad prompts and skill issue.',
    question: 'Why is there no mobile app?',
  },
  {
    answer:
      'No. There are only five fixed rooms. It is built for personal use and close friends.',
    question: 'Is this for global use?',
  },
]

function AboutPage({ onBack }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-7 py-6 text-white">
      <StarsBackground />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-3rem)] max-w-[92rem] flex-col">
        <div className="mb-4 flex justify-start">
          <GlowingButton variant="secondary" className="min-w-32" onClick={onBack}>
            Back
          </GlowingButton>
        </div>

        <GameCard className="flex flex-1 flex-col p-7 xl:p-8">
          <motion.header
            className="flex flex-col gap-4 text-center lg:text-left"
            initial={{ opacity: 0, x: -18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          >
            <h1 className="text-5xl font-black tracking-normal text-white md:text-6xl">
              ABOUT AURA
            </h1>
            <p className="text-xl font-black text-cyan-100 drop-shadow-[0_0_18px_rgba(34,211,238,0.36)]">
              © Aura by Shiva — Classified multiplayer project
            </p>
          </motion.header>

          <motion.div
            className="mt-8 grid flex-1 gap-7 lg:grid-cols-[1.18fr_0.82fr]"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1, ease: 'easeOut' }}
          >
            <section className="rounded-2xl border border-cyan-200/15 bg-slate-950/45 p-6 shadow-[0_0_24px_rgba(34,211,238,0.1)]">
              <h2 className="text-4xl font-black tracking-normal text-cyan-100">
                RULES
              </h2>
              <div className="mt-6 grid gap-3">
                {rules.map((rule) => (
                  <p
                    key={rule}
                    className="rounded-2xl border border-cyan-200/10 bg-white/5 px-5 py-3 text-base font-semibold leading-7 text-slate-100 xl:text-lg xl:leading-8"
                  >
                    {rule}
                  </p>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-fuchsia-200/15 bg-slate-950/45 p-6 shadow-[0_0_24px_rgba(217,70,239,0.1)]">
              <h2 className="text-4xl font-black tracking-normal text-fuchsia-100">
                FAQ
              </h2>
              <div className="mt-6 space-y-5">
                {faqs.map((faq) => (
                  <div
                    key={faq.question}
                    className="rounded-2xl border border-fuchsia-200/10 bg-white/5 px-5 py-4"
                  >
                    <h3 className="text-lg font-black leading-7 text-white xl:text-xl">
                      {faq.question}
                    </h3>
                    <p className="mt-2 text-base font-semibold leading-7 text-slate-200 xl:text-lg xl:leading-8">
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </motion.div>
        </GameCard>
      </div>
    </main>
  )
}

export default AboutPage
