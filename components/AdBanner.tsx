'use client'

export function AdBanner({ slot, className = '' }: { slot: string; className?: string }) {
  return (
    <div className={`ad-container ${className}`}>
      <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <div className="text-gray-500 text-sm mb-2">Advertisement</div>
        <div className="text-gray-400 text-xs">Ad Slot: {slot}</div>
        <div className="text-gray-400 text-xs mt-2">
          Google AdSense will be integrated here
        </div>
      </div>
    </div>
  )
}
