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
