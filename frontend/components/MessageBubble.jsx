'use client'

import ChartRenderer from './charts/ChartRenderer'

export default function MessageBubble({ role, text }) {
  const isUser = role === 'user'

  const parseContent = (content) => {
    if (!content) return []

    const parts = []
    let remaining = content

    const chartRegex = /```chart\s*([\s\S]*?)```/g
    let lastIndex = 0
    let match

    while ((match = chartRegex.exec(remaining)) !== null) {
      if (match.index > lastIndex) {
        const before = remaining.slice(lastIndex, match.index).trim()
        if (before) {
          parts.push({ type: 'text', content: before })
        }
      }

      try {
        const chartSpec = JSON.parse(match[1].trim())
        parts.push({ type: 'chart', spec: chartSpec })
      } catch {
        parts.push({ type: 'text', content: 'Invalid chart JSON' })
      }

      lastIndex = match.index + match[0].length
    }

    if (lastIndex < remaining.length) {
      const after = remaining.slice(lastIndex).trim()
      if (after) {
        parts.push({ type: 'text', content: after })
      }
    }

    if (parts.length === 0 && content.trim()) {
      parts.push({ type: 'text', content: content.trim() })
    }

    return parts
  }

  const renderPart = (part, idx) => {
    switch (part.type) {
      case 'chart':
        return (
          <div key={idx} style={{ margin: '16px 0' }}>
            <ChartRenderer spec={part.spec} />
          </div>
        )
      case 'text':
        return (
          <div
            key={idx}
            style={{
              whiteSpace: 'pre-wrap',
              lineHeight: '1.6',
            }}
          >
            {part.content}
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: '16px',
      }}
    >
      <div
        style={{
          maxWidth: '80%',
          padding: '12px 16px',
          borderRadius: '12px',
          background: isUser ? '#0066cc' : '#fff',
          color: isUser ? '#fff' : '#333',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        {parseContent(text).map(renderPart)}
      </div>
    </div>
  )
}
