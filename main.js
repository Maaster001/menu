/**
 * Interactive Alba Order Assistant (Precise Tap & Swipe)
 * Multi-Store Support Version
 */

// --- 1. 데이터 관리 ---
const defaultMenu = [
    { id: 1, name: '아메리카노', price: 3000, category: '커피', qty: 0 },
    { id: 2, name: '카페라떼', price: 3500, category: '커피', qty: 0 },
    { id: 3, name: '초코라떼', price: 4000, category: '음료', qty: 0 },
    { id: 4, name: '얼그레이', price: 3500, category: '티', qty: 0 }
];

let stores = [];
let currentStoreId = null;
let menuData = [];
let orderHistory = [];
let currentView = 'order';
let currentCategory = '';
let currentSettingsCategory = '';
let tempMenuData = [];

function initData() {
    try {
        const storedStores = localStorage.getItem('albaStores');
        stores = storedStores ? JSON.parse(storedStores) : [];
        currentStoreId = localStorage.getItem('albaCurrentStoreId');

        if (!Array.isArray(stores) || stores.length === 0) {
            const legacyMenu = localStorage.getItem('albaMenu_v4');
            const legacyHistory = localStorage.getItem('albaHistory');
            const initialStore = {
                id: 'store_' + Date.now(),
                name: '기본 가게',
                menuData: legacyMenu ? JSON.parse(legacyMenu) : defaultMenu,
                orderHistory: legacyHistory ? JSON.parse(legacyHistory) : []
            };
            stores = [initialStore];
            currentStoreId = initialStore.id;
            saveStores();
        }

        if (!currentStoreId || !stores.find(s => s.id === currentStoreId)) {
            currentStoreId = stores[0].id;
        }
        
        loadActiveStoreData();
    } catch (e) {
        console.error("Data init error", e);
        // Emergency recovery
        stores = [{ id: 'emergency', name: '복구된 가게', menuData: defaultMenu, orderHistory: [] }];
        currentStoreId = 'emergency';
        loadActiveStoreData();
    }
}

function loadActiveStoreData() {
    const activeStore = stores.find(s => s.id === currentStoreId) || stores[0];
    if (activeStore) {
        currentStoreId = activeStore.id;
        menuData = activeStore.menuData || [];
        orderHistory = activeStore.orderHistory || [];
        currentCategory = menuData.length > 0 ? menuData[0].category : '';
        localStorage.setItem('albaCurrentStoreId', currentStoreId);
    }
}

function saveStores() {
    localStorage.setItem('albaStores', JSON.stringify(stores));
    localStorage.setItem('albaCurrentStoreId', currentStoreId);
}

function saveData() {
    const activeStore = stores.find(s => s.id === currentStoreId);
    if (activeStore) {
        activeStore.menuData = menuData;
        activeStore.orderHistory = orderHistory;
        saveStores();
    }
}

// --- 2. DOM 요소 ---
let viewTitle, views, navBtns, storeMenuBtn, backToAppBtn, storesList, addStoreBtn;
let cancelSettingsBtn, saveSettingsBtn, categoryBar, settingsCategoryBar, orderMenuList;
let finalOrderList, historyList, settingsMenuList, summaryTotalPrice, finishOrderBtn, feedbackLayer;

function initDOMElements() {
    viewTitle = document.getElementById('view-title');
    views = document.querySelectorAll('.view');
    navBtns = document.querySelectorAll('.nav-btn');
    storeMenuBtn = document.getElementById('store-menu-btn');
    backToAppBtn = document.getElementById('back-to-app');
    storesList = document.getElementById('stores-list');
    addStoreBtn = document.getElementById('add-store-btn');
    cancelSettingsBtn = document.getElementById('cancel-settings');
    saveSettingsBtn = document.getElementById('save-settings');
    categoryBar = document.getElementById('category-bar');
    settingsCategoryBar = document.getElementById('settings-category-bar');
    orderMenuList = document.getElementById('order-menu-list');
    finalOrderList = document.getElementById('final-order-list');
    historyList = document.getElementById('history-list');
    settingsMenuList = document.getElementById('settings-menu-list');
    summaryTotalPrice = document.getElementById('summary-total-price');
    finishOrderBtn = document.getElementById('finish-order-btn');
    feedbackLayer = document.getElementById('feedback-layer');
}

// --- 3. 화면 전환 ---
function switchView(viewName) {
    currentView = viewName;
    views.forEach(v => v.classList.add('hidden'));
    const targetView = document.getElementById(`view-${viewName}`);
    if (targetView) targetView.classList.remove('hidden');

    navBtns.forEach(b => b.classList.toggle('active', b.dataset.view === viewName));
    if (storeMenuBtn) storeMenuBtn.classList.toggle('hidden', viewName === 'stores');

    if (viewName === 'order') {
        const activeStore = stores.find(s => s.id === currentStoreId);
        viewTitle.textContent = '주문 받기' + (activeStore ? ` (${activeStore.name})` : '');
        renderOrderView();
    } else if (viewName === 'summary') {
        viewTitle.textContent = '주문 확인';
        renderSummaryView();
    } else if (viewName === 'history') {
        viewTitle.textContent = '주문 기록';
        renderHistoryView();
    } else if (viewName === 'settings') {
        viewTitle.textContent = '메뉴 설정';
        renderSettingsView();
    } else if (viewName === 'stores') {
        viewTitle.textContent = '가게 관리';
        renderStoresView();
    }
}

// --- 4. 주문 화면 ---
function renderOrderView() {
    if (!orderMenuList) return;
    const categories = [...new Set(menuData.map(item => item.category))];
    if (!currentCategory && categories.length > 0) currentCategory = categories[0];
    
    categoryBar.innerHTML = '';
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = `cat-btn ${currentCategory === cat ? 'active' : ''}`;
        btn.textContent = cat;
        btn.onclick = () => { currentCategory = cat; renderOrderView(); };
        categoryBar.appendChild(btn);
    });

    orderMenuList.innerHTML = '';
    const filtered = menuData.filter(i => i.category === currentCategory);
    filtered.forEach(item => {
        const li = document.createElement('li');
        li.className = 'menu-item';
        li.innerHTML = `
            <div class="item-info">
                <div class="item-name">${item.name}</div>
                <div class="item-price">${item.price.toLocaleString()}원</div>
            </div>
            <div class="qty-controls">
                <span class="qty-display">${item.qty}</span>
                <button class="qty-btn" onclick="event.stopPropagation(); updateQty(${item.id}, -1)">-</button>
            </div>
            <div class="swipe-indicator">+5</div>
        `;

        let startX = 0, startY = 0, moved = false;
        li.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX; startY = e.touches[0].clientY;
            li.style.transition = 'none'; moved = false;
        }, { passive: true });

        li.addEventListener('touchmove', (e) => {
            let curX = e.touches[0].clientX, curY = e.touches[0].clientY;
            let dX = curX - startX, dY = curY - startY;
            if (Math.abs(dX) > 10 || Math.abs(dY) > 10) moved = true;
            if (moved && Math.abs(dX) > Math.abs(dY)) {
                if (dX < 0) {
                    let moveX = Math.max(dX, -120);
                    li.style.transform = `translateX(${moveX}px)`;
                    li.classList.toggle('swipe-ready', moveX < -60);
                }
            }
        }, { passive: true });

        li.addEventListener('touchend', (e) => {
            li.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            li.style.transform = 'translateX(0)';
            li.classList.remove('swipe-ready');
            if (e.target.closest('.qty-btn')) return;
            if (!moved) handleItemAction(item.id, 1, e);
            else if (e.changedTouches[0].clientX - startX < -60) handleItemAction(item.id, 5, e);
        }, { passive: true });

        orderMenuList.appendChild(li);
    });
}

function handleItemAction(id, delta, event) {
    const item = menuData.find(i => i.id === id);
    if (!item) return;
    item.qty = Math.max(0, item.qty + delta);
    saveData();
    renderOrderView();
    showFeedback(delta, event);
}

function showFeedback(delta, event) {
    const text = document.createElement('div');
    text.className = 'floating-text';
    text.textContent = `+${delta}`;
    let x = window.innerWidth / 2, y = window.innerHeight / 2;
    if (event && event.changedTouches && event.changedTouches.length > 0) {
        x = event.changedTouches[0].clientX; y = event.changedTouches[0].clientY;
    }
    text.style.left = `${x}px`; text.style.top = `${y}px`;
    feedbackLayer.appendChild(text);
    setTimeout(() => text.remove(), 600);
}

function updateQty(id, delta, event) {
    const item = menuData.find(i => i.id === id);
    if (item) {
        item.qty = Math.max(0, item.qty + delta);
        saveData();
        renderOrderView();
        if (delta > 0 && event) showFeedback(delta, event);
    }
}

// --- 5. 확인 및 히스토리 ---
function renderSummaryView() {
    finalOrderList.innerHTML = '';
    const ordered = menuData.filter(i => i.qty > 0);
    if (ordered.length === 0) {
        finalOrderList.innerHTML = '<li class="empty-msg">주문 내역이 없습니다.</li>';
        summaryTotalPrice.textContent = '0원';
        finishOrderBtn.disabled = true; finishOrderBtn.style.opacity = '0.3';
        return;
    }
    finishOrderBtn.disabled = false; finishOrderBtn.style.opacity = '1';

    let totalPrice = 0;
    ordered.forEach(item => {
        const li = document.createElement('li');
        li.className = 'menu-item';
        li.innerHTML = `
            <div class="item-info">
                <div class="item-name">${item.name} <small>x ${item.qty}</small></div>
                <div class="item-price">${(item.price * item.qty).toLocaleString()}원</div>
            </div>
            <div class="qty-controls"><button class="qty-btn" onclick="event.stopPropagation(); updateQty(${item.id}, -1); renderSummaryView();">-</button></div>
        `;
        li.onclick = (e) => { if (!e.target.closest('.qty-btn')) { updateQty(item.id, 1, e); renderSummaryView(); } };
        finalOrderList.appendChild(li);
        totalPrice += (item.price * item.qty);
    });
    summaryTotalPrice.textContent = `${totalPrice.toLocaleString()}원`;
}

function renderHistoryView() {
    historyList.innerHTML = '';
    if (orderHistory.length === 0) {
        historyList.innerHTML = '<div class="empty-msg">기록된 주문이 없습니다.</div>';
        return;
    }
    orderHistory.forEach(order => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `
            <div class="history-date">${order.date}</div>
            <div class="history-content">${order.items.join(', ')}</div>
            <div class="history-total">합계: ${order.totalPrice.toLocaleString()}원</div>
        `;
        historyList.appendChild(div);
    });
}

// --- 6. 설정 화면 ---
function renderSettingsView() {
    const categories = [...new Set(tempMenuData.map(item => item.category))];
    if (!currentSettingsCategory && categories.length > 0) currentSettingsCategory = categories[0];

    settingsCategoryBar.innerHTML = '';
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = `cat-btn ${currentSettingsCategory === cat ? 'active' : ''}`;
        btn.textContent = cat;
        btn.onclick = () => { currentSettingsCategory = cat; renderSettingsView(); };
        settingsCategoryBar.appendChild(btn);
    });
    const addCatBtn = document.createElement('button');
    addCatBtn.className = 'cat-btn add-cat-btn'; addCatBtn.textContent = '+';
    addCatBtn.onclick = () => {
        const name = prompt('새로운 카테고리 이름을 입력하세요:');
        if (name && name.trim()) {
            currentSettingsCategory = name.trim();
            tempMenuData.push({ id: Date.now(), name: '새 메뉴', price: 0, category: currentSettingsCategory, qty: 0 });
            renderSettingsView();
        }
    };
    settingsCategoryBar.appendChild(addCatBtn);

    settingsMenuList.innerHTML = '';
    const filtered = tempMenuData.filter(i => i.category === currentSettingsCategory);
    filtered.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'settings-item';
        itemEl.dataset.id = item.id;
        itemEl.innerHTML = `
            <div class="settings-row">
                <div class="drag-handle">☰</div>
                <input type="text" value="${item.name}" onchange="updateMenuInfo(${item.id}, 'name', this.value)">
                <input type="number" value="${item.price}" onchange="updateMenuInfo(${item.id}, 'price', this.value)">
            </div>
            <button class="btn-del" onclick="deleteMenu(${item.id})">삭제</button>
        `;

        const row = itemEl.querySelector('.settings-row');
        let startX = 0, moved = false;
        itemEl.addEventListener('touchstart', (e) => {
            if (e.target.closest('.drag-handle') || e.target.tagName === 'INPUT') return;
            startX = e.touches[0].clientX; row.style.transition = 'none'; moved = false;
        }, { passive: true });
        itemEl.addEventListener('touchmove', (e) => {
            let dX = e.touches[0].clientX - startX;
            if (Math.abs(dX) > 10) moved = true;
            if (moved) {
                row.style.transform = `translateX(${Math.min(0, Math.max(dX, -80))}px)`;
                if (Math.abs(dX) > 20 && document.activeElement.tagName === 'INPUT') document.activeElement.blur();
            }
        }, { passive: true });
        itemEl.addEventListener('touchend', (e) => {
            row.style.transition = 'transform 0.3s';
            let dX = e.changedTouches[0].clientX - startX;
            row.style.transform = (moved && dX < -40) ? 'translateX(-80px)' : 'translateX(0)';
        }, { passive: true });

        settingsMenuList.appendChild(itemEl);
    });
    initSortable();
}

function initSortable() {
    if (typeof Sortable !== 'undefined' && settingsMenuList) {
        Sortable.create(settingsMenuList, {
            handle: '.drag-handle', animation: 200,
            onEnd: () => {
                const newIds = Array.from(settingsMenuList.children).map(el => parseInt(el.dataset.id));
                const others = tempMenuData.filter(i => i.category !== currentSettingsCategory);
                const current = newIds.map(id => tempMenuData.find(i => i.id === id));
                tempMenuData = [...others, ...current];
            }
        });
    }
}

function updateMenuInfo(id, field, value) {
    const item = tempMenuData.find(i => i.id === id);
    if (item) item[field] = (field === 'price') ? (parseInt(value) || 0) : value;
}

function deleteMenu(id) {
    tempMenuData = tempMenuData.filter(i => i.id !== id);
    renderSettingsView();
}

// --- 7. 가게 관리 ---
function renderStoresView() {
    storesList.innerHTML = '';
    stores.forEach(store => {
        const itemEl = document.createElement('div');
        itemEl.className = `store-item ${store.id === currentStoreId ? 'active' : ''}`;
        itemEl.innerHTML = `
            <div class="store-row">
                <div class="store-info"><div class="store-name">${store.name}</div><div class="store-meta">메뉴: ${store.menuData.length}개 / 기록: ${store.orderHistory.length}건</div></div>
            </div>
            <div class="store-actions">
                <button class="btn-edit" onclick="event.stopPropagation(); editStore('${store.id}')">수정</button>
                <button class="btn-del" onclick="event.stopPropagation(); deleteStore('${store.id}')">삭제</button>
            </div>
        `;
        const row = itemEl.querySelector('.store-row');
        let startX = 0, moved = false;
        itemEl.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; row.style.transition = 'none'; moved = false; }, { passive: true });
        itemEl.addEventListener('touchmove', (e) => {
            let dX = e.touches[0].clientX - startX;
            if (Math.abs(dX) > 10) moved = true;
            if (moved) {
                if (e.cancelable) e.preventDefault();
                row.style.transform = `translateX(${Math.min(0, Math.max(dX, -140))}px)`;
            }
        }, { passive: false });
        itemEl.addEventListener('touchend', (e) => {
            row.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            let dX = e.changedTouches[0].clientX - startX;
            row.style.transform = (moved && dX < -70) ? 'translateX(-140px)' : 'translateX(0)';
        }, { passive: true });
        itemEl.onclick = (e) => { if (!moved && !e.target.closest('.store-actions')) { currentStoreId = store.id; loadActiveStoreData(); saveStores(); switchView('order'); } };
        storesList.appendChild(itemEl);
    });
}

function editStore(id) {
    const store = stores.find(s => s.id === id);
    if (!store) return;
    const newName = prompt('가게 이름을 수정하세요:', store.name);
    if (newName && newName.trim()) { store.name = newName.trim(); saveStores(); renderStoresView(); }
}

function deleteStore(id) {
    if (stores.length <= 1) { alert('최소 하나 이상의 가게가 있어야 합니다.'); return; }
    stores = stores.filter(s => s.id !== id);
    if (currentStoreId === id) { currentStoreId = stores[0].id; loadActiveStoreData(); }
    saveStores(); renderStoresView();
}

// --- 8. 초기화 ---
function initPullToRefresh() {
    let startY = 0;
    const main = document.querySelector('.app-main');
    const indicator = document.getElementById('refresh-indicator');
    const refreshText = indicator.querySelector('.refresh-text');
    const threshold = 100;
    
    document.addEventListener('touchstart', (e) => { if (main.scrollTop === 0) { startY = e.touches[0].pageY; indicator.style.transition = 'none'; } else { startY = -1; } }, { passive: true });
    document.addEventListener('touchmove', (e) => {
        if (startY === -1) return;
        const diff = e.touches[0].pageY - startY;
        if (diff > 0) {
            const moveY = Math.min(diff * 0.4, threshold + 20);
            indicator.style.transform = `translateY(${moveY}px)`;
            refreshText.textContent = moveY > threshold ? '놓아서 새로고침' : '당겨서 새로고침';
        }
    }, { passive: true });
    document.addEventListener('touchend', (e) => {
        if (startY === -1) return;
        const diff = e.changedTouches[0].pageY - startY;
        if (diff * 0.4 > threshold) {
            indicator.classList.add('refreshing'); refreshText.textContent = '새로고침 중...';
            indicator.style.transition = 'transform 0.3s'; indicator.style.transform = `translateY(${threshold}px)`;
            setTimeout(() => location.reload(), 500);
        } else {
            indicator.style.transition = 'transform 0.3s'; indicator.style.transform = 'translateY(0)';
        }
        startY = -1;
    }, { passive: true });
}

window.onload = () => {
    initDOMElements();
    initData();
    
    navBtns.forEach(btn => {
        btn.onclick = () => {
            const targetView = btn.dataset.view;
            if (targetView === 'settings') tempMenuData = JSON.parse(JSON.stringify(menuData));
            switchView(targetView);
        };
    });

    if (storeMenuBtn) storeMenuBtn.onclick = () => switchView('stores');
    if (backToAppBtn) backToAppBtn.onclick = () => switchView('order');
    if (addStoreBtn) addStoreBtn.onclick = () => {
        const name = prompt('새로운 가게 이름을 입력하세요:');
        if (name && name.trim()) {
            stores.push({ id: 'store_' + Date.now(), name: name.trim(), menuData: JSON.parse(JSON.stringify(defaultMenu)), orderHistory: [] });
            saveStores(); renderStoresView();
        }
    };
    if (cancelSettingsBtn) cancelSettingsBtn.onclick = () => { tempMenuData = []; switchView('order'); };
    if (saveSettingsBtn) saveSettingsBtn.onclick = () => { menuData = JSON.parse(JSON.stringify(tempMenuData)); saveData(); tempMenuData = []; switchView('order'); };
    if (finishOrderBtn) finishOrderBtn.onclick = () => {
        const ordered = menuData.filter(i => i.qty > 0); if (ordered.length === 0) return;
        const total = ordered.reduce((sum, i) => sum + (i.price * i.qty), 0);
        orderHistory.unshift({ id: Date.now(), date: new Date().toLocaleString(), items: ordered.map(i => `${i.name} x${i.qty}`), totalPrice: total });
        menuData.forEach(i => i.qty = 0); saveData(); switchView('history');
    };

    switchView('order');
    initPullToRefresh();
};

window.updateMenuInfo = updateMenuInfo;
window.deleteMenu = deleteMenu;
window.editStore = editStore;
window.deleteStore = deleteStore;
window.updateQty = updateQty;
window.renderSummaryView = renderSummaryView;
