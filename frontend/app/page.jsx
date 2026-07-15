'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { getUserId, createSession, streamMessage } from '@/lib/adkClient'
import ChatWindow from '@/components/ChatWindow'
import ChatInput from '@/components/ChatInput'
import Sidebar from '@/components/Sidebar'

export default function Home() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const [userId, setUserId] = useState(null)
  const [theme, setTheme] = useState('dark')
  // Drill-down breadcrumb trail: array of { label, prompt }
  const [drillPath, setDrillPath] = useState([])
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const uid = getUserId()
    setUserId(uid)

    createSession(uid).then((sid) => {
      setSessionId(sid)
    })

    const savedTheme = localStorage.getItem('theme') || 'dark'
    setTheme(savedTheme)
    document.documentElement.setAttribute('data-theme', savedTheme)

    const handleSuggestion = (e) => {
      setInput(e.detail)
    }
    window.addEventListener('suggestion-click', handleSuggestion)
    return () => window.removeEventListener('suggestion-click', handleSuggestion)
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('theme', newTheme)
  }

  const handleNewChat = () => {
    setMessages([])
    setDrillPath([])
    if (userId) {
      createSession(userId).then((sid) => {
        setSessionId(sid)
      })
    }
  }

  // Core send function — accepts an explicit message override for drill-down
  const sendMessage = useCallback((messageText) => {
    if (!messageText.trim() || isLoading || !sessionId) return

    // Add user message + empty agent placeholder atomically so index is stable
    let agentIdx = -1
    setMessages((prev) => {
      agentIdx = prev.length + 1 // user msg at prev.length, agent at prev.length+1
      return [
        ...prev,
        { role: 'user', text: messageText },
        { role: 'agent', text: '' },
      ]
    })

    setIsLoading(true)

    streamMessage(
      userId,
      sessionId,
      messageText,
      (chunk) => {
        setMessages((current) => {
          if (agentIdx < 0 || agentIdx >= current.length) return current
          const updated = [...current]
          updated[agentIdx] = {
            ...updated[agentIdx],
            text: updated[agentIdx].text + chunk,
          }
          return updated
        })
      },
      () => setIsLoading(false),
      (error) => {
        console.error('Stream error:', error)
        setIsLoading(false)
        setMessages((current) => [
          ...current,
          { role: 'agent', text: `Error: ${error.message}` },
        ])
      }
    )
  }, [isLoading, sessionId, userId])

  const handleSend = async () => {
    if (!input.trim() || isLoading || !sessionId) return
    const userMessage = input.trim()
    setInput('')
    setDrillPath([]) // Reset drill path on new user question
    await sendMessage(userMessage)
  }

  // Called when a user clicks a drillable chart segment
  const handleDrillDown = useCallback((prompt, clickedLabel) => {
    if (isLoading) return
    setDrillPath((prev) => [...prev, { label: clickedLabel, prompt }])
    sendMessage(prompt)
  }, [isLoading, sendMessage])

  // Navigate back in the drill-down breadcrumb trail
  const handleBreadcrumbClick = (index) => {
    const target = drillPath[index]
    if (!target) return
    setDrillPath(drillPath.slice(0, index + 1))
    sendMessage(target.prompt)
  }

  return (
    <div className="app-container">
      <Sidebar
        onNewChat={handleNewChat}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <main className="main-content">
        {/* Drill-down breadcrumb trail */}
        {drillPath.length > 0 && (
          <div className="drill-breadcrumb">
            <button
              className="drill-crumb drill-crumb-root"
              onClick={() => { setDrillPath([]); }}
            >
              Overview
            </button>
            {drillPath.map((crumb, idx) => (
              <span key={idx} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
                <button
                  className={`drill-crumb ${idx === drillPath.length - 1 ? 'drill-crumb-active' : ''}`}
                  onClick={() => handleBreadcrumbClick(idx)}
                >
                  {crumb.label}
                </button>
              </span>
            ))}
          </div>
        )}

        <ChatWindow
          messages={messages}
          isLoading={isLoading}
          onDrillDown={handleDrillDown}
        />
        <ChatInput
          input={input}
          setInput={setInput}
          onSend={handleSend}
          disabled={isLoading || !sessionId}
        />
      </main>
    </div>
  )
}
