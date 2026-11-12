(() => {
  "use strict";
  const config = window.PHYSLAB_MODULE || {};
  const $ = id => document.getElementById(id);
  const input = $("moduleValue"), runBtn = $("moduleRun"), resetBtn = $("moduleReset");
  const slider = $("moduleSlider"), sliderValue = $("moduleSliderValue");
  const csvBtn = $("moduleCsv"), status = $("moduleStatus"), inputResult = $("moduleInputResult");
  const outputResult = $("moduleOutputResult"), outputLabel = $("moduleOutputLabel");
  const outputHeader = $("moduleTableOutputHeader"), tbody = $("moduleTable");
  const graph = $("moduleGraph"), graphCtx = graph?.getContext("2d");
  const lab = $("moduleLabCanvas"), labCtx = lab?.getContext("2d"), labNote = $("moduleLabNote");
  let latest = null;
  let opticsFocus = 10;
  const identity = `${config.title || ""} ${config.slug || ""} ${config.category || ""}`.toLowerCase();
  const kind = /optik|cahaya/.test(identity) ? "optik" : /fluida/.test(identity) ? "fluida" : /bunyi|gelombang/.test(identity) ? "gelombang" : /magnet|induksi/.test(identity) ? "magnet" : /listrik|arus|digital|radioaktiv|inti|dualisme|relativitas/.test(identity) ? "listrik" : /energi|pemanasan|termodinamika/.test(identity) ? "termal" : /dinamika|kinematika|vektor/.test(identity) ? "gerak" : /pengukuran/.test(identity) ? "ukur" : "umum";
  const fmt = n => { n = Number(n); if (!Number.isFinite(n)) return "—"; if (Math.abs(n) >= 1e5 || (Math.abs(n) > 0 && Math.abs(n) < 1e-3)) return n.toExponential(3); return Number(n.toPrecision(5)).toString(); };
  // Parameter alat kedua dibuat spesifik topik; bukan dekorasi, nilainya dikirim ke model Python.
  const auxSpecs = {
    pengukuran:{label:"Resolusi jangka sorong",unit:"mm",min:0.1,max:1,step:0.1,value:0.1,hint:"Atur resolusi nonius untuk menentukan ketelitian pembacaan."},
    energi:{label:"Efisiensi panel",unit:"%",min:5,max:30,step:1,value:18,hint:"Efisiensi mengubah energi listrik keluaran panel surya."},
    pemanasan:{label:"Tutupan awan / pengurang radiasi",unit:"%",min:0,max:80,step:5,value:20,hint:"Tutupan awan mengurangi radiasi yang masuk ke model permukaan."},
    kinematika:{label:"Waktu pengamatan",unit:"s",min:1,max:10,step:0.5,value:2,hint:"Waktu memengaruhi perpindahan pada gerak lurus berkecepatan tetap."},
    fluida:{label:"Massa jenis fluida",unit:"kg/m³",min:700,max:1300,step:50,value:1000,hint:"Ganti fluida untuk membandingkan tekanan hidrostatis."},
    termodinamika:{label:"Kapasitas kalor sistem",unit:"J/K",min:10,max:100,step:5,value:20,hint:"Kapasitas kalor menentukan kenaikan suhu untuk energi yang sama."},
    bunyi:{label:"Suhu medium",unit:"°C",min:-10,max:40,step:5,value:20,hint:"Suhu mengubah cepat rambat bunyi di udara; frekuensi sumber tetap."},
    cahaya:{label:"Indeks bias medium",unit:"n",min:1,max:2.5,step:0.1,value:1.0,hint:"Indeks bias mengubah cepat rambat dan panjang gelombang dalam medium."},
    dinamika:{label:"Massa benda",unit:"kg",min:0.5,max:10,step:0.5,value:2,hint:"Massa menentukan percepatan untuk gaya resultan tertentu."},
    listrikstatis:{label:"Besar tiap muatan",unit:"μC",min:0.1,max:5,step:0.1,value:1,hint:"Model memakai dua muatan sama besar; ubah besar muatannya."},
    listrikdinamis:{label:"Hambatan resistor",unit:"Ω",min:1,max:20,step:1,value:6,hint:"Ubah resistor pada rangkaian dan amati arus pada amperemeter."},
    magnet:{label:"Jarak dari kawat",unit:"cm",min:1,max:15,step:1,value:5,hint:"Medan magnet kawat lurus berkurang ketika jarak dari kawat bertambah."},
    induksi:{label:"Jumlah lilitan",unit:"lilitan",min:10,max:100,step:10,value:20,hint:"Jumlah lilitan memengaruhi GGL induksi menurut hukum Faraday."},
    ac:{label:"Hambatan beban",unit:"Ω",min:10,max:100,step:5,value:50,hint:"Beban menentukan arus efektif pada sumber AC ideal."},
    digital:{label:"Ukuran tiap data",unit:"byte",min:1,max:8,step:1,value:1,hint:"Kapasitas keadaan biner dikalikan ukuran data per keadaan."},
    relativitas:{label:"Waktu proper",unit:"ns",min:1,max:100,step:1,value:10,hint:"Waktu teramati dihitung dari waktu proper dikali faktor Lorentz."},
    inti:{label:"Fraksi massa yang dikonversi",unit:"%",min:0.01,max:100,step:0.01,value:100,hint:"Model menghitung energi dari bagian massa yang dikonversi menjadi energi."},
    radioaktivitas:{label:"Jumlah inti awal",unit:"inti",min:100,max:10000,step:100,value:1000,hint:"Jumlah inti tersisa mengikuti N = N₀(1/2)^(t/T½)."}
  };
  const auxSpec = config.model === "optik" ? null : (auxSpecs[config.model] || null);
  const auxWrap = $("moduleAuxControl"), meterPrimary = $("moduleMeterPrimary"), meterSecondary = $("moduleMeterSecondary");
  let auxInput = null, auxSlider = null, auxValue = auxSpec?.value;
  let measurementInstrument = "caliper";
  if(auxSpec && auxWrap){
    auxWrap.innerHTML = `<label for="moduleAuxValue">${auxSpec.label} (${auxSpec.unit})</label><div style="display:grid;grid-template-columns:minmax(100px,150px) 1fr;gap:12px;align-items:center;margin-top:6px"><input id="moduleAuxValue" type="number" min="${auxSpec.min}" max="${auxSpec.max}" step="${auxSpec.step}" value="${auxSpec.value}" style="width:100%"><input id="moduleAuxSlider" aria-label="${auxSpec.label}" type="range" min="${auxSpec.min}" max="${auxSpec.max}" step="${auxSpec.step}" value="${auxSpec.value}" style="width:100%;accent-color:#0f766e"></div>`;
    $("moduleAuxHint").textContent=auxSpec.hint; auxInput=$("moduleAuxValue"); auxSlider=$("moduleAuxSlider");
    const syncAux=(v,doRun=false)=>{auxValue=Number(v);auxInput.value=String(v);auxSlider.value=String(v);if(doRun)run();else drawLab();};
    auxInput.addEventListener("change",()=>syncAux(auxInput.value,true));
    auxSlider.addEventListener("input",()=>syncAux(auxSlider.value,true));
  } else { const box=$("moduleSecondaryControl"); if(box)box.hidden=true; }

  const measurementSelect = $("measurementInstrument");
  function configureMeasurementInstrument(mode, shouldRun=false){
    if(config.model !== "pengukuran") return;
    measurementInstrument = mode;
    const label=$("moduleParamLabel"), unit=$("moduleParamUnit"), hint=$("measurementInstrumentHint");
    const specs={
      caliper:{label:"Panjang benda",unit:"cm",auxLabel:"Resolusi jangka sorong",auxUnit:"mm",min:0.1,max:1,step:0.1,value:0.1,hint:"Geser rahang geser pada jangka sorong. Resolusi model dapat diatur."},
      micrometer:{label:"Ketebalan benda",unit:"cm",auxLabel:"Resolusi mikrometer",auxUnit:"mm",min:0.01,max:0.05,step:0.01,value:0.01,hint:"Putar thimble/spindel mikrometer untuk menjepit benda. Skala terkecil model 0,01–0,05 mm."},
      balance:{label:"Massa benda",unit:"g",auxLabel:"Ketelitian neraca",auxUnit:"g",min:0.1,max:1,step:0.1,value:0.1,hint:"Geser tiga rider pada lengan neraca hingga penunjuk seimbang; massa dibaca dari jumlah ketiga lengan."}
    };
    const spec=specs[mode]||specs.caliper;
    if(label)label.textContent=spec.label;if(unit)unit.textContent=spec.unit;if(hint)hint.textContent=spec.hint;
    config.param_label=spec.label;config.param_unit=spec.unit;if(sliderValue)sliderValue.textContent=`${input.value} ${spec.unit}`;
    if(auxSpec){Object.assign(auxSpec,{label:spec.auxLabel,unit:spec.auxUnit,min:spec.min,max:spec.max,step:spec.step,value:spec.value,hint:spec.hint});auxValue=spec.value;
      if(auxInput){auxInput.min=spec.min;auxInput.max=spec.max;auxInput.step=spec.step;auxInput.value=String(spec.value);auxSlider.min=spec.min;auxSlider.max=spec.max;auxSlider.step=spec.step;auxSlider.value=String(spec.value);}
      const auxLabel=auxWrap?.querySelector("label");if(auxLabel)auxLabel.textContent=`${spec.auxLabel} (${spec.auxUnit})`;
      const hintEl=$("moduleAuxHint");if(hintEl)hintEl.textContent=spec.hint;
    }
    drawLab();drawLab3D();if(shouldRun)run();
  }
  measurementSelect?.addEventListener("change",()=>configureMeasurementInstrument(measurementSelect.value,true));

  // Komponen yang dapat diseret di kanvas 2D. Posisi disimpan hanya selama halaman terbuka.
  function line(c,x1,y1,x2,y2,color="#64748b",width=2){c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.strokeStyle=color;c.lineWidth=width;c.stroke();}
  function text(c,s,x,y,color="#26364d",font="15px sans-serif"){c.fillStyle=color;c.font=font;c.fillText(s,x,y);}
  function circle(c,x,y,r,color){c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=color;c.fill();}
  function drawLab(result = latest) {
    if(!lab || !labCtx) return;
    const c=labCtx,w=lab.width,h=lab.height,model=config.model||"umum";
    const value=Number(input?.value ?? config.default),lo=Number(config.min),hi=Number(config.max);
    const ratio=Math.max(0,Math.min(1,(value-lo)/(hi-lo||1)));
    const cx=w/2,cy=155;
    c.clearRect(0,0,w,h);c.fillStyle="#f7f9fd";c.fillRect(0,0,w,h);
    // Grid halus dan meja laboratorium
    c.strokeStyle="#e8edf5";c.lineWidth=1;for(let x=30;x<w;x+=30)line(c,x,65,x,h-80,"#e8edf5",1);for(let y=70;y<h-75;y+=30)line(c,30,y,w-30,y,"#e8edf5",1);
    c.fillStyle="#d7e0eb";c.fillRect(30,h-78,w-60,12);line(c,30,h-66,w-30,h-66,"#9aaabd",2);
    text(c,config.title||"Laboratorium Fisika",22,30,"#20304a","bold 22px sans-serif");
    text(c,"PERANGKAT PRAKTIKUM · UBAH KONTROL ALAT",22,52,"#52627a","13px sans-serif");
    const valText=`${config.param_label||"Variabel"}: ${fmt(value)} ${config.param_unit||""}`;
    text(c,valText,w-330,30,"#1d4ed8","bold 14px sans-serif");
    const arrow=(x1,y1,x2,y2,col="#dc2626",width=3)=>{line(c,x1,y1,x2,y2,col,width);const a=Math.atan2(y2-y1,x2-x1);line(c,x2,y2,x2-10*Math.cos(a-.5),y2-10*Math.sin(a-.5),col,width);line(c,x2,y2,x2-10*Math.cos(a+.5),y2-10*Math.sin(a+.5),col,width);};
    const gauge=(x,y,r,label,reading,unit="")=>{c.beginPath();c.arc(x,y,r,Math.PI,Math.PI*2);c.strokeStyle="#64748b";c.lineWidth=5;c.stroke();for(let i=0;i<=5;i++){const a=Math.PI+i*Math.PI/5;line(c,x+Math.cos(a)*(r-7),y+Math.sin(a)*(r-7),x+Math.cos(a)*(r-17),y+Math.sin(a)*(r-17),"#64748b",2);}const a=Math.PI+ratio*Math.PI;arrow(x,y,x+Math.cos(a)*(r-22),y+Math.sin(a)*(r-22),"#dc2626",3);text(c,label,x-r,y+22,"#334155","bold 13px sans-serif");text(c,`${fmt(reading)} ${unit}`,x-r,y+42,"#1d4ed8","bold 14px sans-serif");};
    const knob=(x,y,r,label)=>{circle(c,x,y,r,"#cbd5e1");circle(c,x,y,r-5,"#64748b");const a=-Math.PI*.8+ratio*Math.PI*1.6;line(c,x,y,x+Math.cos(a)*(r-7),y+Math.sin(a)*(r-7),"#f8fafc",4);text(c,label,x-r-10,y+r+20,"#334155","bold 13px sans-serif");};
    const box=(x,y,bw,bh,fill="#e2e8f0",stroke="#64748b")=>{c.fillStyle=fill;c.fillRect(x,y,bw,bh);c.strokeStyle=stroke;c.lineWidth=2;c.strokeRect(x,y,bw,bh);};
    const wire=(x1,y1,x2,y2,col="#2563eb",width=3)=>line(c,x1,y1,x2,y2,col,width);
    // Setiap topik memakai susunan alat dan pembacaan yang berbeda. Angka tetap dihitung Python.
    if(model==="pengukuran"){
      text(c,"JANGKA SORONG · MODEL PENGUKURAN PANJANG",70,91,"#334155","bold 15px sans-serif");
      box(85,125,650,34,"#dbeafe","#64748b");for(let i=0;i<=50;i++){let x=90+i*12.8;line(c,x,125,x, i%5===0?144:135,"#334155",1);if(i%5===0)text(c,String(i),x-4,119,"#475569","10px sans-serif");}
      const jaw=100+ratio*560;box(jaw,112,18,64,"#60a5fa","#1d4ed8");line(c,jaw+9,112,jaw+9,97,"#1d4ed8",4);box(210,178,Math.max(35,ratio*260),26,"#fbbf24","#b45309");text(c,`Pembacaan model: ${fmt(value)} cm`,85,235,"#1d4ed8","bold 18px sans-serif");text(c,"Geser rahang biru untuk mengubah panjang ukur",85,260);
    } else if(model==="energi"){
      circle(c,155,135,40,"#fbbf24");for(let i=0;i<12;i++){let a=i*Math.PI/6;line(c,155+Math.cos(a)*47,135+Math.sin(a)*47,155+Math.cos(a)*60,135+Math.sin(a)*60,"#f59e0b",3);}for(let i=0;i<5;i++)arrow(220+i*35,95,250+i*35,150,"#fbbf24",2);
      // panel surya
      c.save();c.translate(440,150);c.transform(1,0,-.18,1,0,0);box(0,0,245,105,"#1d4ed8","#1e3a8a");for(let i=1;i<5;i++)line(c,i*49,0,i*49,105,"#93c5fd",1);for(let i=1;i<3;i++)line(c,0,i*35,245,i*35,"#93c5fd",1);c.restore();wire(450,258,450,280,"#64748b",5);box(405,280,90,30,"#dcfce7","#16a34a");text(c,`${fmt(Number(result?.output??value*.18))} unit keluaran`,520,300,"#166534","bold 17px sans-serif");text(c,"Intensitas cahaya",70,250,"#334155","bold 14px sans-serif");
    } else if(model==="pemanasan"){
      box(110,105,600,145,"rgba(186,230,253,.35)" ,"#0f766e");line(c,110,105,410,75,"#0f766e",4);line(c,410,75,710,105,"#0f766e",4);text(c,"MODEL EFEK RUMAH KACA",130,130,"#0f766e","bold 14px sans-serif");circle(c,260,190,25,"#fbbf24");for(let i=0;i<5;i++)arrow(290+i*45,160,300+i*45,205,"#f59e0b",2);for(let i=0;i<Math.round(value);i++)circle(c,440+(i%6)*32,160+Math.floor(i/6)*30,7,"#64748b");box(640,135,18,85,"#fee2e2","#b91c1c");c.fillStyle="#ef4444";c.fillRect(646,180+(1-ratio)*25,6,36+(ratio*18));text(c,`Suhu model ${fmt(Number(result?.output??25+1.5*value))} °C`,460,238,"#b91c1c","bold 16px sans-serif");text(c,"Kontrol konsentrasi gas rumah kaca",130,280);
    } else if(model==="kinematika"){
      line(c,80,235,790,235,"#64748b",5);for(let x=90;x<790;x+=35)line(c,x,235,x,245,"#64748b",1);const cart=100+ratio*600;box(cart,175,85,55,"#bfdbfe","#1d4ed8");circle(c,cart+18,235,13,"#475569");circle(c,cart+68,235,13,"#475569");arrow(cart+40,165,cart+40+50*ratio,165,"#dc2626",3);text(c,"Kereta dinamika",100,145,"#334155","bold 14px sans-serif");gauge(700,135,55,"Kecepatan",value,"m/s");text(c,`Perpindahan pada 2 s: ${fmt(Number(result?.output??2*value))} m`,100,285,"#1d4ed8","bold 16px sans-serif");
    } else if(model==="optik"){
      // UI optik khusus tetap menjadi laboratorium utama; kanvas ini tidak menggantikan alat optik khusus.
      line(c,65,190,825,190,"#64748b",2);const ox=150,lx=430,sx=620;circle(c,ox,125,12,"#fbbf24");line(c,ox,137,ox,190,"#2563eb",4);c.fillStyle="rgba(56,189,248,.25)";c.fillRect(lx-10,100,20,180);c.strokeStyle="#0284c7";c.strokeRect(lx-10,100,20,180);box(sx-5,115,10,150,"#e2e8f0");arrow(ox,137,lx,137,"#dc2626",2);arrow(lx,137,sx,240,"#dc2626",2);text(c,"Benda",ox-22,215);text(c,"Lensa",lx-22,90);text(c,"Layar",sx-20,285);text(c,"Gunakan panel Meja Optik Interaktif di bawah untuk menggeser alat.",90,310,"#52627a","14px sans-serif");
    } else if(model==="fluida"){
      text(c,"BEJANA AIR · SENSOR TEKANAN",90,92,"#334155","bold 15px sans-serif");box(150,110,250,155,"#eff6ff","#64748b");c.fillStyle="#60a5fa";c.fillRect(154,145,242,116);line(c,154,145,396,145,"#0284c7",3);const sy=150+ratio*100;line(c,355,115,355,sy,"#dc2626",3);circle(c,355,sy,9,"#dc2626");wire(364,sy,470,sy,"#dc2626",2);gauge(590,165,65,"Tekanan",Number(result?.output??9810*value),"Pa");text(c,`Kedalaman sensor: ${fmt(value)} m`,150,290,"#1d4ed8","bold 16px sans-serif");text(c,"Ubah kedalaman dengan kontrol alat di bawah",150,315,"#52627a","13px sans-serif");
    } else if(model==="termodinamika"){
      box(140,105,290,150,"#dbeafe","#475569");box(155,120,260,115,"#bfdbfe","#60a5fa");const piston=125-ratio*35;box(160,piston,250,18,"#94a3b8","#475569");line(c,285,70,285,piston,"#475569",6);circle(c,285,70,9,"#475569");for(let i=0;i<Math.round(3+ratio*8);i++)circle(c,180+(i%7)*32,150+Math.floor(i/7)*32,4,"#dc2626");circle(c,500,175,35,"#f97316");for(let i=0;i<8;i++){let a=i*Math.PI/4;line(c,500+Math.cos(a)*42,175+Math.sin(a)*42,500+Math.cos(a)*55,175+Math.sin(a)*55,"#f97316",3);}gauge(680,155,55,"Δ Suhu",Number(result?.output??value/20),"K");text(c,"Gas ideal · pemanas · piston",140,285,"#334155","bold 15px sans-serif");
    } else if(model==="bunyi"){
      box(100,130,65,100,"#cbd5e1","#475569");circle(c,132,180,24,"#475569");for(let r=30;r<120;r+=22){c.beginPath();c.arc(165,180,r,-.8,.8);c.strokeStyle="#7c3aed";c.lineWidth=3;c.stroke();}const freq=Number(value);c.beginPath();for(let x=330;x<760;x+=2){let y=180+38*Math.sin((x-330)/430*2*Math.PI*Math.max(1,freq/100));if(x===330)c.moveTo(x,y);else c.lineTo(x,y);}c.strokeStyle="#7c3aed";c.lineWidth=3;c.stroke();box(760,145,30,70,"#dcfce7","#15803d");text(c,"Speaker",95,250);text(c,"Mikrofon",735,240);gauge(570,100,48,"Frekuensi",value,"Hz");text(c,`λ = ${fmt(Number(result?.output??343/value))} m`,350,270,"#6d28d9","bold 17px sans-serif");
    } else if(model==="cahaya"){
      box(90,135,70,45,"#dc2626","#991b1b");text(c,"LASER",90,125,"#991b1b","bold 13px sans-serif");arrow(165,157,350,157,"#dc2626",4);box(350,105,12,105,"#e2e8f0","#64748b");for(let i=0;i<7;i++)line(c,362,115+i*14,370,115+i*14,"#475569",2);arrow(372,157,540,157,"#7c3aed",3);box(540,95,18,130,"#fef3c7","#d97706");for(let i=0;i<9;i++){let yy=105+i*14;line(c,558,yy,558+Math.max(6,50*Math.exp(-Math.pow((i-4)/2,2))),yy,"#7c3aed",3);}gauge(700,135,55,"λ",value,"nm");text(c,`Frekuensi: ${fmt(Number(result?.output??299792458/(value*1e-9)))} Hz`,90,285,"#6d28d9","bold 16px sans-serif");
    } else if(model==="dinamika"){
      line(c,80,235,800,235,"#64748b",4);const cart=180+ratio*400;box(cart,175,100,55,"#bfdbfe","#1d4ed8");circle(c,cart+20,235,12,"#475569");circle(c,cart+80,235,12,"#475569");arrow(cart+50,165,cart+50+80*ratio,165,"#dc2626",5);text(c,`F = ${fmt(value)} N`,cart+5,150,"#b91c1c","bold 15px sans-serif");gauge(650,120,55,"a",Number(result?.output??value/2),"m/s²");text(c,"Kereta bermassa 2 kg di atas rel",120,285,"#334155","bold 15px sans-serif");
    } else if(model==="listrikstatis"){
      const sep=130+ratio*400;circle(c,220,170,32,"#fca5a5");text(c,"+",211,179,"#991b1b","bold 25px sans-serif");circle(c,220+sep,170,32,"#bfdbfe");text(c,"+",220+sep-9,179,"#1d4ed8","bold 25px sans-serif");line(c,252,170,220+sep-32,170,"#64748b",2);text(c,`r = ${fmt(value)} m`,270,225,"#334155","bold 15px sans-serif");gauge(670,135,55,"Gaya Coulomb",Number(result?.output??8.9875517923e9*1e-12/(value*value)),"N");text(c,"Dua muatan titik sama-sama positif",100,280);
    } else if(model==="listrikdinamis"){
      // Rangkaian tertutup dengan baterai, resistor dan meter yang menampilkan hasil model.
      line(c,170,115,610,115,"#2563eb",4);line(c,170,115,170,255,"#2563eb",4);line(c,170,255,610,255,"#2563eb",4);line(c,610,115,610,255,"#2563eb",4);box(145,155,50,62,"#fef3c7","#b45309");line(c,155,175,185,175,"#b45309",4);line(c,160,195,180,195,"#b45309",2);text(c,"Baterai",130,235);box(355,95,100,40,"#e2e8f0","#475569");for(let x=365;x<450;x+=14)line(c,x,100,x+8,130,"#64748b",2);text(c,"R = 6 Ω",355,85,"#334155","bold 14px sans-serif");gauge(500,185,42,"Amperemeter",Number(result?.output??value/6),"A");text(c,`V = ${fmt(value)} V`,230,290,"#1d4ed8","bold 17px sans-serif");
    } else if(model==="magnet"){
      box(300,130,95,60,"#ef4444","#991b1b");box(395,130,95,60,"#2563eb","#1e40af");text(c,"N",338,167,"white","bold 22px sans-serif");text(c,"S",430,167,"white","bold 22px sans-serif");for(let r=35;r<105;r+=17){c.beginPath();c.ellipse(395,160,110,r,0,Math.PI,Math.PI*2);c.strokeStyle="#0d9488";c.lineWidth=2;c.stroke();}gauge(620,130,55,"Arus",value,"A");text(c,`B model = ${fmt(Number(result?.output??2e-7*value/.05))} T`,270,275,"#0f766e","bold 17px sans-serif");
    } else if(model==="induksi"){
      // Magnet dapat bergerak sepanjang lintasan; kumparan dan galvanometer.
      const mx=100+ratio*300;box(mx,145,55,48,"#ef4444","#991b1b");box(mx+55,145,55,48,"#2563eb","#1e40af");text(c,"N",mx+18,175,"white","bold 18px sans-serif");text(c,"S",mx+72,175,"white","bold 18px sans-serif");for(let i=0;i<9;i++){c.beginPath();c.ellipse(550,170,45+i*3,50,0,0,Math.PI*2);c.strokeStyle="#b45309";c.lineWidth=3;c.stroke();}wire(595,170,650,170,"#b45309",3);gauge(700,130,50,"GGL",Number(result?.output??value*20),"V");text(c,"Magnet bergerak → kumparan → galvanometer",100,270,"#334155","bold 15px sans-serif");
    } else if(model==="ac"){
      line(c,85,190,790,190,"#94a3b8",1);c.beginPath();for(let x=85;x<790;x+=2){let y=190-65*ratio*Math.sin((x-85)/705*4*Math.PI);if(x===85)c.moveTo(x,y);else c.lineTo(x,y);}c.strokeStyle="#7c3aed";c.lineWidth=3;c.stroke();gauge(200,105,55,"V maksimum",value,"V");gauge(650,105,55,"V efektif",Number(result?.output??value/Math.sqrt(2)),"V");text(c,"Osiloskop AC",390,270,"#334155","bold 16px sans-serif");
    } else if(model==="digital"){
      const bits=Math.max(1,Math.min(12,Math.round(value)));text(c,`PANEL SAKELAR BINER · ${bits} bit`,95,95,"#334155","bold 15px sans-serif");for(let i=0;i<bits;i++){const x=100+i* Math.min(52,680/bits);box(x,125,38,68,i%2===0?"#dcfce7":"#e2e8f0",i%2===0?"#15803d":"#64748b");circle(c,x+19, i%2===0?142:176,8,i%2===0?"#16a34a":"#64748b");text(c,i%2===0?"1":"0",x+14,218,"#334155","bold 15px sans-serif");}text(c,`Kombinasi yang mungkin: 2^${bits} = ${fmt(Number(result?.output??2**bits) )}`,100,270,"#166534","bold 18px sans-serif");
    } else if(model==="debroglie"){
      box(100,145,60,55,"#cbd5e1","#64748b");text(c,"Sumber",95,130);arrow(165,172,350,172,"#dc2626",4);for(let x=350;x<510;x+=18){line(c,x,120,x,225,"#64748b",2);}for(let x=370;x<500;x+=30){c.beginPath();c.moveTo(x,120);c.lineTo(x+8,172);c.lineTo(x,225);c.strokeStyle="#7c3aed";c.lineWidth=2;c.stroke();}text(c,"Partikel + pola gelombang",335,245,"#6d28d9","bold 15px sans-serif");text(c,`λ de Broglie = ${fmt(Number(result?.output??6.62607015e-34/value))} m`,100,285,"#1d4ed8","bold 16px sans-serif");
    } else if(model==="relativitas"){
      box(100,110,270,150,"#dbeafe","#2563eb");box(500,110,270,150,"#f1f5f9","#64748b");text(c,"PENGAMAT",175,95,"#1d4ed8","bold 14px sans-serif");text(c,"PESAWAT RELATIF",555,95,"#475569","bold 14px sans-serif");line(c,130,185,340,185,"#dc2626",4);arrow(140,185,330,185,"#dc2626",4);line(c,530,185,740,185,"#7c3aed",4);arrow(540,185,730,185,"#7c3aed",4);gauge(450,145,50,"v/c",value,"c");text(c,`Faktor Lorentz γ = ${fmt(Number(result?.output??1/Math.sqrt(1-value*value)))}`,200,295,"#1d4ed8","bold 17px sans-serif");
    } else if(model==="inti"){
      circle(c,330,170,85,"#dbeafe");for(let i=0;i<22;i++){const a=i*2.399;const rr=12+((i*17)%62);circle(c,330+Math.cos(a)*rr,170+Math.sin(a)*rr,8,i%2?"#2563eb":"#ef4444");}arrow(430,170,570,170,"#f59e0b",4);text(c,"E = mc²",580,160,"#b45309","bold 24px sans-serif");gauge(690,220,48,"Massa",value,"kg");text(c,`Energi ekuivalen: ${fmt(Number(result?.output??value*299792458**2))} J`,90,295,"#1d4ed8","bold 15px sans-serif");
    } else if(model==="radioaktivitas"){
      box(100,110,300,150,"#f8fafc","#64748b");const count=Math.max(0,Math.round(100*Math.pow(.5,value)));for(let i=0;i<100;i++){const x=112+(i%20)*13.5,y=122+Math.floor(i/20)*25;circle(c,x,y,4,i<count?"#16a34a":"#cbd5e1");}text(c,`Waktu paruh berlalu: ${fmt(value)}`,100,95,"#334155","bold 15px sans-serif");gauge(650,145,55,"Sisa inti",Number(result?.output??100*Math.pow(.5,value)),"%");text(c,"Hijau = inti belum meluruh · abu-abu = meluruh",100,290,"#334155","13px sans-serif");
    } else {
      box(150,125,180,100,"#dbeafe","#2563eb");box(480,125,180,100,"#dcfce7","#16a34a");arrow(350,175,460,175,"#dc2626",3);text(c,"Masukan",200,180,"#1d4ed8","bold 16px sans-serif");text(c,"Keluaran",525,180,"#166534","bold 16px sans-serif");
    }
    // Kontrol berbentuk rel dan knop alat: menyeret knop mengubah variabel, lalu menghitung ulang via Python.
    const railY=h-42,railL=180,railR=w-180,knobX=railL+ratio*(railR-railL);
    text(c,"KONTROL ALAT",25,h-36,"#52627a","bold 12px sans-serif");line(c,railL,railY,railR,railY,"#94a3b8",7);for(let i=0;i<=10;i++){const x=railL+(railR-railL)*i/10;line(c,x,railY-6,x,railY+6,"#475569",1);}circle(c,knobX,railY,12,"#2563eb");circle(c,knobX,railY,5,"#dbeafe");text(c,fmt(lo),railL-18,railY+23,"#64748b","11px sans-serif");text(c,fmt(hi),railR-10,railY+23,"#64748b","11px sans-serif");
    const out=result && Number.isFinite(Number(result.output)) ? fmt(result.output) : "belum dihitung";
    text(c,`${result?.output_label||"Hasil model"}: ${out}`,22,h-7,"#20304a","bold 13px sans-serif");
    if(auxSpec){text(c,`${auxSpec.label}: ${fmt(auxValue)} ${auxSpec.unit}`,w-330,52,"#0f766e","bold 13px sans-serif");}
    if(labNote) labNote.textContent=model==="optik"?"Gunakan Meja Optik Interaktif khusus di bawah untuk menggeser benda, lensa, dan layar.":"Laboratorium model: ubah variabel utama dan pengatur alat kedua. Pembacaan, tabel, dan grafik dihitung oleh model Python.";
  }
  function canvasX(event, canvas){const r=canvas.getBoundingClientRect();return (event.clientX-r.left)*canvas.width/r.width;}
  if(lab && config.model !== "optik"){
    const range=()=>({lo:Number(config.min),hi:Number(config.max)});
    const point=e=>{const r=lab.getBoundingClientRect();return{x:(e.clientX-r.left)*lab.width/r.width,y:(e.clientY-r.top)*lab.height/r.height};};
    const setRatio=ratio=>{const {lo,hi}=range();ratio=Math.max(0,Math.min(1,ratio));const raw=lo+ratio*(hi-lo);const step=Number(config.step)||0;const v=step>0?lo+Math.round((raw-lo)/step)*step:raw;input.value=String(Number(v.toPrecision(8)));if(slider)slider.value=input.value;if(sliderValue)sliderValue.textContent=input.value+" "+(config.param_unit||"");drawLab();};
    let draggingControl="";
    lab.addEventListener("pointerdown",e=>{
      const {x,y}=point(e),r=Math.max(0,Math.min(1,(Number(input.value)-Number(config.min))/(Number(config.max)-Number(config.min)||1)));
      const onRail=y>=lab.height-75;
      if(onRail)draggingControl="rail";
      else if(config.model==="pengukuran" && x>=90+r*560-22 && x<=125+r*560 && y>=95 && y<=190)draggingControl="pengukuran";
      else if(config.model==="fluida" && Math.abs(x-355)<30 && Math.abs(y-(150+r*100))<28)draggingControl="fluida";
      else if(config.model==="kinematika" && x>=100+r*600-15 && x<=200+r*600 && y>=165 && y<=245)draggingControl="kinematika";
      else if(config.model==="dinamika" && x>=180+r*400-15 && x<=280+r*400 && y>=165 && y<=245)draggingControl="dinamika";
      else if(config.model==="induksi" && x>=100+r*300-10 && x<=210+r*300 && y>=135 && y<=205)draggingControl="induksi";
      else if(config.model==="listrikstatis" && x>=350+r*400-30 && x<=410+r*400 && y>=130 && y<=210)draggingControl="listrikstatis";
      else if(config.model==="termodinamika" && x>=145 && x<=425 && y>=85 && y<=155)draggingControl="termodinamika";
      if(!draggingControl)return;
      lab.setPointerCapture(e.pointerId);lab.style.cursor="grabbing";
      if(draggingControl==="rail")setRatio((x-180)/(lab.width-360));
      else updateApparatus(x,y);
    });
    function updateApparatus(x,y){
      if(draggingControl==="pengukuran")setRatio((x-100)/560);
      else if(draggingControl==="fluida")setRatio((y-150)/100);
      else if(draggingControl==="kinematika")setRatio((x-100)/600);
      else if(draggingControl==="dinamika")setRatio((x-180)/400);
      else if(draggingControl==="induksi")setRatio((x-100)/300);
      else if(draggingControl==="listrikstatis")setRatio((x-350)/400);
      else if(draggingControl==="termodinamika")setRatio((125-y)/35);
    }
    lab.addEventListener("pointermove",e=>{if(!draggingControl)return;const {x,y}=point(e);if(draggingControl==="rail")setRatio((x-180)/(lab.width-360));else updateApparatus(x,y);});
    const stop=()=>{if(!draggingControl)return;draggingControl="";lab.style.cursor="grab";run();};
    lab.addEventListener("pointerup",stop);lab.addEventListener("pointercancel",stop);
  }

  function drawGraph(points=[]){if(!graphCtx||!graph)return;const c=graphCtx,w=graph.width,h=graph.height,pad={l:78,r:24,t:25,b:62};c.clearRect(0,0,w,h);c.fillStyle="#fff";c.fillRect(0,0,w,h);if(!points.length){text(c,"Jalankan percobaan untuk melihat grafik.",24,42,"#64748b");return;}const xs=points.map(p=>Number(p.x)),ys=points.map(p=>Number(p.y));let xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(...ys),ymax=Math.max(...ys);if(xmin===xmax)xmax=xmin+1;if(ymin===ymax)ymax=ymin+1;const px=x=>pad.l+(x-xmin)/(xmax-xmin)*(w-pad.l-pad.r),py=y=>h-pad.b-(y-ymin)/(ymax-ymin)*(h-pad.t-pad.b);c.strokeStyle="#e4e9f2";c.fillStyle="#526078";c.font="12px sans-serif";for(let i=0;i<=5;i++){const x=pad.l+(w-pad.l-pad.r)*i/5,y=pad.t+(h-pad.t-pad.b)*i/5;line(c,x,pad.t,x,h-pad.b,"#e4e9f2",1);line(c,pad.l,y,w-pad.r,y,"#e4e9f2",1);text(c,fmt(xmin+(xmax-xmin)*i/5),x-18,h-pad.b+20);text(c,fmt(ymax-(ymax-ymin)*i/5),8,y+4);}c.beginPath();points.forEach((p,i)=>i?c.lineTo(px(Number(p.x)),py(Number(p.y))):c.moveTo(px(Number(p.x)),py(Number(p.y))));c.strokeStyle="#3267e8";c.lineWidth=3;c.stroke();points.forEach(p=>circle(c,px(Number(p.x)),py(Number(p.y)),4,"#3267e8"));c.textAlign="center";text(c,`${config.param_label||"Variabel X"} (${config.param_unit||""})`,(pad.l+w-pad.r)/2,h-16);c.save();c.translate(18,(pad.t+h-pad.b)/2);c.rotate(-Math.PI/2);text(c,latest?.output_label||"Variabel keluaran",0,0);c.restore();c.textAlign="left";}
  function renderTable(points=[]){tbody.innerHTML="";points.forEach((p,i)=>{const tr=document.createElement("tr");[i+1,fmt(p.x),fmt(p.y)].forEach(v=>{const td=document.createElement("td");td.textContent=v;tr.appendChild(td);});tbody.appendChild(tr);});if(!points.length)tbody.innerHTML='<tr><td colspan="3">Jalankan percobaan untuk menghasilkan data.</td></tr>';}
  function analyze(points=[]){if(!points.length)return"Belum ada data percobaan untuk dianalisis.";const valid=points.filter(p=>Number.isFinite(Number(p.x))&&Number.isFinite(Number(p.y)));if(!valid.length)return"Data tidak valid.";const a=Number(valid[0].y),b=Number(valid[valid.length-1].y),delta=b-a;const trend=delta>0?"meningkat":delta<0?"menurun":"tetap";return`Terdapat ${valid.length} titik data. Saat X berubah dari ${fmt(valid[0].x)} menjadi ${fmt(valid[valid.length-1].x)}, Y ${trend} sebesar ${fmt(delta)}. Ini menggambarkan kecenderungan pada model, bukan bukti eksperimen nyata.`;}
  async function run(){const value=Number(input.value);if(input.value.trim()===""||!Number.isFinite(value)){status.textContent="Masukkan angka yang valid.";return;}if(value<Number(config.min)||value>Number(config.max)){status.textContent=`Nilai harus berada pada rentang ${config.min}–${config.max}.`;return;}runBtn.disabled=true;status.textContent="Menghitung menggunakan Python...";try{const response=await fetch("/api/modul/"+encodeURIComponent(config.slug),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({value,...(config.model === "optik" ? {focus: opticsFocus} : (auxSpec ? {aux: Number(auxValue)} : {})),...(config.model === "pengukuran" ? {instrument:measurementInstrument} : {})})});const result=await response.json();if(!response.ok)throw new Error(result.error||"Percobaan gagal.");latest=result;window.PHYSLAB_PLAY_REACTION?.(result);inputResult.textContent=`${fmt(result.input)} ${config.param_unit||""}`;outputLabel.textContent=result.output_label||"Variabel keluaran";outputResult.textContent=`${result.output===null?"∞":fmt(result.output)} ${result.output_unit||""}`;if(meterPrimary)meterPrimary.textContent=`${fmt(value)} ${config.param_unit||""}`;if(meterSecondary)meterSecondary.textContent=`${result.output===null?"∞":fmt(result.output)} ${result.output_unit||""}`;outputHeader.textContent=result.output_label||"Hasil keluaran";renderTable(result.series||[]);drawGraph(result.series||[]);drawLab(result);$("moduleAnalysis").textContent=analyze(result.series||[]);$("moduleGraphNote").textContent=result.note||"Grafik menampilkan hubungan variabel masukan dan keluaran.";status.textContent="Percobaan berhasil dihitung oleh Python.";csvBtn.disabled=false;}catch(err){status.textContent="Gagal: "+err.message;}finally{runBtn.disabled=false;}}
  input?.addEventListener("input",()=>{if(slider)slider.value=input.value;if(sliderValue)sliderValue.textContent=input.value+" "+(config.param_unit||"");});
  slider?.addEventListener("input",()=>{input.value=slider.value;if(sliderValue)sliderValue.textContent=slider.value+" "+(config.param_unit||"");run();});
  runBtn?.addEventListener("click",run);resetBtn?.addEventListener("click",()=>{input.value=config.default;if(auxSpec&&auxInput){auxInput.value=auxSpec.value;auxSlider.value=auxSpec.value;auxValue=auxSpec.value;}if(meterPrimary)meterPrimary.textContent="Siap";if(meterSecondary)meterSecondary.textContent="—";if(slider)slider.value=config.default;if(sliderValue)sliderValue.textContent=config.default+" "+(config.param_unit||"");latest=null;inputResult.textContent="—";outputResult.textContent="—";outputLabel.textContent="Variabel keluaran";outputHeader.textContent="Hasil keluaran";renderTable();drawGraph();drawLab();$("moduleAnalysis").textContent="Analisis akan muncul setelah percobaan dijalankan.";$("moduleGraphNote").textContent="Grafik akan tampil setelah percobaan dijalankan.";status.textContent="Parameter direset.";csvBtn.disabled=true;});
  csvBtn?.addEventListener("click",()=>{if(!latest)return;const rows=[[config.param_label+" ("+config.param_unit+")",latest.output_label],...(latest.series||[]).map(p=>[p.x,p.y])];const csv=rows.map(row=>row.map(v=>'"'+String(v??"").replaceAll('"','""')+'"').join(",")).join("\r\n");const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8;"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=(config.slug||"physlab")+"-hasil.csv";a.click();URL.revokeObjectURL(url);});
  $("moduleSaveConclusion")?.addEventListener("click",()=>{const value=$("moduleConclusion").value.trim();$("moduleConclusionStatus").textContent=value?"Kesimpulan tersimpan di halaman ini selama halaman tidak ditutup.":"Tuliskan kesimpulan terlebih dahulu.";});

  // Ruang praktikum 3D berbasis proyeksi perspektif (offline, tanpa library eksternal).
  let drawLab3D = () => {};
  (()=>{
    const canvas=$("moduleLabCanvas3D"),note=$("moduleLab3DNote");if(!canvas)return;
    const c=canvas.getContext("2d");let drag="",lx=0,ly=0;
    const W=canvas.width,H=canvas.height;
    const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
    // Kamera orang pertama: posisi pengguna berada di dalam ruangan dan melihat ke meja.
    const initialCamera={x:0,y:1.22,z:2.05,yaw:0,pitch:-0.13};
    const camera={...initialCamera};
    // Komponen tambahan hidup langsung di meja 3D sudut pandang orang pertama.
    let nextToolId=1,selectedTool=null,toolDragMoved=false,toolDragStart=null;
    const toolDefs={ruler:{name:"Penggaris metrik",size:"30 cm",color:"#facc15"},caliper:{name:"Jangka sorong",size:"0–150 mm · resolusi 0,05 mm",color:"#cbd5e1"},micrometer:{name:"Mikrometer sekrup",size:"0–25 mm · resolusi 0,01 mm",color:"#94a3b8"},spring:{name:"Dinamometer",size:"0–5 N",color:"#34d399"},balance:{name:"Neraca digital",size:"kapasitas 500 g · resolusi 0,01 g",color:"#22d3ee"},stopwatch:{name:"Stopwatch",size:"resolusi 0,01 s",color:"#f59e0b"},thermometer:{name:"Termometer laboratorium",size:"−10 hingga 110 °C",color:"#fb7185"},cylinder:{name:"Gelas ukur",size:"100 mL",color:"#7dd3fc"},beaker:{name:"Gelas beker",size:"250 mL",color:"#93c5fd"},pendulum:{name:"Bandul sederhana",color:"#a78bfa"},cart:{name:"Kereta dinamika",size:"panjang ±10 cm",color:"#f97316"},pulley:{name:"Katrol",color:"#94a3b8"},battery:{name:"Catu daya DC",size:"0–12 V · tegangan rendah",color:"#fbbf24"},resistor:{name:"Resistor",color:"#d6a56d"},ammeter:{name:"Amperemeter",size:"rentang 0–5 A",color:"#f87171"},voltmeter:{name:"Voltmeter",size:"rentang 0–15 V",color:"#60a5fa"},magnet:{name:"Magnet batang",color:"#ef4444"},lens:{name:"Lensa cembung",size:"diameter ±5 cm",color:"#67e8f9"},mirror:{name:"Cermin datar",size:"±10 × 5 cm",color:"#cbd5e1"},prism:{name:"Prisma kaca",size:"sisi ±5 cm",color:"#c4b5fd"},solar:{name:"Panel surya mini",size:"±10 × 15 cm",color:"#1d4ed8"},lamp:{name:"Lampu sumber cahaya",size:"LED 3–5 W",color:"#fbbf24"},heater:{name:"Pemanas listrik",size:"daya rendah",color:"#f97316"},screen:{name:"Layar putih",size:"±15 × 20 cm",color:"#f8fafc"},pressure:{name:"Sensor tekanan",size:"probe kecil",color:"#0ea5e9"},tuning:{name:"Garpu tala",size:"440 Hz",color:"#94a3b8"},speaker:{name:"Pengeras suara",size:"diameter ±5 cm",color:"#334155"},microphone:{name:"Mikrofon",size:"kapsul kecil",color:"#64748b"},laser:{name:"Sumber laser",size:"kelas 2 · daya rendah",color:"#dc2626"},coil:{name:"Kumparan kawat",size:"±500 lilitan (model)",color:"#d97706"},electroscope:{name:"Elektroskop",size:"daun logam",color:"#eab308"},switch:{name:"Sakelar",size:"satu kutub",color:"#64748b"},led:{name:"LED indikator",size:"5 mm",color:"#ef4444"},source:{name:"Sumber model",color:"#8b5cf6"},detector:{name:"Detektor model",color:"#0f766e"},oscilloscope:{name:"Osiloskop",size:"model meja",color:"#166534"},insulation:{name:"Wadah isolasi",size:"±250 mL",color:"#bae6fd"},compass:{name:"Kompas",size:"diameter ±3 cm",color:"#dc2626"}};
    const toolSets={
      pengukuran:["caliper","micrometer","balance","ruler"],
      energi:["solar","lamp","voltmeter","ammeter"],
      pemanasan:["beaker","thermometer","lamp","insulation","heater"],
      kinematika:["cart","ruler","stopwatch"],
      optik:["lamp","lens","screen","ruler","mirror"],
      fluida:["cylinder","beaker","pressure","ruler"],
      termodinamika:["beaker","thermometer","heater","insulation"],
      bunyi:["tuning","speaker","microphone","oscilloscope"],
      cahaya:["laser","prism","screen","ruler","lens"],
      dinamika:["cart","pulley","spring","balance"],
      listrikstatis:["electroscope","source","ruler"],
      listrikdinamis:["battery","resistor","ammeter","voltmeter","switch"],
      magnet:["battery","coil","magnet","ammeter","compass"],
      induksi:["magnet","coil","ammeter","ruler"],
      ac:["source","resistor","oscilloscope","voltmeter"],
      digital:["battery","switch","led","resistor","source"],
      debroglie:["source","detector","screen"],
      relativitas:["source","detector","ruler"],
      inti:["source","detector","screen"],
      radioaktivitas:["source","detector","screen"]
    };
    const placedTools=[];
    let reactionStarted=0,reactionUntil=0,reactionFrame=0,reactionResult=null;
    window.PHYSLAB_PLAY_REACTION=(result)=>{reactionStarted=performance.now();reactionUntil=reactionStarted+6500;reactionResult=result||null;const st=$("assemblyStatus");if(st)st.textContent=`Reaksi praktikum berlangsung: ${reactionDescriptions[config.model]||"perubahan fisika pada sistem"}. Amati gerak alat, perubahan visual, indikator, tabel, dan grafik.`;drawLab3D();if(!reactionFrame)reactionFrame=requestAnimationFrame(animateReaction);};
    const reactionDescriptions={pengukuran:"rahang dan skala alat ukur menyesuaikan objek",energi:"cahaya diserap panel dan energi listrik dihasilkan",pemanasan:"energi radiasi terperangkap dan suhu meningkat",kinematika:"kereta bergerak sepanjang lintasan",dinamika:"gaya resultan mempercepat kereta",fluida:"tekanan bertambah dan gelembung bergerak di dalam fluida",termodinamika:"pemanasan mengubah suhu dan keadaan gas",bunyi:"gelombang tekanan merambat dari speaker",cahaya:"cahaya dibiaskan dan diteruskan ke layar",optik:"berkas cahaya dibiaskan oleh lensa",listrikstatis:"medan listrik dan gaya antarmuatan muncul",listrikdinamis:"muatan bergerak mengelilingi rangkaian",ac:"arus bolak-balik berubah arah secara periodik",magnet:"medan magnet muncul di sekitar penghantar",induksi:"perubahan fluks menimbulkan GGL induksi",digital:"sinyal biner mengubah keadaan indikator",debroglie:"model partikel menampilkan pola gelombang",relativitas:"indikator faktor Lorentz berubah",inti:"model energi ikat inti divisualisasikan",radioaktivitas:"jumlah inti model berkurang sesuai peluruhan"};
    function animateReaction(now){if(now>=reactionUntil){reactionFrame=0;drawLab3D();return;}drawLab3D();reactionFrame=requestAnimationFrame(animateReaction);}
    function drawReactionEffects(){
      if(!reactionStarted||performance.now()>reactionUntil)return;
      const t=(performance.now()-reactionStarted)/1000,phase=(t%1),model=config.model;
      const pulse=(x,y,z,color="#fbbf24",r=5)=>{const q=project(x,y,z);if(!q.visible)return;c.beginPath();c.arc(q.x,q.y,r+Math.sin(t*8)*2,0,Math.PI*2);c.fillStyle=color;c.globalAlpha=.85;c.fill();c.globalAlpha=1;};
      const beam=(a,b,color="rgba(250,204,21,.8)",width=3)=>line3(a,b,color,width);
      if(model==="energi"){
        for(let i=0;i<5;i++){const f=(phase+i/5)%1;beam([-1.25,.9,-.1],[-.5+f*.08,.22,-.1],"rgba(250,204,21,.75)",2);pulse(-.5+f*.08,.22,-.1,"#fde047",5);}
        for(let i=0;i<4;i++){const f=(phase+i/4)%1;pulse(.35+f*.65,.19,.15,"#38bdf8",4);}
      }else if(model==="pemanasan"||model==="termodinamika"){
        for(let i=0;i<5;i++){const x=-.65+i*.3,yy=.48+((t*0.28+i*.13)%0.55);beam([x,yy-.12,0],[x+.06*Math.sin(t*4+i),yy+.08,0],"rgba(249,115,22,.8)",3);pulse(x,yy,0,"#fb923c",4);}
      }else if(model==="optik"||model==="cahaya"){
        beam([-1.5,.42,0],[0,.42,0],"rgba(250,204,21,.9)",4);beam([0,.42,0],[1.25,.22+Math.sin(t)*.06,0],"rgba(168,85,247,.9)",4);pulse(-1.3+((t*.65)%1)*1.2,.42,0,"#fde047",6);pulse(.05+((t*.55)%1)*1.05,.4,0,"#c4b5fd",5);
      }else if(model==="listrikdinamis"||model==="ac"||model==="digital"){
        const loop=[[-1.1,.36,0],[-.2,.36,0],[.9,.36,0],[.9,-.08,0],[-1.1,-.08,0]];
        const seg=(t*.75)%1*(loop.length-1),idx=Math.floor(seg),f=seg-idx,a=loop[idx],b=loop[idx+1];pulse(a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f,a[2],"#facc15",6);
        if(model==="ac")pulse(a[0]+(b[0]-a[0])*((f+.5)%1),a[1],a[2],"#60a5fa",4);
      }else if(model==="magnet"||model==="induksi"||model==="listrikstatis"){
        for(let i=0;i<4;i++){const yy=.25+i*.13;beam([-.9,yy,0],[.9,yy,0],"rgba(34,211,238,.55)",1.5);pulse(-.8+((t*.35+i*.22)%1)*1.6,yy,0,"#67e8f9",4);}
      }else if(model==="fluida"){
        for(let i=0;i<7;i++){const f=(t*.23+i/7)%1;pulse(-.55+(i%3)*.28,.18+f*.72,0,"rgba(56,189,248,.95)",4+(i%2));}
      }else if(model==="bunyi"){
        const q=project(-.95,.45,0);if(q.visible){for(let i=0;i<3;i++){c.beginPath();c.arc(q.x,q.y,25+((t*65+i*28)%110),-.8,.8);c.strokeStyle="rgba(167,139,250,.8)";c.lineWidth=3;c.stroke();}}
      }else if(model==="kinematika"||model==="dinamika"){
        const f=(t*.18)%1;pulse(-1.5+f*3,.35,0,"#fb923c",8);beam([-1.6,.18,0],[1.6,.18,0],"rgba(59,130,246,.45)",2);
      }else if(model==="pengukuran"){
        pulse(-.45+((t*.2)%1)*.9,.28,0,"#60a5fa",7);pulse(.15,.35,0,"#fbbf24",5);
      }else{
        for(let i=0;i<6;i++)pulse(-1.2+i*.45,.35+Math.sin(t*3+i)*.1,0,"#a78bfa",4);
      }
      const q=project(0,1.05,.35);if(q.visible){c.fillStyle="rgba(15,23,42,.82)";c.fillRect(Math.max(330,q.x-150),Math.max(75,q.y-24),300,28);c.fillStyle="#86efac";c.font="bold 13px sans-serif";c.fillText("REAKSI PRAKTIKUM AKTIF",Math.max(342,q.x-138),Math.max(94,q.y-6));}
    }
    function resetDefaultTools(){
      placedTools.splice(0,placedTools.length);
      const set=toolSets[config.model]||["ruler","stopwatch"];
      const positions=[[-1.22,-.18],[-.62,-.18],[0,-.18],[.62,-.18],[1.22,-.18],[-.92,.35],[-.30,.35],[.32,.35],[.94,.35]];
      set.forEach((type,i)=>placedTools.push({id:nextToolId++,type,x:positions[i%positions.length][0],z:positions[i%positions.length][1],setting:.5,angle:0}));
      selectedTool=null;window.__physlabLastToolClick=null;
    }
    resetDefaultTools();
    window.PHYSLAB_ADD_TOOL=(type)=>{const def=toolDefs[type];if(!def)return;placedTools.push({id:nextToolId++,type,x:-1.35+((placedTools.length%4)*.78),z:-.22+Math.floor(placedTools.length/4)*.34,setting:0.5,angle:0});const st=$("assemblyStatus");if(st)st.textContent=`${def.name} ditambahkan ke meja 3D. Klik alat untuk memilih, seret untuk memindahkan.`;drawLab3D();};
    function drawPlacedTools(){
      const rawPoly3=poly3,rawLine3=line3,rawBox3=box3,rawRod=rod,rawCylinder=cylinder;
      placedTools.forEach(t=>{
        const x=t.x,z=t.z,y=.13,def=toolDefs[t.type],sel=selectedTool===t.id,s=clamp(t.setting,0,1),ang=t.angle||0;
        // Skala model relatif terhadap meja: tabletop 2,25 m x 0,825 m.
        // Faktor ini mengubah ukuran keseluruhan model ke envelope fisik alat yang wajar.
        const physicalScale={ruler:.30,caliper:.36,micrometer:.48,spring:.52,balance:.58,stopwatch:.40,thermometer:.38,cylinder:.40,beaker:.48,pendulum:.62,cart:.48,pulley:.52,battery:.55,resistor:.42,ammeter:.58,voltmeter:.58,magnet:.50,lens:.42,mirror:.55,prism:.42,solar:.58,lamp:.48,heater:.48,screen:.55,pressure:.38,tuning:.42,speaker:.55,microphone:.40,laser:.50,coil:.48,electroscope:.50,switch:.35,led:.30,source:.50,detector:.50,oscilloscope:.62,insulation:.55}[t.type]||.5;
        const turn=p=>{const dx=(p[0]-x)*physicalScale,dz=(p[2]-z)*physicalScale,dy=(p[1]-y)*physicalScale;return [x+dx*Math.cos(ang)-dz*Math.sin(ang),y+dy,z+dx*Math.sin(ang)+dz*Math.cos(ang)];};
        // Rotate the actual apparatus geometry around its center, not just its selection marker.
        poly3=(pts,fill,stroke)=>rawPoly3(pts.map(turn),fill,stroke);
        line3=(a,b,color,width)=>rawLine3(turn(a),turn(b),color,width);
        box3=(bx,by,bz,bw,bh,bd,fill,stroke)=>{const a=[bx,by,bz],b=[bx+bw,by,bz],cc=[bx+bw,by+bh,bz],dd=[bx,by+bh,bz],e=[bx,by,bz+bd],f=[bx+bw,by,bz+bd],g=[bx+bw,by+bh,bz+bd],hh=[bx,by+bh,bz+bd];poly3([a,b,f,e],shade(fill,.88),stroke);poly3([b,cc,g,f],shade(fill,.72),stroke);poly3([e,f,g,hh],shade(fill,.82),stroke);poly3([a,b,cc,dd],shade(fill,.72),stroke);poly3([dd,cc,g,hh],shade(fill,1.12),stroke);};
        rod=(a,b,color,width=6)=>{line3(a,b,color,width);const pa=project(...turn(a)),pb=project(...turn(b));circle(c,pa.x,pa.y,width/2,color);circle(c,pb.x,pb.y,width/2,color);};
        cylinder=(cx,cy,cz,r,len,color,axis="x")=>{for(let i=0;i<12;i++){const aa=i*Math.PI/6,bb=(i+1)*Math.PI/6;let p1,p2,p3,p4;if(axis==="x"){p1=[cx,cy+Math.cos(aa)*r,cz+Math.sin(aa)*r];p2=[cx,cy+Math.cos(bb)*r,cz+Math.sin(bb)*r];p3=[cx+len,cy+Math.cos(bb)*r,cz+Math.sin(bb)*r];p4=[cx+len,cy+Math.cos(aa)*r,cz+Math.sin(aa)*r];}else{p1=[cx+Math.cos(aa)*r,cy,cz+Math.sin(aa)*r];p2=[cx+Math.cos(bb)*r,cy,cz+Math.sin(bb)*r];p3=[cx+Math.cos(bb)*r,cy+len,cz+Math.sin(bb)*r];p4=[cx+Math.cos(aa)*r,cy+len,cz+Math.sin(aa)*r];}poly3([p1,p2,p3,p4],shade(color,.75+(i%3)*.12),color);}};
        const plate=(w=.42,d=.3)=>poly3([[x-w/2,y+.012,z-d/2],[x+w/2,y+.012,z-d/2],[x+w/2,y+.012,z+d/2],[x-w/2,y+.012,z+d/2]],"#0f172a55","#334155");
        plate(t.type==="ruler"?1.05:.55,t.type==="ruler"?.28:.34);
        if(t.type==="ruler"){
          box3(x-.5,y,z-.105,1,.045,.21,"#fef3c7",sel?"#ffffff":"#a16207");
          for(let i=0;i<=150;i++){const xx=x-.48+i*(.96/150),len=i%10===0?.105:i%5===0?.075:.045;line3([xx,y+.048,z-.095],[xx,y+.048,z-.095+len],"#713f12",i%10===0?1.6:1);}
          for(let i=0;i<=15;i++)label3(String(i),[x-.48+i*(.96/15),y+.085,z+.025],"#713f12",8);
          label3("15 cm · 1 mm/divisi",[x-.48,y+.18,z+.025],"#713f12",9);
        } else if(t.type==="caliper"){
          box3(x-.48,y,z-.1,.96,.06,.2,"#94a3b8",sel?"#ffffff":"#475569");box3(x-.47,y+.06,z-.08,.94,.025,.16,"#e2e8f0","#64748b");
          for(let i=0;i<=50;i++){const xx=x-.45+i*.018,len=i%10===0?.12:i%5===0?.085:.05;line3([xx,y+.09,z-.065],[xx,y+.09,z-.065+len],"#0f172a",i%10===0?1.5:1);}
          for(let i=0;i<=5;i++)label3(String(i),[x-.45+i*.18,y+.15,z+.05],"#0f172a",8);
          const jx=x-.42+s*.8;box3(jx,y+.07,z-.09,.035,.34,.18,"#2563eb","#dbeafe");box3(jx+.035,y+.07,z-.09,.035,.22,.18,"#3b82f6","#dbeafe");
          for(let i=0;i<=10;i++){const xx=jx-.06+i*.012;line3([xx,y+.105,z-.06],[xx,y+.105,z-.015],"#1d4ed8",1.2);}label3(`Bukaan ${(s*50).toFixed(1)} mm`,[x-.46,y+.46,z],"#1d4ed8",9);
        } else if(t.type==="micrometer"){
          rod([x-.23,y+.36,z],[x-.23,y-.04,z],"#64748b",12);rod([x-.23,y+.36,z],[x+.16,y+.36,z],"#64748b",12);rod([x-.23,y-.04,z],[x+.16,y-.04,z],"#64748b",12);rod([x+.11,y+.3,z],[x+.11,y+.04,z],"#cbd5e1",7);
          const sx=x+.11+s*.2;rod([x+.11,y+.18,z],[sx,y+.18,z],"#94a3b8",6);cylinder(sx,y+.04,z,.085,.14,"#2563eb","y");
          for(let i=0;i<25;i++){const yy=y+.055+i*.0045;line3([sx-.09,yy,z-.025],[sx-.075,yy,z-.025],"#dbeafe",1);}for(let i=0;i<50;i++){const ang=i*Math.PI*2/50;line3([sx+Math.cos(ang)*.085,y+.11,z+Math.sin(ang)*.085],[sx+Math.cos(ang)*.073,y+.11,z+Math.sin(ang)*.073],"#eff6ff",1);}
          label3(`Thimble ${Math.round(s*50)}/50`,[x-.3,y+.47,z],"#1d4ed8",9);
        } else if(t.type==="spring"){
          box3(x-.11,y,z-.08,.22,.07,.16,"#64748b");const top=y+.28+s*.25;rod([x,y+.07,z],[x,top,z],"#d1d5db",3);for(let i=0;i<12;i++){const ya=y+.09+(top-y-.09)*i/12,yb=y+.09+(top-y-.09)*(i+1)/12;line3([x+(i%2?-.045:.045),ya,z],[x+(i%2?.045:-.045),yb,z],"#059669",1.8);}box3(x-.065,top,z-.065,.13,.09,.13,"#10b981");for(let i=0;i<=10;i++)line3([x+.13,y+.08+i*.035,z],[x+.19,y+.08+i*.035,z],"#064e3b",i%5===0?2:1);label3(`${(s*10).toFixed(1)} N*`,[x-.25,y+.59,z],"#065f46",9);
        } else if(t.type==="balance"){
          box3(x-.2,y,z-.14,.4,.08,.28,"#334155");box3(x-.16,y+.08,z-.1,.32,.16,.2,"#0f766e");box3(x-.13,y+.13,z-.115,.26,.07,.025,"#cffafe");label3(`${(s*500).toFixed(1)} g`,[x-.14,y+.17,z-.085],"#0f172a",8);for(let i=0;i<5;i++)line3([x-.1+i*.05,y+.25,z-.1],[x-.1+i*.05,y+.28,z-.1],"#cbd5e1",1);
        } else if(t.type==="stopwatch"){
          cylinder(x-.04,y+.08,z,.13,.07,"#f59e0b","y");cylinder(x-.04,y+.15,z,.095,.025,"#fef3c7","y");for(let i=0;i<12;i++){const a=i*Math.PI/6;line3([x-.04+Math.cos(a)*.07,y+.18,z+Math.sin(a)*.07],[x-.04+Math.cos(a)*.085,y+.18,z+Math.sin(a)*.085],"#78350f",1.2);}rod([x-.04,y+.18,z],[x-.04+Math.cos(s*Math.PI*2)*.06,y+.18,z+Math.sin(s*Math.PI*2)*.06],"#dc2626",2);label3(`${(s*60).toFixed(2)} s*`,[x-.22,y+.35,z],"#92400e",9);
        } else if(t.type==="thermometer"){
          box3(x-.055,y,z-.06,.11,.45,.12,"#e2e8f0");cylinder(x,y-.02,z,.07,.09,"#ef4444","y");box3(x-.02,y+.05,z-.035,.04,.28*s,.07,"#ef4444");for(let i=0;i<=10;i++)line3([x+.07,y+.06+i*.033,z],[x+.11,y+.06+i*.033,z],"#475569",i%5===0?1.6:1);label3(`${(-10+s*120).toFixed(1)} °C*`,[x-.2,y+.52,z],"#be123c",9);
        } else if(t.type==="cylinder"||t.type==="beaker"){
          const h=t.type==="cylinder"?.48:.34,w=t.type==="cylinder"?.13:.22;box3(x-w,y,z-w,.06,h,.06,"#bae6fd","#0284c7");box3(x+w-.06,y,z-w,.06,h,.06,"#bae6fd","#0284c7");box3(x-w,y,z-w,.12,.05,w*2,"#7dd3fc","#0284c7");box3(x-w,y+h*s,z-w,.12,.025,w*2,"#38bdf8","#0284c7");for(let i=1;i<=10;i++)line3([x+w,y+h*i/11,z-w],[x+w+.07,y+h*i/11,z-w],"#0369a1",i%5===0?1.5:1);label3(`${(s*(t.type==="cylinder"?100:500)).toFixed(0)} mL*`,[x-.2,y+h+.1,z],"#075985",9);
        } else if(t.type==="pendulum"){
          box3(x-.18,y+.45,z-.08,.36,.06,.16,"#64748b");const ang=(s-.5)*1.1,px=x+Math.sin(ang)*.34,py=y+.45-Math.cos(ang)*.34;rod([x,y+.45,z],[px,py,z],"#475569",2);cylinder(px,py-.035,z,.065,.07,"#a78bfa","y");label3(`Sudut ${(ang*180/Math.PI).toFixed(1)}°`,[x-.25,y+.63,z],"#5b21b6",9);
        } else if(t.type==="cart"){
          box3(x-.23,y+.07,z-.11,.46,.17,.22,"#f97316",sel?"#fff":"#9a3412");cylinder(x-.14,y+.02,z-.09,.045,.05,"#334155","y");cylinder(x+.14,y+.02,z-.09,.045,.05,"#334155","y");rod([x-.3,y,z+.15],[x+.3,y,z+.15],"#64748b",3);label3(`Posisi ${(s*100).toFixed(0)} cm*`,[x-.24,y+.34,z],"#9a3412",9);
        } else if(t.type==="pulley"){
          rod([x,y+.35,z],[x,y+.15,z],"#64748b",5);cylinder(x-.08,y+.06,z,.12,.08,"#94a3b8","y");line3([x-.08,y+.06,z],[x-.08,y-.25,z],"#334155",2);box3(x-.14,y-.36,z-.07,.12,.12,.14,"#f59e0b");label3("KATROL",[x-.2,y+.49,z],"#334155",9);
        } else if(t.type==="battery"){
          box3(x-.22,y,z-.12,.44,.25,.24,"#fbbf24",sel?"#fff":"#92400e");box3(x-.08,y+.25,z-.07,.16,.04,.14,"#cbd5e1");label3("DC + / −",[x-.2,y+.35,z],"#78350f",9);line3([x-.12,y+.13,z+.13],[x-.12,y+.13,z+.28],"#dc2626",2);line3([x+.12,y+.13,z+.13],[x+.12,y+.13,z+.28],"#2563eb",2);
        } else if(t.type==="resistor"){
          rod([x-.22,y+.12,z],[x+.22,y+.12,z],"#cbd5e1",3);box3(x-.13,y+.06,z-.07,.26,.12,.14,"#d6a56d");for(let i=0;i<4;i++)box3(x-.09+i*.055,y+.06,z-.075,.025,.12,.15,["#7c2d12","#dc2626","#ca8a04","#1f2937"][i]);label3("RESISTOR",[x-.2,y+.29,z],"#78350f",9);
        } else if(t.type==="ammeter"||t.type==="voltmeter"){
          cylinder(x,y+.07,z,.16,.12,t.type==="ammeter"?"#f87171":"#60a5fa","y");cylinder(x,y+.2,z,.12,.02,"#fef2f2","y");label3(t.type==="ammeter"?`A ${(s*5).toFixed(2)}*`:`V ${(s*12).toFixed(2)}*`,[x-.11,y+.23,z],"#0f172a",9);rod([x-.1,y+.08,z+.12],[x-.23,y+.08,z+.23],"#dc2626",2);rod([x+.1,y+.08,z+.12],[x+.23,y+.08,z+.23],"#2563eb",2);
        } else if(t.type==="magnet"){
          box3(x-.25,y+.05,z-.09,.25,.16,.18,"#ef4444");box3(x,y+.05,z-.09,.25,.16,.18,"#2563eb");label3("N",[x-.18,y+.13,z+.02],"#fff",10);label3("S",[x+.07,y+.13,z+.02],"#fff",10);for(let i=0;i<3;i++)line3([x-.18,y+.28+i*.035,z],[x+.18,y+.28+i*.035,z],"#8b5cf6",1);
        } else if(t.type==="lens"){
          poly3([[x-.04,y,z-.18],[x+.04,y,z-.18],[x+.09,y+.28,z-.18],[x+.04,y+.48,z-.18],[x-.04,y+.48,z-.18],[x-.09,y+.28,z-.18]],"#a5f3fc","#0891b2");line3([x,y+.02,z-.17],[x,y+.46,z-.17],"#ecfeff",2);label3(`Lensa · posisi ${(s*10).toFixed(1)} cm*`,[x-.3,y+.57,z],"#155e75",9);
        } else if(t.type==="mirror"){
          box3(x-.04,y,z-.16,.08,.48,.32,"#cbd5e1",sel?"#fff":"#475569");line3([x+.05,y+.03,z-.13],[x+.05,y+.45,z+.13],"#f8fafc",2);label3("CERMIN",[x-.2,y+.56,z],"#334155",9);
        } else if(t.type==="prism"){
          poly3([[x-.2,y,z-.14],[x+.2,y,z-.14],[x,y+.35,z-.14]],"#ddd6fe","#7c3aed");line3([x-.28,y+.1,z-.15],[x+.28,y+.1,z-.15],"#f59e0b",2);line3([x,y+.1,z-.14],[x+.26,y+.28,z-.14],"#22c55e",2);line3([x,y+.1,z-.14],[x+.32,y+.1,z-.14],"#3b82f6",2);label3("PRISMA",[x-.2,y+.45,z],"#5b21b6",9);
        } else if(t.type==="solar"){
          box3(x-.28,y,z-.2,.56,.07,.4,"#1e3a8a","#93c5fd");for(let i=1;i<5;i++)line3([x-.28+i*.112,y+.075,z-.2],[x-.28+i*.112,y+.075,z+.2],"#bfdbfe",1.5);for(let i=1;i<3;i++)line3([x-.28,y+.075,z-.2+i*.133],[x+.28,y+.075,z-.2+i*.133],"#bfdbfe",1.5);rod([x-.18,y,z+.2],[x-.25,y-.16,z+.2],"#64748b",3);rod([x+.18,y,z+.2],[x+.25,y-.16,z+.2],"#64748b",3);label3("PV · PANEL SURYA",[x-.32,y+.22,z],"#1d4ed8",9);
        } else if(t.type==="lamp"||t.type==="heater"||t.type==="laser"){
          box3(x-.13,y,z-.13,.26,.18,.26,t.type==="heater"?"#64748b":"#334155");rod([x,y+.16,z],[x,y+.42,z],"#64748b",5);if(t.type==="laser"){box3(x-.1,y+.38,z-.1,.2,.1,.2,"#991b1b");rod([x,y+.43,z],[x+.55,y+.43,z],"#ef4444",4);label3("LASER LOW POWER",[x-.35,y+.58,z],"#b91c1c",8);}else{poly3([[x-.13,y+.38,z],[x+.13,y+.38,z],[x+.1,y+.58,z],[x-.1,y+.58,z]],t.type==="heater"?"#f97316":"#fef3c7","#d97706");for(let k=0;k<4;k++)line3([x-.22+k*.14,y+.62,z],[x-.25+k*.14,y+.72,z],"#f59e0b",2);label3(t.type==="heater"?"PEMANAS":"SUMBER CAHAYA",[x-.3,y+.8,z],"#92400e",8);}
        } else if(t.type==="screen"){
          box3(x-.035,y,z-.23,.07,.62,.46,"#f8fafc","#94a3b8");rod([x-.12,y,z],[x-.12,y-.18,z],"#64748b",3);rod([x+.12,y,z],[x+.12,y-.18,z],"#64748b",3);label3("LAYAR",[x-.14,y+.72,z],"#334155",9);
        } else if(t.type==="pressure"){
          box3(x-.13,y,z-.1,.26,.22,.2,"#0e7490","#bae6fd");cylinder(x,y+.22,z,.07,.12,"#38bdf8","y");rod([x,y+.32,z],[x,y+.52,z],"#0e7490",3);label3("SENSOR P",[x-.2,y+.62,z],"#075985",9);
        } else if(t.type==="tuning"){
          box3(x-.12,y,z-.06,.24,.07,.12,"#64748b");rod([x-.07,y+.06,z],[x-.07,y+.48,z],"#94a3b8",5);rod([x+.07,y+.06,z],[x+.07,y+.48,z],"#94a3b8",5);rod([x-.07,y+.06,z],[x+.07,y+.06,z],"#94a3b8",5);label3("GARPU TALA",[x-.25,y+.6,z],"#334155",8);
        } else if(t.type==="speaker"||t.type==="microphone"){
          box3(x-.16,y,z-.13,.32,.28,.26,t.type==="speaker"?"#334155":"#64748b");circle(c,project(x,y+.15,z+.14).x,project(x,y+.15,z+.14).y,.08,t.type==="speaker"?"#0f172a":"#cbd5e1");if(t.type==="microphone")rod([x,y+.28,z],[x,y+.52,z],"#94a3b8",5);label3(t.type==="speaker"?"SPEAKER":"MIKROFON",[x-.25,y+.62,z],"#334155",8);
        } else if(t.type==="coil"){
          box3(x-.2,y,z-.12,.4,.05,.24,"#64748b");for(let k=0;k<7;k++){const xx=x-.16+k*.053;cylinder(xx,y+.06,z,.055,.055,"#d97706","y");}rod([x-.18,y+.12,z],[x-.3,y+.22,z],"#b45309",2);rod([x+.18,y+.12,z],[x+.3,y+.22,z],"#b45309",2);label3("KUMPARAN",[x-.25,y+.35,z],"#92400e",9);
        } else if(t.type==="electroscope"){
          box3(x-.16,y,z-.12,.32,.06,.24,"#64748b");rod([x,y+.06,z],[x,y+.48,z],"#eab308",3);circle(c,project(x,y+.53,z).x,project(x,y+.53,z).y,8,"#eab308");rod([x,y+.45,z],[x-.1,y+.22,z],"#eab308",2);rod([x,y+.45,z],[x+.1,y+.22,z],"#eab308",2);label3("ELEKTROSKOP",[x-.3,y+.65,z],"#854d0e",8);
        } else if(t.type==="switch"){
          box3(x-.2,y,z-.1,.4,.06,.2,"#475569");rod([x-.12,y+.07,z],[x+.12,y+.18+(s*.08),z],"#cbd5e1",5);circle(c,project(x-.12,y+.07,z).x,project(x-.12,y+.07,z).y,4,"#f8fafc");circle(c,project(x+.12,y+.07,z).x,project(x+.12,y+.07,z).y,4,"#f8fafc");label3("SAKELAR",[x-.2,y+.32,z],"#334155",8);
        } else if(t.type==="led"){
          cylinder(x-.05,y,z,.055,.12,"#dc2626","y");poly3([[x-.09,y+.12,z-.07],[x+.09,y+.12,z-.07],[x+.09,y+.12,z+.07],[x-.09,y+.12,z+.07]],"#fecaca","#991b1b");label3("LED",[x-.1,y+.3,z],"#991b1b",9);
        } else if(t.type==="source"||t.type==="detector"||t.type==="oscilloscope"){
          box3(x-.23,y,z-.16,.46,.3,.32,t.type==="source"?"#475569":t.type==="detector"?"#0f766e":"#166534","#cbd5e1");box3(x-.16,y+.2,z-.17,.32,.07,.025,"#0f172a","#94a3b8");if(t.type==="oscilloscope"){for(let q=0;q<5;q++)line3([x-.13+q*.065,y+.235,z-.135],[x-.13+q*.065,y+.235+Math.sin(q*1.4)*.035,z-.135],"#4ade80",2);}label3(t.type==="source"?"SUMBER":t.type==="detector"?"DETEKTOR":"OSILOSKOP",[x-.28,y+.42,z],"#166534",8);
        } else if(t.type==="insulation"){
          box3(x-.2,y,z-.17,.4,.36,.34,"#bae6fd","#0284c7");box3(x-.15,y+.08,z-.12,.3,.22,.24,"#dbeafe","#38bdf8");label3("ISOLATOR",[x-.22,y+.48,z],"#075985",9);
        } else if(t.type==="compass"){
          cylinder(x,y,z,.16,.08,"#dc2626","y");line3([x-.1,y+.09,z],[x+.1,y+.09,z],"#1d4ed8",3);label3("KOMPAS",[x-.18,y+.25,z],"#991b1b",8);
        }
        if((t.angle||0)!==0)line3([x,y+.76,z],[x+Math.sin(t.angle)*.16,y+.76,z+Math.cos(t.angle)*.16],"#7c3aed",3);label3(def.name,[x-.28,y+.72,z],"#0f172a",9);if(def.size)label3(def.size,[x-.28,y+.84,z],"#334155",7);
        if(sel){const p=project(x,y+.35,z);if(p.visible){c.strokeStyle="#22d3ee";c.lineWidth=2;c.beginPath();c.arc(p.x,p.y,18,0,Math.PI*2);c.stroke();}}
        poly3=rawPoly3;line3=rawLine3;box3=rawBox3;rod=rawRod;cylinder=rawCylinder;
      });
      placedTools.forEach(a=>{if(a.link){const b=placedTools.find(t=>t.id===a.link);if(b)rawRod([a.x,.35,a.z],[b.x,.35,b.z],"#22d3ee",3);}});
    }

    function cameraDepth(p){const dx=p[0]-camera.x,dz=p[2]-camera.z;return -(dx*Math.sin(camera.yaw)+dz*Math.cos(camera.yaw));}
    function project(x,y,z){
      const dx=x-camera.x,dy=y-camera.y,dz=z-camera.z,cy=Math.cos(camera.yaw),sy=Math.sin(camera.yaw);
      const right=dx*cy-dz*sy;
      const depth=-(dx*sy+dz*cy);
      const vertical=dy*Math.cos(camera.pitch)+depth*Math.sin(camera.pitch);
      const focal=410,scale=focal/Math.max(.08,depth);
      return{x:W*.5+right*scale,y:H*.49-vertical*scale,depth,visible:depth>.08};
    }
    function clipSegment(a,b){const near=.09,da=cameraDepth(a),db=cameraDepth(b);if(da<=near&&db<=near)return null;if(da<=near||db<=near){const t=(near-da)/(db-da),p=a.map((v,i)=>v+(b[i]-v)*t);if(da<=near)a=p;else b=p;}return[a,b];}
    function line3(a,b,color="#64748b",width=2){const seg=clipSegment(a.slice(),b.slice());if(!seg)return;const p=project(...seg[0]),q=project(...seg[1]);line(c,p.x,p.y,q.x,q.y,color,width);}
    function poly3(points,fill,stroke="#64748b"){
      const near=.09,clipped=[];for(let i=0;i<points.length;i++){const cur=points[i],prev=points[(i+points.length-1)%points.length],dc=cameraDepth(cur),dp=cameraDepth(prev),ci=dc>near,pi=dp>near;if(ci!==pi){const t=(near-dp)/(dc-dp);clipped.push(prev.map((v,j)=>v+(cur[j]-v)*t));}if(ci)clipped.push(cur);}if(clipped.length<3)return;
      const ps=clipped.map(p=>project(...p));c.beginPath();c.moveTo(ps[0].x,ps[0].y);ps.slice(1).forEach(p=>c.lineTo(p.x,p.y));c.closePath();c.fillStyle=fill;c.fill();c.strokeStyle=stroke;c.lineWidth=1.5;c.stroke();
    }
    function box3(x,y,z,w,h,d,fill,stroke="#64748b"){
      const a=[x,y,z],b=[x+w,y,z],cc=[x+w,y+h,z],dd=[x,y+h,z],e=[x,y,z+d],f=[x+w,y,z+d],g=[x+w,y+h,z+d],hh=[x,y+h,z+d];
      poly3([a,b,f,e],shade(fill,.88),stroke);poly3([b,cc,g,f],shade(fill,.72),stroke);poly3([e,f,g,hh],shade(fill,.82),stroke);poly3([a,b,cc,dd],shade(fill,.72),stroke);poly3([dd,cc,g,hh],shade(fill,1.12),stroke);
    }
    function shade(hex,f){const m=/^#([0-9a-f]{6})$/i.exec(hex);if(!m)return hex;const n=parseInt(m[1],16),r=clamp(Math.round(((n>>16)&255)*f),0,255),g=clamp(Math.round(((n>>8)&255)*f),0,255),b=clamp(Math.round((n&255)*f),0,255);return `rgb(${r},${g},${b})`;}
    function rod(a,b,color,width=6){line3(a,b,color,width);const p=project(...a),q=project(...b);circle(c,p.x,p.y,width/2,color);circle(c,q.x,q.y,width/2,color);}
    function label3(s,at,color="#20304a",size=15){const p=project(...at);text(c,s,p.x,p.y,color,`600 ${size}px sans-serif`);}
    function cylinder(x,y,z,r,len,color,axis="x") {for(let i=0;i<12;i++){const a=i*Math.PI/6,b=(i+1)*Math.PI/6;let p1,p2,p3,p4;if(axis==="x"){p1=[x,y+Math.cos(a)*r,z+Math.sin(a)*r];p2=[x,y+Math.cos(b)*r,z+Math.sin(b)*r];p3=[x+len,y+Math.cos(b)*r,z+Math.sin(b)*r];p4=[x+len,y+Math.cos(a)*r,z+Math.sin(a)*r];}else{p1=[x+Math.cos(a)*r,y,z+Math.sin(a)*r];p2=[x+Math.cos(b)*r,y,z+Math.sin(b)*r];p3=[x+Math.cos(b)*r,y+len,z+Math.sin(b)*r];p4=[x+Math.cos(a)*r,y+len,z+Math.sin(a)*r];}poly3([p1,p2,p3,p4],shade(color,.75+(i%3)*.12),color);} }
    function drawInstrument3D(){
      const model=config.model,value=Number(input?.value??config.default),ratio=clamp((value-Number(config.min))/(Number(config.max)-Number(config.min)||1),0,1),aux=Number(auxValue||1);
      const x0=-1.65,y0=.04,z0=-.25;
      if(model==="pengukuran"){
        if(measurementInstrument==="caliper"){
          box3(-1.9,.12,-.45,3.8,.12,.35,"#64748b");box3(-1.85,.24,-.42,3.65,.035,.28,"#dbeafe");
          for(let i=0;i<=36;i++){const x=-1.8+i*.1;line3([x,.28,-.42],[x,.28,i%5===0?-.18:-.31],"#334155",i%5===0?2:1);if(i%10===0)label3(String(i/10),[x,.32,-.15],"#334155",10);}
          const jaw=-1.65+ratio*2.9;box3(jaw,.23,-.4,.13,.5,.3,"#3b82f6");box3(jaw+.02,.63,-.4,.09,.18,.3,"#2563eb");box3(-1.75,.23,-.4,.13,.5,.3,"#94a3b8");box3(-1.73,.63,-.4,.09,.18,.3,"#64748b");box3(-.8,.34,-.24,Math.max(.25,ratio*1.45),.18,.18,"#f59e0b");label3("JANGKA SORONG",[-1.55,1.02,-.1],"#1d4ed8",17);label3(`Objek: ${fmt(value)} cm · resolusi ${fmt(aux)} mm`,[-1.55,.02,.1],"#334155",12);
        } else if(measurementInstrument==="micrometer"){
          // U-frame, anvil, spindle, thimble and ratchet
          rod([-1.45,.55,-.25],[-1.45,-.55,-.25],"#64748b",20);rod([-1.45,.55,-.25],[-.25,.55,-.25],"#64748b",20);rod([-1.45,-.55,-.25],[-.25,-.55,-.25],"#64748b",20);rod([-.25,.55,-.25],[-.25,.2,-.25],"#94a3b8",12);rod([-.25,-.55,-.25],[-.25,-.18,-.25],"#94a3b8",12);rod([-.2,0,-.25],[.35,0,-.25],"#cbd5e1",11);cylinder(.28,-.12,-.25,.24,.55,"#2563eb","y");cylinder(.28,.42,-.25,.14,.25,"#64748b","y");
          for(let i=0;i<12;i++){const yy=-.1+i*.045;line3([.05,yy,-.35],[.18,yy,-.35],"#1e3a8a",1.5);}box3(-.92,-.2,-.12,Math.max(.15,ratio*.6),.4,.2,"#f59e0b");label3("MIKROMETER SEKRUP",[-1.5,1.02,-.1],"#1d4ed8",17);label3(`Ketebalan: ${fmt(value)} cm · resolusi ${fmt(aux)} mm`,[-1.55,-.8,.1],"#334155",12);
        } else {
          // Three-arm balance with three sliders, pans, pointer and base
          box3(-1.55,-.55,-.3,3.1,.18,.75,"#64748b");rod([0,-.37,0],[0,.65,0],"#64748b",9);rod([-1.45,.45,0],[1.45,.45,0],"#d97706",10);
          for(let i=0;i<3;i++){const x=-1.25+i*.9;rod([x,.43,0],[x,.15,0],"#b45309",4);box3(x-.12,.08,-.1,.24,.18,.2,["#3b82f6","#10b981","#f59e0b"][i]);for(let j=0;j<=10;j++)line3([x-.25+j*.05,.49,0],[x-.25+j*.05,j%5===0?.58:.53,0],"#334155",1);}
          rod([-1.05,-.35,0],[-1.05,-.1,0],"#64748b",3);rod([1.05,-.35,0],[1.05,-.1,0],"#64748b",3);rod([-1.4,-.1,0],[-.7,-.1,0],"#94a3b8",4);rod([.7,-.1,0],[1.4,-.1,0],"#94a3b8",4);poly3([[-1.45,-.1,-.05],[-.65,-.1,-.05],[-.78,-.18,-.05],[-1.32,-.18,-.05]],"#cbd5e1");poly3([[.65,-.1,-.05],[1.45,-.1,-.05],[1.32,-.18,-.05],[.78,-.18,-.05]],"#cbd5e1");rod([0,.45,0],[.45,.65,0],"#dc2626",4);label3("NERACA MASSA TIGA LENGAN",[-1.55,1.02,-.1],"#1d4ed8",17);label3(`Massa benda: ${fmt(value)} g · ketelitian ${fmt(aux)} g`,[-1.55,-.8,.1],"#334155",12);
        }
        return;
      }
      // Topic-specific lab apparatus in a common 3D laboratory space.
      if(model==="energi"){cylinder(-1.25,.22,-.15,.35,.45,"#f59e0b","y");box3(-.5,.1,-.2,1.5,.12,.9,"#1d4ed8");for(let i=0;i<4;i++)line3([-.45+i*.35,.23,-.2],[-.45+i*.35,.23,.7],"#93c5fd",2);rod([.4,.1,.25],[.4,-.55,.25],"#64748b",5);box3(.1,-.65,.1,.7,.2,.5,"#e2e8f0");label3("PANEL SURYA",[-.8,.85,0]);}
      else if(model==="pemanasan"){box3(-1.1,.05,-.5,2.2,.9,1,"#bfdbfe");box3(-.95,.15,-.35,1.9,.65,.7,"#fef3c7");cylinder(.8,.25,0,.1,.55,"#dc2626","y");label3("RUANG UJI SUHU",[-1,.95,0]);}
      else if(model==="kinematika"){rod([-1.7,.18,0],[1.7,.18,0],"#64748b",8);box3(-.7,.22,-.25,.65,.35,.5,"#3b82f6");for(let i=0;i<7;i++)line3([-1.6+i*.5,.23,.08],[-1.6+i*.5,.35,.08],"#334155",1);label3("REL GERAK + KERETA",[-1.4,.85,0]);}
      else if(model==="fluida"){box3(-.8,.1,-.5,1.4,1.2,1,"#bfdbfe");box3(-.7,.2,-.4,1.2,.85,.8,"#38bdf8");rod([.2,.95,.15],[.2,.2,.15],"#dc2626",4);cylinder(.2,.35,.15,.09,.18,"#f8fafc","y");label3("TANGKI + SENSOR TEKANAN",[-1.45,1.45,0]);}
      else if(model==="termodinamika"){cylinder(-.35,.1,0,.48,1.1,"#94a3b8","y");rod([-.35,1.05,0],[-.35,.45,0],"#64748b",8);cylinder(-.35,.08,0,.42,.12,"#ef4444","y");for(let i=0;i<5;i++)line3([-.8+i*.2,-.1,.4],[-.8+i*.2,.1,.4],"#f97316",3);label3("SILINDER GAS + PEMANAS",[-1.45,1.55,0]);}
      else if(model==="bunyi"){box3(-1.35,.15,-.3,.48,.65,.55,"#64748b");cylinder(-1.12,.4,-.1,.2,.12,"#334155","y");for(let i=0;i<4;i++){const r=.35+i*.16;line3([-0.7,.45-r,-.1],[-.7,.45+r,-.1],"#8b5cf6",2);}box3(.9,.2,-.2,.28,.55,.35,"#10b981");label3("SPEAKER → MIKROFON",[-1.45,1.05,0]);}
      else if(model==="cahaya"||model==="optik"){box3(-1.5,.2,-.2,.28,.45,.35,"#ef4444");rod([-1.15,.4,0],[1.2,.4,0],"#f59e0b",3);box3(-.15,.05,-.25,.12,.85,.5,"#bfdbfe");box3(1.1,.15,-.3,.1,.55,.6,"#64748b");label3("SUMBER · LENSA/ CELAH · LAYAR",[-1.5,1.05,0]);}
      else if(model==="dinamika"){rod([-1.6,.15,0],[1.6,.15,0],"#64748b",8);box3(-.45,.2,-.25,.65,.45,.5,"#f59e0b");rod([-.1,.42,0],[1.1,.42,0],"#dc2626",4);label3("KERETA + DINAMOMETER",[-1.35,.95,0]);}
      else if(model==="listrikdinamis"||model==="ac"){box3(-1.4,.12,-.25,.45,.55,.5,"#64748b");box3(-.1,.2,-.2,.5,.28,.4,"#f59e0b");box3(.9,.2,-.2,.3,.45,.4,"#10b981");rod([-1,.35,0],[-.1,.35,0],"#dc2626",4);rod([.4,.35,0],[.9,.35,0],"#2563eb",4);rod([1.2,.35,0],[1.2,-.15,0],"#2563eb",4);rod([1.2,-.15,0],[-1,-.15,0],"#dc2626",4);label3("SUMBER · RESISTOR · AMPEREMETER",[-1.55,1.05,0]);}
      else if(model==="listrikstatis"){cylinder(-.7,.35,0,.22,.25,"#ef4444","y");cylinder(.7,.35,0,.22,.25,"#2563eb","y");for(let i=0;i<5;i++){const yy=-.1+i*.2;line3([-.45,yy,0],[.45,yy,0],"#8b5cf6",2);}label3("DUA MUATAN + GARIS MEDAN",[-1.45,1.05,0]);}
      else if(model==="magnet"||model==="induksi"){rod([-.85,.3,0],[.85,.3,0],"#d97706",9);for(let i=0;i<6;i++){const x=-.65+i*.26;line3([x,.12,-.2],[x,.48,.2],"#0f766e",2);}if(model==="induksi")box3(-.18,.1,-.35,.36,.45,.7,"#f59e0b");label3(model==="induksi"?"MAGNET + KUMPARAN":"KAWAT BERARUS + MEDAN",[-1.4,1.05,0]);}
      else if(model==="digital"){for(let i=0;i<6;i++){box3(-1.4+i*.48,.15,-.2,.38,.4,.4,i%2?"#64748b":"#10b981");label3(i%2?"0":"1",[-1.3+i*.48,.35,.23],"#ffffff",13);}label3("PANEL LOGIKA BINER",[-1.3,1.05,0]);}
      else if(model==="debroglie"||model==="relativitas"||model==="inti"||model==="radioaktivitas"){for(let i=0;i<7;i++){const x=-1.2+i*.4;rod([x,.15,0],[x+.18,.15+Math.sin(i+Number(input.value))*.28,0],model==="radioaktivitas"?"#10b981":"#8b5cf6",3);}cylinder(0,.4,0,.32,.22,model==="inti"?"#ef4444":"#8b5cf6","y");label3(model==="inti"?"MODEL INTI ATOM":model==="radioaktivitas"?"SUMBER RADIOAKTIF (MODEL)":"PARTIKEL + JEJAK",[-1.35,1.05,0]);}
      else {box3(-.6,.12,-.25,1.2,.6,.5,"#3b82f6");label3(config.title||"ALAT PRAKTIKUM",[-1.3,1.05,0]);}
    }
    drawLab3D=function(){
      c.clearRect(0,0,W,H);const bg=c.createLinearGradient(0,0,0,H);bg.addColorStop(0,"#cbd8e8");bg.addColorStop(.48,"#e7edf5");bg.addColorStop(1,"#9aaabd");c.fillStyle=bg;c.fillRect(0,0,W,H);
      // Dinding dan lantai ruang lab, garis perspektif, lampu plafon, jendela dan meja.
      poly3([[-3,1.5,-2.2],[3,1.5,-2.2],[3,-.2,-2.2],[-3,-.2,-2.2]],"#d8e2ee","#aab8c8");
      poly3([[-3,1.5,2.3],[-3,1.5,-2.2],[-3,-.2,-2.2],[-3,-.2,2.3]],"#c6d5e5","#9eafc2");
      poly3([[3,1.5,-2.2],[3,1.5,2.3],[3,-.2,2.3],[3,-.2,-2.2]],"#c0cfdf","#9eafc2");
      poly3([[-3,-.2,-2.2],[3,-.2,-2.2],[3,-.2,2.3],[-3,-.2,2.3]],"#9aaabd","#7c8da2");
      poly3([[-3,1.5,-2.2],[3,1.5,-2.2],[3,1.5,2.3],[-3,1.5,2.3]],"#eef3f8","#c3cfdb");
      for(let i=-3;i<=3;i+=.5){line3([i,-.19,-2.2],[i,-.19,2.3],"#8293a8",.8);line3([-3,-.19,i*.7],[3,-.19,i*.7],"#8293a8",.8);}
      // Jendela, lemari penyimpanan, dan panel instruksi laboratorium.
      box3(-2.55,.25,-2.05,.9,.85,.05,"#7dd3fc");line3([-2.1,.25,-2.04],[-2.1,1.1,-2.04],"#f8fafc",5);line3([-2.55,.68,-2.04],[-1.65,.68,-2.04],"#f8fafc",5);
      box3(1.65,.15,-2.05,1.0,.8,.12,"#64748b");box3(1.75,.6,-1.9,.8,.08,.08,"#334155");box3(1.75,.35,-1.9,.8,.08,.08,"#334155");
      box3(-.65,.55,-2.02,1.25,.55,.08,"#0f2744");label3("PHYSICS LAB",[-.52,.92,-1.92],"#f8fafc",11);label3("VIRTUAL PRACTICUM",[-.53,.75,-1.92],"#7dd3fc",8);
      // Meja kerja dengan permukaan laminasi, bibir tepi, kaki logam, dan kisi skala.
      box3(-2.25,-.08,-.65,4.5,.18,1.65,"#475569");box3(-2.25,.10,-.65,4.5,.045,1.65,"#dbe4ed");
      box3(-2.1,-.85,-.5,.14,.8,.14,"#64748b");box3(1.95,-.85,-.5,.14,.8,.14,"#64748b");box3(-2.1,-.85,.78,.14,.8,.14,"#64748b");box3(1.95,-.85,.78,.14,.8,.14,"#64748b");
      for(let gx=-2;gx<=2.001;gx+=.25)line3([gx,.151,-.58],[gx,.151,.92],gx%1===0?"#94a3b8":"#c1ccd8",gx%1===0?1.2:.55);
      for(let gz=-.5;gz<=.901;gz+=.25)line3([-2.18,.151,gz],[2.18,.151,gz],gz%1===0?"#94a3b8":"#c1ccd8",gz%1===0?1.2:.55);
      // Lampu plafon dan pencahayaan area kerja.
      box3(-.65,1.43,-1.9,1.3,.06,.35,"#fff7cc");
      drawPlacedTools();
      drawReactionEffects();
      // floating lab readout panel
      box3(1.18,.8,.45,1.0,.5,.08,"#0f172a");label3("PHYS LAB",[1.27,1.13,.55],"#ffffff",11);label3(`${fmt(Number(input?.value??config.default))} ${config.param_unit||""}`,[1.28,.94,.55],"#67e8f9",13);
      // HUD bergaya simulator, dengan retikel di tengah layar.
      c.fillStyle="rgba(8,15,30,.78)";c.fillRect(18,18,300,58);text(c,"PHYSLAB · MODE ORANG PERTAMA",30,40,"#f8fafc","bold 15px sans-serif");text(c,`X ${camera.x.toFixed(1)} · Z ${camera.z.toFixed(1)} · ${fmt(Number(input?.value??config.default))} ${config.param_unit||""}`,30,61,"#7dd3fc","13px sans-serif");
      c.strokeStyle="rgba(255,255,255,.9)";c.lineWidth=2;c.beginPath();c.moveTo(W/2-9,H/2);c.lineTo(W/2+9,H/2);c.moveTo(W/2,H/2-9);c.lineTo(W/2,H/2+9);c.stroke();
      if(note)note.textContent=`Kamu berada di dalam ruang praktikum ${config.title||""}. Peralatan awal sudah disusun sesuai topik. Gunakan WASD untuk berjalan, seret mouse untuk melihat, klik alat untuk memilih, dan seret bagian alat untuk memindahkan atau mengoperasikannya.`;
    };
    function point(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height};}
    canvas.addEventListener("pointerdown",e=>{canvas.focus({preventScroll:true});const p=point(e);const hit=[...placedTools].reverse().find(t=>{const q=project(t.x,.32,t.z);return q.visible&&Math.hypot(q.x-p.x,q.y-p.y)<Math.max(30,42/q.depth);});
      const operable=[...placedTools].reverse().find(t=>{if(!["caliper","micrometer","spring","balance","stopwatch","thermometer","cylinder","beaker","pendulum","cart","lens","solar","lamp","heater","pressure","tuning","speaker","microphone","laser","coil","switch","led","source","detector","oscilloscope","insulation","compass","electroscope"].includes(t.type))return false;const ox=t.type==="caliper"?-.42+t.setting*.8:t.type==="micrometer"?.11+t.setting*.2:0;const oy=t.type==="spring"?.45:t.type==="pendulum"?.25:t.type==="thermometer"?.25:t.type==="cylinder"||t.type==="beaker"?.3:.25;const q=project(t.x+ox,oy,t.z);return q.visible&&Math.hypot(q.x-p.x,q.y-p.y)<Math.max(25,35/q.depth);});
      toolDragMoved=false;toolDragStart=null;
      if(operable){selectedTool=operable.id;drag="operate";toolDragStart={id:operable.id,screenX:e.clientX,screenY:e.clientY,setting:operable.setting};}
      else if(hit){selectedTool=hit.id;drag="tool";toolDragStart={id:hit.id,x:hit.x,z:hit.z,screenX:e.clientX,screenY:e.clientY};}
      else drag=(e.shiftKey&&p.x>W*.25&&p.x<W*.75&&p.y>H*.2&&p.y<H*.88)?"instrument":"look";
      lx=e.clientX;ly=e.clientY;canvas.setPointerCapture(e.pointerId);canvas.style.cursor=drag==="look"?"grabbing":drag==="tool"?"move":"ew-resize";drawLab3D();});
    canvas.addEventListener("pointermove",e=>{if(!drag)return;const dx=e.clientX-lx,dy=e.clientY-ly;lx=e.clientX;ly=e.clientY;if(drag==="look"){camera.yaw+=dx*.006;camera.pitch=clamp(camera.pitch-dy*.004,-.75,.45);drawLab3D();}else if(drag==="tool"&&toolDragStart){if(Math.abs(e.clientX-toolDragStart.screenX)+Math.abs(e.clientY-toolDragStart.screenY)>3)toolDragMoved=true;const t=placedTools.find(v=>v.id===toolDragStart.id);if(t){const scale=2.8/Math.max(300,canvas.getBoundingClientRect().width);t.x=clamp(t.x+dx*scale,-1.9,1.9);t.z=clamp(t.z+dy*scale,-.45,1.15);drawLab3D();}}else if(drag==="operate"&&toolDragStart){const t=placedTools.find(v=>v.id===toolDragStart.id);if(t){toolDragMoved=true;t.setting=clamp(toolDragStart.setting+(e.clientX-toolDragStart.screenX)/Math.max(180,canvas.getBoundingClientRect().width)*2.2,0,1);const lo=Number(config.min),hi=Number(config.max),step=Number(config.step)||0;let v=lo+t.setting*(hi-lo);if(step>0)v=lo+Math.round((v-lo)/step)*step;input.value=String(Number(v.toPrecision(8)));if(slider)slider.value=input.value;if(sliderValue)sliderValue.textContent=input.value+" "+(config.param_unit||"");drawLab();drawLab3D();}}else{const lo=Number(config.min),hi=Number(config.max),step=Number(config.step)||0;let v=Number(input.value)+(dx/Math.max(200,canvas.getBoundingClientRect().width))*(hi-lo)*1.7;v=clamp(v,lo,hi);if(step>0)v=lo+Math.round((v-lo)/step)*step;input.value=String(Number(v.toPrecision(8)));if(slider)slider.value=input.value;if(sliderValue)sliderValue.textContent=input.value+" "+(config.param_unit||"");drawLab();drawLab3D();}});
    const stop=()=>{if(!drag)return;const was=drag;drag="";canvas.style.cursor="crosshair";
      if(was==="instrument")run();
      if(was==="operate"&&toolDragStart){const t=placedTools.find(v=>v.id===toolDragStart.id);const st=$("assemblyStatus");if(st)st.textContent=`${toolDefs[t?.type]?.name||"Alat"} dioperasikan. Pengaturan visual ${(Number(t?.setting||0)*100).toFixed(0)}%; parameter modul ${fmt(Number(input.value))} ${config.param_unit||""}. Tekan Jalankan praktikum untuk menghitung hasil. Tanda * adalah indikator ilustratif, bukan pembacaan terkalibrasi.`;toolDragStart=null;}
      if(was==="tool"&&toolDragStart){const t=placedTools.find(v=>v.id===toolDragStart.id);if(t&&!toolDragMoved){if(selectedTool===t.id&&window.__physlabLastToolClick&&window.__physlabLastToolClick!==t.id){const other=placedTools.find(v=>v.id===window.__physlabLastToolClick);if(other){other.link=t.id; t.link=other.id;}}window.__physlabLastToolClick=t.id;const st=$("assemblyStatus");if(st)st.textContent=`${toolDefs[t.type].name} dipilih. Klik alat lain untuk menyambungkan, atau seret untuk memindahkan.`;}else{const st=$("assemblyStatus");if(st)st.textContent=`${toolDefs[t.type].name} dipindahkan pada meja 3D.`;}toolDragStart=null;drawLab3D();}
    };canvas.addEventListener("pointerup",stop);canvas.addEventListener("pointercancel",stop);canvas.style.cursor="crosshair";canvas.style.touchAction="none";
    const moveKeys=new Set(["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"]);
    window.addEventListener("keydown",e=>{if(!canvas.matches(":focus")||!moveKeys.has(e.key.toLowerCase()))return;e.preventDefault();const key=e.key.toLowerCase(),speed=e.shiftKey?.42:.22,forwardX=-Math.sin(camera.yaw),forwardZ=-Math.cos(camera.yaw),rightX=Math.cos(camera.yaw),rightZ=-Math.sin(camera.yaw);if(key==="w"||key==="arrowup"){camera.x+=forwardX*speed;camera.z+=forwardZ*speed;}if(key==="s"||key==="arrowdown"){camera.x-=forwardX*speed;camera.z-=forwardZ*speed;}if(key==="a"){camera.x-=rightX*speed;camera.z-=rightZ*speed;}if(key==="d"){camera.x+=rightX*speed;camera.z+=rightZ*speed;}camera.x=clamp(camera.x,-2.45,2.45);camera.z=clamp(camera.z,-1.65,2.05);drawLab3D();});
    $("gameRotateTool")?.addEventListener("click",()=>{const t=placedTools.find(v=>v.id===selectedTool);if(!t){const st=$("assemblyStatus");if(st)st.textContent="Pilih alat terlebih dahulu.";return;}t.angle=(t.angle||0)+Math.PI/2;const st=$("assemblyStatus");if(st)st.textContent=`${toolDefs[t.type].name} diputar 90° (orientasi tersimpan).`;drawLab3D();});
    $("gameRemoveTool")?.addEventListener("click",()=>{const i=placedTools.findIndex(v=>v.id===selectedTool);if(i<0){const st=$("assemblyStatus");if(st)st.textContent="Pilih alat yang ingin dihapus.";return;}const [gone]=placedTools.splice(i,1);placedTools.forEach(t=>{if(t.link===gone.id)delete t.link;});selectedTool=null;window.__physlabLastToolClick=null;const st=$("assemblyStatus");if(st)st.textContent=`${toolDefs[gone.type].name} dihapus dari meja.`;drawLab3D();});
    $("gameRun")?.addEventListener("click",()=>{run();const st=$("assemblyStatus");if(st)st.textContent="Praktikum dijalankan. Hasil, tabel, dan grafik diperbarui dari model Python.";});
    $("gameReset")?.addEventListener("click",()=>{resetDefaultTools();Object.assign(camera,initialCamera);const st=$("assemblyStatus");if(st)st.textContent="Susunan alat dikembalikan ke set awal modul.";drawLab3D();});
    $("gamePanelToggle")?.addEventListener("click",()=>{const panel=$("gameControlPanel");if(!panel)return;const hidden=panel.dataset.hidden==="1";panel.dataset.hidden=hidden?"0":"1";Array.from(panel.children).slice(1).forEach(el=>el.style.display=hidden?"":"none");$("gamePanelToggle").textContent=hidden?"Sembunyikan":"Tampilkan";});
    $("labEnterSimulator")?.addEventListener("click",()=>{canvas.focus({preventScroll:true});const st=$("labCameraStatus");if(st)st.textContent="Simulator aktif · gunakan WASD dan seret mouse";drawLab3D();});
    $("labResetCamera")?.addEventListener("click",()=>{Object.assign(camera,initialCamera);drawLab3D();const st=$("labCameraStatus");if(st)st.textContent="Posisi kamera direset";canvas.focus({preventScroll:true});});
    drawLab3D();
  })();

  // Laboratorium optik interaktif: geometri alat dan perhitungan lensa tipis saling terhubung.
  (()=>{
    const section=$("opticsLabSection"),canvas=$("opticsLabCanvas");
    if(!section||!canvas||!(/optik/.test(identity)))return;
    section.hidden=false;
    const c=canvas.getContext("2d"),uOut=$("opticsObjectDistance"),vOut=$("opticsImageDistance"),mOut=$("opticsMagnification"),note=$("opticsLabStatus");
    const focusRange=$("opticsFocusRange"),focusValue=$("opticsFocusValue");
    let objectX=150,lensX=450,screenX=620,dragging="",f=10;
    const initial=[objectX,lensX,screenX],W=canvas.width,H=canvas.height,axis=220,scale=6,objectHeight=72;
    const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
    function calc(){const u=(lensX-objectX)/scale;const denominator=1/f-1/u;const finite=Math.abs(denominator)>1e-5;const v=finite?1/denominator:Infinity;return{u,v,m:finite?-v/u:Infinity,finite,real:finite&&v>0};}
    function draw(){
      const r=calc();c.clearRect(0,0,W,H);c.fillStyle="#f8fafc";c.fillRect(0,0,W,H);
      // Lampu sumber cahaya dengan cahaya pancar yang terlihat.
      const glow=c.createRadialGradient(objectX,axis-objectHeight,2,objectX,axis-objectHeight,48);
      glow.addColorStop(0,"rgba(250,204,21,.42)");glow.addColorStop(1,"rgba(250,204,21,0)");
      c.fillStyle=glow;c.beginPath();c.arc(objectX,axis-objectHeight,48,0,Math.PI*2);c.fill();
      c.fillStyle="#facc15";c.strokeStyle="#b45309";c.lineWidth=2;c.beginPath();c.arc(objectX,axis-objectHeight-19,10,0,Math.PI*2);c.fill();c.stroke();
      for(let a=-2;a<=2;a++){const yy=axis-objectHeight-19+a*5;line(c,objectX+13,yy,objectX+22,yy+(a*2),"#f59e0b",2);}
      text(c,"LAMPU / SUMBER CAHAYA",clamp(objectX-58,36,W-180),axis-objectHeight-48,"#92400e","bold 12px sans-serif");
      text(c,"MEJA OPTIK INTERAKTIF · LENSA CEMBUNG",22,28,"#20304a","bold 19px sans-serif");
      c.fillStyle="#d7dee8";c.fillRect(35,306,W-70,12);for(let x=40;x<W-35;x+=20)line(c,x,306,x,314,"#64748b",1);
      line(c,35,axis,W-35,axis,"#64748b",1);
      // Titik fokus di kedua sisi lensa
      const focusPx=f*scale;line(c,lensX-focusPx,axis-13,lensX-focusPx,axis+13,"#64748b",2);line(c,lensX+focusPx,axis-13,lensX+focusPx,axis+13,"#64748b",2);
      text(c,"F",lensX-focusPx-5,axis+29);text(c,"F",lensX+focusPx-5,axis+29);
      // Benda dan lensa
      line(c,objectX,axis,objectX,axis-objectHeight,"#2563eb",5);line(c,objectX-8,axis-objectHeight+12,objectX,axis-objectHeight,"#2563eb",3);line(c,objectX+8,axis-objectHeight+12,objectX,axis-objectHeight,"#2563eb",3);text(c,"Benda",objectX-22,axis-objectHeight-14,"#1d4ed8","bold 14px sans-serif");
      c.fillStyle="rgba(56,189,248,.22)";c.beginPath();c.ellipse(lensX,axis,13,100,0,0,Math.PI*2);c.fill();c.strokeStyle="#0284c7";c.lineWidth=3;c.stroke();text(c,"Lensa",lensX-20,axis-116,"#0369a1","bold 14px sans-serif");
      // Bayangan teori dan lintasan sinar dengan panah arah rambat.
      let imageX=NaN,imageY=NaN;
      const arrow=(x1,y1,x2,y2,color)=>{line(c,x1,y1,x2,y2,color,2.5);const a=Math.atan2(y2-y1,x2-x1),len=10;line(c,x2,y2,x2-len*Math.cos(a-.48),y2-len*Math.sin(a-.48),color,2.5);line(c,x2,y2,x2-len*Math.cos(a+.48),y2-len*Math.sin(a+.48),color,2.5);};
      if(r.finite){imageX=lensX+r.v*scale;imageY=axis-objectHeight*r.m;
        if(r.real){
          arrow(objectX+12,axis-objectHeight,lensX-14,axis-objectHeight,"#dc2626");
          arrow(lensX+14,axis-objectHeight,imageX,imageY,"#dc2626");
          arrow(objectX+10,axis-objectHeight,lensX-8,axis,"#7c3aed");
          arrow(lensX+8,axis,imageX,imageY,"#7c3aed");
          if(imageX>35&&imageX<W-35){line(c,imageX,axis,imageX,imageY,"#16a34a",4);text(c,"Bayangan teori",clamp(imageX-45,35,W-130),imageY+(imageY<axis?-12:24),"#15803d","bold 13px sans-serif");}
        } else {
          // Bayangan maya: perpanjangan sinar digambar putus-putus di sisi benda
          line(c,objectX,axis-objectHeight,lensX,axis-objectHeight,"#dc2626",2);
          line(c,lensX,axis-objectHeight,W-35,axis+35,"#dc2626",2);
          c.save();c.setLineDash([7,5]);line(c,lensX,axis-objectHeight,imageX,imageY,"#16a34a",2);line(c,lensX,axis,imageX,imageY,"#7c3aed",2);c.restore();
          if(imageX>35&&imageX<W-35){line(c,imageX,axis,imageX,imageY,"#16a34a",4);text(c,"Bayangan maya",clamp(imageX-45,35,W-130),imageY-12,"#15803d","bold 13px sans-serif");}
        }
      }
      // Layar nyata yang dapat digeser: indikator menunjukkan apakah bayangan jatuh di layar
      c.fillStyle="#cbd5e1";c.fillRect(screenX-5,axis-90,10,180);c.strokeStyle="#475569";c.strokeRect(screenX-5,axis-90,10,180);text(c,"Layar",screenX-20,axis+110,"#334155","bold 14px sans-serif");
      let screenMsg="Bayangan tidak jatuh pada layar.";
      if(r.real&&Number.isFinite(imageX)&&Math.abs(screenX-imageX)<scale*2){screenMsg="Fokus layar tepat: bayangan nyata terbentuk pada layar.";}
      else if(!r.real)screenMsg="Benda berada di dalam fokus: bayangan maya tidak dapat ditangkap layar.";
      else if(Number.isFinite(imageX)&&imageX<35)screenMsg="Bayangan teori berada di luar rentang meja.";
      text(c,`u = ${r.u.toFixed(1)} cm  ·  f = ${f} cm`,22,354,"#334155","bold 15px sans-serif");
      text(c,"Seret penanda Benda, Lensa, dan Layar",430,354,"#52627a","14px sans-serif");
      uOut.textContent=r.u.toFixed(1)+" cm";vOut.textContent=r.finite&&Number.isFinite(r.v)?r.v.toFixed(2)+" cm"+(r.real?"":" (maya)"):"Tak hingga";mOut.textContent=r.finite&&Number.isFinite(r.m)?r.m.toFixed(2)+"×":"—";
      // Tabel dan grafik disegarkan langsung setiap alat digeser / fokus diubah.
      const points=[];const lo=Number(config.min),hi=Number(config.max);
      for(let i=0;i<=20;i++){const x=lo+(hi-lo)*i/20;const den=x-f;if(Math.abs(den)<0.35)continue;const y=f*x/den;if(Number.isFinite(y)&&Math.abs(y)<500)points.push({x,y});}
      if(r.finite&&Number.isFinite(r.v)&&Math.abs(r.v)<500){const existing=points.findIndex(p=>Math.abs(p.x-r.u)<0.2);if(existing>=0)points[existing]={x:r.u,y:r.v};else points.push({x:r.u,y:r.v});}
      points.sort((a,b)=>a.x-b.x);renderTable(points);drawGraph(points);
      const header=$("moduleTableOutputHeader");if(header)header.textContent=`Jarak bayangan (cm), f = ${f} cm`;
      if(latest){latest.input=r.u;latest.output=r.finite&&Number.isFinite(r.v)?r.v:null;latest.output_label=`Jarak bayangan (cm), f = ${f} cm`;latest.series=points;}
      outputLabel.textContent=`Jarak bayangan (cm), f = ${f} cm`;outputHeader.textContent=`Jarak bayangan (cm), f = ${f} cm`;
      outputResult.textContent=r.finite&&Number.isFinite(r.v)?`${r.v.toFixed(2)} cm${r.real?"":" (maya)"}`:"Tak hingga";
      inputResult.textContent=`${r.u.toFixed(1)} cm`;
      note.textContent=screenMsg;
    }
    function xPos(e){const rect=canvas.getBoundingClientRect();return(e.clientX-rect.left)*W/rect.width;}
    canvas.addEventListener("pointerdown",e=>{const x=xPos(e),items=[["benda",objectX],["lensa",lensX],["layar",screenX]].sort((a,b)=>Math.abs(a[1]-x)-Math.abs(b[1]-x));if(Math.abs(items[0][1]-x)>30)return;dragging=items[0][0];canvas.setPointerCapture(e.pointerId);canvas.style.cursor="grabbing";});
    canvas.addEventListener("pointermove",e=>{if(!dragging)return;const x=clamp(xPos(e),45,W-45);if(dragging==="benda")objectX=clamp(x,45,lensX-30);if(dragging==="lensa")lensX=clamp(x,objectX+30,screenX-30);if(dragging==="layar")screenX=clamp(x,lensX+30,W-35);draw();});
    const stop=()=>{if(!dragging)return;dragging="";canvas.style.cursor="grab";const r=calc();if(Number.isFinite(r.u)){input.value=clamp(Number(r.u.toFixed(2)),Number(config.min),Number(config.max));run();}};
    canvas.addEventListener("pointerup",stop);canvas.addEventListener("pointercancel",stop);
    focusRange?.addEventListener("input",()=>{f=Number(focusRange.value);opticsFocus=f;if(focusValue)focusValue.textContent=f+" cm";draw();});focusRange?.addEventListener("change",()=>run());
    $("opticsLabReset")?.addEventListener("click",()=>{[objectX,lensX,screenX]=initial;f=10;if(focusRange)focusRange.value="10";if(focusValue)focusValue.textContent="10 cm";opticsFocus=10;draw();input.value=config.default;run();});
    draw();
  })();

  if(measurementSelect) configureMeasurementInstrument(measurementSelect.value,false);
  drawGraph();drawLab();drawLab3D();run();

  // Panel kontrol di dalam game: disinkronkan dengan parameter, instrumen, backend, tabel dan grafik.
  (()=>{
    const primary=$("gamePrimary"),primarySlider=$("gamePrimarySlider"),aux=$("gameAux"),auxSlider=$("gameAuxSlider"),panel=$("gameControlPanel");
    if(!primary||!primarySlider||!panel)return;
    const setPrimary=v=>{input.value=String(v);primary.value=String(v);primarySlider.value=String(v);if(slider)slider.value=String(v);if(sliderValue)sliderValue.textContent=`${v} ${config.param_unit||""}`;drawLab();drawLab3D();};
    primary.min=config.min;primary.max=config.max;primary.step=config.step;primary.value=input.value;primarySlider.min=config.min;primarySlider.max=config.max;primarySlider.step=config.step;primarySlider.value=input.value;
    primary.addEventListener("change",()=>setPrimary(primary.value));primarySlider.addEventListener("input",()=>setPrimary(primarySlider.value));
    if(auxSpec&&aux){aux.min=auxSpec.min;aux.max=auxSpec.max;aux.step=auxSpec.step;aux.value=String(auxValue??auxSpec.value);auxSlider.min=auxSpec.min;auxSlider.max=auxSpec.max;auxSlider.step=auxSpec.step;auxSlider.value=aux.value;const label=$("gameAuxLabel");if(label)label.textContent=`${auxSpec.label} (${auxSpec.unit})`;const syncAuxGame=v=>{auxValue=Number(v);aux.value=String(v);auxSlider.value=String(v);if(auxInput)auxInput.value=String(v);if(auxSlider&&$("moduleAuxSlider"))$("moduleAuxSlider").value=String(v);drawLab();drawLab3D();};aux.addEventListener("change",()=>syncAuxGame(aux.value));auxSlider.addEventListener("input",()=>syncAuxGame(auxSlider.value));}
    const gameInstrument=$("gameInstrument");if(gameInstrument){gameInstrument.value=measurementInstrument;gameInstrument.addEventListener("change",()=>{if(measurementSelect)measurementSelect.value=gameInstrument.value;configureMeasurementInstrument(gameInstrument.value,true);});measurementSelect?.addEventListener("change",()=>gameInstrument.value=measurementSelect.value);}
    $("gameRun")?.addEventListener("click",()=>{setPrimary(primary.value);if(auxSpec&&aux) {auxValue=Number(aux.value);if(auxInput)auxInput.value=aux.value;if(auxSlider&&$("moduleAuxSlider"))$("moduleAuxSlider").value=aux.value;}run();});
    $("gameReset")?.addEventListener("click",()=>{setPrimary(config.default);if(auxSpec&&aux){aux.value=String(auxSpec.value);auxSlider.value=aux.value;auxValue=Number(aux.value);if(auxInput)auxInput.value=aux.value;if($("moduleAuxSlider"))$("moduleAuxSlider").value=aux.value;}if(gameInstrument){gameInstrument.value="caliper";if(measurementSelect)measurementSelect.value="caliper";configureMeasurementInstrument("caliper",false);}run();});
    $("gamePanelToggle")?.addEventListener("click",e=>{const hidden=Array.from(panel.children).some(el=>el!==e.currentTarget&&el.style.display==="none");Array.from(panel.children).forEach(el=>{if(el!==e.currentTarget)el.style.display=hidden?"":"none";});e.currentTarget.textContent=hidden?"Sembunyikan":"Tampilkan kontrol";});
  })();
})();
