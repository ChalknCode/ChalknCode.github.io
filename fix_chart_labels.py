import re

with open('js/query_dev.js', 'r', encoding='utf-8') as f:
    js = f.read()

bad_chart_html = """                    let barsHtml = '';
                    for(let i=0; i<numBins; i++) {
                        const count = activeData[i] || 0;
                        let pct = (count / maxCount) * 100;
                        if (pct < 10 && pct > 0) pct = 10; // minimum height
                        
                        const isMyBin = (i === studentBinIndex);
                        const bgColor = isMyBin ? (chartMode === 'class' ? '#c2516a' : '#5c6bc0') : (count > 0 ? '#cbd5e1' : '#f1f5f9');
                        const height = count > 0 ? `${pct}%` : '2px';
                        
                        barsHtml += `
                            <div class="flex-1 rounded-t-sm relative group flex items-end justify-center h-full" style="min-height:2px;">
                                <div class="w-full rounded-t-sm transition-all" style="height: ${height}; background-color: ${bgColor}; min-height: 2px;"></div>
                                <div class="absolute -top-5 text-[10px] font-inter whitespace-nowrap z-10 ${isMyBin ? 'block font-bold' : 'hidden group-hover:block text-gray-500'}" style="color: ${isMyBin ? bgColor : ''}">${count}</div>
                            </div>
                        `;
                    }

                    chartHtml = `
                        <div class="flex items-end gap-[2px] h-14 pt-5 w-full max-w-[200px] border-b border-gray-100">
                            ${barsHtml}
                        </div>
                    `;"""

good_chart_html = """                    let barsHtml = '';
                    for(let i=0; i<numBins; i++) {
                        const count = activeData[i] || 0;
                        let pct = (count / maxCount) * 100;
                        if (pct < 10 && pct > 0) pct = 10; // minimum height
                        
                        const isMyBin = (i === studentBinIndex);
                        const bgColor = isMyBin ? (chartMode === 'class' ? '#c2516a' : '#5c6bc0') : (count > 0 ? '#cbd5e1' : '#f1f5f9');
                        const height = count > 0 ? `${pct}%` : '2px';
                        
                        let labelText = labels[i] || '';
                        // Simplified label if it's too long, optional. Just use labels[i].
                        
                        barsHtml += `
                            <div class="flex-1 relative group flex flex-col items-center justify-end h-full">
                                <div class="w-full rounded-t-sm transition-all relative" style="height: ${height}; background-color: ${bgColor}; min-height: 2px;">
                                    <div class="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-inter whitespace-nowrap z-10 ${isMyBin ? 'block font-bold' : 'hidden group-hover:block text-gray-500'}" style="color: ${isMyBin ? bgColor : ''}">${count}</div>
                                </div>
                                <div class="absolute -bottom-4 text-[8px] text-gray-400 whitespace-nowrap scale-90">${labelText}</div>
                            </div>
                        `;
                    }

                    chartHtml = `
                        <div class="flex items-end gap-[2px] h-20 pt-6 pb-4 w-full max-w-[250px] border-b border-gray-200">
                            ${barsHtml}
                        </div>
                    `;"""

js = js.replace(bad_chart_html, good_chart_html)

with open('js/query_dev.js', 'w', encoding='utf-8') as f:
    f.write(js)
