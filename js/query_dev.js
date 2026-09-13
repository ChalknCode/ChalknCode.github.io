document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');
    const loginBtn = document.getElementById('loginBtn');
    
    let currentStudent = null;
    let currentExamData = null;
    let chartMode = 'class'; // 'class' or 'school'

    window.navTo = function(viewId) {
        ['login', 'dashboard', 'exam', 'life'].forEach(id => {
            document.getElementById('view-' + id).classList.add('dev-hidden');
        });
        document.getElementById('view-' + viewId).classList.remove('dev-hidden');
    };

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const rawSeatNo = document.getElementById('seatNo').value.trim();
        const idNumber = document.getElementById('idNumber').value.trim();
        
        if (!rawSeatNo || !idNumber) return;

        let seatNo = rawSeatNo;
        if (rawSeatNo.length >= 4 && rawSeatNo.startsWith('805')) {
            seatNo = parseInt(rawSeatNo.replace('805', ''), 10).toString(); 
        } else if (!isNaN(rawSeatNo)) {
            seatNo = parseInt(rawSeatNo, 10).toString();
        }
        
        loginBtn.disabled = true;
        loginBtn.innerHTML = '登入中...';
        loginError.classList.add('dev-hidden');

        try {
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'getStudentData',
                    seatNo: seatNo,
                    idNumber: idNumber
                })
            });

            const data = await response.json();
            
            if (data.status !== 'success') {
                throw new Error(data.message || '登入失敗，請檢查資料');
            }

            currentStudent = data;
            
            const btnLife = document.getElementById('btn-life');
            const btnExam = document.getElementById('btn-exam');
            if (btnLife) btnLife.style.display = currentStudent.showLifePoints === false ? 'none' : 'flex';
            if (btnExam) btnExam.style.display = (currentStudent.showMajorExam === false || !currentStudent.availableExams || currentStudent.availableExams.length === 0) ? 'none' : 'flex';

            renderDashboard();
            navTo('dashboard');
            
        } catch (err) {
            loginError.textContent = err.message;
            loginError.classList.remove('dev-hidden');
        } finally {
            loginBtn.disabled = false;
            loginBtn.innerHTML = '登入查詢';
        }
    });

    const togglePassword = document.getElementById('togglePassword');
    if(togglePassword) {
        togglePassword.addEventListener('click', function () {
            const pwdInput = document.getElementById('idNumber');
            const type = pwdInput.getAttribute('type') === 'password' ? 'text' : 'password';
            pwdInput.setAttribute('type', type);
            const svg = document.getElementById('eyeIcon');
            if (type === 'password') {
                svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />';
            } else {
                svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />';
            }
        });
    }

    function renderDashboard() {
        document.getElementById('studentName').textContent = currentStudent.name || '';
        document.getElementById('studentClass').textContent = currentStudent.className || '';
        document.getElementById('studentSeatNo').textContent = currentStudent.seatNo || '';

        const examSelector = document.getElementById('examSelector');
        if (currentStudent.availableExams && currentStudent.availableExams.length > 0) {
            let options = '';
            currentStudent.availableExams.forEach(exam => {
                options += `<option value="${exam}">${exam}</option>`;
            });
            examSelector.innerHTML = options;
            examSelector.onchange = (e) => {
                const eid = e.target.value;
                currentExamData = currentStudent.grades[eid];
                if (currentExamData) {
                    renderExamContent();
                }
            };
            currentExamData = currentStudent.grades[currentStudent.availableExams[0]];
            renderExamContent();
        }

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

        renderLifePoints();
    }

    function updateChartToggleUI() {
        const btnC = document.getElementById('toggleChartClass');
        const btnS = document.getElementById('toggleChartSchool');
        if (chartMode === 'class') {
            btnC.className = "px-3 py-1.5 text-xs font-bold rounded-md bg-white shadow-sm text-gray-800";
            btnS.className = "px-3 py-1.5 text-xs font-bold rounded-md text-gray-500 hover:text-gray-800 bg-transparent";
            document.getElementById('chartTypeLabel').textContent = '班級';
            document.getElementById('avgHeaderTitle').textContent = '班平';
        } else {
            btnS.className = "px-3 py-1.5 text-xs font-bold rounded-md bg-white shadow-sm text-gray-800";
            btnC.className = "px-3 py-1.5 text-xs font-bold rounded-md text-gray-500 hover:text-gray-800 bg-transparent";
            document.getElementById('chartTypeLabel').textContent = '全校';
            document.getElementById('avgHeaderTitle').textContent = '校平';
        }
    }

    function formatScore(val) {
        if (val === undefined || val === null || val === '') return '-';
        const num = Number(val);
        if (!isNaN(num)) return Math.round(num * 100) / 100;
        return val;
    }

    function renderExamContent() {
        if (!currentExamData) return;
        
        const sum = currentExamData.summary || {};
        document.getElementById('cardRank').textContent = sum.classRank || '-';
        document.getElementById('cardSchoolRank').textContent = sum.schoolRankInterval || '-';
        document.getElementById('cardAvg').textContent = formatScore(sum.personalAverage);
        document.getElementById('cardTotal').textContent = formatScore(sum.totalScore);

        const tbody = document.getElementById('examTableBody');
        let html = '';

        const subjectsToRender = ['personalAverage', ...(currentExamData.subjectOrder || [])];

        subjectsToRender.forEach((subj) => {
            const isAvg = subj === 'personalAverage';
            const title = isAvg ? '總平均' : subj;
            
            const score = formatScore(currentExamData.scores[subj]);
            const classAvg = formatScore(currentExamData.averages?.classAvg?.[subj]);
            const schoolAvg = formatScore(currentExamData.averages?.schoolAvg?.[subj]);
            
            let rowClass = isAvg ? 'bg-orange-50/40' : 'hover:bg-gray-50/80 transition-colors';
            let subjClass = isAvg ? 'p-3 font-black text-gray-800' : 'p-3 font-bold text-gray-700';
            
            const isRed = (typeof score === 'number' && score < 60) || (typeof currentExamData.scores[subj] === 'number' && currentExamData.scores[subj] < 60);
            let scoreClass = isAvg 
                ? `p-3 text-center font-black ${isRed ? 'text-red-500' : 'text-[#c2516a]'} text-lg` 
                : `p-3 text-center font-bold ${isRed ? 'text-red-500' : 'text-[#c2516a]'}`;
                
            let avgClass = 'p-3 text-center font-bold text-gray-600';
            const displayAvg = chartMode === 'class' ? classAvg : schoolAvg;

            let distSchool = null;
            let distClass = null;
            let labels = [];
            let dataSchool = [];
            let dataClass = [];
            let studentBinIndex = -1;
            
            const scoreNum = Number(currentExamData.scores[subj]);

            if (isAvg) {
                distSchool = currentExamData.schoolDistributionAvg ? currentExamData.schoolDistributionAvg.interval : {};
                distClass = currentExamData.classDistributionAvg ? currentExamData.classDistributionAvg.interval : {};
                labels = ["14.9-0", "19.9-15", "24.9-20", "29.9-25", "34.9-30", "39.9-35", "44.9-40", "49.9-45", "54.9-50", "59.9-55", "64.9-60", "69.9-65", "74.9-70", "79.9-75", "84.9-80", "89.9-85", "94.9-90", "99.9-95.0"];
                
                if (!isNaN(scoreNum)) {
                    const limits = [15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];
                    for (let i = 0; i < limits.length; i++) {
                        if (scoreNum < limits[i]) {
                            studentBinIndex = i;
                            break;
                        }
                    }
                    if (studentBinIndex === -1) studentBinIndex = limits.length - 1;
                }
            } else {
                distSchool = currentExamData.schoolDistribution ? currentExamData.schoolDistribution[subj] : {};
                distClass = currentExamData.classDistribution ? currentExamData.classDistribution[subj] : {};
                labels = ["9-0", "19-10", "29-20", "39-30", "49-40", "59-50", "69-60", "79-70", "89-80", "100-90"];
                
                if (!isNaN(scoreNum)) {
                    const intScore = Math.floor(scoreNum);
                    if (intScore >= 90) studentBinIndex = 9;
                    else if (intScore >= 80) studentBinIndex = 8;
                    else if (intScore >= 70) studentBinIndex = 7;
                    else if (intScore >= 60) studentBinIndex = 6;
                    else if (intScore >= 50) studentBinIndex = 5;
                    else if (intScore >= 40) studentBinIndex = 4;
                    else if (intScore >= 30) studentBinIndex = 3;
                    else if (intScore >= 20) studentBinIndex = 2;
                    else if (intScore >= 10) studentBinIndex = 1;
                    else studentBinIndex = 0;
                }
            }

            if (distSchool) {
                labels.forEach(k => { 
                    dataSchool.push(distSchool[k] || 0); 
                    dataClass.push(distClass ? (distClass[k] || 0) : 0);
                });
            }

            const activeData = chartMode === 'class' ? dataClass : dataSchool;
            let chartHtml = '<div class="text-xs text-gray-400">無資料</div>';

            if (activeData && activeData.length > 0) {
                const maxCount = Math.max(...activeData);
                const numBins = activeData.length; 
                
                let barsHtml = '';
                for(let i=0; i<numBins; i++) {
                    const count = activeData[i] || 0;
                    let pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                    if (pct < 10 && pct > 0) pct = 10;
                    
                    const isMyBin = (i === studentBinIndex);
                    const bgColor = isMyBin ? (chartMode === 'class' ? '#c2516a' : '#5c6bc0') : (count > 0 ? '#cbd5e1' : '#f1f5f9');
                    const height = count > 0 ? `${pct}%` : '2px';
                    
                    barsHtml += `
                        <div class="flex-1 rounded-t-sm relative group flex items-end justify-center h-full" style="min-height:2px;">
                            <div class="w-full rounded-t-sm transition-all" style="height: ${height}; background-color: ${bgColor}; min-height: 2px;"></div>
                            <div class="absolute -top-5 text-[10px] whitespace-nowrap z-10 ${isMyBin ? 'block font-bold' : 'hidden group-hover:block text-gray-500'}" style="color: ${isMyBin ? bgColor : ''}">${count}</div>
                        </div>
                    `;
                }

                chartHtml = `
                    <div class="flex items-end gap-[1px] h-8 pt-4 w-full max-w-[200px]">
                        ${barsHtml}
                    </div>
                `;
            }

            html += `
                <tr class="${rowClass}">
                    <td class="${subjClass}">${title}</td>
                    <td class="${scoreClass}">${score}</td>
                    <td class="${avgClass}">${displayAvg}</td>
                    <td class="p-3 align-middle">${chartHtml}</td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    }

    function renderLifePoints() {
        const initPts = currentStudent.initialLifePoints || 0;
        document.getElementById('initialPoints').textContent = initPts;
        
        const lpData = currentStudent.grades['生活計點'] || {};
        let total = initPts;
        
        const summary = currentStudent.lifePointsSummary || {};
        document.getElementById('lpRank').textContent = summary.rank || '-';
        document.getElementById('lpPrev').textContent = summary.prevScore !== undefined ? summary.prevScore : '-';
        document.getElementById('lpNext').textContent = summary.nextScore !== undefined ? summary.nextScore : '-';

        let html = '';
        const sortedWeeks = Object.keys(lpData).sort((a,b) => b - a);

        sortedWeeks.forEach(week => {
            const weekData = lpData[week];
            
            const dailyGroups = {};
            weekData.records.forEach(rec => {
                total += rec.points;
                if(!dailyGroups[rec.date]) dailyGroups[rec.date] = [];
                dailyGroups[rec.date].push(rec);
            });

            const sortedDates = Object.keys(dailyGroups).sort((a,b) => new Date(b) - new Date(a));
            
            let dailyHtml = '';
            sortedDates.forEach(dateStr => {
                dailyHtml += `
                    <div class="pl-4 pr-3 py-1 mt-3 font-bold text-[#5c6bc0] text-xs flex items-center border-l-2 border-[#5c6bc0] bg-indigo-50/20">
                        <svg class="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        ${dateStr}
                    </div>
                    <div class="ml-4 mr-2">
                        <table class="w-full text-left text-sm mt-1">
                            <tbody class="divide-y divide-gray-100">
                `;
                dailyGroups[dateStr].forEach(rec => {
                    const ptsClass = rec.points > 0 ? 'text-green-600 bg-green-50' : (rec.points < 0 ? 'text-red-600 bg-red-50' : 'text-gray-500 bg-gray-50');
                    const ptsSign = rec.points > 0 ? '+' : '';
                    dailyHtml += `
                                <tr class="hover:bg-gray-50/50 transition-colors">
                                    <td class="py-2.5 px-2 text-gray-600 w-full">
                                        <div class="flex items-center">
                                            <span class="w-1.5 h-1.5 rounded-full ${rec.points > 0 ? 'bg-green-400' : (rec.points < 0 ? 'bg-red-400' : 'bg-gray-400')} mr-2"></span>
                                            ${rec.reason}
                                            ${rec.remarks ? `<span class="text-[10px] text-gray-400 font-normal ml-2 bg-gray-100 px-1.5 py-0.5 rounded">${rec.remarks}</span>` : ''}
                                        </div>
                                    </td>
                                    <td class="py-2.5 pr-2 pl-4 text-right">
                                        <span class="inline-block px-2 py-0.5 rounded font-black text-xs ${ptsClass}">${ptsSign}${rec.points}</span>
                                    </td>
                                </tr>
                    `;
                });
                dailyHtml += `</tbody></table></div>`;
            });

            html += `
                <div class="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm mb-4">
                    <div class="bg-gradient-to-r from-gray-50 to-white px-5 py-3.5 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors border-b border-gray-100" onclick="this.nextElementSibling.classList.toggle('dev-hidden')">
                        <div class="flex items-center">
                            <svg class="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                            <span class="font-black text-gray-700 tracking-wide">第 ${week} 週</span>
                            <span class="text-xs text-gray-400 ml-3 font-medium">(${weekData.range})</span>
                        </div>
                        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                    <div class="pb-3">
                        ${dailyHtml}
                    </div>
                </div>
            `;
        });
        
        document.getElementById('totalLifePoints').textContent = total; 

        if (html === '') {
            html = '<div class="text-gray-500 text-center py-4 bg-white rounded-xl border border-dashed border-gray-200">目前沒有生活計點紀錄</div>';
        }
        
        document.getElementById('lifePointsList').innerHTML = html;
    }
});
