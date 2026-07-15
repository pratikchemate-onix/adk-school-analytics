'use client'

import { useState } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Sector,
} from 'recharts'

const CHART_COLORS = [
  '#8ab4f8', '#81c995', '#f28b82', '#fdd663', '#c58af9',
  '#78d9ec', '#ffb74d', '#ce93d8',
]

function formatValue(val) {
  if (typeof val !== 'number') return val
  if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`
  if (Math.abs(val) >= 1_000) return `${(val / 1_000).toFixed(1)}K`
  return val.toLocaleString()
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null
  const entry = payload[0]
  return (
    <div style={{
      background: 'var(--surface-bg)',
      border: '1px solid var(--border-color)',
      borderRadius: '10px',
      padding: '10px 14px',
      fontSize: '13px',
      color: 'var(--text-primary)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: entry.payload.fill, display: 'inline-block' }} />
        <span style={{ fontWeight: 600 }}>{entry.name}</span>
      </div>
      <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
        Value: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatValue(entry.value)}</span>
      </div>
      <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
        Share: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{(entry.percent * 100).toFixed(1)}%</span>
      </div>
    </div>
  )
}

// Active (hovered) slice with expanded outer radius
const renderActiveShape = (props) => {
  const {
    cx, cy, innerRadius, outerRadius, startAngle, endAngle,
    fill, payload, percent, value,
  } = props
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 10}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.95}
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={outerRadius + 14}
        outerRadius={outerRadius + 18}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.4}
      />
    </g>
  )
}

export default function PieChartView({ spec, onDrillDown }) {
  const { name_key, value_key, data } = spec
  const [activeIndex, setActiveIndex] = useState(null)

  if (!data || data.length === 0) {
    return <div style={{ color: 'var(--text-secondary)' }}>No data for pie chart</div>
  }

  const hasDrillDown = !!spec.drill_down
  const total = data.reduce((sum, d) => sum + (Number(d[value_key]) || 0), 0)

  const handleClick = (_, index) => {
    if (!hasDrillDown || !onDrillDown) return
    const clickedEntry = data[index]
    const clickedValue = clickedEntry[name_key]
    const prompt = spec.drill_down.prompt_template.replace('<value>', clickedValue)
    onDrillDown(prompt, clickedValue)
  }

  return (
    <div style={{ position: 'relative' }}>
      <ResponsiveContainer width="100%" height={360}>
        <PieChart>
          <Pie
            data={data}
            dataKey={value_key}
            nameKey={name_key}
            cx="50%"
            cy="47%"
            outerRadius={130}
            innerRadius={65}
            paddingAngle={2}
            activeIndex={activeIndex}
            activeShape={renderActiveShape}
            onMouseEnter={(_, index) => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
            onClick={handleClick}
            style={{ cursor: hasDrillDown ? 'pointer' : 'default', outline: 'none' }}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={CHART_COLORS[index % CHART_COLORS.length]}
                stroke="transparent"
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            layout="horizontal"
            verticalAlign="bottom"
            align="center"
            wrapperStyle={{ paddingTop: 16, fontSize: 12 }}
            formatter={(value) => (
              <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Center label showing total */}
      <div style={{
        position: 'absolute',
        top: '47%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        pointerEvents: 'none',
        lineHeight: 1.2,
      }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
          {formatValue(total)}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Total
        </div>
      </div>
    </div>
  )
}
