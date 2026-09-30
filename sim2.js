const RING_SIZE=52,GOAL=56,YARD=-1,SAFE=new Set([0,8,13,21,26,34,39,47]),OPP_START=26;
function gR(c,p){return((c==='r'?0:26)+p)%52;}
function iS(r){return SAFE.has(r);}
function rD(a,b){return(b-a+52)%52;}
function roll(){return Math.floor(Math.random()*6)+1;}
function biased(n,p){return Math.random()<p?n:roll();}

function canMove(s,i,d){const p=s[i];if(p>=GOAL)return false;if(p===YARD)return d===6;return p+d<=GOAL;}

function applyMove(ms,os,mc,i,d){
  const m=[...ms],o=[...os];const p=m[i];let killed=false,goal=false;
  if(p===YARD)m[i]=0;
  else{m[i]=p+d;if(m[i]===GOAL)goal=true;
  else if(m[i]<=50){const r=gR(mc,m[i]);if(!iS(r)){const oc=mc==='r'?'y':'r';for(let j=0;j<4;j++){if(o[j]>=0&&o[j]<=50&&gR(oc,o[j])===r){o[j]=YARD;killed=true;}}}}}
  return{m,o,killed,goal};
}
function won(s){return s.every(p=>p>=GOAL);}

function scoreR(ms,os,gi,d){
  const cur=ms[gi];if(cur>=GOAL)return null;
  let nxt,unl=false;
  if(cur===YARD){if(d!==6)return null;nxt=0;unl=true;}
  else{if(cur+d>GOAL)return null;nxt=cur+d;}
  const nR=(nxt>=0&&nxt<=50)?gR('r',nxt):null;
  const cR=(cur>=0&&cur<=50)?gR('r',cur):null;
  const onS=nR!==null&&iS(nR),inH=nxt>=51,isG=nxt===GOAL;
  let sc=0;
  // L1 Kill
  if(nR!==null&&!onS)os.forEach((op,oi)=>{if(op>=0&&op<=50&&gR('y',op)===nR)sc+=3700+op*50;});
  // L2 Goal/Home
  if(isG)sc+=2600;else if(inH)sc+=1100+(nxt-50)*80;else if(onS)sc+=900;
  // L3 Blockade
  if(nR!==null&&!onS){let bc=0;ms.forEach((p,i)=>{if(i!==gi&&p>=0&&p<=50&&gR('r',p)===nR)bc++;});if(bc>=1)sc+=2200;let ob=0;os.forEach(op=>{if(op>=0&&op<=50&&gR('y',op)===nR)ob++;});if(ob>=2)sc-=9999;}
  // L4 Ambush
  const iny=os.filter(p=>p===YARD).length;
  if(iny>0&&nR!==null&&!onS){const d2=rD(nR,OPP_START);if(d2>=1&&d2<=6)sc+=1400+iny*350;}
  // L5 Anti-6
  if(nR!==null&&!onS){let t=0;os.forEach(op=>{let a6=op===YARD?0:(op>=0&&op<=50?op+6:-1);if(a6>=0&&a6<=50){const r=gR('y',a6);const d1=rD(r,nR);if(d1===0&&!iS(nR))t+=3;else if(d1>=1&&d1<=6)t+=2;const a12=a6+6;if(a12<=50){const r2=gR('y',a12);const d2=rD(r2,nR);if(d2===0&&!iS(nR))t+=2;else if(d2>=1&&d2<=6)t+=1;}}});sc-=t*650;}
  // L6 Vuln
  let kv=0;if(nR!==null&&!onS)os.forEach(op=>{if(op>=0&&op<=50){const d2=rD(gR('y',op),nR);if(d2>=1&&d2<=6){kv++;sc-=600+nxt*30;}}});
  // L7 Trap
  if(nR!==null)os.forEach((op,oi)=>{if(op>=0&&op<=50){const hd=rD(nR,gR('y',op));if(hd>=1&&hd<=6){let esc=false;for(let r=1;r<=6;r++){const e=op+r;if(e>50){esc=true;break;}if(iS(gR('y',e))){esc=true;break;}let tr=false;ms.forEach((mP,mI)=>{if(mI!==gi&&mP>=0&&mP<=50&&rD(gR('r',mP),gR('y',e))<=6)tr=true;});if(!tr){esc=true;}}sc+=esc?500:1200;}}});
  // L8 Golden
  if(nR!==null&&!onS&&kv===0)os.forEach(op=>{if(op>=0&&op<=50){const d2=rD(gR('y',op),nR);if(d2===7||d2===8)sc+=450;}});
  // L9 Escape
  if(cR!==null&&!iS(cR))os.forEach(op=>{if(op>=0&&op<=50&&rD(gR('y',op),cR)<=6&&kv===0)sc+=550;});
  // L10 Wolfpack
  ms.forEach((op,oi)=>{if(oi!==gi&&op>=0&&op<=55){const g=Math.abs(nxt-op);if(g>=1&&g<=5)sc+=160;else if(g<=12)sc+=70;}});
  // L11 Pressure
  const hm=[...ms];hm[gi]=nxt;
  os.forEach(op=>{if(op>=0&&op<=50){const oR=gR('y',op);hm.forEach(mP=>{if(mP>=0&&mP<=50&&rD(gR('r',mP),oR)<=6&&!iS(oR))sc+=180;});}});
  // L12
  sc+=nxt*4;if(unl)sc+=950;
  return{gi,nxt,sc};
}

function scoreY(os,ms,gi,d){
  const cur=os[gi];if(cur>=GOAL)return null;
  let nxt,unl=false;
  if(cur===YARD){if(d!==6)return null;nxt=0;unl=true;}
  else{if(cur+d>GOAL)return null;nxt=cur+d;}
  const nR=(nxt>=0&&nxt<=50)?gR('y',nxt):null;
  const onS=nR!==null&&iS(nR),isG=nxt===GOAL,inH=nxt>=51;
  let sc=0;
  if(nR!==null&&!onS)ms.forEach(mp=>{if(mp>=0&&mp<=50&&gR('r',mp)===nR)sc+=3700+mp*50;});
  if(isG)sc+=2600;else if(inH)sc+=1100+(nxt-50)*80;else if(onS)sc+=900;
  if(nR!==null&&!onS){let bc=0;os.forEach((p,i)=>{if(i!==gi&&p>=0&&p<=50&&gR('y',p)===nR)bc++;});if(bc>=1)sc+=2200;let rb=0;ms.forEach(mp=>{if(mp>=0&&mp<=50&&gR('r',mp)===nR)rb++;});if(rb>=2)sc-=9999;}
  const iny=ms.filter(p=>p===YARD).length;
  if(iny>0&&nR!==null&&!onS){const d2=rD(nR,0);if(d2>=1&&d2<=6)sc+=1400+iny*350;}
  if(nR!==null&&!onS)ms.forEach(mp=>{if(mp>=0&&mp<=50){const d2=rD(gR('r',mp),nR);if(d2>=1&&d2<=6)sc-=600+nxt*30;}});
  if(nR!==null)ms.forEach(mp=>{if(mp>=0&&mp<=50){const hd=rD(nR,gR('r',mp));if(hd>=1&&hd<=6)sc+=500;}});
  sc+=nxt*4;if(unl)sc+=950;
  return{gi,nxt,sc};
}

function bestR(r,y,d){let b=null;for(let i=0;i<4;i++){if(!canMove(r,i,d))continue;const s=scoreR(r,y,i,d);if(s&&(!b||s.sc>b.sc))b=s;}return b;}
function bestY(y,r,d){let b=null;for(let i=0;i<4;i++){if(!canMove(y,i,d))continue;const s=scoreY(y,r,i,d);if(s&&(!b||s.sc>b.sc))b=s;}return b;}

// 3-SIX BUST RULE
function sim(rm,ym){
  let red=[YARD,YARD,YARD,YARD],yel=[YARD,YARD,YARD,YARD];
  let rk=0,yk=0,t=0;
  let rSix=0,ySix=0; // consecutive 6 counters

  while(t<700){
    // RED TURN
    let rb=false;
    do{
      rb=false;
      const d=rm==='bad1'?1:rm==='bias6'?biased(6,0.5):roll();
      // BUST CHECK
      if(d===6){rSix++;if(rSix>=3){rSix=0;break;}}else rSix=0;
      const m=bestR(red,yel,d);
      if(!m)break;
      const r=applyMove(red,yel,'r',m.gi,d);
      red=r.m;yel=r.o;
      if(r.killed){rk++;rb=true;}
      if(r.goal&&!won(red))rb=true;
      if(d===6&&!r.goal)rb=true;
      if(won(red))return{w:'R',rk,yk};
    }while(rb);

    // YELLOW TURN  
    let yb=false;
    do{
      yb=false;
      const d=ym==='all6'?6:ym==='bias6'?biased(6,0.6):roll();
      // BUST CHECK
      if(d===6){ySix++;if(ySix>=3){ySix=0;break;}}else ySix=0;
      const m=bestY(yel,red,d);
      if(!m)break;
      const r=applyMove(yel,red,'y',m.gi,d);
      yel=r.m;red=r.o;
      if(r.killed){yk++;yb=true;}
      if(r.goal&&!won(yel))yb=true;
      if(d===6&&!r.goal)yb=true;
      if(won(yel))return{w:'Y',rk,yk};
    }while(yb);
    t++;
  }
  return{w:'D',rk,yk};
}

function run(name,rm,ym,N){
  let w=0,l=0,dr=0,rk=0,yk=0;
  const tick=Math.floor(N/30);
  process.stdout.write('  [');
  for(let i=0;i<N;i++){
    const r=sim(rm,ym);
    if(r.w==='R')w++;else if(r.w==='Y')l++;else dr++;
    rk+=r.rk;yk+=r.yk;
    if(i%tick===0)process.stdout.write('=');
  }
  process.stdout.write(']\n');
  return{name,N,w,l,dr,wr:((w/N)*100).toFixed(1),lr:((l/N)*100).toFixed(1),drr:((dr/N)*100).toFixed(1),akr:(rk/N).toFixed(2),aky:(yk/N).toFixed(2)};
}

const P=20000;
console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║  GODMODE v3 + BUST RULE — 1,00,000 Game Simulation (v2)     ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');
const t0=Date.now();

console.log('S1: Fair vs Fair (REAL GAME scenario)');
const s1=run('Fair vs Fair','fair','fair',P);
console.log('S2: Fair vs Bias-6 Opp (opp gets 6 often)');
const s2=run('Fair vs Bias6 Opp','fair','bias6',P);
console.log('S3: Our dice all-1s (impossible scenario)');
const s3=run('Bad1 vs Fair','bad1','fair',P);
console.log('S4: Opp gets ALL 6s (impossible but with BUST rule now)');
const s4=run('Fair vs All6+Bust','fair','all6',P);
console.log('S5: Both bias-6 dice');
const s5=run('Bias6 vs Bias6','bias6','bias6',P);

const el=((Date.now()-t0)/1000).toFixed(1);
const all=[s1,s2,s3,s4,s5];
const tw=all.reduce((a,r)=>a+r.w,0);
const tg=P*5;
const owr=((tw/tg)*100).toFixed(1);

console.log('\n╔══════════════════════════════════════════════════════════════════╗');
console.log(║   games | s |  games/sec);
console.log('╠══════════════════════════════════════════════════════════════════╣');
console.log('║  Scenario              │  WIN%  │ LOSS%  │ DRAW%  │ KillR │ KillY');
console.log('╠══════════════════════════════════════════════════════════════════╣');
all.forEach(r=>{
  const ic=parseFloat(r.wr)>=50?'✅':'❌';
  console.log(║  │% │% │% │  │ );
});
console.log(║  OVERALL WIN RATE: %);
console.log('╠══════════════════════════════════════════════════════════════════╣');

// WEAKNESS ANALYSIS
console.log('║');
console.log('║  🔍 WEAKNESS BREAKDOWN:');
console.log('║');
const fw=parseFloat(s1.wr),b6=parseFloat(s2.wr),b1=parseFloat(s3.wr),a6=parseFloat(s4.wr),bb=parseFloat(s5.wr);

// S1 analysis
if(fw<50)console.log(║  ❌ S1 FAIR GAME: % — Hum % peeche hain);
else console.log(║  ✅ S1 FAIR GAME: % — Engine fair game mein dominant!);
console.log(║     Avg Red kills:   |  Avg Opp kills:   ());

// S2 analysis
if(b6<50)console.log(║  ❌ S2 BIAS-6 OPP: % — Opponent ke frequent 6 hamein todta hai);
else console.log(║  ✅ S2 BIAS-6 OPP: % — Anti-6 shield kaam kar raha hai!);

// S3
console.log(║  ⚪ S3 BAD DICE (our 1 only): % — Impossible scenario, no 6 = no unlock);

// S4
if(a6>=50)console.log(║  ✅ S4 ALL-6+BUST OPP: % — BUST rule ne all-6 opponent ko rok diya!);
else console.log(║  ❌ S4 ALL-6+BUST OPP: % — Still losing to all-6 opponent);

// S5
if(bb>=50)console.log(║  ✅ S5 BOTH BIAS-6: % — Equal luck pe hamara strategy jeetata hai!);
else console.log(║  ❌ S5 BOTH BIAS-6: % — Equal high-luck pe thoda peeche);

console.log('║');
console.log('║  📌 ROOT CAUSE ANALYSIS:');
if(fw<50)console.log('║  1. KILL EFFICIENCY GAP: Opponent kills slightly more per game in fair play');
if(b6<50)console.log('║  2. SIX-CHAIN VULNERABILITY: Opponent rapid unlocks bypass our ambush');
if(bb<50)console.log('║  3. BONUS-TURN CHAINS: With both getting 6s, opp bonus chains outlast ours');
console.log('║');
console.log('║  💡 REAL GAME BENCHMARK (S1) is what matters most!');
console.log('║     Other scenarios are extreme stress tests impossible in real Ludo.');
console.log('╚══════════════════════════════════════════════════════════════════╝\n');
