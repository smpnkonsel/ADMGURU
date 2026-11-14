/* ═══════════════════════════════════════════════════════════════════════════
   [C] MESIN HALAMAN TABEL + FORMULIR (crud)   (file: bagian/C-MESIN-TABEL.js)
   Dipakai halaman yang bentuknya "tabel + tombol + Tambah": Siswa, Jurnal, Tujuan, Materi,
   Pelanggaran, Sikap, Remedial, Pengayaan, Jadwal, Kalender.
   Konfigurasi tiap halaman: coll (nama koleksi), f (isian formulir), cols (kolom tabel),
   sort, before (kotak di atas tabel), fix (perapian isian), grup (opsional: fungsi r→label untuk membagi tabel
   menjadi beberapa kelompok berjudul, mis. Kalender per semester; tanpa grup tabel tetap satu).
   Juga memuat: D/date (kolom & isian tanggal) dan kelasPage ([F-umum] kerangka "pilih kelas → tabel → cetak/ekspor",
   dipakai Rekap Nilai, Nilai Akhir, Leger).
   Ubah di sini bila: perilaku tombol Tambah/Ubah/Hapus/Cari/Ekspor semua halaman ikut berubah.
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
const S=window.ADM,U=S.u,{e,K,$,today,fmt,opt,kSel,byT,tbl,tb,ask,finals}=U;
const crud=c=>async v=>{
  let rows=[],sis=[],q='',kf='',nx=0;const hasK=c.f.some(f=>f.k==='kelas'||f.t==='siswa');
  const dv=x=>typeof x.d==='function'?x.d():x.d??'';
  const inp=(f,x,p='f_')=>{const i=p+f.k;return f.t==='select'?`<select id="${i}">${opt(f.o,x)}</select>`:
    f.t==='siswa'?`<select id="${i}">${sis.map(s=>`<option value="${s.id}" ${s.id===x?'selected':''}>${e(s.nama)} (${e(s.kelas)})</option>`).join('')}</select>`:
    f.t==='area'?`<textarea id="${i}" rows="2">${e(x)}</textarea>`:
    f.list?`<input id="${i}" list="dl_${i}" value="${e(x)}" autocomplete="off"><datalist id="dl_${i}">${f.list.map(o=>`<option value="${e(o)}">`).join('')}</datalist>`:
    `<input id="${i}" type="${f.t||'text'}" value="${e(x)}" ${f.t==='number'?'step="any"':''}>`};
  const list=()=>rows.filter(r=>(!kf||r.kelas===kf)&&(!q||JSON.stringify(Object.values(r)).toLowerCase().includes(q))).sort(c.sort||byT);
  /* c.grup = fungsi r→label kelompok (opsional). Tiap kelompok jadi satu tabel berjudul, urutan kelompok mengikuti urutan baris setelah diurutkan. */
  const draw=()=>{const H=[...c.cols.map(x=>x[1]),'Aksi'],L=list(),
      baris=r=>[...c.cols.map(x=>x[2]?x[2](r,{sis,rows}):e(r[x[0]]??'')),`<button class="btn2 ghost" data-e="${r.id}">Ubah</button> <button class="btn2 del" data-d="${r.id}">Hapus</button>`];
    if(!c.grup){$('tbl').innerHTML=tbl(H,L.map(baris),'Belum ada data. Klik "+ Tambah".');return}
    const G=new Map();L.forEach(r=>{const k=c.grup(r);G.set(k,[...(G.get(k)||[]),r])});
    $('tbl').innerHTML=G.size?[...G].map(([k,g],i)=>`<h3 style="margin:${i?'18px':'0'} 0 6px">${e(k)} <span class="hint">(${g.length} data)</span></h3>`+tbl(H,g.map(baris))).join(''):tbl(H,[],'Belum ada data. Klik "+ Tambah".')};
  const ld=async()=>{[rows,sis]=await Promise.all([S.db.list(c.coll),S.db.list('siswa')]);if(c.coll!=='siswa'){sis=U.diampu(sis);rows=rows.filter(r=>!r.siswaId||sis.some(s=>s.id===r.siswaId))}if(c.before)$('bf').innerHTML=await c.before(rows,sis);draw()};
  v.innerHTML=tb(`<input id="q" placeholder="Cari…" aria-label="Cari">${hasK?`<select id="kf" aria-label="Filter kelas"><option value="">Semua kelas</option>${opt(c.kel||K)}</select>`:''}<span class="sp"></span><button class="btn2 ghost" id="ex">Ekspor CSV</button><button class="btn2" id="ad">+ Tambah</button>`)+'<div id="bf"></div><div class="box hide" id="fm" style="margin-bottom:14px"></div><div class="box" id="tbl"></div>';
  /* c.multi = daftar kunci isian yang boleh diulang dalam satu kali simpan (mis. ['jam','kelas','mapel']); isian lain dipakai bersama. Hanya saat Tambah, bukan Ubah. */
  const form=r=>{const f=$('fm'),M=c.multi&&!r?c.f.filter(x=>c.multi.includes(x.k)):[];f.classList.remove('hide');
    const fld=(x,p,val)=>`<div><label for="${p}${x.k}">${x.l}${x.r?' *':''}</label>${inp(x,val,p)}</div>`,
      baris=n=>`<div class="fg" data-n="${n}" style="margin-top:10px">${M.map(x=>fld(x,'m'+n+'_',dv(x))).join('')}<div><label>&nbsp;</label><button type="button" class="btn2 del" data-x>Hapus baris</button></div></div>`;
    f.innerHTML=`<h3 style="margin-bottom:6px">${r?'Ubah':'Tambah'} data</h3><div class="fg">${c.f.map(x=>fld(x,'f_',r?r[x.k]:dv(x))).join('')}</div>${M.length?'<div id="mxr"></div><button type="button" class="btn2 ghost" id="mxa" style="margin-top:10px">+ Tambah jam lagi (hari yang sama)</button>':''}<div class="tb" style="margin:12px 0 0"><button class="btn2" id="sv">Simpan</button><button class="btn2 ghost" id="cn">Batal</button></div>`;
    $('cn').onclick=()=>f.classList.add('hide');
    if(M.length){
      $('mxa').onclick=()=>{nx++;$('mxr').insertAdjacentHTML('beforeend',baris(nx));const j=$('m'+nx+'_'+M[0].k);if(j)j.focus()};
      $('mxr').onclick=ev=>{const b=ev.target.closest('[data-x]');if(b)b.closest('[data-n]').remove()}}
    $('sv').onclick=async()=>{const d={},ex=[];
      for(const x of c.f){const el=$('f_'+x.k);let t=el.value.trim();if(c.fix&&c.fix[x.k])t=c.fix[x.k](t);if(x.t==='number'&&t!=='')t=+t;
        if(x.r&&t===''){S.toast(x.l+' wajib diisi',1);el.focus();return}d[x.k]=t;
        if(x.t==='siswa'){const s=sis.find(z=>z.id===t);if(!s){S.toast('Tambahkan siswa dulu di Data Siswa',1);return}d.nama=s.nama;d.kelas=s.kelas}}
      for(const row of f.querySelectorAll('[data-n]')){const n=row.dataset.n,d2={...d};
        for(const x of M){const el=$('m'+n+'_'+x.k);let t=el.value.trim();if(c.fix&&c.fix[x.k])t=c.fix[x.k](t);
          if(x.r&&t===''){S.toast(x.l+' wajib diisi',1);el.focus();return}d2[x.k]=t}
        ex.push(d2)}
      try{r?await S.db.update(c.coll,r.id,d):ex.length?await S.db.addMany(c.coll,[d,...ex]):await S.db.add(c.coll,d);S.toast(ex.length?'Tersimpan ('+(ex.length+1)+' data)':'Tersimpan');f.classList.add('hide');ld()}catch(er){S.toast(er.message,1)}};
    f.scrollIntoView({block:'nearest'})};
  $('q').oninput=ev=>{q=ev.target.value.toLowerCase();draw()};if($('kf'))$('kf').onchange=ev=>{kf=ev.target.value;draw()};
  $('ad').onclick=()=>form();
  $('ex').onclick=()=>S.csv(c.coll+'.csv',[c.cols.map(x=>x[1]),...list().map(r=>c.cols.map(x=>r[x[0]]??''))]);
  $('tbl').onclick=async ev=>{const b=ev.target.closest('button');if(!b)return;
    if(b.dataset.e)form(rows.find(r=>r.id===b.dataset.e));
    else if(b.dataset.d&&await ask('Hapus data ini?','Hapus')){await S.db.remove(c.coll,b.dataset.d);S.toast('Dihapus');ld()}};
  ld();
};
const D=(k,l,x)=>[k,l,x?(r=>fmt(r[k])):0];
const date=(k,l)=>({k,l,t:'date',d:today,r:1});

/* ─── [F-umum] Kerangka halaman "pilih kelas → tabel → cetak/ekspor" (dipakai Rekap Nilai, Nilai Akhir, Leger) ─── */
const kelasPage=(fn,ex)=>async v=>{const f=await U.finals();let rows=[];
  v.innerHTML=tb(`${kSel('kl',K[0])}<span class="sp"></span><button class="btn2 ghost" id="ex">Ekspor CSV</button><button class="btn2" id="pc">Cetak</button>`)+'<div class="box" id="ls"></div>';
  const draw=()=>{const r=f.rows.filter(x=>x.s.kelas===$('kl').value);const o=fn(r,f);rows=o.csv;$('ls').innerHTML=o.html};
  $('kl').onchange=draw;$('pc').onclick=()=>print();$('ex').onclick=()=>S.csv(ex+'.csv',rows);draw()};

Object.assign(U,{crud,D,date,kelasPage});
})();