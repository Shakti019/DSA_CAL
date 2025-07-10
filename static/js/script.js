document.addEventListener('DOMContentLoaded', function() {
const input = document.getElementById('expressionInput');
const evalBtn = document.getElementById('evaluateBtn');
const resultSpan = document.getElementById('result');
const stepsPre = document.getElementById('steps');
const historyUl = document.getElementById('history');
const treePre = document.getElementById('tree');
const stepsPanel = document.querySelector('.steps-panel');
const copyBtn = document.getElementById('copyBtn');
const loadingSpinner = document.getElementById('loadingSpinner');
const helpBtn = document.getElementById('helpBtn');
const helpModal = document.getElementById('helpModal');
const closeHelpModal = document.getElementById('closeHelpModal');
const welcomeModal = document.getElementById('welcomeModal');
const closeWelcomeModal = document.getElementById('closeWelcomeModal');
const variablesList = document.getElementById('variablesList');
const varNameInput = document.getElementById('varNameInput');
const varValueInput = document.getElementById('varValueInput');
const addVarBtn = document.getElementById('addVarBtn');
const varAssignMsg = document.getElementById('varAssignMsg');
const varList = document.getElementById('varList');

// Show welcome modal on first visit
if (!localStorage.getItem('hasSeenWelcome')) {
    setTimeout(() => {
        if (welcomeModal) welcomeModal.style.display = 'flex';
        if (closeWelcomeModal) closeWelcomeModal.focus();
    }, 400);
    localStorage.setItem('hasSeenWelcome', '1');
}
if (closeWelcomeModal) {
    closeWelcomeModal.addEventListener('click', () => {
        if (welcomeModal) welcomeModal.style.display = 'none';
    });
}
if (welcomeModal) {
    welcomeModal.addEventListener('click', (e) => {
        if (e.target === welcomeModal) welcomeModal.style.display = 'none';
    });
}
document.addEventListener('keydown', (e) => {
    if (welcomeModal && welcomeModal.style.display === 'flex' && (e.key === 'Escape' || e.key === 'Esc')) {
        welcomeModal.style.display = 'none';
    }
});

// Sidebar navigation logic
const navItems = document.querySelectorAll('.nav-item');
const panels = document.querySelectorAll('.panel');
const panelOrder = Array.from(navItems).map(i => i.getAttribute('data-panel'));

function showPanelByIdx(idx) {
    navItems.forEach((i, j) => {
        if (j === idx) i.classList.add('active');
        else i.classList.remove('active');
    });
    panels.forEach(panel => {
        if (panel.getAttribute('data-panel') === panelOrder[idx]) {
            panel.style.display = '';
        } else {
            panel.style.display = 'none';
        }
    });
}
navItems.forEach((item, idx) => {
    item.addEventListener('click', () => {
        showPanelByIdx(idx);
    });
});
// On page load, show calculator panel
showPanelByIdx(0);

// Swipe gesture for panel navigation (mobile)
let touchStartX = null;
let touchEndX = null;
function getActivePanelIdx() {
    return panelOrder.findIndex(p => document.querySelector(`.panel[data-panel='${p}']`).style.display !== 'none');
}
document.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) touchStartX = e.touches[0].clientX;
});
document.addEventListener('touchend', (e) => {
    if (touchStartX === null) return;
    touchEndX = e.changedTouches[0].clientX;
    const dx = touchEndX - touchStartX;
    if (Math.abs(dx) > 60) {
        const curIdx = getActivePanelIdx();
        if (dx < 0 && curIdx < panelOrder.length - 1) {
            showPanelByIdx(curIdx + 1);
        } else if (dx > 0 && curIdx > 0) {
            showPanelByIdx(curIdx - 1);
        }
    }
    touchStartX = null;
    touchEndX = null;
});

// Load history from localStorage
function loadHistory() {
    const history = JSON.parse(localStorage.getItem('calcHistory') || '[]');
    historyUl.innerHTML = '';
    history.slice(-20).reverse().forEach(item => {
        const li = document.createElement('li');
        li.textContent = `${item.expr} = ${item.result}`;
        historyUl.appendChild(li);
    });
}

// Save to history
function saveHistory(expr, result) {
    let history = JSON.parse(localStorage.getItem('calcHistory') || '[]');
    history.push({ expr, result });
    if (history.length > 20) history = history.slice(-20);
    localStorage.setItem('calcHistory', JSON.stringify(history));
}

// Render tree as SVG for a true expression tree look
function renderTreeSVG(node) {
    if (!node) return '';
    // First, traverse the tree to assign x/y positions
    let nodes = [], links = [];
    let maxDepth = 0;
    function traverse(n, depth, x) {
        if (!n) return 0;
        maxDepth = Math.max(maxDepth, depth);
        let leftWidth = traverse(n.left, depth + 1, x);
        let rightWidth = traverse(n.right, depth + 1, x + leftWidth + 1);
        let width = Math.max(1, leftWidth + rightWidth);
        let nodeX = x + (width - 1) / 2;
        nodes.push({ value: n.value, x: nodeX, y: depth, id: nodes.length });
        if (n.left) links.push({ from: nodes.length - 1, to: nodes.length });
        if (n.right) links.push({ from: nodes.length - 1, to: nodes.length + (n.left ? leftWidth : 0) });
        return width;
    }
    traverse(node, 0, 0);
    // Responsive layout constants
    let xGap = 60, yGap = 70, nodeRadius = 22;
    if (window.innerWidth < 700) {
        xGap = 36;
        yGap = 48;
        nodeRadius = 14;
    }
    // Dynamically set svgWidth based on container or window width
    const maxSvgWidth = Math.max(320, nodes.length * xGap);
    const svgWidth = Math.min(maxSvgWidth, window.innerWidth - 32);
    const svgHeight = (maxDepth + 1) * yGap + 40;
    function getCoords(n) {
        if (!n) return { cx: 0, cy: 0 };
        return {
            cx: 24 + n.x * xGap,
            cy: 32 + n.y * yGap
        };
    }
    let svgLinks = links.map(link => {
        const from = getCoords(nodes[link.from]);
        const to = getCoords(nodes[link.to]);
        return `<line x1='${from.cx}' y1='${from.cy}' x2='${to.cx}' y2='${to.cy}' stroke='#2563eb' stroke-width='2'/>`;
    }).join('');
    let svgNodes = nodes.map((n, i) => {
        const { cx, cy } = getCoords(n);
        return `<g><circle cx='${cx}' cy='${cy}' r='${nodeRadius}' fill='#2563eb' stroke='#fff' stroke-width='2'/><text x='${cx}' y='${cy + 5}' text-anchor='middle' font-size='${nodeRadius + 2}' fill='#fff' font-family='Segoe UI, Arial'>${n.value}</text></g>`;
    }).join('');
    return `<svg width='${svgWidth}' height='${svgHeight}' style='min-width:320px;max-width:100%;display:block;margin:auto;'>${svgLinks}${svgNodes}</svg>`;
}

// Color coding for steps
function colorizeStep(step) {
    // Only colorize the token and stack parts, not the whole line repeatedly
    // Example input: "Token: 2 | Stack: [2.0, 3.0]"
    let match = step.match(/^Token: ([^ ]+) \| Stack: (.+)$/);
    if (!match) return step; // fallback to plain
    let token = match[1];
    let stack = match[2];

    // Colorize token
    let tokenHtml = token;
    if (/^[+\-*/^]$/.test(token)) tokenHtml = `<span class="op">${token}</span>`;
    else if (/^(sin|cos|tan|log|sqrt|exp|abs|asin|acos|atan)$/.test(token)) tokenHtml = `<span class="func">${token}</span>`;
    else if (/^(pi|e|[0-9.]+)$/.test(token)) tokenHtml = `<span class="num">${token}</span>`;

    // Colorize stack numbers
    let stackHtml = stack.replace(/([0-9.]+)/g, '<span class="num">$1</span>');

    return `Token: ${tokenHtml} | Stack: ${stackHtml}`;
}

// Color coding for result
function colorizeResult(res) {
    if (res === 'Error') return `<span class='error'>${res}</span>`;
    return `<span class='num'>${res}</span>`;
}

evalBtn.addEventListener('click', evaluateInput);
input.addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === 'Enter') {
        evaluateInput();
    }
});

if (copyBtn) {
    copyBtn.addEventListener('click', () => {
        const text = resultSpan.textContent;
        if (!text) return;
        navigator.clipboard.writeText(text);
        copyBtn.classList.add('copied');
        copyBtn.title = 'Copied!';
        setTimeout(() => {
            copyBtn.classList.remove('copied');
            copyBtn.title = 'Copy Result';
        }, 1200);
    });
}

function showSpinner() {
    if (loadingSpinner) loadingSpinner.style.display = 'flex';
}
function hideSpinner() {
    if (loadingSpinner) loadingSpinner.style.display = 'none';
}

// Animate step-by-step panel with KaTeX rendering
let stepIdx = 0;
let stepTimer = null;
let stepsArr = [];
const playBtn = document.createElement('button');
const nextBtn = document.createElement('button');
const prevBtn = document.createElement('button');
playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
nextBtn.innerHTML = '<i class="fa-solid fa-forward"></i>';
prevBtn.innerHTML = '<i class="fa-solid fa-backward"></i>';
playBtn.className = nextBtn.className = prevBtn.className = 'mx-1 px-2 py-1 rounded bg-orange-100 hover:bg-orange-200 text-orange-600 transition';
let isPlaying = false;

function renderStep(idx) {
    if (!stepsArr.length) { if (stepsPre) stepsPre.innerHTML = ''; return; }
    let html = '';
    for (let i = 0; i <= idx && i < stepsArr.length; ++i) {
        html += `<div class='step-line' id='step-${i}'></div>`;
    }
    if (stepsPre) stepsPre.innerHTML = html;
    for (let i = 0; i <= idx && i < stepsArr.length; ++i) {
        const stepEl = document.getElementById(`step-${i}`);
        if (stepEl) {
            try { katex.render(stepsArr[i], stepEl, { throwOnError: false }); }
            catch { stepEl.textContent = stepsArr[i]; }
        }
    }
}

function playSteps() {
    if (isPlaying) return;
    isPlaying = true;
    playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    stepTimer = setInterval(() => {
        if (stepIdx < stepsArr.length - 1) {
            stepIdx++;
            renderStep(stepIdx);
        } else {
            pauseSteps();
        }
    }, 900);
}
function pauseSteps() {
    isPlaying = false;
    playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    if (stepTimer) clearInterval(stepTimer);
}
playBtn.onclick = () => { isPlaying ? pauseSteps() : playSteps(); };
nextBtn.onclick = () => { pauseSteps(); if (stepIdx < stepsArr.length - 1) { stepIdx++; renderStep(stepIdx); } };
prevBtn.onclick = () => { pauseSteps(); if (stepIdx > 0) { stepIdx--; renderStep(stepIdx); } };

// Insert controls above stepsPre
if (stepsPre && stepsPre.parentNode) {
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'flex items-center mb-2';
    controlsDiv.appendChild(prevBtn);
    controlsDiv.appendChild(playBtn);
    controlsDiv.appendChild(nextBtn);
    stepsPre.parentNode.insertBefore(controlsDiv, stepsPre);
}

function showAnimatedSteps(steps) {
    stepsArr = steps;
    stepIdx = 0;
    renderStep(stepIdx);
    pauseSteps();
}

function fetchAndRenderVariables() {
    if (!variablesList) return;
    fetch('/variables')
        .then(res => res.json())
        .then(vars => {
            variablesList.innerHTML = '';
            const keys = Object.keys(vars);
            if (keys.length === 0) {
                variablesList.innerHTML = '<li class="text-slate-400 px-4 py-2">No variables defined.</li>';
                return;
            }
            keys.forEach(key => {
                const li = document.createElement('li');
                li.className = 'flex justify-between items-center px-4 py-2';
                li.innerHTML = `<span class='font-mono text-blue-700'>${key}</span> <span class='font-mono text-slate-800'>${vars[key]}</span>`;
                variablesList.appendChild(li);
            });
        });
}

// Fetch variables when variables panel is shown
const navItemsArr = Array.from(document.querySelectorAll('.nav-item'));
const panelsArr = Array.from(document.querySelectorAll('.panel'));
navItemsArr.forEach((item, idx) => {
    item.addEventListener('click', () => {
        if (panelsArr[idx].getAttribute('data-panel') === 'variables') {
            fetchAndRenderVariables();
        }
    });
});

// Update evaluateInput to use showAnimatedSteps and KaTeX for result
function evaluateInput() {
    const expr = input.value.trim();
    if (!expr) return;
    showSpinner();
    fetch('/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expression: expr })
    })
    .then(res => res.json())
    .then(data => {
        // Render result and steps first, always
        if (data.result === 'Error') {
            resultSpan.textContent = 'Error';
            resultSpan.className = 'min-w-[120px] text-center text-xl font-bold rounded-lg px-6 py-3 border-2 border-red-500 bg-red-50 text-red-700 shadow transition-all';
        } else if (data.result !== undefined && data.result !== null) {
            resultSpan.textContent = String(data.result);
            resultSpan.className = 'min-w-[120px] text-center text-xl font-bold rounded-lg px-6 py-3 border-2 border-blue-500 bg-blue-50 text-blue-700 shadow transition-all';
        } else {
            resultSpan.textContent = '';
            resultSpan.className = 'min-w-[120px] text-center text-xl font-bold rounded-lg px-6 py-3 border-2 border-blue-500 bg-blue-50 text-blue-700 shadow transition-all';
        }
        if (data.steps && data.steps.length) {
            showAnimatedSteps(data.steps);
        } else {
            stepsPre.innerHTML = '';
        }
        saveHistory(expr, data.result);
        loadHistory();

        // Render tree, but catch errors so result is never overwritten
        try {
            if (data.tree) {
                treePre.innerHTML = renderTreeSVG(data.tree);
            } else {
                treePre.innerHTML = '';
            }
        } catch (treeErr) {
            console.log('TREE RENDER ERROR:', treeErr);
            treePre.innerHTML = '<div style="color:red">Tree render error</div>';
        }
        if (data.assignment) {
            fetchAndRenderVariables();
        }
        hideSpinner();
    })
    .catch((err) => {
        console.log('EVALUATE CATCH ERROR:', err);
        resultSpan.textContent = 'Error';
        resultSpan.className = 'min-w-[120px] text-center text-xl font-bold rounded-lg px-6 py-3 border-2 border-red-500 bg-red-50 text-red-700 shadow transition-all';
        stepsPre.innerHTML = '';
        treePre.innerHTML = '';
        hideSpinner();
    });
}

// Theme toggle
function setTheme(dark) {
    document.body.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
}
// On load, set theme
setTheme(localStorage.getItem('theme') === 'dark');

// Load history on page load
loadHistory();

// Chart.js loader
function loadChartJs(callback) {
    if (window.Chart) return callback();
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    script.onload = callback;
    document.head.appendChild(script);
}

const graphInput = document.getElementById('graphInput');
const plotBtn = document.getElementById('plotBtn');
const graphCanvas = document.getElementById('graphCanvas');
let chartInstance = null;

// Parse and evaluate function string for x
function safeEval(expr, x) {
    // Replace ^ with **, sin/cos/tan/log/sqrt with Math. equivalents
    let jsExpr = expr.replace(/\^/g, '**')
        .replace(/sin\(/g, 'Math.sin(')
        .replace(/cos\(/g, 'Math.cos(')
        .replace(/tan\(/g, 'Math.tan(')
        .replace(/log\(/g, 'Math.log(')
        .replace(/sqrt\(/g, 'Math.sqrt(')
        .replace(/pi/g, 'Math.PI')
        .replace(/e/g, 'Math.E');
    try {
        // eslint-disable-next-line no-eval
        return eval(jsExpr);
    } catch {
        return NaN;
    }
}

function normalizeMathSpeech(text) {
    return text
        .replace(/\b(x|times)\b/gi, '*')
        .replace(/\b(divided by|over)\b/gi, '/')
        .replace(/\b(plus)\b/gi, '+')
        .replace(/\b(minus)\b/gi, '-')
        .replace(/\b(to the power of|power)\b/gi, '^')
        .replace(/÷/g, '/')
        .replace(/×/g, '*');
}

// Enhanced Graphing logic
const graphFunctions = document.getElementById('graphFunctions');
const zoomInBtn = document.getElementById('zoomInBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const panLeftBtn = document.getElementById('panLeftBtn');
const panRightBtn = document.getElementById('panRightBtn');
const panUpBtn = document.getElementById('panUpBtn');
const panDownBtn = document.getElementById('panDownBtn');
const graphLegend = document.getElementById('graphLegend');

let graphXMin = -10, graphXMax = 10, graphYMin = -10, graphYMax = 10;
const graphColors = ['#ff8800', '#2563eb', '#059669', '#e11d48', '#9333ea', '#f59e42', '#14b8a6', '#64748b'];

function parseFunctionLine(line) {
    // Support y=..., y<..., y>..., or just f(x)
    line = line.trim();
    if (!line) return null;
    let isInequality = false, op = null;
    if (line.includes('>=')) { op = '>='; isInequality = true; }
    else if (line.includes('<=')) { op = '<='; isInequality = true; }
    else if (line.includes('>')) { op = '>'; isInequality = true; }
    else if (line.includes('<')) { op = '<'; isInequality = true; }
    else if (line.includes('=')) { op = '='; }
    let expr = line;
    if (op) {
        const parts = line.split(op);
        if (parts.length === 2) {
            expr = parts[1];
        }
    }
    return { expr, isInequality, op, raw: line };
}

function safeEvalGraph(expr, x) {
    let jsExpr = expr.replace(/\^/g, '**')
        .replace(/sin\(/g, 'Math.sin(')
        .replace(/cos\(/g, 'Math.cos(')
        .replace(/tan\(/g, 'Math.tan(')
        .replace(/log\(/g, 'Math.log(')
        .replace(/sqrt\(/g, 'Math.sqrt(')
        .replace(/pi/g, 'Math.PI')
        .replace(/e/g, 'Math.E');
    try {
        // eslint-disable-next-line no-eval
        return eval(jsExpr);
    } catch {
        return NaN;
    }
}

function plotGraph() {
    const lines = (graphFunctions.value || '').split('\n').map(l => l.trim()).filter(l => l);
    if (!lines.length) return;
    loadChartJs(() => {
        const xs = [];
        for (let i = 0; i <= 200; i++) {
            xs.push(graphXMin + (graphXMax - graphXMin) * i / 200);
        }
        const datasets = [];
        graphLegend.innerHTML = '';
        lines.forEach((line, idx) => {
            const parsed = parseFunctionLine(line);
            if (!parsed) return;
            const color = graphColors[idx % graphColors.length];
            if (parsed.isInequality) {
                // Plot as shaded region
                const ys = xs.map(x => safeEvalGraph(parsed.expr, x));
                const base = parsed.op.includes('>') ? graphYMin : graphYMax;
                const fill = parsed.op.includes('>') ? '+1' : '-1';
                datasets.push({
                    label: line,
                    data: ys.map((y, i) => {
                        if (isNaN(y)) return null;
                        if (parsed.op === '>' || parsed.op === '>=') return y;
                        if (parsed.op === '<' || parsed.op === '<=') return y;
                        return null;
                    }),
                    borderColor: color,
                    backgroundColor: color + '33',
                    fill: {
                        target: parsed.op.includes('>') ? 'start' : 'end',
                        above: color + '33',
                        below: 'rgba(0,0,0,0)'
                    },
                    pointRadius: 0,
                    borderWidth: 2,
                    stepped: false,
                    showLine: true,
                });
            } else {
                // Regular function
                const ys = xs.map(x => safeEvalGraph(parsed.expr, x));
                datasets.push({
                    label: line,
                    data: ys,
                    borderColor: color,
                    backgroundColor: color + '33',
                    pointRadius: 0,
                    borderWidth: 2,
                    showLine: true,
                });
            }
            // Add to legend
            const legendItem = document.createElement('span');
            legendItem.innerHTML = `<span style="display:inline-block;width:18px;height:3px;background:${color};margin-right:6px;vertical-align:middle;"></span>${line}`;
            graphLegend.appendChild(legendItem);
        });
        if (window.chartInstance) window.chartInstance.destroy();
        window.chartInstance = new Chart(graphCanvas.getContext('2d'), {
            type: 'line',
            data: { labels: xs, datasets },
            options: {
                responsive: false,
                animation: false,
                scales: {
                    x: { min: graphXMin, max: graphXMax, title: { display: true, text: 'x' } },
                    y: { min: graphYMin, max: graphYMax, title: { display: true, text: 'y' } }
                },
                plugins: { legend: { display: false } }
            }
        });
    });
}

if (plotBtn) {
    plotBtn.addEventListener('click', plotGraph);
}
if (zoomInBtn) zoomInBtn.addEventListener('click', () => {
    graphXMin /= 1.2; graphXMax /= 1.2; graphYMin /= 1.2; graphYMax /= 1.2; plotGraph();
});
if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => {
    graphXMin *= 1.2; graphXMax *= 1.2; graphYMin *= 1.2; graphYMax *= 1.2; plotGraph();
});
if (panLeftBtn) panLeftBtn.addEventListener('click', () => {
    const dx = (graphXMax - graphXMin) * 0.1;
    graphXMin -= dx; graphXMax -= dx; plotGraph();
});
if (panRightBtn) panRightBtn.addEventListener('click', () => {
    const dx = (graphXMax - graphXMin) * 0.1;
    graphXMin += dx; graphXMax += dx; plotGraph();
});
if (panUpBtn) panUpBtn.addEventListener('click', () => {
    const dy = (graphYMax - graphYMin) * 0.1;
    graphYMin += dy; graphYMax += dy; plotGraph();
});
if (panDownBtn) panDownBtn.addEventListener('click', () => {
    const dy = (graphYMax - graphYMin) * 0.1;
    graphYMin -= dy; graphYMax -= dy; plotGraph();
});

if (helpBtn) {
    helpBtn.addEventListener('click', () => {
        if (helpModal) {
            helpModal.style.display = 'flex';
            if (closeHelpModal) closeHelpModal.focus();
        }
    });
}
if (closeHelpModal) {
    closeHelpModal.addEventListener('click', () => {
        if (helpModal) helpModal.style.display = 'none';
    });
}
if (helpModal) {
    helpModal.addEventListener('click', (e) => {
        if (e.target === helpModal) helpModal.style.display = 'none';
    });
}
document.addEventListener('keydown', (e) => {
    if (helpModal && helpModal.style.display === 'flex' && (e.key === 'Escape' || e.key === 'Esc')) {
        helpModal.style.display = 'none';
    }
});

// THEME PICKER
const themePicker = document.getElementById('themePicker');
const themeMap = {
    orange: {
        '--theme-primary': '#ff8800',
        '--theme-bg': '#fff',
        '--theme-text': '#222',
    },
    blue: {
        '--theme-primary': '#2563eb',
        '--theme-bg': '#f0f6ff',
        '--theme-text': '#1e293b',
    },
    green: {
        '--theme-primary': '#059669',
        '--theme-bg': '#f0fdf4',
        '--theme-text': '#14532d',
    },
    dark: {
        '--theme-primary': '#ff8800',
        '--theme-bg': '#181818',
        '--theme-text': '#fff',
    }
};
function setThemeVars(theme) {
    const vars = themeMap[theme] || themeMap.orange;
    for (const k in vars) {
        document.documentElement.style.setProperty(k, vars[k]);
    }
    localStorage.setItem('themeColor', theme);
}
if (themePicker) {
    themePicker.value = localStorage.getItem('themeColor') || 'orange';
    setThemeVars(themePicker.value);
    themePicker.addEventListener('change', e => {
        setThemeVars(e.target.value);
    });
}
// FAB MENU
const fab = document.getElementById('fab');
const fabMenu = document.getElementById('fabMenu');
if (fab && fabMenu) {
    fab.addEventListener('click', (e) => {
        e.stopPropagation();
        fabMenu.classList.toggle('hidden');
    });
    document.addEventListener('click', (e) => {
        if (!fabMenu.contains(e.target) && e.target !== fab) {
            fabMenu.classList.add('hidden');
        }
    });
}
// FAB Actions (stubs)
const voiceBtn = document.getElementById('voiceBtn');
const exportPdfBtn = document.getElementById('exportPdfBtn');
const aiExplainBtn = document.getElementById('aiExplainBtn');
const formulaBankBtn = document.getElementById('formulaBankBtn');
if (voiceBtn) voiceBtn.addEventListener('click', () => {
    // Optionally show a toast or inline message here
    // e.g., showToast('Voice input coming soon!');
});
if (exportPdfBtn) exportPdfBtn.addEventListener('click', () => {
    // Optionally show a toast or inline message here
    // e.g., showToast('Export to PDF coming soon!');
});
if (aiExplainBtn) aiExplainBtn.addEventListener('click', () => {
    // Optionally show a toast or inline message here
    // e.g., showToast('AI Explanation coming soon!');
});
if (formulaBankBtn) formulaBankBtn.addEventListener('click', () => {
    // Optionally show a toast or inline message here
    // e.g., showToast('Formula Bank coming soon!');
});

// FORMULA BANK MODAL
const formulaBankModal = document.getElementById('formulaBankModal');
const closeFormulaBank = document.getElementById('closeFormulaBank');
if (formulaBankBtn && formulaBankModal) {
    formulaBankBtn.addEventListener('click', () => {
        formulaBankModal.style.display = 'flex';
    });
}
if (closeFormulaBank && formulaBankModal) {
    closeFormulaBank.addEventListener('click', () => {
        formulaBankModal.style.display = 'none';
    });
}
if (formulaBankModal) {
    formulaBankModal.addEventListener('click', (e) => {
        if (e.target === formulaBankModal) formulaBankModal.style.display = 'none';
    });
}
document.addEventListener('keydown', (e) => {
    if (formulaBankModal && formulaBankModal.style.display === 'flex' && (e.key === 'Escape' || e.key === 'Esc')) {
        formulaBankModal.style.display = 'none';
    }
});
// Insert formula on click
const formulaBtns = document.querySelectorAll('.formula-btn');
formulaBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        input.value = btn.getAttribute('data-formula');
        formulaBankModal.style.display = 'none';
        input.dispatchEvent(new Event('input'));
        input.focus();
    });
});
// VOICE INPUT
if (voiceBtn) voiceBtn.addEventListener('click', () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert('Voice input not supported in this browser.');
        return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        input.value = normalizeMathSpeech(transcript);
        input.dispatchEvent(new Event('input'));
        input.focus();
    };
    recognition.onerror = (event) => {
        alert('Voice input error: ' + event.error);
    };
    recognition.start();
});
// EXPORT TO PDF
if (exportPdfBtn) exportPdfBtn.addEventListener('click', () => {
    if (typeof window.jspdf === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = exportToPdf;
        document.head.appendChild(script);
    } else {
        exportToPdf();
    }
});
function exportToPdf() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('DSA-Powered Smart Calculator', 10, 15);
    doc.setFontSize(12);
    doc.text('Expression:', 10, 30);
    doc.text(input.value, 30, 30);
    doc.text('Result:', 10, 40);
    doc.text(String(resultSpan.textContent), 30, 40);
    doc.text('Steps:', 10, 50);
    let y = 60;
    // Filter out any step that is just the result value (with or without decimals)
    const resultVal = String(resultSpan.textContent).trim();
    stepsArr.forEach(step => {
        // Remove steps that are just the result (with or without decimals)
        if (String(step).trim() === resultVal || String(step).replace(/\.?0+$/, '') === resultVal.replace(/\.?0+$/, '')) {
            return;
        }
        doc.text(step, 15, y);
        y += 8;
        if (y > 270) {
            doc.addPage();
            y = 20;
        }
    });
    doc.save('calculation.pdf');
}

function showVarMsg(msg, isError = true) {
    if (!varAssignMsg) return;
    varAssignMsg.textContent = msg;
    varAssignMsg.style.display = msg ? '' : 'none';
    varAssignMsg.className = isError ? 'text-sm text-red-500 mt-1' : 'text-sm text-green-600 mt-1';
}

function refreshVarList() {
    fetch('/variables')
        .then(res => res.json())
        .then(vars => {
            varList.innerHTML = '';
            const keys = Object.keys(vars);
            if (keys.length === 0) {
                varList.innerHTML = '<li class="text-slate-400 px-4 py-2">No variables defined.</li>';
                return;
            }
            keys.forEach(key => {
                const li = document.createElement('li');
                li.className = 'flex justify-between items-center px-4 py-2';
                li.innerHTML = `<span class='font-mono text-blue-700'>${key}</span> <span class='font-mono text-slate-800'>${vars[key]}</span> <button class='editVarBtn text-xs text-blue-600 hover:underline mr-2' data-key='${key}'>Edit</button> <button class='delVarBtn text-xs text-red-500 hover:underline' data-key='${key}'>Delete</button>`;
                varList.appendChild(li);
            });
            // Add event listeners for edit/delete
            varList.querySelectorAll('.editVarBtn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const k = btn.getAttribute('data-key');
                    varNameInput.value = k;
                    // Try to get the original expression if possible, else just show value
                    varValueInput.value = vars[k];
                    varNameInput.focus();
                });
            });
            varList.querySelectorAll('.delVarBtn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const k = btn.getAttribute('data-key');
                    fetch('/delete_variable', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: k })
                    })
                    .then(res => res.json())
                    .then(data => {
                        if (data.success) {
                            showVarMsg('Variable deleted.', false);
                            refreshVarList();
                            fetchAndRenderVariables();
                        } else {
                            showVarMsg(data.error || 'Delete failed.');
                        }
                    });
                });
            });
        });
}

if (addVarBtn) {
    addVarBtn.addEventListener('click', () => {
        const name = (varNameInput.value || '').trim();
        const value = (varValueInput.value || '').trim();
        if (!/^[a-zA-Z]$/.test(name)) {
            showVarMsg('Variable name must be a single letter.');
            return;
        }
        if (!value) {
            showVarMsg('Please enter a value or expression.');
            return;
        }
        // Send to backend for assignment
        fetch('/set_variable', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, value })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                showVarMsg('Variable set!', false);
                varNameInput.value = '';
                varValueInput.value = '';
                refreshVarList();
                fetchAndRenderVariables();
            } else {
                showVarMsg(data.error || 'Assignment failed.');
            }
        });
    });
}

// Refresh variable list on load
refreshVarList();

// Matrix Calculator logic
const matrixARows = document.getElementById('matrixARows');
const matrixACols = document.getElementById('matrixACols');
const matrixBRows = document.getElementById('matrixBRows');
const matrixBCols = document.getElementById('matrixBCols');
const matrixAInputs = document.getElementById('matrixAInputs');
const matrixBInputs = document.getElementById('matrixBInputs');
const matrixOp = document.getElementById('matrixOp');
const matrixCalcBtn = document.getElementById('matrixCalcBtn');
const matrixResult = document.getElementById('matrixResult');

function renderMatrixInputs(container, rows, cols, prefix) {
    container.innerHTML = '';
    const table = document.createElement('table');
    table.className = 'border-collapse';
    for (let r = 0; r < rows; r++) {
        const tr = document.createElement('tr');
        for (let c = 0; c < cols; c++) {
            const td = document.createElement('td');
            const inp = document.createElement('input');
            inp.type = 'number';
            inp.className = 'w-14 border rounded px-2 py-1 text-center m-1';
            inp.id = `${prefix}_${r}_${c}`;
            inp.value = '0';
            td.appendChild(inp);
            tr.appendChild(td);
        }
        table.appendChild(tr);
    }
    container.appendChild(table);
}

function getMatrixValues(rows, cols, prefix) {
    const mat = [];
    for (let r = 0; r < rows; r++) {
        const row = [];
        for (let c = 0; c < cols; c++) {
            const inp = document.getElementById(`${prefix}_${r}_${c}`);
            row.push(Number(inp.value) || 0);
        }
        mat.push(row);
    }
    return mat;
}

function showMatrixResult(res) {
    if (Array.isArray(res)) {
        // Matrix result
        let html = '<table class="border-collapse">';
        for (const row of res) {
            html += '<tr>' + row.map(x => `<td class='border px-3 py-1'>${x}</td>`).join('') + '</tr>';
        }
        html += '</table>';
        matrixResult.innerHTML = html;
    } else {
        // Scalar result
        matrixResult.textContent = res;
    }
}

function updateMatrixInputs() {
    renderMatrixInputs(matrixAInputs, Number(matrixARows.value), Number(matrixACols.value), 'A');
    renderMatrixInputs(matrixBInputs, Number(matrixBRows.value), Number(matrixBCols.value), 'B');
}

if (matrixARows && matrixACols) {
    matrixARows.addEventListener('change', updateMatrixInputs);
    matrixACols.addEventListener('change', updateMatrixInputs);
}
if (matrixBRows && matrixBCols) {
    matrixBRows.addEventListener('change', updateMatrixInputs);
    matrixBCols.addEventListener('change', updateMatrixInputs);
}
// Initial render
updateMatrixInputs();

if (matrixCalcBtn) {
    matrixCalcBtn.addEventListener('click', () => {
        const op = matrixOp.value;
        const aRows = Number(matrixARows.value), aCols = Number(matrixACols.value);
        const bRows = Number(matrixBRows.value), bCols = Number(matrixBCols.value);
        const A = getMatrixValues(aRows, aCols, 'A');
        const B = getMatrixValues(bRows, bCols, 'B');
        matrixResult.textContent = '...';
        fetch('/matrix', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ op, A, B })
        })
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                matrixResult.textContent = data.error;
            } else {
                showMatrixResult(data.result);
            }
        })
        .catch(() => {
            matrixResult.textContent = 'Error';
        });
    });
}

// Complex Number Calculator logic
const complex1 = document.getElementById('complex1');
const complex2 = document.getElementById('complex2');
const complexOp = document.getElementById('complexOp');
const complexCalcBtn = document.getElementById('complexCalcBtn');
const complexResult = document.getElementById('complexResult');

function showComplexResult(res) {
    if (typeof res === 'object' && 're' in res && 'im' in res) {
        // Display as a+bi
        let re = res.re, im = res.im;
        let str = '';
        if (Math.abs(re) > 1e-10) str += re;
        if (Math.abs(im) > 1e-10) {
            if (im > 0 && str) str += '+';
            if (Math.abs(im - 1) < 1e-10) str += 'i';
            else if (Math.abs(im + 1) < 1e-10) str += '-i';
            else str += im + 'i';
        }
        if (!str) str = '0';
        complexResult.textContent = str;
    } else {
        complexResult.textContent = res;
    }
}

if (complexCalcBtn) {
    complexCalcBtn.addEventListener('click', () => {
        const z1 = (complex1.value || '').trim();
        const z2 = (complex2.value || '').trim();
        const op = complexOp.value;
        complexResult.textContent = '...';
        fetch('/complex', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ z1, z2, op })
        })
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                complexResult.textContent = data.error;
            } else {
                showComplexResult(data.result);
            }
        })
        .catch(() => {
            complexResult.textContent = 'Error';
        });
    });
}

// Equation Solver logic
const equationInput = document.getElementById('equationInput');
const equationVar = document.getElementById('equationVar');
const equationSolveBtn = document.getElementById('equationSolveBtn');
const equationResult = document.getElementById('equationResult');
const equationSteps = document.getElementById('equationSteps');

if (equationSolveBtn) {
    equationSolveBtn.addEventListener('click', () => {
        const eqn = (equationInput.value || '').trim();
        const variable = (equationVar.value || '').trim();
        equationResult.textContent = '...';
        equationSteps.textContent = '';
        fetch('/equation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eqn, variable })
        })
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                equationResult.textContent = data.error;
            } else {
                equationResult.textContent = data.result;
                if (data.steps && data.steps.length) {
                    equationSteps.innerHTML = data.steps.map(s => `<div>${s}</div>`).join('');
                }
            }
        })
        .catch(() => {
            equationResult.textContent = 'Error';
        });
    });
}
});
