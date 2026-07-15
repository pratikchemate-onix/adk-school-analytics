'use client'

import { useState } from 'react'

export default function Sidebar({ onNewChat, theme, onToggleTheme }) {
  const [chatHistory] = useState([
    { id: 1, title: 'Dormant accounts analysis' },
    { id: 2, title: 'Top holdings by ISIN' },
    { id: 3, title: 'Branch performance metrics' },
  ])

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1>
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 2L2 7L12 12L22 7L12 2Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M2 17L12 22L22 17"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M2 12L12 17L22 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          CDSL Analytics
        </h1>
        <button className="new-chat-btn" onClick={onNewChat}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          New chat
        </button>
      </div>

      {/* sidebar-content and sidebar-footer hidden for now */}
    </aside>
  )
}
