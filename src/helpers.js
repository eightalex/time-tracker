// General helpers
export function uniq(arr){ return Array.from(new Set(arr)); }
export function cryptoRandomId(){
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) return crypto.randomUUID();
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Date helpers
export function startOfDay(d){ const x=new Date(d); x.setHours(0,0,0,0); return x; }
export function endOfDay(d){ const x=new Date(d); x.setHours(23,59,59,999); return x; }
export function firstDayOfMonth(d){ const x=new Date(d); x.setDate(1); x.setHours(0,0,0,0); return x; }
export function lastDayOfMonth(d){ const x=new Date(d); x.setMonth(x.getMonth()+1,0); x.setHours(23,59,59,999); return x; }
export function prevMonth(d){ const x=new Date(d); x.setMonth(x.getMonth()-1, 1); return x; }
export function toInputDate(d){
  const x = new Date(d);
  if(Number.isNaN(x.getTime())) return '';
  const shifted = new Date(x.getTime() - x.getTimezoneOffset()*60000);
  return shifted.toISOString().slice(0,10);
}
export function toInputMonth(d){
  const x = new Date(d);
  if(Number.isNaN(x.getTime())) return '';
  const shifted = new Date(x.getTime() - x.getTimezoneOffset()*60000);
  return shifted.toISOString().slice(0,7);
}
export function toISODate(d){ return d.toISOString().slice(0,10); }
export function monthLabel(d){ return d.toLocaleDateString('uk-UA', { month:'long', year:'numeric' }); }

// Formatting
export function formatMs(ms){
  const sign = ms<0?'-':''; ms = Math.trunc(Math.abs(ms));
  const h = Math.floor(ms/3600000), m = Math.floor((ms%3600000)/60000);
  return sign + String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');
}
export function formatMsS(ms){
  const sign = ms<0?'-':''; ms = Math.trunc(Math.abs(ms));
  const h = Math.floor(ms/3600000), m = Math.floor((ms%3600000)/60000), s = Math.floor((ms%60000)/1000);
  return sign + String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
}

// Math helpers
export function overlapMs(a0,a1,b0,b1){ const s=Math.max(a0,b0), e=Math.min(a1,b1); return Math.max(0, e-s); }
export function midpointWithin(a0,a1,b0,b1){ const s=Math.max(a0,b0), e=Math.min(a1,b1); return s + Math.floor((e-s)/2); }
export function isRunning(task){ return !!task.running; }
export function normalizeTimeCoefficient(value){
  const parsed = Number.parseFloat(String(value).replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 1;
}
export function applyTimeCoefficient(ms, coefficient=1){
  return ms * normalizeTimeCoefficient(coefficient);
}
export function timeCoefficientOptions(coefficientOrOptions=1, applyToAll=false){
  if (coefficientOrOptions && typeof coefficientOrOptions === 'object') {
    return {
      coefficient: normalizeTimeCoefficient(coefficientOrOptions.coefficient),
      applyToAll: Boolean(coefficientOrOptions.applyToAll),
    };
  }
  return {
    coefficient: normalizeTimeCoefficient(coefficientOrOptions),
    applyToAll: Boolean(applyToAll),
  };
}
export function effectiveLogCoefficient(log, coefficientOrOptions=1, applyToAll=false){
  const options = timeCoefficientOptions(coefficientOrOptions, applyToAll);
  if (options.applyToAll) return options.coefficient;
  return normalizeTimeCoefficient(log?.timeCoefficient ?? 1);
}
export function adjustedLogMs(log, coefficientOrOptions=1, applyToAll=false){
  const start = typeof log?.start === 'number' ? log.start : 0;
  const end = typeof log?.end === 'number' ? log.end : start;
  const rawMs = typeof log?.ms === 'number' ? log.ms : Math.max(0, end - start);
  return applyTimeCoefficient(rawMs, effectiveLogCoefficient(log, coefficientOrOptions, applyToAll));
}
export function adjustedLogOverlapMs(log, r0, r1, coefficientOrOptions=1, applyToAll=false){
  const start = typeof log?.start === 'number' ? log.start : null;
  const end = typeof log?.end === 'number' ? log.end : null;
  if (start === null || end === null) return 0;
  const overlap = overlapMs(start, end, r0, r1);
  if (overlap <= 0) return 0;
  const rawDuration = Math.max(0, end - start);
  if (rawDuration <= 0) return 0;
  return adjustedLogMs(log, coefficientOrOptions, applyToAll) * (overlap / rawDuration);
}
export function normalizeHourlyRate(value){
  const parsed = Number.parseFloat(String(value).replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}
export function shouldShowEarnings(hourlyRate){
  return normalizeHourlyRate(hourlyRate) > 0;
}
export function earnedForMs(ms, hourlyRate){
  return (Math.max(0, ms) / 3600000) * normalizeHourlyRate(hourlyRate);
}
export function formatUsd(amount){
  const value = Number.isFinite(amount) ? amount : 0;
  return '$' + value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Totals
export function taskTotalInRange(task, r0, r1, coefficientOrOptions=1, applyToAll=false){
  let sum = 0;
  for(const log of task.logs){ sum += adjustedLogOverlapMs(log, r0, r1, coefficientOrOptions, applyToAll); }
  return sum;
}
export function runningOverlapInRange(tasks, r0, r1, nowTs=Date.now(), coefficientOrOptions=1, applyToAll=false){
  const options = timeCoefficientOptions(coefficientOrOptions, applyToAll);
  let sum = 0;
  for(const t of tasks){ if(isRunning(t)) sum += applyTimeCoefficient(overlapMs(t.running.start, nowTs, r0, r1), options.coefficient); }
  return sum;
}
export function totalForDate(tasks, dateObj, coefficientOrOptions=1, applyToAll=false, nowTs=Date.now()){
  const d0 = startOfDay(dateObj).getTime();
  const d1 = endOfDay(dateObj).getTime();
  let sum = 0; for(const t of tasks){ sum += taskTotalInRange(t, d0, d1, coefficientOrOptions, applyToAll); }
  return sum + runningOverlapInRange(tasks, d0, d1, nowTs, coefficientOrOptions, applyToAll);
}
export function totalForMonth(tasks, monthDate, coefficientOrOptions=1, applyToAll=false, nowTs=Date.now()){
  const m0 = firstDayOfMonth(monthDate).getTime();
  const m1 = lastDayOfMonth(monthDate).getTime();
  let sum = 0; for(const t of tasks){ sum += taskTotalInRange(t, m0, m1, coefficientOrOptions, applyToAll); }
  return sum + runningOverlapInRange(tasks, m0, m1, nowTs, coefficientOrOptions, applyToAll);
}
export function totalForTaskOnDate(task, dateObj, nowTs=Date.now(), coefficientOrOptions=1, applyToAll=false){
  const d0 = startOfDay(dateObj).getTime();
  const d1 = endOfDay(dateObj).getTime();
  const runningMs = isRunning(task) ? applyTimeCoefficient(overlapMs(task.running.start, nowTs, d0, d1), timeCoefficientOptions(coefficientOrOptions, applyToAll).coefficient) : 0;
  return taskTotalInRange(task, d0, d1, coefficientOrOptions, applyToAll) + runningMs;
}
export function totalForTaskInMonth(task, monthDate, nowTs=Date.now(), coefficientOrOptions=1, applyToAll=false){
  const m0 = firstDayOfMonth(monthDate).getTime();
  const m1 = lastDayOfMonth(monthDate).getTime();
  const runningMs = isRunning(task) ? applyTimeCoefficient(overlapMs(task.running.start, nowTs, m0, m1), timeCoefficientOptions(coefficientOrOptions, applyToAll).coefficient) : 0;
  return taskTotalInRange(task, m0, m1, coefficientOrOptions, applyToAll) + runningMs;
}
export function totalForTaskOverall(task, nowTs=Date.now(), coefficientOrOptions=1, applyToAll=false){
  const options = timeCoefficientOptions(coefficientOrOptions, applyToAll);
  let sum = 0;
  for(const log of task.logs){
    sum += adjustedLogMs(log, options);
  }
  if(isRunning(task)) sum += applyTimeCoefficient(nowTs - task.running.start, options.coefficient);
  return sum;
}

// Export builders
export function buildRowsForRange(tasks, startTs, endTs, nowTs=Date.now(), coefficientOrOptions=1, applyToAll=false){
  const options = timeCoefficientOptions(coefficientOrOptions, applyToAll);
  const map = new Map();
  const clamp0 = startOfDay(new Date(startTs)).getTime();
  const clamp1 = endOfDay(new Date(endTs)).getTime();
  for(const t of tasks){
    for(const log of t.logs){
      const ov = adjustedLogOverlapMs(log, clamp0, clamp1, options);
      if(ov>0){
        const dayKey = toISODate(new Date(midpointWithin(log.start, log.end, clamp0, clamp1)));
        const key = `${dayKey}__${t.id}`;
        const cur = map.get(key) || {date: dayKey, title: t.title, project: t.project||'', type: t.type||'', link: t.link||'', ms:0};
        cur.ms += ov; map.set(key, cur);
      }
    }
    if(isRunning(t)){
      const ov = applyTimeCoefficient(overlapMs(t.running.start, nowTs, clamp0, clamp1), options.coefficient);
      if(ov>0){
        const dayKey = toISODate(new Date(midpointWithin(t.running.start, nowTs, clamp0, clamp1)));
        const key = `${dayKey}__${t.id}`;
        const cur = map.get(key) || {date: dayKey, title: t.title, project: t.project||'', type: t.type||'', link: t.link||'', ms:0};
        cur.ms += ov; map.set(key, cur);
      }
    }
  }
  return Array.from(map.values()).sort((a,b)=> (a.date<b.date?-1:a.date>b.date?1: (a.title.localeCompare(b.title))));
}

export function buildTaskTotalsForRange(tasks, startTs, endTs, nowTs=Date.now(), coefficientOrOptions=1, applyToAll=false){
  const options = timeCoefficientOptions(coefficientOrOptions, applyToAll);
  const clamp0 = startOfDay(new Date(startTs)).getTime();
  const clamp1 = endOfDay(new Date(endTs)).getTime();
  const rows = [];
  for(const t of tasks){
    let ms = taskTotalInRange(t, clamp0, clamp1, options);
    if(isRunning(t)) ms += applyTimeCoefficient(overlapMs(t.running.start, nowTs, clamp0, clamp1), options.coefficient);
    if(ms>0) rows.push({ title: t.title||'', link: t.link||'', project: t.project||'', type: t.type||'', ms });
  }
  return rows.sort((a,b)=> a.title.localeCompare(b.title));
}
