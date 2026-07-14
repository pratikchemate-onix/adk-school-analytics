# Track 2: Frontend / Next.js — Interactive Charts with Recharts

**Owner:** Person 2  
**Estimated time:** 3–4 hours  
**Files touched:** Everything inside `frontend/` (new directory — no conflicts with Track 1)  
**Zero overlap with Track 1 — you will not touch `app/agent.py` or `app/bq_tools.py`**

---

## Goal

Build a Next.js frontend with a chat UI that:
1. Connects to the ADK API server (via Next.js API route handlers)
2. Streams agent responses via SSE
3. Parses ` ```chart ` code blocks from agent output
4. Renders interactive charts using Recharts (bar, line, pie, area)

---

## The Shared Contract (Do Not Change)

This JSON format is the interface between Track 1 and Track 2. Both tracks must use exactly this format:

### Bar / Line / Area Charts

```json
{
  "type": "bar",
  "title": "Dormant Accounts by Branch State",
  "x_key": "dp_brnch_state",
  "y_keys": ["dormant_count", "total_balance"],
  "data": [
    { "dp_brnch_state": "MAHARASHTRA", "dormant_count": 142, "total_balance": 980000 },
    { "dp_brnch_state": "DELHI",       "dormant_count": 98,  "total_balance": 670000 }
  ]
}
```

### Pie Charts

```json
{
  "type": "pie",
  "title": "Account Distribution by Tier",
  "name_key": "tier",
  "value_key": "account_count",
  "data": [
    { "tier": "TIER 1", "account_count": 540 },
    { "tier": "TIER 2", "account_count": 310 }
  ]
}
```

---

## Tasks

### Task 2.1 — Scaffold Next.js Project

```bash
cd /home/ashish/adk_agents/adk-school-analytics

npx create-next-app@latest frontend \
  --js \
  --no-typescript \
  --no-tailwind \
  --eslint \
  --app \
  --no-src-dir \
  --no-turbopack \
  --import-alias "@/*"

cd frontend
npm install recharts
```

This creates the `frontend/` directory with the Next.js App Router structure.

---

### Task 2.2 — Configure `next.config.js`

**File:** `frontend/next.config.js`

Replace the entire file with:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

module.exports = nextConfig
```

Note: No proxy configuration needed — API route handlers will proxy to ADK server.

---

### Task 2.3 — Create Environment File

**File:** `frontend/.env.local`

```
ADK_SERVER_URL=http://localhost:8000
```

This is read by the API route handlers. Never exposed to the browser.

---

### Task 2.4 — API Route: Session Creation

**File:** `frontend/app/api/sessions/route.js`

```js
import { NextResponse } from 'next/server'

const ADK_SERVER_URL = process.env.ADK_SERVER_URL || 'http://localhost:8000'

export async function POST(request) {
  try {
    const body = await request.json()
    const { userId } = body

    const response = await fetch(
      `${ADK_SERVER_URL}/apps/app/users/${userId}/sessions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }
    )

    if (!response.ok) {
      return NextResponse.json(
        { error: `ADK error: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
```

---

### Task 2.5 — API Route: SSE Stream Proxy

**File:** `frontend/app/api/run_sse/route.js`

```js
import { NextResponse } from 'next/server'

const ADK_SERVER_URL = process.env.ADK_SERVER_URL || 'http://localhost:8000'

export async function POST(request) {
  try {
    const body = await request.json()

    const response = await fetch(`${ADK_SERVER_URL}/run_sse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `ADK error: ${response.status}` },
        { status: response.status }
      )
    }

    // Pipe the SSE stream through unchanged
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
```

---

### Task 2.6 — ADK Client Library

**File:** `frontend/lib/adkClient.js`

```js
const APP_NAME = 'app'

export function getUserId() {
  if (typeof window === 'undefined') return null
  let userId = localStorage.getItem('cdsl_user_id')
  if (!userId) {
    userId = 'user_' + Math.random().toString(36).substring(2, 15)
    localStorage.setItem('cdsl_user_id', userId)
  }
  return userId
}

export async function createSession(userId) {
  const response = await fetch('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  })
  const data = await response.json()
  return data.id // sessionId
}

export async function streamMessage(userId, sessionId, message, onChunk, onDone, onError) {
  try {
    const response = await fetch('/api/run_sse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_name: APP_NAME,
        user_id: userId,
        session_id: sessionId,
        new_message: {
          role: 'user',
          parts: [{ text: message }],
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // Parse SSE events: "data: {...}\n\n"
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const event = JSON.parse(line.slice(6))
            // Extract text from agent response
            if (event.author === 'cdsl_bigquery_agent' && event.content?.parts) {
              for (const part of event.content.parts) {
                if (part.text) {
                  onChunk(part.text)
                }
              }
            }
          } catch {
            // Ignore parse errors for non-JSON lines
          }
        }
      }
    }

    onDone()
  } catch (error) {
    onError(error)
  }
}
```

---

### Task 2.7 — Root Layout

**File:** `frontend/app/layout.jsx`

Replace the entire file:

```jsx
import './globals.css'

export const metadata = {
  title: 'CDSL Analytics',
  description: 'CDSL securities analytics with natural language queries',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
```

---

### Task 2.8 — Main Chat Page

**File:** `frontend/app/page.jsx`

```jsx
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

    // Add empty agent message that will be filled via streaming
    setMessages((prev) => [...prev, { role: 'agent', text: '' }])
    const agentMessageIndex = messages.length + 1

    await streamMessage(
      userId,
      sessionId,
      userMessage,
      // onChunk: append text to the last message
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
      // onDone
      () => setIsLoading(false),
      // onError
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

  // Mock chart test button (remove before final integration)
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
```

---

### Task 2.9 — Chat Window Component

**File:** `frontend/components/ChatWindow.jsx`

```jsx
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
            Try: "Show dormant accounts by branch state as a chart"
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
```

---

### Task 2.10 — Chat Input Component

**File:** `frontend/components/ChatInput.jsx`

```jsx
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
```

---

### Task 2.11 — Message Bubble Component (Most Important)

**File:** `frontend/components/MessageBubble.jsx`

```jsx
'use client'

import ChartRenderer from './charts/ChartRenderer'

export default function MessageBubble({ role, text }) {
  const isUser = role === 'user'

  const parseContent = (content) => {
    if (!content) return []

    const parts = []
    let remaining = content

    // Parse ```chart blocks
    const chartRegex = /```chart\s*([\s\S]*?)```/g
    let lastIndex = 0
    let match

    while ((match = chartRegex.exec(remaining)) !== null) {
      // Text before the chart block
      if (match.index > lastIndex) {
        const before = remaining.slice(lastIndex, match.index).trim()
        if (before) {
          parts.push({ type: 'text', content: before })
        }
      }

      // The chart JSON
      try {
        const chartSpec = JSON.parse(match[1].trim())
        parts.push({ type: 'chart', spec: chartSpec })
      } catch {
        parts.push({ type: 'text', content: 'Invalid chart JSON' })
      }

      lastIndex = match.index + match[0].length
    }

    // Text after the last chart block
    if (lastIndex < remaining.length) {
      const after = remaining.slice(lastIndex).trim()
      if (after) {
        parts.push({ type: 'text', content: after })
      }
    }

    // If no chart blocks found, return the whole text
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
```

---

### Task 2.12 — Chart Renderer

**File:** `frontend/components/charts/ChartRenderer.jsx`

```jsx
'use client'

import BarChartView from './BarChartView'
import LineChartView from './LineChartView'
import PieChartView from './PieChartView'
import AreaChartView from './AreaChartView'

export default function ChartRenderer({ spec }) {
  if (!spec || !spec.type) {
    return <div style={{ color: 'red' }}>Invalid chart spec: missing type</div>
  }

  switch (spec.type) {
    case 'bar':
      return <BarChartView spec={spec} />
    case 'line':
      return <LineChartView spec={spec} />
    case 'pie':
      return <PieChartView spec={spec} />
    case 'area':
      return <AreaChartView spec={spec} />
    default:
      return <div style={{ color: 'orange' }}>Unknown chart type: {spec.type}</div>
  }
}
```

---

### Task 2.13 — Bar Chart View

**File:** `frontend/components/charts/BarChartView.jsx`

```jsx
'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

const COLORS = ['#0066cc', '#cc3300', '#009933', '#ff9900', '#9933cc', '#00cccc']

export default function BarChartView({ spec }) {
  const { title, x_key, y_keys, data } = spec

  if (!data || data.length === 0) {
    return <div style={{ color: 'red' }}>No data for bar chart</div>
  }

  return (
    <div>
      {title && (
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', textAlign: 'center' }}>
          {title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={x_key} tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{ background: '#fff', border: '1px solid #ccc' }}
          />
          <Legend />
          {y_keys.map((key, idx) => (
            <Bar
              key={key}
              dataKey={key}
              fill={COLORS[idx % COLORS.length]}
              name={key}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
```

---

### Task 2.14 — Line Chart View

**File:** `frontend/components/charts/LineChartView.jsx`

```jsx
'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

const COLORS = ['#0066cc', '#cc3300', '#009933', '#ff9900', '#9933cc', '#00cccc']

export default function LineChartView({ spec }) {
  const { title, x_key, y_keys, data } = spec

  if (!data || data.length === 0) {
    return <div style={{ color: 'red' }}>No data for line chart</div>
  }

  return (
    <div>
      {title && (
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', textAlign: 'center' }}>
          {title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={x_key} tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{ background: '#fff', border: '1px solid #ccc' }}
          />
          <Legend />
          {y_keys.map((key, idx) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={COLORS[idx % COLORS.length]}
              strokeWidth={2}
              dot={{ r: 4 }}
              name={key}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
```

---

### Task 2.15 — Pie Chart View

**File:** `frontend/components/charts/PieChartView.jsx`

```jsx
'use client'

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

const COLORS = ['#0066cc', '#cc3300', '#009933', '#ff9900', '#9933cc', '#00cccc']

export default function PieChartView({ spec }) {
  const { title, name_key, value_key, data } = spec

  if (!data || data.length === 0) {
    return <div style={{ color: 'red' }}>No data for pie chart</div>
  }

  return (
    <div>
      {title && (
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', textAlign: 'center' }}>
          {title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey={value_key}
            nameKey={name_key}
            cx="50%"
            cy="50%"
            outerRadius={100}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: '#fff', border: '1px solid #ccc' }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
```

---

### Task 2.16 — Area Chart View

**File:** `frontend/components/charts/AreaChartView.jsx`

```jsx
'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

const COLORS = ['#0066cc', '#cc3300', '#009933', '#ff9900', '#9933cc', '#00cccc']

export default function AreaChartView({ spec }) {
  const { title, x_key, y_keys, data } = spec

  if (!data || data.length === 0) {
    return <div style={{ color: 'red' }}>No data for area chart</div>
  }

  return (
    <div>
      {title && (
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', textAlign: 'center' }}>
          {title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={x_key} tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{ background: '#fff', border: '1px solid #ccc' }}
          />
          <Legend />
          {y_keys.map((key, idx) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stroke={COLORS[idx % COLORS.length]}
              fill={COLORS[idx % COLORS.length]}
              fillOpacity={0.3}
              name={key}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
```

---

### Task 2.17 — Basic Global Styles

**File:** `frontend/app/globals.css`

Replace with minimal styles:

```css
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

pre {
  background: #f5f5f5;
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
  font-size: 13px;
}

code {
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
}
```

---

### Task 2.18 — Add Makefile Targets

**File:** `Makefile` (root of project, add these to the end)

```makefile
# ==============================================================================
# Frontend Targets
# ==============================================================================

frontend-install:
	cd frontend && npm install

frontend-dev:
	cd frontend && npm run dev
```

---

## Testing Instructions

### Test 1: Install and Start

```bash
cd /home/ashish/adk_agents/adk-school-analytics
make frontend-install
make frontend-dev
```

Open http://localhost:3000

Expected: Chat UI loads, shows "Connecting..." then "Session: xxxxxxxx..."

---

### Test 2: Mock Chart Button

Click the "Test Chart (Mock)" button in the header.

Expected: A bar chart appears in the chat with the mock data.

---

### Test 3: Test All Chart Types

Modify the `testMockChart` function in `page.jsx` to test each chart type:

```js
// Test line chart
const mockChart = {
  type: 'line',
  title: 'Monthly Trend',
  x_key: 'month',
  y_keys: ['count'],
  data: [
    { month: 'Jan', count: 100 },
    { month: 'Feb', count: 120 },
    { month: 'Mar', count: 90 },
  ],
}

// Test pie chart
const mockChart = {
  type: 'pie',
  title: 'Distribution by Tier',
  name_key: 'tier',
  value_key: 'count',
  data: [
    { tier: 'TIER 1', count: 540 },
    { tier: 'TIER 2', count: 310 },
  ],
}

// Test area chart
const mockChart = {
  type: 'area',
  title: 'Cumulative Growth',
  x_key: 'month',
  y_keys: ['total'],
  data: [
    { month: 'Jan', total: 1000 },
    { month: 'Feb', total: 1500 },
    { month: 'Mar', total: 2100 },
  ],
}
```

Expected: Each chart type renders correctly with tooltips on hover.

---

### Test 4: Test with Real Agent (Integration)

Once Track 1 is complete:

```bash
# Terminal 1:
make api-server

# Terminal 2:
make frontend-dev

# Browser: http://localhost:3000
```

Send: "Show dormant accounts by branch state as a chart"

Expected:
1. Text streams in real time
2. SQL query shown
3. Data table shown
4. ` ```chart ` block parsed and rendered as interactive bar chart

---

## What NOT to Do

- Do NOT touch `app/agent.py` or `app/bq_tools.py` (that's Track 1)
- Do NOT change the JSON chart spec format (it's the shared contract)
- Do NOT install additional chart libraries (recharts only)
- Do NOT remove the "Test Chart (Mock)" button until integration is confirmed working

---

## Deliverable Checklist

- [ ] Task 2.1: Next.js project scaffolded
- [ ] Task 2.2: `next.config.js` configured
- [ ] Task 2.3: `.env.local` created
- [ ] Task 2.4: `/api/sessions` route handler created
- [ ] Task 2.5: `/api/run_sse` route handler created
- [ ] Task 2.6: `adkClient.js` created
- [ ] Task 2.7: `layout.jsx` created
- [ ] Task 2.8: `page.jsx` created with mock chart test
- [ ] Task 2.9: `ChatWindow.jsx` created
- [ ] Task 2.10: `ChatInput.jsx` created
- [ ] Task 2.11: `MessageBubble.jsx` created (parses ```chart blocks)
- [ ] Task 2.12: `ChartRenderer.jsx` created
- [ ] Task 2.13: `BarChartView.jsx` created
- [ ] Task 2.14: `LineChartView.jsx` created
- [ ] Task 2.15: `PieChartView.jsx` created
- [ ] Task 2.16: `AreaChartView.jsx` created
- [ ] Task 2.17: `globals.css` updated
- [ ] Task 2.18: Makefile targets added
- [ ] Test 1: Frontend starts successfully
- [ ] Test 2: Mock chart button works
- [ ] Test 3: All 4 chart types render correctly

---

## Integration (Day 2)

Once Track 1 is ready:

```bash
# Remove mock test button from page.jsx (lines 60-76 approximately)
# Just delete the testMockChart function and the button in the header
```

Then run both servers together and test with real queries.
