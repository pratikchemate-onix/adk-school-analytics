'use client'

import { useEffect, useRef } from 'react'
import MessageBubble from './MessageBubble'

export default function ChatWindow({ messages, isLoading }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px',
        background: '#fafafa',
      }}
    >
      {messages.length === 0 && (
        <div style={{ textAlign: 'center', color: '#666', marginTop: '100px' }}>
          <p style={{ fontSize: '18px', marginBottom: '8px' }}>
            Ask a question about CDSL securities data
          </p>
          <p style={{ fontSize: '14px' }}>
            Try: &quot;Show dormant accounts by branch state as a chart&quot;
          </p>
        </div>
      )}

      {messages.map((msg, idx) => (
        <MessageBubble key={idx} role={msg.role} text={msg.text} />
      ))}

      {isLoading && messages[messages.length - 1]?.role !== 'agent' && (
        <div style={{ textAlign: 'center', padding: '16px', color: '#666' }}>
          Thinking...
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
