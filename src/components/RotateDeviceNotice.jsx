import { motion } from 'framer-motion'

function RotateDeviceNotice() {
  return (
    <motion.div
      className="fixed inset-0 z-50 hidden items-center justify-center bg-slate-950 px-6 text-center text-white portrait:flex md:!hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <div className="max-w-sm rounded-3xl border border-cyan-200/25 bg-slate-900/80 p-7 shadow-[0_0_34px_rgba(34,211,238,0.2)]">
        <p className="text-2xl font-black leading-tight text-cyan-100">
          Please rotate your phone for the best experience.
        </p>
        <p className="mt-3 text-sm font-semibold text-slate-300">
          Aura is designed for landscape gameplay.
        </p>
      </div>
    </motion.div>
  )
}

export default RotateDeviceNotice
