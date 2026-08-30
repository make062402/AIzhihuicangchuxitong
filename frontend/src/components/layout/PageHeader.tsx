import { ReactNode } from 'react'

interface Props {
  title: string
  description?: string
  actions?: ReactNode
}

export default function PageHeader({ title, description, actions }: Props) {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 border-b bg-card px-4 md:px-6 lg:px-8 py-3 md:py-5">
      <div className="min-w-0">
        <h1 className="font-semibold text-base md:text-xl leading-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground text-xs md:text-sm mt-1 line-clamp-2">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div
          className="
            flex items-center gap-2 overflow-x-auto
            -mx-4 px-4 md:mx-0 md:px-0
            md:flex-wrap md:justify-end
            [&>button]:shrink-0 [&>button]:whitespace-nowrap
          "
        >
          {actions}
        </div>
      )}
    </div>
  )
}
