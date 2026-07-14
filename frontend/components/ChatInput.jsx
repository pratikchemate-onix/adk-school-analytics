'use client'

export default function ChatInput({ input, setInput, onSend, disabled }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      onSend()
    }
  }

  return (
    <div
      style={{
        padding: '16px 24px',
        borderTop: '1px solid #e0e0e0',
        background: '#fff',
      }}
    >
      <div style={{ display: 'flex', gap: '12px' }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Ask about CDSL data... (Ctrl+Enter to send)"
          style={{
            flex: 1,
            padding: '12px',
            border: '1px solid #ccc',
            borderRadius: '8px',
            fontSize: '14px',
            resize: 'none',
            minHeight: '48px',
            fontFamily: 'inherit',
          }}
        />
        <button
          onClick={onSend}
          disabled={disabled || !input.trim()}
          style={{
            padding: '12px 24px',
            background: disabled || !input.trim() ? '#ccc' : '#0066cc',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            cursor: disabled || !input.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          Send
        </button>
      </div>
    </div>
  )
}
