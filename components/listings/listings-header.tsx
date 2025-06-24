import { Search } from 'lucide-react'

interface ListingsHeaderProps {
  totalCount: number
}

export function ListingsHeader({ totalCount }: ListingsHeaderProps) {
  return (
    <div className="mb-6">
      {/* Main Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Browse Listings
        </h1>
      </div>

      {/* Removed no-results placeholder; now rendered after search bar */}
    </div>
  )
} 