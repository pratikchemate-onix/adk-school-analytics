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
