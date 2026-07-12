const fs = require('fs');
let code = fs.readFileSync('src/pages/Reports.tsx', 'utf-8');

const targetStr = `  let totalPagesCount = 1; // Cover`;
const replacementStr = `  let summaryStats: any = null;
  if (reportType !== 'detailed_commodity' && reportData?.prices) {
    let up = 0, down = 0, stable = 0;
    reportData.prices.forEach((p: any) => {
      let cp = p.change_percent;
      if (cp === null || cp === undefined) {
        if (p.previous_price && p.previous_price > 0) {
          cp = ((p.price - p.previous_price) / p.previous_price) * 100;
        } else cp = 0;
      }
      if (cp > 0) up++;
      else if (cp < 0) down++;
      else stable++;
    });
    summaryStats = {
      totalCommodities: reportData.prices.length,
      upCount: up,
      downCount: down,
      stableCount: stable
    };
  }

  let totalPagesCount = 1; // Cover`;

code = code.replace(targetStr, replacementStr);
fs.writeFileSync('src/pages/Reports.tsx', code);
console.log('Fixed summaryStats');
