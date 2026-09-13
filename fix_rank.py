import re

with open('js/query_dev.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Replace the ranking logic
bad_rank_code = """        const summary = currentStudent.lifePointsSummary || {};
        document.getElementById('lpRank').textContent = summary.rank || '-';
        document.getElementById('lpPrev').textContent = summary.prevScore !== undefined ? summary.prevScore : '-';
        document.getElementById('lpNext').textContent = summary.nextScore !== undefined ? summary.nextScore : '-';"""

good_rank_code = """        const lpRank = currentStudent.rank || '-';
        const totalStudents = currentStudent.totalStudents || '-';
        document.getElementById('lpRank').textContent = `${lpRank} / ${totalStudents}`;"""

js = js.replace(bad_rank_code, good_rank_code)

with open('js/query_dev.js', 'w', encoding='utf-8') as f:
    f.write(js)

with open('query_dev.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Remove lpPrev and lpNext blocks
bad_html_code = """                  <div class="flex gap-2 text-[10px]">
                      <span class="bg-white/80 px-1.5 py-0.5 rounded border border-emerald-100 text-gray-600">前一: <b class="text-gray-800" id="lpPrev">-</b></span>
                      <span class="bg-white/80 px-1.5 py-0.5 rounded border border-rose-100 text-gray-600">後一: <b class="text-rose-600" id="lpNext">-</b></span>
                  </div>"""

html = html.replace(bad_html_code, "")

# Increment cache buster
html = html.replace('?v=12', '?v=13')

with open('query_dev.html', 'w', encoding='utf-8') as f:
    f.write(html)
