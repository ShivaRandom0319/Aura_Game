import { forwardRef } from 'react'

const TextInput = forwardRef(function TextInput(
  { label, error, className = '', inputClassName = '', id, name, type = 'text', ...props },
  ref,
) {
  const inputId = id ?? name
  const errorId = error && inputId ? `${inputId}-error` : undefined

  return (
    <label className={`block w-full ${className}`} htmlFor={inputId}>
      {label && (
        <span className="mb-2 block text-sm font-semibold uppercase tracking-[0.08em] text-cyan-100/80">
          {label}
        </span>
      )}
      <input
        ref={ref}
        id={inputId}
        name={name}
        type={type}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        className={[
          'w-full rounded-2xl border bg-slate-950/70 px-4 py-3 text-base font-semibold text-white outline-none',
          'placeholder:text-slate-500 transition duration-200',
          error
            ? 'border-rose-300/70 shadow-[0_0_18px_rgba(251,113,133,0.22)] focus:border-rose-200'
            : 'border-cyan-200/25 shadow-[0_0_18px_rgba(34,211,238,0.12)] focus:border-cyan-200/80',
          inputClassName,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      />
      {error && (
        <span id={errorId} className="mt-2 block text-sm font-semibold text-rose-200">
          {error}
        </span>
      )}
    </label>
  )
})

export default TextInput
