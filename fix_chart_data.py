import re

with open('js/query_dev.js', 'r', encoding='utf-8') as f:
    js = f.read()

bad_code = """            if (distSchool) {
                labels.forEach(k => { 
                    dataSchool.push(distSchool[k] || 0); 
                    dataClass.push(distClass ? (distClass[k] || 0) : 0);
                });
            }"""
            
good_code = """            labels.forEach(k => { 
                dataSchool.push(distSchool ? (distSchool[k] || 0) : 0); 
                dataClass.push(distClass ? (distClass[k] || 0) : 0);
            });"""

js = js.replace(bad_code, good_code)

# Subject centering in JS
js = js.replace("let subjClass = isAvg ? 'p-3 font-black text-gray-900 border-l-4 border-orange-400' : 'p-3 font-bold text-gray-700 border-l-4 border-transparent';", 
                "let subjClass = isAvg ? 'p-3 text-center font-black text-gray-900 border-l-4 border-orange-400' : 'p-3 text-center font-bold text-gray-700 border-l-4 border-transparent';")

with open('js/query_dev.js', 'w', encoding='utf-8') as f:
    f.write(js)
