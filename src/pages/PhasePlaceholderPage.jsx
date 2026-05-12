import GameCard from '../components/GameCard'
import StarsBackground from '../components/StarsBackground'

function PhasePlaceholderPage({ title, message }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-6 py-7 text-white">
      <StarsBackground />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-3xl items-center justify-center">
        <GameCard className="w-full text-center">
          <h1 className="text-4xl font-black tracking-normal text-white md:text-5xl">
            {title}
          </h1>
          {message && (
            <p className="mt-4 text-base font-semibold text-slate-300">{message}</p>
          )}
        </GameCard>
      </div>
    </main>
  )
}

export default PhasePlaceholderPage
