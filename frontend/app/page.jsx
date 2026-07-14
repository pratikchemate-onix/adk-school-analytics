'use client'

import { useState, useEffect, useRef } from 'react'
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
    if (userId) {
      createSession(userId).then((sid) => {
        setSessionId(sid)
      })
    }
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading || !sessionId) return

    const userMessage = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', text: userMessage }])
    setIsLoading(true)

    setMessages((prev) => [...prev, { role: 'agent', text: '' }])
    const agentMessageIndex = messages.length + 1

    await streamMessage(
      userId,
      sessionId,
      userMessage,
      (chunk) => {
        setMessages((prev) => {
          const updated = [...prev]
          if (updated[agentMessageIndex]) {
            updated[agentMessageIndex] = {
              ...updated[agentMessageIndex],
              text: updated[agentMessageIndex].text + chunk,
            }
          }
          return updated
        })
      },
      () => setIsLoading(false),
      (error) => {
        console.error('Stream error:', error)
        setIsLoading(false)
        setMessages((prev) => [
          ...prev,
          { role: 'agent', text: `Error: ${error.message}` },
        ])
      }
    )
  }

  return (
    <div className="app-container">
      <Sidebar
        onNewChat={handleNewChat}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <main className="main-content">
        <ChatWindow messages={messages} isLoading={isLoading} />
        <ChatInput
          input={input}
          setInput={setInput}
          onSend={handleSend}
          disabled={isLoading || !sessionId}
        />
        <div className="status-bar">
          <div className="status-bar-left">
            <div className={`status-indicator ${isLoading ? 'loading' : ''}`}></div>
            <span>{isLoading ? 'Processing...' : 'Ready'}</span>
          </div>
          <span>{sessionId ? `Session: ${sessionId.slice(0, 8)}...` : 'Connecting...'}</span>
        </div>
      </main>
    </div>
  )
}
