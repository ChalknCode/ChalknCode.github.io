import re

with open('query_dev.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Add Inter font
head_addition = """
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
"""
html = re.sub(r'<script src="https://cdn.tailwindcss.com"></script>', head_addition, html)

# Add font-inter utility to style
style_addition = """
    .font-inter { font-family: 'Inter', sans-serif; }
    .dev-dash-btn {
"""
html = html.replace('.dev-dash-btn {', style_addition)

# Move Semester info to be inline
old_student_info = """              <div class="border-t border-dashed border-gray-200 pt-4 flex flex-col md:flex-row gap-4 md:gap-8 text-gray-700">
                  <div class="text-sm"><span class="text-gray-400 mr-1">姓名 :</span> <span class="font-bold text-lg text-gray-800" id="studentName">-</span></div>
                  <div class="text-sm"><span class="text-gray-400 mr-1">班級 :</span> <span class="font-bold text-lg text-gray-800" id="studentClass">-</span></div>
                  <div class="text-sm"><span class="text-gray-400 mr-1">座號 :</span> <span class="font-bold text-lg text-gray-800" id="studentSeatNo">-</span></div>
              </div>
              <div class="mt-2 inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg w-max font-bold text-sm">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                  <span id="semesterInfo">八年級上學期</span> <span id="weekInfo" class="ml-1 text-indigo-500 text-xs"></span>
              </div>"""

new_student_info = """              <div class="border-t border-dashed border-gray-200 pt-4 flex flex-col md:flex-row md:items-center gap-4 md:gap-8 text-gray-700">
                  <div class="text-sm"><span class="text-gray-400 mr-1">姓名 :</span> <span class="font-bold text-lg text-gray-800" id="studentName">-</span></div>
                  <div class="text-sm"><span class="text-gray-400 mr-1">班級 :</span> <span class="font-bold text-lg text-gray-800" id="studentClass">-</span></div>
                  <div class="text-sm"><span class="text-gray-400 mr-1">座號 :</span> <span class="font-bold text-lg text-gray-800" id="studentSeatNo">-</span></div>
                  <div class="hidden md:block w-px h-6 bg-gray-200 mx-2"></div>
                  <div class="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg w-max font-bold text-sm">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                      <span id="semesterInfo">八年級上學期</span> <span id="weekInfo" class="ml-1 text-indigo-500 text-xs"></span>
                  </div>
              </div>"""
html = html.replace(old_student_info, new_student_info)

# Align Dashboard columns by removing the h3
html = html.replace('<h3 class="text-xl font-bold text-gray-800 mb-2">你想查看什麼？</h3>', '')

# Fix badge overflow
html = html.replace('overflow-hidden', 'overflow-visible', 1) # Find the badge container, wait let me regex it
html = re.sub(r'Honor Badges.*?<div class="dev-glass-card rounded-2xl p-6 relative overflow-hidden">', r'Honor Badges (Concept) -->\n              <div class="dev-glass-card rounded-2xl p-6 relative overflow-visible">', html, flags=re.DOTALL)

# Also add the info icon to explain badge
badge_title_old = '榮譽徽章解鎖區'
badge_title_new = '榮譽徽章解鎖區 <span class="text-xs text-gray-400 font-normal ml-2 bg-white px-2 py-0.5 rounded-full border border-gray-100 shadow-sm">此為概念示意圖，未來可串接積分系統</span>'
html = html.replace(badge_title_old, badge_title_new)

# Table headers
html = html.replace('<th class="p-3 text-center font-bold w-1/5" id="avgHeaderTitle">班平</th>', '<th class="p-3 text-center font-bold w-1/5" id="avgHeaderTitle">班級平均</th>')

# Fix chart width and height
html = html.replace('<th class="p-3 font-bold w-2/5">分佈落點', '<th class="p-3 font-bold w-[35%]">分佈落點')
html = html.replace('min-w-[500px]', 'min-w-[600px]')

with open('query_dev.html', 'w', encoding='utf-8') as f:
    f.write(html)
