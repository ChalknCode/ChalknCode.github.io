with open('query_dev.html', 'r', encoding='utf-8') as f:
    html = f.read()

html = html.replace('text-4xl md:text-5xl font-black text-emerald-600', 'text-4xl md:text-5xl font-black text-emerald-600 font-inter')
html = html.replace('text-3xl md:text-4xl font-black text-gray-800', 'text-3xl md:text-4xl font-black text-gray-800 font-inter')

with open('query_dev.html', 'w', encoding='utf-8') as f:
    f.write(html)
