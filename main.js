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

let stores = JSON.parse(localStorage.getItem('albaStores')) || [];
let currentStoreId = localStorage.getItem('albaCurrentStoreId');

// 초기 마이그레이션 및 데이터 로드
function initData() {
    const legacyMenu = localStorage.getItem('albaMenu_v4');
    const legacyHistory = localStorage.getItem('albaHistory');

    if (stores.length === 0) {
        const initialStore = {
            id: 'store_' + Date.now(),
            name: '기본 가게',
            menuData: legacyMenu ? JSON.parse(legacyMenu) : defaultMenu,
            orderHistory: legacyHistory ? JSON.parse(legacyHistory) : []
        };
        stores.push(initialStore);
        currentStoreId = initialStore.id;
        saveStores();
    }

    if (!currentStoreId || !stores.find(s => s.id === currentStoreId)) {
        currentStoreId = stores[0].id;
    }
    
    localStorage.setItem('albaCurrentStoreId', currentStoreId);
    loadActiveStoreData();
}

let menuData = [];
let orderHistory = [];
let currentView = 'order';
let currentCategory = '';
let currentSettingsCategory = '';
let tempMenuData = [];

function loadActiveStoreData() {
    const activeStore = stores.find(s => s.id === currentStoreId);
    if (activeStore) {
        menuData = activeStore.menuData;
        orderHistory = activeStore.orderHistory;
        currentCategory = menuData.length > 0 ? menuData[0].category : '';
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
const viewTitle = document.getElementById('view-title');
const views = document.querySelectorAll('.view');
const navBtns = document.querySelectorAll('.nav-btn');
const storeMenuBtn = document.getElementById('store-menu-btn');
const backToAppBtn = document.getElementById('back-to-app');
const storesList = document.getElementById('stores-list');
const addStoreBtn = document.getElementById('add-store-btn');

const cancelSettingsBtn = document.getElementById('cancel-settings');
const saveSettingsBtn = document.getElementById('save-settings');
const categoryBar = document.getElementById('category-bar');
const settingsCategoryBar = document.getElementById('settings-category-bar');
const orderMenuList = document.getElementById('order-menu-list');
const finalOrderList = document.getElementById('final-order-list');
const historyList = document.getElementById('history-list');
const settingsMenuList = document.getElementById('settings-menu-list');
const summaryTotalPrice = document.getElementById('summary-total-price');
const finishOrderBtn = document.getElementById('finish-order-btn');
const feedbackLayer = document.getElementById('feedback-layer');

// --- 3. 화면 전환 및 내비게이션 ---
navBtns.forEach(btn => {
    btn.onclick = () => {
        const targetView = btn.dataset.view;
        if (targetView === 'settings') {
            tempMenuData = JSON.parse(JSON.stringify(menuData));
        }
        switchView(targetView);
    };
});

if (storeMenuBtn) storeMenuBtn.onclick = () => switchView('stores');
if (backToAppBtn) backToAppBtn.onclick = () => switchView('order');

if (cancelSettingsBtn) cancelSettingsBtn.onclick = () => {
    tempMenuData = [];
    switchView('order');
};

if (saveSettingsBtn) saveSettingsBtn.onclick = () => {
    menuData = JSON.parse(JSON.stringify(tempMenuData));
    saveData();
    tempMenuData = [];
    switchView('order');
};

function switchView(viewName) {
    currentView = viewName;
    views.forEach(v => v.classList.add('hidden'));
    const targetView = document.getElementById(`view-${viewName}`);
    if (targetView) targetView.classList.remove('hidden');

    navBtns.forEach(b => b.classList.toggle('active', b.dataset.view === viewName));
    if (storeMenuBtn) storeMenuBtn.classList.toggle('hidden', viewName === 'stores');

    if (viewName === 'order') {
        viewTitle.textContent = '주문 받기';
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

// --- 4. 주문 화면 로직 ---
function renderOrderView() {
    const activeStore = stores.find(s => s.id === currentStoreId);
    const storeDisplayName = activeStore ? ` (${activeStore.name})` : '';
    viewTitle.textContent = '주문 받기' + storeDisplayName;

    const categories = [...new Set(menuData.map(item => item.category))];
    if (!currentCategory && categories.length > 0) currentCategory = categories[0];
    
    categoryBar.innerHTML = '';
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = `cat-btn ${currentCategory === cat ? 'active' : ''}`;
        btn.textContent = cat;
        btn.onclick = () => {
            currentCategory = cat;
            renderOrderView();
        };
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
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            li.style.transition = 'none';
            moved = false;
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
        x = event.changedTouches[0].clientX;
        y = event.changedTouches[0].clientY;
    }
    text.style.left = `${x}px`;
    text.style.top = `${y}px`;
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
        finishOrderBtn.disabled = true;
        finishOrderBtn.style.opacity = '0.3';
        return;
    }
    finishOrderBtn.disabled = false;
    finishOrderBtn.style.opacity = '1';

    let totalPrice = 0;
    ordered.forEach(item => {
        const li = document.createElement('li');
        li.className = 'menu-item';
        li.innerHTML = `
            <div class="item-info">
                <div class="item-name">${item.name} <small>x ${item.qty}</small></div>
                <div class="item-price">${(item.price * item.qty).toLocaleString()}원</div>
            </div>
            <div class="qty-controls">
                <button class="qty-btn" onclick="event.stopPropagation(); updateQty(${item.id}, -1); renderSummaryView();">-</button>
            </div>
        `;
        li.onclick = (e) => {
            if (!e.target.closest('.qty-btn')) {
                updateQty(item.id, 1, e);
                renderSummaryView();
            }
        };
        finalOrderList.appendChild(li);
        totalPrice += (item.price * item.qty);
    });
    summaryTotalPrice.textContent = `${totalPrice.toLocaleString()}원`;
}

if (finishOrderBtn) {
    finishOrderBtn.onclick = () => {
        const ordered = menuData.filter(i => i.qty > 0);
        if (ordered.length === 0) return;
        const total = ordered.reduce((sum, i) => sum + (i.price * i.qty), 0);
        orderHistory.unshift({
            id: Date.now(),
            date: new Date().toLocaleString(),
            items: ordered.map(i => `${i.name} x${i.qty}`),
            totalPrice: total
        });
        menuData.forEach(i => i.qty = 0);
        saveData();
        switchView('history');
    };
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

    if (settingsCategoryBar) {
        settingsCategoryBar.innerHTML = '';
        categories.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = `cat-btn ${currentSettingsCategory === cat ? 'active' : ''}`;
            btn.textContent = cat;
            btn.onclick = () => {
                currentSettingsCategory = cat;
                renderSettingsView();
            };
            settingsCategoryBar.appendChild(btn);
        });
        const addCatBtn = document.createElement('button');
        addCatBtn.className = 'cat-btn add-cat-btn';
        addCatBtn.textContent = '+';
        addCatBtn.onclick = () => {
            const name = prompt('새로운 카테고리 이름을 입력하세요:');
            if (name && name.trim()) {
                currentSettingsCategory = name.trim();
                tempMenuData.push({ id: Date.now(), name: '새 메뉴', price: 0, category: currentSettingsCategory, qty: 0 });
                renderSettingsView();
            }
        };
        settingsCategoryBar.appendChild(addCatBtn);
    }

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
        let startX = 0, startY = 0, moved = false, isSwiping = false;

        itemEl.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            row.style.transition = 'none';
            moved = false;
            isSwiping = true;
        }, { passive: true });

        itemEl.addEventListener('touchmove', (e) => {
            if (!isSwiping) return;
            let dX = e.touches[0].clientX - startX;
            let dY = e.touches[0].clientY - startY;
            if (!moved && Math.abs(dX) > 10) moved = true;
            if (moved && Math.abs(dX) > Math.abs(dY)) {
                if (dX < 0) {
                    row.style.transform = `translateX(${Math.max(dX, -80)}px)`;
                    if (Math.abs(dX) > 20 && document.activeElement.tagName === 'INPUT') document.activeElement.blur();
                } else {
                    row.style.transform = 'translateX(0)';
                }
            }
        }, { passive: true });

        itemEl.addEventListener('touchend', (e) => {
            isSwiping = false;
            row.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            let dX = e.changedTouches[0].clientX - startX;
            row.style.transform = (moved && dX < -40) ? 'translateX(-80px)' : 'translateX(0)';
        }, { passive: true });

        settingsMenuList.appendChild(itemEl);
    });
    initSortable();
}

let sortableInstance = null;
function initSortable() {
    if (typeof Sortable === 'undefined') return;
    if (sortableInstance) sortableInstance.destroy();
    sortableInstance = Sortable.create(settingsMenuList, {
        animation: 200,
        delay: 300,
        delayOnTouchOnly: true,
        touchStartThreshold: 5,
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        onStart: function() { if (navigator.vibrate) navigator.vibrate(30); },
        onEnd: () => {
            const newIds = Array.from(settingsMenuList.children).map(el => parseInt(el.dataset.id));
            const others = tempMenuData.filter(i => i.category !== currentSettingsCategory);
            const current = newIds.map(id => tempMenuData.find(i => i.id === id));
            tempMenuData = [...others, ...current];
        }
    });
}

window.updateMenuInfo = (id, field, value) => {
    const item = tempMenuData.find(i => i.id === id);
    if (item) item[field] = (field === 'price') ? (parseInt(value) || 0) : value;
};

window.deleteMenu = (id) => {
    tempMenuData = tempMenuData.filter(i => i.id !== id);
    renderSettingsView();
};

// --- 7. 가게 관리 로직 ---
function renderStoresView() {
    storesList.innerHTML = '';
    stores.forEach(store => {
        const itemEl = document.createElement('div');
        itemEl.className = `store-item ${store.id === currentStoreId ? 'active' : ''}`;
        itemEl.innerHTML = `
            <div class="store-row">
                <div class="store-info">
                    <div class="store-name">${store.name}</div>
                    <div class="store-meta">메뉴: ${store.menuData.length}개 / 기록: ${store.orderHistory.length}건</div>
                </div>
            </div>
            <div class="store-actions">
                <button class="btn-edit" onclick="event.stopPropagation(); editStore('${store.id}')">수정</button>
                <button class="btn-del" onclick="event.stopPropagation(); deleteStore('${store.id}')">삭제</button>
            </div>
        `;
        
        const row = itemEl.querySelector('.store-row');
        let startX = 0, moved = false;
        itemEl.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            row.style.transition = 'none';
            moved = false;
        }, { passive: true });
        itemEl.addEventListener('touchmove', (e) => {
            let dX = e.touches[0].clientX - startX;
            if (Math.abs(dX) > 10) moved = true;
            if (moved) row.style.transform = `translateX(${Math.min(0, Math.max(dX, -140))}px)`;
        }, { passive: true });
        itemEl.addEventListener('touchend', (e) => {
            row.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            let dX = e.changedTouches[0].clientX - startX;
            row.style.transform = (moved && dX < -70) ? 'translateX(-140px)' : 'translateX(0)';
        }, { passive: true });

        itemEl.onclick = (e) => {
            if (!moved && !e.target.closest('.store-actions')) selectStore(store.id);
        };
        storesList.appendChild(itemEl);
    });
}

function selectStore(id) {
    currentStoreId = id;
    loadActiveStoreData();
    saveStores();
    switchView('order');
}

function addStore() {
    const name = prompt('새로운 가게 이름을 입력하세요:');
    if (name && name.trim()) {
        stores.push({ id: 'store_' + Date.now(), name: name.trim(), menuData: JSON.parse(JSON.stringify(defaultMenu)), orderHistory: [] });
        saveStores();
        renderStoresView();
    }
}

function editStore(id) {
    const store = stores.find(s => s.id === id);
    if (!store) return;
    const newName = prompt('가게 이름을 수정하세요:', store.name);
    if (newName && newName.trim()) {
        store.name = newName.trim();
        saveStores();
        renderStoresView();
    }
}

function deleteStore(id) {
    if (stores.length <= 1) {
        alert('최소 하나 이상의 가게가 있어야 합니다.');
        return;
    }
    stores = stores.filter(s => s.id !== id);
    if (currentStoreId === id) {
        currentStoreId = stores[0].id;
        loadActiveStoreData();
    }
    saveStores();
    renderStoresView();
}

if (addStoreBtn) addStoreBtn.onclick = addStore;

// --- 8. 초기화 ---
function preventZoom() {
    document.addEventListener('touchstart', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('contextmenu', (e) => {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') e.preventDefault();
    }, false);
}

window.onload = () => {
    initData();
    switchView('order');
    preventZoom();
    const addMenuBtn = document.getElementById('add-menu-btn');
    if (addMenuBtn) addMenuBtn.onclick = () => {
        const cat = currentSettingsCategory || '기타';
        tempMenuData.push({ id: Date.now(), name: '새 메뉴', price: 0, category: cat, qty: 0 });
        renderSettingsView();
    };
};

window.editStore = editStore;
window.deleteStore = deleteStore;
