'use client'

import { useEffect, useRef } from 'react'
import MessageBubble from './MessageBubble'

export default function ChatWindow({ messages, isLoading, onDrillDown }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const suggestions = [
    'Show dormant accounts by state as a pie chart',
    'Top 10 ISINs by holding value as a bar chart',
    'Show account distribution by segment and gender',
    'Branch-wise active account count',
  ]

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="chat-area">
        <div className="chat-empty">
          <div className="chat-empty-logo">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" fill="var(--accent-blue)" />
              <path d="M2 17l10 5 10-5" stroke="var(--accent-blue)" strokeWidth="2" strokeLinecap="round" />
              <path d="M2 12l10 5 10-5" stroke="var(--accent-blue)" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h2>CDSL Analytics Assistant</h2>
          <p>Ask questions about CDSL securities data. Charts are interactive — click any segment to drill down.</p>
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

  const lastMsg = messages[messages.length - 1]
  const isLastAgentThinking =
    isLoading && lastMsg?.role === 'agent' && lastMsg?.text === ''

  return (
    <div className="chat-area">
      {messages.map((msg, idx) => {
        const isLastMessage = idx === messages.length - 1
        const showThinking = isLastMessage && isLastAgentThinking

        if (showThinking) {
          return (
            <MessageBubble
              key={idx}
              role="agent"
              text=""
              isThinking={true}
              onDrillDown={onDrillDown}
            />
          )
        }

        return (
          <MessageBubble
            key={idx}
            role={msg.role}
            text={msg.text}
            isThinking={false}
            onDrillDown={onDrillDown}
          />
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}
