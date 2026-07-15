'use client'

import BarChartView from './BarChartView'
import LineChartView from './LineChartView'
import PieChartView from './PieChartView'
import AreaChartView from './AreaChartView'
import HBarChartView from './HBarChartView'
import StackedBarChartView from './StackedBarChartView'

export default function ChartRenderer({ spec, onDrillDown }) {
  if (!spec || !spec.type) {
    return <div style={{ color: 'red' }}>Invalid chart spec: missing type</div>
  }

  switch (spec.type) {
    case 'bar':
      return <BarChartView spec={spec} onDrillDown={onDrillDown} />
    case 'hbar':
      return <HBarChartView spec={spec} onDrillDown={onDrillDown} />
    case 'line':
      return <LineChartView spec={spec} onDrillDown={onDrillDown} />
    case 'pie':
      return <PieChartView spec={spec} onDrillDown={onDrillDown} />
    case 'area':
      return <AreaChartView spec={spec} onDrillDown={onDrillDown} />
    case 'stacked_bar':
      return <StackedBarChartView spec={spec} onDrillDown={onDrillDown} />
    default:
      return <div style={{ color: 'orange' }}>Unknown chart type: {spec.type}</div>
  }
}
