export const CHART_COLORS = [
  '#4d96ff', '#06d6a0', '#ff6b6b', '#ffd166', '#c77dff',
  '#00b4d8', '#f77f00', '#74c0fc', '#69db7c', '#f783ac',
]

export const DARK_COLORS = {
  axis:          '#9aa0a6',
  label:         '#e8eaed',
  legend:        '#9aa0a6',
  title:         '#e8eaed',
  tooltipBg:     '#1e2130',
  tooltipBorder: '#3a4060',
  tooltipText:   '#e8eaed',
  paginator:     '#8ab4f8',
  toolboxIcon:   '#9aa0a6',
  toolboxHover:  '#e8eaed',
}

export const LIGHT_COLORS = {
  axis:          '#202124',
  label:         '#202124',
  legend:        '#5f6368',
  title:         '#202124',
  tooltipBg:     '#ffffff',
  tooltipBorder: '#dadce0',
  tooltipText:   '#3c4043',
  paginator:     '#8ab4f8',
  toolboxIcon:   '#5f6368',
  toolboxHover:  '#202124',
}

export function formatValue(val) {
  if (typeof val !== 'number') return val
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`
  return val.toLocaleString()
}

// "revenue_usd" → "Revenue USD", "salesCount" → "Sales Count"
export function humanizeKey(str) {
  return String(str)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim()
}

function makeToolbox(colors) {
  return {
    feature: {
      saveAsImage: { title: 'Save image', pixelRatio: 2 },
      dataView: { readOnly: true, title: 'View data', lang: ['Data', 'Close', 'Refresh'] },
      restore: { title: 'Reset' },
    },
    iconStyle: { borderColor: colors.toolboxIcon },
    emphasis: { iconStyle: { borderColor: colors.toolboxHover } },
    top: 4,
    right: 8,
  }
}

function makeDataZoom(dataLength, colors) {
  if (dataLength <= 12) return undefined
  const endPct = Math.round((12 / dataLength) * 100)
  return [
    { type: 'inside', start: 0, end: endPct },
    {
      type: 'slider', start: 0, end: endPct, height: 18,
      borderColor: colors.tooltipBorder,
      fillerColor: 'rgba(138,180,248,0.15)',
      handleStyle: { color: '#8ab4f8' },
      textStyle: { color: colors.axis },
    },
  ]
}

export function buildBarOption(spec, horizontal = false, colors = LIGHT_COLORS) {
  const categories = spec.data.map(d => d[spec.x_key])
  const drillable = !!spec.drill_down
  const dataZoom = horizontal ? undefined : makeDataZoom(spec.data.length, colors)

  const series = spec.y_keys.map((key, i) => ({
    name: humanizeKey(key),
    type: 'bar',
    data: spec.data.map(d => ({ value: d[key], name: String(d[spec.x_key]) })),
    itemStyle: {
      color: CHART_COLORS[i % CHART_COLORS.length],
      borderRadius: horizontal ? [0, 3, 3, 0] : [3, 3, 0, 0],
    },
    cursor: drillable ? 'pointer' : 'default',
    emphasis: {
      itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.45)' },
    },
    label: {
      show: true,
      position: horizontal ? 'right' : 'top',
      formatter: p => formatValue(p.value),
      color: colors.label,
      fontSize: 11,
    },
  }))

  const hasLegend = spec.y_keys.length > 1
  const legend = hasLegend ? {
    type: 'scroll',
    top: spec.title ? 32 : 4,
    textStyle: { color: colors.legend, fontSize: 12 },
    pageIconColor: colors.paginator,
    pageTextStyle: { color: colors.legend },
  } : { show: false }

  return {
    backgroundColor: 'transparent',
    title: spec.title ? {
      text: spec.title, subtext: spec.subtitle,
      textStyle: { color: colors.title, fontSize: 14 },
    } : undefined,
    toolbox: makeToolbox(colors),
    tooltip: {
      trigger: 'axis',
      confine: true,
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.tooltipText },
    },
    legend,
    dataZoom,
    grid: {
      containLabel: true, left: 16, right: 48,
      top: spec.title ? (hasLegend ? 80 : 56) : (hasLegend ? 44 : 32),
      bottom: dataZoom ? 52 : 16,
    },
    xAxis: horizontal
      ? { type: 'value', axisLabel: { color: colors.axis, formatter: v => formatValue(v) } }
      : {
          type: 'category', data: categories,
          axisLabel: {
            color: colors.axis,
            rotate: categories.length > 8 ? 30 : 0,
            overflow: 'truncate',
            width: 100,
            interval: 0,
          },
        },
    yAxis: horizontal
      ? {
          type: 'category', data: categories,
          axisLabel: { color: colors.axis, overflow: 'truncate', width: 140 },
        }
      : { type: 'value', axisLabel: { color: colors.axis, formatter: v => formatValue(v) } },
    series,
  }
}

export function buildStackedBarOption(spec, colors = LIGHT_COLORS) {
  const categories = spec.data.map(d => d[spec.x_key])
  const drillable = !!spec.drill_down

  const series = spec.y_keys.map((key, i) => ({
    name: humanizeKey(key),
    type: 'bar',
    stack: 'total',
    data: spec.data.map(d => ({ value: d[key], name: String(d[spec.x_key]) })),
    itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] },
    cursor: drillable ? 'pointer' : 'default',
    emphasis: {
      itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.45)' },
    },
  }))

  return {
    backgroundColor: 'transparent',
    title: spec.title ? {
      text: spec.title,
      textStyle: { color: colors.title, fontSize: 14 },
    } : undefined,
    toolbox: makeToolbox(colors),
    tooltip: {
      trigger: 'axis',
      confine: true,
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.tooltipText },
    },
    legend: {
      type: 'scroll',
      top: spec.title ? 32 : 4,
      textStyle: { color: colors.legend, fontSize: 12 },
      pageIconColor: colors.paginator,
      pageTextStyle: { color: colors.legend },
    },
    grid: { containLabel: true, left: 16, right: 48, top: spec.title ? 80 : 44, bottom: 16 },
    xAxis: {
      type: 'category', data: categories,
      axisLabel: {
        color: colors.axis,
        rotate: categories.length > 8 ? 30 : 0,
        overflow: 'truncate',
        width: 100,
        interval: 0,
      },
    },
    yAxis: { type: 'value', axisLabel: { color: colors.axis, formatter: v => formatValue(v) } },
    series,
  }
}

export function buildLineOption(spec, filled = false, colors = LIGHT_COLORS) {
  const categories = spec.data.map(d => d[spec.x_key])
  const drillable = !!spec.drill_down
  const dataZoom = makeDataZoom(spec.data.length, colors)

  const series = spec.y_keys.map((key, i) => {
    const color = CHART_COLORS[i % CHART_COLORS.length]
    return {
      name: humanizeKey(key),
      type: 'line',
      smooth: true,
      data: spec.data.map(d => ({ value: d[key], name: String(d[spec.x_key]) })),
      itemStyle: { color },
      lineStyle: { color, width: 2 },
      cursor: drillable ? 'pointer' : 'default',
      emphasis: { focus: 'series' },
      ...(filled ? {
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: color + 'aa' },
              { offset: 1, color: color + '11' },
            ],
          },
        },
      } : {}),
    }
  })

  const hasLegend = spec.y_keys.length > 1
  const legend = hasLegend ? {
    type: 'scroll',
    top: spec.title ? 32 : 4,
    textStyle: { color: colors.legend, fontSize: 12 },
    pageIconColor: colors.paginator,
    pageTextStyle: { color: colors.legend },
  } : { show: false }

  return {
    backgroundColor: 'transparent',
    title: spec.title ? {
      text: spec.title,
      textStyle: { color: colors.title, fontSize: 14 },
    } : undefined,
    toolbox: makeToolbox(colors),
    tooltip: {
      trigger: 'axis',
      confine: true,
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.tooltipText },
    },
    legend,
    dataZoom,
    grid: {
      containLabel: true, left: 16, right: 48,
      top: spec.title ? (hasLegend ? 80 : 56) : (hasLegend ? 44 : 32),
      bottom: dataZoom ? 52 : 16,
    },
    xAxis: {
      type: 'category', data: categories,
      axisLabel: {
        color: colors.axis,
        rotate: categories.length > 8 ? 30 : 0,
        overflow: 'truncate',
        width: 100,
        interval: 0,
      },
    },
    yAxis: { type: 'value', axisLabel: { color: colors.axis, formatter: v => formatValue(v) } },
    series,
  }
}

export function buildPieOption(spec, colors = LIGHT_COLORS) {
  return {
    backgroundColor: 'transparent',
    title: spec.title ? {
      text: spec.title, left: 'center',
      textStyle: { color: colors.title, fontSize: 14 },
    } : undefined,
    toolbox: makeToolbox(colors),
    tooltip: {
      trigger: 'item',
      confine: true,
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.tooltipText },
      formatter: p => `${p.name}<br/>${formatValue(p.value)} (${p.percent}%)`,
    },
    legend: {
      type: 'scroll',
      orient: 'horizontal',
      bottom: 0,
      textStyle: { color: colors.legend, fontSize: 12 },
      pageIconColor: colors.paginator,
      pageTextStyle: { color: colors.legend },
    },
    series: [{
      type: 'pie',
      radius: ['38%', '65%'],
      center: ['50%', '45%'],
      cursor: 'pointer',
      data: spec.data.map((d, i) => ({
        name: String(d[spec.name_key]),
        value: d[spec.value_key],
        itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] },
      })),
      label: { color: colors.label, formatter: '{b}: {d}%' },
      emphasis: {
        scaleSize: 5,
        itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.5)' },
      },
    }],
  }
}
