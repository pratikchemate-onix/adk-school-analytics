// ─── Color Palettes ───────────────────────────────────────────────────────────
// Teal / blue / emerald dominant — matches the reference dashboard aesthetic

export const DARK_PALETTE = [
  '#60a5fa', // blue-400        — large dominant segments
  '#38bdf8', // sky-400         — secondary blue
  '#2dd4bf', // teal-400        — teal segments
  '#34d399', // emerald-400     — green segments
  '#818cf8', // indigo-400
  '#7dd3fc', // sky-300         — lighter blue
  '#5eead4', // teal-300        — lighter teal
  '#a78bfa', // violet-400
  '#94a3b8', // slate-400       — neutral/gray segments
  '#cbd5e1', // slate-300       — light gray
  '#6ee7b7', // emerald-300
  '#f472b6', // pink-400
  '#fb923c', // orange-400
  '#facc15', // yellow-400
  '#c084fc', // purple-400
  '#4ade80', // green-400
]

export const LIGHT_PALETTE = [
  '#3b82f6', // blue-500
  '#0284c7', // sky-600
  '#0d9488', // teal-600
  '#059669', // emerald-600
  '#4f46e5', // indigo-600
  '#0369a1', // sky-700
  '#0f766e', // teal-700
  '#7c3aed', // violet-600
  '#64748b', // slate-500
  '#94a3b8', // slate-400
  '#16a34a', // green-600
  '#db2777', // pink-600
  '#ea580c', // orange-600
  '#ca8a04', // yellow-600
  '#9333ea', // purple-600
  '#15803d', // green-700
]

// Keep for backward-compat imports
export const CHART_COLORS = DARK_PALETTE

export const DARK_COLORS = {
  axis:          '#94a3b8',
  label:         '#e2e8f0',
  legend:        '#94a3b8',
  title:         '#f1f5f9',
  splitLine:     'rgba(148,163,184,0.08)',
  tooltipBg:     '#0c1929',
  tooltipBorder: '#1e3a5f',
  tooltipText:   '#f1f5f9',
  tooltipMuted:  '#94a3b8',
  paginator:     '#38bdf8',
  toolboxIcon:   '#475569',
  toolboxHover:  '#e2e8f0',
  // Horizontal bar gradient endpoints (left → right)
  hbarStart:     '#164e63',  // cyan-900 dark
  hbarMid:       '#0e7490',  // cyan-700
  hbarEnd:       '#22d3ee',  // cyan-400 bright
  palette:       DARK_PALETTE,
}

export const LIGHT_COLORS = {
  axis:          '#64748b',
  label:         '#1e293b',
  legend:        '#64748b',
  title:         '#0f172a',
  splitLine:     'rgba(100,116,139,0.10)',
  tooltipBg:     '#ffffff',
  tooltipBorder: '#e2e8f0',
  tooltipText:   '#0f172a',
  tooltipMuted:  '#64748b',
  paginator:     '#3b82f6',
  toolboxIcon:   '#94a3b8',
  toolboxHover:  '#0f172a',
  // Horizontal bar gradient endpoints (left → right)
  hbarStart:     '#075985',  // sky-800
  hbarMid:       '#0284c7',  // sky-600
  hbarEnd:       '#38bdf8',  // sky-400
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

// ─── Font Scale ───────────────────────────────────────────────────────────────
// Returns pixel font sizes scaled by a viewport-derived factor (0.7 – 1.2).
// Pass `fontScale` from useThemeColors() → ChartRenderer → each chart view.

export function getChartFonts(scale = 1) {
  const s = Math.max(0.7, Math.min(1.2, scale))
  return {
    axis:      Math.round(12 * s),   // axis tick labels
    label:     Math.round(11 * s),   // bar / data labels
    legend:    Math.round(12 * s),   // legend text
    tooltip:   Math.round(13 * s),   // tooltip body
    pie:       Math.round(11 * s),   // pie slice labels
    center:    Math.round(26 * s),   // donut center main value
    centerSub: Math.round(13 * s),   // donut center "Total" caption
  }
}

// ─── Gradient Helpers ─────────────────────────────────────────────────────────

// Vertical gradient for vertical bars (top → bottom)
function barGradient(color) {
  return {
    type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
    colorStops: [
      { offset: 0,   color: color },
      { offset: 1,   color: color + 'aa' },
    ],
  }
}

// Horizontal gradient for horizontal bars (left → right) — matches reference image
// All bars share the SAME gradient: dark navy-teal → bright cyan
function hbarGradient(colors) {
  return {
    type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
    colorStops: [
      { offset: 0,    color: colors.hbarStart },
      { offset: 0.55, color: colors.hbarMid },
      { offset: 1,    color: colors.hbarEnd },
    ],
  }
}

// Vertical gradient for multi-series horizontal bars (per-series color)
function hbarSeriesGradient(color) {
  return {
    type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
    colorStops: [
      { offset: 0, color: color + 'bb' },
      { offset: 1, color: color },
    ],
  }
}

// Area-chart gradient (dramatic fade, vertical)
function areaGradient(color) {
  return {
    type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
    colorStops: [
      { offset: 0,   color: color + '70' },
      { offset: 0.5, color: color + '28' },
      { offset: 1,   color: color + '05' },
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

// ─── Shared Sub-Builders ──────────────────────────────────────────────────────

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
      borderColor:     colors.tooltipBorder,
      fillerColor:     (colors.palette[0]) + '22',
      handleStyle:     { color: colors.palette[0], borderColor: colors.palette[0] },
      moveHandleStyle: { color: colors.palette[0] },
      textStyle:       { color: colors.axis, fontSize: 11 },
    },
  ]
}

function makeAxisBase(colors, fonts) {
  return {
    axisLine:  { show: false },
    axisTick:  { show: false },
    splitLine: { lineStyle: { type: 'dashed', color: colors.splitLine, width: 1 } },
    axisLabel: { color: colors.axis, fontSize: fonts.axis, fontFamily: FONT },
  }
}

// Rich axis tooltip (bar / line)
function makeAxisTooltip(colors, fonts) {
  return {
    trigger: 'axis',
    confine: true,
    backgroundColor: colors.tooltipBg,
    borderColor:     colors.tooltipBorder,
    borderWidth: 1,
    padding: [10, 14],
    extraCssText: `border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,0.28);`,
    textStyle: { color: colors.tooltipText, fontSize: fonts.tooltip, fontFamily: FONT },
    formatter(params) {
      const header =
        `<div style="font-size:${fonts.tooltip - 1}px;color:${colors.tooltipMuted};margin-bottom:6px;font-weight:500;letter-spacing:0.03em">` +
        `${params[0]?.axisValueLabel ?? params[0]?.name ?? ''}</div>`
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
function makePieTooltip(colors, fonts) {
  return {
    trigger: 'item',
    confine: true,
    backgroundColor: colors.tooltipBg,
    borderColor:     colors.tooltipBorder,
    borderWidth: 1,
    padding: [10, 14],
    extraCssText: `border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,0.28);`,
    textStyle: { color: colors.tooltipText, fontSize: fonts.tooltip, fontFamily: FONT },
    formatter(p) {
      return (
        `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">` +
        `${tooltipDot(p.color)}<span style="font-weight:600;color:${colors.tooltipText}">${p.name}</span></div>` +
        `<div style="display:flex;justify-content:space-between;gap:24px;margin-bottom:3px">` +
        `<span style="color:${colors.tooltipMuted};font-size:${fonts.tooltip - 1}px">Value</span>` +
        `<span style="font-weight:700">${formatValue(p.value)}</span></div>` +
        `<div style="display:flex;justify-content:space-between;gap:24px">` +
        `<span style="color:${colors.tooltipMuted};font-size:${fonts.tooltip - 1}px">Share</span>` +
        `<span style="font-weight:700">${p.percent}%</span></div>`
      )
    },
  }
}

function makeLegend(colors, fonts, top = 4) {
  return {
    type:       'scroll',
    top,
    icon:       'roundRect',
    itemWidth:  14,
    itemHeight: 8,
    itemGap:    16,
    textStyle:  { color: colors.legend, fontSize: fonts.legend, fontFamily: FONT },
    pageIconColor:  colors.paginator,
    pageTextStyle:  { color: colors.legend, fontSize: fonts.legend - 1 },
  }
}

// ─── Bar Chart (vertical + horizontal) ────────────────────────────────────────

export function buildBarOption(spec, horizontal = false, colors = LIGHT_COLORS, fontScale = 1) {
  const fonts      = getChartFonts(fontScale)
  const palette    = colors.palette ?? DARK_PALETTE
  const categories = spec.data.map(d => String(d[spec.x_key]))
  const drillable  = !!spec.drill_down
  const dataLen    = spec.data.length
  const showLabels = dataLen <= 16
  const dataZoom   = horizontal ? undefined : makeDataZoom(dataLen, colors)
  const hasLegend  = spec.y_keys.length > 1
  const singleSeries = spec.y_keys.length === 1
  const axisBase   = makeAxisBase(colors, fonts)

  const series = spec.y_keys.map((key, i) => {
    const seriesColor = palette[i % palette.length]

    // ── Horizontal single-series: all bars get the same left-to-right gradient
    if (horizontal && singleSeries) {
      const grad = hbarGradient(colors)
      return {
        name: humanizeKey(key),
        type: 'bar',
        barMaxWidth: 32,
        barMinHeight: 3,
        barCategoryGap: '30%',
        data: spec.data.map(d => ({
          value: d[key],
          name:  String(d[spec.x_key]),
          itemStyle: {
            color:        grad,
            borderRadius: [0, 6, 6, 0],
          },
        })),
        cursor: drillable ? 'pointer' : 'default',
        emphasis: {
          itemStyle: {
            shadowBlur:  20,
            shadowColor: colors.hbarEnd + '55',
          },
        },
        label: showLabels ? {
          show:       true,
          position:   'right',
          formatter:  p => formatValue(p.value),
          color:      colors.label,
          fontSize:   fonts.label,
          fontWeight: 600,
          fontFamily: FONT,
          distance:   6,
        } : { show: false },
        animationDelay: idx => idx * 30,
      }
    }

    // ── Horizontal multi-series: per-series left-to-right gradient
    if (horizontal && !singleSeries) {
      return {
        name: humanizeKey(key),
        type: 'bar',
        barMaxWidth: 28,
        barMinHeight: 3,
        data: spec.data.map(d => ({ value: d[key], name: String(d[spec.x_key]) })),
        itemStyle: {
          color:        hbarSeriesGradient(seriesColor),
          borderRadius: [0, 6, 6, 0],
        },
        cursor: drillable ? 'pointer' : 'default',
        emphasis: {
          itemStyle: { shadowBlur: 16, shadowColor: seriesColor + '55' },
        },
        label: showLabels ? {
          show: true, position: 'right',
          formatter: p => formatValue(p.value),
          color: colors.label, fontSize: fonts.label, fontWeight: 600,
          fontFamily: FONT, distance: 6,
        } : { show: false },
      }
    }

    // ── Vertical single-series: per-bar palette colors with vertical gradient
    if (!horizontal && singleSeries) {
      return {
        name: humanizeKey(key),
        type: 'bar',
        barMaxWidth: 54,
        barMinHeight: 3,
        data: spec.data.map((d, idx) => ({
          value: d[key],
          name:  String(d[spec.x_key]),
          itemStyle: {
            color:        barGradient(palette[idx % palette.length]),
            borderRadius: [6, 6, 0, 0],
          },
        })),
        cursor: drillable ? 'pointer' : 'default',
        emphasis: {
          itemStyle: { shadowBlur: 16, shadowOffsetY: 4, shadowColor: palette[0] + '55' },
        },
        label: showLabels ? {
          show: true, position: 'top',
          formatter: p => formatValue(p.value),
          color: colors.label, fontSize: fonts.label, fontWeight: 600,
          fontFamily: FONT, distance: 5,
        } : { show: false },
        animationDelay: idx => idx * 25,
      }
    }

    // ── Vertical multi-series: per-series color
    return {
      name: humanizeKey(key),
      type: 'bar',
      barMaxWidth: 54,
      barMinHeight: 3,
      data: spec.data.map(d => ({ value: d[key], name: String(d[spec.x_key]) })),
      itemStyle: {
        color:        barGradient(seriesColor),
        borderRadius: [6, 6, 0, 0],
      },
      cursor: drillable ? 'pointer' : 'default',
      emphasis: {
        itemStyle: { shadowBlur: 16, shadowOffsetY: 4, shadowColor: seriesColor + '55' },
      },
      label: showLabels ? {
        show: true, position: 'top',
        formatter: p => formatValue(p.value),
        color: colors.label, fontSize: fonts.label, fontWeight: 600,
        fontFamily: FONT, distance: 5,
      } : { show: false },
      animationDelay: idx => idx * 25,
    }
  })

  return {
    backgroundColor: 'transparent',
    animation:        true,
    animationDuration: 900,
    animationEasing:   'cubicOut',
    toolbox: makeToolbox(colors),
    tooltip: makeAxisTooltip(colors, fonts),
    legend:  hasLegend ? { ...makeLegend(colors, fonts, 4) } : { show: false },
    dataZoom,
    grid: {
      containLabel: true,
      left:   horizontal ? 12 : 16,
      right:  horizontal ? 96 : 16,
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

export function buildStackedBarOption(spec, colors = LIGHT_COLORS, fontScale = 1) {
  const fonts    = getChartFonts(fontScale)
  const palette  = colors.palette ?? DARK_PALETTE
  const categories = spec.data.map(d => String(d[spec.x_key]))
  const drillable  = !!spec.drill_down
  const axisBase   = makeAxisBase(colors, fonts)

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
        fontSize:   fonts.label,
        fontWeight: 600,
        fontFamily: FONT,
        distance:   5,
      } : { show: false },
    }
  })

  return {
    backgroundColor: 'transparent',
    animation:        true,
    animationDuration: 900,
    animationEasing:   'cubicOut',
    toolbox: makeToolbox(colors),
    tooltip: makeAxisTooltip(colors, fonts),
    legend:  { ...makeLegend(colors, fonts, 4) },
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

export function buildLineOption(spec, filled = false, colors = LIGHT_COLORS, fontScale = 1) {
  const fonts    = getChartFonts(fontScale)
  const palette  = colors.palette ?? DARK_PALETTE
  const categories = spec.data.map(d => String(d[spec.x_key]))
  const drillable  = !!spec.drill_down
  const dataLen    = spec.data.length
  const dataZoom   = makeDataZoom(dataLen, colors)
  const hasLegend  = spec.y_keys.length > 1
  const showSymbol = dataLen <= 20
  const axisBase   = makeAxisBase(colors, fonts)

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
        itemStyle:  { color, borderColor: '#fff', borderWidth: 2, shadowBlur: 10, shadowColor: color + '66' },
      },
      ...(filled ? { areaStyle: { color: areaGradient(color) } } : {}),
    }
  })

  return {
    backgroundColor: 'transparent',
    animation:        true,
    animationDuration: 900,
    animationEasing:   'cubicOut',
    toolbox: makeToolbox(colors),
    tooltip: {
      ...makeAxisTooltip(colors, fonts),
      axisPointer: {
        type: 'cross',
        crossStyle: { color: colors.axis, width: 1, type: 'dashed' },
        label: {
          backgroundColor: palette[0],
          color:    '#fff',
          fontSize: fonts.axis - 1,
          padding:  [4, 8],
        },
      },
    },
    legend:   hasLegend ? { ...makeLegend(colors, fonts, 4) } : { show: false },
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

export function buildPieOption(spec, colors = LIGHT_COLORS, fontScale = 1) {
  const fonts   = getChartFonts(fontScale)
  const palette = colors.palette ?? DARK_PALETTE

  // Total for center label
  const total      = spec.data.reduce((s, d) => s + (Number(d[spec.value_key]) || 0), 0)
  const totalLabel = formatValue(total)

  const data = spec.data.map((d, i) => ({
    name:  String(d[spec.name_key]),
    value: d[spec.value_key],
    itemStyle: {
      color:        palette[i % palette.length],
      borderRadius: 5,
      borderColor:  'transparent',
      borderWidth:  2,
    },
  }))

  // >5 slices → legend on right, donut shifted left
  const manySlices = data.length > 5
  const centerX    = manySlices ? '40%' : '50%'
  const centerY    = '50%'

  const legend = manySlices
    ? {
        ...makeLegend(colors, fonts),
        orient: 'vertical',
        right:  8,
        top:    'middle',
        type:   'scroll',
      }
    : {
        ...makeLegend(colors, fonts),
        orient: 'horizontal',
        bottom: 4,
      }

  // Two ECharts `title` objects: main value + "Total" label below
  const title = [
    {
      text:      totalLabel,
      left:      centerX,
      top:       '41%',
      textAlign: 'center',
      textStyle: {
        color:      colors.label,
        fontSize:   fonts.center,
        fontWeight: 700,
        fontFamily: FONT,
        lineHeight: fonts.center + 4,
      },
    },
    {
      text:      'Total',
      left:      centerX,
      top:       '53%',
      textAlign: 'center',
      textStyle: {
        color:      colors.legend,
        fontSize:   fonts.centerSub,
        fontWeight: 400,
        fontFamily: FONT,
      },
    },
  ]

  return {
    backgroundColor:   'transparent',
    animation:          true,
    animationDuration:  900,
    animationEasing:    'cubicOut',
    title,
    toolbox: makeToolbox(colors),
    tooltip: makePieTooltip(colors, fonts),
    legend,
    series: [{
      type:     'pie',
      // Thinner ring ratio — matches the reference donut style
      radius:   ['42%', '70%'],
      center:   [centerX, centerY],
      padAngle: 2,
      cursor:   'pointer',
      data,
      label: {
        show:       true,
        color:      colors.label,
        fontSize:   fonts.pie,
        fontFamily: FONT,
        formatter:  '{b}',
        overflow:   'truncate',
        width:      88,
      },
      labelLine: {
        length:    10,
        length2:   16,
        smooth:    true,
        lineStyle: { color: colors.axis, width: 1.5 },
      },
      emphasis: {
        scale:     true,
        scaleSize: 7,
        itemStyle: { shadowBlur: 24, shadowColor: 'rgba(0,0,0,0.35)' },
        label: {
          fontSize: fonts.pie + 1,
          fontWeight: 600,
        },
      },
    }],
  }
}
