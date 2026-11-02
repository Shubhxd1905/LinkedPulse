import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { countWords } from '@/lib/utils'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
  showCount?: boolean
  maxLength?: number
  showWordCount?: boolean
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, showCount, maxLength, showWordCount, id, value, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-')
    const textValue = typeof value === 'string' ? value : ''
    const charCount = textValue.length
    const wordCount = countWords(textValue)

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          value={value}
          maxLength={maxLength}
          className={cn(
            'w-full rounded-lg border bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm transition-colors',
            'placeholder:text-slate-400 dark:placeholder:text-slate-500',
            'focus:outline-none focus:ring-2 focus:ring-linkedin/30 focus:border-linkedin',
            'disabled:opacity-50 disabled:cursor-not-allowed resize-y',
            error
              ? 'border-red-500 focus:ring-red-500/30 focus:border-red-500'
              : 'border-border hover:border-border-secondary',
            'px-3 py-2.5 min-h-[100px]',
            className
          )}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined}
          {...props}
        />
        <div className="flex items-center justify-between mt-1.5">
          <div>
            {error && (
              <p id={`${textareaId}-error`} className="text-xs text-red-500 font-medium" role="alert">
                {error}
              </p>
            )}
            {hint && !error && (
              <p id={`${textareaId}-hint`} className="text-xs text-slate-400">
                {hint}
              </p>
            )}
          </div>
          <div className="flex gap-3 text-xs text-slate-400">
            {showWordCount && <span>{wordCount} words</span>}
            {showCount && maxLength && (
              <span className={charCount > maxLength * 0.9 ? 'text-amber-500' : ''}>
                {charCount}/{maxLength}
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'
export { Textarea }
export type { TextareaProps }
