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
export function toInputDate(d){ return d.toISOString().slice(0,10); }
export function toInputMonth(d){ return d.toISOString().slice(0,7); }
export function toISODate(d){ return d.toISOString().slice(0,10); }
export function monthLabel(d){ return d.toLocaleDateString('uk-UA', { month:'long', year:'numeric' }); }

// Formatting
export function formatMs(ms){
  const sign = ms<0?'-':''; ms = Math.abs(ms)|0;
  const h = Math.floor(ms/3600000), m = Math.floor((ms%3600000)/60000);
  return sign + String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');
}
export function formatMsS(ms){
  const sign = ms<0?'-':''; ms = Math.abs(ms)|0;
  const h = Math.floor(ms/3600000), m = Math.floor((ms%3600000)/60000), s = Math.floor((ms%60000)/1000);
  return sign + String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
}

// Math helpers
export function overlapMs(a0,a1,b0,b1){ const s=Math.max(a0,b0), e=Math.min(a1,b1); return Math.max(0, e-s); }
export function midpointWithin(a0,a1,b0,b1){ const s=Math.max(a0,b0), e=Math.min(a1,b1); return s + Math.floor((e-s)/2); }
export function isRunning(task){ return !!task.running; }

// Totals
export function taskTotalInRange(task, r0, r1){
  let sum = 0;
  for(const log of task.logs){ sum += overlapMs(log.start, log.end, r0, r1); }
  return sum;
}
export function runningOverlapInRange(tasks, r0, r1){
  let sum = 0;
  for(const t of tasks){ if(isRunning(t)) sum += overlapMs(t.running.start, Date.now(), r0, r1); }
  return sum;
}
export function totalForDate(tasks, dateObj){
  const d0 = startOfDay(dateObj).getTime();
  const d1 = endOfDay(dateObj).getTime();
  let sum = 0; for(const t of tasks){ sum += taskTotalInRange(t, d0, d1); }
  return sum + runningOverlapInRange(tasks, d0, d1);
}
export function totalForMonth(tasks, monthDate){
  const m0 = firstDayOfMonth(monthDate).getTime();
  const m1 = lastDayOfMonth(monthDate).getTime();
  let sum = 0; for(const t of tasks){ sum += taskTotalInRange(t, m0, m1); }
  return sum + runningOverlapInRange(tasks, m0, m1);
}
export function totalForTaskOnDate(task, dateObj, nowTs=Date.now()){
  const d0 = startOfDay(dateObj).getTime();
  const d1 = endOfDay(dateObj).getTime();
  return taskTotalInRange(task, d0, d1) + (isRunning(task) ? overlapMs(task.running.start, nowTs, d0, d1) : 0);
}
export function totalForTaskInMonth(task, monthDate, nowTs=Date.now()){
  const m0 = firstDayOfMonth(monthDate).getTime();
  const m1 = lastDayOfMonth(monthDate).getTime();
  return taskTotalInRange(task, m0, m1) + (isRunning(task) ? overlapMs(task.running.start, nowTs, m0, m1) : 0);
}
export function totalForTaskOverall(task, nowTs=Date.now()){
  let sum = 0;
  for(const log of task.logs){
    sum += (typeof log.ms === 'number') ? log.ms : Math.max(0, (log.end||0) - (log.start||0));
  }
  if(isRunning(task)) sum += nowTs - task.running.start;
  return sum;
}

// Export builders
export function buildRowsForRange(tasks, startTs, endTs, nowTs=Date.now()){
  const map = new Map();
  const clamp0 = startOfDay(new Date(startTs)).getTime();
  const clamp1 = endOfDay(new Date(endTs)).getTime();
  for(const t of tasks){
    for(const log of t.logs){
      const ov = overlapMs(log.start, log.end, clamp0, clamp1);
      if(ov>0){
        const dayKey = toISODate(new Date(midpointWithin(log.start, log.end, clamp0, clamp1)));
        const key = `${dayKey}__${t.id}`;
        const cur = map.get(key) || {date: dayKey, title: t.title, project: t.project||'', type: t.type||'', link: t.link||'', ms:0};
        cur.ms += ov; map.set(key, cur);
      }
    }
    if(isRunning(t)){
      const ov = overlapMs(t.running.start, nowTs, clamp0, clamp1);
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

export function buildTaskTotalsForRange(tasks, startTs, endTs, nowTs=Date.now()){
  const clamp0 = startOfDay(new Date(startTs)).getTime();
  const clamp1 = endOfDay(new Date(endTs)).getTime();
  const rows = [];
  for(const t of tasks){
    let ms = taskTotalInRange(t, clamp0, clamp1);
    if(isRunning(t)) ms += overlapMs(t.running.start, nowTs, clamp0, clamp1);
    if(ms>0) rows.push({ title: t.title||'', link: t.link||'', project: t.project||'', type: t.type||'', ms });
  }
  return rows.sort((a,b)=> a.title.localeCompare(b.title));
}
