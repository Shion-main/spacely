import React from 'react'

export function Footer() {
  return (
    <footer className="w-full py-4 mt-auto bg-gray-900 border-t border-gray-800">
      <div className="container mx-auto text-center text-sm text-gray-400">
        &copy; {new Date().getFullYear()} All rights reserved.
      </div>
    </footer>
  )
} 