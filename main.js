/**
 * Interactive Alba Order Assistant (Precise Tap & Swipe)
 * Clean & Fixed Version
 */

// --- 1. 데이터 관리 ---
const defaultMenu = [
    { id: 1, name: '아메리카노', price: 3000, category: '커피', qty: 0 },
    { id: 2, name: '카페라떼', price: 3500, category: '커피', qty: 0 },
    { id: 3, name: '초코라떼', price: 4000, category: '음료', qty: 0 },
    { id: 4, name: '얼그레이', price: 3500, category: '티', qty: 0 }
];

let menuData = JSON.parse(localStorage.getItem('albaMenu_v4')) || defaultMenu;
let orderHistory = JSON.parse(localStorage.getItem('albaHistory')) || [];
let currentView = 'order';
let currentCategory = menuData.length > 0 ? menuData[0].category : '';
let currentSettingsCategory = '';
let tempMenuData = []; // 설정 편집용 임시 데이터

// --- 2. DOM 요소 ---
const viewTitle = document.getElementById('view-title');
const views = document.querySelectorAll('.view');
const navBtns = document.querySelectorAll('.nav-btn');
const settingsBtn = document.getElementById('settings-btn');
const cancelSettingsBtn = document.getElementById('cancel-settings');
const saveSettingsBtn = document.getElementById('save-settings');
const categoryBar = document.getElementById('category-bar');
const settingsCategoryBar = document.getElementById('settings-category-bar');
const orderMenuList = document.getElementById('order-menu-list');
const finalOrderList = document.getElementById('final-order-list');
const historyList = document.getElementById('history-list');
const settingsMenuList = document.getElementById('settings-menu-list');
const summaryTotalQty = document.getElementById('summary-total-qty');
const summaryTotalPrice = document.getElementById('summary-total-price');
const finishOrderBtn = document.getElementById('finish-order-btn');
const feedbackLayer = document.getElementById('feedback-layer');

// --- 3. 화면 전환 ---
navBtns.forEach(btn => {
    btn.onclick = () => {
        // 설정 화면에서 나갈 때 (탭 클릭 시)는 기본적으로 취소로 간주하거나 경고를 줄 수 있으나
        // 여기선 탭 클릭 시에도 설정 화면을 벗어나면 취소 처리함
        switchView(btn.dataset.view);
        navBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    };
});

if (settingsBtn) settingsBtn.onclick = () => {
    // 설정 진입 시 현재 데이터 복사
    tempMenuData = JSON.parse(JSON.stringify(menuData));
    switchView('settings');
};

if (cancelSettingsBtn) cancelSettingsBtn.onclick = () => {
    // 수정 사항 버리고 복구
    tempMenuData = [];
    switchView('order');
};

if (saveSettingsBtn) saveSettingsBtn.onclick = () => {
    // 임시 데이터를 실제 데이터로 반영
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

    // 하단 탭 버튼 활성화 상태 동기화 (설정 버튼 클릭 시 등 대응)
    navBtns.forEach(b => {
        b.classList.toggle('active', b.dataset.view === viewName);
    });

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
    }
}

// --- 4. 주문 화면 (정밀 탭 & 스와이프 로직) ---
function renderOrderView() {
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

        let startX = 0;
        let startY = 0;
        let currentX = 0;
        let moved = false;

        li.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            currentX = startX;
            li.style.transition = 'none';
            moved = false;
        }, { passive: true });

        li.addEventListener('touchmove', (e) => {
            currentX = e.touches[0].clientX;
            let currentY = e.touches[0].clientY;
            let diffX = currentX - startX;
            let diffY = currentY - startY;

            if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) {
                moved = true; 
            }

            if (moved && Math.abs(diffX) > Math.abs(diffY)) {
                if (diffX < 0) {
                    let moveX = Math.max(diffX, -120);
                    li.style.transform = `translateX(${moveX}px)`;
                    if (moveX < -60) li.classList.add('swipe-ready');
                    else li.classList.remove('swipe-ready');
                }
            }
        }, { passive: true });

        li.addEventListener('touchend', (e) => {
            const endX = e.changedTouches[0].clientX;
            const diffX = endX - startX;
            
            li.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            li.style.transform = 'translateX(0)';
            li.classList.remove('swipe-ready');

            const isBtn = e.target.closest('.qty-btn');
            if (isBtn) {
                startX = 0; currentX = 0; moved = false;
                return;
            }

            if (!moved) {
                handleItemAction(item.id, 1, e);
            } else if (diffX < -60) {
                handleItemAction(item.id, 5, e);
            }

            startX = 0; currentX = 0; moved = false;
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
    
    let x, y;
    if (event && event.changedTouches && event.changedTouches.length > 0) {
        x = event.changedTouches[0].clientX;
        y = event.changedTouches[0].clientY;
    } else {
        x = window.innerWidth / 2;
        y = window.innerHeight / 2;
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

// --- 5. 확인 화면 & 주문 완료 ---
function renderSummaryView() {
    finalOrderList.innerHTML = '';
    const ordered = menuData.filter(i => i.qty > 0);
    
    if (ordered.length === 0) {
        finalOrderList.innerHTML = '<li class="empty-msg">주문 내역이 없습니다.</li>';
        summaryTotalQty.textContent = '0';
        summaryTotalPrice.textContent = '0원';
        finishOrderBtn.disabled = true;
        finishOrderBtn.style.opacity = '0.3';
        return;
    }

    finishOrderBtn.disabled = false;
    finishOrderBtn.style.opacity = '1';

    let totalQty = 0;
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
            if (e.target.closest('.qty-btn')) return;
            updateQty(item.id, 1, e);
            renderSummaryView();
        };
        finalOrderList.appendChild(li);
        totalQty += item.qty;
        totalPrice += (item.price * item.qty);
    });

    summaryTotalQty.textContent = totalQty;
    summaryTotalPrice.textContent = `${totalPrice.toLocaleString()}원`;
}

if (finishOrderBtn) {
    finishOrderBtn.onclick = () => {
        const ordered = menuData.filter(i => i.qty > 0);
        if (ordered.length === 0) return;

        if (confirm('주문을 완료하고 기록하시겠습니까?')) {
            const total = ordered.reduce((sum, i) => sum + (i.price * i.qty), 0);
            const orderRecord = {
                id: Date.now(),
                date: new Date().toLocaleString(),
                items: ordered.map(i => `${i.name} x${i.qty}`),
                totalPrice: total
            };

            orderHistory.unshift(orderRecord);
            localStorage.setItem('albaHistory', JSON.stringify(orderHistory));

            menuData.forEach(i => i.qty = 0);
            saveData();
            alert('주문이 기록되었습니다.');
            switchView('history');
            
            navBtns.forEach(b => b.classList.remove('active'));
            const historyNav = document.querySelector('[data-view="history"]');
            if (historyNav) historyNav.classList.add('active');
        }
    };
}

// --- 6. 히스토리 화면 ---
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

// --- 7. 설정 및 유틸리티 ---
function initSettingsEvents() {
    const addBtn = document.getElementById('add-menu-btn');
    if (addBtn) {
        addBtn.onclick = () => {
            const newId = Date.now();
            const category = currentSettingsCategory || (tempMenuData.length > 0 ? [...new Set(tempMenuData.map(i => i.category))][0] : '기타');
            tempMenuData.push({ id: newId, name: '새 메뉴', price: 0, category: category, qty: 0 });
            renderSettingsView();
        };
    }
}

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
        addCatBtn.textContent = '+ 분류 추가';
        addCatBtn.onclick = () => {
            const newCatName = prompt('새로운 카테고리 이름을 입력하세요:');
            if (newCatName && newCatName.trim()) {
                currentSettingsCategory = newCatName.trim();
                const newId = Date.now();
                tempMenuData.push({ id: newId, name: '새 메뉴', price: 0, category: currentSettingsCategory, qty: 0 });
                renderSettingsView();
            }
        };
        settingsCategoryBar.appendChild(addCatBtn);
    }

    settingsMenuList.innerHTML = '';
    const filtered = tempMenuData.filter(i => i.category === currentSettingsCategory);

    filtered.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'settings-item';
        div.dataset.id = item.id;
        div.innerHTML = `
            <div class="settings-row">
                <div class="drag-handle">☰</div>
                <input type="text" value="${item.name}" onchange="updateMenuInfo(${item.id}, 'name', this.value)">
                <input type="number" value="${item.price}" onchange="updateMenuInfo(${item.id}, 'price', this.value)">
                <button class="btn-del" onclick="deleteMenu(${item.id})">삭제</button>
            </div>
        `;
        settingsMenuList.appendChild(div);
    });

    initSortable();
}
let sortableInstance = null;

function initSortable() {
    if (typeof Sortable === 'undefined') return;
    if (sortableInstance) sortableInstance.destroy();

    sortableInstance = Sortable.create(settingsMenuList, {
        animation: 200,
        handle: '.settings-item',
        delay: 250,
        delayOnTouchOnly: true,
        touchStartThreshold: 5,
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        onStart: function() {
            if (navigator.vibrate) navigator.vibrate(20);
        },
        onEnd: function (evt) {
            reorderMenuData();
        }
    });
}

function reorderMenuData() {
    const currentCategoryItems = Array.from(settingsMenuList.children);
    const newOrderedIds = currentCategoryItems.map(el => parseInt(el.dataset.id));

    const otherCategoryMenus = tempMenuData.filter(i => i.category !== currentSettingsCategory);
    const sortedCurrentMenus = newOrderedIds.map(id => tempMenuData.find(i => i.id === id));

    tempMenuData = [...otherCategoryMenus, ...sortedCurrentMenus];
}

function updateMenuInfo(id, field, value) {
    const item = tempMenuData.find(i => i.id === id);
    if (item) {
        if (field === 'price') value = parseInt(value) || 0;
        item[field] = value;
    }
}

function deleteMenu(id) {
    if (confirm('삭제하시겠습니까?')) {
        tempMenuData = tempMenuData.filter(i => i.id !== id);
        renderSettingsView();
    }
}

const resetBtn = document.getElementById('reset-order-btn');
if (resetBtn) {
    resetBtn.onclick = () => {
        if (confirm('현재 주문을 취소하시겠습니까?')) {
            menuData.forEach(i => i.qty = 0);
            saveData();
            switchView(currentView);
        }
    };
}

function saveData() {
    localStorage.setItem('albaMenu_v4', JSON.stringify(menuData));
}

function preventZoom() {
    document.addEventListener('touchstart', (event) => {
        if (event.touches.length > 1) event.preventDefault();
    }, { passive: false });

    document.addEventListener('gesturestart', (event) => {
        event.preventDefault();
    });

    // 롱 프레스 시스템 메뉴 및 돋보기 방지
    document.addEventListener('contextmenu', (event) => {
        if (event.target.tagName !== 'INPUT' && event.target.tagName !== 'TEXTAREA') {
            event.preventDefault();
        }
    }, false);
}

window.onload = () => {
    switchView('order');
    initSettingsEvents();
    preventZoom();
};

// 전역 함수
window.updateQty = updateQty;
window.renderSummaryView = renderSummaryView;
window.deleteMenu = deleteMenu;
window.updateMenuInfo = updateMenuInfo;
