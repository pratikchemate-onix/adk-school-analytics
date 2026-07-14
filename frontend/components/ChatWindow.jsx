'use client'

import { useEffect, useRef } from 'react'
import MessageBubble from './MessageBubble'

export default function ChatWindow({ messages, isLoading }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const suggestions = [
    'Show dormant accounts by branch state as a chart',
    'Top 10 ISINs by holding value',
    'Branch-wise account distribution',
  ]

  if (messages.length === 0) {
    return (
      <div className="chat-area">
        <div className="chat-empty">
          <h2>CDSL Analytics Assistant</h2>
          <p>Ask questions about CDSL securities data in natural language. I'll query BigQuery and visualize the results.</p>
          <div className="suggestion-chips">
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                className="suggestion-chip"
                onClick={() => {
                  const event = new CustomEvent('suggestion-click', {
                    detail: suggestion,
                  })
                  window.dispatchEvent(event)
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
        <div ref={bottomRef} />
      </div>
    )
  }

  return (
    <div className="chat-area">
      {messages.map((msg, idx) => (
        <MessageBubble key={idx} role={msg.role} text={msg.text} />
      ))}
      {isLoading && messages[messages.length - 1]?.role !== 'agent' && (
        <div className="loading-indicator">
          <div className="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span>Thinking...</span>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
