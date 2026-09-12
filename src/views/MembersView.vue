<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase, audit } from '../lib/supabase.js'
const members = ref([]),
  transactions = ref([]),
  items = ref([]),
  summary = ref({}),
  query = ref(''),
  loading = ref(true),
  error = ref(''),
  modal = ref(null),
  selected = ref(null),
  saving = ref(false)
const today = () => new Date().toISOString().slice(0, 10),
  money = (v) =>
    Number(v || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const filtered = computed(() => {
  const q = query.value.toLowerCase()
  return members.value.filter((m) => `${m.name}${m.phone}`.toLowerCase().includes(q))
})
async function load() {
  loading.value = true
  error.value = ''
  const from = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10)
  const [m, t, i, s] = await Promise.all([
    supabase.from('members').select('*').order('created_at', { ascending: false }),
    supabase
      .from('member_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000),
    supabase.from('member_transaction_items').select('*').limit(2000),
    supabase.rpc('get_membership_business_summary', { p_from: from, p_to: today() }),
  ])
  const e = m.error || t.error || i.error || s.error
  if (e) error.value = e.message
  else {
    members.value = m.data || []
    transactions.value = t.data || []
    items.value = i.data || []
    summary.value = s.data || {}
  }
  loading.value = false
}
function openCreate() {
  modal.value = { type: 'create', name: '', phone: '', notes: '', amount: '', date: today() }
}
function openAction(member, type) {
  selected.value = member
  modal.value = { type, amount: '', date: today(), note: '' }
}
async function submit() {
  saving.value = true
  error.value = ''
  let result
  const f = modal.value
  if (f.type === 'create')
    result = await supabase.rpc('create_member', {
      p_name: f.name,
      p_phone: f.phone,
      p_notes: f.notes,
      p_opening_amount: Number(f.amount || 0),
      p_business_date: f.date,
    })
  else
    result = await supabase.rpc('apply_member_transaction', {
      p_member_id: selected.value.id,
      p_type: f.type,
      p_amount: Number(f.amount),
      p_business_date: f.date,
      p_note: f.note,
    })
  saving.value = false
  if (result.error) {
    error.value = result.error.message
    return
  }
  await audit(`member.${f.type}`, 'member', result.data?.id || selected.value?.id, {
    amount: Number(f.amount || 0),
  })
  modal.value = null
  selected.value = null
  await load()
}
async function reverse(tx) {
  const reason = prompt('请输入冲正原因（至少2个字）')
  if (!reason) return
  if (reason.trim().length < 2) {
    error.value = '冲正原因至少2个字'
    return
  }
  if (!confirm('冲正会产生一笔反向流水，确定继续？')) return
  const { error: e } = await supabase.rpc('reverse_member_transaction', {
    p_transaction_id: tx.id,
    p_reason: reason,
  })
  if (e) {
    error.value = e.message
    return
  }
  await audit('member.reverse', 'member_transaction', tx.id, {})
  await load()
}
function exportCsv() {
  const lines = [
    ['姓名', '手机号', '余额', '累计充值', '累计消费', '消费次数', '最近消费'],
    ...filtered.value.map((m) => [
      m.name,
      m.phone,
      m.balance,
      m.total_recharged,
      m.total_spent,
      m.visit_count,
      m.last_consumed_on || '',
    ]),
  ]
  const csv =
    '\ufeff' +
    lines
      .map((r) => r.map((v) => `"${String(v ?? '').replaceAll('"', '""')}"`).join(','))
      .join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = `members-${today()}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}
onMounted(load)
</script>
<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h2>会员经营</h2>
        <p>会员档案、余额流水与近 30 日经营指标。</p>
      </div>
      <div>
        <button class="btn secondary" @click="exportCsv">导出 CSV</button>
        <button class="btn" @click="openCreate">＋ 新增会员</button>
      </div>
    </div>
    <div v-if="error" class="notice">{{ error }}</div>
    <section class="grid metrics">
      <article class="card metric">
        <span>会员总数</span><strong>{{ summary.members || 0 }}</strong
        ><small>人</small>
      </article>
      <article class="card metric">
        <span>储值余额</span><strong>¥{{ money(summary.balance) }}</strong
        ><small>当前沉淀</small>
      </article>
      <article class="card metric">
        <span>近30日消费</span><strong>¥{{ money(summary.revenue) }}</strong
        ><small>{{ summary.visits || 0 }} 笔</small>
      </article>
      <article class="card metric">
        <span>平均客单价</span><strong>¥{{ money(summary.averageTicket) }}</strong
        ><small>按消费流水</small>
      </article>
    </section>
    <section v-if="summary.topProducts?.length" class="card" style="margin-bottom: 14px">
      <h3>近30日热销商品</h3>
      <div class="kpi-list">
        <div v-for="p in summary.topProducts" :key="p.label">
          <span>{{ p.label }} · {{ p.quantity }} 份</span><b>¥{{ money(p.revenue) }}</b>
        </div>
      </div>
    </section>
    <section class="card">
      <div class="toolbar"><input v-model="query" placeholder="搜索姓名或手机号" /></div>
      <div v-if="loading" class="loading">正在读取会员数据…</div>
      <div v-else class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>会员</th>
              <th>余额</th>
              <th>累计消费</th>
              <th>到店次数</th>
              <th>最近消费</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in filtered" :key="m.id">
              <td>
                <b>{{ m.name }}</b
                ><small>{{ m.phone }}</small>
              </td>
              <td>¥{{ money(m.balance) }}</td>
              <td>¥{{ money(m.total_spent) }}</td>
              <td>{{ m.visit_count }}</td>
              <td>{{ m.last_consumed_on || '暂无' }}</td>
              <td>
                <button class="btn secondary" @click="openAction(m, 'recharge')">充值</button>
                <button class="btn secondary" @click="openAction(m, 'consume')">消费</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
    <section class="card" style="margin-top: 14px">
      <h3>最近流水</h3>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>时间</th>
              <th>会员</th>
              <th>类型</th>
              <th>金额</th>
              <th>余额</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in transactions.slice(0, 50)" :key="t.id">
              <td>{{ t.business_date }}</td>
              <td>{{ members.find((m) => m.id === t.member_id)?.name || '—' }}</td>
              <td>
                <span :class="['badge', { off: t.transaction_type === 'reversal' }]">{{
                  { recharge: '充值', consume: '消费', reversal: '冲正' }[t.transaction_type]
                }}</span>
              </td>
              <td>¥{{ money(t.amount) }}</td>
              <td>¥{{ money(t.balance_after) }}</td>
              <td>
                <button
                  v-if="
                    t.transaction_type !== 'reversal' &&
                    !transactions.some((r) => r.original_transaction_id === t.id)
                  "
                  class="btn danger"
                  @click="reverse(t)"
                >
                  冲正
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
    <div v-if="modal" class="modal-layer" @click.self="modal = null">
      <form class="modal" @submit.prevent="submit">
        <header>
          <h2>
            {{
              modal.type === 'create'
                ? '新增会员'
                : modal.type === 'recharge'
                  ? '会员充值'
                  : '会员消费'
            }}
          </h2>
          <button type="button" @click="modal = null">×</button>
        </header>
        <template v-if="modal.type === 'create'"
          ><div class="form-grid">
            <div class="field">
              <label>姓名</label><input v-model="modal.name" maxlength="50" required />
            </div>
            <div class="field">
              <label>手机号</label
              ><input v-model="modal.phone" pattern="1[3-9][0-9]{9}" maxlength="11" required />
            </div>
          </div>
          <div class="field"><label>备注</label><textarea v-model="modal.notes"></textarea></div
        ></template>
        <div class="form-grid">
          <div class="field">
            <label>{{ modal.type === 'create' ? '首次充值' : '金额' }}</label
            ><input
              v-model="modal.amount"
              type="number"
              min="0"
              step="0.01"
              :required="modal.type !== 'create'"
            />
          </div>
          <div class="field">
            <label>业务日期</label
            ><input v-model="modal.date" type="date" :max="today()" required />
          </div>
        </div>
        <div v-if="modal.type !== 'create'" class="field">
          <label>备注</label><input v-model="modal.note" maxlength="500" />
        </div>
        <footer>
          <button type="button" class="btn secondary" @click="modal = null">取消</button
          ><button class="btn" :disabled="saving">{{ saving ? '提交中…' : '确认' }}</button>
        </footer>
      </form>
    </div>
  </div>
</template>
