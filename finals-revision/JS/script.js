// =============================================
// 1. CONFIGURATION & STATE
// =============================================
const CONFIG = {
    COIN_URL: 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=true&price_change_percentage=1h,24h',
    GLOBAL_URL: 'https://api.coingecko.com/api/v3/global',
    STORAGE_KEY: 'crypto_favs',
    STORAGE_THEME: 'crypto_theme'
};

const state = {
    allCoins: [],
    favorites: JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY)) || [],
    currentView: 'all',
    searchQuery: '',
    sort: { col: 'rank', dir: 'asc' },
    refreshTimer: null,
    countdown: null,
    countdownValue: 0
};

const el = {
    tableBody:        () => document.getElementById('table-body'),
    statusDisplay:    () => document.getElementById('status-display'),
    navAll:           () => document.getElementById('nav-all'),
    navFav:           () => document.getElementById('nav-fav'),
    searchInput:      () => document.getElementById('search-input'),
    searchClear:      () => document.getElementById('search-clear'),
    themeToggle:      () => document.getElementById('theme-toggle'),
    refreshInterval:  () => document.getElementById('refresh-interval'),
    refreshCountdown: () => document.getElementById('refresh-countdown')
};

// =============================================
// 2. THEME
// =============================================
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    el.themeToggle().textContent = theme === 'dark' ? '🌙' : '☀️';
    localStorage.setItem(CONFIG.STORAGE_THEME, theme);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(current === 'dark' ? 'light' : 'dark');
}

// =============================================
// 3. AUTO-REFRESH
// =============================================
function clearRefreshTimers() {
    if (state.refreshTimer)  { clearInterval(state.refreshTimer);  state.refreshTimer = null; }
    if (state.countdown)     { clearInterval(state.countdown);     state.countdown = null; }
    el.refreshCountdown().textContent = '';
}

function startAutoRefresh(seconds) {
    clearRefreshTimers();
    if (seconds === 0) return;

    state.countdownValue = seconds;
    el.refreshCountdown().textContent = `${seconds}s`;

    state.countdown = setInterval(() => {
        state.countdownValue--;
        el.refreshCountdown().textContent = `${state.countdownValue}s`;
        if (state.countdownValue <= 0) state.countdownValue = seconds;
    }, 1000);

    state.refreshTimer = setInterval(() => {
        state.countdownValue = seconds;
        loadDashboardData(false);
    }, seconds * 1000);
}

// =============================================
// 4. DATA FETCHING
// =============================================
async function loadDashboardData(showLoading = true) {
    if (showLoading) el.statusDisplay().textContent = 'Fetching market data...';

    try {
        const [coinRes, globalRes] = await Promise.all([
            fetch(CONFIG.COIN_URL),
            fetch(CONFIG.GLOBAL_URL)
        ]);

        if (!coinRes.ok || !globalRes.ok) throw new Error('API connection failed');

        const coinData   = await coinRes.json();
        const globalData = await globalRes.json();

        state.allCoins = coinData;

        renderGlobalStats(globalData.data);
        renderCoinTable();
        el.statusDisplay().textContent = '';
    } catch (err) {
        el.statusDisplay().innerHTML = `<span style="color:var(--red)">⚠ Error: ${err.message}. CoinGecko may be rate-limiting — try again shortly.</span>`;
        console.error('Dashboard error:', err);
    }
}

// =============================================
// 5. GLOBAL STATS RENDER
// =============================================
function renderGlobalStats(data) {
    const fmt = n => '$' + abbreviate(n);
    document.getElementById('global-mcap').textContent    = fmt(data.total_market_cap.usd);
    document.getElementById('global-volume').textContent  = fmt(data.total_volume.usd);
    document.getElementById('btc-dominance').textContent  = `${data.market_cap_percentage.btc.toFixed(1)}%`;

    const pct = data.market_cap_change_percentage_24h_usd;
    const pill = document.getElementById('global-mcap-change');
    pill.textContent  = `${pct > 0 ? '▲' : '▼'} ${Math.abs(pct).toFixed(2)}%`;
    pill.className    = `percentage-pill ${pct > 0 ? 'positive' : 'negative'}`;
}

// =============================================
// 6. SORT
// =============================================
function sortCoins(coins) {
    const { col, dir } = state.sort;
    const mult = dir === 'asc' ? 1 : -1;

    return [...coins].sort((a, b) => {
        switch (col) {
            case 'rank':   return mult * (a.market_cap_rank - b.market_cap_rank);
            case 'name':   return mult * a.name.localeCompare(b.name);
            case 'h1':     return mult * ((a.price_change_percentage_1h_in_currency || 0) - (b.price_change_percentage_1h_in_currency || 0));
            case 'h24':    return mult * ((a.price_change_percentage_24h || 0) - (b.price_change_percentage_24h || 0));
            case 'price':  return mult * (a.current_price - b.current_price);
            case 'mcap':   return mult * (a.market_cap - b.market_cap);
            case 'volume': return mult * (a.total_volume - b.total_volume);
            default: return 0;
        }
    });
}

function updateSortArrows(activeCol, dir) {
    document.querySelectorAll('th.sortable').forEach(th => {
        const arrow = th.querySelector('.sort-arrow');
        const col   = th.dataset.col;
        if (col === activeCol) {
            arrow.classList.add('active-sort');
            arrow.classList.toggle('desc', dir === 'desc');
        } else {
            arrow.classList.remove('active-sort', 'desc');
        }
    });
}

// =============================================
// 7. SPARKLINE (inline SVG)
// =============================================
function buildSparkline(prices, isPositive) {
    if (!prices || prices.length < 2) return '<span style="opacity:.3">—</span>';

    const W = 90, H = 36, pad = 2;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;

    const pts = prices.map((p, i) => {
        const x = pad + (i / (prices.length - 1)) * (W - pad * 2);
        const y = pad + (1 - (p - min) / range) * (H - pad * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    const color = isPositive ? '#4ade80' : '#ff5252';
    const lastX  = parseFloat(pts.split(' ').at(-1).split(',')[0]);
    const lastY  = parseFloat(pts.split(' ').at(-1).split(',')[1]);

    return `<svg class="sparkline-svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
        <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" opacity="0.85"/>
        <circle cx="${lastX}" cy="${lastY}" r="2.2" fill="${color}"/>
    </svg>`;
}

// =============================================
// 8. COIN TABLE RENDER
// =============================================
function renderCoinTable() {
    const tbody = el.tableBody();
    tbody.innerHTML = '';

    let list = state.currentView === 'favorites'
        ? state.allCoins.filter(c => state.favorites.includes(c.id))
        : [...state.allCoins];

    // Search filter
    const q = state.searchQuery.toLowerCase().trim();
    if (q) {
        list = list.filter(c =>
            c.name.toLowerCase().includes(q) ||
            c.symbol.toLowerCase().includes(q)
        );
    }

    // Sort
    list = sortCoins(list);
    updateSortArrows(state.sort.col, state.sort.dir);

    if (list.length === 0) {
        tbody.innerHTML = `<tr class="no-results"><td colspan="9">
            ${state.currentView === 'favorites' ? 'No favorites yet — click the star on any coin.' :
              q ? `No coins match "<strong>${q}</strong>".` : 'No data available.'}
        </td></tr>`;
        return;
    }

    list.forEach((coin, idx) => {
        const isFav    = state.favorites.includes(coin.id);
        const h1       = coin.price_change_percentage_1h_in_currency || 0;
        const h24      = coin.price_change_percentage_24h || 0;
        const spark    = buildSparkline(coin.sparkline_in_7d?.price, h24 >= 0);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="star ${isFav ? 'active' : ''}" data-id="${coin.id}">${isFav ? '★' : '☆'}</span></td>
            <td>${coin.market_cap_rank}</td>
            <td>
                <div class="coin-cell">
                    <img src="${coin.image}" alt="${coin.name}" loading="lazy">
                    <div><strong>${coin.name}</strong> <span class="symbol">${coin.symbol.toUpperCase()}</span></div>
                </div>
            </td>
            <td class="${h1 >= 0 ? 'positive' : 'negative'}">${h1 >= 0 ? '▲' : '▼'} ${Math.abs(h1).toFixed(2)}%</td>
            <td class="${h24 >= 0 ? 'positive' : 'negative'}">${h24 >= 0 ? '▲' : '▼'} ${Math.abs(h24).toFixed(2)}%</td>
            <td>$${coin.current_price.toLocaleString()}</td>
            <td>$${abbreviate(coin.market_cap)}</td>
            <td>$${abbreviate(coin.total_volume)}</td>
            <td class="sparkline-cell">${spark}</td>
        `;
        tbody.appendChild(tr);
    });
}

// =============================================
// 9. FAVORITES TOGGLE
// =============================================
document.addEventListener('click', e => {
    const star = e.target.closest('.star');
    if (!star) return;
    const id = star.dataset.id;
    if (state.favorites.includes(id)) {
        state.favorites = state.favorites.filter(f => f !== id);
    } else {
        state.favorites.push(id);
    }
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(state.favorites));
    renderCoinTable();
});

// =============================================
// 10. HELPERS
// =============================================
function abbreviate(n) {
    if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T';
    if (n >= 1e9)  return (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6)  return (n / 1e6).toFixed(2) + 'M';
    return n.toLocaleString();
}

// =============================================
// 11. EVENT LISTENERS
// =============================================
el.navAll().addEventListener('click', () => {
    state.currentView = 'all';
    el.navAll().classList.add('active');
    el.navFav().classList.remove('active');
    renderCoinTable();
});

el.navFav().addEventListener('click', () => {
    state.currentView = 'favorites';
    el.navFav().classList.add('active');
    el.navAll().classList.remove('active');
    renderCoinTable();
});

el.searchInput().addEventListener('input', e => {
    state.searchQuery = e.target.value;
    el.searchClear().style.display = e.target.value ? 'block' : 'none';
    renderCoinTable();
});

el.searchClear().addEventListener('click', () => {
    el.searchInput().value = '';
    state.searchQuery = '';
    el.searchClear().style.display = 'none';
    el.searchInput().focus();
    renderCoinTable();
});

el.themeToggle().addEventListener('click', toggleTheme);

el.refreshInterval().addEventListener('change', e => {
    startAutoRefresh(parseInt(e.target.value, 10));
});

document.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
        const col = th.dataset.col;
        if (state.sort.col === col) {
            state.sort.dir = state.sort.dir === 'asc' ? 'desc' : 'asc';
        } else {
            state.sort.col = col;
            state.sort.dir = 'asc';
        }
        renderCoinTable();
    });
});

// =============================================
// 12. INIT
// =============================================
(function init() {
    const savedTheme = localStorage.getItem(CONFIG.STORAGE_THEME) || 'dark';
    applyTheme(savedTheme);
    loadDashboardData(true);
    startAutoRefresh(30); // default 30s
})();
