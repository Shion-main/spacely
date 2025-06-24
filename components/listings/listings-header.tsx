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

      {/* No Results Message */}
      {totalCount === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No listings found</h3>
          <p className="text-gray-600">
            Try adjusting your search criteria to find more listings.
          </p>
        </div>
      )}
    </div>
  )
} 