import { SupabaseClient } from '@supabase/supabase-js';

export const archiveCommodityPrices = async (supabase: SupabaseClient, commodities: any[]) => {
  if (!commodities || commodities.length === 0) return { success: true };

  let allSuccess = true;
  let lastError = null;

  for (const c of commodities) {
    const historyRecord: any = {
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
      admin_email: c.updated_by || c.admin_email || null,
      created_by: c.created_by || null,
      updated_by: c.updated_by || null,
      updated_at: new Date().toISOString()
    };

    let { error } = await supabase.from('commodity_price_history').insert(historyRecord);

    // If database schema in Supabase does not have created_by or updated_by column on commodity_price_history
    if (error && (error.message.includes('created_by') || error.message.includes('updated_by'))) {
      const fallbackRecord = { ...historyRecord };
      delete fallbackRecord.created_by;
      delete fallbackRecord.updated_by;
      const retryResult = await supabase.from('commodity_price_history').insert(fallbackRecord);
      error = retryResult.error;
    }

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

