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
