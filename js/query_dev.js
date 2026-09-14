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
        const dashExamSelector = document.getElementById('dashExamSelector');
        if (currentStudent.availableExams && currentStudent.availableExams.length > 0) {
            let options = '';
            currentStudent.availableExams.forEach(exam => {
                options += `<option value="${exam}">${exam}</option>`;
            });
            if (examSelector) {
                examSelector.innerHTML = options;
                examSelector.onchange = (e) => {
                    const eid = e.target.value;
                    if (dashExamSelector) dashExamSelector.value = eid;
                    loadExamData(eid);
                };
            }
            if (dashExamSelector) {
                dashExamSelector.innerHTML = options;
                dashExamSelector.onchange = (e) => {
                    const eid = e.target.value;
                    if (examSelector) examSelector.value = eid;
                    loadExamData(eid);
                };
            }
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
        window.setSchoolSubmode = (mode) => {
            schoolAvgSubmode = mode;
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
        renderDashLineChart();
    }

    async function loadExamData(examName) {
        if (!examName) return;
        
        const content = document.getElementById('examContent');
        const loader = document.getElementById('examLoader');
        const radarLoader = document.getElementById('dashRadarLoader');
        const radarCanvas = document.getElementById('dashRadarChart');
        
        content.classList.add('dev-hidden');
        if(loader) loader.classList.remove('dev-hidden');
        if(radarLoader) radarLoader.classList.remove('dev-hidden');
        if(radarCanvas) radarCanvas.style.opacity = '0.3';

        try {
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'getMajorExamData', examName, seatNo: currentStudent.seatNo })
            });
            const data = await response.json();

            prevExamData = currentExamData;  // 保留上次段考資料
            currentExamData = data;
            renderExamContent();
        } catch (err) {
            console.error('段考讀取失敗:', err);
        } finally {
            if(loader) loader.classList.add('dev-hidden');
            if(radarLoader) radarLoader.classList.add('dev-hidden');
            if(radarCanvas) radarCanvas.style.opacity = '1';
            content.classList.remove('dev-hidden');
        }
    }

    function updateChartToggleUI() {
        const btnC = document.getElementById('toggleChartClass');
        const btnS = document.getElementById('toggleChartSchool');
        if (chartMode === 'class') {
            btnC.className = "px-3 py-1.5 text-xs font-bold rounded-md bg-white shadow-sm text-gray-800";
            btnS.className = "px-3 py-1.5 text-xs font-bold rounded-md text-gray-500 hover:text-gray-800 bg-transparent";
            document.getElementById('chartTypeLabel').textContent = '班級';
            document.getElementById('avgHeaderTitle').textContent = '班級平均';
        } else {
            btnS.className = "px-3 py-1.5 text-xs font-bold rounded-md bg-white shadow-sm text-gray-800";
            btnC.className = "px-3 py-1.5 text-xs font-bold rounded-md text-gray-500 hover:text-gray-800 bg-transparent";
            document.getElementById('chartTypeLabel').textContent = '全校';
            document.getElementById('avgHeaderTitle').textContent = '學校平均';
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
        
        const tbody = document.getElementById('examTableBody');
        let html = '';

        if (currentExamData.status === 'error' || currentExamData.error) {
            tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-red-500 font-bold">${currentExamData.message || currentExamData.error || '讀取資料失敗'}</td></tr>`;
            return;
        }

        if (!currentExamData.scores) currentExamData.scores = {};
        if (!currentExamData.summary) currentExamData.summary = {};

        const sum = currentExamData.summary;
        document.getElementById('cardRank').className = 'text-lg md:text-3xl font-black text-gray-800 leading-none font-inter';
        document.getElementById('cardRank').textContent = sum.classRank || '-';
        document.getElementById('cardSchoolRank').className = 'text-lg md:text-3xl font-black text-gray-800 leading-none font-inter';
        document.getElementById('cardSchoolRank').textContent = sum.schoolRankInterval || '-';
        document.getElementById('cardAvg').className = 'text-lg md:text-3xl font-black text-gray-800 leading-none font-inter';
        document.getElementById('cardAvg').textContent = formatScore(sum.personalAverage);
        document.getElementById('cardTotal').className = 'text-lg md:text-3xl font-black text-gray-800 leading-none font-inter';
        document.getElementById('cardTotal').textContent = formatScore(sum.totalScore);

        const subjectsToRender = ['personalAverage', ...(currentExamData.subjectOrder || [])];

        subjectsToRender.forEach((subj) => {
            const isAvg = subj === 'personalAverage';
            const title = isAvg ? '總平均' : subj;
            
            const rawScore = isAvg ? sum.personalAverage : currentExamData.scores[subj];
            const score = formatScore(rawScore);
            const classAvg = formatScore(currentExamData.averages?.classAvg?.[subj]);
            const schoolAvg = formatScore(currentExamData.averages?.schoolAvg?.[subj]);
            
            let rowClass = isAvg ? 'bg-orange-50' : 'hover:bg-gray-50/80 transition-colors';
            let subjClass = isAvg ? 'p-3 text-center font-black text-gray-900 border-l-4 border-orange-400' : 'p-3 text-center font-bold text-gray-700 border-l-4 border-transparent';
            
            const isRed = (typeof score === 'number' && score < 60) || (typeof rawScore === 'number' && rawScore < 60);
            let scoreClass = isAvg 
                ? `p-3 text-center font-black ${isRed ? 'text-red-500' : 'text-[#c2516a]'} text-lg font-inter align-middle` 
                : `p-3 text-center font-bold ${isRed ? 'text-red-500' : 'text-[#c2516a]'} font-inter align-middle`;
                
            let avgClass = 'p-3 text-center font-bold text-gray-600 font-inter align-middle';
            const displayAvg = chartMode === 'class' ? classAvg : schoolAvg;

            let diffHtml = '';
            if (prevExamData && !prevExamData.error && prevExamData.status !== 'error') {
                const prev = isAvg ? prevExamData.summary?.personalAverage : (prevExamData.scores && prevExamData.scores[subj]);
                const currNum = Number(rawScore);
                const prevNum = Number(prev);
                if (!isNaN(currNum) && !isNaN(prevNum)) {
                    const diff = currNum - prevNum;
                    const sign = diff > 0 ? '+' : '';
                    const textColor = diff > 0 ? '#15803d' : diff < 0 ? '#b91c1c' : '#475569';
                    const bgColor = diff > 0 ? '#dcfce7' : diff < 0 ? '#fee2e2' : '#f1f5f9';
                    const arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '→';
                    diffHtml = `<span style="display:inline-flex; align-items:center; font-size:10px; color:${textColor}; background-color:${bgColor}; font-weight:800; margin-left:8px; padding:2px 6px; border-radius:999px; letter-spacing:0.5px;">${arrow} ${sign}${diff.toFixed(1)}</span>`;
                }
            }

            let distSchool = null;
            let distClass = null;
            let labels = [];
            let dataSchool = [];
            let dataClass = [];
            let studentBinIndex = -1;
            
            const scoreNum = Number(rawScore);

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
                    const barGapPx = is18bin ? 6 : 12; // px, 加大 18-bin 的間距
                    const maxBarPx = 50; // 最高柱的像素高度
                    
                    const labelRot = is18bin ? -45 : 0; // 旋轉角度，10-bin不旋轉
                    const labelTransform = is18bin 
                        ? `transform-origin: top right; transform: translate(0, 0) rotate(${labelRot}deg); right: 50%;` 
                        : `transform-origin: center top; transform: translateX(-50%); left: 50%;`;

                    for(let i = 0; i < numBins; i++) {
                        const count = activeData[i] || 0;
                        const pixH = count > 0 ? Math.max(4, Math.round((count / maxCount) * maxBarPx)) : 2;
                        const isMyBin = (i === studentBinIndex);
                        const bgColor = isMyBin
                            ? (chartMode === 'class' ? '#c2516a' : '#4f5dc9')
                            : (count > 0 ? '#d4d4d8' : '#f4f4f5'); // 改用中性灰，避免藍色系混淆
                        const fw = isMyBin ? 'bold' : '400';
                        const numColor = isMyBin ? bgColor : '#a1a1aa'; // 數字也改用中性灰
                        const labelText = labels[i] || '';

                        barsHtml += `<div style="width:${barW}px; flex-shrink:0; display:flex; align-items:flex-end; height:${maxBarPx}px; position:relative;">
                            <div style="width:100%; height:${pixH}px; border-radius:2px 2px 0 0; background-color:${bgColor}; position:relative; transition:height 0.2s;">
                                ${count > 0 ? `<div style="position:absolute; top:-15px; left:50%; transform:translateX(-50%); font-size:7.5px; white-space:nowrap; font-weight:${fw}; color:${numColor};">${count}</div>` : ''}
                            </div>
                        </div>`;

                        labelsHtml += `<div style="width:${barW}px; flex-shrink:0; height:${is18bin ? '28px' : '15px'}; position:relative; overflow:visible;">
                            <div style="position:absolute; top:3px; ${labelTransform} font-size:6.5px; color:#94a3b8; white-space:nowrap;">${labelText}</div>
                        </div>`;
                    }

                    const totalLabel = totalCount > 0 ? `共 ${totalCount} 人` : '';
                    let toggleHtml = '';
                    if (isAvg && chartMode === 'school') {
                        const isInt = schoolAvgSubmode === 'interval';
                        toggleHtml = `
                        <div style="display:flex; justify-content:flex-end; margin-bottom:8px;">
                            <div class="inline-flex bg-white/50 rounded-md p-0.5 border border-gray-200">
                                <button onclick="window.setSchoolSubmode('interval')" class="px-2 py-1 text-[10px] font-bold rounded ${isInt ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-800'}">區間</button>
                                <button onclick="window.setSchoolSubmode('cumulative')" class="px-2 py-1 text-[10px] font-bold rounded ${!isInt ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-800'}">累計</button>
                            </div>
                        </div>`;
                    }
                    chartHtml = `
                        <div style="display:flex; flex-direction:column; gap:0; width:fit-content; margin: 0 auto;">
                            ${toggleHtml}
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
                    <td class="${scoreClass}">
                        <div style="display:flex; flex-direction:row; align-items:center; justify-content:center;">
                            <span>${score}</span>
                            ${diffHtml}
                        </div>
                    </td>
                    <td class="${avgClass}">${displayAvg}</td>
                    <td class="p-3 align-middle text-center">${chartHtml}</td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
        
        // 繪製雷達圖
        renderRadarChart();
    }

    let radarChartInstance = null;

    function renderRadarChart() {
        const canvas = document.getElementById('dashRadarChart');
        if (!canvas) return;

        if (!currentExamData || !currentExamData.scores || !currentExamData.subjectOrder || currentExamData.subjectOrder.length === 0) {
            canvas.classList.add('dev-hidden');
            return;
        }
        
        canvas.classList.remove('dev-hidden');
        const ctx = canvas.getContext('2d');
        if (radarChartInstance) {
            radarChartInstance.destroy();
        }

        const labels = currentExamData.subjectOrder;
        const myScores = labels.map(subj => {
            const s = Number(currentExamData.scores[subj]);
            return isNaN(s) ? 0 : s;
        });
        
        const classAvgs = labels.map(subj => {
            const a = Number(currentExamData.averages?.classAvg?.[subj]);
            return isNaN(a) ? 0 : a;
        });

        radarChartInstance = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: '您的分數',
                        data: myScores,
                        backgroundColor: 'rgba(194, 81, 106, 0.2)', // #c2516a
                        borderColor: 'rgba(194, 81, 106, 1)',
                        pointBackgroundColor: 'rgba(194, 81, 106, 1)',
                        borderWidth: 2,
                        fill: true
                    },
                    {
                        label: '班級平均',
                        data: classAvgs,
                        backgroundColor: 'rgba(156, 163, 175, 0.2)', // gray-400
                        borderColor: 'rgba(156, 163, 175, 1)',
                        pointBackgroundColor: 'rgba(156, 163, 175, 1)',
                        borderWidth: 1,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        min: 0,
                        max: 100,
                        ticks: { stepSize: 20 },
                        pointLabels: {
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
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

    let dashLineChartInstance = null;

    async function renderDashLineChart() {
        const canvas = document.getElementById('dashLineChart');
        if (!canvas) return;

        if (!currentStudent || !currentStudent.availableExams || currentStudent.availableExams.length === 0) return;

        const exams = currentStudent.availableExams;
        
        // 為了確保和雷達圖的分數來源完全一致，我們直接往後端拉取所有的段考成績
        // 若已載入過 currentExamData，可以減少一次 request，但最穩的是全部平行拉取
        const promises = exams.map(examName => {
            return fetch(CONFIG.API_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'getMajorExamData', examName: examName, seatNo: currentStudent.seatNo })
            }).then(res => res.json()).catch(err => null);
        });

        // 在畫面上可以先顯示個 loading
        const ctx = canvas.getContext('2d');
        const loader = document.getElementById('dashLineLoader');
        if(loader) loader.classList.remove('dev-hidden');
        canvas.style.opacity = '0.3';
        
        const results = await Promise.all(promises);
        
        if(loader) loader.classList.add('dev-hidden');
        canvas.style.opacity = '1';

        // 收集所有出現過的科目
        const subjectSet = new Set();
        results.forEach(res => {
            if (res && res.scores) {
                Object.keys(res.scores).forEach(s => {
                    const disp = s === 'personalAverage' ? '總平均' : s;
                    subjectSet.add(disp);
                });
            }
        });

        // 我們只挑選主要科目（可過濾掉沒成績的或用常見的五科+總平均）
        const subjectColors = {
            '國文': '#c2516a',
            '英語': '#5c6bc0',
            '數學': '#0284c7',
            '自然': '#16a34a',
            '社會': '#ca8a04',
            '總平均': '#ea580c'
        };

        const subjects = Array.from(subjectSet).filter(s => s !== '生活計點');
        // 將段考名稱拆解為陣列，讓 Chart.js 將其視為多行文字，呈現「直著寫」的效果
        const labels = exams.map(name => name.split('')); 
        
        const allDatasets = [];
        const fallbackColors = ['#f43f5e', '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#64748b'];
        let colorIdx = 0;

        subjects.forEach(subj => {
            const dataPoints = [];
            let hasValidData = false;
            
            results.forEach(res => {
                const origSubj = subj === '總平均' ? 'personalAverage' : subj;
                if (res && res.scores && res.scores[origSubj] !== undefined && res.scores[origSubj] !== '') {
                    const score = Number(res.scores[origSubj]);
                    if (!isNaN(score)) {
                        dataPoints.push(score);
                        hasValidData = true;
                    } else {
                        dataPoints.push(null);
                    }
                } else {
                    dataPoints.push(null);
                }
            });

            if (hasValidData) {
                const color = subjectColors[subj] || fallbackColors[colorIdx % fallbackColors.length];
                colorIdx++;
                allDatasets.push({
                    label: subj,
                    data: dataPoints,
                    borderColor: color,
                    backgroundColor: color,
                    tension: 0.1,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    spanGaps: true
                });
            }
        });

        const subjectSelector = document.getElementById('dashLineSubjectSelector');
        if (subjectSelector) {
            let optionsHtml = '<option value="all">全部科目</option>';
            allDatasets.forEach(ds => {
                optionsHtml += `<option value="${ds.label}">${ds.label}</option>`;
            });
            subjectSelector.innerHTML = optionsHtml;
            
            // 預設為全部，也可以改為預設第一科
            subjectSelector.onchange = (e) => {
                const val = e.target.value;
                if (dashLineChartInstance) {
                    if (val === 'all') {
                        dashLineChartInstance.data.datasets = allDatasets;
                        dashLineChartInstance.options.plugins.legend.display = true;
                    } else {
                        dashLineChartInstance.data.datasets = allDatasets.filter(d => d.label === val);
                        dashLineChartInstance.options.plugins.legend.display = false;
                    }
                    dashLineChartInstance.update();
                }
            };
        }

        if (dashLineChartInstance) {
            dashLineChartInstance.destroy();
        }

        dashLineChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: allDatasets // 預設顯示全部
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        ticks: {
                            // 稍微縮小字體讓直向文字更緊密
                            font: { size: 10 }
                        }
                    },
                    y: {
                        min: 0,
                        max: 100,
                        title: { display: true, text: '分數' }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 10
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            // 把陣列轉回原始字串，否則 tooltip 會顯示逗號分隔的陣列
                            title: function(tooltipItems) {
                                return tooltipItems[0].label.replace(/,/g, '');
                            }
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
    }

});
