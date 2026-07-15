import ReactECharts from './EChartsWrapper'
import { buildBarOption } from '../../lib/chartUtils'

export default function BarChartView({ spec, onDrillDown, colors }) {
  const option = buildBarOption(spec, false, colors)

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
      style={{ height: 420, width: '100%' }}
      onEvents={onEvents}
      notMerge={true}
      opts={{ renderer: 'canvas' }}
    />
  )
}
