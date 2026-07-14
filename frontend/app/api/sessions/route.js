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
