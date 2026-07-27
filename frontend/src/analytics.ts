import { Chart, registerables } from 'chart.js';
import { apiFetch } from './api';
import { getToken } from './staff-token';

Chart.register(...registerables);

interface AnalyticsResponse {
  range: { from: string; to: string; granularity: 'day' | 'week' | 'month' };
  totals: { revenue: number; orders: number; avgOrderValue: number; cancelledCount: number; cancelledRate: number };
  ordersByStatus: { status: string; count: number }[];
  revenueOverTime: { date: string; revenue: number; orders: number }[];
  topSellers: { id: string; name: string; kind: 'product' | 'pack'; qty: number; revenue: number }[];
  salesByGender: { gender: string; qty: number; revenue: number }[];
  salesByFamily: { family: string; qty: number; revenue: number }[];
  salesBySize: { ml: number; label: string; qty: number; revenue: number }[];
}

// Matches the .status-select colors in _user.scss, so a status reads the same
// color everywhere in the dashboard.
const STATUS_COLORS: Record<string, string> = {
  pending: '#fd7e14',
  confirmed: '#0d6efd',
  shipped: '#6f42c1',
  delivered: '#198754',
  cancelled: '#dc3545',
};

const FAMILY_COLORS: Record<string, string> = {
  Floral: '#e83e8c',
  Woody: '#8b5e3c',
  Oriental: '#d6a24c',
  Fresh: '#20c997',
  Gourmand: '#fd7e14',
  Citrus: '#ffc107',
};

const GENDER_COLORS: Record<string, string> = { her: '#e83e8c', him: '#0d6efd' };
const SIZE_PALETTE = ['#0d6efd', '#6f42c1', '#198754', '#fd7e14', '#dc3545', '#20c997'];

const charts: Partial<Record<string, Chart>> = {};

function destroy(id: string): void {
  charts[id]?.destroy();
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

function startOfYear(): Date {
  return new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));
}

const PRESET_RANGES: Record<string, () => { from: Date; to: Date }> = {
  '7d': () => ({ from: daysAgo(6), to: new Date() }),
  '30d': () => ({ from: daysAgo(29), to: new Date() }),
  '90d': () => ({ from: daysAgo(89), to: new Date() }),
  year: () => ({ from: startOfYear(), to: new Date() }),
  all: () => ({ from: new Date(Date.UTC(2020, 0, 1)), to: new Date() }),
};

function renderKPIs(data: AnalyticsResponse): void {
  (document.getElementById('kpi-revenue') as HTMLElement).textContent = `${data.totals.revenue} DH`;
  (document.getElementById('kpi-orders') as HTMLElement).textContent = String(data.totals.orders);
  (document.getElementById('kpi-aov') as HTMLElement).textContent = `${data.totals.avgOrderValue} DH`;
  (document.getElementById('kpi-cancelled') as HTMLElement).textContent = `${data.totals.cancelledRate}%`;
}

function renderRevenueChart(data: AnalyticsResponse): void {
  destroy('chart-revenue');
  const dense = data.revenueOverTime.length > 40;
  charts['chart-revenue'] = new Chart(document.getElementById('chart-revenue') as HTMLCanvasElement, {
    type: 'line',
    data: {
      labels: data.revenueOverTime.map((d) => d.date),
      datasets: [
        {
          label: 'Revenue (DH)',
          data: data.revenueOverTime.map((d) => d.revenue),
          borderColor: '#0d6efd',
          backgroundColor: 'rgba(13,110,253,0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: dense ? 0 : 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } },
    },
  });
}

function renderStatusChart(data: AnalyticsResponse): void {
  destroy('chart-status');
  charts['chart-status'] = new Chart(document.getElementById('chart-status') as HTMLCanvasElement, {
    type: 'doughnut',
    data: {
      labels: data.ordersByStatus.map((s) => capitalize(s.status)),
      datasets: [
        {
          data: data.ordersByStatus.map((s) => s.count),
          backgroundColor: data.ordersByStatus.map((s) => STATUS_COLORS[s.status] ?? '#6c757d'),
        },
      ],
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } },
  });
}

function renderTopSellersChart(data: AnalyticsResponse): void {
  destroy('chart-top-sellers');
  charts['chart-top-sellers'] = new Chart(document.getElementById('chart-top-sellers') as HTMLCanvasElement, {
    type: 'bar',
    data: {
      labels: data.topSellers.map((s) => `${s.name}${s.kind === 'pack' ? ' (Pack)' : ''}`),
      datasets: [{ label: 'Revenue (DH)', data: data.topSellers.map((s) => s.revenue), backgroundColor: '#20c997' }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true } },
    },
  });
}

function renderFamilyChart(data: AnalyticsResponse): void {
  destroy('chart-family');
  charts['chart-family'] = new Chart(document.getElementById('chart-family') as HTMLCanvasElement, {
    type: 'bar',
    data: {
      labels: data.salesByFamily.map((f) => f.family),
      datasets: [
        {
          label: 'Revenue (DH)',
          data: data.salesByFamily.map((f) => f.revenue),
          backgroundColor: data.salesByFamily.map((f) => FAMILY_COLORS[f.family] ?? '#6c757d'),
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } },
    },
  });
}

function renderGenderChart(data: AnalyticsResponse): void {
  destroy('chart-gender');
  charts['chart-gender'] = new Chart(document.getElementById('chart-gender') as HTMLCanvasElement, {
    type: 'doughnut',
    data: {
      labels: data.salesByGender.map((g) => (g.gender === 'her' ? 'For Her' : 'For Him')),
      datasets: [
        {
          data: data.salesByGender.map((g) => g.revenue),
          backgroundColor: data.salesByGender.map((g) => GENDER_COLORS[g.gender] ?? '#6c757d'),
        },
      ],
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } },
  });
}

function renderSizeChart(data: AnalyticsResponse): void {
  destroy('chart-size');
  charts['chart-size'] = new Chart(document.getElementById('chart-size') as HTMLCanvasElement, {
    type: 'doughnut',
    data: {
      labels: data.salesBySize.map((s) => s.label),
      datasets: [
        {
          data: data.salesBySize.map((s) => s.qty),
          backgroundColor: data.salesBySize.map((_, i) => SIZE_PALETTE[i % SIZE_PALETTE.length]),
        },
      ],
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } },
  });
}

async function loadAndRender(from: Date, to: Date): Promise<void> {
  const params = new URLSearchParams({ from: toISODate(from), to: toISODate(to) });
  const data = await apiFetch<AnalyticsResponse>(`/analytics?${params.toString()}`, {}, getToken() ?? undefined);

  const empty = document.getElementById('analytics-empty') as HTMLElement;
  const content = document.getElementById('analytics-content') as HTMLElement;

  if (data.totals.orders === 0) {
    empty.classList.remove('d-none');
    content.classList.add('d-none');
    return;
  }
  empty.classList.add('d-none');
  content.classList.remove('d-none');

  renderKPIs(data);
  renderRevenueChart(data);
  renderStatusChart(data);
  renderTopSellersChart(data);
  renderFamilyChart(data);
  renderGenderChart(data);
  renderSizeChart(data);
}

function setActivePreset(key: string | null): void {
  document.querySelectorAll<HTMLButtonElement>('#range-presets button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.range === key);
  });
}

function applyPreset(key: string): void {
  const { from, to } = PRESET_RANGES[key]();
  setActivePreset(key);
  (document.getElementById('range-from') as HTMLInputElement).value = toISODate(from);
  (document.getElementById('range-to') as HTMLInputElement).value = toISODate(to);
  void loadAndRender(from, to);
}

function applyCustomRange(): void {
  const fromInput = document.getElementById('range-from') as HTMLInputElement;
  const toInput = document.getElementById('range-to') as HTMLInputElement;
  if (!fromInput.value || !toInput.value) return;
  setActivePreset(null);
  void loadAndRender(new Date(`${fromInput.value}T00:00:00Z`), new Date(`${toInput.value}T00:00:00Z`));
}

export function initAnalytics(): void {
  document.querySelectorAll<HTMLButtonElement>('#range-presets button').forEach((btn) => {
    btn.addEventListener('click', () => applyPreset(btn.dataset.range as string));
  });
  document.getElementById('range-from')!.addEventListener('change', applyCustomRange);
  document.getElementById('range-to')!.addEventListener('change', applyCustomRange);

  applyPreset('30d');
}
