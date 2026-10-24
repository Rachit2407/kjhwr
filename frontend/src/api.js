export async function fetchHealth() {
  const res = await fetch('/api/health');
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function fetchDayAhead(date, cutoff = '11') {
  const res = await fetch(`/api/day-ahead?date=${date}&cutoff=${cutoff}`);
  if (!res.ok) throw new Error(`Failed to fetch day-ahead data for ${date}`);
  return res.json();
}

export async function fetchAccuracySummary(cutoff = '11') {
  const res = await fetch(`/api/accuracy/summary?cutoff=${cutoff}`);
  if (!res.ok) throw new Error('Failed to fetch accuracy summary');
  return res.json();
}

export async function fetchLeadTimeAnalysis() {
  const res = await fetch('/api/accuracy/lead-time');
  if (!res.ok) throw new Error('Failed to fetch lead-time analysis');
  return res.json();
}

export async function fetchProcurementSimulation(cutoff = '11', demand = 30000, quantile = 0.90, date = null) {
  let url = `/api/procurement/simulate?cutoff=${cutoff}&demand_mw=${demand}&quantile=${quantile}`;
  if (date) url += `&date=${date}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to simulate procurement');
  return res.json();
}
