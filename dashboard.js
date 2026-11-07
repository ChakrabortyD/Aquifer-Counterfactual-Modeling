(function(){
"use strict";
const D = JSON.parse(document.getElementById("payload").textContent);
const NS = "http://www.w3.org/2000/svg";
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

const SITE = {
  comal: {label:"Comal Springs flow", short:"Comal", unit:"m³/s", dec:2,
          axis:"Weekly minimum flow (m³/s)", key:"comal", dir:"down"},
  j17:   {label:"J17 groundwater level", short:"J17", unit:"m", dec:1,
          axis:"Weekly minimum level (m above msl)", key:"j17", dir:"down"}
};
const SCEN_LABEL = {rcp45:"RCP 4.5", rcp85:"RCP 8.5", ssp245:"SSP 2-4.5", ssp585:"SSP 5-8.5"};
const GEN_OF = g => D.cmip5.includes(g) ? "CMIP5" : "CMIP6";
const fmt = (v,d) => v==null ? "–" : v.toFixed(d);

function el(tag, attrs, parent){
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) if (attrs[k] !== null && attrs[k] !== undefined) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function text(parent, x, y, s, o){
  o = o || {};
  const t = el("text", {x, y, fill:o.fill||css("--ink-3"), "font-size":o.size||11,
    "text-anchor":o.anchor||"start", "font-family":o.mono===false?'"IBM Plex Sans",sans-serif':'"IBM Plex Mono",monospace',
    "font-weight":o.weight||400, "dominant-baseline":o.base||"auto"}, parent);
  t.textContent = s;
  return t;
}

/* Round the axis to human numbers, and hand back the ticks that go with it,
   so every label names a value the scale actually reaches. */
function niceScale(lo, hi, target){
  const span = (hi - lo) || 1;
  const raw = span / target;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / mag;
  const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
  const nlo = Math.floor(lo / step) * step;
  const nhi = Math.ceil(hi / step) * step;
  const ticks = [];
  for (let v = nlo; v <= nhi + step * 1e-6; v += step) ticks.push(+v.toFixed(6));
  return {lo:nlo, hi:nhi, ticks, dp: Number.isInteger(step) ? 0 : 1};
}

/* Redraw on width change so labels keep their real pixel size instead of
   being scaled down with a viewBox. */
function responsive(node, draw){
  let last = 0;
  const run = () => {
    const w = Math.max(280, Math.round(node.clientWidth));
    if (w === last && node.firstChild) return;
    last = w;
    node.textContent = "";
    draw(node, w);
  };
  run();
  if (window.ResizeObserver) new ResizeObserver(run).observe(node);
  node.__redraw = () => { last = 0; run(); };
  return run;
}

/* ---------- stage bands ---------- */
function stageBands(g, site, x0, x1, y, yMin){
  const shades = [css("--cs1"),css("--cs2"),css("--cs3"),css("--cs4"),css("--cs5")];
  const th = D.stages.map(s => s[site]);
  for (let i=0;i<5;i++){
    const top = th[i];
    const bot = (i<4) ? th[i+1] : yMin;
    const yT = y(top), yB = y(bot);
    if (yB <= yT) continue;
    el("rect",{x:x0,y:yT,width:x1-x0,height:yB-yT,fill:shades[i]},g);
  }
  for (let i=0;i<5;i++){
    const yy = y(th[i]);
    if (yy < y.range0 || yy > y.range1) continue;
    el("line",{x1:x0,x2:x1,y1:yy,y2:yy,stroke:css("--rule"),"stroke-width":1,"shape-rendering":"crispEdges"},g);
    text(g, x1+5, yy+3.5, D.stages[i].id, {anchor:"start", size:9.5, fill:css("--ink-3")});
  }
}

/* ---------- 1. regional survey ---------- */
const REGIONS = [
  {name:"Europe",        surveyed:300, endangered:278},
  {name:"North America", surveyed:161, endangered:117},
  {name:"Australia",     surveyed:94,  endangered:20},
  {name:"Asia",          surveyed:75,  endangered:50},
  {name:"Africa",        surveyed:64,  endangered:44},
  {name:"South America", surveyed:16,  endangered:16}
];
responsive(document.getElementById("regions"), (node, W) => {
  const padL = 116, padR = 46, padT = 10, padB = 28;
  const rowH = 38, H = padT + REGIONS.length*rowH + padB;
  const svg = el("svg",{viewBox:`0 0 ${W} ${H}`, width:W, height:H, role:"img",
    "aria-label":"Aquifers surveyed and aquifers hosting endangered species, by region"}, node);
  const max = 300, x0 = padL, x1 = W - padR;
  const x = v => x0 + (v/max)*(x1-x0);
  [0,100,200,300].forEach(t=>{
    el("line",{x1:x(t),x2:x(t),y1:padT,y2:H-padB,stroke:css("--rule-soft"),"stroke-width":1},svg);
    text(svg, x(t), H-padB+15, String(t), {anchor:"middle", size:10});
  });
  REGIONS.forEach((r,i)=>{
    const yTop = padT + i*rowH;
    text(svg, x0-10, yTop+20, r.name, {anchor:"end", size:12, fill:css("--ink"), mono:false, weight:500});
    el("rect",{x:x0,y:yTop+6,width:Math.max(1,x(r.surveyed)-x0),height:11,rx:2,fill:css("--factual")},svg);
    el("rect",{x:x0,y:yTop+21,width:Math.max(1,x(r.endangered)-x0),height:11,rx:2,fill:css("--counter")},svg);
    text(svg, x(r.surveyed)+6, yTop+15, String(r.surveyed), {size:10, fill:css("--ink-2")});
    text(svg, x(r.endangered)+6, yTop+30, String(r.endangered), {size:10, fill:css("--ink-2")});
  });
  text(svg, x0, H-padB+15, "0", {anchor:"middle", size:10});
});

/* ---------- 2. key figures ---------- */
(function(){
  const c = D.historical.series.comal_counterfactual, j = D.historical.series.j17_counterfactual;
  const dQ = c.obs_median - c.cf_median, dG = j.obs_median - j.cf_median;
  const items = [
    {v:"+"+dQ.toFixed(2), s:"m³/s", l:"Higher median spring flow at Comal than without the cutbacks, 2006–2022", warn:false},
    {v:"+"+dG.toFixed(2), s:"m", l:"Higher median water table at the J17 index well over the same 17 years", warn:false},
    {v:"0.80 → 0.30", s:"R²", l:"Model agreement before cutbacks, then after — the divergence is the finding", warn:true},
    {v:"144", s:"days", l:"Comal Springs ran dry in 1956, the benchmark these rules exist to avoid", warn:true}
  ];
  document.getElementById("keyrow").innerHTML = items.map(i=>
    `<div class="key"><span class="key-v${i.warn?" warn":""}">${i.v}</span>`+
    `<span class="key-s">${i.s}</span><span class="key-l">${i.l}</span></div>`).join("");
})();

/* ---------- 3. stage ladder ---------- */
(function(){
  const shades = ["--cs1","--cs2","--cs3","--cs4","--cs5"];
  document.getElementById("ladder").innerHTML = D.stages.map((s,i)=>
    `<tr><td><span class="chip"><i style="background:var(${shades[i]})"></i>${s.id}</span></td>`+
    `<td>${s.j17.toFixed(1)}</td><td>${s.comal.toFixed(2)}</td><td>−${s.cutback}%</td></tr>`).join("");
})();

/* ---------- 4. historical ---------- */
const hist = {site:"comal", period:"counterfactual"};
const histNode = document.getElementById("hist");
const histTip = document.createElement("div");
histTip.className = "tip";
histNode.parentNode.appendChild(histTip);

function drawHist(node, W){
  const s = SITE[hist.site], rec = D.historical.series[`${hist.site}_${hist.period}`];
  const dates = D.historical.dates[hist.period];
  const obs = rec.observed, cf = rec.counterfactual;
  const padL = 52, padR = 42, padT = 14, padB = 34;
  const H = Math.round(Math.max(260, Math.min(420, W*0.44)));
  const svg = el("svg",{viewBox:`0 0 ${W} ${H}`, width:W, height:H, role:"img",
    "aria-label":`${s.label}: observed versus counterfactual, ${rec.years[0]}–${rec.years[1]}`}, node);
  const x0=padL, x1=W-padR, yT=padT, yB=H-padB;

  const all = obs.concat(cf).filter(v=>v!=null);
  let lo = Math.min.apply(null, all), hi = Math.max.apply(null, all);
  const th = D.stages.map(v=>v[hist.site]);
  lo = Math.min(lo, th[4]); hi = Math.max(hi, th[0]);
  if (hist.site === "comal") lo = Math.max(0, lo);
  const ns = niceScale(lo, hi, 5);
  lo = hist.site==="comal" ? Math.max(0, ns.lo) : ns.lo;
  hi = ns.hi;
  const y = v => yB - (v-lo)/(hi-lo)*(yB-yT);
  y.range0 = yT; y.range1 = yB;
  const x = i => x0 + i/(dates.length-1)*(x1-x0);

  const gB = el("g",{},svg);
  stageBands(gB, hist.site, x0, x1, y, lo);

  // y axis
  ns.ticks.forEach(v => {
    if (v < lo || v > hi) return;
    text(svg, x0-8, y(v)+3.5, v.toFixed(ns.dp), {anchor:"end", size:10});
  });
  text(svg, 12, (yT+yB)/2, s.axis, {anchor:"middle", size:10,
    fill:css("--ink-3")}).setAttribute("transform",`rotate(-90 12 ${(yT+yB)/2})`);

  // x axis — year ticks
  const y0 = +dates[0].slice(0,4), y1 = +dates[dates.length-1].slice(0,4);
  const stepY = (y1-y0) > 12 ? 4 : 2;
  for (let yy=Math.ceil(y0/stepY)*stepY; yy<=y1; yy+=stepY){
    let idx = dates.findIndex(d => +d.slice(0,4) === yy);
    if (idx < 0) continue;
    el("line",{x1:x(idx),x2:x(idx),y1:yT,y2:yB,stroke:css("--rule-soft"),"stroke-width":1},svg);
    text(svg, x(idx), yB+16, String(yy), {anchor:"middle", size:10});
  }
  el("rect",{x:x0,y:yT,width:x1-x0,height:yB-yT,fill:"none",stroke:css("--rule"),"stroke-width":1},svg);

  const path = arr => arr.map((v,i)=> v==null ? null : `${i===0||arr[i-1]==null?"M":"L"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`)
                        .filter(Boolean).join(" ");
  el("path",{d:path(cf), fill:"none", stroke:css("--counter"), "stroke-width":1.6,
    "stroke-linejoin":"round","stroke-linecap":"round"}, svg);
  el("path",{d:path(obs), fill:"none", stroke:css("--factual"), "stroke-width":1.6,
    "stroke-linejoin":"round","stroke-linecap":"round"}, svg);

  // hover
  const cross = el("line",{x1:0,x2:0,y1:yT,y2:yB,stroke:css("--ink-3"),"stroke-width":1,opacity:0},svg);
  const d1 = el("circle",{r:4,fill:css("--factual"),stroke:css("--panel"),"stroke-width":2,opacity:0},svg);
  const d2 = el("circle",{r:4,fill:css("--counter"),stroke:css("--panel"),"stroke-width":2,opacity:0},svg);
  const hit = el("rect",{x:x0,y:yT,width:x1-x0,height:yB-yT,fill:"transparent"},svg);
  const move = ev => {
    const r = svg.getBoundingClientRect();
    const px = (ev.touches? ev.touches[0].clientX : ev.clientX) - r.left;
    const i = Math.max(0, Math.min(dates.length-1,
      Math.round((px - x0*(r.width/W)) / ((x1-x0)*(r.width/W)) * (dates.length-1))));
    if (obs[i]==null) return;
    cross.setAttribute("x1",x(i)); cross.setAttribute("x2",x(i)); cross.setAttribute("opacity",.5);
    d1.setAttribute("cx",x(i)); d1.setAttribute("cy",y(obs[i])); d1.setAttribute("opacity",1);
    d2.setAttribute("cx",x(i)); d2.setAttribute("cy",y(cf[i])); d2.setAttribute("opacity",1);
    histTip.innerHTML = `<span class="tt">Week of ${dates[i]}</span>`+
      `<span class="tr"><span>Observed</span><b style="color:var(--factual)">${fmt(obs[i],s.dec)} ${s.unit}</b></span>`+
      `<span class="tr"><span>Counterfactual</span><b style="color:var(--counter)">${fmt(cf[i],s.dec)} ${s.unit}</b></span>`;
    histTip.classList.add("on");
    const sc = r.width/W, left = x(i)*sc;
    histTip.style.left = Math.min(r.width - histTip.offsetWidth - 6, Math.max(6, left + 12)) + "px";
    histTip.style.top = Math.max(6, y(Math.max(obs[i],cf[i]))*sc - 10) + "px";
  };
  hit.addEventListener("mousemove", move);
  hit.addEventListener("touchmove", ev => { move(ev); ev.preventDefault(); }, {passive:false});
  const off = () => { histTip.classList.remove("on"); cross.setAttribute("opacity",0);
    d1.setAttribute("opacity",0); d2.setAttribute("opacity",0); };
  hit.addEventListener("mouseleave", off);
  hit.addEventListener("touchend", off);
}

function weeksBelow(arr, threshold){
  let n = 0;
  for (const v of arr) if (v != null && v < threshold) n++;
  return n;
}
function updateHist(){
  const s = SITE[hist.site], rec = D.historical.series[`${hist.site}_${hist.period}`];
  const cs4 = D.stages[3][hist.site];
  const oB = weeksBelow(rec.observed, cs4), cB = weeksBelow(rec.counterfactual, cs4);
  document.getElementById("hist-readout").innerHTML =
    `<span>Agreement <b>R² ${rec.r2.toFixed(3)}</b></span>`+
    `<span>Error <b>RMSE ${rec.rmse.toFixed(3)} ${s.unit}</b></span>`+
    `<span>Median observed <b>${fmt(rec.obs_median,s.dec)}</b> · counterfactual <b>${fmt(rec.cf_median,s.dec)} ${s.unit}</b></span>`+
    `<span>Weeks below CS4 <b>${oB}</b> observed · <b>${cB}</b> counterfactual</span>`;

  const f = document.getElementById("hist-finding");
  if (hist.period === "validation"){
    f.textContent = `Before the cutbacks existed, the model reproduces ${s.short} to R² ${rec.r2.toFixed(2)}. `+
      `It is a working description of the unmanaged aquifer — which is what licenses the comparison in the other window.`;
  } else {
    const d = (rec.obs_median - rec.cf_median).toFixed(s.dec);
    f.textContent = `The same model, unchanged, now explains only R² ${rec.r2.toFixed(2)} of what the gauges did. `+
      `It runs low by ${d} ${s.unit} at the median and spends ${cB - oB} more weeks below CS4 than reality did. `+
      `The model did not get worse — the aquifer stopped behaving like one nobody was managing.`;
  }
  histNode.__redraw ? histNode.__redraw() : null;
}
responsive(histNode, drawHist);

/* ---------- 5. decadal boxplots ---------- */
const dec = {site:"comal", gcm:"HadGEM2-CC", scen:"rcp85"};
const decNode = document.getElementById("dec");
const decTip = document.createElement("div");
decTip.className = "tip";
decNode.parentNode.appendChild(decTip);

function decKey(mit){ return `${dec.site}|${dec.gcm}|${dec.scen}|${mit}`; }

function drawDec(node, W){
  const s = SITE[dec.site];
  const NM = D.decadal[decKey("NM")], M = D.decadal[decKey("M")];
  if (!NM || !M) return;
  const padL = 52, padR = 42, padT = 14, padB = 40;
  const H = Math.round(Math.max(280, Math.min(420, W*0.46)));
  const svg = el("svg",{viewBox:`0 0 ${W} ${H}`, width:W, height:H, role:"img",
    "aria-label":`Decadal ${s.label} with and without mitigation, ${dec.gcm} ${SCEN_LABEL[dec.scen]}`}, node);
  const x0=padL, x1=W-padR, yT=padT, yB=H-padB;

  const vals = [];
  NM.concat(M).forEach(b => { if(b){ vals.push(b.lo, b.hi); } });
  const th = D.stages.map(v=>v[dec.site]);
  const recLine = dec.site==="comal" ? D.extremes.comal_min : D.extremes.j17_min;
  let lo = Math.min.apply(null, vals.concat([th[4], recLine]));
  let hi = Math.max.apply(null, vals.concat([th[0]]));
  if (dec.site === "comal") lo = Math.max(0, lo);
  const ns = niceScale(lo, hi, 5);
  lo = dec.site==="comal" ? Math.max(0, ns.lo) : ns.lo;
  hi = ns.hi;
  const y = v => yB - (v-lo)/(hi-lo)*(yB-yT);
  y.range0 = yT; y.range1 = yB;

  stageBands(el("g",{},svg), dec.site, x0, x1, y, lo);

  ns.ticks.forEach(v => {
    if (v < lo || v > hi) return;
    text(svg, x0-8, y(v)+3.5, v.toFixed(ns.dp), {anchor:"end", size:10});
  });
  text(svg, 12, (yT+yB)/2, s.axis, {anchor:"middle", size:10}).setAttribute(
    "transform",`rotate(-90 12 ${(yT+yB)/2})`);

  // lowest-on-record reference
  if (recLine >= lo && recLine <= hi){
    el("line",{x1:x0,x2:x1,y1:y(recLine),y2:y(recLine),stroke:css("--record"),
      "stroke-width":2,"stroke-dasharray":"5 4"},svg);
  }
  el("rect",{x:x0,y:yT,width:x1-x0,height:yB-yT,fill:"none",stroke:css("--rule"),"stroke-width":1},svg);

  const n = D.decadeStarts.length;
  const slot = (x1-x0)/n;
  const bw = Math.min(17, slot*0.30);
  const gap = 2; // surface gap between the paired boxes

  const drawBox = (b, cx, color, meta) => {
    if (!b) return;
    el("line",{x1:cx,x2:cx,y1:y(b.hi),y2:y(b.lo),stroke:color,"stroke-width":1.4},svg);
    el("line",{x1:cx-bw*0.26,x2:cx+bw*0.26,y1:y(b.hi),y2:y(b.hi),stroke:color,"stroke-width":1.4},svg);
    el("line",{x1:cx-bw*0.26,x2:cx+bw*0.26,y1:y(b.lo),y2:y(b.lo),stroke:color,"stroke-width":1.4},svg);
    const top = y(b.q3), h = Math.max(2, y(b.q1)-y(b.q3));
    const r = el("rect",{x:cx-bw/2,y:top,width:bw,height:h,rx:2,fill:color,
      stroke:css("--panel"),"stroke-width":1},svg);
    el("line",{x1:cx-bw/2,x2:cx+bw/2,y1:y(b.med),y2:y(b.med),stroke:css("--panel"),"stroke-width":2},svg);
    r.addEventListener("mouseenter", ev => {
      decTip.innerHTML = `<span class="tt">${meta.decade} · ${meta.which}</span>`+
        `<span class="tr"><span>Median</span><b>${fmt(b.med,s.dec)} ${s.unit}</b></span>`+
        `<span class="tr"><span>IQR</span><b>${fmt(b.q1,s.dec)} – ${fmt(b.q3,s.dec)}</b></span>`+
        (dec.site==="comal" && b.zero>0 ? `<span class="tr"><span>No-flow weeks</span><b>${b.zero}%</b></span>`:"");
      decTip.classList.add("on");
      const pr = decNode.parentNode.getBoundingClientRect(), rr = ev.target.getBoundingClientRect();
      decTip.style.left = Math.min(pr.width - decTip.offsetWidth - 6,
        Math.max(6, rr.left - pr.left + rr.width/2 - decTip.offsetWidth/2)) + "px";
      decTip.style.top = Math.max(6, rr.top - pr.top - decTip.offsetHeight - 6) + "px";
    });
    r.addEventListener("mouseleave", () => decTip.classList.remove("on"));
  };

  D.decadeStarts.forEach((yr,i)=>{
    const cx = x0 + slot*(i+0.5);
    drawBox(NM[i], cx - bw/2 - gap/2, css("--counter"), {decade:`${yr}–${yr+9}`, which:"Without mitigation"});
    drawBox(M[i],  cx + bw/2 + gap/2, css("--factual"), {decade:`${yr}–${yr+9}`, which:"With mitigation"});
    text(svg, cx, yB+16, String(yr), {anchor:"middle", size:10});
  });
  text(svg, (x0+x1)/2, H-6, "Decade beginning", {anchor:"middle", size:10, mono:false});
}

function updateDec(){
  const s = SITE[dec.site];
  const NM = D.decadal[decKey("NM")], M = D.decadal[decKey("M")];
  let worst = -1, wi = 0;
  NM.forEach((b,i)=>{ if(b && (worst<0 || b.med < worst)){ worst = b.med; wi = i; }});
  const gain = M[wi].med - NM[wi].med;
  const zero = dec.site==="comal"
    ? `<span>No-flow weeks in that decade <b>${NM[wi].zero}%</b> without · <b>${M[wi].zero}%</b> with</span>` : "";
  document.getElementById("dec-readout").innerHTML =
    `<span>${dec.gcm} · ${SCEN_LABEL[dec.scen]}</span>`+
    `<span>Hardest decade <b>${D.decadeStarts[wi]}–${D.decadeStarts[wi]+9}</b></span>`+
    `<span>Median <b>${fmt(NM[wi].med,s.dec)}</b> without → <b>${fmt(M[wi].med,s.dec)} ${s.unit}</b> with `+
    `(<b>${gain>=0?"+":""}${gain.toFixed(s.dec)}</b>)</span>` + zero;
  decNode.__redraw && decNode.__redraw();
}

/* ---------- 6. ensemble envelope ---------- */
const env = {site:"comal", gen:"CMIP5", scen:"rcp45"};
const envNode = document.getElementById("env");
const envTip = document.createElement("div");
envTip.className = "tip";
envNode.parentNode.appendChild(envTip);

function drawEnv(node, W){
  const s = SITE[env.site];
  const years = D.envelope.years;
  const NM = D.envelope.data[`${env.site}|${env.gen}|${env.scen}|NM`];
  const M  = D.envelope.data[`${env.site}|${env.gen}|${env.scen}|M`];
  if (!NM || !M) return;
  const padL = 52, padR = 42, padT = 14, padB = 34;
  const H = Math.round(Math.max(270, Math.min(400, W*0.42)));
  const svg = el("svg",{viewBox:`0 0 ${W} ${H}`, width:W, height:H, role:"img",
    "aria-label":`${env.gen} ensemble ${s.label} with and without mitigation under ${SCEN_LABEL[env.scen]}`}, node);
  const x0=padL, x1=W-padR, yT=padT, yB=H-padB;

  const vals = NM.lo.concat(NM.hi, M.lo, M.hi).filter(v=>v!=null);
  const th = D.stages.map(v=>v[env.site]);
  let lo = Math.min.apply(null, vals.concat([th[4]]));
  let hi = Math.max.apply(null, vals.concat([th[0]]));
  if (env.site === "comal") lo = Math.max(0, lo);
  const ns = niceScale(lo, hi, 5);
  lo = env.site==="comal" ? Math.max(0, ns.lo) : ns.lo;
  hi = ns.hi;
  const y = v => yB - (v-lo)/(hi-lo)*(yB-yT);
  y.range0 = yT; y.range1 = yB;
  const x = i => x0 + i/(years.length-1)*(x1-x0);

  stageBands(el("g",{},svg), env.site, x0, x1, y, lo);

  ns.ticks.forEach(v => {
    if (v < lo || v > hi) return;
    text(svg, x0-8, y(v)+3.5, v.toFixed(ns.dp), {anchor:"end", size:10});
  });
  text(svg, 12, (yT+yB)/2, s.axis, {anchor:"middle", size:10}).setAttribute(
    "transform",`rotate(-90 12 ${(yT+yB)/2})`);
  years.forEach((yy,i)=>{
    if (yy % 10 !== 0) return;
    el("line",{x1:x(i),x2:x(i),y1:yT,y2:yB,stroke:css("--rule-soft"),"stroke-width":1},svg);
    text(svg, x(i), yB+16, String(yy), {anchor:"middle", size:10});
  });

  const band = (d, fill) => {
    const up = d.hi.map((v,i)=>`${i?"L":"M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
    const dn = d.lo.map((v,i)=>[x(d.lo.length-1-i), y(d.lo[d.lo.length-1-i])])
                   .map(p=>`L${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
    el("path",{d:up+" "+dn+" Z", fill, stroke:"none"}, svg);
  };
  const line = (d, stroke) => el("path",{
    d:d.mean.map((v,i)=>`${i?"L":"M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" "),
    fill:"none", stroke, "stroke-width":2, "stroke-linejoin":"round"}, svg);

  band(NM, css("--counter-soft"));
  band(M,  css("--factual-soft"));
  line(NM, css("--counter"));
  line(M,  css("--factual"));
  el("rect",{x:x0,y:yT,width:x1-x0,height:yB-yT,fill:"none",stroke:css("--rule"),"stroke-width":1},svg);

  const cross = el("line",{x1:0,x2:0,y1:yT,y2:yB,stroke:css("--ink-3"),"stroke-width":1,opacity:0},svg);
  const hit = el("rect",{x:x0,y:yT,width:x1-x0,height:yB-yT,fill:"transparent"},svg);
  hit.addEventListener("mousemove", ev => {
    const r = svg.getBoundingClientRect(), sc = r.width/W;
    const i = Math.max(0, Math.min(years.length-1,
      Math.round((ev.clientX - r.left - x0*sc) / ((x1-x0)*sc) * (years.length-1))));
    cross.setAttribute("x1",x(i)); cross.setAttribute("x2",x(i)); cross.setAttribute("opacity",.5);
    envTip.innerHTML = `<span class="tt">${years[i]} · ${env.gen} ensemble mean</span>`+
      `<span class="tr"><span>Without mitigation</span><b style="color:var(--counter)">${fmt(NM.mean[i],s.dec)} ${s.unit}</b></span>`+
      `<span class="tr"><span>With mitigation</span><b style="color:var(--factual)">${fmt(M.mean[i],s.dec)} ${s.unit}</b></span>`;
    envTip.classList.add("on");
    envTip.style.left = Math.min(r.width - envTip.offsetWidth - 6, Math.max(6, x(i)*sc + 12)) + "px";
    envTip.style.top = yT*sc + 6 + "px";
  });
  hit.addEventListener("mouseleave", () => { envTip.classList.remove("on"); cross.setAttribute("opacity",0); });
}

function updateEnv(){
  const s = SITE[env.site];
  const NM = D.envelope.data[`${env.site}|${env.gen}|${env.scen}|NM`];
  const M  = D.envelope.data[`${env.site}|${env.gen}|${env.scen}|M`];
  const n = NM.mean.length, half = Math.floor(n/2);
  const avg = a => a.reduce((x,y)=>x+y,0)/a.length;
  const lateN = avg(NM.mean.slice(half)), lateM = avg(M.mean.slice(half));
  const cs4 = D.stages[3][env.site];
  const yrsBelowN = NM.mean.filter(v=>v<cs4).length, yrsBelowM = M.mean.filter(v=>v<cs4).length;
  document.getElementById("env-readout").innerHTML =
    `<span>${env.gen} · ${SCEN_LABEL[env.scen]} · ${env.gen==="CMIP5"?D.cmip5.length:D.cmip6.length} models</span>`+
    `<span>Post-2061 ensemble mean <b>${fmt(lateN,s.dec)}</b> without → <b>${fmt(lateM,s.dec)} ${s.unit}</b> with</span>`+
    `<span>Years with the mean below CS4 <b>${yrsBelowN}</b> without · <b>${yrsBelowM}</b> with</span>`;
  envNode.__redraw && envNode.__redraw();
}

/* ---------- controls ---------- */
function segment(id, onPick){
  const host = document.getElementById(id);
  host.addEventListener("click", ev => {
    const b = ev.target.closest("button[data-v]");
    if (!b || b.getAttribute("aria-pressed") === "true") return;
    host.querySelectorAll("button[data-v]").forEach(x =>
      x.setAttribute("aria-pressed", String(x === b)));
    onPick(b.dataset.v);
  });
}
function fillSeg(id, opts, active){
  document.getElementById(id).innerHTML = opts.map(o =>
    `<button type="button" data-v="${o[0]}" aria-pressed="${o[0]===active}">${o[1]}</button>`).join("");
}

segment("hist-site", v => { hist.site = v; updateHist(); });
segment("hist-period", v => { hist.period = v; updateHist(); });

const gcmSel = document.getElementById("dec-gcm");
gcmSel.innerHTML =
  `<optgroup label="CMIP5">${D.cmip5.map(g=>`<option value="${g}">${g}</option>`).join("")}</optgroup>`+
  `<optgroup label="CMIP6">${D.cmip6.map(g=>`<option value="${g}">${g}</option>`).join("")}</optgroup>`;
gcmSel.value = dec.gcm;
function decScenOpts(){
  return D.scenarios[GEN_OF(dec.gcm)].map(p => [p[0], p[1]]);
}
function syncDecScen(){
  const opts = decScenOpts();
  if (!opts.some(o => o[0] === dec.scen)) dec.scen = opts[0][0];
  fillSeg("dec-scen", opts, dec.scen);
}
gcmSel.addEventListener("change", () => { dec.gcm = gcmSel.value; syncDecScen(); updateDec(); });
segment("dec-site", v => { dec.site = v; updateDec(); });
document.getElementById("dec-scen").addEventListener("click", ev => {
  const b = ev.target.closest("button[data-v]");
  if (!b || b.getAttribute("aria-pressed")==="true") return;
  document.getElementById("dec-scen").querySelectorAll("button").forEach(x =>
    x.setAttribute("aria-pressed", String(x===b)));
  dec.scen = b.dataset.v; updateDec();
});

function syncEnvScen(){
  const opts = D.scenarios[env.gen].map(p => [p[0], p[1]]);
  if (!opts.some(o => o[0] === env.scen)) env.scen = opts[0][0];
  fillSeg("env-scen", opts, env.scen);
}
segment("env-site", v => { env.site = v; updateEnv(); });
segment("env-gen", v => { env.gen = v; syncEnvScen(); updateEnv(); });
document.getElementById("env-scen").addEventListener("click", ev => {
  const b = ev.target.closest("button[data-v]");
  if (!b || b.getAttribute("aria-pressed")==="true") return;
  document.getElementById("env-scen").querySelectorAll("button").forEach(x =>
    x.setAttribute("aria-pressed", String(x===b)));
  env.scen = b.dataset.v; updateEnv();
});

/* ---------- citation ---------- */
document.getElementById("cite").innerHTML =
  `Sharma, C., Ba&#351;a&#287;ao&#287;lu, H., Yoosefdoost, I., Wootten, A., Chakraborty-Reddy, D., Bertetti, F.&nbsp;P., `+
  `Mirchi, A. &amp; Chakraborty, D. <em>${D.meta.title}.</em> ${D.meta.journal}. `+
  `<a href="https://doi.org/${D.meta.doi}">doi.org/${D.meta.doi}</a> &middot; `+
  `Code and data: <a href="${D.meta.capsule}">Code Ocean capsule</a> (${D.meta.capsule_doi}).`;

/* ---------- boot ---------- */
syncDecScen();
syncEnvScen();
responsive(decNode, drawDec);
responsive(envNode, drawEnv);
updateHist();
updateDec();
updateEnv();

/* repaint on theme change so SVG picks up new tokens */
if (window.matchMedia){
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const repaint = () => { [histNode, decNode, envNode, document.getElementById("regions")]
    .forEach(n => n && n.__redraw && n.__redraw()); };
  mq.addEventListener ? mq.addEventListener("change", repaint) : mq.addListener(repaint);
  new MutationObserver(repaint).observe(document.documentElement, {attributes:true, attributeFilter:["data-theme"]});
}
})();
