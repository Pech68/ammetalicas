// CONFIGURACIÓN LOCAL
const DB_KEY = 'AM_METALICAS_DB';
const QUOTES_KEY = 'AM_METALICAS_QUOTES';
const FINANCE_KEY = 'AM_METALICAS_FINANCE';
const AUTH_KEY = 'AM_METALICAS_AUTH';

// CREDENCIALES
const ADMIN_USER = 'millerbaquero@ammetalicas.com';
const ADMIN_PASS = 'Miller2026/*';

// ESTADO GLOBAL
let projects = [];
let quotes = [];
let finance = [];
let currentProjectId = null;
let currentQuoteId = null;
let quoteItems = [];
let cashflowChart = null;
let expensesChart = null;
let homeSearchTerm = ''; // Estado para el buscador
let projectFilter = 'all'; // Estado para el filtro de proyectos (all, active, completed)

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setTimeout(() => { if(window.lucide) lucide.createIcons(); }, 100);
    
    const dateInput = document.getElementById('q-date');
    if(dateInput) dateInput.valueAsDate = new Date();
    
    initMoneyInputs();

    if (!window.history.state) {
        window.history.replaceState({view: 'home'}, '', '');
    }
    
    checkAuth();
    if (localStorage.getItem(AUTH_KEY) === 'true') {
        renderHome();
        _internalShowView('home');
    }

    document.addEventListener('click', (e) => {
        const menu = document.getElementById('backup-menu');
        const btn = document.getElementById('btn-menu-toggle');
        if (menu && !menu.classList.contains('hidden')) {
            if (!menu.contains(e.target) && (!btn || !btn.contains(e.target))) {
                menu.classList.add('hidden');
            }
        }
    });
});

// --- SISTEMA DE DATOS ---
function loadData() {
    try {
        projects = JSON.parse(localStorage.getItem(DB_KEY) || '[]');
        quotes = JSON.parse(localStorage.getItem(QUOTES_KEY) || '[]');
        finance = JSON.parse(localStorage.getItem(FINANCE_KEY) || '[]');
    } catch (e) {
        console.error("Error cargando datos", e);
        projects = []; quotes = []; finance = [];
    }
}

function saveData() {
    localStorage.setItem(DB_KEY, JSON.stringify(projects));
    renderHome();
    if (currentProjectId) _renderProjectDetails(currentProjectId);
}

function saveQuotesData() {
    localStorage.setItem(QUOTES_KEY, JSON.stringify(quotes));
    renderQuotesList();
}

function saveFinanceData() {
    localStorage.setItem(FINANCE_KEY, JSON.stringify(finance));
    renderFinanceView();
    renderHome();
}

// --- NAVEGACIÓN ---
window.addEventListener('popstate', (event) => {
    const state = event.state;
    if (state) {
        if (state.view === 'home') _internalShowView('home');
        else if (state.view === 'project') { if(projects.length===0) loadData(); openProject(state.id, false); }
        else if (state.view === 'new') _internalShowView('new');
        else if (state.view === 'quote-builder') loadQuoteBuilder(state.id);
        else if (state.view === 'quotes-list') _internalShowView('quotes-list');
        else if (state.view === 'finance') renderFinanceView();
        else if (state.view === 'reports') renderReports();
        
        closeFinanceModal();
        closeModal();
        closePreviewModal();
        document.getElementById('backup-menu')?.classList.add('hidden');
    } else {
        _internalShowView('home');
    }
});

function navigateTo(viewId, params = {}) {
    let state = { view: viewId, ...params };
    window.history.pushState(state, '', '');
    
    if (viewId === 'home') { currentProjectId = null; renderHome(); _internalShowView('home'); }
    else if (viewId === 'new') { renderQuoteSelector(); _internalShowView('new'); }
    else if (viewId === 'quote-builder') { loadQuoteBuilder(params.id || null); }
    else if (viewId === 'quotes-list') { renderQuotesList(); _internalShowView('quotes-list'); }
    else if (viewId === 'finance') { renderFinanceView(); _internalShowView('finance'); }
    else if (viewId === 'reports') { renderReports(); _internalShowView('reports'); }

    document.getElementById('backup-menu')?.classList.add('hidden');
}

function goBack() { 
    if(window.history.length > 1) {
        window.history.back(); 
    } else {
        navigateTo('home');
    }
}

function _internalShowView(viewId) {
    const views = ['view-home', 'view-project', 'view-new', 'view-quote-builder', 'view-quotes-list', 'view-finance', 'view-reports'];
    views.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.classList.add('hidden');
    });
    
    const target = document.getElementById(`view-${viewId}`);
    if(target) target.classList.remove('hidden');
    
    const isHome = viewId === 'home';
    const isProject = viewId === 'project';
    
    const fabHome = document.getElementById('fab-home');
    if(fabHome) {
        fabHome.style.display = isHome ? 'flex' : 'none';
        fabHome.classList.toggle('hidden', !isHome);
    }

    const fabMenu = document.getElementById('fab-menu');
    if(fabMenu) fabMenu.classList.toggle('hidden', !isProject);
    
    if(!isProject) document.getElementById('app-content').scrollTop = 0;
    if(window.lucide) lucide.createIcons();
}

// --- LÓGICA FINANZAS PERSONALES ---
function renderFinanceView() {
    _internalShowView('finance');
    const list = document.getElementById('finance-list');
    list.innerHTML = '';
    
    const totalIncome = finance.filter(f => f.type === 'income').reduce((s,f) => s + f.amount, 0);
    const totalExpense = finance.filter(f => f.type === 'expense').reduce((s,f) => s + f.amount, 0);
    const balance = totalIncome - totalExpense;
    
    const balanceEl = document.getElementById('finance-balance');
    balanceEl.textContent = formatMoney(balance);
    balanceEl.className = `text-3xl font-bold mt-1 ${balance >= 0 ? 'text-white' : 'text-red-500'}`;

    const sorted = [...finance].sort((a,b) => new Date(b.date) - new Date(a.date));
    
    if(sorted.length === 0) list.innerHTML = `<p class="text-center text-gray-500 py-10">Sin movimientos registrados.</p>`;

    sorted.forEach(f => {
        const isInc = f.type === 'income';
        const el = document.createElement('div');
        el.className = 'bg-gray-900 p-3 rounded-xl border border-gray-800 flex justify-between items-center';
        el.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="p-2 rounded-full ${isInc ? 'bg-emerald-900 text-emerald-400' : 'bg-red-900 text-red-400'}">
                    <i data-lucide="${isInc ? 'arrow-down' : 'arrow-up'}" size="18"></i>
                </div>
                <div>
                    <p class="text-white font-medium text-sm">${f.desc}</p>
                    <p class="text-[10px] text-gray-500 uppercase">${getCatLabel(f.cat)} • ${new Date(f.date).toLocaleDateString()}</p>
                </div>
            </div>
            <div class="text-right">
                <p class="font-bold ${isInc ? 'text-emerald-400' : 'text-red-400'}">${isInc ? '+' : '-'}${formatMoney(f.amount)}</p>
                <button onclick="deleteFinance(${f.id})" class="text-[10px] text-red-500 opacity-50 hover:opacity-100">Borrar</button>
            </div>
        `;
        list.appendChild(el);
    });
    if(window.lucide) lucide.createIcons();
}

function openFinanceModal(type) {
    document.getElementById('finance-type').value = type;
    document.getElementById('finance-amount').value = '';
    document.getElementById('finance-desc').value = '';
    const isInc = type === 'income';
    document.getElementById('finance-modal-title').textContent = isInc ? "Registrar Entrada" : "Registrar Salida";
    const btn = document.getElementById('btn-save-finance');
    btn.textContent = "GUARDAR";
    btn.className = `w-full py-4 rounded-xl font-bold text-lg mt-4 shadow-lg ${isInc ? 'btn-success' : 'btn-danger'}`;
    document.getElementById('modal-finance').classList.remove('hidden');
    document.getElementById('finance-amount').focus();
}

function closeFinanceModal() { document.getElementById('modal-finance').classList.add('hidden'); }

const formFinance = document.getElementById('form-finance');
if (formFinance) {
    formFinance.onsubmit = (e) => {
        e.preventDefault();
        const type = document.getElementById('finance-type').value;
        const amount = parseMoneyInput('finance-amount');
        const desc = document.getElementById('finance-desc').value;
        const cat = document.getElementById('finance-cat').value;
        const newRecord = { id: Date.now(), type, amount, desc, cat, date: new Date().toISOString() };
        finance.push(newRecord);
        saveFinanceData();
        closeFinanceModal();
    };
}

function deleteFinance(id) {
    if(!confirm("¿Borrar registro?")) return;
    finance = finance.filter(f => f.id !== id);
    saveFinanceData();
}

// --- REPORTES IA & CHART.JS ---
function renderReports() {
    let totalProjectIncome = 0;
    let totalProjectExpense = 0;
    projects.forEach(p => {
        totalProjectIncome += (p.transactions||[]).filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
        totalProjectExpense += (p.transactions||[]).filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
    });
    let totalPersonalIncome = finance.filter(f=>f.type==='income').reduce((s,f)=>s+f.amount,0);
    let totalPersonalExpense = finance.filter(f=>f.type==='expense').reduce((s,f)=>s+f.amount,0);
    const grandTotalIncome = totalProjectIncome + totalPersonalIncome;
    const grandTotalExpense = totalProjectExpense + totalPersonalExpense;

    generateAIInsight(grandTotalIncome, grandTotalExpense, totalProjectExpense, totalPersonalExpense);

    const ctxCash = document.getElementById('chart-cashflow');
    if(cashflowChart) cashflowChart.destroy();
    cashflowChart = new Chart(ctxCash, {
        type: 'bar',
        data: {
            labels: ['Ingresos', 'Gastos'],
            datasets: [{ label: 'Proyectos', data: [totalProjectIncome, totalProjectExpense], backgroundColor: '#f59e0b' }, { label: 'Personal', data: [totalPersonalIncome, totalPersonalExpense], backgroundColor: '#a855f7' }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true, grid: { color: '#333' }, ticks: { color: '#aaa' } }, y: { stacked: true, grid: { color: '#333' }, ticks: { color: '#aaa', callback: function(value){ return '$' + value/1000 + 'k'; } } } }, plugins: { legend: { labels: { color: 'white' } } } }
    });

    const cats = {};
    projects.forEach(p => { (p.transactions||[]).filter(t=>t.type==='expense').forEach(t => { const c = t.cat || 'misc'; cats[c] = (cats[c] || 0) + t.amount; }); });
    finance.filter(f=>f.type==='expense').forEach(f => { const c = f.cat || 'personal'; cats[c] = (cats[c] || 0) + f.amount; });
    const ctxExp = document.getElementById('chart-expenses');
    if(expensesChart) expensesChart.destroy();
    expensesChart = new Chart(ctxExp, {
        type: 'doughnut',
        data: { labels: Object.keys(cats).map(k => getCatLabel(k)), datasets: [{ data: Object.values(cats), backgroundColor: ['#ef4444', '#3b82f6', '#f59e0b', '#a855f7', '#10b981'], borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: 'white', font: {size: 10} } } } }
    });
}

function generateAIInsight(inc, exp, projExp, persExp) {
    const el = document.getElementById('ai-insight-text');
    const margin = inc - exp;
    const marginPercent = inc > 0 ? (margin / inc) * 100 : 0;
    let msg = "";
    if (inc === 0) msg = "Aún no hay suficientes datos. Registra tus primeros proyectos o ingresos para que pueda analizar tu rentabilidad.";
    else if (margin < 0) {
        msg = "⚠️ ¡Cuidado! Estás gastando más de lo que ingresas. ";
        if(persExp > projExp) msg += "Tus gastos personales están consumiendo el capital del negocio. Reduce salidas no esenciales.";
        else msg += "Los costos operativos de los proyectos son muy altos. Revisa precios de materiales.";
    } else if (marginPercent < 20) msg = "Tu margen de ganancia es bajo (" + Math.round(marginPercent) + "%). En metalmecánica lo ideal es superar el 30%. Intenta negociar mejor los insumos o ajustar el valor de tu mano de obra.";
    else {
        msg = "✅ ¡Excelente gestión! Tu negocio es saludable con un margen del " + Math.round(marginPercent) + "%. ";
        if(persExp < (inc * 0.1)) msg += "Tus gastos personales están controlados. Es un buen momento para reinvertir en maquinaria.";
        else msg += "Sigue así para mantener el crecimiento.";
    }
    el.innerHTML = msg;
}

// --- RENDERIZADO HOME (DASHBOARD MEJORADO) ---
function renderHome() {
    // 1. Calcular Totales Generales
    let totalIn = 0; let totalOut = 0; let active = 0;
    projects.forEach(p => {
        const pIn = (p.transactions||[]).filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
        const pOut = (p.transactions||[]).filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
        totalIn += pIn; totalOut += pOut;
        if(p.status === 'active') active++;
    });
    finance.forEach(f => { if(f.type === 'income') totalIn += f.amount; if(f.type === 'expense') totalOut += f.amount; });

    // 2. Actualizar UI de Tarjetas Superiores
    document.getElementById('dash-cashflow').textContent = formatMoney(totalIn - totalOut);
    document.getElementById('dash-total-in').textContent = formatMoney(totalIn);
    document.getElementById('dash-total-out').textContent = formatMoney(totalOut);
    document.getElementById('active-projects-count').textContent = `${active} Activos`;

    const listContainer = document.getElementById('projects-list');
    
    // 3. INYECTAR HERRAMIENTAS DE INICIO (Buscador y Filtros corregidos)
    let tools = document.getElementById('home-tools');
    if (!tools && listContainer) {
        tools = document.createElement('div');
        tools.id = 'home-tools';
        tools.className = 'mb-6 fade-in';
        tools.innerHTML = `
            <div class="relative mb-3">
                <i data-lucide="search" class="absolute left-3 top-3 text-gray-500" size="18"></i>
                <input type="text" id="home-search" class="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white outline-none focus:border-amber-500 transition" placeholder="Buscar proyecto o cliente...">
            </div>
            <div class="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                <button id="filter-btn-all" onclick="setHomeFilter('all')" class="px-4 py-1.5 rounded-full bg-amber-600 border border-amber-600 text-xs text-black font-bold transition whitespace-nowrap">Todos</button>
                <button id="filter-btn-active" onclick="setHomeFilter('active')" class="px-4 py-1.5 rounded-full bg-gray-800 border border-gray-700 text-xs text-gray-300 hover:bg-gray-700 transition whitespace-nowrap">En Proceso</button>
                <button id="filter-btn-completed" onclick="setHomeFilter('completed')" class="px-4 py-1.5 rounded-full bg-gray-800 border border-gray-700 text-xs text-gray-300 hover:bg-gray-700 transition whitespace-nowrap">Terminados</button>
            </div>
        `;
        listContainer.parentNode.insertBefore(tools, listContainer);
        
        // Listener para búsqueda en tiempo real
        document.getElementById('home-search').addEventListener('input', (e) => {
            homeSearchTerm = e.target.value.toLowerCase();
            renderProjectsList(); 
        });
    }

    // 4. Renderizar la lista de proyectos (filtrada)
    renderProjectsList();
    
    if(window.lucide) lucide.createIcons();
}

function setHomeFilter(status) {
    projectFilter = status; // Actualizamos el estado global
    
    // Actualizamos estilos de botones
    const map = {
        'all': 'filter-btn-all',
        'active': 'filter-btn-active',
        'completed': 'filter-btn-completed'
    };
    
    // Resetear todos
    Object.values(map).forEach(id => {
        const btn = document.getElementById(id);
        if(btn) {
            btn.className = "px-4 py-1.5 rounded-full bg-gray-800 border border-gray-700 text-xs text-gray-300 hover:bg-gray-700 transition whitespace-nowrap";
        }
    });

    // Activar el seleccionado
    const activeBtn = document.getElementById(map[status]);
    if(activeBtn) {
        activeBtn.className = "px-4 py-1.5 rounded-full bg-amber-600 border border-amber-600 text-xs text-black font-bold transition whitespace-nowrap";
    }

    renderProjectsList(); // Redibujar lista
}

function renderProjectsList() {
    const list = document.getElementById('projects-list');
    if(!list) return;
    list.innerHTML = '';

    // Filtrar proyectos por Búsqueda Y Estado
    const filtered = projects.filter(p => {
        const matchText = (p.name + p.client).toLowerCase().includes(homeSearchTerm);
        let matchStatus = true;
        
        if (projectFilter === 'active') matchStatus = (p.status === 'active');
        if (projectFilter === 'completed') matchStatus = (p.status === 'completed');
        
        return matchText && matchStatus;
    });

    const sorted = [...filtered].sort((a,b) => new Date(b.date) - new Date(a.date));

    if(sorted.length === 0) {
        list.innerHTML = `<div class="text-center opacity-30 py-10">
            <i data-lucide="search-x" class="mx-auto mb-2" size="32"></i>
            <p class="text-xs">No se encontraron proyectos ${projectFilter !== 'all' ? (projectFilter==='active'?'en proceso':'terminados') : ''}</p>
        </div>`;
        if(window.lucide) lucide.createIcons();
        return;
    }

    sorted.forEach(p => {
        const inc = (p.transactions||[]).filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
        const pend = p.budget - inc;
        const isCompleted = p.status === 'completed';
        
        const el = document.createElement('div');
        el.className = 'card p-4 relative overflow-hidden group hover:border-gray-500 cursor-pointer mb-3';
        el.onclick = () => openProject(p.id);
        
        const stColor = isCompleted ? 'bg-blue-600' : (pend <= 0 ? 'bg-emerald-500' : 'bg-amber-500');
        
        // Estilos condicionales para "Terminados" (SIN tachado)
        const cardOpacity = isCompleted ? 'opacity-75' : 'opacity-100';
        const titleColor = isCompleted ? 'text-blue-300' : 'text-white';
        const iconHtml = isCompleted ? '<i data-lucide="check-circle" size="16" class="inline mr-1 text-blue-500"></i>' : '';
        const badgeHtml = isCompleted ? '<span class="text-[9px] bg-blue-900/50 text-blue-300 px-1.5 py-0.5 rounded border border-blue-800/50 mt-1 inline-block">TERMINADO</span>' : '';

        el.innerHTML = `
            <div class="absolute left-0 top-0 bottom-0 w-1 ${stColor}"></div>
            <div class="pl-3 ${cardOpacity}">
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="font-bold ${titleColor} flex items-center">
                            ${iconHtml}
                            ${p.name}
                        </h4>
                        <p class="text-xs text-gray-500">${p.client||'--'}</p>
                        ${badgeHtml}
                    </div>
                    <div class="text-right">
                        <span class="text-xs text-gray-500">Total</span><br>
                        <span class="font-bold text-white">${formatMoney(p.budget)}</span>
                    </div>
                </div>
            </div>`;
        list.appendChild(el);
    });
    if(window.lucide) lucide.createIcons();
}

// --- COTIZACIONES ---
function loadQuoteBuilder(id = null) {
    currentQuoteId = id;
    const statusBadge = document.getElementById('q-status-badge');
    if (id) {
        const q = quotes.find(x => x.id === id);
        if (!q) return navigateTo('quotes-list');
        document.getElementById('q-client').value = q.client;
        document.getElementById('q-date').value = q.date.split('T')[0];
        quoteItems = JSON.parse(JSON.stringify(q.items));
        statusBadge.textContent = q.status === 'converted' ? 'PROYECTO CREADO' : 'BORRADOR';
        statusBadge.className = `text-[10px] px-2 py-0.5 rounded ${q.status === 'converted' ? 'bg-emerald-900 text-emerald-200' : 'bg-gray-700 text-gray-300'} block`;
    } else {
        document.getElementById('q-client').value = '';
        document.getElementById('q-date').valueAsDate = new Date();
        quoteItems = [{ desc: '', qty: 1, price: 0 }];
        statusBadge.classList.add('hidden');
    }
    renderQuoteItems();
    _internalShowView('quote-builder');
}

function addQuoteItem() { quoteItems.push({ desc: '', qty: 1, price: 0 }); renderQuoteItems(); }
function removeQuoteItem(index) { if(quoteItems.length > 1) { quoteItems.splice(index, 1); renderQuoteItems(); } else alert("Mínimo un item."); }
function updateQuoteItem(index, field, value) { quoteItems[index][field] = value; calculateQuoteTotal(); }

function renderQuoteItems() {
    const list = document.getElementById('quote-items-list');
    list.innerHTML = '';
    quoteItems.forEach((item, idx) => {
        const div = document.createElement('div');
        div.className = 'bg-gray-900 p-4 rounded-xl border border-gray-800 shadow-sm relative fade-in mb-3';
        div.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <span class="bg-gray-800 text-gray-500 text-[10px] px-2 py-0.5 rounded-full font-bold">ITEM ${idx + 1}</span>
                <button onclick="removeQuoteItem(${idx})" class="text-red-500/50 hover:text-red-500 p-1 transition"><i data-lucide="x" size="16"></i></button>
            </div>
            <div class="mb-3">
                <div class="flex items-center bg-black/50 border border-gray-700 rounded-lg px-3 py-2 focus-within:border-amber-500 transition-colors">
                    <i data-lucide="edit-3" size="14" class="text-gray-500 mr-2"></i>
                    <input type="text" class="bg-transparent text-white text-sm w-full outline-none placeholder-gray-600" placeholder="Descripción del trabajo..." value="${item.desc}" oninput="updateQuoteItem(${idx}, 'desc', this.value)">
                </div>
            </div>
            <div class="flex gap-3">
                <div class="w-1/3">
                    <div class="bg-black/50 border border-gray-700 rounded-lg p-2 text-center">
                        <label class="text-[9px] text-gray-500 uppercase tracking-wide block mb-1">Cant.</label>
                        <input type="number" class="bg-transparent text-white text-center w-full font-bold outline-none" value="${item.qty}" min="1" oninput="updateQuoteItem(${idx}, 'qty', parseFloat(this.value))">
                    </div>
                </div>
                <div class="w-2/3">
                    <div class="bg-black/50 border border-gray-700 rounded-lg p-2 text-right relative">
                        <label class="text-[9px] text-gray-500 uppercase tracking-wide block mb-1">Valor Unitario</label>
                        <span class="absolute left-2 bottom-2 text-gray-500 text-xs">$</span>
                        <input type="text" class="bg-transparent text-amber-400 text-right w-full font-bold outline-none money-input pr-1" value="${new Intl.NumberFormat('es-CO').format(item.price)}" inputmode="numeric" oninput="formatCurrencyInput(this); updateQuoteItem(${idx}, 'price', parseMoneyInput(this))">
                    </div>
                </div>
            </div>
        `;
        list.appendChild(div);
    });
    if(window.lucide) lucide.createIcons();
    calculateQuoteTotal();
}

function calculateQuoteTotal() {
    const total = quoteItems.reduce((sum, item) => sum + ( (item.qty || 0) * (item.price || 0) ), 0);
    document.getElementById('q-total-preview').textContent = formatMoney(total);
    return total;
}

function saveQuote() {
    const client = document.getElementById('q-client').value;
    if(!client) return alert("Ingrese el nombre del cliente");
    const total = calculateQuoteTotal();
    const quoteData = {
        id: currentQuoteId || Date.now(),
        client: client,
        date: document.getElementById('q-date').value || new Date().toISOString(),
        items: quoteItems,
        total: total,
        status: currentQuoteId ? (quotes.find(q => q.id === currentQuoteId)?.status || 'draft') : 'draft'
    };
    if (currentQuoteId) { const idx = quotes.findIndex(q => q.id === currentQuoteId); if(idx > -1) quotes[idx] = quoteData; } 
    else { quotes.push(quoteData); }
    saveQuotesData();
    alert("Cotización guardada.");
    navigateTo('quotes-list');
}

function renderQuotesList() {
    const list = document.getElementById('saved-quotes-list');
    list.innerHTML = '';
    const sorted = [...quotes].sort((a,b) => new Date(b.date) - new Date(a.date));
    if(sorted.length === 0) { list.innerHTML = `<p class="text-center text-gray-500 py-10">No hay cotizaciones.</p>`; return; }
    sorted.forEach(q => {
        const el = document.createElement('div');
        el.className = 'bg-gray-800 p-4 rounded-xl border border-gray-700 flex justify-between items-center group';
        el.innerHTML = `<div onclick="navigateTo('quote-builder', {id: ${q.id}})" class="flex-1 cursor-pointer"><h4 class="font-bold text-white">${q.client}</h4><p class="text-xs text-gray-400">${new Date(q.date).toLocaleDateString()} • ${q.items.length} items</p><p class="text-amber-500 font-bold mt-1">${formatMoney(q.total)}</p></div><button onclick="deleteQuote(${q.id})" class="p-3 text-red-500 opacity-50 hover:opacity-100"><i data-lucide="trash-2"></i></button>`;
        list.appendChild(el);
    });
    if(window.lucide) lucide.createIcons();
}
function deleteQuote(id) { if(confirm("¿Eliminar?")) { quotes = quotes.filter(q => q.id !== id); saveQuotesData(); } }

// --- IMPRESIÓN / VISTA PREVIA MEJORADA ---
function generateInvoiceHTML() {
    const clientName = document.getElementById('q-client').value || 'Cliente General';
    const dateVal = document.getElementById('q-date').value;
    const total = calculateQuoteTotal();
    let itemsRows = '';
    quoteItems.forEach(item => {
        itemsRows += `<tr class="border-b border-gray-300"><td class="p-2 text-center">${item.qty}</td><td class="p-2">${item.desc}</td><td class="p-2 text-right">${formatMoney(item.price)}</td><td class="p-2 text-right font-bold">${formatMoney(item.qty*item.price)}</td></tr>`;
    });
    return `<div class="font-serif text-black" style="width: 100%; max-width: 100%; box-sizing: border-box;">
        <div class="flex justify-between items-center border-b-2 border-black pb-4 mb-6">
            <div class="flex items-center gap-4">
                <img src="https://i.imgur.com/b8MWdC2.png" alt="Logo" style="height: 4rem; width: auto; object-fit: contain;">
                <div>
                    <h1 class="text-2xl font-bold tracking-wider uppercase m-0 leading-none">AM METÁLICAS</h1>
                    <p class="text-xs text-gray-600 m-0">Soldadura y Estructuras</p>
                    <p class="text-xs text-gray-600 m-0">Cel: 300 000 0000</p>
                </div>
            </div>
            <div class="text-right">
                <h2 class="text-xl font-bold text-gray-800 m-0">COTIZACIÓN</h2>
                <p class="text-xs mt-1 m-0">Fecha: <span>${new Date(dateVal).toLocaleDateString()}</span></p>
            </div>
        </div>
        
        <div class="mb-6">
            <p class="font-bold text-sm m-0">Cliente:</p>
            <p class="text-lg border-b border-dotted border-gray-400 pb-1 m-0">${clientName}</p>
        </div>

        <table class="w-full mb-6 border-collapse text-sm">
            <thead>
                <tr class="bg-gray-100 border-b-2 border-black text-left">
                    <th class="p-2 font-bold w-12">Cant.</th>
                    <th class="p-2 font-bold">Descripción</th>
                    <th class="p-2 font-bold text-right w-24">V. Unit</th>
                    <th class="p-2 font-bold text-right w-24">Total</th>
                </tr>
            </thead>
            <tbody>${itemsRows}</tbody>
            <tfoot>
                <tr class="border-t-2 border-black">
                    <td colspan="3" class="text-right p-3 font-bold text-lg">TOTAL:</td>
                    <td class="text-right p-3 font-bold text-lg">${formatMoney(total)}</td>
                </tr>
            </tfoot>
        </table>

        <div class="mt-8 text-center text-xs text-gray-500">
            <p>Validez: 15 días.</p>
            <p class="mt-10 pt-4 border-t border-gray-300 w-1/2 mx-auto">Firma Autorizada</p>
            <p class="mt-1 font-bold">AM METÁLICAS</p>
        </div>
    </div>`;
}

function openPreviewModal() { 
    const paper = document.getElementById('preview-paper');
    paper.innerHTML = generateInvoiceHTML(); 
    
    const baseWidth = 700; 
    paper.style.minWidth = `${baseWidth}px`;
    paper.style.width = `${baseWidth}px`;

    const screenWidth = window.innerWidth;
    const containerPadding = 32;
    const availableWidth = screenWidth - containerPadding;

    paper.style.transform = 'none';
    paper.style.transformOrigin = 'top center'; 
    paper.parentElement.style.height = 'auto';
    paper.parentElement.style.overflow = 'auto';

    if (availableWidth < baseWidth) {
        const scale = availableWidth / baseWidth;
        paper.style.transform = `scale(${scale})`;
        const scaledHeight = paper.offsetHeight * scale;
        paper.parentElement.style.height = `${scaledHeight + 50}px`;
        paper.parentElement.style.overflow = 'hidden'; 
    } else {
        paper.style.margin = '0 auto';
        paper.style.transformOrigin = 'top center';
    }

    document.getElementById('modal-quote-preview').classList.remove('hidden'); 
}

function closePreviewModal() { document.getElementById('modal-quote-preview').classList.add('hidden'); }

function triggerPrint() { 
    const content = document.getElementById('preview-paper').innerHTML; 
    const pa = document.getElementById('printable-area'); 
    pa.innerHTML = content; 
    pa.style.display = 'block'; 
    pa.classList.remove('hidden');
    setTimeout(() => {
        window.print(); 
        setTimeout(() => { 
            pa.style.display = 'none'; 
            pa.classList.add('hidden');
        }, 1000); 
    }, 100);
}

function renderQuoteSelector() {
    const selector = document.getElementById('new-import-quote');
    while(selector.options.length > 1) { selector.remove(1); }
    quotes.forEach(q => { const option = document.createElement('option'); option.value = q.id; option.text = `${q.client} - ${formatMoney(q.total)}`; selector.add(option); });
}
function importQuoteToProject(qid) {
    if(!qid) return;
    const q = quotes.find(x => x.id == qid);
    if(q) {
        document.getElementById('new-client').value = q.client;
        document.getElementById('new-budget').value = new Intl.NumberFormat('es-CO').format(q.total);
        let notesText = "Base Cotización:\n";
        q.items.forEach(i => { notesText += `- (${i.qty}) ${i.desc}\n`; });
        document.getElementById('new-notes').value = notesText;
    }
}

const formNew = document.getElementById('form-new');
if(formNew) {
    formNew.onsubmit = (e) => {
        e.preventDefault();
        const rawBudget = parseMoneyInput('new-budget');
        const quoteId = document.getElementById('new-import-quote').value;
        const newProject = {
            id: Date.now(),
            name: document.getElementById('new-name').value,
            budget: rawBudget,
            client: document.getElementById('new-client').value,
            phone: document.getElementById('new-phone').value,
            notes: document.getElementById('new-notes').value, 
            date: new Date().toISOString(),
            status: 'active',
            quoteSourceId: quoteId || null,
            transactions: []
        };
        if(quoteId) { const qIdx = quotes.findIndex(q => q.id == quoteId); if(qIdx > -1) { quotes[qIdx].status = 'converted'; saveQuotesData(); } }
        projects.push(newProject);
        saveData();
        e.target.reset();
        window.history.back();
    };
}

function openProject(id, pushState=true) { currentProjectId = id; if(pushState) window.history.pushState({ view: 'project', id: id }, '', ''); _renderProjectDetails(id); _internalShowView('project'); }

function _renderProjectDetails(id) {
    const p = projects.find(x => x.id === id);
    if(!p) return;
    document.getElementById('p-detail-name').textContent = p.name;
    document.getElementById('pd-notes').textContent = p.notes || "Sin notas.";
    
    // Cálculos
    const inc = (p.transactions||[]).filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
    const pend = p.budget - inc;
    const percent = p.budget > 0 ? (inc/p.budget)*100 : 0;
    
    // NUEVO: Cálculos para estadísticas avanzadas
    const expenses = (p.transactions||[]).filter(t=>t.type==='expense');
    const totalExp = expenses.reduce((s,t)=>s+t.amount,0);
    const profit = inc - totalExp; // Utilidad de caja (lo recibido menos lo gastado)
    
    // Breakdown de categorías
    const cats = { material: 0, labor: 0, transport: 0 };
    expenses.forEach(t => {
        if(t.cat === 'material') cats.material += t.amount;
        else if(t.cat === 'labor') cats.labor += t.amount;
        else if(t.cat === 'transport') cats.transport += t.amount;
    });

    document.getElementById('pd-budget').textContent = formatMoney(p.budget);
    document.getElementById('pd-pending').textContent = formatMoney(pend);
    document.getElementById('pd-percent').textContent = Math.round(percent) + '%';
    document.getElementById('pd-bar-income').style.width = Math.min(percent, 100) + '%';
    
    // WhatsApp logic
    const waLink = document.getElementById('whatsapp-link');
    if(waLink) {
         const msg = `*ESTADO: ${p.name}*\nTotal: ${formatMoney(p.budget)}\nAbonado: ${formatMoney(inc)}\nPendiente: ${formatMoney(pend)}`;
         let phone = p.phone ? p.phone.replace(/\D/g, '') : '';
         if(phone.length > 0) {
             if(!phone.startsWith('57') && phone.length === 10) phone = '57' + phone;
             waLink.href = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
         } else {
             waLink.href = `https://wa.me/?text=${encodeURIComponent(msg)}`;
         }
    }

    // --- BOTONES DE ACCIÓN DEL PROYECTO (NUEVO: Terminar/Activar) ---
    // Buscamos o creamos el contenedor de acciones
    let actionsContainer = document.getElementById('project-actions-container');
    if (!actionsContainer) {
        actionsContainer = document.createElement('div');
        actionsContainer.id = 'project-actions-container';
        actionsContainer.className = 'mt-6 mb-6 px-1';
        
        // Insertamos al final del detalle
        const detailsContainer = document.getElementById('view-project').querySelector('.container');
        // Lo ponemos antes del historial de transacciones si es posible, o al final
        const transList = document.getElementById('transactions-list').parentNode;
        if(transList) {
             transList.parentNode.insertBefore(actionsContainer, transList);
        }
    }

    // Lógica visual del botón
    const isCompleted = p.status === 'completed';
    const btnClass = isCompleted 
        ? 'w-full py-3 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg transition-colors border-2 border-emerald-500'
        : 'w-full py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-500 shadow-lg transition-colors border-2 border-red-500';
    const btnText = isCompleted ? 'ACTIVAR PROYECTO' : 'TERMINAR PROYECTO';
    const btnIcon = isCompleted ? 'refresh-ccw' : 'check-circle';

    actionsContainer.innerHTML = `
        <button onclick="toggleProjectStatus()" class="${btnClass} flex items-center justify-center gap-2 mb-3">
            <i data-lucide="${btnIcon}"></i> ${btnText}
        </button>
        <button onclick="deleteCurrentProject()" class="w-full py-3 rounded-xl font-bold text-red-500 bg-gray-900 border border-gray-800 hover:bg-gray-800 transition-colors text-xs uppercase tracking-wider">
            Eliminar Proyecto
        </button>
    `;

    // --- INYECCIÓN DEL TABLERO DE CONTROL (STATS) ---
    // Buscamos o creamos el contenedor de estadísticas
    let statsContainer = document.getElementById('project-stats-container');
    if (!statsContainer) {
        statsContainer = document.createElement('div');
        statsContainer.id = 'project-stats-container';
        statsContainer.className = 'mb-6 fade-in';
        // Insertamos después de la tarjeta principal (que contiene pd-budget)
        const budgetEl = document.getElementById('pd-budget');
        if(budgetEl) {
            const card = budgetEl.closest('.card');
            if(card) card.insertAdjacentElement('afterend', statsContainer);
        }
    }

    // Renderizamos el HTML del tablero
    statsContainer.innerHTML = `
        <div class="grid grid-cols-2 gap-3 mb-3">
            <div class="bg-red-900/20 border border-red-900/50 p-3 rounded-xl shadow-lg">
                <p class="text-[10px] text-red-400 uppercase font-bold tracking-wider">Gastos Totales</p>
                <p class="text-lg font-bold text-white mt-1">${formatMoney(totalExp)}</p>
            </div>
            <div class="bg-${profit >= 0 ? 'emerald' : 'orange'}-900/20 border border-${profit >= 0 ? 'emerald' : 'orange'}-900/50 p-3 rounded-xl shadow-lg">
                <p class="text-[10px] text-${profit >= 0 ? 'emerald' : 'orange'}-400 uppercase font-bold tracking-wider">Utilidad en Caja</p>
                <p class="text-lg font-bold text-white mt-1">${profit >= 0 ? '+' : ''}${formatMoney(profit)}</p>
            </div>
        </div>
        
        <div class="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-lg">
            <p class="text-[10px] text-gray-400 uppercase font-bold mb-3 flex justify-between">
                <span>Distribución de Gastos</span>
                <span>${totalExp > 0 ? '100%' : '0%'}</span>
            </p>
            <div class="flex h-3 rounded-full overflow-hidden bg-gray-900 mb-3 border border-gray-700">
                <div class="bg-amber-500" style="width: ${totalExp ? (cats.material/totalExp)*100 : 0}%"></div>
                <div class="bg-blue-500" style="width: ${totalExp ? (cats.labor/totalExp)*100 : 0}%"></div>
                <div class="bg-purple-500" style="width: ${totalExp ? (cats.transport/totalExp)*100 : 0}%"></div>
            </div>
            <div class="flex justify-between text-[10px] text-gray-400 font-medium">
                <span class="flex items-center gap-1.5"><div class="w-2 h-2 rounded-full bg-amber-500"></div> Mat. ${totalExp ? Math.round((cats.material/totalExp)*100) : 0}%</span>
                <span class="flex items-center gap-1.5"><div class="w-2 h-2 rounded-full bg-blue-500"></div> M.O. ${totalExp ? Math.round((cats.labor/totalExp)*100) : 0}%</span>
                <span class="flex items-center gap-1.5"><div class="w-2 h-2 rounded-full bg-purple-500"></div> Trans. ${totalExp ? Math.round((cats.transport/totalExp)*100) : 0}%</span>
            </div>
        </div>
    `;

    const list = document.getElementById('transactions-list'); list.innerHTML = '';
    const sortedT = [...(p.transactions||[])].sort((a,b)=>new Date(b.date)-new Date(a.date));
    if(sortedT.length === 0) list.innerHTML = `<p class="text-center text-gray-500 text-sm">Sin movimientos</p>`;
    sortedT.forEach(t => {
        const isInc = t.type === 'income';
        const div = document.createElement('div');
        div.className = 'flex justify-between items-center bg-black/40 p-3 rounded border border-gray-700/50 mb-2';
        
        // Mostrar etiqueta de categoría si es gasto
        let catTag = '';
        if (!isInc && t.cat) {
            const catColors = { material: 'text-amber-500', labor: 'text-blue-500', transport: 'text-purple-500' };
            const catNames = { material: 'Material', labor: 'Mano Obra', transport: 'Transporte' };
            catTag = `<span class="text-[9px] uppercase font-bold ml-2 ${catColors[t.cat] || 'text-gray-500'} border border-gray-700 px-1 rounded bg-gray-800">${catNames[t.cat] || 'Gasto'}</span>`;
        }

        div.innerHTML = `<div class="flex items-center gap-3"><div class="p-2 rounded-full ${isInc?'bg-emerald-500/20 text-emerald-500':'bg-red-500/20 text-red-500'}"><i data-lucide="${isInc?'arrow-down-left':'arrow-up-right'}" size="16"></i></div><div><p class="text-white text-sm font-medium flex items-center">${t.desc} ${catTag}</p><p class="text-[10px] text-gray-500 uppercase">${new Date(t.date).toLocaleDateString()}</p></div></div><div class="text-right"><p class="font-bold ${isInc?'text-emerald-400':'text-white'}">${formatMoney(t.amount)}</p><button onclick="deleteTrans(${t.id})" class="text-[10px] text-red-500 opacity-50 hover:opacity-100">Borrar</button></div>`;
        list.appendChild(div);
    });
    if(window.lucide) lucide.createIcons();
}

function deleteCurrentProject() { if(!confirm("¿ELIMINAR PROYECTO?")) return; projects = projects.filter(x => x.id !== currentProjectId); saveData(); window.history.back(); }

function fillDemo() { document.getElementById('login-email').value=ADMIN_USER; document.getElementById('login-password').value=ADMIN_PASS; }

// LOGICA MEJORADA DEL MODAL DE TRANSACCIONES
function openTransactionModal(type) { 
    document.getElementById('trans-type').value = type; 
    document.getElementById('trans-amount').value = ''; 
    document.getElementById('trans-desc').value = ''; 
    document.getElementById('modal-trans').classList.remove('hidden');
    
    // Mostrar/Ocultar selector de categorías solo si es GASTO
    const catSelector = document.getElementById('cat-selector');
    if (catSelector) {
        if (type === 'expense') {
            catSelector.classList.remove('hidden');
        } else {
            catSelector.classList.add('hidden');
        }
    }
    
    // Focus automático
    setTimeout(() => {
        document.getElementById('trans-amount').focus();
    }, 100);
}

function closeModal() { document.getElementById('modal-trans').classList.add('hidden'); }
document.getElementById('modal-trans').addEventListener('click', e => { if(e.target.id === 'modal-trans') closeModal(); });

// FIX: Cambio de addEventListener a .onsubmit para evitar duplicados
const formTrans = document.getElementById('form-trans');
if(formTrans) {
    formTrans.onsubmit = (e) => {
        e.preventDefault();
        if(!currentProjectId) return;
        
        const type = document.getElementById('trans-type').value;
        const amount = parseMoneyInput('trans-amount');
        const desc = document.getElementById('trans-desc').value;
        
        // Capturar Categoría si es Gasto
        let cat = null;
        if (type === 'expense') {
            const checkedCat = document.querySelector('input[name="trans-cat"]:checked');
            if (checkedCat) cat = checkedCat.value;
        }

        const newTrans = { 
            id: Date.now(), 
            type, 
            amount, 
            desc, 
            date: new Date().toISOString(),
            cat: cat // Guardamos la categoría
        };
        
        const idx = projects.findIndex(x => x.id === currentProjectId);
        if(idx > -1) { 
            projects[idx].transactions.push(newTrans); 
            saveData(); 
            closeModal(); 
            _renderProjectDetails(currentProjectId); 
        }
    };
}
function deleteTrans(tid) { if(!confirm("¿Borrar?")) return; const idx = projects.findIndex(x => x.id === currentProjectId); if(idx > -1) { projects[idx].transactions = projects[idx].transactions.filter(t => t.id !== tid); saveData(); _renderProjectDetails(currentProjectId); } }
function shareProjectStatus() { const p = projects.find(x => x.id === currentProjectId); if(!p) return; const inc = (p.transactions||[]).filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0); window.open(`https://wa.me/?text=${encodeURIComponent(`*ESTADO: ${p.name}*\nTotal: ${formatMoney(p.budget)}\nAbonado: ${formatMoney(inc)}\nPendiente: ${formatMoney(p.budget - inc)}`)}`, '_blank'); }

// FUNCIÓN MODIFICADA PARA QUE FUNCIONE CON EL NUEVO BOTÓN
function toggleProjectStatus() { 
    const p = projects.find(x => x.id === currentProjectId); 
    if(p) { 
        p.status = p.status === 'active' ? 'completed' : 'active'; 
        saveData(); 
        // Ya no mostramos alerta, sino que refrescamos la UI para que el botón cambie de color inmediatamente
        _renderProjectDetails(currentProjectId);
    } 
}

// --- FUNCIONES DEL MENÚ ---
function toggleBackupMenu() {
    const menu = document.getElementById('backup-menu');
    if (menu) {
        menu.classList.toggle('hidden');
    }
}

function exportData() {
    const data = {
        projects: projects,
        quotes: quotes,
        finance: finance,
        exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AM_Backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toggleBackupMenu();
}

function triggerImport() {
    document.getElementById('file-import').click();
}

function importData(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if(confirm("Esto reemplazará tus datos actuales con los del archivo. ¿Continuar?")) {
                if(data.projects) localStorage.setItem(DB_KEY, JSON.stringify(data.projects));
                if(data.quotes) localStorage.setItem(QUOTES_KEY, JSON.stringify(data.quotes));
                if(data.finance) localStorage.setItem(FINANCE_KEY, JSON.stringify(data.finance));
                alert("Datos restaurados correctamente.");
                location.reload();
            }
        } catch(err) {
            alert("Error al leer el archivo de respaldo.");
        }
    };
    reader.readAsText(file);
    toggleBackupMenu();
}

// Utils & Auth
function formatMoney(amount) { return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount); }
function parseMoneyInput(idOrElement) { const el = typeof idOrElement === 'string' ? document.getElementById(idOrElement) : idOrElement; return parseFloat(el.value.replace(/\./g, '').replace(/,/g, '')) || 0; }
function formatCurrencyInput(input) { let val = input.value.replace(/\D/g, ''); if(val === '') { input.value = ''; return; } input.value = new Intl.NumberFormat('es-CO').format(val); }
function initMoneyInputs() { document.body.addEventListener('input', e => { if(e.target.classList.contains('money-input')) formatCurrencyInput(e.target); }); }
function getCatLabel(cat) { const map = { 'food': 'Alimentación', 'transport': 'Transporte', 'materials': 'Materiales', 'extra_income': 'Ingreso Extra', 'personal': 'Personal' }; return map[cat] || cat; }
function checkAuth() { const isLogged = localStorage.getItem(AUTH_KEY) === 'true'; if(isLogged) { document.getElementById('view-login').classList.add('hidden'); document.getElementById('app-header').classList.remove('hidden'); document.getElementById('app-content').classList.remove('hidden'); } else { document.getElementById('view-login').classList.remove('hidden'); } }
// FIX: Cambio de addEventListener a .onsubmit
const formLogin = document.getElementById('form-login');
if(formLogin) {
    formLogin.onsubmit = (e) => { 
        e.preventDefault(); 
        if(document.getElementById('login-email').value === ADMIN_USER && document.getElementById('login-password').value === ADMIN_PASS) { 
            localStorage.setItem(AUTH_KEY, 'true'); 
            checkAuth(); 
            navigateTo('home'); 
        } else { 
            document.getElementById('login-error').classList.remove('hidden'); 
        } 
    };
}
function logout() { localStorage.removeItem(AUTH_KEY); location.reload(); }
