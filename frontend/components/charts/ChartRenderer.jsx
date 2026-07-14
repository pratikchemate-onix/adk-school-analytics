'use client'

import BarChartView from './BarChartView'
import LineChartView from './LineChartView'
import PieChartView from './PieChartView'
import AreaChartView from './AreaChartView'

export default function ChartRenderer({ spec }) {
  if (!spec || !spec.type) {
    return <div style={{ color: 'red' }}>Invalid chart spec: missing type</div>
  }

  switch (spec.type) {
    case 'bar':
      return <BarChartView spec={spec} />
    case 'line':
      return <LineChartView spec={spec} />
    case 'pie':
      return <PieChartView spec={spec} />
    case 'area':
      return <AreaChartView spec={spec} />
    default:
      return <div style={{ color: 'orange' }}>Unknown chart type: {spec.type}</div>
  }
}
