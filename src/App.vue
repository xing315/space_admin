<script setup>
import {ref,onMounted,onBeforeUnmount} from 'vue'
import {useRoute,useRouter} from 'vue-router'
import {supabase,isOwner} from './lib/supabase.js'
const route=useRoute(),router=useRouter(),user=ref(null),menu=ref(false)
const siteUrl=import.meta.env.VITE_SITE_URL||'http://127.0.0.1:5173'
const nav=[
  {to:'/dashboard',icon:'⌂',label:'仪表盘'},
  {to:'/features',icon:'◫',label:'功能开关'},
  {to:'/content/blog',icon:'✦',label:'博客管理'},
  {to:'/content/private-library',icon:'▣',label:'私人资料库'},
  {to:'/business/members',icon:'◎',label:'会员经营'},
  {to:'/analytics/apps',icon:'⌁',label:'App 数据分析'},
  {to:'/operations/quant',icon:'∿',label:'量化运维'},
  {to:'/settings',icon:'⚙',label:'系统设置'},
  {to:'/audit-logs',icon:'≡',label:'操作审计'}]
let subscription
onMounted(async()=>{const {data}=await supabase.auth.getSession();user.value=data.session?.user||null;const result=supabase.auth.onAuthStateChange((_e,s)=>user.value=s?.user||null);subscription=result.data.subscription})
onBeforeUnmount(()=>subscription?.unsubscribe())
async function logout(){if(!confirm('确定退出管理后台吗？'))return;await supabase.auth.signOut();router.replace('/login')}
</script>
<template>
  <router-view v-if="route.meta.public"/>
  <div v-else class="shell">
    <aside :class="{open:menu}">
      <div class="brand"><i>Z</i><span><b>ZHANG SPACE</b><small>ADMIN CONSOLE</small></span></div>
      <nav><router-link v-for="item in nav" :key="item.to" :to="item.to" @click="menu=false"><i>{{item.icon}}</i>{{item.label}}</router-link></nav>
      <div class="profile"><span>{{(user?.email||'O').slice(0,1).toUpperCase()}}</span><div><b>Owner</b><small>{{user?.email}}</small></div><button @click="logout">退出</button></div>
    </aside>
    <main><header><button class="menu" @click="menu=!menu">☰</button><div><small>ZHANG SPACE / ADMIN</small><h1>{{route.meta.title}}</h1></div><a :href="siteUrl" target="_blank">打开前台 ↗</a></header><router-view/></main>
  </div>
</template>
