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
