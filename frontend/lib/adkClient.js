function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function getUserId() {
  if (typeof window === 'undefined') return 'ssr-user'
  let uid = localStorage.getItem('cdsl_user_id')
  if (!uid) {
    uid = 'user-' + generateId()
    localStorage.setItem('cdsl_user_id', uid)
  }
  return uid
}

export async function createSession(userId) {
  const res = await fetch('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  })
  if (!res.ok) throw new Error(`Failed to create session: ${res.status}`)
  const data = await res.json()
  return data.id
}

export async function streamMessage(userId, sessionId, message, onChunk, onDone, onError) {
  try {
    const res = await fetch('/api/run_sse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_name: 'app',
        user_id: userId,
        session_id: sessionId,
        new_message: {
          role: 'user',
          parts: [{ text: message }],
        },
      }),
    })

    if (!res.ok) {
      throw new Error(`Request failed: ${res.status}`)
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const raw = line.slice(6).trim()
        if (!raw || raw === '[DONE]') continue

        try {
          const event = JSON.parse(raw)
          const parts = event?.content?.parts
          if (!parts) continue
          for (const part of parts) {
            if (typeof part.text === 'string' && part.text) {
              onChunk(part.text)
            }
          }
        } catch {
          // skip malformed SSE events
        }
      }
    }

    onDone()
  } catch (err) {
    onError(err)
  }
}
