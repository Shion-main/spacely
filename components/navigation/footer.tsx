import React from 'react'

export function Footer() {
  return (
    <footer className="w-full py-4 mt-auto bg-gray-900 border-t border-gray-800">
      <div className="container mx-auto text-center text-sm text-gray-400 space-x-1">
        <span>&copy; {new Date().getFullYear()} All rights reserved.</span>
        <span>&middot;</span>
        <a href="/terms" className="text-blue-400 hover:text-blue-500 underline">Terms &amp; Conditions</a>
      </div>
    </footer>
  )
} 