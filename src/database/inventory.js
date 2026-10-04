import { supabase } from '../config/supabase.js';

// All writes go through SECURITY DEFINER functions: the server decides prices, ownership and balances.
export async function fetchOwned() {
  const { data, error } = await supabase.from('inventory').select('item_id');
  if (error) throw error;
  return new Set(data.map((r) => r.item_id));
}
async function rpc(fn, args) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data;
}
export const purchaseItem = (id) => rpc('purchase_item', { p_item_id: id });   // -> new coin balance
export const saveAvatar = (avatar) => rpc('save_avatar', { p: avatar });
export const claimDaily = () => rpc('claim_daily_reward');                     // -> {day,coins,item,balance}
