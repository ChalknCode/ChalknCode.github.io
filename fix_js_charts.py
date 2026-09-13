import re

with open('js/query_dev.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Change chart toggle text
js = js.replace("document.getElementById('avgHeaderTitle').textContent = '班平';", "document.getElementById('avgHeaderTitle').textContent = '班級平均';")
js = js.replace("document.getElementById('avgHeaderTitle').textContent = '校平';", "document.getElementById('avgHeaderTitle').textContent = '學校平均';")

# Make personalAverage row more prominent
js = js.replace("let rowClass = isAvg ? 'bg-orange-50/40' : 'hover:bg-gray-50/80 transition-colors';", "let rowClass = isAvg ? 'bg-orange-50' : 'hover:bg-gray-50/80 transition-colors';")
js = js.replace("let subjClass = isAvg ? 'p-3 font-black text-gray-800' : 'p-3 font-bold text-gray-700';", "let subjClass = isAvg ? 'p-3 font-black text-gray-900 border-l-4 border-orange-400' : 'p-3 font-bold text-gray-700 border-l-4 border-transparent';")

# Adjust chart container height and handle empty data
chart_html_replacement = """
            if (activeData && activeData.length > 0) {
                const maxCount = Math.max(...activeData);
                const numBins = activeData.length; 
                
                if (maxCount === 0) {
                    chartHtml = '<div class="text-xs text-gray-400 py-2">無此分佈資料</div>';
                } else {
                    let barsHtml = '';
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
                    `;
                }
            }
"""

js = re.sub(r'if \(activeData && activeData\.length > 0\) \{.*?chartHtml = `.*?`;\s*\}', chart_html_replacement, js, flags=re.DOTALL)

# Add font-inter class to big numbers
js = js.replace("document.getElementById('cardRank').textContent = sum.classRank || '-';", "document.getElementById('cardRank').className = 'text-lg md:text-3xl font-black text-gray-800 leading-none font-inter';\n        document.getElementById('cardRank').textContent = sum.classRank || '-';")
js = js.replace("document.getElementById('cardSchoolRank').textContent = sum.schoolRankInterval || '-';", "document.getElementById('cardSchoolRank').className = 'text-lg md:text-3xl font-black text-gray-800 leading-none font-inter';\n        document.getElementById('cardSchoolRank').textContent = sum.schoolRankInterval || '-';")
js = js.replace("document.getElementById('cardAvg').textContent = formatScore(sum.personalAverage);", "document.getElementById('cardAvg').className = 'text-lg md:text-3xl font-black text-gray-800 leading-none font-inter';\n        document.getElementById('cardAvg').textContent = formatScore(sum.personalAverage);")
js = js.replace("document.getElementById('cardTotal').textContent = formatScore(sum.totalScore);", "document.getElementById('cardTotal').className = 'text-lg md:text-3xl font-black text-gray-800 leading-none font-inter';\n        document.getElementById('cardTotal').textContent = formatScore(sum.totalScore);")

js = js.replace("let scoreClass = isAvg", "let scoreClass = isAvg")
js = js.replace("text-lg`", "text-lg font-inter`")
js = js.replace("text-[#c2516a]'}`", "text-[#c2516a]'}` + ' font-inter'")
js = js.replace("const displayAvg = chartMode === 'class' ? classAvg : schoolAvg;", "const displayAvg = chartMode === 'class' ? classAvg : schoolAvg;")
js = js.replace("let avgClass = 'p-3 text-center font-bold text-gray-600';", "let avgClass = 'p-3 text-center font-bold text-gray-600 font-inter';")

with open('js/query_dev.js', 'w', encoding='utf-8') as f:
    f.write(js)
