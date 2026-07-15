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
  const total = payload.reduce((sum, p) => sum + (p.value || 0), 0)
  return (
    <div style={{
      background: 'var(--surface-bg)',
      border: '1px solid var(--border-color)',
      borderRadius: '10px',
      padding: '10px 14px',
      fontSize: '13px',
      color: 'var(--text-primary)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      minWidth: '180px',
    }}>
      <div style={{ fontWeight: 600, marginBottom: 8, borderBottom: '1px solid var(--border-color)', paddingBottom: 6 }}>
        {label}
      </div>
      {payload.map((entry) => {
        const pct = total > 0 ? ((entry.value / total) * 100).toFixed(1) : 0
        return (
          <div key={entry.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: entry.fill, display: 'inline-block', flexShrink: 0 }} />
            <span style={{ color: 'var(--text-secondary)', flex: 1 }}>{entry.name}</span>
            <span style={{ fontWeight: 600 }}>{formatValue(entry.value)}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>({pct}%)</span>
          </div>
        )
      })}
      <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: 'var(--text-secondary)' }}>Total</span>
        <span style={{ fontWeight: 700 }}>{formatValue(total)}</span>
      </div>
    </div>
  )
}

export default function StackedBarChartView({ spec, onDrillDown }) {
  const { x_key, y_keys, data } = spec

  if (!data || data.length === 0) {
    return <div style={{ color: 'var(--text-secondary)' }}>No data for chart</div>
  }

  const hasDrillDown = !!spec.drill_down
  const needsRotation = data.length > 6 || data.some(d => String(d[x_key] || '').length > 8)
  const bottomMargin = needsRotation ? 70 : 20
  const chartHeight = 380

  const handleBarClick = (barData) => {
    if (!hasDrillDown || !onDrillDown || !barData) return
    const clickedValue = barData[x_key] ?? barData.activeLabel
    const prompt = spec.drill_down.prompt_template.replace('<value>', clickedValue)
    onDrillDown(prompt, clickedValue)
  }

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart
        data={data}
        margin={{ top: 16, right: 20, left: 10, bottom: bottomMargin }}
        barCategoryGap="25%"
        onClick={handleBarClick}
        style={{ cursor: hasDrillDown ? 'pointer' : 'default' }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
        <XAxis
          dataKey={x_key}
          tick={{
            fontSize: 12,
            fill: 'var(--text-secondary)',
            ...(needsRotation ? { angle: -40, textAnchor: 'end', dy: 8 } : {}),
          }}
          axisLine={{ stroke: 'var(--border-color)' }}
          tickLine={false}
          interval={0}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatValue}
          width={55}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(138,180,248,0.06)' }} />
        <Legend
          wrapperStyle={{ paddingTop: 12, fontSize: 12 }}
          formatter={(value) => <span style={{ color: 'var(--text-secondary)' }}>{value}</span>}
        />
        {y_keys.map((key, idx) => (
          <Bar
            key={key}
            dataKey={key}
            name={key}
            stackId="stack"
            fill={CHART_COLORS[idx % CHART_COLORS.length]}
            radius={idx === y_keys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
