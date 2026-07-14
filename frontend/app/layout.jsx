import './globals.css'

export const metadata = {
  title: 'CDSL Analytics - BigQuery NL2SQL Agent',
  description: 'Natural language analytics for CDSL securities data powered by BigQuery',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
