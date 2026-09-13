import re

with open('query_dev.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace header logo
old_logo = """<div class="w-10 h-10 rounded-full bg-gradient-to-br from-[#c2516a] to-[#5c6bc0] text-white flex items-center justify-center font-black shadow-md">
          805
        </div>"""
new_logo = """<img src="images/logo.png" alt="Logo" class="h-10 w-auto mix-blend-multiply object-contain">"""
html = html.replace(old_logo, new_logo)

# Center the table Subject header
html = html.replace('<th class="p-3 font-bold w-1/5">科目</th>', '<th class="p-3 font-bold w-1/5 text-center">科目</th>')

# Increment cache buster
html = html.replace('?v=10', '?v=11')

with open('query_dev.html', 'w', encoding='utf-8') as f:
    f.write(html)
