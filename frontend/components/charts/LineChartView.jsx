'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

const CHART_COLORS = ['#8ab4f8', '#81c995', '#f28b82', '#fdd663', '#c58af9', '#78d9ec']

export default function LineChartView({ spec }) {
  const { x_key, y_keys, data } = spec

  if (!data || data.length === 0) {
    return <div style={{ color: 'var(--text-secondary)' }}>No data for line chart</div>
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
        <XAxis
          dataKey={x_key}
          tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
          axisLine={{ stroke: 'var(--border-color)' }}
          tickLine={{ stroke: 'var(--border-color)' }}
        />
        <YAxis
          tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
          axisLine={{ stroke: 'var(--border-color)' }}
          tickLine={{ stroke: 'var(--border-color)' }}
        />
        <Tooltip
          contentStyle={{
            background: 'var(--surface-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            color: 'var(--text-primary)',
          }}
          labelStyle={{ color: 'var(--text-primary)' }}
        />
        <Legend
          wrapperStyle={{ color: 'var(--text-secondary)' }}
          formatter={(value) => <span style={{ color: 'var(--text-secondary)' }}>{value}</span>}
        />
        {y_keys.map((key, idx) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={CHART_COLORS[idx % CHART_COLORS.length]}
            strokeWidth={2}
            dot={{ r: 4, fill: CHART_COLORS[idx % CHART_COLORS.length] }}
            activeDot={{ r: 6 }}
            name={key}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
