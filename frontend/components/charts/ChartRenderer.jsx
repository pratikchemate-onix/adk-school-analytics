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
      <p style={{ color: '#f28b82', marginBottom: 12, fontSize: 13 }}>
        Chart type <strong>"{spec.type}"</strong> is not supported — showing raw data instead.
      </p>
      {rows.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
            <thead>
              <tr>
                {cols.map(c => (
                  <th key={c} style={{
                    padding: '6px 12px',
                    borderBottom: '1px solid #3a4060',
                    color: '#bdc1c6',
                    textAlign: 'left',
                    whiteSpace: 'nowrap',
                    fontWeight: 600,
                  }}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 50).map((row, i) => (
                <tr key={i} style={{ background: i % 2 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                  {cols.map(c => (
                    <td key={c} style={{
                      padding: '5px 12px',
                      borderBottom: '1px solid #1e2130',
                      color: '#e8eaed',
                    }}>
                      {typeof row[c] === 'number' ? formatValue(row[c]) : String(row[c] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 50 && (
            <p style={{ color: '#9aa0a6', fontSize: 11, marginTop: 8 }}>
              Showing first 50 of {rows.length} rows.
            </p>
          )}
        </div>
      ) : (
        <p style={{ color: '#9aa0a6', fontSize: 12 }}>No data in spec.</p>
      )}
    </div>
  )
}

export default function ChartRenderer({ spec, onDrillDown }) {
  const colors = useThemeColors()

  if (!spec || !spec.type) {
    return <div style={{ color: 'red' }}>Invalid chart spec: missing type</div>
  }

  switch (spec.type) {
    case 'bar':
      return <BarChartView spec={spec} onDrillDown={onDrillDown} colors={colors} />
    case 'hbar':
      return <HBarChartView spec={spec} onDrillDown={onDrillDown} colors={colors} />
    case 'line':
      return <LineChartView spec={spec} onDrillDown={onDrillDown} colors={colors} />
    case 'pie':
      return <PieChartView spec={spec} onDrillDown={onDrillDown} colors={colors} />
    case 'area':
      return <AreaChartView spec={spec} onDrillDown={onDrillDown} colors={colors} />
    case 'stacked_bar':
      return <StackedBarChartView spec={spec} onDrillDown={onDrillDown} colors={colors} />
    default:
      return <FallbackDataView spec={spec} />
  }
}
