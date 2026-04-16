export default function LoadingSpinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }
  return (
    <div
      className={`${sizes[size]} ${className} rounded-full border-2 border-navy-200 border-t-navy-700 animate-spin`}
    />
  )
}

export function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <LoadingSpinner size="lg" />
      <p className="text-sm text-gray-500">Chargement…</p>
    </div>
  )
}

export function EmptyState({ icon = '📭', title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-navy-900 mb-2">{title}</h3>
      {description && <p className="text-sm text-gray-500 mb-6 max-w-xs">{description}</p>}
      {action}
    </div>
  )
}
