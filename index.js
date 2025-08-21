const radios = document.querySelectorAll('input[name="identity"]');
const checkboxSection = document.getElementById('more-info');
const checkbox = document.getElementById('checkbox');
const formA = document.getElementById('look-up-by-name');
const formB = document.getElementById('look-up-by-id');
const inputSection = document.getElementById('input-section');
const inputId = document.getElementById('input-id');
const inputLabel = document.getElementById('input-label');
const searchSection = document.getElementById('search-section');
const search = document.getElementById('search');
const form = document.getElementById('sanction-form');
const resultsSection = document.getElementById('results');
// Sidebar elements
const overlay = document.getElementById('sidebar-overlay');
const sidebar = document.getElementById('detail-sidebar');
const sidebarContent = document.getElementById('sidebar-content');
const sidebarClose = document.getElementById('sidebar-close');
const sidebarDownloadBtn = document.getElementById('sidebar-download');
const sidebarOpenFullBtn = document.getElementById('sidebar-open-full');

// Global state for accumulated results
const appState = { items: [] };

// Lightweight status/alert helpers rendered above results
function getStatusArea() {
    let area = document.getElementById('status-area');
    if (!area) {
        area = document.createElement('div');
        area.id = 'status-area';
        area.setAttribute('role', 'status');
        area.setAttribute('aria-live', 'polite');
        // place at top of results section
        resultsSection.prepend(area);
    }
    return area;
}

function setStatus(message, type = 'info') {
    const area = getStatusArea();
    area.className = `alert alert-${type}`;
    area.textContent = message;
}

function clearStatus() {
    const area = document.getElementById('status-area');
    if (area && area.parentElement) area.parentElement.removeChild(area);
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function flattenObject(obj) {
    const rows = [];
    const visit = (value, keyPath) => {
        if (value !== null && typeof value === 'object') {
            if (Array.isArray(value)) {
                if (value.length === 0) {
                    rows.push([keyPath, '[]']);
                } else {
                    value.forEach((v, i) => visit(v, `${keyPath}[${i}]`));
                }
            } else {
                const keys = Object.keys(value);
                if (keys.length === 0) {
                    rows.push([keyPath, '{}']);
                } else {
                    for (const k of keys) {
                        visit(value[k], keyPath ? `${keyPath}.${k}` : k);
                    }
                }
            }
        } else {
            rows.push([keyPath, value]);
        }
    };
    visit(obj, '');
    return rows.filter(([k]) => k);
}

function ensureResultsTable() {
    let table = document.getElementById('results-table');
    if (table) return table;

    const wrapper = document.createElement('div');
    wrapper.className = 'results-table-wrapper';
    const heading = document.createElement('h3');
    heading.textContent = 'Results';
    table = document.createElement('table');
    table.id = 'results-table';
    table.className = 'results-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Country</th>
                <th>Gender</th>
                <th>Primary Info</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;
    wrapper.appendChild(table);
    resultsSection.appendChild(heading);
    resultsSection.appendChild(wrapper);
    return table;
}

function normalizeStr(val) {
    if (Array.isArray(val)) return val[0] ?? '';
    return val ?? '';
}

function prettifyCategory(key) {
    return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function pickPrimaryInfo(item) {
    const candidates = [
        normalizeStr(item.position),
        normalizeStr(item.program),
        normalizeStr(item.notes),
        normalizeStr(item.topics),
        normalizeStr(item.datasets),
        normalizeStr(item.alias),
    ];
    const val = candidates.find(v => v && String(v).trim());
    return Array.isArray(val) ? val[0] : (val || '');
}

function extractEntities(json) {
    const out = [];
    const data = json && json.data ? json.data : json;
    if (!data || typeof data !== 'object') return out;
    const categories = [
        'sanctions','pep','crime','debarment','financial_services','government','role','religion','military','frozen_asset','personOfInterest'
    ];
    for (const cat of categories) {
        const arr = Array.isArray(data[cat]) ? data[cat] : [];
        for (const item of arr) {
            const name = normalizeStr(item.name) || normalizeStr(item.title) || 'Unknown';
            const country = normalizeStr(item.country) || normalizeStr(item.nationality) || '';
            const gender = normalizeStr(item.gender) || '';
            const primary = pickPrimaryInfo(item);
            out.push({
                name,
                category: prettifyCategory(cat),
                country: String(country).toUpperCase(),
                gender,
                primary,
                raw: item,
                meta: {
                    queriedWith: data.queriedWith || '',
                    query: data.query || '',
                }
            });
        }
    }
    if (out.length === 0) {
        // fallback: treat entire data as one entity
        out.push({
            name: normalizeStr(data.name) || 'Unknown',
            category: 'Result',
            country: normalizeStr(data.country) || '',
            gender: normalizeStr(data.gender) || '',
            primary: pickPrimaryInfo(data),
            raw: data,
            meta: {
                queriedWith: data.queriedWith || '',
                query: data.query || '',
            }
        });
    }
    return out;
}

function selectPrimaryEntity(json) {
    const data = json && json.data ? json.data : json;
    if (!data || typeof data !== 'object') return null;
    const priority = ['pep','sanctions','crime','debarment','financial_services','government','role','religion','military','frozen_asset','personOfInterest'];
    for (const cat of priority) {
        const arr = Array.isArray(data[cat]) ? data[cat] : [];
        if (arr.length) {
            const item = arr[0];
            const name = normalizeStr(item.name) || normalizeStr(item.title) || 'Unknown';
            const country = normalizeStr(item.country) || normalizeStr(item.nationality) || '';
            const gender = normalizeStr(item.gender) || '';
            const primary = pickPrimaryInfo(item);
            return {
                name,
                category: prettifyCategory(cat),
                country: String(country).toUpperCase(),
                gender,
                primary,
                raw: item,
                meta: {
                    queriedWith: data.queriedWith || '',
                    query: data.query || '',
                }
            };
        }
    }
    // fallback: use data-level info
    return {
        name: normalizeStr(data.name) || (data.query ? `Result for ${data.query}` : 'Result'),
        category: 'Result',
        country: normalizeStr(data.country) || '',
        gender: normalizeStr(data.gender) || '',
        primary: pickPrimaryInfo(data),
        raw: data,
        meta: {
            queriedWith: data.queriedWith || '',
            query: data.query || '',
        }
    };
}

function appendRow(entity) {
    const table = ensureResultsTable();
    const tbody = table.querySelector('tbody');
    const index = appState.items.push(entity) - 1;
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td data-label="Name">${escapeHtml(entity.name)}</td>
        <td data-label="Category">${escapeHtml(entity.category)}</td>
        <td data-label="Country">${escapeHtml(entity.country)}</td>
        <td data-label="Gender">${escapeHtml(entity.gender)}</td>
        <td data-label="Primary Info">${escapeHtml(entity.primary)}</td>
        <td data-label="Actions"><button class="btn btn-secondary btn-view" data-index="${index}">View</button></td>
    `;
    tbody.appendChild(tr);
}

function appendRows(entities) {
    const table = ensureResultsTable();
    const tbody = table.querySelector('tbody');
    const fragments = document.createDocumentFragment();
    for (const entity of entities) {
        const index = appState.items.push(entity) - 1;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td data-label="Name">${escapeHtml(entity.name)}</td>
            <td data-label="Category">${escapeHtml(entity.category)}</td>
            <td data-label="Country">${escapeHtml(entity.country)}</td>
            <td data-label="Gender">${escapeHtml(entity.gender)}</td>
            <td data-label="Primary Info">${escapeHtml(entity.primary)}</td>
            <td data-label="Actions"><button class="btn btn-secondary btn-view" data-index="${index}">View</button></td>
        `;
        fragments.appendChild(tr);
    }
    tbody.appendChild(fragments);
}

function openSidebar(index) {
    const entity = appState.items[index];
    if (!entity) return;
    // Build details view
    const details = [];
    details.push(['Name', entity.name]);
    details.push(['Category', entity.category]);
    details.push(['Country', entity.country]);
    details.push(['Gender', entity.gender]);
    details.push(['Primary Info', entity.primary]);
    if (entity.meta.queriedWith) details.push(['Queried With', entity.meta.queriedWith]);
    if (entity.meta.query) details.push(['Query', entity.meta.query]);
    const flat = flattenObject(entity.raw);
    for (const [k,v] of flat) {
        details.push([k, v]);
    }
    sidebarContent.innerHTML = details.map(([k,v]) => `
        <div class="kv"><b>${escapeHtml(k)}:</b> <span>${escapeHtml(String(v))}</span></div>
    `).join('');

    // Attach current index for actions
    sidebarContent.dataset.index = String(index);

    overlay.classList.add('show');
    sidebar.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    sidebar.setAttribute('aria-hidden', 'false');
}

function closeSidebar() {
    overlay.classList.remove('show');
    sidebar.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    sidebar.setAttribute('aria-hidden', 'true');
}

function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 0);
}

function updateForms() {
    try {
        searchSection.classList.remove('active')
        checkboxSection.classList.remove('active');
        formA.classList.remove('active');
        formB.classList.remove('active');
        inputSection.classList.remove('active');
    
        const selected = document.querySelector('input[name="identity"]:checked');
        
        if (!selected) return;

        if (selected.value === "Name") {
            checkboxSection.classList.add('active');
            inputLabel.textContent = 'Name';
            inputId.placeholder = 'Enter your name';
            inputSection.classList.add('active')
            searchSection.classList.add('active');
            if (checkbox.checked) {
                formA.classList.add('active');
                searchSection.classList.add('active');
            }
        } else if (selected.value === "Identity Number") {
            checkboxSection.classList.add('active');
            inputLabel.textContent = 'Identity Number';
            inputId.placeholder = 'Enter your identity number';
            inputSection.classList.add('active');
            searchSection.classList.add('active');
            if (checkbox.checked) {
                formB.classList.add('active');
                searchSection.classList.add('active');
            }
        }
    } catch (err) {
        console.error("Error in updateForms:", err);
    }
}

function setDynamicRequireds() {
    // Base: main input always required
    inputId.required = true;
    // Resolve duplicate IDs by scoping to forms
    const nameF = formA.querySelector('#fname');
    const nameL = formA.querySelector('#lname');
    const idF = formB.querySelector('#fname');
    const idL = formB.querySelector('#lname');
    [nameF, nameL, idF, idL].forEach(el => { if (el) el.required = false; });

    const selected = document.querySelector('input[name="identity"]:checked');
    if (!selected) return;

    if (checkbox.checked) {
        if (selected.value === 'Name') {
            if (nameF) nameF.required = true;
            if (nameL) nameL.required = true;
        } else if (selected.value === 'Identity Number') {
            if (idF) idF.required = true;
            if (idL) idL.required = true;
        }
    }
}

function validateInputs() {
    const selected = document.querySelector('input[name="identity"]:checked');
    if (!selected) {
        alert('Please select Name or Identity Number');
        return false;
    }
    if (!inputId.value.trim()) {
        inputId.reportValidity?.();
        inputId.focus();
        alert('Please enter a value to search');
        return false;
    }
    if (checkbox.checked) {
        if (selected.value === 'Name') {
            const f = formA.querySelector('#fname');
            const l = formA.querySelector('#lname');
            if (f && !f.value.trim()) { f.focus(); alert('First Name is required'); return false; }
            if (l && !l.value.trim()) { l.focus(); alert('Last Name is required'); return false; }
        } else if (selected.value === 'Identity Number') {
            const f = formB.querySelector('#fname');
            const l = formB.querySelector('#lname');
            if (f && !f.value.trim()) { f.focus(); alert('First Name is required'); return false; }
            if (l && !l.value.trim()) { l.focus(); alert('Last Name is required'); return false; }
        }
    }
    return true;
}

updateForms();
setDynamicRequireds();

async function doSearch() {
    setDynamicRequireds();
    if (!validateInputs()) return;
    // loading state
    const oldText = search.textContent;
    search.disabled = true;
    search.textContent = 'Searching...';
    setStatus('Searching…', 'info');
    const selected = document.querySelector('input[name="identity"]:checked');

    const query = inputId.value.trim();

    const url = selected.value === "Name"
        ? "./public/name_response.json"
        : "./public/idnumber_response.json";

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const entity = selectPrimaryEntity(json);
        if (!entity) {
            setStatus('No results found.', 'info');
        } else {
            appendRow(entity);
            clearStatus();
        }
    } catch (err) {
        console.error("Error fetching data:", err);
        setStatus('Error fetching data. Please try again.', 'error');
    } finally {
        search.disabled = false;
        search.textContent = oldText;
    }
}

search.addEventListener('click', doSearch);

// Enter key triggers search from any input inside the main container
form.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        doSearch();
    }
});

// Keep requireds in sync when toggling UI
radios.forEach(r => r.addEventListener('change', () => { updateForms(); setDynamicRequireds(); }));
checkbox.addEventListener('change', () => { updateForms(); setDynamicRequireds(); });

// Delegated handler for View buttons
resultsSection.addEventListener('click', (e) => {
    const target = e.target;
    if (target && target.classList.contains('btn-view')) {
        const index = Number(target.getAttribute('data-index'));
        openSidebar(index);
    }
});

// Sidebar handlers
sidebarClose && sidebarClose.addEventListener('click', closeSidebar);
overlay && overlay.addEventListener('click', closeSidebar);

sidebarDownloadBtn && sidebarDownloadBtn.addEventListener('click', () => {
    const index = Number(sidebarContent.dataset.index || '-1');
    const entity = appState.items[index];
    if (!entity) return;
    const payload = { ...entity, raw: entity.raw };
    downloadJSON(payload, `${(entity.name || 'result').replace(/[^a-z0-9-_]+/gi,'_')}.json`);
});

sidebarOpenFullBtn && sidebarOpenFullBtn.addEventListener('click', () => {
    const index = Number(sidebarContent.dataset.index || '-1');
    const entity = appState.items[index];
    if (!entity) return;
    try {
        localStorage.setItem('fullResultData', JSON.stringify(entity));
        window.location.href = 'results.html';
    } catch (e) {
        console.error('Failed to open full result:', e);
    }
});