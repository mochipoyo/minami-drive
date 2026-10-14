// ===== 00_boot.js : 起動の確認と、起動・実行中の問題の表示 =====
// three.js を読み込めない・WebGL が使えないときは「読み込み中」のまま止めず、理由と再読み込みボタンを出す。
// 実行中の予期しないエラーや、3D表示の中断（WebGLコンテキストの喪失）も画面で知らせる。
const BOOT_MSG={
  three:['3D表示の部品を読み込めませんでした','3D表示に使うプログラム（three.js）を、インターネットから読み込めませんでした。接続を確かめてから、再読み込みしてください。'],
  webgl:['このブラウザでは3D表示が使えません','3D表示（WebGL）が使えないか、無効になっています。Chrome・Safari・Edge などのブラウザの新しい版で開くか、ブラウザの設定でハードウェアアクセラレーション（グラフィックの高速化）を有効にしてから、再読み込みしてください。'],
  init:['起動中にエラーが起きました','再読み込みしてください。何度も起きるときは、別のブラウザでもお試しください。']};
function bootFail(kind,detail){const el=document.getElementById('loadMsg');if(!el)return;const[t,x]=BOOT_MSG[kind]||BOOT_MSG.init;
  el.hidden=false;el.className='bootErr';el.setAttribute('role','alert');el.textContent='';
  const h=document.createElement('b');h.textContent=t;const p=document.createElement('p');p.textContent=x;el.append(h,p);
  if(detail){const d=document.createElement('p');d.className='small';d.textContent='詳細：'+String(detail).slice(0,160);el.append(d);}
  const b=document.createElement('button');b.type='button';b.textContent='再読み込み';b.onclick=()=>location.reload();el.append(b);}
// WebGL が使えるか（確かめた描画領域はすぐ手放す）
function webglOK(){try{if(!window.WebGLRenderingContext)return false;const c=document.createElement('canvas');const gl=c.getContext('webgl2')||c.getContext('webgl')||c.getContext('experimental-webgl');if(!gl)return false;
  const x=gl.getExtension('WEBGL_lose_context');if(x)x.loseContext();return true;}catch(e){return false;}}
// 画面上部のお知らせ（3D表示の中断・復帰、予期しないエラー）
let SYS_T=null;
function sysNotice(kind,detail){const n=document.getElementById('sysNotice');if(!n)return;clearTimeout(SYS_T);
  const M={lost:'3D表示が一時的に中断されました。運転を一時停止しています。自動で戻るのを待っています。戻らないときは再読み込みしてください。',
    restored:'3D表示が戻りました。一時停止メニューの［再開］で続きから運転できます。',
    error:'予期しないエラーが起きました。画面や操作がおかしいときは、再読み込みしてください。'};
  if(!kind){n.hidden=true;return;}
  n.textContent='';const p=document.createElement('span');p.textContent=M[kind]||M.error;n.append(p);
  if(detail){const d=document.createElement('small');d.textContent='詳細：'+String(detail).slice(0,120);n.append(d);}
  const row=document.createElement('span');row.className='row';
  if(kind!=='restored'){const r=document.createElement('button');r.type='button';r.textContent='再読み込み';r.onclick=()=>location.reload();row.append(r);}
  const c=document.createElement('button');c.type='button';c.className='ghost';c.textContent='閉じる';c.onclick=()=>{n.hidden=true;};row.append(c);n.append(row);
  n.dataset.kind=kind;n.hidden=false;if(kind==='restored')SYS_T=setTimeout(()=>{if(n.dataset.kind==='restored')n.hidden=true;},6000);}
// 実行中の予期しないエラー：このページと three.js のエラーだけを対象にし、1回だけ知らせる（拡張機能などのエラーは除く）
let SYS_ERR=false;
window.addEventListener('error',(e)=>{if(SYS_ERR||!e)return;const f=String(e.filename||'');const here=location.href.split('#')[0];
  if(!(f.split('#')[0]===here||/three(\.min)?\.js/.test(f)))return;
  // 3D表示が中断（WebGL コンテキストの喪失）している間のエラーは、中断のお知らせだけにする（three.js r128 は、中断中に描画の部品を作ると例外になる）
  try{if(typeof renderer!=='undefined'&&renderer&&renderer.getContext().isContextLost())return;}catch(x){}
  SYS_ERR=true;try{sysNotice('error',e.message);}catch(x){}});
if(typeof THREE==='undefined'){bootFail('three');return;}
