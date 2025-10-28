import * as React from "react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

export type TagsInputProps = {
  initialTags?: string[]
  placeholder?: string
  allowDuplicates?: boolean
  className?: string
  onChange?: (tags: string[]) => void
}

export const TagsInput: React.FC<TagsInputProps> = ({
  initialTags = ["Tags", "Input"],
  placeholder = "Add a tag and press Enter",
  allowDuplicates = false,
  className,
  onChange,
}) => {
  const [tags, setTags] = React.useState<string[]>(initialTags)
  const [value, setValue] = React.useState<string>("")

  const inputRef = React.useRef<HTMLInputElement | null>(null)

  const updateTags = React.useCallback(
    (next: string[]) => {
      setTags(next)
      if (onChange) onChange(next)
    },
    [onChange]
  )

  const removeTag = React.useCallback(
    (indexToRemove: number) => {
      updateTags(tags.filter((_, index) => index !== indexToRemove))
    },
    [tags, updateTags]
  )

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const key = event.key
    const trimmed = value.trim()

    if (key === "Enter" && trimmed) {
      const isDuplicate = tags.some(
        (tag) => tag.toLowerCase() === trimmed.toLowerCase()
      )
      if (allowDuplicates || !isDuplicate) {
        updateTags([...tags, trimmed])
      }
      setValue("")
      event.preventDefault()
      return
    }

    if (key === "Backspace" && !trimmed && tags.length > 0) {
      removeTag(tags.length - 1)
      event.preventDefault()
    }
  }

  return (
    <div
      className={cn(
        "flex min-h-10 w-full flex-wrap items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm",
        "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:outline-none ring-offset-background",
        className
      )}
    >
      {tags.map((tag, index) => (
        <span
          key={`${tag}-${index}`}
          className={
            "inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-foreground"
          }
        >
          {tag}
          <button
            type="button"
            aria-label={`Remove ${tag}`}
            onClick={() => removeTag(index)}
            className={
              "rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted-foreground/10 hover:text-foreground"
            }
          >
            ×
          </button>
        </span>
      ))}
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          "min-w-[140px] flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0",
          "placeholder:text-muted-foreground"
        )}
      />
    </div>
  )
}

export default TagsInput


