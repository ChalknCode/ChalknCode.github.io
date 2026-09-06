document.addEventListener('DOMContentLoaded', () => {
    // === DOM Elements ===
    const loginSection = document.getElementById('loginSection');
    const dashboardSection = document.getElementById('dashboardSection');
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');
    const loginText = document.getElementById('loginText');
    const loginLoader = document.getElementById('loginLoader');
    const loginError = document.getElementById('loginError');
    const logoutBtn = document.getElementById('logoutBtn');

    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    // === State ===
    let currentStudent = null;
    let currentExamData = null;
    let examChartInstances = [];

    // === Login Logic ===
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const rawSeatNo = document.getElementById('seatNo').value.trim();
        const idNumber = document.getElementById('idNumber').value.trim();

        if (!rawSeatNo || !idNumber) return;

        // 處理班級座號：例如將 "80501" 轉為 "1" 或 "01" (預設轉為數字字串 "1")
        let seatNo = rawSeatNo;
        if (rawSeatNo.length >= 4 && rawSeatNo.startsWith('805')) {
            seatNo = parseInt(rawSeatNo.replace('805', ''), 10).toString(); 
            // 若試算表存的是純文字 "01"，此處可能需要改為 seatNo = rawSeatNo.replace('805', '');
        } else if (!isNaN(rawSeatNo)) {
            seatNo = parseInt(rawSeatNo, 10).toString();
        }

        // UI Loading
        loginBtn.disabled = true;
        loginText.textContent = "驗證中...";
        loginLoader.classList.remove('hidden');
        loginError.classList.add('hidden');

        try {
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'getStudentData', seatNo, idNumber })
            });
            const data = await response.json();

            if (data.status === 'error') {
                throw new Error(data.message || '登入失敗');
            }

            // Success
            currentStudent = data;
            currentStudent.idNumber = idNumber; // for subsequent requests if needed
            
            // 根據學期設定控制頁籤顯示
            const btnLife = document.querySelector('.tab-btn[data-target="tab-life"]');
            const btnExam = document.querySelector('.tab-btn[data-target="tab-exam"]');
            const btnSubject = document.querySelector('.tab-btn[data-target="tab-subject"]');
            
            if (btnLife) btnLife.style.display = currentStudent.showLifePoints === false ? 'none' : '';
            if (btnExam) btnExam.style.display = (currentStudent.showMajorExam === false || !currentStudent.availableExams || currentStudent.availableExams.length === 0) ? 'none' : '';
            if (btnSubject) btnSubject.style.display = currentStudent.showSubjects === false ? 'none' : '';

            renderDashboard();
            
            // 自動切換到第一個可見的頁籤
            const visibleTabs = Array.from(document.querySelectorAll('.tab-btn')).filter(btn => btn.style.display !== 'none');
            if (visibleTabs.length > 0) {
                visibleTabs[0].click();
            }

            loginSection.classList.add('hidden');
            dashboardSection.classList.remove('hidden');
            
        } catch (err) {
            loginError.textContent = err.message;
            loginError.classList.remove('hidden');
        } finally {
            loginBtn.disabled = false;
            loginText.textContent = "登入查詢";
            loginLoader.classList.add('hidden');
        }
    });

    logoutBtn.addEventListener('click', () => {
        currentStudent = null;
        document.getElementById('seatNo').value = '';
        document.getElementById('idNumber').value = '';
        dashboardSection.classList.add('hidden');
        loginSection.classList.remove('hidden');
    });

    // === Tabs ===
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.target).classList.add('active');
        });
    });

    // === Render Dashboard ===
    function renderDashboard() {
        // Basic Info
        document.getElementById('studentName').textContent = currentStudent.name;
        document.getElementById('studentSeatNo').textContent = currentStudent.seatNo;
        document.getElementById('studentClass').textContent = currentStudent.className;
        document.getElementById('semesterName').textContent = currentStudent.semesterName || '';

        // Memo
        const memoText = document.getElementById('memoText');
        memoText.textContent = currentStudent.memo ? currentStudent.memo : '目前沒有備忘錄。';

        // Life Points
        renderLifePoints();

        // Subjects (Minor Exams)
        renderSubjects();

        // Major Exams
        renderExamSelect();
    }

    function renderLifePoints() {
        const initPts = currentStudent.initialLifePoints || 0;
        document.getElementById('initialPoints').textContent = initPts;
        
        const lpData = currentStudent.grades['生活計點'] || {};
        let total = initPts;
        let html = '';

        Object.keys(lpData).sort((a,b)=>b-a).forEach(week => {
            const weekData = lpData[week];
            html += `<div class="bg-white border rounded-lg overflow-hidden mb-4 shadow-sm">
                        <div class="bg-gray-100 px-4 py-2 font-bold text-gray-700 text-sm">第 ${week} 週 (${weekData.range})</div>
                        <div class="divide-y">`;
            
            weekData.records.forEach(rec => {
                total += rec.points;
                const ptsClass = rec.points > 0 ? 'text-green-600' : (rec.points < 0 ? 'text-red-600' : 'text-gray-500');
                const ptsSign = rec.points > 0 ? '+' : '';
                html += `
                    <div class="p-3 flex justify-between items-center text-sm">
                        <div>
                            <div class="font-bold text-gray-800">${rec.date} <span class="ml-2">${rec.reason}</span></div>
                            <div class="text-xs text-gray-500 mt-1">${rec.remarks || ''}</div>
                        </div>
                        <div class="font-bold font-mono ${ptsClass}">${ptsSign}${rec.points}</div>
                    </div>
                `;
            });
            html += `</div></div>`;
        });
        
        if (html === '') {
            html = '<div class="text-gray-500 text-center py-4">目前沒有生活計點紀錄</div>';
        }
        
        document.getElementById('lifePointsList').innerHTML = html;
        document.getElementById('totalLifePoints').textContent = total;

        // 處理排名與前後分數 (若後端有回傳)
        const summary = currentStudent.lifePointsSummary;
        document.getElementById('lpRank').textContent = summary && summary.rank ? summary.rank : '需更新後端';
        document.getElementById('lpPrev').textContent = summary && summary.prevScore !== undefined ? summary.prevScore : '需更新後端';
        document.getElementById('lpNext').textContent = summary && summary.nextScore !== undefined ? summary.nextScore : '需更新後端';
    }

    function renderSubjects() {
        const container = document.getElementById('subjectContent');
        let html = '';
        
        currentStudent.subjectOrder.forEach(subj => {
            const grades = currentStudent.grades[subj];
            if (!grades || grades.length === 0) return;

            html += `<div class="bg-white border rounded-lg shadow-sm">
                        <div class="bg-slate-100 px-4 py-3 font-bold text-slate-700 border-b">${subj}</div>
                        <div class="divide-y divide-gray-50">`;
            
            grades.forEach(g => {
                html += `
                    <div class="p-3 flex justify-between items-center text-sm hover:bg-gray-50 cursor-pointer" onclick="openSubjectDist('${g.examId}', '${subj}', '${g.type}', '${g.score}')">
                        <div>
                            <span class="text-gray-500 w-24 inline-block">${g.date}</span>
                            <span class="font-medium text-gray-700">${g.type}</span>
                        </div>
                        <div class="font-bold font-mono ${g.score < 60 ? 'text-red-500' : 'text-gray-800'}">${g.score}</div>
                    </div>
                `;
            });
            html += `</div></div>`;
        });

        if (html === '') html = '<div class="text-center text-gray-500 py-8">尚無平時成績</div>';
        container.innerHTML = html;
    }

    // === Major Exam Logic ===
    const examSelect = document.getElementById('examSelect');
    const examChartSelect = document.getElementById('examChartSelect');

    function renderExamSelect() {
        if (!currentStudent.availableExams || currentStudent.availableExams.length === 0) {
            examSelect.innerHTML = '<option value="">無段考資料</option>';
            examSelect.disabled = true;
            return;
        }
        
        examSelect.disabled = false;
        examSelect.innerHTML = currentStudent.availableExams.map(ex => `<option value="${ex}">${ex}</option>`).join('');
        loadExamData(currentStudent.availableExams[0]);
    }

    examSelect.addEventListener('change', (e) => {
        loadExamData(e.target.value);
    });

    async function loadExamData(examName) {
        if (!examName) return;
        
        document.getElementById('examContent').classList.add('hidden');
        document.getElementById('examLoader').classList.remove('hidden');

        try {
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'getMajorExamData', examName, seatNo: currentStudent.seatNo })
            });
            const data = await response.json();

            if (data.error) throw new Error(data.error);

            currentExamData = data;
            renderExamContent();
        } catch (err) {
            alert('無法讀取段考資料: ' + err.message);
        } finally {
            document.getElementById('examLoader').classList.add('hidden');
        }
    }

    function formatScore(val) {
        if (val === undefined || val === null || val === '' || val === 'N/A' || val === 'NaN') {
            return '-';
        }
        const num = Number(val);
        if (!isNaN(num)) {
            return Math.round(num * 100) / 100;
        }
        return val;
    }

    function renderExamContent() {
        document.getElementById('examContent').classList.remove('hidden');
        
        const sum = currentExamData.summary;
        document.getElementById('examTotal').textContent = formatScore(sum.totalScore);
        document.getElementById('examAvg').textContent = formatScore(sum.personalAverage);
        document.getElementById('examClassRank').textContent = sum.classRank || '-';
        document.getElementById('examSchoolRank').textContent = sum.schoolRankInterval || '-';

        const tbody = document.getElementById('examTableBody');
        const container = document.getElementById('examSubjectsContainer');
        tbody.innerHTML = '';
        container.innerHTML = '';
        
        examChartInstances.forEach(c => c.destroy());
        examChartInstances = [];

        const subjectsToRender = ['personalAverage', ...currentExamData.subjectOrder];

        subjectsToRender.forEach((subj, index) => {
            const isAvg = subj === 'personalAverage';
            const title = isAvg ? '總平均' : subj;
            const score = formatScore(currentExamData.scores[subj]);
            const classAvg = formatScore(currentExamData.averages.classAvg[subj]);
            const schoolAvg = formatScore(currentExamData.averages.schoolAvg[subj]);
            
            let schoolRank = currentExamData.schoolRankEstimates[subj] || '-';
            if (schoolRank === 'N/A' || schoolRank === 'NaN') schoolRank = '-';
            
            const isRed = (typeof score === 'number' && score < 60);

            // 填入總表
            tbody.innerHTML += `
                <tr class="hover:bg-gray-50 transition">
                    <td class="p-3 font-bold text-gray-700">${title}</td>
                    <td class="p-3 text-center font-black font-mono ${isRed ? 'text-red-500' : 'text-gray-800'}">${score}</td>
                    <td class="p-3 text-center text-gray-500 font-mono">${classAvg}</td>
                    <td class="p-3 text-center text-gray-500 font-mono">${schoolAvg}</td>
                    <td class="p-3 text-center text-gray-500 font-mono">${schoolRank}</td>
                </tr>
            `;
            
            // 生成精簡版圖表卡片
            const cardHtml = `
                <div class="border rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition flex flex-col">
                    <div class="flex justify-between items-center border-b pb-2 mb-3">
                        <h4 class="text-lg font-bold text-gray-800">${title}</h4>
                        <div class="text-2xl font-black ${isRed ? 'text-red-500' : 'text-gray-800'}">${score}</div>
                    </div>
                    <div class="flex justify-between text-xs text-gray-500 mb-2 px-1">
                        <span>班平: <b class="text-gray-700">${classAvg}</b></span>
                        <span>校平: <b class="text-gray-700">${schoolAvg}</b></span>
                    </div>
                    <div class="relative w-full flex-grow" style="min-height: 160px;">
                        <canvas id="examChart-${index}"></canvas>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', cardHtml);
        });

        subjectsToRender.forEach((subj, index) => {
            const isAvg = subj === 'personalAverage';
            const score = currentExamData.scores[subj];
            
            let distSchool = null;
            let distClass = null;
            let labels = [];
            let dataSchool = [];
            let dataClass = [];
            let studentBinIndex = -1;
            
            const scoreNum = Number(score);

            if (isAvg) {
                distSchool = currentExamData.schoolDistributionAvg.interval;
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
                distSchool = currentExamData.schoolDistribution[subj];
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

            // 班級使用藍色系 (#5c6bc0)
            const classBg = dataClass.map((_, i) => i === studentBinIndex ? 'rgba(92, 107, 192, 0.9)' : 'rgba(92, 107, 192, 0.25)');
            const classBorder = dataClass.map((_, i) => i === studentBinIndex ? 'rgba(92, 107, 192, 1)' : 'rgba(92, 107, 192, 0.5)');
            
            // 全校使用粉色系 (#c2516a)
            const schoolBg = dataSchool.map((_, i) => i === studentBinIndex ? 'rgba(194, 81, 106, 0.9)' : 'rgba(194, 81, 106, 0.25)');
            const schoolBorder = dataSchool.map((_, i) => i === studentBinIndex ? 'rgba(194, 81, 106, 1)' : 'rgba(194, 81, 106, 0.5)');

            const ctx = document.getElementById(`examChart-${index}`).getContext('2d');
            const chart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: '班級人數',
                            data: dataClass,
                            backgroundColor: classBg,
                            borderColor: classBorder,
                            borderWidth: 1,
                            borderRadius: 2,
                            barPercentage: 0.9,
                            categoryPercentage: 0.8
                        },
                        {
                            label: '全校人數',
                            data: dataSchool,
                            backgroundColor: schoolBg,
                            borderColor: schoolBorder,
                            borderWidth: 1,
                            borderRadius: 2,
                            barPercentage: 0.9,
                            categoryPercentage: 0.8
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false,
                    },
                    scales: {
                        y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } },
                        x: { ticks: { font: { size: 9 }, maxRotation: 45, minRotation: 45 } }
                    },
                    plugins: { 
                        legend: { 
                            display: true,
                            position: 'top',
                            labels: { boxWidth: 10, font: { size: 10 } }
                        },
                        tooltip: {
                            callbacks: {
                                title: (ctx) => `分數區間: ${ctx[0].label}`
                            }
                        }
                    }
                }
            });
            examChartInstances.push(chart);
        });
    }

    // Global function for subject click
    window.openSubjectDist = async function(examId, subject, type, score) {
        alert(`這裡未來可以串接小考成績分佈圖\n科目: ${subject}\n類別: ${type}\n分數: ${score}`);
        // 考量到避免一次載入太慢，這個可以後續加上
    };
});
