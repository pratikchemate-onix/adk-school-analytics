import ReactECharts from './EChartsWrapper'
import { buildLineOption } from '../../lib/chartUtils'

export default function AreaChartView({ spec, onDrillDown, colors }) {
  const option = buildLineOption(spec, true, colors)

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
