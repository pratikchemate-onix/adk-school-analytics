import ReactECharts from './EChartsWrapper'
import { buildPieOption } from '../../lib/chartUtils'

export default function PieChartView({ spec, onDrillDown, colors }) {
  const option = buildPieOption(spec, colors)

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
      style={{ height: 440, width: '100%' }}
      onEvents={onEvents}
      notMerge={true}
      opts={{ renderer: 'canvas' }}
    />
  )
}
