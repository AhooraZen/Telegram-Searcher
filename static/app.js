// --- API State and DOM Elements ---
const API_BASE = '/api';
let appState = {
    status: 'unconfigured', // unconfigured, disconnected, waiting_code, waiting_password, connected
    user: null,
    phone: null
};

let paginationState = {
    type: null,
    query: null,
    limit: 50,
    next_rate: 0,
    offset_id: 0,
    offset_peer_id: null,
    offset_peer_type: null,
    has_more: false
};

// Screens
const initialLoading = document.getElementById('initial-loading');
const screenConfigure = document.getElementById('screen-configure');
const screenAuth = document.getElementById('screen-auth');
const screenDashboard = document.getElementById('screen-dashboard');

// Auth Sub-steps
const authStepPhone = document.getElementById('auth-step-phone');
const authStepCode = document.getElementById('auth-step-code');
const authStepPassword = document.getElementById('auth-step-password');
const codeSentSubtitle = document.getElementById('code-sent-subtitle');

// Profile Header
const userProfile = document.getElementById('user-profile');
const userDisplayName = document.getElementById('user-display-name');
const btnLogout = document.getElementById('btn-logout');
const footerActions = document.getElementById('footer-actions');
const btnReconfigure = document.getElementById('btn-reconfigure');

// Search Elements
const resultsContainer = document.getElementById('results-container');
const searchLoading = document.getElementById('search-loading');

// Range labels auto update
document.getElementById('limit-messages').addEventListener('input', (e) => {
    document.getElementById('val-limit-messages').textContent = e.target.value;
});
document.getElementById('limit-chats').addEventListener('input', (e) => {
    document.getElementById('val-limit-chats').textContent = e.target.value;
});
document.getElementById('limit-hashtag').addEventListener('input', (e) => {
    document.getElementById('val-limit-hashtag').textContent = e.target.value;
});

// --- Initialize App ---
document.addEventListener('DOMContentLoaded', () => {
    checkStatus();
    setupEventListeners();
});

// --- Status Management ---
async function checkStatus() {
    try {
        const response = await fetch(`${API_BASE}/status`);
        const data = await response.json();
        updateState(data);
    } catch (error) {
        showToast('خطا در برقراری ارتباط با سرور', 'error');
        console.error('Status check error:', error);
    }
}

function updateState(newState) {
    appState = { ...appState, ...newState };
    
    // Hide all main screens first
    initialLoading.classList.add('hidden');
    screenConfigure.classList.add('hidden');
    screenAuth.classList.add('hidden');
    screenDashboard.classList.add('hidden');
    
    // Hide auth sub-steps
    authStepPhone.classList.add('hidden');
    authStepCode.classList.add('hidden');
    authStepPassword.classList.add('hidden');

    // Reset profile header
    userProfile.classList.add('hidden');
    footerActions.classList.add('hidden');

    switch (appState.status) {
        case 'unconfigured':
            screenConfigure.classList.remove('hidden');
            break;
            
        case 'disconnected':
            screenAuth.classList.remove('hidden');
            authStepPhone.classList.remove('hidden');
            footerActions.classList.remove('hidden');
            break;
            
        case 'waiting_code':
            screenAuth.classList.remove('hidden');
            authStepCode.classList.remove('hidden');
            codeSentSubtitle.textContent = `کد تایید ارسال شده به تلگرام شماره ${appState.phone} را وارد کنید:`;
            footerActions.classList.remove('hidden');
            break;
            
        case 'waiting_password':
            screenAuth.classList.remove('hidden');
            authStepPassword.classList.remove('hidden');
            footerActions.classList.remove('hidden');
            break;
            
        case 'connected':
            screenDashboard.classList.remove('hidden');
            userProfile.classList.remove('hidden');
            footerActions.classList.remove('hidden');
            
            // Set user info
            if (appState.user) {
                const name = `${appState.user.first_name || ''} ${appState.user.last_name || ''}`.trim() || 'کاربر تلگرام';
                const username = appState.user.username ? ` (@${appState.user.username})` : '';
                userDisplayName.textContent = name + username;
            }
            break;
            
        case 'error':
        default:
            screenConfigure.classList.remove('hidden');
            showToast(`خطای سیستم: ${appState.message || 'وضعیت نامشخص'}`, 'error');
            break;
    }
}

// --- API Request Functions ---
async function configureAPI(apiId, apiHash) {
    showLoading(true);
    try {
        const response = await fetch(`${API_BASE}/configure`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_id: apiId, api_hash: apiHash })
        });
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.detail || 'خطا در ثبت مشخصات API');
        
        updateState(data);
        showToast('مشخصات API با موفقیت ثبت شد', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function sendAuthCode(phone) {
    showLoading(true);
    try {
        const response = await fetch(`${API_BASE}/send-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone })
        });
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.detail || 'خطا در ارسال کد تایید');
        
        updateState(data);
        showToast('کد تایید ارسال شد', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function verifyAuthCode(code) {
    showLoading(true);
    try {
        const response = await fetch(`${API_BASE}/login-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
        });
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.detail || 'کد تایید نامعتبر است');
        
        updateState(data);
        if (data.status === 'connected') {
            showToast('با موفقیت وارد حساب کاربری شدید', 'success');
            renderEmptyState();
        } else if (data.status === 'waiting_password') {
            showToast('رمز تایید دو مرحله‌ای مورد نیاز است', 'warning');
        }
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function verifyPassword(password) {
    showLoading(true);
    try {
        const response = await fetch(`${API_BASE}/login-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.detail || 'رمز عبور نامعتبر است');
        
        updateState(data);
        if (data.status === 'connected') {
            showToast('ورود با تایید دومرحله‌ای موفقیت آمیز بود', 'success');
            renderEmptyState();
        }
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function logout() {
    if (!confirm('آیا مطمئن هستید که می‌خواهید از حساب خود خارج شوید؟')) return;
    
    showLoading(true);
    try {
        const response = await fetch(`${API_BASE}/logout`, { method: 'POST' });
        const data = await response.json();
        updateState(data);
        showToast('با موفقیت خارج شدید', 'success');
        renderEmptyState();
    } catch (error) {
        showToast('خطا در انجام عملیات خروج', 'error');
    } finally {
        showLoading(false);
    }
}

// --- Search Functions ---
async function performSearch(type, query, limit, isLoadMore = false) {
    if (isLoadMore) {
        const btn = document.getElementById('btn-load-more');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> در حال بارگذاری پیام‌های بیشتر...';
        }
    } else {
        resultsContainer.innerHTML = '';
        searchLoading.classList.remove('hidden');
        
        let mode = 'normal';
        if (type === 'messages') {
            const checked = document.querySelector('input[name="search-mode-messages"]:checked');
            if (checked) mode = checked.value;
        } else if (type === 'hashtag') {
            const checked = document.querySelector('input[name="search-mode-hashtag"]:checked');
            if (checked) mode = checked.value;
        }

        // Reset pagination state for a fresh search
        paginationState = {
            type: type,
            query: query,
            limit: limit,
            next_rate: 0,
            offset_id: 0,
            offset_peer_id: null,
            offset_peer_type: null,
            mode: mode,
            has_more: false
        };
    }
    
    try {
        let url = '';
        if (type === 'messages') {
            url = `${API_BASE}/search/messages?query=${encodeURIComponent(query)}&limit=${limit}&offset_rate=${paginationState.next_rate}&offset_id=${paginationState.offset_id}&offset_peer_id=${paginationState.offset_peer_id || ''}&offset_peer_type=${paginationState.offset_peer_type || ''}&mode=${paginationState.mode}`;
        } else if (type === 'chats') {
            url = `${API_BASE}/search/chats?query=${encodeURIComponent(query)}&limit=${limit}`;
        } else if (type === 'hashtag') {
            url = `${API_BASE}/search/hashtag?hashtag=${encodeURIComponent(query)}&limit=${limit}&offset_rate=${paginationState.next_rate}&offset_id=${paginationState.offset_id}&offset_peer_id=${paginationState.offset_peer_id || ''}&offset_peer_type=${paginationState.offset_peer_type || ''}&mode=${paginationState.mode}`;
        } else if (type === 'user-groups') {
            url = `${API_BASE}/search/user-groups?username_or_id=${encodeURIComponent(query)}`;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.detail || 'خطا در جستجو');
        
        // Update pagination state
        if (type === 'messages' || type === 'hashtag') {
            paginationState.next_rate = data.next_rate || 0;
            paginationState.offset_id = data.offset_id || 0;
            paginationState.offset_peer_id = data.offset_peer_id;
            paginationState.offset_peer_type = data.offset_peer_type;
            paginationState.has_more = data.has_more || false;
        }
        
        renderResults(type, data.results, query, data.note, isLoadMore);
        
        // Handle load more button
        if (paginationState.has_more) {
            const loadMoreDiv = document.createElement('div');
            loadMoreDiv.id = 'load-more-container';
            loadMoreDiv.className = 'load-more-container';
            loadMoreDiv.style.textAlign = 'center';
            loadMoreDiv.style.marginTop = '20px';
            loadMoreDiv.style.marginBottom = '30px';
            loadMoreDiv.innerHTML = `
                <button id="btn-load-more" class="btn btn-outline" style="width: 250px;">
                    <i class="fas fa-chevron-down"></i> مشاهده پیام‌های بیشتر
                </button>
            `;
            resultsContainer.appendChild(loadMoreDiv);
            
            document.getElementById('btn-load-more').addEventListener('click', () => {
                performSearch(paginationState.type, paginationState.query, paginationState.limit, true);
            });
        }
    } catch (error) {
        showToast(error.message, 'error');
        if (isLoadMore) {
            const btn = document.getElementById('btn-load-more');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> خطا! تلاش مجدد';
            }
        } else {
            resultsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle text-danger"></i>
                    <h3>عملیات ناموفق بود</h3>
                    <p>${error.message}</p>
                </div>
            `;
        }
    } finally {
        searchLoading.classList.add('hidden');
    }
}

// --- UI Rendering Functions ---
function renderResults(type, results, query, note = null, append = false) {
    if (!append) {
        resultsContainer.innerHTML = '';
        if (note) {
            const noteAlert = document.createElement('div');
            noteAlert.className = 'alert alert-info mb-15';
            noteAlert.innerHTML = `<i class="fas fa-info-circle"></i><span>${note}</span>`;
            resultsContainer.appendChild(noteAlert);
        }
    } else {
        const oldBtn = document.getElementById('load-more-container');
        if (oldBtn) oldBtn.remove();
    }

    if (!results || results.length === 0) {
        if (!append) {
            resultsContainer.innerHTML += `
                <div class="empty-state">
                    <i class="fas fa-search-minus"></i>
                    <h3>نتیجه‌ای یافت نشد</h3>
                    <p>هیچ موردی منطبق با جستجوی شما پیدا نشد. لطفا کلمات متفاوتی را امتحان کنید.</p>
                </div>
            `;
        }
        return;
    }

    let container = resultsContainer.querySelector('.results-list');
    if (!container) {
        container = document.createElement('div');
        container.className = 'results-list';
        resultsContainer.appendChild(container);
    }
    
    if (type === 'messages' || type === 'hashtag') {
        results.forEach(msg => {
            const card = document.createElement('div');
            card.className = 'msg-card';
            
            // Format dates nicely
            const dateStr = msg.date ? new Date(msg.date).toLocaleDateString('fa-IR', {
                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            }) : 'تاریخ نامشخص';

            // Highlight words
            const highlightedText = highlightText(msg.text, query);
            
            const initials = msg.peer_name ? msg.peer_name.charAt(0) : 'T';
            const viewsCount = msg.views !== null ? formatNumber(msg.views) : '-';
            const forwardsCount = msg.forwards !== null ? formatNumber(msg.forwards) : '-';
            
            card.innerHTML = `
                <div class="msg-header">
                    <div class="msg-source">
                        <div class="source-avatar">${initials}</div>
                        <div class="source-info">
                            <span class="source-name">${msg.peer_name}</span>
                            ${msg.peer_username ? `<span class="source-username">@${msg.peer_username}</span>` : `<span class="source-username">${msg.peer_type}</span>`}
                        </div>
                    </div>
                    <div class="msg-meta">
                        <span><i class="far fa-calendar-alt"></i> ${dateStr}</span>
                    </div>
                </div>
                <div class="msg-body">${highlightedText}</div>
                <div class="msg-card-footer">
                    <div class="msg-meta">
                        <span><i class="far fa-eye"></i> ${viewsCount} بازدید</span>
                        <span><i class="fas fa-share"></i> ${forwardsCount} فوروارد</span>
                    </div>
                    <div class="msg-footer">
                        ${msg.message_link ? `
                            <a href="${msg.message_link}" target="_blank" class="btn btn-accent btn-sm">
                                <i class="fab fa-telegram-plane"></i> مشاهده پیام
                            </a>
                        ` : ''}
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    } else if (type === 'chats' || type === 'user-groups') {
        results.forEach(chat => {
            const card = document.createElement('div');
            card.className = 'chat-card';
            
            const memberCount = chat.participants_count ? `${formatNumber(chat.participants_count)} عضو` : 'تعداد اعضا نامشخص';
            
            let badges = '';
            if (chat.verified) badges += `<i class="fas fa-check-circle badge-verified" title="تایید شده"></i>`;
            if (chat.scam) badges += `<span class="badge-scam">SCAM</span>`;
            if (chat.fake) badges += `<span class="badge-scam" style="background:orange; border-color:orange;">FAKE</span>`;
            
            const typeLabel = chat.type === 'channel' ? 'کانال' : (chat.type === 'group' ? 'ابرگروه' : 'گفتگو');
            
            card.innerHTML = `
                <div class="chat-details">
                    <div class="source-avatar" style="width:40px; height:40px; font-size:1.1rem;">
                        ${chat.title ? chat.title.charAt(0) : 'T'}
                    </div>
                    <div class="chat-title-group">
                        <span class="chat-title">${chat.title} ${badges}</span>
                        <div class="chat-badges">
                            <span class="chat-type">${typeLabel}</span>
                            ${chat.source === 'live' ? `<span class="chat-type" style="background:rgba(0,176,116,0.15); border:1px solid rgba(0,176,116,0.3); color:#00b074; font-weight:bold; font-size:0.7rem;">زنده (مشترک)</span>` : ''}
                            ${chat.source === 'database' ? `<span class="chat-type" style="background:rgba(255,170,0,0.15); border:1px solid rgba(255,170,0,0.3); color:#ffaa00; font-weight:bold; font-size:0.7rem;">دیتابیس (آفلاین)</span>` : ''}
                            <span>${memberCount}</span>
                            ${chat.username ? `<span style="color:var(--color-accent);">@${chat.username}</span>` : ''}
                        </div>
                    </div>
                </div>
                <div class="chat-actions">
                    ${chat.link ? `
                        <a href="${chat.link}" target="_blank" class="btn btn-primary btn-sm">
                            <i class="fab fa-telegram-plane"></i> عضویت
                        </a>
                    ` : ''}
                </div>
            `;
            container.appendChild(card);
        });
    }
    
    resultsContainer.appendChild(container);
}

function renderEmptyState() {
    resultsContainer.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-search-plus"></i>
            <h3>آماده برای جستجو</h3>
            <p>از یکی از سربرگ‌های بالا برای شروع جستجوی عمومی استفاده کنید.</p>
        </div>
    `;
}

// --- Helper Functions ---
function setupEventListeners() {
    // Config Form
    document.getElementById('form-configure').addEventListener('submit', (e) => {
        e.preventDefault();
        const apiId = document.getElementById('api-id').value.trim();
        const apiHash = document.getElementById('api-hash').value.trim();
        configureAPI(apiId, apiHash);
    });

    // Phone Form
    document.getElementById('form-phone').addEventListener('submit', (e) => {
        e.preventDefault();
        const phone = document.getElementById('phone-number').value.trim();
        sendAuthCode(phone);
    });

    // Code Form
    document.getElementById('form-code').addEventListener('submit', (e) => {
        e.preventDefault();
        const code = document.getElementById('auth-code').value.trim();
        verifyAuthCode(code);
    });

    // Password Form
    document.getElementById('form-password').addEventListener('submit', (e) => {
        e.preventDefault();
        const password = document.getElementById('twofa-password').value.trim();
        verifyPassword(password);
    });

    // Return to Phone
    document.getElementById('btn-change-phone').addEventListener('click', () => {
        appState.phone_code_hash = null;
        updateState({ status: 'disconnected' });
    });

    // Logout
    btnLogout.addEventListener('click', logout);
    
    // Reconfigure
    const handleReconfig = () => {
        if (confirm('آیا می‌خواهید کلیدهای API ثبت شده را تغییر دهید؟ با این کار اتصال فعلی قطع خواهد شد.')) {
            configureAPI('', ''); // Clear credentials
        }
    };
    btnReconfigure.addEventListener('click', handleReconfig);
    const btnResetApiPhone = document.getElementById('btn-reset-api-phone');
    if (btnResetApiPhone) {
        btnResetApiPhone.addEventListener('click', handleReconfig);
    }

    // Tab Switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            
            btn.classList.add('active');
            const targetPane = document.getElementById(btn.getAttribute('data-tab'));
            targetPane.classList.add('active');
            
            // Clear current search results
            renderEmptyState();
        });
    });

    // Search Forms
    document.getElementById('form-search-messages').addEventListener('submit', (e) => {
        e.preventDefault();
        const query = document.getElementById('query-messages').value.trim();
        const limit = document.getElementById('limit-messages').value;
        performSearch('messages', query, limit);
    });

    document.getElementById('form-search-chats').addEventListener('submit', (e) => {
        e.preventDefault();
        const query = document.getElementById('query-chats').value.trim();
        const limit = document.getElementById('limit-chats').value;
        performSearch('chats', query, limit);
    });

    document.getElementById('form-search-hashtag').addEventListener('submit', (e) => {
        e.preventDefault();
        const query = document.getElementById('query-hashtag').value.trim();
        const limit = document.getElementById('limit-hashtag').value;
        performSearch('hashtag', query, limit);
    });

    document.getElementById('form-search-user-groups').addEventListener('submit', (e) => {
        e.preventDefault();
        const query = document.getElementById('query-user-groups').value.trim();
        performSearch('user-groups', query, null);
    });

    // Crawler Form Submit
    document.getElementById('form-crawl-group').addEventListener('submit', (e) => {
        e.preventDefault();
        const group = document.getElementById('query-crawl-group').value.trim();
        startCrawling(group);
    });
}

function showLoading(show) {
    const activeBtn = document.querySelector('.btn-block:not(.hidden), .auth-step:not(.hidden) .btn:not(.hidden)');
    if (activeBtn) {
        if (show) {
            activeBtn.disabled = true;
            activeBtn.dataset.originalHtml = activeBtn.innerHTML;
            activeBtn.innerHTML = '<div class="spinner" style="width:20px; height:20px; border-width:2px; display:inline-block; margin:0;"></div> در حال پردازش...';
        } else {
            activeBtn.disabled = false;
            if (activeBtn.dataset.originalHtml) {
                activeBtn.innerHTML = activeBtn.dataset.originalHtml;
            }
        }
    }
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast'; // Reset
    
    if (type === 'error') toast.classList.add('toast-error');
    if (type === 'success') toast.classList.add('toast-success');
    
    toast.classList.remove('hidden');
    
    // Auto hide
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 4000);
}

function highlightText(text, query) {
    if (!text || !query) return text || '';
    
    // Escape regex characters
    const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    
    // Simple split query words to highlight individual parts if long search
    const words = escapedQuery.split(/\s+/).filter(w => w.length > 1);
    if (words.length === 0) words.push(escapedQuery);
    
    let highlighted = text;
    try {
        words.forEach(word => {
            const regex = new RegExp(`(${word})`, 'gi');
            highlighted = highlighted.replace(regex, '<mark class="highlight">$1</mark>');
        });
    } catch (e) {
        console.error('Highlight regex error:', e);
    }
    
    return highlighted;
}

function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return num;
}

let crawlInterval = null;

async function startCrawling(group) {
    const btn = document.querySelector('#form-crawl-group button');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> در حال ارسال درخواست...';
    
    try {
        const response = await fetch(`${API_BASE}/crawl`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ group })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || 'خطا در ثبت درخواست خزش');
        
        showToast('فرآیند خزش اعضا شروع شد', 'success');
        document.getElementById('crawler-progress-container').classList.remove('hidden');
        document.getElementById('crawler-target-name').textContent = `گروه: ${group}`;
        
        // Start polling
        if (crawlInterval) clearInterval(crawlInterval);
        crawlInterval = setInterval(pollCrawlerStatus, 2000);
        pollCrawlerStatus();
    } catch (error) {
        showToast(error.message, 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-cogs"></i> شروع استخراج و ایندکس اعضا';
    }
}

async function pollCrawlerStatus() {
    try {
        const response = await fetch(`${API_BASE}/crawl/status`);
        const data = await response.json();
        
        // Get the latest active or completed crawl
        const keys = Object.keys(data);
        if (keys.length === 0) return;
        
        const latestKey = keys[keys.length - 1];
        const crawl = data[latestKey];
        
        const bar = document.getElementById('crawler-bar');
        const percentLabel = document.getElementById('crawler-percent');
        const processedLabel = document.getElementById('crawler-processed');
        const statusLabel = document.getElementById('crawler-status-label');
        const targetLabel = document.getElementById('crawler-target-name');
        const btn = document.querySelector('#form-crawl-group button');
        
        targetLabel.textContent = `گروه: ${latestKey}`;
        processedLabel.textContent = `تعداد استخراج شده: ${crawl.crawled} ${crawl.total ? 'از ' + crawl.total : ''}`;
        
        let percent = 0;
        if (crawl.total > 0) {
            percent = Math.min(Math.round((crawl.crawled / crawl.total) * 100), 100);
        } else if (crawl.status === 'completed') {
            percent = 100;
        } else {
            percent = 0;
        }
        
        bar.style.width = `${percent}%`;
        percentLabel.textContent = `${percent}%`;
        
        if (crawl.status === 'crawling') {
            statusLabel.textContent = 'وضعیت: در حال استخراج اعضا...';
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> در حال خزش...';
        } else if (crawl.status === 'completed') {
            statusLabel.textContent = 'وضعیت: با موفقیت تکمیل شد!';
            bar.style.backgroundColor = 'var(--color-success)';
            clearInterval(crawlInterval);
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-cogs"></i> شروع استخراج و ایندکس اعضا';
            showToast('عملیات خزش و ایندکس اعضای گروه با موفقیت به پایان رسید!', 'success');
        } else if (crawl.status === 'failed') {
            statusLabel.textContent = `وضعیت: شکست خورد (${crawl.error})`;
            bar.style.backgroundColor = 'var(--color-danger)';
            clearInterval(crawlInterval);
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-cogs"></i> شروع استخراج و ایندکس اعضا';
            showToast(`خزش با خطا مواجه شد: ${crawl.error}`, 'error');
        }
    } catch (e) {
        console.error('Error polling crawl status:', e);
    }
}
