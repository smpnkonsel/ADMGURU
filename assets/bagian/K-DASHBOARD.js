/* ═══════════════════════════════════════════════════════════════════════════
   [K] DASHBOARD  (file: bagian/K-DASHBOARD.js)  MENU: Dashboard › Ringkasan  &  Aktivitas Hari Ini
   Isi: layar sambutan (jika belum ada data), 8 kartu angka, tabel aktivitas hari ini,
   5 kartu peringatan siswa, 4 grafik Chart.js. Filter kelas di kiri atas.
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
const S=window.ADM,U=S.u,{e,G,K,$,HARI,today,tag,tbl,opt,n1,app,mpSel,mpBar,loadChart,finals}=U;
let charts=[];
async function dash(v){v.innerHTML='<div class="box empty">Memuat dasbor…</div>';
  const [f,pr,jd,jr,pl,rm,sk,ap]=await Promise.all([finals(),S.db.list('presensi'),S.db.list('jadwal'),S.db.list('jurnal'),S.db.list('pelanggaran'),S.db.list('remedial'),S.db.list('sikap'),app(),loadChart()]);
  const hari=new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'}),hr=HARI[(new Date().getDay()+6)%7];let kf='';
  /* K-1: layar sambutan bila belum ada siswa */
  if(!f.rows.length){$('pgD').textContent=hari;v.innerHTML=mpBar()+`<div class="box" style="max-width:640px"><h3>Selamat datang, ${e(G.nama)} 👋</h3><p style="margin:8px 0 12px;color:var(--mute)">Dasbor akan terisi setelah data dimasukkan. Langkah awal:</p><ol style="padding-left:20px;line-height:1.9"><li><a href="${S.base}pages/pengaturan/profil.html">Lengkapi profil &amp; foto, mapel, dan kelas diampu</a></li><li><a href="${S.base}pages/data-master/siswa.html">Tambahkan data siswa</a></li><li><a href="${S.base}pages/presensi/input.html">Mulai input presensi</a></li><li>Wali murid? <a href="${S.base}pages/wali-kelas/identitas.html">Isi RCHK 7 Kebiasaan Anak Indonesia Hebat</a></li></ol></div>`;return}
  const pBy=new Map();pr.forEach(x=>{let a=pBy.get(x.siswaId);if(!a)pBy.set(x.siswaId,a=[]);a.push(x)});
  const draw=()=>{charts.forEach(c=>c.destroy());charts=[];
    const R=f.rows.filter(x=>!kf||x.s.kelas===kf),ids=new Set(R.map(x=>x.s.id)),P=pr.filter(x=>ids.has(x.siswaId)),kl=kf?[kf]:K;
    const hdm=new Map(R.map(x=>{const m=pBy.get(x.s.id)||[];return [x.s.id,m.length?m.filter(z=>z.status==='H').length/m.length*100:null]})),hd=s=>hdm.get(s.id);
    const alpa=R.filter(x=>{const m=[...(pBy.get(x.s.id)||[])].sort((a,b)=>b.tanggal.localeCompare(a.tanggal)).slice(0,3);return m.length===3&&m.every(z=>z.status==='A')});
    const bel=R.filter(x=>x.akhir!=null&&x.akhir<x.kktp),poin={};pl.filter(x=>ids.has(x.siswaId)).forEach(x=>poin[x.siswaId]=(poin[x.siswaId]||0)+(+x.poin||0));
    const sudah=new Set(rm.filter(x=>x.status==='Selesai').map(x=>x.siswaId)),rem=bel.filter(x=>!sudah.has(x.s.id)),khusus=new Set(sk.filter(x=>ids.has(x.siswaId)&&x.jenis!=='Positif').map(x=>x.siswaId));
    const hs=R.map(x=>hd(x.s)).filter(x=>x!=null),ak=R.filter(x=>x.akhir!=null);
    /* K-2: kartu angka di bagian atas (pertemuan dihitung per tanggal + kelas + jam) */
    const cards=[['Total siswa',R.length,'siswa diajar',''],['Kelas diampu',kl.length,kl.join(', ')||'-',''],['Total pertemuan',new Set(P.map(x=>x.tanggal+'|'+x.kelas+'|'+(x.jam||''))).size,'sudah dicatat',''],['Rata-rata nilai akhir',ak.length?n1(S.avg(ak.map(x=>x.akhir))):'–','KKTP '+([...new Set(R.map(x=>x.kktp))].sort().join(' / ')||'-'),'o'],['Kehadiran',hs.length?n1(S.avg(hs))+'%':'–','rata-rata siswa','o'],['Belum tuntas',bel.length,'nilai di bawah KKTP','w'],['Perlu remedial',rem.length,'belum remedial selesai','b'],['Catatan khusus',khusus.size,'perlu pembinaan','w']];
    const jam=jd.filter(j=>j.hari===hr&&(!j.mapel||j.mapel===G.mapel)).sort((a,b)=>(a.jam||'').localeCompare(b.jam||''));
    /* K-3: daftar kartu peringatan siswa */
    const warn=[['Alpa 3 kali berturut-turut','b',alpa,()=>'3 alpa'],['Kehadiran kurang dari '+ap.hadir+'%','w',R.filter(x=>{const h=hd(x.s);return h!=null&&h<ap.hadir}),x=>n1(hd(x.s))+'%'],['Nilai di bawah KKTP','w',bel,x=>n1(x.akhir)],['Belum mengikuti remedial','b',rem,x=>'nilai '+n1(x.akhir)],['Poin pelanggaran melewati batas','b',R.filter(x=>(poin[x.s.id]||0)>=ap.poin),x=>poin[x.s.id]+' poin']];
    const tg=x=>x?'ok':'w';
    $('dv').innerHTML=`<div class="stats">${cards.map(c=>`<div class="stat ${c[3]}"><span>${c[0]}</span><strong>${c[1]}</strong><em>${e(c[2])}</em></div>`).join('')}</div>
    <h2 id="aktif">Aktivitas hari ini <small>${hari}</small></h2><div class="box">${tbl(['Jam','Kelas','Mapel','Presensi','Jurnal mengajar'],jam.map(j=>{const p=pr.some(x=>x.tanggal===today()&&x.kelas===j.kelas&&(!x.jam||x.jam===j.jam)),u=jr.some(x=>x.tanggal===today()&&x.kelas===j.kelas);return [`<b>${e(j.jam)}</b>`,e(j.kelas),e(G.mapel),tag(p?'Selesai':'Belum presensi',p?'ok':'w'),tag(u?'Terisi':'Belum diisi',u?'ok':'n')]}),'Tidak ada jadwal mengajar hari ini. Atur di Pengaturan › Jadwal Mengajar.')}</div>
    <h2>Peringatan siswa</h2><div class="warns">${warn.map(w=>`<div class="box wb"><h3>${w[0]}<span class="tag t-${w[2].length?w[1]:'ok'}">${w[2].length}</span></h3>${w[2].length?`<ul>${w[2].slice(0,4).map(x=>`<li><span>${e(x.s.nama)}<br><small>${e(x.s.kelas)}</small></span><small>${w[3](x)}</small></li>`).join('')}</ul>${w[2].length>4?`<div class="empty">+${w[2].length-4} siswa lainnya</div>`:''}`:'<div class="empty">Tidak ada siswa pada kategori ini.</div>'}</div>`).join('')}</div>
    <h2>Grafik perkembangan</h2><div class="charts"><div class="box"><h3>Kehadiran per kelas (%)</h3><div class="cv"><canvas id="c1"></canvas></div></div><div class="box"><h3>Rata-rata nilai akhir per kelas</h3><div class="cv"><canvas id="c2"></canvas></div></div><div class="box"><h3>Ketuntasan</h3><div class="cv"><canvas id="c3"></canvas></div></div><div class="box"><h3>Kehadiran per bulan (%)</h3><div class="cv"><canvas id="c4"></canvas></div></div></div>`;
    /* K-4: empat grafik Chart.js (c1 hadir, c2 nilai, c3 ketuntasan, c4 hadir per bulan) */
    if(!window.Chart)return;const css=getComputedStyle(document.documentElement),c=n=>css.getPropertyValue(n).trim();Chart.defaults.font.family="'Plus Jakarta Sans',system-ui,sans-serif";Chart.defaults.color=c('--mute');
    const grid={color:c('--line')},base={responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}}},by=fn=>kl.map(q=>fn(R.filter(x=>x.s.kelas===q)));
    const hk=a=>{const id=new Set(a.map(x=>x.s.id)),m=P.filter(z=>id.has(z.siswaId));return m.length?+(m.filter(z=>z.status==='H').length/m.length*100).toFixed(1):null};
    charts.push(new Chart($('c1'),{type:'bar',data:{labels:kl,datasets:[{data:by(hk),backgroundColor:c('--brand'),borderRadius:6}]},options:{...base,scales:{y:{min:0,max:100,grid},x:{grid:{display:false}}}}}));
    charts.push(new Chart($('c2'),{type:'bar',data:{labels:kl,datasets:[{data:by(a=>{const z=a.filter(x=>x.akhir!=null);return z.length?+S.avg(z.map(x=>x.akhir)).toFixed(1):null}),backgroundColor:c('--warn'),borderRadius:6}]},options:{...base,scales:{y:{min:0,max:100,grid},x:{grid:{display:false}}}}}));
    const tun=ak.filter(x=>x.akhir>=x.kktp).length;charts.push(new Chart($('c3'),{type:'doughnut',data:{labels:['Tuntas','Belum tuntas'],datasets:[{data:[tun,ak.length-tun],backgroundColor:[c('--ok'),c('--bad')],borderColor:c('--panel'),borderWidth:3}]},options:{...base,cutout:'62%',plugins:{legend:{display:true,position:'bottom'}}}}));
    const bl=[...new Set(P.map(x=>x.tanggal.slice(0,7)))].sort(),pal=[c('--brand'),c('--warn'),c('--bad')];
    charts.push(new Chart($('c4'),{type:'line',data:{labels:bl,datasets:kl.map((q,i)=>({label:q,data:bl.map(b=>{const m=P.filter(x=>x.kelas===q&&x.tanggal.startsWith(b));return m.length?+(m.filter(x=>x.status==='H').length/m.length*100).toFixed(1):null}),borderColor:pal[i%3],backgroundColor:pal[i%3],tension:.3,spanGaps:true}))},options:{...base,plugins:{legend:{display:true,position:'bottom'}},scales:{y:{min:0,max:100,grid},x:{grid:{display:false}}}}}))};
  $('pgD').textContent=hari;
  v.innerHTML=`<div class="sel">${mpSel()}<label for="kf" style="margin:0">Tampilkan kelas</label><select id="kf"><option value="">Semua</option>${opt(K)}</select><span class="chip">${e(G.mapel||'Guru')}</span></div><div id="dv"></div>`;
  $('kf').onchange=ev=>{kf=ev.target.value;draw()};window.onThemeChange=draw;draw();
  if(location.hash==='#aktif')setTimeout(()=>$('aktif')&&$('aktif').scrollIntoView(),50)}

Object.assign(U.PG,{dashboard:['Dashboard','Ringkasan',dash]});
})();
