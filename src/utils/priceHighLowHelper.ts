import { SupabaseClient } from '@supabase/supabase-js';
import { getDayBounds, getDayKey } from './dateUtils';

/**
 * Calculates the daily High and Low given a list of existing recorded prices for that day
 * and the new price being submitted.
 */
export function calculateDailyHighLow(
  existingDayPrices: number[],
  newPrice: number
): { high: number; low: number } {
  const pNum = Number(newPrice);
  const validPrices = [...existingDayPrices, pNum].filter(
    (p) => typeof p === 'number' && !isNaN(p) && isFinite(p) && p > 0
  );

  if (validPrices.length === 0) {
    return { high: pNum, low: pNum };
  }

  return {
    high: Math.max(...validPrices),
    low: Math.min(...validPrices),
  };
}

/**
 * Queries commodity_price_history to get all prices recorded for a given calendar day.
 * Returns a Map where key is normalized UPPERCASE symbol and value is an array of recorded numbers.
 */
export async function getExistingPricesForDay(
  supabase: SupabaseClient,
  symbols?: string[],
  dateVal: string | Date = new Date()
): Promise<Map<string, number[]>> {
  const { startISO, endISO, dayKey } = getDayBounds(dateVal);
  const map = new Map<string, number[]>();

  try {
    let query = supabase
      .from('commodity_price_history')
      .select('symbol, price, recorded_at, created_at')
      .gte('recorded_at', startISO)
      .lte('recorded_at', endISO);

    if (symbols && symbols.length > 0 && symbols.length < 80) {
      query = query.in('symbol', symbols);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching existing prices for day:', error);
      return map;
    }

    (data || []).forEach((row: any) => {
      if (!row || !row.symbol) return;
      const sym = String(row.symbol).trim().toUpperCase();
      const rowDayKey = getDayKey(row.recorded_at || row.created_at);
      if (rowDayKey === dayKey) {
        const p = Number(row.price);
        if (!isNaN(p) && isFinite(p) && p > 0) {
          if (!map.has(sym)) {
            map.set(sym, []);
          }
          map.get(sym)!.push(p);
        }
      }
    });
  } catch (err) {
    console.error('Exception in getExistingPricesForDay:', err);
  }

  return map;
}

/**
 * Reconciles and synchronizes daily High, Low, and Latest Price for a commodity
 * when a historical record is updated or deleted in the archive.
 */
export async function syncCommodityDayHighLow(
  supabase: SupabaseClient,
  symbol: string,
  dateVal: string | Date = new Date()
) {
  if (!symbol) return;
  const sym = symbol.trim().toUpperCase();
  const { startISO, endISO, dayKey } = getDayBounds(dateVal);

  try {
    const { data: dayRecords, error: fetchErr } = await supabase
      .from('commodity_price_history')
      .select('*')
      .eq('symbol', sym)
      .gte('recorded_at', startISO)
      .lte('recorded_at', endISO);

    if (fetchErr) {
      console.error('syncCommodityDayHighLow fetch error:', fetchErr);
      return;
    }

    const validRows = (dayRecords || []).filter(
      (r: any) => getDayKey(r.recorded_at || r.created_at) === dayKey
    );

    if (validRows.length === 0) {
      return;
    }

    // Sort by latest timestamp to find latest row for that day
    validRows.sort((a: any, b: any) => {
      const timeA = new Date(a.recorded_at || a.created_at || 0).getTime();
      const timeB = new Date(b.recorded_at || b.created_at || 0).getTime();
      return timeB - timeA;
    });

    const latestRow = validRows[0];
    const prices = validRows
      .map((r: any) => Number(r.price))
      .filter((p: number) => !isNaN(p) && isFinite(p) && p > 0);

    const dayHigh = prices.length > 0 ? Math.max(...prices) : Number(latestRow.price);
    const dayLow = prices.length > 0 ? Math.min(...prices) : Number(latestRow.price);

    // Check if the current commodities table entry for this symbol was updated on this day
    const { data: currentComm } = await supabase
      .from('commodities')
      .select('id, updated_at, price')
      .eq('symbol', sym)
      .maybeSingle();

    if (currentComm) {
      const isSameDay = getDayKey(currentComm.updated_at) === dayKey;
      const isToday = dayKey === getDayKey(new Date());

      if (isSameDay || isToday) {
        await supabase
          .from('commodities')
          .update({
            price: Number(latestRow.price),
            high: dayHigh,
            low: dayLow,
            updated_at: latestRow.recorded_at || new Date().toISOString(),
          })
          .eq('symbol', sym);
      }
    }
  } catch (err) {
    console.error('Exception in syncCommodityDayHighLow:', err);
  }
}
