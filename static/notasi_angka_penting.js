(() => {
  const $ = id => document.getElementById(id);

  function drawMeasurementBench() {
    const canvas = $('notasiLab3D');
    if (!canvas) return;
    const c = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    c.clearRect(0,0,W,H);
    const poly=(pts,fill,stroke='#64748b')=>{c.beginPath();c.moveTo(...pts[0]);pts.slice(1).forEach(p=>c.lineTo(...p));c.closePath();c.fillStyle=fill;c.fill();c.strokeStyle=stroke;c.lineWidth=2;c.stroke();};
    const text=(s,x,y,color='#24364b',size=16)=>{c.fillStyle=color;c.font=`600 ${size}px sans-serif`;c.fillText(s,x,y);};
    // Meja kerja perspektif dengan tepi dan kaki.
    poly([[65,190],[910,190],[975,285],[20,285]],'#d8e0e8','#718096');
    poly([[20,285],[975,285],[975,312],[20,312]],'#64748b','#475569');
    poly([[85,190],[910,190],[945,218],[55,218]],'#eef3f7','#9aaabd');
    for(let i=0;i<18;i++){const x=90+i*46;c.strokeStyle='#d3dce6';c.beginPath();c.moveTo(x,192);c.lineTo(x+25,216);c.stroke();}
    // Penggaris 30 cm.
    poly([[100,230],[410,230],[430,244],[120,244]],'#fef3c7','#a16207');
    for(let i=0;i<=30;i++){const x=105+i*10;c.strokeStyle='#713f12';c.lineWidth=i%5===0?2:1;c.beginPath();c.moveTo(x,231);c.lineTo(x, i%5===0?239:235);c.stroke();if(i%5===0)text(String(i),x-4,253,'#713f12',9);}
    text('PENGGARIS 30 cm',145,225,'#713f12',11);
    // Jangka sorong: batang utama, rahang tetap dan geser.
    poly([[470,240],[735,240],[735,252],[470,252]],'#94a3b8','#475569');
    poly([[485,240],[495,240],[495,195],[485,195]],'#cbd5e1','#475569');
    poly([[670,240],[680,240],[680,200],[670,200]],'#60a5fa','#1d4ed8');
    poly([[670,200],[710,200],[710,208],[670,208]],'#60a5fa','#1d4ed8');
    for(let i=0;i<=25;i++){let x=500+i*8.8;c.strokeStyle='#334155';c.beginPath();c.moveTo(x,241);c.lineTo(x,i%5===0?248:245);c.stroke();}
    text('JANGKA SORONG',535,185,'#1d4ed8',11);
    // Mikrometer sekrup dengan rangka U, anvil dan thimble.
    c.strokeStyle='#64748b';c.lineWidth=14;c.beginPath();c.moveTo(800,195);c.lineTo(800,260);c.lineTo(875,260);c.lineTo(875,195);c.stroke();
    c.strokeStyle='#94a3b8';c.lineWidth=6;c.beginPath();c.moveTo(800,218);c.lineTo(850,218);c.stroke();
    c.fillStyle='#2563eb';c.fillRect(846,204,34,28);c.strokeStyle='#1e40af';c.strokeRect(846,204,34,28);
    text('MIKROMETER',790,185,'#1e40af',11);
    // Neraca digital and specimen.
    poly([[390,90],[520,90],[545,112],[410,112]],'#334155','#0f172a');
    poly([[410,112],[545,112],[545,163],[410,163]],'#475569','#0f172a');
    poly([[425,123],[520,123],[520,145],[425,145]],'#a5f3fc','#0e7490');
    text('12.34 g',438,140,'#0f172a',14);
    poly([[250,118],[315,118],[330,142],[265,142]],'#cbd5e1','#64748b');
    text('BENDA UJI',250,105,'#334155',11);
    // Scale reference.
    text('MEJA ACUAN · ALAT DITATA SEBELUM PRAKTIKUM',65,40,'#24364b',17);
    text('Klik kalkulator di bawah untuk mengolah hasil pengukuran.',65,68,'#475569',13);
  }
  drawMeasurementBench();
  async function calculate(payload, target) {
    target.textContent = 'Menghitung…';
    try {
      const response = await fetch('/api/notasi-angka-penting', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'Perhitungan gagal.');
      return result;
    } catch (error) { target.textContent = error.message; return null; }
  }
  $('convertBtn').addEventListener('click', async () => {
    const out = $('convertOutput'), r = await calculate({action:'convert', value:$('convertValue').value}, out);
    if (r) out.innerHTML = `<strong>Bentuk desimal:</strong> ${r.decimal}<br><strong>Notasi ilmiah:</strong> ${r.scientific}<br><strong>Angka penting:</strong> ${r.significant_figures} AP${r.ambiguous_trailing_zeros ? '<br><em>Catatan: nol di akhir bilangan bulat tanpa koma bersifat ambigu. Gunakan notasi ilmiah untuk menyatakan jumlah AP secara tegas.</em>' : ''}`;
  });
  $('roundBtn').addEventListener('click', async () => {
    const out = $('roundOutput'), r = await calculate({action:'round', value:$('sigValue').value, figures:$('sigDigits').value}, out);
    if (r) out.innerHTML = `<strong>Hasil pembulatan:</strong> ${r.rounded}<br><strong>Notasi ilmiah:</strong> ${r.scientific}<br><strong>Jumlah AP yang diminta:</strong> ${r.significant_figures}`;
  });
  $('operationBtn').addEventListener('click', async () => {
    const out = $('operationOutput'), r = await calculate({action:'operation', a:$('opA').value, b:$('opB').value, operator:$('operator').value}, out);
    if (r) out.innerHTML = `<strong>Hasil sebelum pembulatan:</strong> ${r.raw_result}<br><strong>Hasil sesuai aturan:</strong> ${r.result}<br><strong>Notasi ilmiah:</strong> ${r.scientific}<br><strong>Aturan:</strong> ${r.rule}`;
  });
  $('checkQuiz').addEventListener('click', () => {
    const answers = {q1:'a', q2:'4', q3:'7,5'};
    const unanswered = Object.keys(answers).filter(k => !$ (k).value);
    if (unanswered.length) { $('quizFeedback').textContent = 'Lengkapi semua soal terlebih dahulu.'; return; }
    const score = Object.keys(answers).filter(k => $(k).value === answers[k]).length;
    $('quizFeedback').textContent = `Skor: ${score}/3 benar. ${score === 3 ? 'Bagus, semua jawaban tepat!' : 'Periksa kembali aturan pergeseran koma dan angka penting.'}`;
  });
  $('convertBtn').click(); $('roundBtn').click(); $('operationBtn').click();
})();
