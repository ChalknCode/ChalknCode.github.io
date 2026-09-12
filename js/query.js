document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');
    const loginBtn = document.getElementById('loginBtn');
    
    const loginSection = document.getElementById('loginSection');
    const dashboardSection = document.getElementById('dashboardSection');

    // === State ===
    let currentStudent = null;
    let currentExamData = null;
    let chartMode = 'class'; // 'class' or 'school'

    // === Global Switch View function ===
    window.switchView = function(viewId) {
        document.getElementById('view-menu').classList.add('hidden');
        document.getElementById('view-exam').classList.add('hidden');
        document.getElementById('view-life').classList.add('hidden');
        document.getElementById('view-' + viewId).classList.remove('hidden');
    };

    // === Login Logic ===
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const seatNo = document.getElementById('seatNo').value.trim();
        const idNumber = document.getElementById('idNumber').value.trim();
        
        if (!seatNo || !idNumber) return;
        
        loginBtn.disabled = true;
        loginBtn.innerHTML = '登入中...';
        loginError.classList.add('hidden');

        try {
            const response = await fetch(CONFIG.scriptUrl, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'getStudentData',
                    seatNo: seatNo,
                    idNumber: idNumber
                })
            });

            const data = await response.json();
            
            if (data.status !== 'success') {
                throw new Error(data.message || '登入失敗，請檢查座號與身分證字號');
            }

            currentStudent = data;

            // Handle feature flags
            const btnLife = document.getElementById('btn-life');
            const btnExam = document.getElementById('btn-exam');
            
            if (btnLife) btnLife.style.display = currentStudent.showLifePoints === false ? 'none' : 'flex';
            if (btnExam) btnExam.style.display = (currentStudent.showMajorExam === false || !currentStudent.availableExams || currentStudent.availableExams.length === 0) ? 'none' : 'flex';

            renderDashboard();

            loginSection.classList.add('hidden');
            dashboardSection.classList.remove('hidden');
            switchView('menu');
            
        } catch (err) {
            loginError.textContent = err.message;
            loginError.classList.remove('hidden');
        } finally {
            loginBtn.disabled = false;
            loginBtn.innerHTML = '登入查詢';
        }
    });

    // === Render Dashboard ===
    function renderDashboard() {
        document.getElementById('studentName').textContent = currentStudent.name || '';
        document.getElementById('studentClass').textContent = currentStudent.className || '';
        document.getElementById('studentSeatNo').textContent = currentStudent.seatNo || '';

        // Setup Exam Select
        const examSelector = document.getElementById('examSelector');
        if (currentStudent.availableExams && currentStudent.availableExams.length > 0) {
            let options = '';
            currentStudent.availableExams.forEach(exam => {
                options += `<option value="${exam.examId}">${exam.examName}</option>`;
            });
            examSelector.innerHTML = options;
            examSelector.onchange = (e) => {
                const eid = e.target.value;
                const match = currentStudent.availableExams.find(x => x.examId === eid);
                if (match) {
                    currentExamData = match;
                    renderExamContent();
                }
            };
            // trigger first
            currentExamData = currentStudent.availableExams[0];
            renderExamContent();
        } else {
            examSelector.innerHTML = '<option>目前沒有段考成績</option>';
            document.getElementById('examTableBody').innerHTML = '<tr><td colspan="4" class="text-center p-4 text-gray-500">尚無段考資料</td></tr>';
        }

        // Setup Chart Toggles
        document.getElementById('toggleChartClass').onclick = () => {
            chartMode = 'class';
            updateChartToggleUI();
            renderExamContent();
        };
        document.getElementById('toggleChartSchool').onclick = () => {
            chartMode = 'school';
            updateChartToggleUI();
            renderExamContent();
        };

        // Life Points
        renderLifePoints();
    }

    function updateChartToggleUI() {
        const btnC = document.getElementById('toggleChartClass');
        const btnS = document.getElementById('toggleChartSchool');
        if (chartMode === 'class') {
            btnC.className = "px-3 py-1 text-xs font-bold rounded-md bg-white shadow-sm text-gray-800";
            btnS.className = "px-3 py-1 text-xs font-bold rounded-md text-gray-500 hover:text-gray-800";
            document.getElementById('chartTypeLabel').textContent = '班級';
            document.getElementById('avgHeaderTitle').textContent = '班平';
        } else {
            btnS.className = "px-3 py-1 text-xs font-bold rounded-md bg-white shadow-sm text-gray-800";
            btnC.className = "px-3 py-1 text-xs font-bold rounded-md text-gray-500 hover:text-gray-800";
            document.getElementById('chartTypeLabel').textContent = '全校';
            document.getElementById('avgHeaderTitle').textContent = '校平';
        }
    }

    function formatScore(score) {
        if (score === undefined || score === null || score === '' || isNaN(score)) return '-';
        return Math.round(score * 100) / 100;
    }

    function renderExamContent() {
        if (!currentExamData) return;
        
        const summary = currentExamData.summary || {};
        document.getElementById('cardRank').textContent = summary.classRank || '-';
        document.getElementById('cardSchoolRank').textContent = summary.schoolRank || '-';
        document.getElementById('cardAvg').textContent = formatScore(summary.average);
        document.getElementById('cardTotal').textContent = formatScore(summary.totalScore);

        const tbody = document.getElementById('examTableBody');
        let html = '';

        // 總平均列
        const avgRow = currentExamData.subjects.find(s => s.subject === '總平均');
        if (avgRow) {
            html += generateTableRow(avgRow, true);
        }

        // 其他科目
        currentExamData.subjects.forEach(subj => {
            if (subj.subject !== '總平均') {
                html += generateTableRow(subj, false);
            }
        });

        tbody.innerHTML = html;
    }

    function generateTableRow(subj, isTotal) {
        const score = formatScore(subj.score);
        const avgScore = chartMode === 'class' ? formatScore(subj.classAverage) : formatScore(subj.schoolAverage);
        
        let rowClass = isTotal ? 'bg-orange-50/30' : 'hover:bg-gray-50 transition-colors';
        let subjClass = isTotal ? 'p-3 font-black text-gray-800' : 'p-3 font-bold text-gray-700';
        let scoreClass = isTotal ? 'p-3 text-center font-black text-[#c2516a] text-lg' : 'p-3 text-center font-bold text-[#c2516a]';
        let avgClass = isTotal ? 'p-3 text-center font-bold text-gray-600' : 'p-3 text-center font-bold text-gray-600';

        // 生成長條圖
        let chartHtml = '<div class="text-xs text-gray-400">無分佈資料</div>';
        const distData = chartMode === 'class' ? subj.classDistribution : subj.schoolDistribution;
        
        if (distData && distData.length === 10) {
            // Find max for scaling
            const maxCount = Math.max(...distData);
            
            // Labels for hover
            const labels = ["100-90", "89-80", "79-70", "69-60", "59-50", "49-40", "39-30", "29-20", "19-10", "9-0"];
            
            let barsHtml = '';
            for(let i=0; i<10; i++) {
                const count = distData[i] || 0;
                let pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                if (pct < 10 && pct > 0) pct = 10; // min height if has value
                
                // Determine if student score falls in this bin
                let isMyBin = false;
                const rawScore = Number(subj.score);
                if (!isNaN(rawScore)) {
                    if (i === 0 && rawScore >= 90) isMyBin = true;
                    else if (i === 1 && rawScore >= 80 && rawScore < 90) isMyBin = true;
                    else if (i === 2 && rawScore >= 70 && rawScore < 80) isMyBin = true;
                    else if (i === 3 && rawScore >= 60 && rawScore < 70) isMyBin = true;
                    else if (i === 4 && rawScore >= 50 && rawScore < 60) isMyBin = true;
                    else if (i === 5 && rawScore >= 40 && rawScore < 50) isMyBin = true;
                    else if (i === 6 && rawScore >= 30 && rawScore < 40) isMyBin = true;
                    else if (i === 7 && rawScore >= 20 && rawScore < 30) isMyBin = true;
                    else if (i === 8 && rawScore >= 10 && rawScore < 20) isMyBin = true;
                    else if (i === 9 && rawScore >= 0  && rawScore < 10) isMyBin = true;
                }

                let barColor = isMyBin ? (chartMode === 'class' ? 'bg-[#c2516a]' : 'bg-[#5c6bc0]') : (count > 0 ? 'bg-gray-300' : 'bg-gray-100');
                let hStyle = count > 0 ? `height: ${pct}%; min-height: 4px;` : `height: 2px;`;
                
                barsHtml += `
                    <div class="w-4 rounded-t-sm relative group flex items-end justify-center" style="${hStyle}">
                        <div class="w-full h-full ${barColor} rounded-t-sm"></div>
                        <div class="absolute -top-5 text-[10px] whitespace-nowrap z-10 ${isMyBin ? 'block font-bold text-gray-800' : 'hidden group-hover:block text-gray-500'}">${count}</div>
                    </div>
                `;
            }

            chartHtml = `
                <div class="flex flex-col gap-1 w-full max-w-[200px]">
                    <div class="flex items-end gap-[2px] h-8 pt-4 border-b border-gray-100">
                        ${barsHtml}
                    </div>
                </div>
            `;
        }

        return `
            <tr class="${rowClass}">
                <td class="${subjClass}">${subj.subject}</td>
                <td class="${scoreClass}">${score}</td>
                <td class="${avgClass}">${avgScore}</td>
                <td class="p-3 align-middle">${chartHtml}</td>
            </tr>
        `;
    }

    function renderLifePoints() {
        const initPts = currentStudent.initialLifePoints || 0;
        document.getElementById('initialPoints').textContent = initPts;
        
        const lpData = currentStudent.grades['生活計點'] || {};
        let total = initPts;
        
        // Flatten and group by Date
        let allRecords = [];
        Object.keys(lpData).forEach(week => {
            const weekData = lpData[week];
            weekData.records.forEach(rec => {
                total += rec.points;
                allRecords.push(rec);
            });
        });

        // Sort records by date descending
        allRecords.sort((a,b) => new Date(b.date) - new Date(a.date));

        // Group by Date
        const groupedByDate = {};
        allRecords.forEach(rec => {
            if (!groupedByDate[rec.date]) groupedByDate[rec.date] = [];
            groupedByDate[rec.date].push(rec);
        });

        document.getElementById('totalLifePoints').textContent = total;

        const summary = currentStudent.lifePointsSummary;
        document.getElementById('lpRank').textContent = summary && summary.rank ? summary.rank : '-';
        document.getElementById('lpPrev').textContent = summary && summary.prevScore !== undefined ? summary.prevScore : '-';
        document.getElementById('lpNext').textContent = summary && summary.nextScore !== undefined ? summary.nextScore : '-';

        let html = '';
        Object.keys(groupedByDate).forEach(dateStr => {
            html += `
                <div class="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                    <div class="bg-gray-50 px-4 py-2 font-bold text-gray-700 text-sm border-b border-gray-100">${dateStr}</div>
                    <div class="divide-y divide-gray-50">
            `;
            groupedByDate[dateStr].forEach(rec => {
                const ptsClass = rec.points > 0 ? 'text-green-600' : (rec.points < 0 ? 'text-red-600' : 'text-gray-500');
                const ptsSign = rec.points > 0 ? '+' : '';
                html += `
                    <div class="p-3 flex justify-between items-center text-sm hover:bg-gray-50 transition-colors">
                        <div>
                            <div class="font-bold text-gray-800">${rec.reason}</div>
                            <div class="text-xs text-gray-500 mt-1">${rec.remarks || ''}</div>
                        </div>
                        <div class="font-black font-mono ${ptsClass}">${ptsSign}${rec.points}</div>
                    </div>
                `;
            });
            html += `</div></div>`;
        });
        
        if (html === '') {
            html = '<div class="text-gray-500 text-center py-4 bg-white rounded-xl border border-dashed border-gray-200">目前沒有生活計點紀錄</div>';
        }
        
        document.getElementById('lifePointsList').innerHTML = html;
    }
});
