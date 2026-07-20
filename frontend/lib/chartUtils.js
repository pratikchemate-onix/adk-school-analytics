// ─── Color Palettes ───────────────────────────────────────────────────────────
// 12 vibrant, high-saturation colors — each pops hard on a dark navy background.
// Ordered for maximum contrast when cycling across consecutive chart elements.

export const DARK_PALETTE = [
  '#22d3ee', // [0]  Electric Cyan
  '#e879f9', // [1]  Electric Fuchsia  ← was muted violet, now vivid hot-pink/magenta
  '#34d399', // [2]  Bright Emerald
  '#fb923c', // [3]  Vivid Orange
  '#f472b6', // [4]  Hot Pink
  '#60a5fa', // [5]  Electric Blue
  '#facc15', // [6]  Golden Yellow
  '#4ade80', // [7]  Lime Green
  '#a855f7', // [8]  Saturated Purple  ← replaces #e879f9 (moved to [1])
  '#38bdf8', // [9]  Sky Blue
  '#f87171', // [10] Coral Red
  '#2dd4bf', // [11] Vivid Teal
]

export const LIGHT_PALETTE = [
  '#0e7490', // [0]  Deep Cyan
  '#7c3aed', // [1]  Deep Violet
  '#059669', // [2]  Deep Emerald
  '#ea580c', // [3]  Deep Orange
  '#db2777', // [4]  Deep Pink
  '#2563eb', // [5]  Deep Blue
  '#ca8a04', // [6]  Deep Amber
  '#16a34a', // [7]  Deep Green
  '#c026d3', // [8]  Deep Fuchsia
  '#0284c7', // [9]  Deep Sky
  '#dc2626', // [10] Deep Red
  '#0d9488', // [11] Deep Teal
]

// Keep for backward-compat imports
export const CHART_COLORS = DARK_PALETTE

export const DARK_COLORS = {
  axis:          '#cbd5e1',              // brighter axis labels (was #94a3b8)
  label:         '#f8fafc',              // near-white data labels
  legend:        '#cbd5e1',              // bright legend
  title:         '#f8fafc',
  splitLine:     'rgba(148,163,184,0.13)', // slightly more visible grid
  tooltipBg:     '#0a1628',
  tooltipBorder: '#22d3ee',             // cyan glow border
  tooltipText:   '#f8fafc',
  tooltipMuted:  '#94a3b8',
  paginator:     '#22d3ee',
  toolboxIcon:   '#64748b',
  toolboxHover:  '#f8fafc',
  // Fallback hbar gradient (used only for multi-series)
  hbarStart:     '#0e7490',
  hbarMid:       '#06b6d4',
  hbarEnd:       '#67e8f9',
  palette:       DARK_PALETTE,
}

export const LIGHT_COLORS = {
  axis:          '#475569',
  label:         '#0f172a',
  legend:        '#475569',
  title:         '#0f172a',
  splitLine:     'rgba(71,85,105,0.12)',
  tooltipBg:     '#ffffff',
  tooltipBorder: '#0e7490',
  tooltipText:   '#0f172a',
  tooltipMuted:  '#64748b',
  paginator:     '#0e7490',
  toolboxIcon:   '#94a3b8',
  toolboxHover:  '#0f172a',
  hbarStart:     '#075985',
  hbarMid:       '#0284c7',
  hbarEnd:       '#38bdf8',
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

export function getChartFonts(scale = 1) {
  const s = Math.max(0.7, Math.min(1.2, scale))
  return {
    axis:      Math.round(12 * s),
    label:     Math.round(11 * s),
    legend:    Math.round(12 * s),
    tooltip:   Math.round(13 * s),
    pie:       Math.round(11 * s),
    center:    Math.round(26 * s),
    centerSub: Math.round(13 * s),
  }
}

// ─── Gradient & Glow Helpers ──────────────────────────────────────────────────

// Per-bar horizontal gradient: translucent left → full-bright right.
// Creates a "glow sweep" effect on a dark background — each bar has its own color.
function perBarHGradient(color) {
  return {
    type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
    colorStops: [
      { offset: 0,    color: color + '28' }, // ~16% — nearly invisible start
      { offset: 0.4,  color: color + 'aa' }, // ~67% — mid
      { offset: 1,    color: color },         // 100% — full vibrant end
    ],
  }
}

// Multi-series hbar: per-series color, same sweep gradient
function hbarSeriesGradient(color) {
  return {
    type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
    colorStops: [
      { offset: 0,   color: color + '40' },
      { offset: 0.5, color: color + 'bb' },
      { offset: 1,   color: color },
    ],
  }
}

// Vertical bar gradient: full bright top → still-visible bottom
function barGradient(color) {
  return {
    type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
    colorStops: [
      { offset: 0,   color: color },
      { offset: 1,   color: color + '70' }, // 44% — was 'aa', now brighter fade
    ],
  }
}

// Area-chart fill: more vivid than before
function areaGradient(color) {
  return {
    type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
    colorStops: [
      { offset: 0,   color: color + '95' }, // 58% — was '70'
      { offset: 0.5, color: color + '45' }, // 27% — was '28'
      { offset: 1,   color: color + '08' }, // ~3%
    ],
  }
}

// Extract plain hex from gradient (for tooltip dots)
function plainColor(c) {
  if (c && typeof c === 'object' && c.colorStops)
    return c.colorStops[c.colorStops.length - 1].color.replace(/[0-9a-f]{2}$/i, '')
  return c
}

// Rich tooltip dot
function tooltipDot(color) {
  const hex = plainColor(color)
  return `<span style="display:inline-block;width:9px;height:9px;border-radius:50%;` +
    `background:${hex};margin-right:7px;flex-shrink:0;` +
    `box-shadow:0 0 6px ${hex}99"></span>`
}

const FONT = "'Google Sans', 'Segoe UI', system-ui, sans-serif"

// ─── Shared Sub-Builders ──────────────────────────────────────────────────────

function makeToolbox(colors) {
  return {
    feature: {
      saveAsImage: { title: 'Save', pixelRatio: 2 },
    },
    iconStyle:  { borderColor: colors.toolboxIcon },
    emphasis:   { iconStyle: { borderColor: colors.toolboxHover } },
    top: 6, right: 10,
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
      fillerColor:     colors.palette[0] + '22',
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

// Glowing tooltip border helper
function tooltipExtraCss(borderColor) {
  return `border-radius:12px;` +
    `box-shadow:0 16px 40px rgba(0,0,0,0.45),` +
    `0 0 0 1px ${borderColor}33,` +
    `0 0 20px ${borderColor}22;`
}

function makeAxisTooltip(colors, fonts) {
  return {
    trigger: 'axis',
    confine: true,
    backgroundColor: colors.tooltipBg,
    borderColor:     colors.tooltipBorder,
    borderWidth: 1,
    padding: [10, 14],
    extraCssText: tooltipExtraCss(colors.tooltipBorder),
    textStyle: { color: colors.tooltipText, fontSize: fonts.tooltip, fontFamily: FONT },
    formatter(params) {
      const header =
        `<div style="font-size:${fonts.tooltip - 1}px;color:${colors.tooltipMuted};` +
        `margin-bottom:6px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase">` +
        `${params[0]?.axisValueLabel ?? params[0]?.name ?? ''}</div>`
      const rows = params.map(p =>
        `<div style="display:flex;align-items:center;justify-content:space-between;gap:20px;margin:4px 0">` +
        `<span style="display:flex;align-items:center">${tooltipDot(p.color)}` +
        `<span style="color:${colors.tooltipText}">${p.seriesName}</span></span>` +
        `<span style="font-weight:700;color:${colors.tooltipText};font-variant-numeric:tabular-nums">` +
        `${formatValue(p.value?.value ?? p.value)}</span>` +
        `</div>`
      ).join('')
      return header + rows
    },
  }
}

function makePieTooltip(colors, fonts) {
  return {
    trigger: 'item',
    confine: true,
    backgroundColor: colors.tooltipBg,
    borderColor:     colors.tooltipBorder,
    borderWidth: 1,
    padding: [10, 14],
    extraCssText: tooltipExtraCss(colors.tooltipBorder),
    textStyle: { color: colors.tooltipText, fontSize: fonts.tooltip, fontFamily: FONT },
    formatter(p) {
      return (
        `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">` +
        `${tooltipDot(p.color)}<span style="font-weight:700;color:${colors.tooltipText}">${p.name}</span></div>` +
        `<div style="display:flex;justify-content:space-between;gap:24px;margin-bottom:4px">` +
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

// ─── Bar Chart ────────────────────────────────────────────────────────────────

export function buildBarOption(spec, horizontal = false, colors = LIGHT_COLORS, fontScale = 1) {
  const fonts        = getChartFonts(fontScale)
  const palette      = colors.palette ?? DARK_PALETTE
  const categories   = spec.data.map(d => String(d[spec.x_key]))
  const drillable    = !!spec.drill_down
  const dataLen      = spec.data.length
  const showLabels   = dataLen <= 16
  const dataZoom     = horizontal ? undefined : makeDataZoom(dataLen, colors)
  const hasLegend    = spec.y_keys.length > 1
  const singleSeries = spec.y_keys.length === 1
  const axisBase     = makeAxisBase(colors, fonts)

  const series = spec.y_keys.map((key, i) => {
    const seriesColor = palette[i % palette.length]

    // ── Horizontal single-series ──────────────────────────────────────────────
    // Each bar gets its OWN vibrant color from the palette, with a sweep gradient.
    if (horizontal && singleSeries) {
      return {
        name: humanizeKey(key),
        type: 'bar',
        barMaxWidth: 36,
        barMinHeight: 4,
        barCategoryGap: '32%',
        data: spec.data.map((d, idx) => {
          const barColor = palette[idx % palette.length]
          return {
            value: d[key],
            name:  String(d[spec.x_key]),
            itemStyle: {
              color:        perBarHGradient(barColor),
              borderRadius: [0, 8, 8, 0],
              // Ambient glow — always on
              shadowBlur:   10,
              shadowOffsetX: 0,
              shadowColor:  barColor + '50',
            },
          }
        }),
        cursor: drillable ? 'pointer' : 'default',
        emphasis: {
          itemStyle: {
            shadowBlur:   32,
            shadowOffsetX: 2,
            shadowColor:  palette[0] + '80',
          },
        },
        label: showLabels ? {
          show:       true,
          position:   'right',
          formatter:  p => formatValue(p.value),
          color:      colors.label,
          fontSize:   fonts.label,
          fontWeight: 700,
          fontFamily: FONT,
          distance:   8,
        } : { show: false },
        animationDelay: idx => idx * 40,
        animationDuration: 1000,
        animationEasing: 'cubicOut',
      }
    }

    // ── Horizontal multi-series ───────────────────────────────────────────────
    if (horizontal && !singleSeries) {
      return {
        name: humanizeKey(key),
        type: 'bar',
        barMaxWidth: 28,
        barMinHeight: 3,
        data: spec.data.map(d => ({ value: d[key], name: String(d[spec.x_key]) })),
        itemStyle: {
          color:        hbarSeriesGradient(seriesColor),
          borderRadius: [0, 8, 8, 0],
          shadowBlur:   8,
          shadowColor:  seriesColor + '45',
        },
        cursor: drillable ? 'pointer' : 'default',
        emphasis: {
          itemStyle: {
            shadowBlur:  28,
            shadowColor: seriesColor + '80',
          },
        },
        label: showLabels ? {
          show: true, position: 'right',
          formatter: p => formatValue(p.value),
          color: colors.label, fontSize: fonts.label, fontWeight: 700,
          fontFamily: FONT, distance: 8,
        } : { show: false },
      }
    }

    // ── Vertical single-series ────────────────────────────────────────────────
    // Each bar gets its own vibrant palette color + vertical gradient
    if (!horizontal && singleSeries) {
      return {
        name: humanizeKey(key),
        type: 'bar',
        barMaxWidth: 56,
        barMinHeight: 4,
        data: spec.data.map((d, idx) => {
          const barColor = palette[idx % palette.length]
          return {
            value: d[key],
            name:  String(d[spec.x_key]),
            itemStyle: {
              color:        barGradient(barColor),
              borderRadius: [8, 8, 0, 0],
              shadowBlur:   8,
              shadowOffsetY: -2,
              shadowColor:  barColor + '50',
            },
          }
        }),
        cursor: drillable ? 'pointer' : 'default',
        emphasis: {
          itemStyle: {
            shadowBlur:   28,
            shadowOffsetY: -4,
            shadowColor:  palette[0] + '80',
          },
        },
        label: showLabels ? {
          show: true, position: 'top',
          formatter: p => formatValue(p.value),
          color: colors.label, fontSize: fonts.label, fontWeight: 700,
          fontFamily: FONT, distance: 6,
        } : { show: false },
        animationDelay: idx => idx * 40,
        animationDuration: 1000,
        animationEasing: 'cubicOut',
      }
    }

    // ── Vertical multi-series ─────────────────────────────────────────────────
    return {
      name: humanizeKey(key),
      type: 'bar',
      barMaxWidth: 56,
      barMinHeight: 4,
      data: spec.data.map(d => ({ value: d[key], name: String(d[spec.x_key]) })),
      itemStyle: {
        color:        barGradient(seriesColor),
        borderRadius: [8, 8, 0, 0],
        shadowBlur:   8,
        shadowOffsetY: -2,
        shadowColor:  seriesColor + '50',
      },
      cursor: drillable ? 'pointer' : 'default',
      emphasis: {
        itemStyle: {
          shadowBlur:   28,
          shadowOffsetY: -4,
          shadowColor:  seriesColor + '80',
        },
      },
      label: showLabels ? {
        show: true, position: 'top',
        formatter: p => formatValue(p.value),
        color: colors.label, fontSize: fonts.label, fontWeight: 700,
        fontFamily: FONT, distance: 6,
      } : { show: false },
      animationDelay: idx => idx * 40,
      animationDuration: 1000,
      animationEasing: 'cubicOut',
    }
  })

  return {
    backgroundColor: 'transparent',
    animation:        true,
    animationDuration: 1000,
    animationEasing:   'cubicOut',
    toolbox: makeToolbox(colors),
    tooltip: makeAxisTooltip(colors, fonts),
    legend:  hasLegend ? makeLegend(colors, fonts, 4) : { show: false },
    dataZoom,
    grid: {
      containLabel: true,
      left:   horizontal ? 12 : 16,
      right:  horizontal ? 100 : 16,
      top:    hasLegend ? 52 : 28,
      bottom: dataZoom ? 56 : 14,
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
  const fonts      = getChartFonts(fontScale)
  const palette    = colors.palette ?? DARK_PALETTE
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
        borderRadius: isLast ? [8, 8, 0, 0] : [0, 0, 0, 0],
        shadowBlur:   isLast ? 8 : 0,
        shadowOffsetY: isLast ? -2 : 0,
        shadowColor:  color + '40',
      },
      cursor: drillable ? 'pointer' : 'default',
      emphasis: {
        itemStyle: {
          shadowBlur:  24,
          shadowColor: color + '70',
        },
      },
      label: isLast ? {
        show:       true,
        position:   'top',
        formatter:  p => formatValue(totals[p.dataIndex]),
        color:      colors.label,
        fontSize:   fonts.label,
        fontWeight: 700,
        fontFamily: FONT,
        distance:   6,
      } : { show: false },
    }
  })

  return {
    backgroundColor: 'transparent',
    animation:        true,
    animationDuration: 1000,
    animationEasing:   'cubicOut',
    toolbox: makeToolbox(colors),
    tooltip: makeAxisTooltip(colors, fonts),
    legend:  makeLegend(colors, fonts, 4),
    grid: { containLabel: true, left: 16, right: 16, top: 52, bottom: 14 },
    xAxis: {
      type: 'category', data: categories,
      ...axisBase,
      splitLine: { show: false },
      axisLabel: {
        ...axisBase.axisLabel,
        rotate:   categories.length > 8 ? 35 : 0,
        overflow: 'truncate',
        width:    90, interval: 0,
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
  const fonts      = getChartFonts(fontScale)
  const palette    = colors.palette ?? DARK_PALETTE
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
      data:       spec.data.map(d => ({ value: d[key], name: String(d[spec.x_key]) })),
      itemStyle:  {
        color,
        borderColor: '#fff',
        borderWidth: 2,
        shadowBlur:  8,
        shadowColor: color + '80',
      },
      lineStyle: {
        color,
        width: 4,          // thicker line (was 3)
        cap:   'round',
        // Glow on the line itself
        shadowBlur:  10,
        shadowColor: color + '70',
      },
      symbol:     'circle',
      symbolSize: 10,       // larger symbol (was 8)
      showSymbol,
      cursor: drillable ? 'pointer' : 'default',
      emphasis: {
        focus: 'series',
        lineStyle: {
          width:       5,
          shadowBlur:  18,
          shadowColor: color + '90',
        },
        itemStyle: {
          color,
          borderColor: '#fff',
          borderWidth: 3,
          shadowBlur:  20,
          shadowColor: color + '90',
        },
      },
      ...(filled ? { areaStyle: { color: areaGradient(color) } } : {}),
    }
  })

  return {
    backgroundColor: 'transparent',
    animation:        true,
    animationDuration: 1000,
    animationEasing:   'cubicOut',
    toolbox: makeToolbox(colors),
    tooltip: {
      ...makeAxisTooltip(colors, fonts),
      axisPointer: {
        type: 'cross',
        crossStyle: { color: colors.axis + 'aa', width: 1, type: 'dashed' },
        label: {
          backgroundColor: palette[0],
          borderColor:     palette[0],
          color:    '#fff',
          fontSize: fonts.axis,
          fontWeight: 700,
          padding:  [5, 10],
          shadowBlur:  8,
          shadowColor: palette[0] + '80',
        },
      },
    },
    legend:   hasLegend ? makeLegend(colors, fonts, 4) : { show: false },
    dataZoom,
    grid: {
      containLabel: true,
      left: 16, right: 16,
      top:    hasLegend ? 52 : 28,
      bottom: dataZoom ? 56 : 14,
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

  const total      = spec.data.reduce((s, d) => s + (Number(d[spec.value_key]) || 0), 0)
  const totalLabel = formatValue(total)

  const data = spec.data.map((d, i) => {
    const color = palette[i % palette.length]
    return {
      name:  String(d[spec.name_key]),
      value: d[spec.value_key],
      itemStyle: {
        color,
        borderRadius: 6,
        borderColor:  'transparent',
        borderWidth:  2,
        // Per-slice ambient glow — makes slices pop on dark background
        shadowBlur:   12,
        shadowColor:  color + '50',
      },
    }
  })

  const manySlices = data.length > 5
  const centerX    = manySlices ? '40%' : '50%'
  const centerY    = '50%'

  const legend = manySlices
    ? { ...makeLegend(colors, fonts), orient: 'vertical', right: 8, top: 'middle', type: 'scroll' }
    : { ...makeLegend(colors, fonts), orient: 'horizontal', bottom: 4 }

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
        // Glow on the center label
        textShadowBlur:  10,
        textShadowColor: palette[0] + '80',
        textShadowOffsetX: 0,
        textShadowOffsetY: 0,
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
        fontWeight: 500,
        fontFamily: FONT,
      },
    },
  ]

  return {
    backgroundColor:   'transparent',
    animation:          true,
    animationDuration:  1000,
    animationEasing:    'cubicOut',
    animationType:      'scale',         // scale-in animation for donut
    title,
    toolbox: makeToolbox(colors),
    tooltip: makePieTooltip(colors, fonts),
    legend,
    series: [{
      type:     'pie',
      radius:   ['42%', '70%'],
      center:   [centerX, centerY],
      padAngle: 3,
      cursor:   'pointer',
      data,
      label: {
        show:       true,
        color:      colors.label,
        fontSize:   fonts.pie,
        fontFamily: FONT,
        fontWeight: 600,
        formatter:  '{b}',
        overflow:   'truncate',
        width:      90,
      },
      labelLine: {
        length:    12,
        length2:   18,
        smooth:    true,
        lineStyle: {
          color: colors.axis,
          width: 1.5,
        },
      },
      emphasis: {
        scale:     true,
        scaleSize: 10,          // was 7 — more dramatic pop
        focus:     'self',
        itemStyle: {
          shadowBlur:  36,      // was 24
          shadowColor: 'rgba(0,0,0,0.5)',
        },
        label: {
          fontSize:   fonts.pie + 2,
          fontWeight: 700,
          color:      colors.label,
        },
        labelLine: {
          lineStyle: { width: 2 },
        },
      },
    }],
  }
}
