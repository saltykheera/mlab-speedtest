/**
 * Component 2 – Trend Over Time
 * Line chart: Y = speed | packet-loss | latency | iqb_score, X = last 7 or 30 days
 * Requires Chart.js
 */
class TrendChart {
  constructor(containerId, data) {
    this.container = document.getElementById(containerId);
    this.allData = data
      .filter(r => r.user_id === 102)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    this.chart = null;
    this._render();
  }

  _render() {
    this.container.innerHTML = `
      <div class="comp-header">
        <h2>Trend Over Time</h2>
        <div class="controls">
          <div class="btn-group" role="group">
            <button class="ctrl-btn active" data-days="7">7 days</button>
            <button class="ctrl-btn" data-days="30">30 days</button>
          </div>
          <select id="trend-metric" class="ctrl-select">
            <option value="download">Download Speed (Mbps)</option>
            <option value="upload">Upload Speed (Mbps)</option>
            <option value="latency">Latency (ms)</option>
            <option value="loss">Packet Loss (%)</option>
            <option value="iqb_score">IQB Score</option>
          </select>
        </div>
      </div>
      <div class="chart-wrap">
        <canvas id="trend-canvas"></canvas>
      </div>`;

    this.days = 7;
    this.metric = 'download';

    this.container.querySelectorAll('.ctrl-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        this.container.querySelectorAll('.ctrl-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.days = parseInt(e.target.dataset.days);
        this._update();
      });
    });

    document.getElementById('trend-metric').addEventListener('change', e => {
      this.metric = e.target.value;
      this._update();
    });

    this._buildChart();
    this._update();
  }

  _filtered() {
    const now = new Date(Math.max(...this.allData.map(r => new Date(r.timestamp))));
    const cutoff = new Date(now - this.days * 86400000);
    return this.allData.filter(r => new Date(r.timestamp) >= cutoff);
  }

  _metaFor(metric) {
    const map = {
      download:  { label: 'Download Speed (Mbps)', color: '#5e42a6' },
      upload:    { label: 'Upload Speed (Mbps)',   color: '#b74e91' },
      latency:   { label: 'Latency (ms)',           color: '#5052b5' },
      loss:      { label: 'Packet Loss (%)',         color: '#953d75' },
      iqb_score: { label: 'IQB Score',              color: '#4caf50' },
    };
    return map[metric] || map.download;
  }

  _buildChart() {
    const ctx = document.getElementById('trend-canvas').getContext('2d');
    this.chart = new Chart(ctx, {
      type: 'line',
      data: { labels: [], datasets: [{ data: [], fill: true, tension: 0.35, pointRadius: 3 }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(20,20,35,0.9)',
            titleColor: '#fff',
            bodyColor: '#ccc',
            callbacks: {
              label: ctx => ` ${ctx.parsed.y.toFixed(2)}`
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.08)' },
            ticks: { color: 'rgba(255,255,255,0.35)', maxTicksLimit: 10, maxRotation: 30 }
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.08)' },
            ticks: { color: 'rgba(255,255,255,0.35)' },
            title: { display: true, color: 'rgba(255,255,255,0.45)', font: { size: 11 } }
          }
        }
      }
    });
  }

  _update() {
    const rows = this._filtered();
    const meta = this._metaFor(this.metric);
    const labels = rows.map(r => r.timestamp.slice(0, 16));
    const values = rows.map(r => r[this.metric]);

    this.chart.data.labels = labels;
    this.chart.data.datasets[0].label = meta.label;
    this.chart.data.datasets[0].data = values;
    this.chart.data.datasets[0].borderColor = meta.color;
    this.chart.data.datasets[0].backgroundColor = meta.color + '22';
    this.chart.data.datasets[0].pointBackgroundColor = meta.color;
    this.chart.options.scales.y.title.text = meta.label;
    this.chart.update();
  }
}
