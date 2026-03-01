/**
 * Component 4 – Metrics vs Network Provider
 * Grouped bar chart: median download, median upload, median latency,
 *                    median packet-loss, median IQB score per provider
 * Requires Chart.js
 */
class ProviderMetricsChart {
  constructor(containerId, data) {
    this.container = document.getElementById(containerId);
    this.data = data.filter(r => r.user_id === 102);
    this._render();
  }

  _median(arr) {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }

  _aggregate() {
    const map = {};
    this.data.forEach(r => {
      const key = r.asn_name || r.asn;
      if (!map[key]) map[key] = { dl: [], ul: [], lat: [], loss: [], iqb: [] };
      map[key].dl.push(r.download);
      map[key].ul.push(r.upload);
      map[key].lat.push(r.latency);
      map[key].loss.push(r.loss);
      map[key].iqb.push(r.iqb_score);
    });
    return Object.entries(map)
      .map(([name, v]) => ({
        name,
        dl:   parseFloat(this._median(v.dl).toFixed(2)),
        ul:   parseFloat(this._median(v.ul).toFixed(2)),
        lat:  parseFloat(this._median(v.lat).toFixed(2)),
        loss: parseFloat(this._median(v.loss).toFixed(2)),
        iqb:  parseFloat(this._median(v.iqb).toFixed(2)),
      }))
      .sort((a, b) => b.iqb - a.iqb);
  }

  _render() {
    this.container.innerHTML = `
      <div class="comp-header">
        <h2>Metrics by Network Provider</h2>
        <span class="comp-subtitle">Median values · User 102</span>
      </div>
      <div class="metric-tabs">
        <button class="mtab active" data-metric="dl">Download</button>
        <button class="mtab" data-metric="ul">Upload</button>
        <button class="mtab" data-metric="lat">Latency</button>
        <button class="mtab" data-metric="loss">Pkt Loss</button>
        <button class="mtab" data-metric="iqb">IQB Score</button>
      </div>
      <div class="chart-wrap">
        <canvas id="prov-metrics-canvas"></canvas>
      </div>`;

    this.agg = this._aggregate();
    this.activeMetric = 'dl';

    const metaMap = {
      dl:   { label: 'Median Download (Mbps)', color: '#5e42a6' },
      ul:   { label: 'Median Upload (Mbps)',   color: '#b74e91' },
      lat:  { label: 'Median Latency (ms)',    color: '#5052b5' },
      loss: { label: 'Median Pkt Loss (%)',    color: '#953d75' },
      iqb:  { label: 'Median IQB Score',       color: '#4caf50' },
    };

    this.container.querySelectorAll('.mtab').forEach(btn => {
      btn.addEventListener('click', e => {
        this.container.querySelectorAll('.mtab').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.activeMetric = e.target.dataset.metric;
        this._update(metaMap);
      });
    });

    const ctx = document.getElementById('prov-metrics-canvas').getContext('2d');
    this.chart = new Chart(ctx, {
      type: 'bar',
      data: { labels: [], datasets: [{ data: [], borderRadius: 5, borderSkipped: false }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(20,20,35,0.9)',
            titleColor: '#fff',
            bodyColor: '#ccc',
            callbacks: {
              title: items => this.agg[items[0].dataIndex].name,
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: 'rgba(255,255,255,0.35)', maxRotation: 35, font: { size: 11 } }
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.08)' },
            ticks: { color: 'rgba(255,255,255,0.35)' },
            title: { display: true, color: 'rgba(255,255,255,0.45)' }
          }
        }
      }
    });

    this._update(metaMap);
  }

  _update(metaMap) {
    const meta = metaMap[this.activeMetric];
    const labels = this.agg.map(r => r.name.length > 20 ? r.name.slice(0, 18) + '…' : r.name);
    const values = this.agg.map(r => r[this.activeMetric]);

    this.chart.data.labels = labels;
    this.chart.data.datasets[0].label = meta.label;
    this.chart.data.datasets[0].data = values;
    this.chart.data.datasets[0].backgroundColor = meta.color + 'cc';
    this.chart.data.datasets[0].borderColor = meta.color;
    this.chart.options.scales.y.title.text = meta.label;
    this.chart.update();
  }
}
