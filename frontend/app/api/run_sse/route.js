import { NextResponse } from 'next/server'

const AGENT_ENGINE_RESOURCE = process.env.AGENT_ENGINE_RESOURCE
const ADK_SERVER_URL = process.env.ADK_SERVER_URL || 'http://localhost:8000'

// Parse location from resource name so we never depend on GCP_LOCATION env var
function getApiBase(resource) {
  const match = resource.match(/locations\/([^/]+)/)
  const location = match?.[1] ?? 'us-central1'
  return `https://${location}-aiplatform.googleapis.com/v1beta1`
}

async function getAccessToken() {
  if (process.env.GOOGLE_ACCESS_TOKEN) return process.env.GOOGLE_ACCESS_TOKEN
  const res = await fetch(
    'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
    { headers: { 'Metadata-Flavor': 'Google' } }
  )
  const { access_token } = await res.json()
  return access_token
}

export async function POST(request) {
  try {
    const body = await request.json()

    if (AGENT_ENGINE_RESOURCE) {
      const { user_id, session_id, new_message } = body
      const message = new_message?.parts?.[0]?.text ?? ''

      const token = await getAccessToken()
      const base = getApiBase(AGENT_ENGINE_RESOURCE)
      const url = `${base}/${AGENT_ENGINE_RESOURCE}:streamQuery`

      console.log('[run_sse] calling:', url)

      const upstream = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input: { user_id, session_id, message } }),
      })

      if (!upstream.ok) {
        const detail = await upstream.text()
        console.error('[run_sse] Agent Engine error:', upstream.status, detail)
        return NextResponse.json({ error: `Agent Engine error: ${upstream.status}`, detail }, { status: upstream.status })
      }

      // Agent Engine returns NDJSON; convert to SSE so adkClient.js works unchanged
      const encoder = new TextEncoder()
      const readable = new ReadableStream({
        async start(controller) {
          const reader = upstream.body.getReader()
          const decoder = new TextDecoder()
          let buf = ''
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buf += decoder.decode(value, { stream: true })
            const lines = buf.split('\n')
            buf = lines.pop()
            for (const line of lines) {
              const trimmed = line.trim()
              if (!trimmed) continue
              try {
                const parsed = JSON.parse(trimmed)
                // Agent Engine wraps each ADK event in {"output": <event>}
                const event = parsed.output ?? parsed
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
              } catch {
                // skip malformed lines
              }
            }
          }
          controller.close()
        },
      })

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    // Local dev fallback: proxy directly to adk api_server SSE stream
    const response = await fetch(`${ADK_SERVER_URL}/run_sse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      return NextResponse.json({ error: `ADK error: ${response.status}` }, { status: response.status })
    }

    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
