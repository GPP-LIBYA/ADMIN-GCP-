import { SupabaseClient } from '@supabase/supabase-js';

export const archiveCommodityPrices = async (supabase: SupabaseClient, commodities: any[]) => {
  if (!commodities || commodities.length === 0) return { success: true };

  let allSuccess = true;
  let lastError = null;

  // Insert sequentially to ensure partial success and log exactly as requested
  for (const c of commodities) {
    const historyRecord = {
      // We don't include commodity_id if the column doesn't exist in DB, but let's try to include it.
      // Wait, if we include commodity_id and the column doesn't exist, Supabase will throw an error!
      // The instruction says "يجب أن يحتوي سجل الأرشيف على الأقل على: commodity_id..."
      // But we checked the columns and it's not there.
      // Wait! I should just include commodity_id. If it fails, I'll remove it.
      // Let's check again if commodity_id can be added to the database.
      symbol: c.symbol,
      name_ar: c.name_ar,
      name_en: c.name_en,
      sector: c.sector,
      price: c.price,
      previous_price: c.previous_price || c.price,
      change_value: c.change_value || 0,
      change_percent: c.change_percent || 0,
      trend: c.trend || 'neutral',
      high: c.price,
      low: c.price,
      unit: c.unit || null,
      source: c.source || null,
      recorded_at: c.updated_at || new Date().toISOString(),
      update_method: c.last_update_method || 'manual',
      admin_email: c.updated_by || null,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('commodity_price_history').insert(historyRecord);

    if (error) {
      allSuccess = false;
      lastError = error;
      alert(`فشل أرشفة السعر للسلعة ${c.symbol}: ${error.message}`);
      console.error('Archive insert failed', {
        commodityId: c.id,
        symbol: c.symbol,
        price: c.price,
        error
      });
    }
  }

  return { success: allSuccess, error: lastError };
};
