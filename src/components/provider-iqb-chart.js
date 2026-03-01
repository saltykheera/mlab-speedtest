/**
 * Component 3 – Avg IQB Score vs Network Provider
 * Bar chart grouped by ASN name
 * Requires Chart.js
 */
class ProviderIQBChart {
  constructor(containerId, data) {
    this.container = document.getElementById(containerId);
    this.data = data.filter(r => r.user_id === 102);
    this._render();
  }

  _aggregate() {
    const map = {};
    this.data.forEach(r => {
      const key = r.asn_name || r.asn;
      if (!map[key]) map[key] = { sum: 0, count: 0 };
      map[key].sum += r.iqb_score;
      map[key].count++;
    });
    return Object.entries(map)
      .map(([name, v]) => ({ name, avg: v.sum / v.count }))
      .sort((a, b) => b.avg - a.avg);
  }

  _render() {
    this.container.innerHTML = `
      <div class="comp-header">
        <h2>Avg IQB Score by Network Provider</h2>
        <span class="comp-subtitle">User 102</span>
      </div>
      <div class="chart-wrap">
        <canvas id="provider-iqb-canvas"></canvas>
      </div>`;

    const rows = this._aggregate();
    const labels = rows.map(r => this._short(r.name));
    const values = rows.map(r => parseFloat(r.avg.toFixed(2)));

    // Colour gradient: green → amber → red based on score
    const colors = values.map(v =>
      v >= 75 ? '#2ecc71' : v >= 50 ? '#f39c12' : '#e74c3c'
    );

    const ctx = document.getElementById('provider-iqb-canvas').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Avg IQB Score',
          data: values,
          backgroundColor: colors,
          borderRadius: 5,
          borderSkipped: false,
        }]
      },
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
              title: items => rows[items[0].dataIndex].name,
              label: item => ` IQB Score: ${item.parsed.y}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: 'rgba(255,255,255,0.35)', maxRotation: 35, font: { size: 11 } }
          },
          y: {
            min: 0,
            max: 100,
            grid: { color: 'rgba(255,255,255,0.08)' },
            ticks: { color: 'rgba(255,255,255,0.35)' },
            title: { display: true, text: 'Avg IQB Score', color: 'rgba(255,255,255,0.45)' }
          }
        }
      }
    });
  }

  _short(name) {
    // Truncate long provider names
    return name.length > 22 ? name.slice(0, 20) + '…' : name;
  }
}
