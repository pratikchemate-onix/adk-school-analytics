'use client'

import BarChartView from './BarChartView'
import LineChartView from './LineChartView'
import PieChartView from './PieChartView'
import AreaChartView from './AreaChartView'
import HBarChartView from './HBarChartView'
import StackedBarChartView from './StackedBarChartView'
import { formatValue } from '../../lib/chartUtils'
import { useThemeColors } from '../../lib/useThemeColors'

function FallbackDataView({ spec }) {
  const rows = spec.data ?? []
  const cols = rows.length > 0 ? Object.keys(rows[0]) : []
  return (
    <div style={{ padding: '16px 20px' }}>
      <p style={{ color: 'var(--chart-error-color)', marginBottom: 12, fontSize: 13 }}>
        Chart type <strong>"{spec.type}"</strong> is not supported — showing raw data instead.
      </p>
      {rows.length > 0 ? (
        <div className="md-table-wrapper">
          <table className="md-table">
            <thead className="md-thead">
              <tr>
                {cols.map(c => <th key={c} className="md-th">{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 50).map((row, i) => (
                <tr key={i} className="md-tr">
                  {cols.map(c => (
                    <td key={c} className="md-td">
                      {typeof row[c] === 'number' ? formatValue(row[c]) : String(row[c] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 50 && (
            <p style={{ color: 'var(--chart-hint-color)', fontSize: 11, marginTop: 8 }}>
              Showing first 50 of {rows.length} rows.
            </p>
          )}
        </div>
      ) : (
        <p style={{ color: 'var(--chart-hint-color)', fontSize: 12 }}>No data in spec.</p>
      )}
    </div>
  )
}

export default function ChartRenderer({ spec, onDrillDown }) {
  const { colors, fontScale } = useThemeColors()

  if (!spec || !spec.type) {
    return <div style={{ color: 'red' }}>Invalid chart spec: missing type</div>
  }

  // Title and subtitle are shown in the card header — strip to avoid ECharts duplicate.
  const { title: _t, subtitle: _s, ...chartSpec } = spec

  switch (chartSpec.type) {
    case 'bar':
      return <BarChartView spec={chartSpec} onDrillDown={onDrillDown} colors={colors} fontScale={fontScale} />
    case 'hbar':
      return <HBarChartView spec={chartSpec} onDrillDown={onDrillDown} colors={colors} fontScale={fontScale} />
    case 'line':
      return <LineChartView spec={chartSpec} onDrillDown={onDrillDown} colors={colors} fontScale={fontScale} />
    case 'pie':
      return <PieChartView spec={chartSpec} onDrillDown={onDrillDown} colors={colors} fontScale={fontScale} />
    case 'area':
      return <AreaChartView spec={chartSpec} onDrillDown={onDrillDown} colors={colors} fontScale={fontScale} />
    case 'stacked_bar':
      return <StackedBarChartView spec={chartSpec} onDrillDown={onDrillDown} colors={colors} fontScale={fontScale} />
    default:
      return <FallbackDataView spec={spec} />
  }
}
