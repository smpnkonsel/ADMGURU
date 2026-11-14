/* ═══════════════════════════════════════════════════════════════════════════
   [A] ALAT BANTU UMUM   (file: bagian/A-ALAT-BANTU.js)  ← HARUS DIMUAT PERTAMA
   Isi: konstanta hari/jenis nilai, format tanggal, pembuat tabel (tbl), kotak pilihan,
   pengurut, bar grafik sederhana, pembaca pengaturan mapel (cfg) & aplikasi (app), nomor WhatsApp,
   [A+] modal & dialog konfirmasi sendiri, [A++] fungsi hari libur Kalender Akademik (tgl, isLibur, liburSet).
   Semua alat di sini dibagikan ke file lain lewat objek ADM.u (U).
   Ubah di sini bila: tampilan tabel/bar berubah, nilai awal KKTP/bobot, tahun ajaran awal.
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
const S=window.ADM,e=S.esc,G=S.guru,K=S.guru.kelas,$=i=>document.getElementById(i);
const U=S.u={PG:{},X:{PM:false}};   // PG = peta halaman (diisi tiap file), X.PM = true bila halaman aktif datanya per-mapel
const HARI=['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'],JN=['Formatif','Sumatif','Ujian'];
const today=()=>new Date().toISOString().slice(0,10);
const fmt=d=>d?new Date(d+'T00:00').toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}):'';
const tag=(t,c)=>`<span class="tag t-${c}">${t}</span>`;
const tbl=(h,r,em='Belum ada data.')=>r.length?`<div class="tw"><table><thead><tr>${h.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${r.map(x=>`<tr>${x.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:`<div class="empty">${em}</div>`;
const opt=(a,v)=>a.map(o=>`<option ${o===v?'selected':''}>${e(o)}</option>`).join('');
const kSel=(id,v,all)=>`<select id="${id}" aria-label="Kelas">${all?'<option value="">Semua kelas</option>':''}${opt(K,v)}</select>`;
const nm=(a,b)=>(a.nama||'').localeCompare(b.nama||''),byK=(a,b)=>S.kelasSort(a.kelas||'',b.kelas||'')||nm(a,b);
const byT=(a,b)=>(b.tanggal||'').localeCompare(a.tanggal||'');
const n1=x=>x==null?'–':(+x).toFixed(1),nc=(x,k)=>x==null?'–':`<b style="color:${x<k?'var(--bad)':'inherit'}">${(+x).toFixed(1)}</b>`;
const pred=(n,k)=>n>=90?'A':n>=80?'B':n>=k?'C':'D';
const bar=(l,x,col='var(--brand)')=>`<div style="display:flex;align-items:center;gap:10px;margin:7px 0"><span style="width:84px;font-size:13px">${e(l)}</span><div style="flex:1;background:var(--brand2);border-radius:99px;height:14px"><div style="width:${x==null?0:Math.min(100,x)}%;background:${col};height:100%;border-radius:99px"></div></div><b style="width:50px;text-align:right;font-size:13px">${n1(x)}</b></div>`;
/* Hanya siswa dari kelas yang diampu akun ini untuk mapel aktif (G.kelas, diatur di Profil Guru).
   Data Siswa dan Wali Murid tetap menampilkan semua siswa karena wali kelas bisa memegang kelas lain. */
const diampu=a=>{const s=new Set(K.map(S.kelasNorm));return (a||[]).filter(x=>s.has(S.kelasNorm(x.kelas)))};
const one=async(c,d)=>({...d,...((await S.db.list(c))[0]||{})});
const save1=async(c,d)=>{const a=await S.db.list(c);a[0]?await S.db.update(c,a[0].id,d):await S.db.add(c,d)};
const cfg=()=>one('mapel',{kktp:75,bf:30,bs:30,bu:40}),app=()=>one('pengaturan',{hadir:75,poin:12,tahun:'2026/2027',semester:'Ganjil'});
const wa=h=>{h=String(h||'').replace(/\D/g,'');return h.startsWith('0')?'62'+h.slice(1):h};
const muat=()=>S.refresh?S.refresh():location.reload();   // render ulang halaman aktif tanpa muat ulang penuh
/* U.X.PM: true bila halaman yang sedang dibuka datanya per-mapel (diatur di S.page lewat daftar PMK di file [N]) */
const mpSel=()=>U.X.PM&&G.mapelList.length>1?`<label for="mpS" style="margin:0">Mapel</label><select id="mpS" aria-label="Mapel aktif">${G.mapelList.map(m=>`<option ${m.nama===G.mapel?'selected':''}>${e(m.nama)}</option>`).join('')}</select>`:'';
const tb=(a)=>`<div class="tb noprint">${mpSel()}${a}</div>`;   // toolbar halaman; pilihan Mapel otomatis ikut di sini
const mpBar=()=>mpSel()?tb(''):'';                              // toolbar berisi Mapel saja (untuk halaman tanpa toolbar)
const loadChart=()=>window.Chart?Promise.resolve():new Promise(ok=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';s.onload=s.onerror=ok;document.head.appendChild(s)});

/* ─── [A++] Hari libur dari Kalender Akademik ───
   tgl(Date) → 'YYYY-MM-DD' menurut jam lokal (bukan UTC).
   isLibur(jenis) → true untuk jenis berawalan "Libur" (Libur, Libur semester, dst).
   liburSet(baris kalender) → Set tanggal libur; rentang tanggal–sampai diuraikan per hari.
   Dipakai oleh Presensi (jadwal terlewat) dan Pengaturan › Kalender Akademik (hitung hari efektif). */
const tgl=d=>new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);
const isLibur=j=>/^Libur/.test(j||'');
const liburSet=rows=>{const s=new Set();
  (rows||[]).filter(r=>isLibur(r.jenis)&&r.tanggal).forEach(r=>{
    const a=new Date(r.tanggal+'T00:00'),z=new Date((r.sampai&&r.sampai>=r.tanggal?r.sampai:r.tanggal)+'T00:00');
    if(isNaN(a)||isNaN(z))return;
    for(const d=new Date(a);d<=z;d.setDate(d.getDate()+1))s.add(tgl(d))});
  return s};

/* ─── [A+] Modal & dialog konfirmasi sendiri (pengganti confirm/alert bawaan peramban) ───
   modal(html,{wide,onclose}) → {box,close}.  ask('pesan','Teks Ya','Teks Batal') → Promise<boolean>.
   Tutup dengan tombol atau tombol Esc. Tampilan diatur CSS yang disuntik di bawah (id mdl-css). */
(()=>{if(document.getElementById('mdl-css'))return;const s=document.createElement('style');s.id='mdl-css';
s.textContent=`.mdl-o{position:fixed;inset:0;background:rgba(15,23,42,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;animation:mdlf .15s}
.mdl{background:var(--panel,#fff);color:inherit;border:1px solid var(--line,#e5e7eb);border-radius:16px;box-shadow:0 20px 50px rgba(0,0,0,.25);width:100%;max-width:420px;max-height:90vh;overflow:auto;padding:20px;animation:mdlu .18s}
.mdl.wide{max-width:720px}.mdl p{margin:0 0 16px;line-height:1.6}.mdl .tb{margin:0 0 12px}.mdl .ft{display:flex;gap:8px;justify-content:flex-end}
@keyframes mdlf{from{opacity:0}}@keyframes mdlu{from{opacity:0;transform:translateY(12px)}}`;document.head.appendChild(s)})();
const modal=(html,o={})=>{const ov=document.createElement('div');ov.className='mdl-o';ov.innerHTML=`<div class="mdl ${o.wide?'wide':''}" role="dialog" aria-modal="true">${html}</div>`;
  const k=ev=>{if(ev.key==='Escape')close()},close=()=>{document.removeEventListener('keydown',k);ov.remove();document.body.style.overflow='';o.onclose&&o.onclose()};
  document.addEventListener('keydown',k);document.body.appendChild(ov);document.body.style.overflow='hidden';return {box:ov.firstChild,close}};
const ask=(msg,ya='Ya',batal='Batal')=>new Promise(res=>{let r=false;
  const m=modal(`<p>${msg}</p><div class="ft"><button class="btn2 ghost" data-n>${batal}</button><button class="btn2" data-y>${ya}</button></div>`,{onclose:()=>res(r)});
  m.box.onclick=ev=>{const b=ev.target.closest('button');if(!b)return;r=b.hasAttribute('data-y');m.close()};m.box.querySelector('[data-y]').focus()});

/* Bagikan ke file lain */
Object.assign(U,{diampu,e,G,K,$,HARI,JN,today,fmt,tag,tbl,opt,kSel,nm,byK,byT,n1,nc,pred,bar,one,save1,cfg,app,wa,muat,mpSel,tb,mpBar,loadChart,modal,ask,tgl,isLibur,liburSet});
})();