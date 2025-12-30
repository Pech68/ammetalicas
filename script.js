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
        _internalShowView('home');
    }

    // LISTENER GLOBAL PARA CERRAR MENÚ AL DAR CLIC FUERA
    document.addEventListener('click', (e) => {
        const menu = document.getElementById('backup-menu');
        const btn = document.getElementById('btn-menu-toggle');
        // Si el menú está abierto y el clic NO fue en el menú NI en el botón que lo abre...
        if (menu && !menu.classList.contains('hidden')) {
            if (!menu.contains(e.target) && (!btn || !btn.contains(e.target))) {
                menu.classList.add('hidden');
            }
        }
    });
});

// --- SISTEMA DE DATOS ---
function loadData() {
    projects = JSON.parse(localStorage.getItem(DB_KEY) || '[]');
    quotes = JSON.parse(localStorage.getItem(QUOTES_KEY) || '[]');
    finance = JSON.parse(localStorage.getItem(FINANCE_KEY) || '[]');
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
        // Asegurar que el menú se cierre al navegar
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

    // Cerrar menú automáticamente al navegar
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

// FIX: Cambio de addEventListener a .onsubmit para evitar duplicados
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

// --- RENDERIZADO HOME ---
function renderHome() {
    const list = document.getElementById('projects-list');
    if(!list) return;
    list.innerHTML = '';
    
    let totalIn = 0; let totalOut = 0; let active = 0;
    projects.forEach(p => {
        const pIn = (p.transactions||[]).filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
        const pOut = (p.transactions||[]).filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
        totalIn += pIn; totalOut += pOut;
        if(p.status === 'active') active++;
    });
    finance.forEach(f => { if(f.type === 'income') totalIn += f.amount; if(f.type === 'expense') totalOut += f.amount; });

    document.getElementById('dash-cashflow').textContent = formatMoney(totalIn - totalOut);
    document.getElementById('dash-total-in').textContent = formatMoney(totalIn);
    document.getElementById('dash-total-out').textContent = formatMoney(totalOut);
    document.getElementById('active-projects-count').textContent = `${active} Activos`;

    const sorted = [...projects].sort((a,b) => new Date(b.date) - new Date(a.date));
    if(sorted.length === 0) list.innerHTML = `<div class="text-center opacity-30 py-10"><i data-lucide="folder-open" class="mx-auto mb-2" size="48"></i><p>Sin proyectos</p></div>`;

    sorted.forEach(p => {
        const inc = (p.transactions||[]).filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
        const pend = p.budget - inc;
        const el = document.createElement('div');
        el.className = 'card p-4 relative overflow-hidden group hover:border-gray-500 cursor-pointer mb-3';
        el.onclick = () => openProject(p.id);
        const stColor = p.status === 'completed' ? 'bg-blue-600' : (pend <= 0 ? 'bg-emerald-500' : 'bg-amber-500');
        el.innerHTML = `
            <div class="absolute left-0 top-0 bottom-0 w-1 ${stColor}"></div>
            <div class="pl-3">
                <div class="flex justify-between">
                    <div><h4 class="font-bold text-white ${p.status==='completed'?'line-through text-gray-500':''}">${p.name}</h4><p class="text-xs text-gray-500">${p.client||'--'}</p></div>
                    <div class="text-right"><span class="text-xs text-gray-500">Total</span><br><span class="font-bold text-white">${formatMoney(p.budget)}</span></div>
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
    // SE USA UN ESTILO EN LÍNEA BASICO PARA GARANTIZAR QUE NO SE DESCUADRE
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
    
    // --- CORRECCIÓN CRÍTICA DE ESCALADO ---
    // 1. Forzar un ancho MÍNIMO de hoja de papel (aprox 700px es como una carta legible)
    const baseWidth = 700; 
    paper.style.minWidth = `${baseWidth}px`;
    paper.style.width = `${baseWidth}px`; // Fijo para que el layout interno sea estable

    // 2. Calcular escala basada en el ancho de la pantalla del usuario vs el ancho de la hoja
    const screenWidth = window.innerWidth;
    const containerPadding = 32; // Un poco de margen visual
    const availableWidth = screenWidth - containerPadding;

    // Resetear transformaciones previas
    paper.style.transform = 'none';
    
    // FIX IMPORTANTE: Anclaje al CENTRO superior para que no se mueva a la izquierda
    paper.style.transformOrigin = 'top center'; 
    
    paper.parentElement.style.height = 'auto';
    paper.parentElement.style.overflow = 'auto';

    // Si la pantalla es más pequeña que la hoja (celulares)
    if (availableWidth < baseWidth) {
        const scale = availableWidth / baseWidth;
        
        // Aplicar Zoom Out
        paper.style.transform = `scale(${scale})`;
        
        // Ajustar el contenedor padre para que no quede espacio vacío gigante abajo
        const scaledHeight = paper.offsetHeight * scale;
        paper.parentElement.style.height = `${scaledHeight + 50}px`;
        paper.parentElement.style.overflow = 'hidden'; 
    } else {
        // En PC se ve normal
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

// ... Proyectos e Importar ...
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
// FIX: Cambio de addEventListener a .onsubmit para evitar duplicados en el Canvas
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
    const inc = (p.transactions||[]).filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
    const pend = p.budget - inc;
    const percent = p.budget > 0 ? (inc/p.budget)*100 : 0;
    document.getElementById('pd-budget').textContent = formatMoney(p.budget);
    document.getElementById('pd-pending').textContent = formatMoney(pend);
    document.getElementById('pd-percent').textContent = Math.round(percent) + '%';
    document.getElementById('pd-bar-income').style.width = Math.min(percent, 100) + '%';
    
    // FIX: Actualizar enlace de WhatsApp para evitar recarga de página (href="#")
    const waLink = document.getElementById('whatsapp-link');
    if(waLink) {
         const msg = `*ESTADO: ${p.name}*\nTotal: ${formatMoney(p.budget)}\nAbonado: ${formatMoney(inc)}\nPendiente: ${formatMoney(pend)}`;
         
         // Usar teléfono del cliente si existe, agregando 57 (Colombia)
         let phone = p.phone ? p.phone.replace(/\D/g, '') : '';
         if(phone.length > 0) {
             if(!phone.startsWith('57') && phone.length === 10) {
                 phone = '57' + phone;
             }
             waLink.href = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
         } else {
             waLink.href = `https://wa.me/?text=${encodeURIComponent(msg)}`;
         }
    }

    const list = document.getElementById('transactions-list'); list.innerHTML = '';
    const sortedT = [...(p.transactions||[])].sort((a,b)=>new Date(b.date)-new Date(a.date));
    if(sortedT.length === 0) list.innerHTML = `<p class="text-center text-gray-500 text-sm">Sin movimientos</p>`;
    sortedT.forEach(t => {
        const isInc = t.type === 'income';
        const div = document.createElement('div');
        div.className = 'flex justify-between items-center bg-black/40 p-3 rounded border border-gray-700/50 mb-2';
        div.innerHTML = `<div class="flex items-center gap-3"><div class="p-2 rounded-full ${isInc?'bg-emerald-500/20 text-emerald-500':'bg-red-500/20 text-red-500'}"><i data-lucide="${isInc?'arrow-down-left':'arrow-up-right'}" size="16"></i></div><div><p class="text-white text-sm font-medium">${t.desc}</p><p class="text-[10px] text-gray-500 uppercase">${new Date(t.date).toLocaleDateString()}</p></div></div><div class="text-right"><p class="font-bold ${isInc?'text-emerald-400':'text-white'}">${formatMoney(t.amount)}</p><button onclick="deleteTrans(${t.id})" class="text-[10px] text-red-500 opacity-50 hover:opacity-100">Borrar</button></div>`;
        list.appendChild(div);
    });
    if(window.lucide) lucide.createIcons();
}

function deleteCurrentProject() { if(!confirm("¿ELIMINAR PROYECTO?")) return; projects = projects.filter(x => x.id !== currentProjectId); saveData(); window.history.back(); }
// FIX: Cambio de addEventListener a .onsubmit para evitar duplicados
const formTrans = document.getElementById('form-trans');
if(formTrans) {
    formTrans.onsubmit = (e) => {
        e.preventDefault();
        if(!currentProjectId) return;
        const type = document.getElementById('trans-type').value;
        const newTrans = { id: Date.now(), type, amount: parseMoneyInput('trans-amount'), desc: document.getElementById('trans-desc').value, date: new Date().toISOString() };
        const idx = projects.findIndex(x => x.id === currentProjectId);
        if(idx > -1) { projects[idx].transactions.push(newTrans); saveData(); closeModal(); _renderProjectDetails(currentProjectId); }
    };
}
function deleteTrans(tid) { if(!confirm("¿Borrar?")) return; const idx = projects.findIndex(x => x.id === currentProjectId); if(idx > -1) { projects[idx].transactions = projects[idx].transactions.filter(t => t.id !== tid); saveData(); _renderProjectDetails(currentProjectId); } }
function shareProjectStatus() { const p = projects.find(x => x.id === currentProjectId); if(!p) return; const inc = (p.transactions||[]).filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0); window.open(`https://wa.me/?text=${encodeURIComponent(`*ESTADO: ${p.name}*\nTotal: ${formatMoney(p.budget)}\nAbonado: ${formatMoney(inc)}\nPendiente: ${formatMoney(p.budget - inc)}`)}`, '_blank'); }
function toggleProjectStatus() { const p = projects.find(x => x.id === currentProjectId); if(p) { p.status = p.status === 'active' ? 'completed' : 'active'; saveData(); alert(`Proyecto marcado como ${p.status === 'completed' ? 'TERMINADO' : 'ACTIVO'}`); } }

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
function fillDemo() { document.getElementById('login-email').value=ADMIN_USER; document.getElementById('login-password').value=ADMIN_PASS; }
function openTransactionModal(type) { document.getElementById('trans-type').value = type; document.getElementById('trans-amount').value = ''; document.getElementById('trans-desc').value = ''; document.getElementById('modal-trans').classList.remove('hidden'); }
function closeModal() { document.getElementById('modal-trans').classList.add('hidden'); }
document.getElementById('modal-trans').addEventListener('click', e => { if(e.target.id === 'modal-trans') closeModal(); });
