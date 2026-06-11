const selectedMonth = '2026-06';
const [year, month] = selectedMonth.split('-');
const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

console.log("Start:", startDate.toISOString());
console.log("End:", endDate.toISOString());
