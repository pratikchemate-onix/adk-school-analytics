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

/**
 * Stateful <think>...</think> tag filter for streamed text.
 *
 * Reasoning models (Nemotron, DeepSeek, Qwen, etc.) wrap their chain-of-thought
 * in <think>...</think> tags. Because tags can be split across multiple SSE chunks,
 * we maintain state (insideThink + partial tag buffer) across calls.
 *
 * Also filters parts where part.thought === true (Gemini native thinking tokens).
 */
function createThinkFilter() {
  let insideThink = false
  let holdBuf = ''  // chars held back while we check for a partial opening tag

  return function filter(text) {
    holdBuf += text
    let output = ''

    while (holdBuf.length > 0) {
      if (insideThink) {
        // Looking for the closing tag
        const closeIdx = holdBuf.indexOf('</think>')
        if (closeIdx === -1) {
          // Close tag not yet arrived — discard everything held and wait
          holdBuf = ''
          return output
        }
        // Skip everything up to and including </think>
        holdBuf = holdBuf.slice(closeIdx + 8)
        insideThink = false
      } else {
        // Looking for an opening tag
        const openIdx = holdBuf.indexOf('<think>')
        if (openIdx === -1) {
          // No opening tag found — but check for a partial tag at the tail
          // e.g. chunk ends with "<thi" which might be the start of "<think>"
          const partialRe = /<(?:t(?:h(?:i(?:n(?:k)?)?)?)?)?$/
          const partialMatch = holdBuf.match(partialRe)
          if (partialMatch) {
            const safeEnd = holdBuf.length - partialMatch[0].length
            output += holdBuf.slice(0, safeEnd)
            holdBuf = holdBuf.slice(safeEnd)
          } else {
            output += holdBuf
            holdBuf = ''
          }
          return output
        }
        // Emit everything before <think>, then enter think mode
        output += holdBuf.slice(0, openIdx)
        holdBuf = holdBuf.slice(openIdx + 7)
        insideThink = true
      }
    }
    return output
  }
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

    // One filter instance per stream — maintains state across SSE chunks
    const thinkFilter = createThinkFilter()

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
            // Skip Gemini native thinking tokens (part.thought === true)
            if (part.thought === true) continue

            if (typeof part.text === 'string' && part.text) {
              // Strip any <think>...</think> blocks (handles cross-chunk partial tags)
              const clean = thinkFilter(part.text)
              if (clean) onChunk(clean)
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
