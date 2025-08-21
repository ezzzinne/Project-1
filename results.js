(function(){
  const backBtn = document.getElementById('back-btn');
  const downloadBtn = document.getElementById('download-json');
  const summary = document.getElementById('full-result-summary');
  const table = document.getElementById('full-result-table');
  const tbody = table ? table.querySelector('tbody') : null;

  function setStatus(message, type = 'info') {
    if (!summary) return;
    summary.innerHTML = `<div class="alert alert-${type}">${escapeHtml(message)}</div>`;
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

  function render(entity) {
    // Summary
    const items = [];
    items.push(['Name', entity.name || '']);
    items.push(['Category', entity.category || '']);
    items.push(['Country', entity.country || '']);
    items.push(['Gender', entity.gender || '']);
    items.push(['Primary Info', entity.primary || '']);
    if (entity.meta && entity.meta.queriedWith) items.push(['Queried With', entity.meta.queriedWith]);
    if (entity.meta && entity.meta.query) items.push(['Query', entity.meta.query]);
    if (summary) {
      summary.innerHTML = items.map(([k,v]) => `<div class="kv"><b>${escapeHtml(k)}:</b> <span>${escapeHtml(String(v))}</span></div>`).join('');
    }

    // Table
    if (tbody) {
      const flat = flattenObject(entity.raw || {});
      const frag = document.createDocumentFragment();
      for (const [k, v] of flat) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td data-label="Field">${escapeHtml(k)}</td><td data-label="Value">${escapeHtml(String(v))}</td>`;
        frag.appendChild(tr);
      }
      tbody.innerHTML = '';
      tbody.appendChild(frag);
    }

    // Wire download
    if (downloadBtn) {
      downloadBtn.onclick = () => {
        downloadJSON(entity, `${(entity.name || 'result').replace(/[^a-z0-9-_]+/gi,'_')}.json`);
      };
    }
  }

  // Init
  backBtn && backBtn.addEventListener('click', () => {
    window.location.href = 'index.html';
  });

  try {
    const raw = localStorage.getItem('fullResultData');
    if (!raw) {
      setStatus('No data to display. Returning to search…', 'info');
      setTimeout(() => (window.location.href = 'index.html'), 1200);
      return;
    }
    try {
      const entity = JSON.parse(raw);
      render(entity);
    } catch (parseErr) {
      console.error('Parse error:', parseErr);
      setStatus('Failed to parse saved data. Returning to search…', 'error');
      setTimeout(() => (window.location.href = 'index.html'), 1200);
    }
  } catch (e) {
    console.error('Failed to load full result:', e);
    setStatus('Failed to load data.', 'error');
  }
})();
