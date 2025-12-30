// CONFIGURACIÓN LOCAL
const DB_KEY = 'AM_METALICAS_DB';
const AUTH_KEY = 'AM_METALICAS_AUTH';

// CREDENCIALES
const ADMIN_USER = 'millerbaquero@ammetalicas.com';
const ADMIN_PASS = 'Miller2026/*';

let projects = [];
let currentProjectId = null;

// INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', () => {
    loadData(); 
    // Aseguramos que Lucide cargue iconos
    setTimeout(() => { if(window.lucide) lucide.createIcons(); }, 100);
    
    // Fecha por defecto en cotizador
    const dateInput = document.getElementById('q-date');
    if(dateInput) dateInput.valueAsDate = new Date();
    
    // Inicializar Listeners para formato de dinero
    initMoneyInputs();

    // Inicializar Historial
    if (window.history && window.history.state === null) {
        window.history.replaceState({view: 'home'}, '', '');
    }
    checkAuth(); 
});

// --- MANEJO DE FORMATO DE DINERO (1.000.000) ---
function initMoneyInputs() {
    document.body.addEventListener('input', function(e) {
        if (e.target.classList.contains('money-input')) {
            formatCurrencyInput(e.target);
        }
    });
}

function formatCurrencyInput(input) {
    let value = input.value.replace(/\D/g, '');
    if (value === '') {
        input.value = '';
        return;
    }
    input.value = new Intl.NumberFormat('es-CO').format(value);
}

function parseMoneyInput(idOrElement) {
    const el = typeof idOrElement === 'string' ? document.getElementById(idOrElement) : idOrElement;
    const rawValue = el.value.replace(/\./g, '').replace(/,/g, ''); 
    return parseFloat(rawValue) || 0;
}

// --- MANEJO DEL BOTÓN ATRÁS (Android) ---
window.addEventListener('popstate', (event) => {
    const state = event.state;
    if (state) {
        if (state.view === 'home') {
            _internalShowView('home');
            currentProjectId = null;
        } else if (state.view === 'project') {
            if(projects.length === 0) loadData();
            currentProjectId = state.id;
            _renderProjectDetails(state.id);
            _internalShowView('project');
        } else if (state.view === 'new') {
            _internalShowView('new');
        } else if (state.view === 'quote') {
            _internalShowView('quote-builder');
        }
    } else {
        _internalShowView('home');
    }
});

function navigateTo(viewId, params = {}) {
    let state = { view: viewId, ...params };
    if(viewId === 'quote-builder') state.view = 'quote';
    window.history.pushState(state, '', '');
    
    if (viewId === 'home') {
        currentProjectId = null;
        renderHome();
        _internalShowView('home');
    } else if (viewId === 'new') {
        _internalShowView('new');
    } else if (viewId === 'quote-builder') {
        _internalShowView('quote-builder');
    }
}

function goBack() {
    window.history.back();
}

// --- AUTENTICACIÓN ---
function checkAuth() {
    const isLogged = localStorage.getItem(AUTH_KEY) === 'true';
    if(isLogged) {
        document.getElementById('view-login').classList.add('hidden');
        document.getElementById('app-header').classList.remove('hidden');
        document.getElementById('app-content').classList.remove('hidden');
        if(history.state && history.state.view !== 'home') {
           renderHome();
           if(history.state.view === 'project') {
               _renderProjectDetails(history.state.id);
               _internalShowView('project');
           } else {
               window.dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
           }
        } else {
           _internalShowView('home');
           renderHome();
        }
    } else {
        document.getElementById('view-login').classList.remove('hidden');
        document.getElementById('app-header').classList.add('hidden');
        document.getElementById('app-content').classList.add('hidden');
    }
}

function fillDemo() {
    document.getElementById('login-email').value = ADMIN_USER;
    document.getElementById('login-password').value = ADMIN_PASS;
}

const loginForm = document.getElementById('form-login');
if(loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');

        if (email === ADMIN_USER && pass === ADMIN_PASS) {
            localStorage.setItem(AUTH_KEY, 'true');
            errorEl.classList.add('hidden');
            window.history.replaceState({view: 'home'}, '', ''); 
            checkAuth();
        } else {
            errorEl.classList.remove('hidden');
        }
    });
}

function logout() {
    if(confirm('¿Cerrar sesión?')) {
        localStorage.removeItem(AUTH_KEY);
        window.location.reload(); 
    }
}

// --- SISTEMA DE DATOS ---
function loadData() {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
        try { projects = JSON.parse(raw); } catch(e) { projects = []; }
    } else {
        projects = [];
    }
}

function saveData() {
    localStorage.setItem(DB_KEY, JSON.stringify(projects));
    renderHome();
    if (currentProjectId) _renderProjectDetails(currentProjectId);
}

// --- EXPORTAR E IMPORTAR ---
function toggleBackupMenu() {
    document.getElementById('backup-menu').classList.toggle('hidden');
}

function exportData() {
    const dataStr = JSON.stringify(projects, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0,10);
    a.href = url;
    a.download = `backup_am_metalicas_${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toggleBackupMenu();
}

function triggerImport() { document.getElementById('file-import').click(); }

function importData(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const json = JSON.parse(e.target.result);
            if (confirm(`¿Restaurar copia? Se reemplazarán datos actuales.`)) {
                projects = json;
                saveData();
                alert('Datos restaurados.');
            }
        } catch (error) { alert('Error archivo.'); }
    };
    reader.readAsText(file);
    toggleBackupMenu();
    input.value = '';
}

// --- NAVEGACIÓN VISUAL INTERNA ---
function _internalShowView(viewId) {
    ['view-home', 'view-project', 'view-new', 'view-quote-builder'].forEach(id => document.getElementById(id).classList.add('hidden'));
    
    const targetId = viewId === 'quote-builder' ? 'view-quote-builder' : `view-${viewId}`;
    document.getElementById(targetId).classList.remove('hidden');
    
    const isHome = viewId === 'home';
    const isProject = viewId === 'project';
    
    const fabHome = document.getElementById('fab-home');
    if (isHome) {
        fabHome.style.display = 'flex'; 
        fabHome.classList.remove('hidden');
    } else {
        fabHome.style.display = 'none';
        fabHome.classList.add('hidden');
    }

    const fabMenu = document.getElementById('fab-menu');
    if (isProject) {
        fabMenu.classList.remove('hidden');
    } else {
        fabMenu.classList.add('hidden');
    }
    
    if(!isProject) document.getElementById('app-content').scrollTop = 0;
    
    if(window.lucide) lucide.createIcons();
}

// --- RENDERIZADO HOME ---
function renderHome() {
    const list = document.getElementById('projects-list');
    list.innerHTML = '';
    let tSales=0, tCol=0, tSpent=0, tRec=0, active=0;

    projects.sort((a, b) => new Date(b.date) - new Date(a.date));

    projects.forEach(p => {
        const trans = p.transactions || [];
        const inc = trans.filter(t => t.type === 'income').reduce((s,t)=>s+t.amount,0);
        const exp = trans.filter(t => t.type === 'expense').reduce((s,t)=>s+t.amount,0);
        const pend = p.budget - inc;
        
        tSales += p.budget; tCol += inc; tSpent += exp; tRec += Math.max(0, pend);
        if(p.status === 'active') active++;

        const el = document.createElement('div');
        el.className = 'card p-4 active:bg-gray-800 transition cursor-pointer relative overflow-hidden group hover:border-gray-500';
        el.onclick = () => openProject(p.id); 
        
        const stColor = p.status === 'completed' ? 'bg-blue-500' : (pend <= 0 ? 'bg-emerald-500' : (inc > 0 ? 'bg-amber-500' : 'bg-gray-600'));
        
        el.innerHTML = `
            <div class="absolute left-0 top-0 bottom-0 w-1 ${stColor}"></div>
            <div class="pl-3">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <h4 class="font-bold text-white text-lg ${p.status === 'completed' ? 'line-through text-gray-500' : ''}">${p.name}</h4>
                        <p class="text-xs text-gray-500">${p.client || 'Sin cliente'}</p>
                    </div>
                    <div class="text-right">
                        <span class="block text-xs text-gray-500">Total</span>
                        <span class="font-bold text-white">${formatMoney(p.budget)}</span>
                    </div>
                </div>
                <div class="flex justify-between items-center mt-3 bg-black/40 p-2 rounded border border-gray-700/50">
                    <div class="text-center w-1/3 border-r border-gray-700"><p class="text-[10px] text-gray-400">Abonado</p><p class="text-sm font-bold text-emerald-400">${formatMoney(inc)}</p></div>
                     <div class="text-center w-1/3 border-r border-gray-700"><p class="text-[10px] text-gray-400">Gastado</p><p class="text-sm font-bold text-red-400">${formatMoney(exp)}</p></div>
                    <div class="text-center w-1/3"><p class="text-[10px] text-gray-400">Por Cobrar</p><p class="text-sm font-bold ${pend>0?'text-amber-500':'text-gray-500'}">${formatMoney(pend)}</p></div>
                </div>
            </div>
        `;
        list.appendChild(el);
    });
    
    if(projects.length === 0) list.innerHTML = `<div class="text-center py-10 opacity-30"><i data-lucide="folder-open" class="mx-auto mb-2" size="48"></i><p>Sin proyectos</p></div>`;

    document.getElementById('dash-cashflow').textContent = formatMoney(tCol - tSpent);
    document.getElementById('dash-receivable').textContent = formatMoney(tRec);
    document.getElementById('dash-sales').textContent = formatMoney(tSales);
    document.getElementById('active-projects-count').textContent = `${active} Activos`;
    if(window.lucide) lucide.createIcons();
}

// --- CREAR PROYECTO ---
const formNew = document.getElementById('form-new');
if(formNew) {
    formNew.addEventListener('submit', (e) => {
        e.preventDefault();
        const rawBudget = parseMoneyInput('new-budget');
        const newProject = {
            id: Date.now(),
            name: document.getElementById('new-name').value,
            budget: rawBudget,
            client: document.getElementById('new-client').value,
            phone: document.getElementById('new-phone').value,
            notes: document.getElementById('new-notes').value, 
            date: new Date().toISOString(),
            status: 'active',
            transactions: []
        };
        projects.push(newProject);
        saveData();
        e.target.reset();
        window.history.back();
    });
}

// --- DETALLE PROYECTO ---
function openProject(id) {
    currentProjectId = id;
    window.history.pushState({ view: 'project', id: id }, '', '');
    _renderProjectDetails(id);
    _internalShowView('project');
}

function _renderProjectDetails(id) {
    const p = projects.find(x => x.id === id);
    if(!p) return; 
    
    document.getElementById('p-detail-name').textContent = p.name + (p.status === 'completed' ? ' (Terminado)' : '');
    document.getElementById('pd-notes').textContent = p.notes || "Sin notas adicionales.";

    const wa = document.getElementById('whatsapp-link');
    if(p.phone) {
        let ph = p.phone.replace(/\D/g,'');
        if(!ph.startsWith('57')) ph = '57'+ph;
        wa.href = `https://wa.me/${ph}?text=Hola, sobre el proyecto ${p.name}...`;
        wa.classList.remove('hidden');
    } else wa.classList.add('hidden');

    const trans = p.transactions || [];
    const inc = trans.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
    const exp = trans.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
    const pend = p.budget - inc;
    
    document.getElementById('pd-budget').textContent = formatMoney(p.budget);
    document.getElementById('pd-pending').textContent = formatMoney(pend);
    
    const percent = p.budget > 0 ? (inc/p.budget)*100 : 0;
    document.getElementById('pd-percent').textContent = Math.round(percent) + '%';
    document.getElementById('pd-bar-income').style.width = Math.min(percent, 100) + '%';

    const list = document.getElementById('transactions-list');
    list.innerHTML = '';
    
    const sortedTrans = [...trans].sort((a,b)=>new Date(b.date)-new Date(a.date));

    if(sortedTrans.length === 0) list.innerHTML = `<p class="text-center text-gray-500 py-4 text-sm">Sin movimientos</p>`;

    sortedTrans.forEach(t => {
        const isInc = t.type === 'income';
        const div = document.createElement('div');
        div.className = 'flex justify-between items-center bg-black/40 p-3 rounded border border-gray-700/50';
        div.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="p-2 rounded-full ${isInc?'bg-emerald-500/20 text-emerald-500':'bg-red-500/20 text-red-500'}"><i data-lucide="${isInc?'arrow-down-left':'arrow-up-right'}" size="16"></i></div>
                <div><p class="text-white text-sm font-medium">${t.desc}</p><p class="text-[10px] text-gray-500 uppercase">${t.cat ? getCatLabel(t.cat) : 'Abono'} • ${new Date(t.date).toLocaleDateString()}</p></div>
            </div>
            <div class="text-right"><p class="font-bold ${isInc?'text-emerald-400':'text-white'}">${isInc?'+':'-'}${formatMoney(t.amount)}</p><button onclick="deleteTrans(${t.id})" class="text-[10px] text-red-500 opacity-50 hover:opacity-100">Borrar</button></div>
        `;
        list.appendChild(div);
    });
    if(window.lucide) lucide.createIcons();
}

// --- ACCIONES DE PROYECTO ---
function toggleProjectStatus() {
    const p = projects.find(x => x.id === currentProjectId);
    if(!p) return;
    p.status = p.status === 'active' ? 'completed' : 'active';
    saveData();
    _renderProjectDetails(currentProjectId);
}

function shareProjectStatus() {
    const p = projects.find(x => x.id === currentProjectId);
    if(!p) return;
    const trans = p.transactions || [];
    const inc = trans.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
    const pend = p.budget - inc;
    const text = `*ESTADO DE CUENTA - AM METÁLICAS*%0A%0A*Proyecto:* ${p.name}%0A*Total:* ${formatMoney(p.budget)}%0A*Abonado:* ${formatMoney(inc)}%0A*Saldo Pendiente:* ${formatMoney(pend)}%0A%0A_Generado automáticamente._`;
    let url = `https://wa.me/?text=${text}`;
    if(p.phone) {
         let ph = p.phone.replace(/\D/g,'');
         if(!ph.startsWith('57')) ph = '57'+ph;
         url = `https://wa.me/${ph}?text=${text}`;
    }
    window.open(url, '_blank');
}

// --- TRANSACCIONES ---
const formTrans = document.getElementById('form-trans');
if(formTrans) {
    formTrans.addEventListener('submit', (e) => {
        e.preventDefault();
        if(!currentProjectId) return;
        const type = document.getElementById('trans-type').value;
        const rawAmount = parseMoneyInput('trans-amount');
        const newTrans = {
            id: Date.now(),
            type,
            amount: rawAmount,
            desc: document.getElementById('trans-desc').value,
            cat: type === 'expense' ? document.querySelector('input[name="trans-cat"]:checked').value : null,
            date: new Date().toISOString()
        };
        const pIndex = projects.findIndex(x => x.id === currentProjectId);
        if(pIndex > -1) {
            projects[pIndex].transactions.push(newTrans);
            saveData();
            closeModal();
            _renderProjectDetails(currentProjectId); 
        }
    });
}

function deleteTrans(transId) {
    if(!confirm('¿Borrar este movimiento?')) return;
    const pIndex = projects.findIndex(x => x.id === currentProjectId);
    if(pIndex > -1) {
        projects[pIndex].transactions = projects[pIndex].transactions.filter(t => t.id !== transId);
        saveData();
        _renderProjectDetails(currentProjectId);
    }
}

function deleteCurrentProject() {
    if(!confirm('¿ELIMINAR PROYECTO COMPLETAMENTE?')) return;
    projects = projects.filter(x => x.id !== currentProjectId);
    saveData();
    window.history.back(); 
}

// --- COTIZADOR ---
let quoteItems = [];
function addQuoteItem() {
    quoteItems.push({ desc: '', qty: 1, price: 0 });
    renderQuoteItems();
}
function removeQuoteItem(index) {
    quoteItems.splice(index, 1);
    renderQuoteItems();
}
function updateQuoteItem(index, field, value) {
    quoteItems[index][field] = value;
    calculateQuoteTotal();
}
function renderQuoteItems() {
    const list = document.getElementById('quote-items-list');
    list.innerHTML = '';
    if(quoteItems.length === 0) quoteItems.push({desc: '', qty: 1, price: 0});
    quoteItems.forEach((item, idx) => {
        const div = document.createElement('div');
        div.className = 'bg-gray-800 p-3 rounded-lg border border-gray-700 relative';
        div.innerHTML = `
            <button onclick="removeQuoteItem(${idx})" class="absolute top-2 right-2 text-red-400 p-1 hover:text-red-300"><i data-lucide="trash-2" size="16"></i></button>
            <div class="mb-2 pr-8">
                <input type="text" class="bg-transparent text-white w-full border-b border-gray-600 focus:border-amber-500 outline-none pb-1 placeholder-gray-500 transition-colors" placeholder="Descripción" value="${item.desc}" oninput="updateQuoteItem(${idx}, 'desc', this.value)">
            </div>
            <div class="flex gap-3">
                <div class="w-1/3"><label class="text-[10px] text-gray-400 block">Cant.</label><input type="number" class="bg-gray-900 text-white w-full p-2 rounded border border-gray-600 text-center focus:border-amber-500 outline-none transition-colors" value="${item.qty}" min="1" oninput="updateQuoteItem(${idx}, 'qty', parseFloat(this.value))"></div>
                <div class="w-2/3"><label class="text-[10px] text-gray-400 block">Valor Unitario</label>
                    <input type="text" class="bg-gray-900 text-white w-full p-2 rounded border border-gray-600 text-right font-mono focus:border-amber-500 outline-none transition-colors money-input" 
                    value="${new Intl.NumberFormat('es-CO').format(item.price)}" 
                    placeholder="0" inputmode="numeric"
                    oninput="formatCurrencyInput(this); updateQuoteItem(${idx}, 'price', parseMoneyInput(this))">
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
function generatePDF() {
    const clientName = document.getElementById('q-client').value || 'Cliente General';
    const dateVal = document.getElementById('q-date').value;
    const total = calculateQuoteTotal();
    document.getElementById('print-client').textContent = clientName;
    document.getElementById('print-date').textContent = new Date(dateVal).toLocaleDateString();
    document.getElementById('print-total').textContent = formatMoney(total);
    const tbody = document.getElementById('print-items-body');
    tbody.innerHTML = '';
    quoteItems.forEach(item => {
        const subtotal = (item.qty || 0) * (item.price || 0);
        const tr = document.createElement('tr');
        tr.className = 'border-b border-gray-300';
        tr.innerHTML = `<td class="p-2 text-center">${item.qty}</td><td class="p-2">${item.desc}</td><td class="p-2 text-right">${formatMoney(item.price)}</td><td class="p-2 text-right font-bold">${formatMoney(subtotal)}</td>`;
        tbody.appendChild(tr);
    });
    window.print();
}

// --- UTILIDADES ---
function formatMoney(amount) { return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount); }
function getCatLabel(cat) { const map = { 'material': 'Material', 'labor': 'Mano Obra', 'transport': 'Transporte', 'misc': 'Varios' }; return map[cat] || cat; }

// --- MODALES ---
function openTransactionModal(type) {
    document.getElementById('trans-type').value = type;
    document.getElementById('trans-amount').value = '';
    document.getElementById('trans-desc').value = '';
    const isInc = type === 'income';
    document.getElementById('modal-title').textContent = isInc ? "Registrar Abono" : "Registrar Gasto";
    document.getElementById('btn-save-trans').textContent = isInc ? "RECIBIR DINERO" : "REGISTRAR GASTO";
    document.getElementById('btn-save-trans').className = `w-full py-4 rounded-xl font-bold text-lg mt-4 shadow-lg ${isInc?'btn-success':'btn-danger'}`;
    document.getElementById('cat-selector').classList.toggle('hidden', isInc);
    document.getElementById('trans-amount').className = `input-field text-2xl font-bold money-input ${isInc?'text-emerald-400':'text-red-400'}`;
    document.getElementById('modal-trans').classList.remove('hidden');
    document.getElementById('trans-amount').focus();
}
function closeModal() { document.getElementById('modal-trans').classList.add('hidden'); }
document.getElementById('modal-trans').addEventListener('click', (e) => { if(e.target.id === 'modal-trans') closeModal(); });
