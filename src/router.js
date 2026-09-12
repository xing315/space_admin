import { createRouter,createWebHistory } from 'vue-router'
import { supabase,isOwner } from './lib/supabase.js'
const routes=[
  {path:'/login',name:'login',component:()=>import('./views/LoginView.vue'),meta:{public:true,title:'登录'}},
  {path:'/forbidden',name:'forbidden',component:()=>import('./views/ForbiddenView.vue'),meta:{public:true,title:'无权限'}},
  {path:'/',redirect:'/dashboard'},
  {path:'/dashboard',component:()=>import('./views/DashboardView.vue'),meta:{title:'仪表盘'}},
  {path:'/features',component:()=>import('./views/FeaturesView.vue'),meta:{title:'功能开关'}},
  {path:'/content/blog',component:()=>import('./views/BlogView.vue'),meta:{title:'博客管理'}},
  {path:'/content/private-library',component:()=>import('./views/PrivateLibraryView.vue'),meta:{title:'私人资料库'}},
  {path:'/business/members',component:()=>import('./views/MembersView.vue'),meta:{title:'会员经营'}},
  {path:'/analytics/apps',component:()=>import('./views/AnalyticsView.vue'),meta:{title:'App 数据分析'}},
  {path:'/operations/quant',component:()=>import('./views/QuantOpsView.vue'),meta:{title:'量化运维'}},
  {path:'/settings',component:()=>import('./views/SettingsView.vue'),meta:{title:'系统设置'}},
  {path:'/audit-logs',component:()=>import('./views/AuditView.vue'),meta:{title:'操作审计'}},
  {path:'/:pathMatch(.*)*',redirect:'/dashboard'}
]
const router=createRouter({history:createWebHistory(),routes})
router.beforeEach(async to=>{
  document.title=`${to.meta.title||'管理后台'} · Zhang Space Admin`
  if(to.meta.public) return true
  const {data:{session}}=await supabase.auth.getSession()
  if(!session) return {name:'login',query:{redirect:to.fullPath}}
  if(!isOwner(session.user)) return {name:'forbidden'}
  return true
})
export default router
