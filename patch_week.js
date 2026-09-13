const fs = require('fs');
let js = fs.readFileSync('js/query_dev.js', 'utf8');
js = js.replace("document.getElementById('totalLifePoints').textContent = total;", 
    `document.getElementById('totalLifePoints').textContent = total;
        if (sortedWeeks.length > 0) {
            const wInfo = document.getElementById('weekInfo');
            if (wInfo) wInfo.textContent = '(第 ' + sortedWeeks[0] + ' 週)';
        }`);
fs.writeFileSync('js/query_dev.js', js);
