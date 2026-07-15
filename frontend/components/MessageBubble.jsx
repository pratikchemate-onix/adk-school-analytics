'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import ChartRenderer from './charts/ChartRenderer'

function ThinkingIndicator() {
  return (
    <div className="thinking-container">
      <div className="thinking-avatar">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 7l10 5 10-5-10-5z" fill="var(--accent-blue)" opacity="0.9" />
          <path d="M2 17l10 5 10-5" stroke="var(--accent-blue)" strokeWidth="2" strokeLinecap="round" />
          <path d="M2 12l10 5 10-5" stroke="var(--accent-blue)" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <div className="thinking-content">
        <div className="thinking-label">Thinking</div>
        <div className="thinking-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  )
}

function CodeBlock({ language, value }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        <span className="code-block-lang">{language?.toUpperCase() || 'CODE'}</span>
        <button className="code-copy-btn" onClick={handleCopy} title="Copy code">
          {copied ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          )}
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={oneDark}
        customStyle={{
          margin: 0,
          borderRadius: '0 0 10px 10px',
          fontSize: '13px',
          padding: '16px',
          background: '#1a1b1e',
        }}
        showLineNumbers={false}
        wrapLines={true}
        wrapLongLines={true}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  )
}

function parseChartBlocks(content) {
  if (!content) return []
  const parts = []
  const chartRegex = /```chart\s*([\s\S]*?)```/g
  let lastIndex = 0
  let match

  while ((match = chartRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'markdown', content: content.slice(lastIndex, match.index) })
    }
    try {
      const chartSpec = JSON.parse(match[1].trim())
      parts.push({ type: 'chart', spec: chartSpec })
    } catch {
      parts.push({ type: 'markdown', content: match[0] })
    }
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < content.length) {
    parts.push({ type: 'markdown', content: content.slice(lastIndex) })
  }

  if (parts.length === 0 && content.trim()) {
    parts.push({ type: 'markdown', content })
  }

  return parts
}

const markdownComponents = {
  code({ node, inline, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '')
    const language = match ? match[1] : ''
    const value = String(children).replace(/\n$/, '')

    if (!inline && (language || value.includes('\n'))) {
      return <CodeBlock language={language} value={value} />
    }

    return (
      <code className="inline-code" {...props}>
        {children}
      </code>
    )
  },
  table({ children }) {
    return (
      <div className="md-table-wrapper">
        <table className="md-table">{children}</table>
      </div>
    )
  },
  thead({ children }) {
    return <thead className="md-thead">{children}</thead>
  },
  th({ children }) {
    return <th className="md-th">{children}</th>
  },
  td({ children }) {
    return <td className="md-td">{children}</td>
  },
  tr({ children }) {
    return <tr className="md-tr">{children}</tr>
  },
  h1({ children }) {
    return <h1 className="md-h1">{children}</h1>
  },
  h2({ children }) {
    return <h2 className="md-h2">{children}</h2>
  },
  h3({ children }) {
    return <h3 className="md-h3">{children}</h3>
  },
  p({ children }) {
    return <p className="md-p">{children}</p>
  },
  ul({ children }) {
    return <ul className="md-ul">{children}</ul>
  },
  ol({ children }) {
    return <ol className="md-ol">{children}</ol>
  },
  li({ children }) {
    return <li className="md-li">{children}</li>
  },
  blockquote({ children }) {
    return <blockquote className="md-blockquote">{children}</blockquote>
  },
  strong({ children }) {
    return <strong className="md-strong">{children}</strong>
  },
  hr() {
    return <hr className="md-hr" />
  },
}

// Drill-down badge shown at the bottom of a drillable chart
function DrillDownHint({ spec }) {
  if (!spec.drill_down) return null
  const { dimension } = spec.drill_down
  return (
    <div className="drill-hint">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        <line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
      </svg>
      Click any segment to drill into <strong>{dimension}</strong> data
    </div>
  )
}

export default function MessageBubble({ role, text, isThinking, onDrillDown }) {
  const isUser = role === 'user'

  if (!isUser && isThinking) {
    return (
      <div className="message-container agent">
        <ThinkingIndicator />
      </div>
    )
  }

  const renderAgentContent = (content) => {
    const parts = parseChartBlocks(content)
    return parts.map((part, idx) => {
      if (part.type === 'chart') {
        return (
          <div key={idx} className="chart-card">
            {/* Chart header */}
            <div className="chart-card-header">
              <div>
                <div className="chart-card-title">{part.spec.title || 'Chart'}</div>
                {part.spec.subtitle && (
                  <div className="chart-card-subtitle">{part.spec.subtitle}</div>
                )}
              </div>
              <div className="chart-type-badge">{part.spec.type?.toUpperCase()}</div>
            </div>

            {/* Chart itself */}
            <div className="chart-body">
              <ChartRenderer spec={part.spec} onDrillDown={onDrillDown} />
            </div>

            {/* Drill-down hint */}
            <DrillDownHint spec={part.spec} />
          </div>
        )
      }
      return (
        <ReactMarkdown
          key={idx}
          remarkPlugins={[remarkGfm]}
          components={markdownComponents}
        >
          {part.content}
        </ReactMarkdown>
      )
    })
  }

  return (
    <div className={`message-container ${role}`}>
      {!isUser && (
        <div className="message-avatar ai-avatar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5z" fill="white" opacity="0.9" />
            <path d="M2 17l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <path d="M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      )}
      <div className={`message-content ${isUser ? 'user-content' : 'agent-content'}`}>
        {isUser ? (
          <span>{text}</span>
        ) : (
          renderAgentContent(text)
        )}
      </div>
      {isUser && (
        <div className="message-avatar user-avatar">
          U
        </div>
      )}
    </div>
  )
}
