/* ═══════════════════════════════════════════════════════════════════════════
   [E] PRESENSI   (file: bagian/E-PRESENSI.js)
   [E1] Input Presensi (modal)   [E2] Riwayat Presensi   [E3] Rekap Presensi (juga dipakai Laporan › Rekap Presensi)
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
const S=window.ADM,U=S.u,{e,G,K,$,HARI,fmt,tag,tbl,kSel,nm,app,save1,tb,modal,ask}=U;

/* ─── [E1] MENU: Presensi › Input Presensi
   Alur: kartu jadwal (hari terpilih) → klik → MODAL daftar siswa → semua terisi = tersimpan otomatis & modal menutup,
   kartu jadi "Sudah presensi". Hari ini: kartu yang jamnya sudah lewat hilang (berganti ke jam berikutnya); bila belum
   dipresensi, pindah ke "Jadwal terlewat" (hanya yang belum presensi; hilang sendiri setelah diisi).
   Hari libur diambil dari Kalender Akademik lewat U.liburSet (semua jenis "Libur…", termasuk rentang tanggal). ─── */
async function presInput(v){const q=new URLSearchParams(location.search);
  const tgl=d=>new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,10),lok=()=>tgl(new Date());   // tanggal lokal (bukan UTC)
  const jamArr=s=>[...String(s||'').matchAll(/(\d{1,2})[.:](\d{2})/g)].map(x=>+x[1]*60+ +x[2]);
  const mulai=j=>jamArr(j)[0]??null,akhir=j=>{const a=jamArr(j);return a.length?a[a.length-1]:null};   // menit jam mulai / jam selesai
  const byJam=(a,b)=>(mulai(a.jam)??0)-(mulai(b.jam)??0);
  const L={H:'Hadir',I:'Izin',S:'Sakit',A:'Alpa'};
  /* DRAF LOKAL: tiap klik status langsung disimpan di perangkat (localStorage), jadi tidak hilang bila jaringan lambat/putus
     atau modal ditutup. Draf dihapus setelah presensi berhasil tersimpan ke server. */
  const dk=(k,jm,tg)=>'adm_pres|'+(S.uid||'')+'|'+G.mapel+'|'+k+'|'+jm+'|'+tg;
  const bacaD=key=>{try{return JSON.parse(localStorage.getItem(key)||'null')}catch(_){return null}};
  const tulisD=(key,st,pt)=>{try{Object.keys(st).length?localStorage.setItem(key,JSON.stringify({st,pt,w:Date.now()})):localStorage.removeItem(key)}catch(_){}};
  const hapusD=key=>{try{localStorage.removeItem(key)}catch(_){}};
  let jAll=[],pAll=[],lib=new Set(),lewati=[],rentang=7,js=[],pd=[];
  v.innerHTML=tb(`<input id="tg" type="date" max="${lok()}" aria-label="Tanggal" value="${e(q.get('tanggal')||lok())}"><span class="sp"></span>`)+'<div id="jd"></div><div id="tl"></div>';

  /* Muat jadwal (mapel aktif), semua presensi, hari libur kalender, dan jadwal yang ditandai "tidak ada pembelajaran" */
  const loadJ=async()=>{const t=$('tg').value,h=HARI[(new Date(t+'T00:00').getDay()+6)%7]||'';
    try{jAll=(await S.db.list('jadwal')).filter(j=>!j.mapel||j.mapel===G.mapel)}catch(_){jAll=[]}
    try{pAll=await S.db.list('presensi')}catch(_){pAll=[]}
    try{lib=U.liburSet(await S.db.list('kalender'))}catch(_){lib=new Set()}   // semua tanggal libur, termasuk rentang & libur semester
    try{lewati=(await app()).lewati||[]}catch(_){lewati=[]}
    js=jAll.filter(j=>j.hari===h).sort(byJam);pd=pAll.filter(x=>x.tanggal===t)};

  /* Jadwal terlewat = jadwal yang waktunya sudah lewat (termasuk jam yang lewat hari ini) dan BELUM ada presensinya */
  const terlewat=()=>{const r=[],n=new Date(),nowM=n.getHours()*60+n.getMinutes(),h0=new Date(lok()+'T00:00');
    for(let i=0;i<=rentang;i++){const d=new Date(h0);d.setDate(d.getDate()-i);const ds=tgl(d),hn=HARI[(d.getDay()+6)%7];if(!hn||lib.has(ds))continue;
      jAll.filter(j=>j.hari===hn).sort(byJam).forEach(j=>{
        if(i===0){const a=akhir(j.jam);if(a==null||nowM<a)return}   // hari ini: baru "terlewat" setelah jam selesai
        const key=ds+'|'+j.kelas+'|'+j.jam+'|'+G.mapel;
        if(!pAll.some(x=>x.tanggal===ds&&x.kelas===j.kelas&&(!x.jam||x.jam===j.jam))&&!lewati.includes(key))r.push({ds,j,key})})}
    return r};

  /* Kartu jadwal hari terpilih + daftar jadwal terlewat */
  const kartu=()=>{const t=$('tg').value,n=new Date(),nowM=n.getHours()*60+n.getMinutes(),hariIni=t===lok(),mk0=$('mk')?$('mk').value:undefined,
      sudah=(k,jm)=>pd.some(x=>x.kelas===k&&(!x.jam||x.jam===jm));
    /* hari ini: kartu yang jamnya sudah lewat hilang (kalau belum diisi, pindah ke "Jadwal terlewat") */
    const tampil=js.filter(j=>!(hariIni&&akhir(j.jam)!=null&&nowM>=akhir(j.jam)));
    $('jd').innerHTML=tampil.length?`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px;margin-bottom:14px">${tampil.map(j=>{const s=mulai(j.jam),mu=hariIni&&s!=null&&nowM>=s,ok=sudah(j.kelas,j.jam),dr=!ok&&bacaD(dk(j.kelas,j.jam,t));
        return `<button type="button" class="box" data-k="${e(j.kelas)}" data-j="${e(j.jam)}" style="text-align:left;cursor:pointer;font:inherit;color:inherit;width:100%"><b style="font-size:17px">${e(j.jam)}</b><div style="margin:6px 0 8px">${e(j.mapel||G.mapel)} · Kelas ${e(j.kelas)}</div>${hariIni&&s!=null?tag(mu?'Sedang berlangsung':'Segera',mu?'ok':'w'):''} ${ok?tag('Sudah presensi','ok'):dr?tag('Draf tersimpan – lanjutkan','w'):tag('Belum presensi','n')}</button>`}).join('')}</div>`
      :`<div class="box empty" style="margin-bottom:14px">${js.length?'Semua jadwal '+e(G.mapel)+' hari ini sudah lewat.':'Tidak ada jadwal '+e(G.mapel)+' pada tanggal ini. Atur di <a href="'+S.base+'pages/pengaturan/jadwal.html">Pengaturan › Jadwal Mengajar</a>.'}</div>`;
    /* baris keterangan: menjelaskan kenapa kartu hari ini ada / tidak ada */
    const hn=HARI[(new Date(t+'T00:00').getDay()+6)%7]||'Minggu',isiN=js.filter(j=>sudah(j.kelas,j.jam)).length;
    $('jd').insertAdjacentHTML('afterbegin',`<p class="hint" style="margin:0 0 10px">${e(hn)}, ${e(fmt(t))} · ${js.length} jadwal ${e(G.mapel)}${hariIni?' · '+(js.length-tampil.length)+' jamnya sudah lewat':''}${lib.has(t)?' · <b>libur menurut Kalender Akademik</b>':''} · ${isiN} sudah dipresensi${js.some(j=>akhir(j.jam)==null)?' · <b>ada jam yang formatnya tidak terbaca</b> (tulis seperti 07.30-08.50)':''}</p>`);
    const tw=terlewat();
    $('tl').innerHTML=`<div class="box" style="margin-bottom:14px"><div class="tb" style="margin:0 0 8px"><b>Jadwal terlewat (belum presensi)</b>${tw.length?tag(tw.length,'w'):''}<span class="sp"></span><label for="rg" style="margin:0">Periksa</label><select id="rg" aria-label="Rentang hari">${[7,14,30].map(x=>`<option value="${x}" ${x===rentang?'selected':''}>${x} hari terakhir</option>`).join('')}</select></div>`
      +tbl(['Tanggal','Jam','Mapel','Kelas','Aksi'],tw.map(x=>[`${e(x.j.hari)}, ${e(fmt(x.ds))}`,e(x.j.jam),e(x.j.mapel||G.mapel),e(x.j.kelas),`<button class="btn2 ghost" type="button" data-t="${x.ds}" data-k="${e(x.j.kelas)}" data-j="${e(x.j.jam)}">Isi presensi</button> <button class="btn2 ghost" type="button" data-x="${e(x.key)}">Tidak ada pembelajaran</button>`]),`Tidak ada jadwal yang terlewat dalam ${rentang} hari terakhir.`)
      +`<p class="hint" style="margin:10px 0 0">Baris hilang otomatis setelah presensinya diisi. Jadwal yang memang tidak berlangsung bisa ditandai <b>Tidak ada pembelajaran</b>. Hari Minggu dan hari libur di Kalender Akademik (termasuk libur semester dan rentang tanggal) dilewati otomatis.</p>`
      +`<details style="margin-top:12px"><summary><b>Presensi di luar jadwal</b></summary><div class="tb" style="margin:10px 0 0">${kSel('mk',mk0)}<button class="btn2 ghost" type="button" id="mb">Buka</button></div></details></div>`};

  /* Modal presensi: klik status → baris hilang; setelah semua siswa terisi → tersimpan otomatis & modal tertutup */
  const buka=async(k,jam,t)=>{
    const sis=(await S.db.list('siswa',{kelas:k})).sort(nm),all=await S.db.list('presensi',{kelas:k});
    let ex=all.filter(x=>x.tanggal===t&&(x.jam||'')===jam);
    if(!ex.length&&jam)ex=all.filter(x=>x.tanggal===t&&!x.jam);   // presensi lama (tanpa jam) ikut terbuka dan diberi jam saat disimpan
    const pt=ex[0]?ex[0].pertemuan:new Set(all.map(x=>x.tanggal+'|'+(x.jam||'')).filter(z=>z<t+'|'+jam)).size+1,st={};ex.forEach(x=>st[x.siswaId]=x.status);
    const key=dk(k,jam,t),dr=bacaD(key);let dari=0;
    if(dr&&dr.st)sis.forEach(s=>{if(dr.st[s.id]&&dr.st[s.id]!==st[s.id]){st[s.id]=dr.st[s.id];dari++}});   // draf lebih baru → menimpa
    const pt0=dr&&dr.pt?dr.pt:pt;
    const m=modal(`<div class="tb"><h3 style="margin:0">Presensi ${e(G.mapel)} · Kelas ${e(k)}</h3><span class="sp"></span><button class="btn2 ghost" type="button" data-c>Tutup</button></div>
      <p class="hint" style="margin:0 0 10px">${jam?e(jam)+' · ':''}${e(fmt(t))} · tersimpan otomatis ke server saat semua siswa terisi · isian sementara aman di perangkat ini</p>
      <div class="tb"><label for="pt" style="margin:0">Pertemuan ke-</label><input id="pt" type="number" min="1" value="${pt0}" style="width:80px"><span class="sp"></span><button class="btn2 ghost" type="button" data-a>Semua hadir</button><button class="btn2" type="button" data-s>Simpan</button></div>
      <p class="hint" id="ps" style="margin:6px 0 10px"></p>
      <div id="pls"></div>`,{wide:1});
    const box=m.box,ls=box.querySelector('#pls');let busy=false;
    const draw=()=>{const d0=ls.querySelector('details'),bk=d0&&d0.open,rem=sis.filter(s=>!st[s.id]),done=sis.filter(s=>st[s.id]);
      if(!sis.length){ls.innerHTML=tbl(['No','Nama','Hadir','Izin','Sakit','Alpa'],[],'Belum ada siswa di kelas ini. Tambahkan di Data Master › Data Siswa.');return}
      ls.innerHTML=`<p style="margin:0 0 8px"><b>Sisa ${rem.length}</b> dari ${sis.length} siswa</p>`
        +tbl(['No','Nama','Hadir','Izin','Sakit','Alpa'],rem.map(s=>[sis.indexOf(s)+1,e(s.nama),...['H','I','S','A'].map(z=>`<input type="radio" name="p_${s.id}" value="${z}" aria-label="${L[z]} – ${e(s.nama)}" style="width:auto">`)]),'Semua siswa sudah diisi.')
        +(done.length?`<details style="margin-top:14px" ${bk?'open':''}><summary><b>Sudah diisi (${done.length})</b></summary>`+tbl(['No','Nama','Status',''],done.map(s=>[sis.indexOf(s)+1,e(s.nama),L[st[s.id]],`<button class="btn2 ghost" data-u="${s.id}">Urungkan</button>`]))+'</details>':'')};
    const ps=(m,w)=>{const el=box.querySelector('#ps');if(el){el.textContent=m;el.style.color=w?'var(--bad,#b3261e)':''}};
    const simpan=async man=>{if(busy||!sis.length)return;
      const sisa=sis.filter(s=>!st[s.id]).length;
      if(sisa){if(man)ps('Masih sisa '+sisa+' siswa. Isian tersimpan sebagai draf di perangkat ini; bisa dilanjutkan kapan saja, tanpa kuota/jaringan.');return}
      busy=true;ps('Menyimpan ke server… (bila jaringan lambat, mohon tunggu; isian tetap aman)');
      try{/* diff terhadap data yang sudah ada: perbarui yang berubah, tambah siswa baru, hapus yang sudah tidak ada (bukan hapus-lalu-buat-ulang semua) */
        const bar=sis.map(s=>({tanggal:t,kelas:k,jam,pertemuan:+$('pt').value,siswaId:s.id,nama:s.nama,status:st[s.id]})),
          lama=new Map(),dup=[],tambah=[],ubah=[];
        ex.forEach(x=>lama.has(x.siswaId)?dup.push(x.id):lama.set(x.siswaId,x));
        bar.forEach(d=>{const x=lama.get(d.siswaId);if(x){lama.delete(d.siswaId);ubah.push({id:x.id,data:d})}else tambah.push(d)});
        await S.db.batch('presensi',{tambah,ubah,hapus:[...dup,...[...lama.values()].map(x=>x.id)]});ex=[];
        hapusD(key);m.close();S.toast('Presensi tersimpan');await loadJ();kartu()}
      catch(er){busy=false;tulisD(key,st,+$('pt').value);ps('Belum tersimpan ke server (jaringan lambat/terputus). Isian AMAN di perangkat ini. Klik “Simpan” untuk mencoba lagi.',1);S.toast('Gagal menyimpan, isian aman. Coba lagi.',1)}};
    const lanjut=()=>{tulisD(key,st,+$('pt').value);draw();simpan()};
    box.onchange=ev=>{const r=ev.target;if(r.type!=='radio')return;st[r.name.slice(2)]=r.value;
      const tr=r.closest('tr');tr.style.transition='opacity .2s';tr.style.opacity='0';setTimeout(lanjut,200)};
    box.onclick=ev=>{const b=ev.target.closest('button');if(!b)return;
      if(b.dataset.u){delete st[b.dataset.u];tulisD(key,st,+$('pt').value);draw()}
      else if(b.hasAttribute('data-s'))simpan(1)
      else if(b.hasAttribute('data-a')){sis.forEach(s=>{if(!st[s.id])st[s.id]='H'});lanjut()}
      else if(b.hasAttribute('data-c'))m.close()};
    box.addEventListener('input',ev=>{if(ev.target.id==='pt')tulisD(key,st,+ev.target.value)});
    draw();if(dari)ps('Draf sebelumnya dipulihkan ('+dari+' siswa sudah terisi).');};

  $('jd').onclick=ev=>{const b=ev.target.closest('button');if(b&&b.dataset.k!==undefined)buka(b.dataset.k,b.dataset.j,$('tg').value)};
  $('tl').onchange=ev=>{if(ev.target.id==='rg'){rentang=+ev.target.value;kartu()}};
  $('tl').onclick=async ev=>{const b=ev.target.closest('button');if(!b)return;
    if(b.dataset.t)buka(b.dataset.k,b.dataset.j,b.dataset.t);      // tanggal sesuai baris yang dilewati, bukan tanggal pilihan di atas
    else if(b.id==='mb'){if($('mk').value)buka($('mk').value,'',$('tg').value)}
    else if(b.dataset.x&&await ask('Tandai jadwal ini sebagai <b>tidak ada pembelajaran</b>? Jadwal tidak akan muncul lagi di daftar terlewat.','Ya, tandai')){
      try{lewati=[...lewati,b.dataset.x];await save1('pengaturan',{lewati});S.toast('Ditandai tidak ada pembelajaran');kartu()}catch(er){S.toast(er.message,1)}}};
  $('tg').onchange=async()=>{await loadJ();kartu()};
  await loadJ();kartu();
  /* segarkan tiap menit: kartu yang jamnya lewat pindah ke "Jadwal terlewat" (berhenti sendiri bila halaman ditinggalkan) */
  const iv=setInterval(()=>{if(!document.body.contains($('jd')))return clearInterval(iv);if(!document.querySelector('.mdl-o'))kartu()},6e4);
  if(q.get('kelas'))await buka(q.get('kelas'),q.get('jam')||'',$('tg').value)}

/* ─── [E2] MENU: Presensi › Riwayat Presensi (tautan "Lihat / koreksi" ke Input Presensi, per jam) ─── */
async function presRiwayat(v){const a=await S.db.list('presensi'),g={};
  a.forEach(x=>{const j=x.jam||'',key=x.tanggal+x.kelas+j;(g[key]=g[key]||{t:x.tanggal,k:x.kelas,j,p:x.pertemuan,H:0,I:0,S:0,A:0})[x.status]++});
  v.innerHTML='<div class="box">'+tbl(['Tanggal','Jam','Kelas','Pertemuan','Hadir','Izin','Sakit','Alpa',''],Object.values(g).sort((a,b)=>b.t.localeCompare(a.t)||b.j.localeCompare(a.j)).map(x=>[fmt(x.t),e(x.j||'-'),x.k,x.p,x.H,x.I,x.S,x.A,`<a href="${S.base}pages/presensi/input.html?tanggal=${x.t}&kelas=${encodeURIComponent(x.k)}&jam=${encodeURIComponent(x.j)}">Lihat / koreksi</a>`]),'Belum ada presensi.')+'</div>'}

/* ─── [E3] MENU: Presensi › Rekap Presensi  DAN  Laporan › Rekap Presensi (satu fungsi, lap=0/1) ─── */
const presRekap=lap=>async v=>{const ap=await app();let rows=[];
  v.innerHTML=tb(`${kSel('kl',K[0])}<span class="sp"></span><button class="btn2 ghost" id="ex">Ekspor CSV</button><button class="btn2" id="pc">Cetak</button>`)+'<div class="box" id="ls"></div>';
  const H=['No','Nama','Hadir','Izin','Sakit','Alpa','Pertemuan','Kehadiran'];
  const draw=async()=>{const k=$('kl').value,[sis,pr]=await Promise.all([S.db.list('siswa',{kelas:k}),S.db.list('presensi',{kelas:k})]);
    rows=sis.sort(nm).map((s,i)=>{const m=pr.filter(x=>x.siswaId===s.id),c={H:0,I:0,S:0,A:0};m.forEach(x=>c[x.status]++);return [i+1,s.nama,c.H,c.I,c.S,c.A,m.length,m.length?Math.round(c.H/m.length*100):null]});
    $('ls').innerHTML=(lap?`<h3 style="margin-bottom:10px">Laporan Kehadiran ${e(G.mapel)} – Kelas ${e(k)} (${e(ap.semester)} ${e(ap.tahun)})</h3>`:'')+tbl(H,rows.map(r=>[...r.slice(0,2).map((x,i)=>i?e(x):x),...r.slice(2,7),r[7]==null?'–':tag(r[7]+'%',r[7]<ap.hadir?'b':'ok')]),'Belum ada data presensi.')};
  $('kl').onchange=draw;$('pc').onclick=()=>print();$('ex').onclick=()=>S.csv('rekap-presensi.csv',[H,...rows.map(r=>r.map((x,i)=>i==7&&x!=null?x+'%':x))]);draw()};

/* Daftarkan ke peta halaman ('lap-presensi' = menu Laporan › Rekap Presensi, fungsi yang sama dengan E3) */
Object.assign(U.PG,{'pres-input':['Presensi','Input Presensi',presInput],'pres-rekap':['Presensi','Rekap Presensi',presRekap(0)],'pres-riwayat':['Presensi','Riwayat Presensi',presRiwayat],'lap-presensi':['Laporan','Rekap Presensi',presRekap(1)]});
})();