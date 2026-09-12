<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import * as echarts from 'echarts/core'
import { LineChart, PieChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { supabase } from '../lib/supabase.js'
echarts.use([LineChart, PieChart, GridComponent, TooltipComponent, CanvasRenderer])
const range = ref('24h'),
  app = ref(''),
  version = ref(''),
  summary = ref({ trend: [], eventTypes: [], pages: [], versions: [] }),
  events = ref([]),
  apps = ref([]),
  versions = ref([]),
  loading = ref(true),
  error = ref(''),
  trendEl = ref(),
  typeEl = ref()
let trendChart, typeChart
const fromDate = () =>
  new Date(Date.now() - (range.value === '1h' ? 1 : range.value === '7d' ? 168 : 24) * 3600000)
async function load() {
  loading.value = true
  error.value = ''
  const from = fromDate(),
    to = new Date()
  const [s, e, a, v] = await Promise.all([
    supabase.rpc('get_app_telemetry_summary', {
      p_from: from.toISOString(),
      p_to: to.toISOString(),
      p_app_id: app.value || null,
      p_version: version.value || null,
    }),
    supabase
      .from('app_telemetry_events')
      .select('id,event_type,event_time,app_id,app_version,device_id,page,method,view_id,cost_ms')
      .gte('event_time', from.toISOString())
      .order('event_time', { ascending: false })
      .limit(100),
    supabase
      .from('app_telemetry_events')
      .select('app_id')
      .gte('event_time', new Date(Date.now() - 30 * 86400000).toISOString())
      .limit(2000),
    supabase
      .from('app_telemetry_events')
      .select('app_version')
      .gte('event_time', new Date(Date.now() - 30 * 86400000).toISOString())
      .limit(2000),
  ])
  const err = s.error || e.error
  if (err) error.value = err.message
  else {
    summary.value = s.data || {}
    events.value = (e.data || []).filter(
      (x) =>
        (!app.value || x.app_id === app.value) &&
        (!version.value || x.app_version === version.value),
    )
    apps.value = [...new Set((a.data || []).map((x) => x.app_id).filter(Boolean))]
    versions.value = [...new Set((v.data || []).map((x) => x.app_version).filter(Boolean))]
    await nextTick()
    draw()
  }
  loading.value = false
}
function draw() {
  trendChart ||= echarts.init(trendEl.value)
  typeChart ||= echarts.init(typeEl.value)
  trendChart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 35, right: 15, top: 20, bottom: 35 },
    xAxis: {
      type: 'category',
      data: (summary.value.trend || []).map((x) =>
        new Date(x.bucket).toLocaleString('zh-CN', {
          month: 'numeric',
          day: 'numeric',
          hour: '2-digit',
        }),
      ),
    },
    yAxis: { type: 'value' },
    series: [
      {
        type: 'line',
        smooth: true,
        areaStyle: { color: '#c8f56055' },
        lineStyle: { color: '#174f42' },
        data: (summary.value.trend || []).map((x) => x.value),
      },
    ],
  })
  typeChart.setOption({
    tooltip: { trigger: 'item' },
    series: [
      {
        type: 'pie',
        radius: ['42%', '72%'],
        data: (summary.value.eventTypes || []).map((x) => ({ name: x.label, value: x.value })),
      },
    ],
  })
}
watch([range, app, version], load)
onMounted(load)
onBeforeUnmount(() => {
  trendChart?.dispose()
  typeChart?.dispose()
})
</script>
<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h2>App 数据分析</h2>
        <p>活跃设备、启动性能、页面与版本分布。</p>
      </div>
    </div>
    <div class="toolbar">
      <select v-model="range">
        <option value="1h">近1小时</option>
        <option value="24h">近24小时</option>
        <option value="7d">近7天</option></select
      ><select v-model="app">
        <option value="">全部应用</option>
        <option v-for="x in apps" :key="x">{{ x }}</option></select
      ><select v-model="version">
        <option value="">全部版本</option>
        <option v-for="x in versions" :key="x">{{ x }}</option>
      </select>
    </div>
    <div v-if="error" class="notice">{{ error }}</div>
    <section class="grid metrics">
      <article class="card metric">
        <span>事件总量</span><strong>{{ Number(summary.events || 0).toLocaleString() }}</strong
        ><small>当前筛选范围</small>
      </article>
      <article class="card metric">
        <span>独立设备</span><strong>{{ summary.devices || 0 }}</strong
        ><small>匿名安装 ID</small>
      </article>
      <article class="card metric">
        <span>平均启动</span
        ><strong>{{ summary.avgStartupMs == null ? '—' : `${summary.avgStartupMs}ms` }}</strong
        ><small>启动事件样本</small>
      </article>
      <article class="card metric">
        <span>慢方法 / 卡顿</span><strong>{{ summary.slowEvents || 0 }}</strong
        ><small>方法≥100ms或block</small>
      </article>
    </section>
    <section class="grid two-col">
      <article class="card">
        <h3>事件趋势</h3>
        <div ref="trendEl" class="chart"></div>
      </article>
      <article class="card">
        <h3>事件构成</h3>
        <div ref="typeEl" class="chart"></div>
      </article>
    </section>
    <section class="grid two-col" style="margin-top: 14px">
      <article class="card">
        <h3>页面排行</h3>
        <div class="kpi-list">
          <div v-for="x in summary.pages || []" :key="x.label">
            <span>{{ x.label }}</span
            ><b>{{ x.value }}</b>
          </div>
          <div v-if="!summary.pages?.length" class="empty">暂无页面数据</div>
        </div>
      </article>
      <article class="card">
        <h3>版本分布</h3>
        <div class="kpi-list">
          <div v-for="x in summary.versions || []" :key="x.label">
            <span>{{ x.label }}</span
            ><b>{{ x.value }}</b>
          </div>
        </div>
      </article>
    </section>
    <section class="card" style="margin-top: 14px">
      <h3>最近事件</h3>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>类型</th>
              <th>对象</th>
              <th>应用 / 版本</th>
              <th>设备</th>
              <th>耗时</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in events" :key="e.id">
              <td>
                <span class="badge">{{ e.event_type }}</span>
              </td>
              <td>{{ e.page || e.method || e.view_id || '—' }}</td>
              <td>
                {{ e.app_id }}<small>{{ e.app_version || '未知版本' }}</small>
              </td>
              <td>
                <code>{{
                  e.device_id
                    ? `${e.device_id.slice(0, 6)}••••${e.device_id.slice(-4)}`
                    : 'anonymous'
                }}</code>
              </td>
              <td>{{ e.cost_ms == null ? '—' : `${Number(e.cost_ms).toFixed(1)} ms` }}</td>
              <td>{{ new Date(e.event_time).toLocaleString('zh-CN') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
