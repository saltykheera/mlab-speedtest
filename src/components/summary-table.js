/**
 * Component 5 – Summary Table: Metrics, Score & Location
 * One row per test record (all users), showing key metrics + location info.
 * Supports simple column-based client-side sorting.
 */
class SummaryTable {
  constructor(containerId, data) {
    this.container = document.getElementById(containerId);
    this.data = [...data.filter(r => r.user_id === 102)]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    this.sortCol = null;
    this.sortDir = 1;
    this._render();
  }

  _render() {
    this.container.innerHTML = `
      <div class="comp-header">
        <h2>Summary Table</h2>
        <span class="comp-subtitle">User 102 · click column header to sort</span>
      </div>
      <div class="table-wrap">
        <table id="summary-table">
          <thead>
            <tr>
              <th data-col="timestamp">Timestamp <span class="sort-icon">⇅</span></th>
              <th data-col="download">DL (Mbps) <span class="sort-icon">⇅</span></th>
              <th data-col="upload">UL (Mbps) <span class="sort-icon">⇅</span></th>
              <th data-col="latency">Latency (ms) <span class="sort-icon">⇅</span></th>
              <th data-col="loss">Pkt Loss (%) <span class="sort-icon">⇅</span></th>
              <th data-col="iqb_score">IQB Score <span class="sort-icon">⇅</span></th>
              <th data-col="city">City <span class="sort-icon">⇅</span></th>
              <th data-col="subdivision1_name">Region <span class="sort-icon">⇅</span></th>
              <th data-col="country_code">Country <span class="sort-icon">⇅</span></th>
              <th data-col="asn_name">Provider <span class="sort-icon">⇅</span></th>
            </tr>
          </thead>
          <tbody id="summary-tbody"></tbody>
        </table>
      </div>`;

    this.tbody = document.getElementById('summary-tbody');
    this._attachSort();
    this._renderRows(this.data);
  }

  _attachSort() {
    this.container.querySelectorAll('thead th[data-col]').forEach(th => {
      th.style.cursor = 'pointer';
      th.addEventListener('click', () => {
        const col = th.dataset.col;
        if (this.sortCol === col) {
          this.sortDir *= -1;
        } else {
          this.sortCol = col;
          this.sortDir = 1;
        }
        // Update sort icons
        this.container.querySelectorAll('thead th').forEach(h => {
          const icon = h.querySelector('.sort-icon');
          if (icon) icon.textContent = '⇅';
          h.classList.remove('sorted-asc', 'sorted-desc');
        });
        const icon = th.querySelector('.sort-icon');
        if (icon) icon.textContent = this.sortDir === 1 ? '↑' : '↓';
        th.classList.add(this.sortDir === 1 ? 'sorted-asc' : 'sorted-desc');
        this._sort();
      });
    });
  }

  _sort() {
    const col = this.sortCol;
    const dir = this.sortDir;
    const sorted = [...this.data].sort((a, b) => {
      let av = a[col], bv = b[col];
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      return av < bv ? -dir : av > bv ? dir : 0;
    });
    this.tbody.innerHTML = '';
    this._renderRows(sorted);
  }

  _renderRows(rows) {
    rows.forEach(r => {
      const tr = document.createElement('tr');
      const scoreClass = r.iqb_score >= 75 ? 'good' : r.iqb_score >= 50 ? 'fair' : 'poor';
      tr.innerHTML = `
        <td>${r.timestamp}</td>
        <td>${r.download.toFixed(1)}</td>
        <td>${r.upload.toFixed(1)}</td>
        <td>${r.latency}</td>
        <td>${r.loss.toFixed(2)}</td>
        <td><span class="badge ${scoreClass}">${r.iqb_score.toFixed(1)}</span></td>
        <td>${r.city}</td>
        <td>${r.subdivision1_name || '—'}</td>
        <td>${r.country_code}</td>
        <td title="${r.asn}">${r.asn_name}</td>`;
      this.tbody.appendChild(tr);
    });
  }
}
