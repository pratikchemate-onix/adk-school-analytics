'use client'
import dynamic from 'next/dynamic'

const ReactECharts = dynamic(() => import('echarts-for-react'), {
  ssr: false,
  loading: () => (
    <div style={{
      height: 400,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#888',
      fontSize: 13,
    }}>
      Loading chart…
    </div>
  ),
})

export default ReactECharts
