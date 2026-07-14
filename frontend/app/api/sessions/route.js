import { NextResponse } from 'next/server'

const AGENT_ENGINE_RESOURCE = process.env.AGENT_ENGINE_RESOURCE
const ADK_SERVER_URL = process.env.ADK_SERVER_URL || 'http://localhost:8000'

// Parse location from resource name so we never depend on GCP_LOCATION env var
// e.g. "projects/123/locations/us-central1/reasoningEngines/456" → "us-central1"
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
    const { userId } = body

    if (AGENT_ENGINE_RESOURCE) {
      const token = await getAccessToken()
      const base = getApiBase(AGENT_ENGINE_RESOURCE)
      const url = `${base}/${AGENT_ENGINE_RESOURCE}:query`

      console.log('[sessions] calling:', url)

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          class_method: 'create_session',
          input: { user_id: userId },
        }),
      })

      const text = await res.text()
      console.log('[sessions] Agent Engine status:', res.status, 'body:', text)

      if (!res.ok) {
        return NextResponse.json({ error: `Agent Engine error: ${res.status}`, detail: text }, { status: res.status })
      }

      const data = JSON.parse(text)
      return NextResponse.json(data.output ?? data)
    }

    // Local dev fallback: proxy to adk api_server
    const res = await fetch(
      `${ADK_SERVER_URL}/apps/app/users/${userId}/sessions`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' } }
    )

    if (!res.ok) {
      return NextResponse.json({ error: `ADK error: ${res.status}` }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
