import re

with open('js/query_dev.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Fix memo display
bad_memo_code = "document.getElementById('semesterInfo').textContent = currentStudent.semesterName || '八年級上學期';"
good_memo_code = """document.getElementById('semesterInfo').textContent = currentStudent.semesterName || '八年級上學期';
        
        // 渲染備忘錄
        const memoDiv = document.getElementById('memoText');
        if (memoDiv) {
            memoDiv.textContent = currentStudent.memo ? currentStudent.memo : '目前沒有備忘錄。';
        }"""
js = js.replace(bad_memo_code, good_memo_code)

# Now fix the HTML to have id="memoText"
with open('query_dev.html', 'r', encoding='utf-8') as f:
    html = f.read()

html = html.replace('<div class="border border-gray-200 rounded-lg bg-white/50 p-4 text-gray-500 text-sm flex-grow">', '<div id="memoText" class="border border-gray-200 rounded-lg bg-white/50 p-4 text-gray-700 text-sm flex-grow whitespace-pre-wrap">')

# Also remove the hardcoded text
html = html.replace('這裡未來可以放學生的目標或聯絡簿記事...', '')

with open('js/query_dev.js', 'w', encoding='utf-8') as f:
    f.write(js)
    
with open('query_dev.html', 'w', encoding='utf-8') as f:
    f.write(html)
