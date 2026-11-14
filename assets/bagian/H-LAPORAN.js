/* ═══════════════════════════════════════════════════════════════════════════
   [H] LAPORAN   (file: bagian/H-LAPORAN.js)
   [H1] Leger Nilai  [H2] Laporan Siswa  [H3] Grafik
   (Laporan › Rekap Presensi ada di file [E], kunci 'lap-presensi')
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
const S=window.ADM,U=S.u,{e,G,K,$,JN,fmt,tag,tbl,byK,byT,n1,nc,pred,bar,app,tb,mpBar,finals,kelasPage}=U;

/* ─── [H1] MENU: Laporan › Leger Nilai ─── */
const leger=kelasPage((r,f)=>{const k=r[0]?r[0].kktp:f.c.kktp,ju=[...new Map(f.nl.filter(n=>n.kelas===r[0]?.s.kelas).sort((a,b)=>JN.indexOf(a.jenis)-JN.indexOf(b.jenis)).map(n=>[n.jenis+'|'+n.judul,n.judul])).entries()];
  const rk=[...r].filter(x=>x.akhir!=null).sort((a,b)=>b.akhir-a.akhir),H=['No','Nama',...ju.map(j=>j[1]),'Nilai akhir','Peringkat'];
  const body=r.map((x,i)=>[i+1,x.s.nama,...ju.map(j=>(x.nl.find(n=>n.jenis+'|'+n.judul===j[0])||{}).nilai??null),x.akhir,x.akhir==null?'-':rk.indexOf(x)+1]);
  return {csv:[H,...body.map(z=>z.map(y=>typeof y==='number'&&y%1?y.toFixed(1):y??''))],html:`<h3 style="margin-bottom:10px">Leger Nilai ${e(G.mapel)} – Kelas ${e(r[0]?.s.kelas||'')}</h3>`+tbl(H,body.map(z=>[z[0],e(z[1]),...z.slice(2,-2).map(y=>nc(y,k)),nc(z[z.length-2],k),z[z.length-1]]),'Belum ada siswa atau nilai.')}},'leger');

/* ─── [H2] MENU: Laporan › Laporan Siswa (nilai + kehadiran + pembinaan satu siswa) ─── */
async function lapSiswa(v){let [sis,f,pr,pl,sk,ap]=await Promise.all([S.db.list('siswa'),finals(),S.db.list('presensi'),S.db.list('pelanggaran'),S.db.list('sikap'),app()]);sis=U.diampu(sis).sort(byK);
  v.innerHTML=tb(`<select id="ss" aria-label="Siswa">${sis.map(s=>`<option value="${s.id}">${e(s.nama)} (${e(s.kelas)})</option>`).join('')}</select><span class="sp"></span><button class="btn2" id="pc">Cetak</button>`)+'<div id="ls"></div>';
  const draw=()=>{const s=sis.find(x=>x.id===$('ss').value);if(!s)return $('ls').innerHTML='<div class="box empty">Belum ada siswa.</div>';
    const r=f.rows.find(x=>x.s.id===s.id),m=pr.filter(x=>x.siswaId===s.id),c={H:0,I:0,S:0,A:0};m.forEach(x=>c[x.status]++);const p=pl.filter(x=>x.siswaId===s.id).reduce((t,x)=>t+(+x.poin||0),0),k=r?r.kktp:f.c.kktp;
    $('ls').innerHTML=`<div class="box"><h3>${e(s.nama)} – Kelas ${e(s.kelas)} · NIS ${e(s.nis||'-')}</h3><p style="color:var(--mute)">${e(G.mapel)} · ${e(ap.semester)} ${e(ap.tahun)} · Guru: ${e(G.nama)}</p>
    <h2>Nilai</h2>${tbl(['Jenis','Judul','Nilai'],r.nl.map(n=>[n.jenis,e(n.judul),nc(n.nilai,k)]),'Belum ada nilai.')}<p style="margin-top:8px"><b>Nilai akhir: ${nc(r.akhir,k)}</b> ${r.akhir==null?'':tag(r.akhir>=k?'Tuntas':'Belum tuntas',r.akhir>=k?'ok':'b')}</p>
    <h2>Kehadiran</h2><p>Hadir ${c.H} · Izin ${c.I} · Sakit ${c.S} · Alpa ${c.A} dari ${m.length} pertemuan${m.length?` (${Math.round(c.H/m.length*100)}%)`:''}</p>
    <h2>Pembinaan</h2><p>Total poin pelanggaran: <b>${p}</b></p>${tbl(['Tanggal','Jenis','Catatan'],sk.filter(x=>x.siswaId===s.id).sort(byT).map(x=>[fmt(x.tanggal),e(x.jenis),e(x.catatan)]),'Tidak ada catatan sikap.')}</div>`};
  $('ss').onchange=draw;$('pc').onclick=()=>print();draw()}

/* ─── [H3] MENU: Laporan › Grafik (bar sederhana tanpa Chart.js) ─── */
async function grafik(v){const [f,pr]=await Promise.all([finals(),S.db.list('presensi')]);
  const per=K.map(c=>{const a=f.rows.filter(x=>x.s.kelas===c&&x.akhir!=null),p=pr.filter(x=>x.kelas===c);return {c,n:a.length?S.avg(a.map(x=>x.akhir)):null,t:a.length?a.filter(x=>x.akhir>=x.kktp).length/a.length*100:null,h:p.length?p.filter(x=>x.status==='H').length/p.length*100:null}});
  const d={A:0,B:0,C:0,D:0},ok=f.rows.filter(x=>x.akhir!=null);ok.forEach(x=>d[pred(x.akhir,x.kktp)]++);
  v.innerHTML=mpBar()+`<div class="charts"><div class="box"><h3>Rata-rata nilai akhir per kelas</h3>${per.map(x=>bar(x.c,x.n,'var(--warn)')).join('')}</div><div class="box"><h3>Kehadiran per kelas (%)</h3>${per.map(x=>bar(x.c,x.h)).join('')}</div><div class="box"><h3>Ketuntasan per kelas (%)</h3>${per.map(x=>bar(x.c,x.t,'var(--ok)')).join('')}</div><div class="box"><h3>Sebaran predikat (% siswa)</h3>${Object.entries(d).map(([p,n])=>bar('Predikat '+p,ok.length?n/ok.length*100:null,p==='D'?'var(--bad)':'var(--brand)')).join('')}</div></div>`}

Object.assign(U.PG,{leger:['Laporan','Leger Nilai',leger],'lap-siswa':['Laporan','Laporan Siswa',lapSiswa],grafik:['Laporan','Grafik',grafik]});
})();
