<script setup>
import {ref,onMounted} from 'vue';import {supabase} from '../lib/supabase.js'
const rows=ref([]),loading=ref(true),error=ref('')
onMounted(async()=>{const {data,error:e}=await supabase.from('admin_audit_logs').select('*').order('created_at',{ascending:false}).limit(500);if(e)error.value=e.message;else rows.value=data||[];loading.value=false})
</script>
<template><div class="page"><div class="page-head"><div><h2>操作审计</h2><p>记录配置、内容与关键业务变更，不保存敏感正文。</p></div></div><div v-if="error" class="notice">{{error}}</div><section class="card"><div v-if="loading" class="loading">正在读取审计记录…</div><div v-else class="table-wrap"><table class="data-table"><thead><tr><th>时间</th><th>动作</th><th>目标</th><th>对象 ID</th><th>摘要</th></tr></thead><tbody><tr v-for="row in rows" :key="row.id"><td>{{new Date(row.created_at).toLocaleString('zh-CN')}}</td><td><span class="badge">{{row.action}}</span></td><td>{{row.target_type}}</td><td><code>{{row.target_id||'—'}}</code></td><td><code>{{JSON.stringify(row.detail)}}</code></td></tr></tbody></table><div v-if="!rows.length" class="empty">暂无操作记录</div></div></section></div></template>
