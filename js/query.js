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
    let examChartInstance = null;

    // === Login Logic ===
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const seatNo = document.getElementById('seatNo').value.trim();
        const idNumber = document.getElementById('idNumber').value.trim();

        if (!seatNo || !idNumber) return;

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
            
            renderDashboard();
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
                            <span class="text-gray-500 mr-3">${rec.date}</span>
                            <span class="font-bold text-gray-800">${rec.reason}</span>
                            ${rec.remarks ? `<span class="text-gray-400 ml-2">(${rec.remarks})</span>` : ''}
                        </div>
                        <div class="font-bold font-mono ${ptsClass}">${ptsSign}${rec.points}</div>
                    </div>
                `;
            });
            html += `</div></div>`;
        });

        if (html === '') {
            html = '<div class="text-gray-500 text-center py-4">尚無計點紀錄</div>';
        }

        document.getElementById('lifePointsList').innerHTML = html;
        document.getElementById('currentPoints').textContent = total;
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

    function renderExamContent() {
        document.getElementById('examContent').classList.remove('hidden');
        
        const sum = currentExamData.summary;
        document.getElementById('examTotal').textContent = sum.totalScore;
        document.getElementById('examAvg').textContent = sum.personalAverage;
        document.getElementById('examClassRank').textContent = sum.classRank;
        document.getElementById('examSchoolRank').textContent = sum.schoolRankInterval;

        const tbody = document.getElementById('examTableBody');
        tbody.innerHTML = '';
        
        let chartOptions = '<option value="personalAverage">總平均</option>';

        currentExamData.subjectOrder.forEach(subj => {
            const score = currentExamData.scores[subj];
            const classAvg = currentExamData.averages.classAvg[subj];
            const schoolAvg = currentExamData.averages.schoolAvg[subj];
            
            const isRed = (typeof score === 'number' && score < 60);
            
            tbody.innerHTML += `
                <tr class="border-b hover:bg-gray-50">
                    <td class="p-2 border font-medium text-gray-700">${subj}</td>
                    <td class="p-2 border text-center font-bold font-mono ${isRed ? 'text-red-500' : 'text-gray-800'}">${score}</td>
                    <td class="p-2 border text-center text-gray-500 font-mono">${classAvg}</td>
                    <td class="p-2 border text-center text-gray-500 font-mono">${schoolAvg}</td>
                </tr>
            `;
            chartOptions += `<option value="${subj}">${subj}</option>`;
        });

        examChartSelect.innerHTML = chartOptions;
        renderExamChart('personalAverage');
    }

    examChartSelect.addEventListener('change', (e) => {
        renderExamChart(e.target.value);
    });

    function renderExamChart(subjectKey) {
        if (!currentExamData) return;
        
        let distData = null;
        let labels = [];
        let data = [];
        
        if (subjectKey === 'personalAverage') {
            distData = currentExamData.schoolDistributionAvg.interval;
            labels = ["99.9-95.0", "94.9-90", "89.9-85", "84.9-80", "79.9-75", "74.9-70", "69.9-65", "64.9-60", "59.9-55", "54.9-50", "49.9-45", "44.9-40", "39.9-35", "34.9-30", "29.9-25", "24.9-20", "19.9-15", "14.9-0"].reverse();
        } else {
            distData = currentExamData.schoolDistribution[subjectKey];
            labels = ["9-0", "19-10", "29-20", "39-30", "49-40", "59-50", "69-60", "79-70", "89-80", "100-90"];
        }

        if (distData) {
            labels.forEach(k => { data.push(distData[k] || 0); });
        }

        const ctx = document.getElementById('examChartCanvas').getContext('2d');
        if (examChartInstance) examChartInstance.destroy();

        examChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '全校人數',
                    data: data,
                    backgroundColor: 'rgba(194, 81, 106, 0.6)',
                    borderColor: 'rgba(194, 81, 106, 1)',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } }
                },
                plugins: { legend: { display: false } }
            }
        });
    }

    // Global function for subject click
    window.openSubjectDist = async function(examId, subject, type, score) {
        alert(`這裡未來可以串接小考成績分佈圖\n科目: ${subject}\n類別: ${type}\n分數: ${score}`);
        // 考量到避免一次載入太慢，這個可以後續加上
    };
});
