import { SupabaseClient } from '@supabase/supabase-js';
import { calculateDailyHighLow, getExistingPricesForDay } from './priceHighLowHelper';

export const archiveCommodityPrices = async (supabase: SupabaseClient, commodities: any[]) => {
  if (!commodities || commodities.length === 0) return { success: true };

  let allSuccess = true;
  let lastError = null;

  for (const c of commodities) {
    let recHigh = typeof c.high === 'number' && !isNaN(c.high) ? c.high : null;
    let recLow = typeof c.low === 'number' && !isNaN(c.low) ? c.low : null;

    // If high or low wasn't explicitly precomputed, fetch day prices and compute
    if (recHigh === null || recLow === null) {
      const recDate = c.updated_at || new Date().toISOString();
      const existingMap = await getExistingPricesForDay(supabase, [c.symbol], recDate);
      const existingPrices = existingMap.get(String(c.symbol).trim().toUpperCase()) || [];
      const calc = calculateDailyHighLow(existingPrices, Number(c.price));
      recHigh = calc.high;
      recLow = calc.low;
    }

    const historyRecord: any = {
      symbol: c.symbol,
      name_ar: c.name_ar,
      name_en: c.name_en,
      sector: c.sector,
      price: Number(c.price),
      previous_price: c.previous_price !== undefined && c.previous_price !== null ? Number(c.previous_price) : Number(c.price),
      change_value: c.change_value || 0,
      change_percent: c.change_percent || 0,
      trend: c.trend || 'neutral',
      high: recHigh,
      low: recLow,
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

