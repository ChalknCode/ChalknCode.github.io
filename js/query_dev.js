document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');
    const loginBtn = document.getElementById('loginBtn');
    
    let currentStudent = null;
    let currentExamData = null;
    let prevExamData = null;  // 上次段考資料，用於進退步比較
    let chartMode = 'class'; // 'class' or 'school'
    let schoolAvgSubmode = 'interval'; // 'interval' or 'cumulative' – only used when chartMode==='school' and isAvg

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
        
        // Login Animation
        const btnText = document.getElementById('btnText');
        const btnLoader = document.getElementById('btnLoader');
        loginBtn.disabled = true;
        btnText.textContent = '登入中...';
        btnLoader.classList.remove('dev-hidden');
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
            
            if (data.status === 'error' || data.error) {
                throw new Error(data.message || data.error || '登入失敗，請檢查資料');
            }

            currentStudent = data;
            _savedIdNumber = idNumber; // 儲存供備忘錄使用
            
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
            btnText.textContent = '登入查詢';
            btnLoader.classList.add('dev-hidden');
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

    // 儲存登入的身分證號碼供備忘錄使用
    let _savedIdNumber = '';

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
                loadExamData(eid);
            };
            loadExamData(currentStudent.availableExams[0]);
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
        document.getElementById('toggleSubInterval').onclick = () => {
            schoolAvgSubmode = 'interval';
            updateChartToggleUI();
            renderExamContent();
        };
        document.getElementById('toggleSubCumulative').onclick = () => {
            schoolAvgSubmode = 'cumulative';
            updateChartToggleUI();
            renderExamContent();
        };

        // 顯示備忘錄
        const memoInput = document.getElementById('memoInput');
        if (memoInput) {
            memoInput.value = currentStudent.memo || '';
        }

        // 綁定備忘錄儲存按鈕
        const saveMemoBtn = document.getElementById('saveMemoBtn');
        if (saveMemoBtn && !saveMemoBtn._bound) {
            saveMemoBtn._bound = true;
            saveMemoBtn.addEventListener('click', async () => {
                const btn = document.getElementById('saveMemoBtn');
                const text = document.getElementById('memoBtnText');
                btn.disabled = true;
                if (text) text.textContent = '儲存中...';
                try {
                    const response = await fetch(CONFIG.API_URL, {
                        method: 'POST',
                        body: JSON.stringify({
                            action: 'saveMemo',
                            seatNo: currentStudent.seatNo,
                            idNumber: _savedIdNumber,
                            memoText: document.getElementById('memoInput').value
                        })
                    });
                    const res = await response.json();
                    if (res.status === 'success') {
                        if (text) text.textContent = '✓ 已儲存';
                        setTimeout(() => { if (text) text.textContent = '儲存備忘錄'; btn.disabled = false; }, 2000);
                    } else {
                        alert('儲存失敗：' + res.message);
                        if (text) text.textContent = '儲存備忘錄'; btn.disabled = false;
                    }
                } catch (e) {
                    alert('儲存失敗，請檢查網路');
                    if (text) text.textContent = '儲存備忘錄'; btn.disabled = false;
                }
            });
        }

        renderLifePoints();
    }

    async function loadExamData(examName) {
        if (!examName) return;
        
        const content = document.getElementById('examContent');
        const loader = document.getElementById('examLoader');
        
        content.classList.add('dev-hidden');
        if(loader) loader.classList.remove('dev-hidden');

        try {
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'getMajorExamData', examName, seatNo: currentStudent.seatNo })
            });
            const data = await response.json();

            if (data.error) throw new Error(data.error);

            prevExamData = currentExamData;  // 保留上次段考資料
            currentExamData = data;
            renderExamContent();
        } catch (err) {
            console.error('段考讀取失敗:', err);
        } finally {
            if(loader) loader.classList.add('dev-hidden');
            content.classList.remove('dev-hidden');
        }
    }

    function updateChartToggleUI() {
        const btnC = document.getElementById('toggleChartClass');
        const btnS = document.getElementById('toggleChartSchool');
        const subToggle = document.getElementById('schoolSubmodeToggle');
        const btnInt = document.getElementById('toggleSubInterval');
        const btnCum = document.getElementById('toggleSubCumulative');
        if (chartMode === 'class') {
            btnC.className = "px-3 py-1.5 text-xs font-bold rounded-md bg-white shadow-sm text-gray-800";
            btnS.className = "px-3 py-1.5 text-xs font-bold rounded-md text-gray-500 hover:text-gray-800 bg-transparent";
            document.getElementById('chartTypeLabel').textContent = '班級';
            document.getElementById('avgHeaderTitle').textContent = '班級平均';
            if (subToggle) subToggle.classList.add('dev-hidden');
        } else {
            btnS.className = "px-3 py-1.5 text-xs font-bold rounded-md bg-white shadow-sm text-gray-800";
            btnC.className = "px-3 py-1.5 text-xs font-bold rounded-md text-gray-500 hover:text-gray-800 bg-transparent";
            document.getElementById('chartTypeLabel').textContent = '全校';
            document.getElementById('avgHeaderTitle').textContent = '學校平均';
            if (subToggle) subToggle.classList.remove('dev-hidden');
        }
        if (btnInt && btnCum) {
            if (schoolAvgSubmode === 'interval') {
                btnInt.className = "px-3 py-1.5 text-xs font-bold rounded-md bg-white shadow-sm text-gray-800";
                btnCum.className = "px-3 py-1.5 text-xs font-bold rounded-md text-gray-500 hover:text-gray-800 bg-transparent";
            } else {
                btnCum.className = "px-3 py-1.5 text-xs font-bold rounded-md bg-white shadow-sm text-gray-800";
                btnInt.className = "px-3 py-1.5 text-xs font-bold rounded-md text-gray-500 hover:text-gray-800 bg-transparent";
            }
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
        document.getElementById('cardRank').className = 'text-lg md:text-3xl font-black text-gray-800 leading-none font-inter';
        document.getElementById('cardRank').textContent = sum.classRank || '-';
        document.getElementById('cardSchoolRank').className = 'text-lg md:text-3xl font-black text-gray-800 leading-none font-inter';
        document.getElementById('cardSchoolRank').textContent = sum.schoolRankInterval || '-';
        document.getElementById('cardAvg').className = 'text-lg md:text-3xl font-black text-gray-800 leading-none font-inter';
        document.getElementById('cardAvg').textContent = formatScore(sum.personalAverage);
        document.getElementById('cardTotal').className = 'text-lg md:text-3xl font-black text-gray-800 leading-none font-inter';
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
            
            let rowClass = isAvg ? 'bg-orange-50' : 'hover:bg-gray-50/80 transition-colors';
            let subjClass = isAvg ? 'p-3 text-center font-black text-gray-900 border-l-4 border-orange-400' : 'p-3 text-center font-bold text-gray-700 border-l-4 border-transparent';
            
            const isRed = (typeof score === 'number' && score < 60) || (typeof currentExamData.scores[subj] === 'number' && currentExamData.scores[subj] < 60);
            let scoreClass = isAvg 
                ? `p-3 text-center font-black ${isRed ? 'text-red-500' : 'text-[#c2516a]'} text-lg font-inter` 
                : `p-3 text-center font-bold ${isRed ? 'text-red-500' : 'text-[#c2516a]'}` + ' font-inter';
                
            let avgClass = 'p-3 text-center font-bold text-gray-600 font-inter';
            const displayAvg = chartMode === 'class' ? classAvg : schoolAvg;

            let distSchool = null;
            let distClass = null;
            let labels = [];
            let dataSchool = [];
            let dataClass = [];
            let studentBinIndex = -1;
            
            const scoreNum = Number(currentExamData.scores[subj]);

            // 由高到低排列（左高右低）
            const labels10 = ["100-90", "89-80", "79-70", "69-60", "59-50", "49-40", "39-30", "29-20", "19-10", "9-0"];
            const labels18 = ["99.9-95.0", "94.9-90", "89.9-85", "84.9-80", "79.9-75", "74.9-70", "69.9-65", "64.9-60", "59.9-55", "54.9-50", "49.9-45", "44.9-40", "39.9-35", "34.9-30", "29.9-25", "24.9-20", "19.9-15", "14.9-0"];

            if (isAvg && chartMode === 'school') {
                // 全校總平均：18-bin，支援區間/累計切換
                const avgData = currentExamData.schoolDistributionAvg || {};
                distSchool = schoolAvgSubmode === 'cumulative'
                    ? (avgData.cumulative || avgData.interval || {})
                    : (avgData.interval || {});
                distClass = currentExamData.distribution ? currentExamData.distribution['personalAverage'] : {};
                labels = labels18;
                if (!isNaN(scoreNum)) {
                    // 高到低：index 0 = 最高分
                    if (scoreNum >= 95) studentBinIndex = 0;
                    else if (scoreNum >= 90) studentBinIndex = 1;
                    else if (scoreNum >= 85) studentBinIndex = 2;
                    else if (scoreNum >= 80) studentBinIndex = 3;
                    else if (scoreNum >= 75) studentBinIndex = 4;
                    else if (scoreNum >= 70) studentBinIndex = 5;
                    else if (scoreNum >= 65) studentBinIndex = 6;
                    else if (scoreNum >= 60) studentBinIndex = 7;
                    else if (scoreNum >= 55) studentBinIndex = 8;
                    else if (scoreNum >= 50) studentBinIndex = 9;
                    else if (scoreNum >= 45) studentBinIndex = 10;
                    else if (scoreNum >= 40) studentBinIndex = 11;
                    else if (scoreNum >= 35) studentBinIndex = 12;
                    else if (scoreNum >= 30) studentBinIndex = 13;
                    else if (scoreNum >= 25) studentBinIndex = 14;
                    else if (scoreNum >= 20) studentBinIndex = 15;
                    else if (scoreNum >= 15) studentBinIndex = 16;
                    else studentBinIndex = 17;
                }
            } else if (isAvg && chartMode === 'class') {
                // 班級總平均：10-bin
                distSchool = {};
                distClass = currentExamData.distribution ? currentExamData.distribution['personalAverage'] : {};
                labels = labels10;
                if (!isNaN(scoreNum)) {
                    const intScore = Math.floor(scoreNum);
                    // 高到低：index 0 = 最高分
                    if (intScore >= 90) studentBinIndex = 0;
                    else if (intScore >= 80) studentBinIndex = 1;
                    else if (intScore >= 70) studentBinIndex = 2;
                    else if (intScore >= 60) studentBinIndex = 3;
                    else if (intScore >= 50) studentBinIndex = 4;
                    else if (intScore >= 40) studentBinIndex = 5;
                    else if (intScore >= 30) studentBinIndex = 6;
                    else if (intScore >= 20) studentBinIndex = 7;
                    else if (intScore >= 10) studentBinIndex = 8;
                    else studentBinIndex = 9;
                }
            } else {
                distSchool = currentExamData.schoolDistribution ? currentExamData.schoolDistribution[subj] : {};
                distClass = currentExamData.distribution ? currentExamData.distribution[subj] : {};
                labels = labels10;
                if (!isNaN(scoreNum)) {
                    const intScore = Math.floor(scoreNum);
                    // 高到低：index 0 = 最高分
                    if (intScore >= 90) studentBinIndex = 0;
                    else if (intScore >= 80) studentBinIndex = 1;
                    else if (intScore >= 70) studentBinIndex = 2;
                    else if (intScore >= 60) studentBinIndex = 3;
                    else if (intScore >= 50) studentBinIndex = 4;
                    else if (intScore >= 40) studentBinIndex = 5;
                    else if (intScore >= 30) studentBinIndex = 6;
                    else if (intScore >= 20) studentBinIndex = 7;
                    else if (intScore >= 10) studentBinIndex = 8;
                    else studentBinIndex = 9;
                }
            }

            labels.forEach(k => { 
                dataSchool.push(distSchool ? (distSchool[k] || 0) : 0); 
                dataClass.push(distClass ? (distClass[k] || 0) : 0);
            });

            const activeData = chartMode === 'class' ? dataClass : dataSchool;
            let chartHtml = '<div class="text-xs text-gray-400">無資料</div>';

            
            if (activeData && activeData.length > 0) {
                const maxCount = Math.max(...activeData);
                const numBins = activeData.length;
                const totalCount = chartMode === 'class'
                    ? (distClass ? (distClass.total || activeData.reduce((a,b)=>a+b,0)) : 0)
                    : (distSchool ? (distSchool.total || activeData.reduce((a,b)=>a+b,0)) : 0);
                
                if (maxCount === 0) {
                    chartHtml = '<div class="text-xs text-gray-400 py-2">無此分佈資料</div>';
                } else {
                    let barsHtml = '';
                    let labelsHtml = '';
                    const is18bin = (numBins === 18);
                    const barW = 10; // px, 統一細柱
                    const barGapPx = is18bin ? 2 : 4; // px
                    const maxBarPx = 50; // 最高柱的像素高度
                    const labelRot = is18bin ? -55 : -60; // 旋轉角度

                    for(let i = 0; i < numBins; i++) {
                        const count = activeData[i] || 0;
                        const pixH = count > 0 ? Math.max(4, Math.round((count / maxCount) * maxBarPx)) : 2;
                        const isMyBin = (i === studentBinIndex);
                        const bgColor = isMyBin
                            ? (chartMode === 'class' ? '#c2516a' : '#4f5dc9')
                            : (count > 0 ? '#94a3b8' : '#e2e8f0');
                        const fw = isMyBin ? 'bold' : '400';
                        const numColor = isMyBin ? bgColor : '#64748b';
                        const labelText = labels[i] || '';

                        barsHtml += `<div style="width:${barW}px; flex-shrink:0; display:flex; align-items:flex-end; height:${maxBarPx}px; position:relative;">
                            <div style="width:100%; height:${pixH}px; border-radius:2px 2px 0 0; background-color:${bgColor}; position:relative; transition:height 0.2s;">
                                ${count > 0 ? `<div style="position:absolute; top:-15px; left:50%; transform:translateX(-50%); font-size:8px; white-space:nowrap; font-weight:${fw}; color:${numColor};">${count}</div>` : ''}
                            </div>
                        </div>`;

                        labelsHtml += `<div style="width:${barW}px; flex-shrink:0; height:28px; position:relative; overflow:visible;">
                            <div style="position:absolute; top:3px; left:50%; transform-origin:top left; transform:translateX(-50%) rotate(${labelRot}deg); font-size:6.5px; color:#94a3b8; white-space:nowrap;">${labelText}</div>
                        </div>`;
                    }

                    const totalLabel = totalCount > 0 ? `共 ${totalCount} 人` : '';
                    chartHtml = `
                        <div style="display:flex; flex-direction:column; gap:0; width:fit-content;">
                            ${totalLabel ? `<div style="font-size:9px; color:#9ca3af; text-align:right; margin-bottom:2px;">${totalLabel}</div>` : ''}
                            <div style="padding-top:18px; overflow:visible;">
                                <div style="display:flex; align-items:flex-end; gap:${barGapPx}px; overflow:visible;">
                                    ${barsHtml}
                                </div>
                                <div style="display:flex; gap:${barGapPx}px; margin-top:2px; overflow:visible;">
                                    ${labelsHtml}
                                </div>
                            </div>
                        </div>
                    `;
                }
            }


            html += `
                <tr class="${rowClass}">
                    <td class="${subjClass}">${title}</td>
                    <td class="${scoreClass}">${score}</td>
                    <td class="${avgClass}">${displayAvg}</td>
                    <td class="p-3 align-middle text-center">${chartHtml}</td>
                </tr>
            `;
        });

        tbody.innerHTML = html;

        // ====== 進退步比較 ======
        const compContainer = document.getElementById('examCompareSection');
        if (compContainer) {
            if (prevExamData && prevExamData.scores) {
                const subjects = currentExamData.subjectOrder || [];
                let compHtml = `
                    <div class="mt-4 rounded-xl overflow-hidden border border-gray-100">
                        <div class="bg-gradient-to-r from-purple-50 to-indigo-50 px-4 py-2 border-b border-gray-100">
                            <span class="text-xs font-bold text-purple-700">與上次段考比較</span>
                        </div>
                        <table class="w-full text-xs">
                            <thead class="bg-gray-50 text-gray-500">
                                <tr>
                                    <th class="p-2 text-center font-semibold">科目</th>
                                    <th class="p-2 text-center font-semibold">本次</th>
                                    <th class="p-2 text-center font-semibold">上次</th>
                                    <th class="p-2 text-center font-semibold">變化</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-50">
                `;
                [...subjects, 'personalAverage'].forEach(subj => {
                    const curr = currentExamData.scores[subj];
                    const prev = prevExamData.scores[subj];
                    const title = subj === 'personalAverage' ? '總平均' : subj;
                    const currNum = Number(curr);
                    const prevNum = Number(prev);
                    let changeHtml = '<span class="text-gray-400">-</span>';
                    if (!isNaN(currNum) && !isNaN(prevNum)) {
                        const diff = currNum - prevNum;
                        const sign = diff > 0 ? '+' : '';
                        const color = diff > 0 ? '#22c55e' : diff < 0 ? '#ef4444' : '#94a3b8';
                        const arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '→';
                        changeHtml = `<span style="color:${color}; font-weight:bold;">${arrow} ${sign}${diff.toFixed(1)}</span>`;
                    }
                    const isAvgRow = subj === 'personalAverage';
                    const rowBg = isAvgRow ? 'background:#f8f7ff;' : '';
                    compHtml += `<tr style="${rowBg}">
                        <td class="p-2 text-center ${isAvgRow ? 'font-bold text-purple-700' : 'text-gray-700'}">${title}</td>
                        <td class="p-2 text-center font-semibold text-gray-800">${isNaN(currNum) ? curr : currNum}</td>
                        <td class="p-2 text-center text-gray-500">${isNaN(prevNum) ? prev : prevNum}</td>
                        <td class="p-2 text-center">${changeHtml}</td>
                    </tr>`;
                });
                compHtml += `</tbody></table></div>`;
                compContainer.innerHTML = compHtml;
                compContainer.classList.remove('dev-hidden');
            } else {
                compContainer.classList.add('dev-hidden');
            }
        }
    }

    function renderLifePoints() {
        const initPts = currentStudent.initialLifePoints || 0;
        document.getElementById('initialPoints').textContent = initPts;
        
        const lpData = currentStudent.grades['生活計點'] || {};
        let total = initPts;
        
        const lpRank = currentStudent.rank || '-';
        const totalStudents = currentStudent.totalStudents || '-';
        document.getElementById('lpRank').textContent = `${lpRank} / ${totalStudents}`;
        const lpPrev = currentStudent.prevScore || '-';
        const lpNext = currentStudent.nextScore || '-';
        const prevEl = document.getElementById('lpPrev');
        const nextEl = document.getElementById('lpNext');
        if(prevEl) prevEl.textContent = lpPrev;
        if(nextEl) nextEl.textContent = lpNext;

        let html = '';
        const sortedWeeks = Object.keys(lpData).sort((a,b) => b - a);

        sortedWeeks.forEach((week, idx) => {
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

            // 只有第一筆 (最新的一週) 才展開，其餘加上 dev-hidden 隱藏
            const isHidden = idx === 0 ? '' : 'dev-hidden';
            const iconRotate = idx === 0 ? 'rotate-180' : '';

            html += `
                <div class="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm mb-4">
                    <div class="bg-gradient-to-r from-gray-50 to-white px-5 py-3.5 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors border-b border-gray-100" onclick="this.nextElementSibling.classList.toggle('dev-hidden'); this.querySelector('.arrow-icon').classList.toggle('rotate-180')">
                        <div class="flex items-center">
                            <svg class="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                            <span class="font-black text-gray-700 tracking-wide">第 ${week} 週</span>
                            <span class="text-xs text-gray-400 ml-3 font-medium">(${weekData.range})</span>
                        </div>
                        <svg class="arrow-icon w-4 h-4 text-gray-400 transform transition-transform ${iconRotate}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                    <div class="pb-3 ${isHidden}">
                        ${dailyHtml}
                    </div>
                </div>
            `;
        });
        
        document.getElementById('totalLifePoints').textContent = total;
        if (sortedWeeks.length > 0) {
            const wInfo = document.getElementById('weekInfo');
            if (wInfo) wInfo.textContent = '(第 ' + sortedWeeks[0] + ' 週)';
        } 

        if (html === '') {
            html = '<div class="text-gray-500 text-center py-4 bg-white rounded-xl border border-dashed border-gray-200">目前沒有生活計點紀錄</div>';
        }
        
        document.getElementById('lifePointsList').innerHTML = html;
    }
});
