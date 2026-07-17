import ReactECharts from './EChartsWrapper'
import { buildBarOption } from '../../lib/chartUtils'

// Dynamic height: give each row ~44px + fixed header padding.
// Capped between 280px (minimum) and 680px (maximum).
function chartHeight(dataLength) {
  return Math.max(280, Math.min(680, dataLength * 44 + 88))
}

export default function HBarChartView({ spec, onDrillDown, colors, fontScale = 1 }) {
  const option = buildBarOption(spec, true, colors, fontScale)
  const height  = chartHeight(spec.data?.length ?? 10)

  const onEvents = spec.drill_down ? {
    click: params => {
      const value = params.name ?? params.data?.name
      const prompt = spec.drill_down.prompt_template.replace('<value>', value)
      onDrillDown?.(prompt, value)
    },
  } : {}

  return (
    <ReactECharts
      option={option}
      style={{ height, width: '100%' }}
      onEvents={onEvents}
      notMerge={true}
      opts={{ renderer: 'canvas' }}
    />
  )
}
