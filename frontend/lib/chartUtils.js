// ─── Color Palettes ───────────────────────────────────────────────────────────
// 16-color beautiful, diverse palettes — vibrant for dark, deeper for light

export const DARK_PALETTE = [
  '#6366f1', // indigo
  '#10b981', // emerald
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#ec4899', // pink
  '#a78bfa', // purple
  '#06b6d4', // cyan
  '#f97316', // orange
  '#34d399', // mint
  '#fb7185', // rose
  '#38bdf8', // sky
  '#84cc16', // lime
  '#e879f9', // fuchsia
  '#2dd4bf', // turquoise
  '#facc15', // yellow
  '#14b8a6', // teal
]

export const LIGHT_PALETTE = [
  '#4f46e5', // indigo
  '#059669', // emerald
  '#d97706', // amber
  '#2563eb', // blue
  '#db2777', // pink
  '#7c3aed', // purple
  '#0891b2', // cyan
  '#ea580c', // orange
  '#10b981', // mint
  '#f43f5e', // rose
  '#0284c7', // sky
  '#65a30d', // lime
  '#c026d3', // fuchsia
  '#0d9488', // teal
  '#ca8a04', // yellow
  '#0f766e', // dark teal
]

// Keep for backward-compat imports
export const CHART_COLORS = DARK_PALETTE

export const DARK_COLORS = {
  axis:          '#94a3b8',
  label:         '#e2e8f0',
  legend:        '#94a3b8',
  title:         '#f1f5f9',
  splitLine:     'rgba(148,163,184,0.10)',
  tooltipBg:     '#0f172a',
  tooltipBorder: '#334155',
  tooltipText:   '#f1f5f9',
  tooltipMuted:  '#94a3b8',
  paginator:     '#6366f1',
  toolboxIcon:   '#64748b',
  toolboxHover:  '#e2e8f0',
  palette:       DARK_PALETTE,
}

export const LIGHT_COLORS = {
  axis:          '#475569',
  label:         '#1e293b',
  legend:        '#64748b',
  title:         '#0f172a',
  splitLine:     'rgba(71,85,105,0.10)',
  tooltipBg:     '#ffffff',
  tooltipBorder: '#e2e8f0',
  tooltipText:   '#0f172a',
  tooltipMuted:  '#64748b',
  paginator:     '#4f46e5',
  toolboxIcon:   '#64748b',
  toolboxHover:  '#0f172a',
  palette:       LIGHT_PALETTE,
}

// ─── Utilities ────────────────────────────────────────────────────────────────

export function formatValue(val) {
  if (typeof val !== 'number') return val ?? ''
  if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`
  if (Math.abs(val) >= 1_000)     return `${(val / 1_000).toFixed(1)}K`
  return val.toLocaleString()
}

export function humanizeKey(str) {
  return String(str)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim()
}

// Build an ECharts LinearGradient object (top → bottom)
function barGradient(color) {
  return {
    type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
    colorStops: [
      { offset: 0,   color: color },
      { offset: 1,   color: color + 'bb' },
    ],
  }
}

// Area-chart gradient (dramatic fade)
function areaGradient(color) {
  return {
    type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
    colorStops: [
      { offset: 0,   color: color + '70' }, // ~44% opacity
      { offset: 0.5, color: color + '28' }, // ~16% opacity
      { offset: 1,   color: color + '05' }, // ~2%  opacity
    ],
  }
}

// Extract plain hex from a gradient object (for tooltip dots)
function plainColor(c) {
  if (c && typeof c === 'object' && c.colorStops) return c.colorStops[0].color
  return c
}

// Rich tooltip dot (colored circle)
function tooltipDot(color) {
  const hex = plainColor(color)
  return `<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${hex};margin-right:7px;flex-shrink:0"></span>`
}

const FONT = "'Google Sans', 'Segoe UI', system-ui, sans-serif"

// ─── Shared sub-builders ──────────────────────────────────────────────────────

function makeToolbox(colors) {
  return {
    feature: {
      saveAsImage: { title: 'Save', pixelRatio: 2 },
      restore:     { title: 'Reset' },
    },
    iconStyle:  { borderColor: colors.toolboxIcon },
    emphasis:   { iconStyle: { borderColor: colors.toolboxHover } },
    top: 6,
    right: 10,
  }
}

function makeDataZoom(dataLength, colors) {
  if (dataLength <= 12) return undefined
  const endPct = Math.round((12 / dataLength) * 100)
  return [
    { type: 'inside', start: 0, end: endPct },
    {
      type: 'slider',
      start: 0, end: endPct,
      height: 20, bottom: 4,
      borderColor:    colors.tooltipBorder,
      fillerColor:    (colors.palette[0]) + '22',
      handleStyle:    { color: colors.palette[0], borderColor: colors.palette[0] },
      moveHandleStyle:{ color: colors.palette[0] },
      textStyle:      { color: colors.axis, fontSize: 11 },
    },
  ]
}

function makeAxisBase(colors) {
  return {
    axisLine:  { show: false },
    axisTick:  { show: false },
    splitLine: { lineStyle: { type: 'dashed', color: colors.splitLine, width: 1 } },
    axisLabel: { color: colors.axis, fontSize: 12, fontFamily: FONT },
  }
}

// Rich axis tooltip (bar/line)
function makeAxisTooltip(colors) {
  return {
    trigger: 'axis',
    confine: true,
    backgroundColor: colors.tooltipBg,
    borderColor:     colors.tooltipBorder,
    borderWidth: 1,
    padding: [10, 14],
    extraCssText: `border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,0.18);`,
    textStyle: { color: colors.tooltipText, fontSize: 13 },
    formatter(params) {
      const header = `<div style="font-size:12px;color:${colors.tooltipMuted};margin-bottom:6px;font-weight:500">${params[0]?.axisValueLabel ?? params[0]?.name ?? ''}</div>`
      const rows = params.map(p =>
        `<div style="display:flex;align-items:center;justify-content:space-between;gap:20px;margin:3px 0">` +
        `<span style="display:flex;align-items:center">${tooltipDot(p.color)}<span style="color:${colors.tooltipText}">${p.seriesName}</span></span>` +
        `<span style="font-weight:700;color:${colors.tooltipText};font-variant-numeric:tabular-nums">${formatValue(p.value?.value ?? p.value)}</span>` +
        `</div>`
      ).join('')
      return header + rows
    },
  }
}

// Rich pie tooltip
function makePieTooltip(colors) {
  return {
    trigger: 'item',
    confine: true,
    backgroundColor: colors.tooltipBg,
    borderColor:     colors.tooltipBorder,
    borderWidth: 1,
    padding: [10, 14],
    extraCssText: `border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,0.18);`,
    textStyle: { color: colors.tooltipText, fontSize: 13 },
    formatter(p) {
      return (
        `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">` +
        `${tooltipDot(p.color)}<span style="font-weight:600;color:${colors.tooltipText}">${p.name}</span></div>` +
        `<div style="display:flex;justify-content:space-between;gap:24px;margin-bottom:3px">` +
        `<span style="color:${colors.tooltipMuted};font-size:12px">Value</span>` +
        `<span style="font-weight:700">${formatValue(p.value)}</span></div>` +
        `<div style="display:flex;justify-content:space-between;gap:24px">` +
        `<span style="color:${colors.tooltipMuted};font-size:12px">Share</span>` +
        `<span style="font-weight:700">${p.percent}%</span></div>`
      )
    },
  }
}

function makeLegend(colors, top = 4) {
  return {
    type:       'scroll',
    top,
    icon:       'roundRect',
    itemWidth:  14,
    itemHeight: 8,
    itemGap:    16,
    textStyle:  { color: colors.legend, fontSize: 12, fontFamily: FONT },
    pageIconColor:  colors.paginator,
    pageTextStyle:  { color: colors.legend, fontSize: 11 },
  }
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────

export function buildBarOption(spec, horizontal = false, colors = LIGHT_COLORS) {
  const palette      = colors.palette ?? DARK_PALETTE
  const categories   = spec.data.map(d => String(d[spec.x_key]))
  const drillable    = !!spec.drill_down
  const dataLen      = spec.data.length
  const showLabels   = dataLen <= 12
  const dataZoom     = horizontal ? undefined : makeDataZoom(dataLen, colors)
  const hasLegend    = spec.y_keys.length > 1
  const singleSeries = spec.y_keys.length === 1   // ← give each bar its own color
  const axisBase     = makeAxisBase(colors)

  const series = spec.y_keys.map((key, i) => {
    const seriesColor = palette[i % palette.length]
    return {
      name: humanizeKey(key),
      type: 'bar',
      barMaxWidth: horizontal ? 34 : 54,
      barMinHeight: 3,
      // Per-bar colors when single-series; single color when multi-series
      data: spec.data.map((d, idx) => ({
        value: d[key],
        name: String(d[spec.x_key]),
        ...(singleSeries ? {
          itemStyle: {
            color:        barGradient(palette[idx % palette.length]),
            borderRadius: horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0],
          },
        } : {}),
      })),
      // Series-level itemStyle only for multi-series (overridden per-item above for single)
      itemStyle: singleSeries ? {
        borderRadius: horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0],
      } : {
        color:        barGradient(seriesColor),
        borderRadius: horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0],
      },
      cursor: drillable ? 'pointer' : 'default',
      emphasis: {
        itemStyle: {
          shadowBlur:   16,
          shadowOffsetY: horizontal ? 0 : 4,
          shadowColor:  (singleSeries ? palette[0] : seriesColor) + '55',
        },
      },
      label: showLabels ? {
        show:       true,
        position:   horizontal ? 'right' : 'top',
        formatter:  p => formatValue(p.value),
        color:      colors.label,
        fontSize:   11,
        fontWeight: 600,
        fontFamily: FONT,
        distance:   5,
      } : { show: false },
      animationDelay: idx => idx * 25,
    }
  })

  return {
    backgroundColor: 'transparent',
    animation:        true,
    animationDuration:800,
    animationEasing:  'cubicOut',
    toolbox: makeToolbox(colors),
    tooltip: makeAxisTooltip(colors),
    legend: hasLegend ? { ...makeLegend(colors, 4) } : { show: false },
    dataZoom,
    grid: {
      containLabel: true,
      left:   horizontal ? 12 : 16,
      right:  horizontal ? 86 : 16,
      top:    hasLegend ? 52 : 24,
      bottom: dataZoom ? 56 : 12,
    },
    xAxis: horizontal
      ? {
          type: 'value',
          ...axisBase,
          axisLabel: { ...axisBase.axisLabel, formatter: v => formatValue(v) },
        }
      : {
          type: 'category', data: categories,
          ...axisBase,
          splitLine: { show: false },
          axisLabel: {
            ...axisBase.axisLabel,
            rotate:   categories.length > 8 ? 35 : 0,
            overflow: 'truncate',
            width:    categories.length > 8 ? 90 : 120,
            interval: 0,
          },
        },
    yAxis: horizontal
      ? {
          type: 'category', data: categories,
          ...axisBase,
          splitLine: { show: false },
          axisLabel: { ...axisBase.axisLabel, overflow: 'truncate', width: 130 },
        }
      : {
          type: 'value',
          ...axisBase,
          axisLabel: { ...axisBase.axisLabel, formatter: v => formatValue(v) },
        },
    series,
  }
}

// ─── Stacked Bar ──────────────────────────────────────────────────────────────

export function buildStackedBarOption(spec, colors = LIGHT_COLORS) {
  const palette    = colors.palette ?? DARK_PALETTE
  const categories = spec.data.map(d => String(d[spec.x_key]))
  const drillable  = !!spec.drill_down
  const axisBase   = makeAxisBase(colors)

  // Per-category totals for the top label
  const totals = spec.data.map(d =>
    spec.y_keys.reduce((sum, k) => sum + (Number(d[k]) || 0), 0)
  )

  const series = spec.y_keys.map((key, i) => {
    const color  = palette[i % palette.length]
    const isLast = i === spec.y_keys.length - 1
    return {
      name: humanizeKey(key),
      type: 'bar',
      stack: 'total',
      barMaxWidth: 56,
      data: spec.data.map(d => ({ value: d[key], name: String(d[spec.x_key]) })),
      itemStyle: {
        color:        barGradient(color),
        borderRadius: isLast ? [6, 6, 0, 0] : [0, 0, 0, 0],
      },
      cursor: drillable ? 'pointer' : 'default',
      emphasis: {
        itemStyle: { shadowBlur: 12, shadowColor: color + '44' },
      },
      label: isLast ? {
        show:       true,
        position:   'top',
        formatter:  p => formatValue(totals[p.dataIndex]),
        color:      colors.label,
        fontSize:   11,
        fontWeight: 600,
        fontFamily: FONT,
        distance:   5,
      } : { show: false },
    }
  })

  return {
    backgroundColor: 'transparent',
    animation:        true,
    animationDuration:800,
    animationEasing:  'cubicOut',
    toolbox: makeToolbox(colors),
    tooltip: makeAxisTooltip(colors),
    legend: { ...makeLegend(colors, 4) },
    grid: { containLabel: true, left: 16, right: 16, top: 52, bottom: 12 },
    xAxis: {
      type: 'category', data: categories,
      ...axisBase,
      splitLine: { show: false },
      axisLabel: {
        ...axisBase.axisLabel,
        rotate:   categories.length > 8 ? 35 : 0,
        overflow: 'truncate',
        width:    90,
        interval: 0,
      },
    },
    yAxis: {
      type: 'value',
      ...axisBase,
      axisLabel: { ...axisBase.axisLabel, formatter: v => formatValue(v) },
    },
    series,
  }
}

// ─── Line / Area ──────────────────────────────────────────────────────────────

export function buildLineOption(spec, filled = false, colors = LIGHT_COLORS) {
  const palette    = colors.palette ?? DARK_PALETTE
  const categories = spec.data.map(d => String(d[spec.x_key]))
  const drillable  = !!spec.drill_down
  const dataLen    = spec.data.length
  const dataZoom   = makeDataZoom(dataLen, colors)
  const hasLegend  = spec.y_keys.length > 1
  const showSymbol = dataLen <= 20
  const axisBase   = makeAxisBase(colors)

  const series = spec.y_keys.map((key, i) => {
    const color = palette[i % palette.length]
    return {
      name: humanizeKey(key),
      type: 'line',
      smooth: true,
      smoothMonotone: 'x',
      data:        spec.data.map(d => ({ value: d[key], name: String(d[spec.x_key]) })),
      itemStyle:   { color },
      lineStyle:   { color, width: 3, cap: 'round' },
      symbol:      'circle',
      symbolSize:  8,
      showSymbol,
      cursor: drillable ? 'pointer' : 'default',
      emphasis: {
        focus: 'series',
        lineStyle:  { width: 4 },
        itemStyle:  { color, borderColor: '#fff', borderWidth: 2, shadowBlur: 8, shadowColor: color + '66' },
      },
      ...(filled ? { areaStyle: { color: areaGradient(color) } } : {}),
    }
  })

  return {
    backgroundColor: 'transparent',
    animation:        true,
    animationDuration:900,
    animationEasing:  'cubicOut',
    toolbox: makeToolbox(colors),
    tooltip: {
      ...makeAxisTooltip(colors),
      axisPointer: {
        type: 'cross',
        crossStyle: { color: colors.axis, width: 1, type: 'dashed' },
        label: {
          backgroundColor: palette[0],
          color:    '#fff',
          fontSize: 11,
          padding:  [4, 8],
        },
      },
    },
    legend: hasLegend ? { ...makeLegend(colors, 4) } : { show: false },
    dataZoom,
    grid: {
      containLabel: true,
      left: 16, right: 16,
      top:    hasLegend ? 52 : 24,
      bottom: dataZoom ? 56 : 12,
    },
    xAxis: {
      type: 'category', data: categories,
      ...axisBase,
      boundaryGap: false,
      axisLabel: {
        ...axisBase.axisLabel,
        rotate:   categories.length > 10 ? 35 : 0,
        overflow: 'truncate',
        width:    90,
        interval: dataLen > 20 ? Math.floor(dataLen / 10) : 0,
      },
    },
    yAxis: {
      type: 'value',
      ...axisBase,
      axisLabel: { ...axisBase.axisLabel, formatter: v => formatValue(v) },
    },
    series,
  }
}

// ─── Pie / Donut ──────────────────────────────────────────────────────────────

export function buildPieOption(spec, colors = LIGHT_COLORS) {
  const palette = colors.palette ?? DARK_PALETTE

  // Total for center label
  const total      = spec.data.reduce((s, d) => s + (Number(d[spec.value_key]) || 0), 0)
  const totalLabel = formatValue(total)

  const data = spec.data.map((d, i) => ({
    name:  String(d[spec.name_key]),
    value: d[spec.value_key],
    itemStyle: {
      color:        palette[i % palette.length],
      borderRadius: 4,    // subtle rounding — large value creates visible gaps
      borderColor:  'transparent',
      borderWidth:  2,
    },
  }))

  // >5 slices → legend on right, donut shifted left
  const manySlices = data.length > 5
  const centerX    = manySlices ? '40%' : '50%'
  const centerY    = '50%'

  const legend = manySlices
    ? { ...makeLegend(colors), orient: 'vertical', right: 8, top: 'middle', type: 'scroll' }
    : { ...makeLegend(colors), orient: 'horizontal', bottom: 4 }

  // Center label — ECharts `title` array is the most reliable way to perfectly
  // center text inside a donut. `left: centerX` + `textAlign: 'center'`
  // places the text anchor at the same X coordinate as the donut center.
  // Two title objects: main = value, second = "Total" below it.
  const title = [
    {
      text:      totalLabel,
      left:      centerX,
      top:       '40%',
      textAlign: 'center',
      textStyle: {
        color:      colors.label,
        fontSize:   26,
        fontWeight: 700,
        fontFamily: FONT,
        lineHeight: 30,
      },
    },
    {
      text:      'Total',
      left:      centerX,
      top:       '52%',
      textAlign: 'center',
      textStyle: {
        color:      colors.legend,
        fontSize:   13,
        fontWeight: 400,
        fontFamily: FONT,
      },
    },
  ]

  return {
    backgroundColor:  'transparent',
    animation:         true,
    animationDuration: 900,
    animationEasing:   'cubicOut',
    title,
    toolbox: makeToolbox(colors),
    tooltip: makePieTooltip(colors),
    legend,
    series: [{
      type:     'pie',
      radius:   ['42%', '70%'],
      center:   [centerX, centerY],
      padAngle: 2,          // reduced from 4 — subtle gap, not gaping
      cursor:   'pointer',
      data,
      label: {
        show:       true,
        color:      colors.label,
        fontSize:   11,
        fontFamily: FONT,
        formatter:  '{b|{b}}\n{d}%',
        rich: {
          b: { fontSize: 11, color: colors.label, fontWeight: 500, lineHeight: 16 },
        },
        overflow: 'truncate',
        width:    90,
      },
      labelLine: {
        length:    10,
        length2:   14,
        smooth:    true,
        lineStyle: { color: colors.axis, width: 1.5 },
      },
      emphasis: {
        scale:     true,
        scaleSize: 6,
        itemStyle: { shadowBlur: 20, shadowColor: 'rgba(0,0,0,0.35)' },
      },
    }],
  }
}
