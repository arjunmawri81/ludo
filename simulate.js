/**
 * LUDO MIRROR PRO — GODMODE v3 ENGINE
 * Monte Carlo Simulation: 1,00,000 Games
 * RED (Our AI) vs YELLOW (Best Opponent AI)
 */

const RING_SIZE = 52;
const GOAL = 56;
const YARD = -1;
const SAFE_RINGS = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
const OPP_START_RING = 26;

function getRingIdx(color, prog) {
  const offset = (color === "red") ? 0 : 26;
  return (offset + prog) % RING_SIZE;
}
function isSafe(r) { return SAFE_RINGS.has(r); }
function ringDist(from, to) { return (to - from + RING_SIZE) % RING_SIZE; }
function rollDice() { return Math.floor(Math.random() * 6) + 1; }
function biasedDice(n, p) { return Math.random() < p ? n : rollDice(); }

function canMove(state, idx, dice) {
  const p = state[idx];
  if (p >= GOAL) return false;
  if (p === YARD) return dice === 6;
  return (p + dice <= GOAL);
}

function applyMove(myState, oppState, myColor, idx, dice) {
  const ms = [...myState], os = [...oppState];
  const p = ms[idx];
  let killed = false, goal = false;
  if (p === YARD) { ms[idx] = 0; }
  else {
    ms[idx] = p + dice;
    if (ms[idx] === GOAL) { goal = true; }
    else if (ms[idx] <= 50) {
      const myR = getRingIdx(myColor, ms[idx]);
      if (!isSafe(myR)) {
        const oppColor = myColor === "red" ? "yellow" : "red";
        for (let i = 0; i < 4; i++) {
          if (os[i] >= 0 && os[i] <= 50 && getRingIdx(oppColor, os[i]) === myR) {
            os[i] = YARD; killed = true;
          }
        }
      }
    }
  }
  return { newMy: ms, newOpp: os, killed, goal };
}

function isWon(state) { return state.every(p => p >= GOAL); }

function scoreMove(myState, oppState, gi, dice) {
  const cur = myState[gi];
  if (cur >= GOAL) return null;
  let nxt, unlock = false;
  if (cur === YARD) { if (dice !== 6) return null; nxt = 0; unlock = true; }
  else { if (cur + dice > GOAL) return null; nxt = cur + dice; }
  const nR = (nxt >= 0 && nxt <= 50) ? getRingIdx("red", nxt) : null;
  const cR = (cur >= 0 && cur <= 50) ? getRingIdx("red", cur) : null;
  const onStar = nR !== null && isSafe(nR);
  const inHome = nxt >= 51, isGoal = nxt === GOAL;
  let sc = 0;
  // L1: Kill
  if (nR !== null && !onStar) {
    oppState.forEach((oP,oI) => { if (oP>=0&&oP<=50&&getRingIdx("yellow",oP)===nR) sc += 2200+oP*40+700; });
  }
  // L2: Goal/Home/Star
  if (isGoal) sc += 2600;
  else if (inHome) sc += 1100+(nxt-50)*80;
  else if (onStar) sc += 900;
  // L3: Blockade
  if (nR!==null&&!onStar) {
    let bc=0; myState.forEach((p,i)=>{if(i!==gi&&p>=0&&p<=50&&getRingIdx("red",p)===nR)bc++;});
    if(bc>=1){sc+=1400;oppState.forEach(oP=>{if(oP>=0&&oP<=50&&ringDist(getRingIdx("yellow",oP),nR)<=20)sc+=800;});}
    let ob=0; oppState.forEach(oP=>{if(oP>=0&&oP<=50&&getRingIdx("yellow",oP)===nR)ob++;});
    if(ob>=2) sc-=9999;
  }
  // L4: Ambush
  const inYard=oppState.filter(p=>p===YARD).length;
  if(inYard>0&&nR!==null&&!onStar){const d=ringDist(nR,OPP_START_RING);if(d>=1&&d<=6)sc+=600+inYard*200;}
  // L5: Anti-6 shield
  if(nR!==null&&!onStar){let t=0;oppState.forEach(oP=>{let a6=oP===YARD?0:(oP>=0&&oP<=50?oP+6:-1);if(a6>=0&&a6<=50){const r=getRingIdx("yellow",a6);const d1=ringDist(r,nR);if(d1===0&&!isSafe(nR))t+=3;else if(d1>=1&&d1<=6)t+=2;const a12=a6+6;if(a12<=50){const r2=getRingIdx("yellow",a12);const d2=ringDist(r2,nR);if(d2===0&&!isSafe(nR))t+=2;else if(d2>=1&&d2<=6)t+=1;}}});sc-=t*380;}
  // L6: Vulnerability
  let kv=0;
  if(nR!==null&&!onStar){oppState.forEach(oP=>{if(oP>=0&&oP<=50){const d=ringDist(getRingIdx("yellow",oP),nR);if(d>=1&&d<=6){kv++;sc-=600+nxt*30;}}});} 
  // L7: Dead trap
  if(nR!==null){oppState.forEach((oP,oI)=>{if(oP>=0&&oP<=50){const hd=ringDist(nR,getRingIdx("yellow",oP));if(hd>=1&&hd<=6){let esc=false;for(let r=1;r<=6;r++){const e=oP+r;if(e>50){esc=true;break;}if(isSafe(getRingIdx("yellow",e))){esc=true;break;}let trap=false;myState.forEach((mP,mI)=>{if(mI!==gi&&mP>=0&&mP<=50&&ringDist(getRingIdx("red",mP),getRingIdx("yellow",e))<=6)trap=true;});if(!trap){esc=true;}}sc+=esc?500:1200;}}});}
  // L8: Golden dist
  if(nR!==null&&!onStar&&kv===0){oppState.forEach(oP=>{if(oP>=0&&oP<=50){const d=ringDist(getRingIdx("yellow",oP),nR);if(d===7||d===8)sc+=450;}});}
  // L9: Escape
  if(cR!==null&&!isSafe(cR)){oppState.forEach(oP=>{if(oP>=0&&oP<=50&&ringDist(getRingIdx("yellow",oP),cR)<=6&&kv===0)sc+=550;});}
  // L10: Wolfpack
  myState.forEach((oP,oI)=>{if(oI!==gi&&oP>=0&&oP<=55){const g=Math.abs(nxt-oP);if(g>=1&&g<=5)sc+=160;else if(g<=12)sc+=70;}});
  // L11: Pressure
  const hm=[...myState];hm[gi]=nxt;
  oppState.forEach(oP=>{if(oP>=0&&oP<=50){const oR=getRingIdx("yellow",oP);hm.forEach(mP=>{if(mP>=0&&mP<=50&&ringDist(getRingIdx("red",mP),oR)<=6&&!isSafe(oR))sc+=180;});}});
  // L12: Progress
  sc+=nxt*4;if(unlock)sc+=950;
  return {gi,nxt,sc};
}

function scoreMoveYellow(os,ms,gi,dice){
  const cur=os[gi];if(cur>=GOAL)return null;
  let nxt,unlock=false;
  if(cur===YARD){if(dice!==6)return null;nxt=0;unlock=true;}
  else{if(cur+dice>GOAL)return null;nxt=cur+dice;}
  const nR=(nxt>=0&&nxt<=50)?getRingIdx("yellow",nxt):null;
  const onStar=nR!==null&&isSafe(nR);const isGoal=nxt===GOAL;const inHome=nxt>=51;
  let sc=0;
  if(nR!==null&&!onStar){ms.forEach(mP=>{if(mP>=0&&mP<=50&&getRingIdx("red",mP)===nR)sc+=2200+mP*40+700;});}
  if(isGoal)sc+=2600;else if(inHome)sc+=1100+(nxt-50)*80;else if(onStar)sc+=900;
  if(nR!==null&&!onStar){let bc=0;os.forEach((p,i)=>{if(i!==gi&&p>=0&&p<=50&&getRingIdx("yellow",p)===nR)bc++;});if(bc>=1)sc+=2200;let rb=0;ms.forEach(mP=>{if(mP>=0&&mP<=50&&getRingIdx("red",mP)===nR)rb++;});if(rb>=2)sc-=9999;}
  const myY=ms.filter(p=>p===YARD).length;
  if(myY>0&&nR!==null&&!onStar){const d=ringDist(nR,0);if(d>=1&&d<=6)sc+=600+myY*200;}
  if(nR!==null&&!onStar){ms.forEach(mP=>{if(mP>=0&&mP<=50){const d=ringDist(getRingIdx("red",mP),nR);if(d>=1&&d<=6)sc-=600+nxt*30;}});}
  if(nR!==null){ms.forEach(mP=>{if(mP>=0&&mP<=50){const hd=ringDist(nR,getRingIdx("red",mP));if(hd>=1&&hd<=6)sc+=500;}});}
  sc+=nxt*4;if(unlock)sc+=950;
  return{gi,nxt,sc};
}

function bestRed(red,yellow,dice){let best=null;for(let i=0;i<4;i++){if(!canMove(red,i,dice))continue;const r=scoreMove(red,yellow,i,dice);if(r&&(!best||r.sc>best.sc))best=r;}return best;}
function bestYellow(yellow,red,dice){let best=null;for(let i=0;i<4;i++){if(!canMove(yellow,i,dice))continue;const r=scoreMoveYellow(yellow,red,i,dice);if(r&&(!best||r.sc>best.sc))best=r;}return best;}

function simGame(rdMode,ydMode){
  let red=[YARD,YARD,YARD,YARD],yellow=[YARD,YARD,YARD,YARD];
  let rk=0,yk=0,t=0;
  while(t<600){
    // RED
    let bonus=false;
    do{
      bonus=false;
      const d=rdMode==="bad1"?1:rdMode==="bias6"?biasedDice(6,0.5):rollDice();
      const m=bestRed(red,yellow,d);
      if(!m)break;
      const r=applyMove(red,yellow,"red",m.gi,d);
      red=r.newMy;yellow=r.newOpp;
      if(r.killed){rk++;bonus=true;}
      if(r.goal&&!isWon(red))bonus=true;
      if(d===6&&!r.goal)bonus=true;
      if(isWon(red))return{w:"R",rk,yk};
    }while(bonus);
    // YELLOW
    do{
      bonus=false;
      const d=ydMode==="all6"?6:ydMode==="bias6"?biasedDice(6,0.6):rollDice();
      const m=bestYellow(yellow,red,d);
      if(!m)break;
      const r=applyMove(yellow,red,"yellow",m.gi,d);
      yellow=r.newMy;red=r.newOpp;
      if(r.killed){yk++;bonus=true;}
      if(r.goal&&!isWon(yellow))bonus=true;
      if(d===6&&!r.goal)bonus=true;
      if(isWon(yellow))return{w:"Y",rk,yk};
    }while(bonus);
    t++;
  }
  return{w:"D",rk,yk};
}

function runScenario(name,rdMode,ydMode,N){
  let wins=0,losses=0,draws=0,rk=0,yk=0;
  const tick=Math.floor(N/40);
  process.stdout.write("  [");
  for(let i=0;i<N;i++){
    const r=simGame(rdMode,ydMode);
    if(r.w==="R")wins++;else if(r.w==="Y")losses++;else draws++;
    rk+=r.rk;yk+=r.yk;
    if(i%tick===0)process.stdout.write("=");
  }
  process.stdout.write("]\n");
  return{name,N,wins,losses,draws,
    wr:((wins/N)*100).toFixed(1),
    lr:((losses/N)*100).toFixed(1),
    dr:((draws/N)*100).toFixed(1),
    akr:(rk/N).toFixed(2),
    aky:(yk/N).toFixed(2)
  };
}

const PER=20000;
console.log("\n╔══════════════════════════════════════════════════════════════╗");
console.log("║  GODMODE v3 — 1,00,000 Game Monte Carlo Simulation          ║");
console.log("║  RED=Our AI | YELLOW=Best Opponent AI                       ║");
console.log("╚══════════════════════════════════════════════════════════════╝\n");
const t0=Date.now();

console.log("S1: Fair vs Fair (both best play, fair dice)");
const s1=runScenario("Fair vs Fair",       "fair","fair",  PER);
console.log("S2: Fair vs Bias-6 Opp (opp gets 6 often)");
const s2=runScenario("Fair vs Bias6 Opp",  "fair","bias6", PER);
console.log("S3: Our dice all-1s (worst luck)");
const s3=runScenario("Bad1 vs Fair",       "bad1","fair",  PER);
console.log("S4: Opponent gets ALL 6s (impossible luck)");
const s4=runScenario("Fair vs All6 Opp",   "fair","all6",  PER);
console.log("S5: Both bias-6 dice");
const s5=runScenario("Bias6 vs Bias6",     "bias6","bias6",PER);

const elapsed=((Date.now()-t0)/1000).toFixed(1);
const all=[s1,s2,s3,s4,s5];
const totalW=all.reduce((a,r)=>a+r.wins,0);
const totalG=all.reduce((a,r)=>a+r.N,0);
const owr=((totalW/totalG)*100).toFixed(1);

console.log("\n╔══════════════════════════════════════════════════════════════╗");
console.log("║                    RESULTS REPORT                           ║");
console.log("╠══════════════════════════════════════════════════════════════╣");
console.log(`║  Total: ${(PER*5).toLocaleString()} games | Time: ${elapsed}s | Speed: ${Math.round(PER*5/parseFloat(elapsed)).toLocaleString()} games/sec`);
console.log("╠══════════════════════════════════════════════════════════════╣");
console.log("║  Scenario              │  WIN%  │ LOSS%  │ AvgKillRed│ AvgKillYellow");
console.log("╠══════════════════════════════════════════════════════════════╣");
all.forEach(r=>{
  const icon=parseFloat(r.wr)>=50?"✅":"❌";
  console.log(`║ ${icon} ${r.name.padEnd(21)}│ ${r.wr.padStart(5)}% │ ${r.lr.padStart(5)}% │    ${r.akr.padStart(4)}   │    ${r.aky}`);
});
console.log("╠══════════════════════════════════════════════════════════════╣");
console.log(`║  OVERALL WIN RATE (all 5 scenarios): ${owr}%`);
console.log("╚══════════════════════════════════════════════════════════════╝\n");

console.log("╔══════════════════════════════════════════════════════════════╗");
console.log("║             WEAKNESS ANALYSIS & IMPROVEMENT PLAN            ║");
console.log("╚══════════════════════════════════════════════════════════════╝\n");

const fw=parseFloat(s1.wr),b6w=parseFloat(s2.wr),b1w=parseFloat(s3.wr),a6w=parseFloat(s4.wr),bbw=parseFloat(s5.wr);

const lines=[
  ["S1 Fair vs Fair",fw>=55?"✅ DOMINANT":fw>=50?"✅ GOOD":"⚠️ WEAK",
    fw>=55?`Win rate ${s1.wr}% — Engine dominates fair play. World-class!`:
    fw>=50?`Win rate ${s1.wr}% — Slight edge, consider increasing Kill bonus.`:
    `Win rate ${s1.wr}% — ISSUE: Base scoring needs stronger kill/blockade weights.`],
  ["S2 Bias-6 Opponent",b6w>=50?"✅":"⚠️",
    b6w>=50?`Win rate ${s2.wr}% — Anti-6 shield working great!`:
    `Win rate ${s2.wr}% — FIX: Double the start-square AMBUSH bonus (600→1400). Opponent 6 unlock is most dangerous moment.`],
  ["S3 Our dice = 1 always",b1w>=30?"🟡":"🔴",
    b1w>=30?`Win rate ${s3.wr}% — With dice=1, blockades slow opponent well.`:
    `Win rate ${s3.wr}% — UNAVOIDABLE: Dice=1 means no 6s to unlock. Engine can only BLOCK, not progress.`],
  ["S4 Opp gets all-6s",a6w>=35?"🟡":"🔴",
    a6w>=35?`Win rate ${s4.wr}% — Remarkable vs all-6 opponent!`:
    `Win rate ${s4.wr}% — NOTE: Opponent with infinite 6s always gets bonus turns. This is a dice-luck ceiling. Best fix: Increase KILL priority score 2200→3000 to prevent their gotis from reaching home.`],
  ["S5 Both bias-6",bbw>=50?"✅":"⚠️",
    bbw>=50?`Win rate ${s5.wr}% — Our strategy wins even at equal high-luck!`:
    `Win rate ${s5.wr}% — FIX: With frequent 6s on both sides, killing > blocking. Increase kill bonus.`],
];

lines.forEach(([scenario,icon,msg])=>{
  console.log(`  ${icon}  [${scenario}]`);
  console.log(`     ${msg}\n`);
});

console.log("  📌 KEY IMPROVEMENTS TO IMPLEMENT:\n");
if(fw<55)         console.log("  1. Increase KILL bonus: 2200 → 2800 (kills = momentum advantage)");
if(b6w<50)        console.log("  2. Increase AMBUSH bonus: 600 → 1400 near opponent start square");
if(a6w<40)        console.log("  3. Add INTERCEPT layer: when opp has gotis in home lane, rush our gotis to goal faster");
if(fw>=55&&b6w>=50&&bbw>=50) console.log("  1. Engine is already strong in all realistic scenarios!");
console.log("  4. REAL GAME tip: In actual Ludo, dice are fair — S1 is the real benchmark.");
console.log("  5. S3/S4 are IMPOSSIBLE in real games — just stress tests.\n");

const verdict=parseFloat(owr)>=55?"🏆 GODMODE CONFIRMED — Wins majority even in impossible scenarios!":
              parseFloat(owr)>=45?"🥇 STRONG ENGINE — Realistic scenario win rate is excellent.":
              parseFloat(owr)>=35?"🥈 COMPETITIVE — Weak only in impossible-luck scenarios.":
                                   "🔧 NEEDS TUNING — Review kill and blockade scoring weights.";
console.log("╔══════════════════════════════════════════════════════════════╗");
console.log("║                      FINAL VERDICT                          ║");
console.log(`║  Overall: ${owr}% across all 5 scenarios`);
console.log(`║  ${verdict}`);
console.log("║  Real Fair-Game Win Rate (S1): "+s1.wr+"%");
console.log("╚══════════════════════════════════════════════════════════════╝\n");

