'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
  ResponsiveContainer,
  Cell,
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
      maxWidth: '220px',
    }}>
      <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)', wordBreak: 'break-word' }}>
        {label}
      </div>
      {payload.map((entry) => (
        <div key={entry.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: entry.fill, display: 'inline-block' }} />
          <span style={{ color: 'var(--text-secondary)' }}>{entry.name}:</span>
          <span style={{ fontWeight: 600 }}>{formatValue(entry.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function HBarChartView({ spec, onDrillDown }) {
  const { x_key, y_keys, data } = spec

  if (!data || data.length === 0) {
    return <div style={{ color: 'var(--text-secondary)' }}>No data for chart</div>
  }

  const hasDrillDown = !!spec.drill_down
  const barHeight = Math.max(32, Math.min(52, Math.floor(320 / data.length)))
  const chartHeight = Math.max(260, data.length * barHeight + 60)

  const handleBarClick = (barData) => {
    if (!hasDrillDown || !onDrillDown || !barData) return
    const clickedValue = barData[x_key] ?? barData.name
    const prompt = spec.drill_down.prompt_template.replace('<value>', clickedValue)
    onDrillDown(prompt, clickedValue)
  }

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 8, right: 60, left: 8, bottom: 8 }}
        barCategoryGap="20%"
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
          axisLine={{ stroke: 'var(--border-color)' }}
          tickLine={false}
          tickFormatter={formatValue}
        />
        <YAxis
          type="category"
          dataKey={x_key}
          tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
          axisLine={false}
          tickLine={false}
          width={130}
          tickFormatter={(val) => typeof val === 'string' && val.length > 18 ? val.slice(0, 17) + '…' : val}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(138,180,248,0.08)' }} />
        <Legend
          wrapperStyle={{ paddingTop: 12, fontSize: 12, color: 'var(--text-secondary)' }}
          formatter={(value) => <span style={{ color: 'var(--text-secondary)' }}>{value}</span>}
        />
        {y_keys.map((key, idx) => (
          <Bar
            key={key}
            dataKey={key}
            name={key}
            radius={[0, 6, 6, 0]}
            fill={CHART_COLORS[idx % CHART_COLORS.length]}
            onClick={handleBarClick}
            style={{ cursor: hasDrillDown ? 'pointer' : 'default' }}
          >
            <LabelList
              dataKey={key}
              position="right"
              formatter={formatValue}
              style={{ fontSize: 11, fill: 'var(--text-secondary)', fontWeight: 500 }}
            />
            {data.map((_, i) => (
              <Cell
                key={`cell-${i}`}
                fill={y_keys.length === 1
                  ? CHART_COLORS[i % CHART_COLORS.length]
                  : CHART_COLORS[idx % CHART_COLORS.length]}
              />
            ))}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
