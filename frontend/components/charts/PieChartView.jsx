'use client'

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

const COLORS = ['#0066cc', '#cc3300', '#009933', '#ff9900', '#9933cc', '#00cccc']

export default function PieChartView({ spec }) {
  const { title, name_key, value_key, data } = spec

  if (!data || data.length === 0) {
    return <div style={{ color: 'red' }}>No data for pie chart</div>
  }

  return (
    <div>
      {title && (
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', textAlign: 'center' }}>
          {title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey={value_key}
            nameKey={name_key}
            cx="50%"
            cy="50%"
            outerRadius={100}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: '#fff', border: '1px solid #ccc' }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
