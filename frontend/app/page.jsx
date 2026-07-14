'use client'

import { useState, useEffect, useRef } from 'react'
import { getUserId, createSession, streamMessage } from '@/lib/adkClient'
import ChatWindow from '@/components/ChatWindow'
import ChatInput from '@/components/ChatInput'

export default function Home() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const [userId, setUserId] = useState(null)
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const uid = getUserId()
    setUserId(uid)

    createSession(uid).then((sid) => {
      setSessionId(sid)
    })
  }, [])

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

  const testMockChart = () => {
    const mockChart = {
      type: 'bar',
      title: 'Dormant Accounts by State (Mock)',
      x_key: 'state',
      y_keys: ['count'],
      data: [
        { state: 'MAHARASHTRA', count: 142 },
        { state: 'DELHI', count: 98 },
        { state: 'KARNATAKA', count: 67 },
        { state: 'GUJARAT', count: 54 },
      ],
    }
    setMessages((prev) => [
      ...prev,
      {
        role: 'agent',
        text: 'Here is a mock chart:\n\n```chart\n' + JSON.stringify(mockChart, null, 2) + '\n```\n\nThis is test data.',
      },
    ])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <header
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '20px' }}>CDSL Analytics</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={testMockChart}
            style={{
              padding: '8px 16px',
              background: '#f0f0f0',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Test Chart (Mock)
          </button>
          <span style={{ color: '#666', fontSize: '14px', alignSelf: 'center' }}>
            {sessionId ? `Session: ${sessionId.slice(0, 8)}...` : 'Connecting...'}
          </span>
        </div>
      </header>

      <ChatWindow messages={messages} isLoading={isLoading} />

      <ChatInput
        input={input}
        setInput={setInput}
        onSend={handleSend}
        disabled={isLoading || !sessionId}
      />
    </div>
  )
}
