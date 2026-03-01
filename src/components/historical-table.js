/**
 * Component 1 – Historical Test Results
 * Lazy-loading table for user_id = 102, sorted latest → oldest.
 */
class HistoricalTable {
  constructor(containerId, data) {
    this.container = document.getElementById(containerId);
    // Filter to user 102, sort descending by timestamp
    this.rows = data
      .filter(r => r.user_id === 102)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    this.pageSize = 15;
    this.loaded = 0;
    this.sentinel = null;
    this._render();
  }

  _render() {
    this.container.innerHTML = `
      <div class="comp-header">
        <h2>Historical Test Results</h2>
        <span class="comp-subtitle">User ID: 102 &nbsp;|&nbsp; ${this.rows.length} records</span>
      </div>
      <div class="table-wrap">
        <table id="hist-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Timestamp</th>
              <th>Download<br><small>Mbps</small></th>
              <th>Upload<br><small>Mbps</small></th>
              <th>Latency<br><small>ms</small></th>
              <th>Pkt Loss<br><small>%</small></th>
              <th>IQB Score</th>
              <th>City</th>
              <th>ASN</th>
            </tr>
          </thead>
          <tbody id="hist-tbody"></tbody>
        </table>
      </div>
      <div id="hist-sentinel" class="lazy-sentinel">
        <span class="spinner"></span>
      </div>`;

    this.tbody = document.getElementById('hist-tbody');
    this.sentinel = document.getElementById('hist-sentinel');
    this._loadMore();
    this._observe();
  }

  _loadMore() {
    const slice = this.rows.slice(this.loaded, this.loaded + this.pageSize);
    slice.forEach((r, idx) => {
      const tr = document.createElement('tr');
      const scoreClass = r.iqb_score >= 75 ? 'good' : r.iqb_score >= 50 ? 'fair' : 'poor';
      tr.innerHTML = `
        <td>${this.loaded + idx + 1}</td>
        <td>${r.timestamp}</td>
        <td>${r.download.toFixed(1)}</td>
        <td>${r.upload.toFixed(1)}</td>
        <td>${r.latency}</td>
        <td>${r.loss.toFixed(2)}</td>
        <td><span class="badge ${scoreClass}">${r.iqb_score.toFixed(1)}</span></td>
        <td>${r.city}</td>
        <td title="${r.asn_name}">${r.asn}</td>`;
      this.tbody.appendChild(tr);
    });
    this.loaded += slice.length;
    if (this.loaded >= this.rows.length && this.sentinel) {
      this.sentinel.style.display = 'none';
    }
  }

  _observe() {
    if (!('IntersectionObserver' in window)) {
      this.sentinel.style.display = 'none';
      return;
    }
    this.observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && this.loaded < this.rows.length) {
        this._loadMore();
      }
    }, { threshold: 0.1 });
    this.observer.observe(this.sentinel);
  }
}
