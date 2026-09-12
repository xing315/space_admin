import { createClient } from '@supabase/supabase-js'
const url=import.meta.env.VITE_SUPABASE_URL
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||import.meta.env.VITE_SUPABASE_ANON_KEY
if(!url||!key) throw new Error('请配置 VITE_SUPABASE_URL 和 VITE_SUPABASE_PUBLISHABLE_KEY')
export const supabase=createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}})
export const isOwner=user=>user?.app_metadata?.role==='owner'
export async function audit(action,targetType,targetId='',detail={}){
  const {error}=await supabase.rpc('write_admin_audit',{p_action:action,p_target_type:targetType,p_target_id:String(targetId||''),p_detail:detail})
  if(error) console.warn('audit_failed',error.message)
}
