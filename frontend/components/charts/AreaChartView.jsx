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

const CHART_COLORS = [
  '#8ab4f8', '#81c995', '#f28b82', '#fdd663', '#c58af9',
  '#78d9ec', '#ffb74d', '#a5d6a7', '#ef9a9a', '#ce93d8',
]

function formatValue(val) {
  if (typeof val !== 'number') return val
  if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`
  if (Math.abs(val) >= 1_000) return `${(val / 1_000).toFixed(1)}K`
  return val.toLocaleString()
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null
  return (
    <div style={{
      background: 'var(--surface-bg)',
      border: '1px solid var(--border-color)',
      borderRadius: '10px',
      padding: '10px 14px',
      fontSize: '13px',
      color: 'var(--text-primary)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      minWidth: '160px',
    }}>
      <div style={{ fontWeight: 600, marginBottom: 8, borderBottom: '1px solid var(--border-color)', paddingBottom: 6 }}>
        {label}
      </div>
      {payload.map((entry) => (
        <div key={entry.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ width: 12, height: 3, background: entry.stroke, display: 'inline-block', borderRadius: 2 }} />
          <span style={{ color: 'var(--text-secondary)' }}>{entry.name}:</span>
          <span style={{ fontWeight: 600, marginLeft: 'auto', paddingLeft: 8 }}>{formatValue(entry.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function AreaChartView({ spec }) {
  const { x_key, y_keys, data } = spec

  if (!data || data.length === 0) {
    return <div style={{ color: 'var(--text-secondary)' }}>No data for area chart</div>
  }

  const needsRotation = data.length > 8 || data.some(d => String(d[x_key] || '').length > 8)
  const bottomMargin = needsRotation ? 70 : 20

  return (
    <ResponsiveContainer width="100%" height={360}>
      <AreaChart
        data={data}
        margin={{ top: 16, right: 24, left: 10, bottom: bottomMargin }}
      >
        <defs>
          {y_keys.map((key, idx) => (
            <linearGradient key={key} id={`grad-${idx}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS[idx % CHART_COLORS.length]} stopOpacity={0.35} />
              <stop offset="95%" stopColor={CHART_COLORS[idx % CHART_COLORS.length]} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
        <XAxis
          dataKey={x_key}
          tick={{
            fontSize: 12,
            fill: 'var(--text-secondary)',
            ...(needsRotation ? { angle: -40, textAnchor: 'end', dy: 4 } : {}),
          }}
          axisLine={{ stroke: 'var(--border-color)' }}
          tickLine={false}
          interval={data.length > 20 ? Math.floor(data.length / 10) : 0}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatValue}
          width={55}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--accent-blue)', strokeWidth: 1, strokeDasharray: '4 2' }} />
        <Legend
          wrapperStyle={{ paddingTop: 14, fontSize: 12 }}
          formatter={(value) => <span style={{ color: 'var(--text-secondary)' }}>{value}</span>}
        />
        {y_keys.map((key, idx) => (
          <Area
            key={key}
            type="monotone"
            dataKey={key}
            stroke={CHART_COLORS[idx % CHART_COLORS.length]}
            strokeWidth={2.5}
            fill={`url(#grad-${idx})`}
            dot={{ r: 3, fill: CHART_COLORS[idx % CHART_COLORS.length], strokeWidth: 0 }}
            activeDot={{ r: 6, stroke: 'var(--primary-bg)', strokeWidth: 2 }}
            name={key}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}
