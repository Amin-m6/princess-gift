(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const home = $("homeScreen"), game = $("gameScreen"), end = $("endScreen");
  const canvas = $("board"), ctx = canvas.getContext("2d");
  const SIZE = 21, CELL = canvas.width / SIZE;
  const KEY = "princessSnakeBest";
  const fa = n => new Intl.NumberFormat("fa-IR").format(n);
  const bestStored = () => Number(localStorage.getItem(KEY) || 0);
  let best = bestStored(), sessionBest = 0, score = 0, snake = [], dir = {x:1,y:0}, nextDir = {x:1,y:0};
  let food = null, running = false, paused = false, timer = null, tickMs = 135, lastEventAt = 0;
  let effects = {slow:0,double:0}, event = null, eventUntil = 0, soundOn = localStorage.getItem("princessSnakeSound") !== "0", audio = null, lastMilestone = 0, lastMsg = "";
  let roundHadEvent = false, lastFoodType = "banana", gameStartedAt = 0, toastTimeout = null, revealTimeout = null;

  const foods = [
    {type:"banana", emoji:"🍌", points:10, weight:48},
    {type:"cake", emoji:"🍰", points:18, weight:14},
    {type:"tea", emoji:"🍵", points:12, weight:15},
    {type:"doogh", emoji:"🥛", points:10, weight:15},
    {type:"gold", emoji:"🌟", points:30, weight:8}
  ];
  const events = [
    {id:"driving", toasts:["افسر خیالی وارد شد 🚗","آزمون رانندگی شروع شد! مخروط‌ها رو لگد نکن 🚗","گواهینامه‌ی پرنسس در خطره! 🚗","افسر گفت: راهنما نزدی! 🚗","پارک دوبله ممنوع! 🚗","مخروط رو ببین، نه ماشین جلویی رو! 🚗","مرحله‌ی دنده‌عقب؛ ولی مار که دنده‌عقب نداره 😅"]},
    {id:"princess", toasts:["تاج سلطنتی فعال شد ♛","حالت پرنسس: لطفاً با احترام عبور کنید ♛","پرنسس نه، پادشاه! (طبق اعلام خودشون) ♛","اعلی‌حضرت خودشون تشریف آوردن ♛","پرنسس خسته‌ست، ولی تاج رو نمی‌ذاره زمین ♛","مار به افتخار پرنسسِ پادشاه‌نما تعظیم کرد ♛","اعلامیه: پادشاه امروز هم پرنسس بود ♛"]},
    {id:"tea", toasts:["استراحت چای کوتاه 🍵","وقت چایه؛ تمرکز کن، اعلی‌حضرت 🍵","چای تازه‌دم رسید؛ امتیازها دوبل شد 🍵","استکان کمرباریک وارد شد؛ امتیاز دوبرابر! 🍵"]},
    {id:"diet", toasts:["رژیم از فردا شروع میشه... از دیروز هم همین رو می‌گفتی 🥗","سالاد فقط برای تزئین میز بود 🥗","ترازو وارد بازی شد، مار بیرونش کرد ⚖️","مشاور تغذیه: این مار هم رژیم می‌خواد! 🥗","یادآوری: کیکی که کسی نبینه کالری نداره 🍰","قانون جدید کاخ: غذای شب یعنی «فقط یه تیکه» 🍰"]},
    {id:"license", toasts:["گواهینامه و مدارک لطفاً، اعلی‌حضرت 🪪","نمره‌ی تئوری ۱۰۰؛ عملی؟ بیخیال 🪪","گواهینامه رو توی کیف پرنسسی جا گذاشتی 🪪","افسر: سرعت مجاز مار ۱۳۵ میلی‌ثانیه‌ست! 🪪","تصویر گواهینامه‌ات خیلی باوقاره؛ رانندگی‌ات... کمتر 🪪"]},
    {id:"wall", toasts:["دیوار: من از قبل اینجا بودم 🧱","دیوار نگاه عاقل‌اندر‌سفیه کرد 🧱","به دیوار احترام بذار؛ اون هیچ‌وقت جابه‌جا نمیشه 🧱","هشدار: دیوار امروز خلقش تنگه 🧱"]}
  ];
  const endings = {
    ordinary: [
      ["پایان امپراتوری!", "پرنسس جان، ظاهراً امروز هم مار حاضر نشد به فرمانت گوش بده. حداقل با اعتمادبه‌نفس باختی."],
      ["گزارش رسمی کاخ", "این نتیجه رو محرمانه نگه می‌داریم. البته مار و دیوار شاهد همه‌چیز بودن."],
      ["یک توقف کوتاه", "خب، این دور تموم شد؛ ولی معلومه قرار نیست به این راحتی تسلیم بشی. فقط دفعه بعد با دیوار رفیق نشو."]
    ],
    sweet: [
      ["تصمیم‌های دشوار", "شیرینی امتیاز خوبی داشت؛ از نظر استراتژیک قابل دفاعه. از نظر رژیم؟ دادگاه هنوز تشکیل نشده."]
    ],
    driving: [
      ["گواهینامه؟ فعلاً نه.", "افسر گفت کنترل مسیر رو تمرین کن؛ نگفت با هر مانعی آشنا شو!"],
      ["رد شدی، ولی باوقار", "این فقط تمرین بود. فعلاً کلید ماشین رو تحویل نمی‌گیریم؛ کلید شروع مجدد آزاده."]
    ],
    record: [
      ["رکورد جدید!", "تو واقعاً بهتر شدی؛ حتی مار هم برای لحظه‌ای دست از شیطنت برداشت. به خودت افتخار کن!"],
      ["کاخ جشن می‌گیرد", "بالاخره یه چیزی رو شکستی که دیوار نبود: رکورد قبلیت رو. دمت گرم، پرنسس!"]
    ],
    heartfelt: [
      ["یک یادآوری کوچک", "مهم این نیست هر بار ببری؛ مهم اینه که هنوز برای یه دور دیگه انگیزه داری. حالا برو ثابت کن مار اشتباه می‌کرد."],
      ["پایان این دور", "بعضی روزها فقط باید خندید و دوباره شروع کرد. این یکی هم از همون روزهاست؛ با کمی تقصیر از سمت خودت!"]
    ],
    rare: [
      ["پیام محرمانه کاخ", "این پیام فقط برای بازیکن‌های خاصه. لطفاً وانمود کن کاملاً اتفاقی دیدیش."],
      ["اعلامیه‌ی سلطنتی", "پس از بررسی‌های بسیار، کمیته‌ی مارها به این نتیجه رسید که تو هنوز خیلی باحالی. جلسه تمام است."]
    ]
  };


  endings.ordinary.push(
    ["پرنسس به دیوار رسید", "دیوار گفت: بفرمایید، ولی من جای خودم می‌مونم."],
    ["شاه شدن سخته", "پرنسس شدن آسونه؛ پادشاه شدن مار بیشتری می‌خواد. یه دور دیگه؟"],
    ["مار خسته شد", "مار رفت چای بخوره. تو هم برو تاجت رو صاف کن و برگرد."]
  );
  endings.sweet.push(
    ["ترازو شکایت کرد", "پرونده‌ی رژیم دوباره به تعویق افتاد؛ دلیل: شیرینی خیلی خوشمزه‌ست."],
    ["مصوبه‌ی رژیم لغو شد", "رژیم از فردا شروع میشه؛ از دیروز هم همین بود. ولی امتیازت خوب بود!"]
  );
  endings.driving.push(
    ["مردود در پارک دوبله", "افسر ثبت کرد: مار خوب می‌پیچه، ولی پرنسس آینه رو فراموش کرده."],
    ["گواهینامه‌ی موقت", "فعلاً با دوچرخه‌ی سلطنتی ادامه بده؛ بعداً دوباره امتحان می‌کنیم."]
  );
  endings.princess = [
    ["اعلی‌حضرت!", "پرنسس نه، پادشاه؛ ولی پادشاه هم گاهی با دیوار برخورد می‌کنه."],
    ["پایان سلطنت موقت", "تاج هنوز سرته؛ فقط کمی کج شده. صافش کن و دوباره بیا."]
  ];

  const MSG = {
    banana:["خوبه! +{p}","موز نوش جان، اعلی‌حضرت! +{p}","پتاسیم سلطنتی دریافت شد! +{p}","کاخ داره پر موز میشه! +{p}","ماشاالله! +{p}","پرنسس همین رو می‌خواست! +{p}","این مار فقط موز می‌شناسه 🍌 +{p}"],
    cake:["تصمیم استراتژیک بود... احتمالاً 🍰","رژیم از فردا شروع میشه، قول پرنسسی! 🍰","کالری‌ها دیپلمات‌اند؛ سرشون رو نمی‌شماریم 🍰","ترازو فعلاً اعلام همبستگی کرده 🍰","رژیم: صفر، پرنسس: یک 🍰","این آخرین تیکه بود. (قبلی‌ها هم بود) 🍰","مشاور تغذیه‌ی کاخ چشم‌هاش رو بست 🍰"],
    gold:["موز؟ نه، جایزه‌ی سلطنتی! +{p}","گنجینه‌ی کاخ پیدا شد! +{p} 🌟","جواهر سلطنتی! تاجت براق‌تر شد +{p}","خزانه‌دار کاخ می‌گه: دمت گرم! +{p}"],
    tea:["چای تمرکز! امتیازها دوبرابر شد 🍵","چای سلطنتی سرو شد؛ امتیاز دوبرابر! 🍵","استکان کمرباریک، امتیاز دوبل! 🍵"],
    doogh:["دوغ نجات‌بخش! سرعت کمتر شد 🥛","دوغ خنک؛ مار هم آروم شد 🥛","سرعت کم شد؛ پرنسس حالا با ژست پیش میره 🥛","دوغ با نعنا، مار با آرامش 🥛"],
    milestone:["پیشرفت ثبت شد؛ کمی هم به خودت افتخار کن ✦","نوبت جشن نیست، ولی تشویق می‌کنیم 👏","کاخ بهت یه نشان درجه‌دو داد ✦","این امتیاز رو برای رزومه‌ی سلطنتی ثبت کردیم ✦","رژیم نمی‌گیری، ولی رکورد می‌گیری؛ آفرین! ✦","پرنسس امتیازش رو شمرد؛ عدد قشنگیه ✦"]
  };
  function pickMsg(arr, p) {
    let m = arr[randInt(arr.length)], tries = 0;
    while (m === lastMsg && tries++ < 4) m = arr[randInt(arr.length)];
    lastMsg = m;
    return m.replace("{p}", fa(p || 0));
  }

  // ---------- Audio: chiptune music + small sound effects (no files needed) ----------
  const BPM = 100, EIGHTH = 60 / BPM / 2;
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const LEAD = [[76,79,76,72,76,79,84,79],[76,81,76,72,76,81,84,81],[77,81,77,72,77,81,84,81],[74,79,74,71,74,79,83,79],
                [79,76,79,84,83,79,76,79],[81,76,81,84,83,81,76,81],[81,77,81,84,81,77,72,77],[83,79,74,79,83,86,83,79]];
  const BASS = [48,45,41,43,48,45,41,43];
  let musicTimer = null, nextNoteTime = 0, step = 0, fanfared = false;
  let masterGain = null, musicGain = null, sfxGain = null, noiseBuf = null;

  function initAudio() {
    if (audio) return;
    try {
      audio = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audio.createGain(); masterGain.connect(audio.destination);
      musicGain = audio.createGain(); musicGain.gain.value = .11; musicGain.connect(masterGain);
      sfxGain = audio.createGain(); sfxGain.gain.value = .22; sfxGain.connect(masterGain);
      const len = audio.sampleRate * .5;
      noiseBuf = audio.createBuffer(1, len, audio.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { audio = null; }
  }
  function tone(freq, t, dur, type, vol, dest, slideTo) {
    const o = audio.createOscillator(), g = audio.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + .01);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + .03);
  }
  function noise(t, dur, filterType, freq, vol, dest) {
    const s = audio.createBufferSource(), g = audio.createGain(), f = audio.createBiquadFilter();
    s.buffer = noiseBuf; f.type = filterType; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t); s.stop(t + dur + .02);
  }
  function scheduleStep(i, t) {
    const bar = Math.floor(i / 8) % 8, pos = i % 8;
    tone(mtof(LEAD[bar][pos]), t, EIGHTH * .9, "square", .5, musicGain);
    if (pos % 4 === 0) tone(mtof(BASS[bar]), t, EIGHTH * 3.6, "triangle", .9, musicGain);
    else if (pos % 2 === 0) tone(mtof(BASS[bar] + 7), t, EIGHTH * 1.6, "triangle", .5, musicGain);
    if (pos % 2 === 1) noise(t, .05, "highpass", 7000, .3, musicGain);
  }
  function musicTick() {
    if (!audio) return;
    while (nextNoteTime < audio.currentTime + .25) {
      scheduleStep(step, nextNoteTime);
      nextNoteTime += EIGHTH; step = (step + 1) % 64;
    }
  }
  function startMusic() {
    if (!audio || musicTimer) return;
    nextNoteTime = audio.currentTime + .08;
    if (!fanfared) {
      fanfared = true;
      [72, 76, 79, 84].forEach((n, i) => tone(mtof(n), nextNoteTime + i * .12, .22, "square", .5, musicGain));
      nextNoteTime += .75;
    }
    musicTimer = setInterval(musicTick, 50);
  }
  function stopMusic() { clearInterval(musicTimer); musicTimer = null; }
  function syncAudio() {
    if (!audio) return;
    if (!soundOn) { stopMusic(); return; }
    startMusic();
    if (document.hidden || paused) { audio.suspend && audio.suspend(); }
    else { audio.resume && audio.resume(); }
  }
  function sfx(kind) {
    if (!soundOn || !audio || audio.state !== "running") return;
    const t = audio.currentTime + .01, d = sfxGain;
    const seq = (notes, gap, type, dur, vol) => notes.forEach((n, i) => tone(mtof(n), t + i * gap, dur, type, vol, d));
    switch (kind) {
      case "banana": seq([84, 88], .06, "square", .09, .5); break;
      case "cake":   seq([79, 83, 86, 91], .06, "triangle", .14, .9); break;
      case "tea":    seq([72, 76, 79], .07, "square", .12, .5); break;
      case "doogh":  tone(mtof(72), t, .35, "triangle", .9, d, mtof(55)); break;
      case "gold":   seq([72, 76, 79, 84, 88], .07, "square", .16, .5); break;
      case "event":  seq([88, 84, 88], .09, "square", .1, .45); break;
      case "over":   tone(mtof(72), t, .6, "square", .6, d, mtof(40)); break;
      case "crack":  noise(t, .35, "lowpass", 1800, .9, d); tone(mtof(40), t, .3, "triangle", 1, d, mtof(30)); break;
      case "chime":  seq([84, 88, 91, 96], .09, "triangle", .3, .9); break;
      case "record": seq([79, 84, 88, 91, 96], .08, "square", .18, .5); break;
    }
  }
  const unlockAudio = () => { initAudio(); syncAudio(); };
  document.addEventListener("pointerdown", unlockAudio, {passive: true});
  document.addEventListener("keydown", unlockAudio);
  document.addEventListener("visibilitychange", syncAudio);

  function showScreen(which) {
    [home, game, end].forEach(s => s.classList.add("hidden"));
    which.classList.remove("hidden");
  }
  function refreshRecords() {
    best = bestStored();
    $("homeBest").textContent = fa(best);
    $("best").textContent = fa(best);
    $("sessionBest").textContent = fa(sessionBest);
  }
  function randInt(max) { return Math.floor(Math.random() * max); }
  function randomFreeCell() {
    for (let i=0;i<300;i++) {
      const p = {x:randInt(SIZE),y:randInt(SIZE)};
      if (!snake.some(s=>s.x===p.x && s.y===p.y) && !(event && event.obstacles && event.obstacles.some(o=>o.x===p.x&&o.y===p.y))) return p;
    }
    return {x:2,y:2};
  }
  function chooseFood() {
    const total = foods.reduce((s,f)=>s+f.weight,0);
    let r = Math.random()*total;
    for (const f of foods) { r-=f.weight; if(r<=0) return {...f,...randomFreeCell()}; }
    return {...foods[0],...randomFreeCell()};
  }
  function startGame() {
    clearInterval(timer); score=0; tickMs=135; dir={x:1,y:0}; nextDir={x:1,y:0};
    snake=[{x:7,y:10},{x:6,y:10},{x:5,y:10},{x:4,y:10}];
    food=chooseFood(); effects={slow:0,double:0}; event=null; eventUntil=0; lastEventAt=Date.now();
    roundHadEvent=false; lastMilestone=0; lastFoodType="banana"; gameStartedAt=Date.now(); running=true; paused=false;
    $("score").textContent=fa(0); $("pauseOverlay").classList.add("hidden"); refreshRecords();
    showScreen(game); draw(); timer=setInterval(tick,tickMs);
  }
  function setDirection(name) {
    const dirs={up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}};
    const d=dirs[name]; if(!d || !running || paused) return;
    if(d.x===-dir.x && d.y===-dir.y) return;
    nextDir=d;
  }
  function tick() {
    if(!running||paused) return;
    dir=nextDir;
    const head={x:snake[0].x+dir.x,y:snake[0].y+dir.y};
    if(head.x<0||head.x>=SIZE||head.y<0||head.y>=SIZE) return gameOver();
    const ate=food&&head.x===food.x&&head.y===food.y;
    const body=ate?snake:snake.slice(0,-1);
    if(body.some(s=>s.x===head.x&&s.y===head.y)) return gameOver();
    if(event&&event.obstacles&&event.obstacles.some(o=>o.x===head.x&&o.y===head.y)) return gameOver();
    snake.unshift(head);
    if(ate) {
      const points=food.points*(effects.double>0?2:1);
      score+=points; lastFoodType=food.type;
      effects.double=Math.max(0,effects.double-1);
      if(food.type==="doogh"){effects.slow=18;}
      else if(food.type==="tea"){effects.double=22;}
      showToast(pickMsg(MSG[food.type]||MSG.banana,points)); sfx(food.type);
      food=chooseFood(); $("score").textContent=fa(score);
      if(score>best){best=score;localStorage.setItem(KEY,String(best));$("best").textContent=fa(best);}
      if(score>sessionBest){sessionBest=score;$("sessionBest").textContent=fa(sessionBest);}
      const ms=Math.floor(score/50);
      if(ms>lastMilestone){lastMilestone=ms;showToast(pickMsg(MSG.milestone));}
    } else snake.pop();
    if(effects.slow>0) effects.slow--;
    if(effects.double>0) effects.double--;
    maybeEvent(); draw();
  }
  function maybeEvent() {
    const now=Date.now();
    if(event && now>eventUntil){event=null;lastEventAt=now;}
    if(event || now-lastEventAt<14000 || score<20) return;
    if(Math.random()>.34) return;
    const pick=events[randInt(events.length)];
    event={id:pick.id,obstacles:[]};
    if(pick.id==="driving") {
      for(let i=0;i<3;i++){const p=randomFreeCell();event.obstacles.push(p);}
    }
    eventUntil=now+(pick.id==="driving"?7500:5000);
    lastEventAt=now;roundHadEvent=true;showToast(pickMsg(pick.toasts));sfx("event");
    if(pick.id==="tea") effects.double=Math.max(effects.double,18);
  }
  function gameOver() {
    running=false;clearInterval(timer);timer=null;
    const isRecord=score>0 && score>=best && score>Number(localStorage.getItem(KEY+"_previous")||0);
    const oldBest=bestStored();
    if(score>oldBest)localStorage.setItem(KEY,String(score));
    const updatedBest=bestStored();
    $("finalScore").textContent=fa(score);$("finalBest").textContent=fa(updatedBest);
    $("newRecord").classList.toggle("hidden",!(score>0&&score>=updatedBest&&score>sessionBest-1&&score>=oldBest));
    // Use a clear record comparison from before this round was saved.
    const previousBest=Number(localStorage.getItem(KEY+"_roundStart")||0);
    $("newRecord").classList.toggle("hidden",!(score>previousBest));
    let pool="ordinary";
    if(score>previousBest) pool="record";
    else if(event&&(event.id==="driving"||event.id==="license")) pool="driving";
    else if(event&&event.id==="diet") pool="sweet";
    else if(event&&event.id==="princess") pool="princess";
    else if(lastFoodType==="cake") pool="sweet";
    else if(Math.random()<.22) pool="heartfelt";
    else if(Math.random()<.06) pool="rare";
    const list=endings[pool]||endings.ordinary;
    const chosen=list[randInt(list.length)];
    $("endTitle").textContent=chosen[0];$("endMessage").textContent=chosen[1];
    $("endKicker").textContent=pool==="record"?"گزارش ویژه‌ی کاخ":pool==="heartfelt"?"یک یادآوری کوچک":"گزارش رسمی کاخ";
    $("endIcon").textContent=pool==="record"||pool==="princess"?"♛":pool==="driving"?"🚗":"✦";
    sfx("over");setTimeout(()=>sfx("crack"),1300);setTimeout(()=>sfx("chime"),1450);
    if(pool==="record")setTimeout(()=>sfx("record"),1900);
    end.classList.remove("done");clearTimeout(revealTimeout);
    showScreen(end);refreshRecords();
    revealTimeout=setTimeout(()=>end.classList.add("done"),2000);
  }
  function roundedRect(x,y,w,h,r) {
    ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();
  }
  function draw() {
    const c=canvas.width;ctx.clearRect(0,0,c,c);
    ctx.fillStyle="#1d211e";ctx.fillRect(0,0,c,c);
    ctx.strokeStyle="#34372e";ctx.lineWidth=1;
    for(let i=0;i<=SIZE;i++){const p=i*CELL;ctx.beginPath();ctx.moveTo(p,0);ctx.lineTo(p,c);ctx.stroke();ctx.beginPath();ctx.moveTo(0,p);ctx.lineTo(c,p);ctx.stroke();}
    if(event&&event.obstacles){event.obstacles.forEach(o=>{ctx.fillStyle="#8c6540";roundedRect(o.x*CELL+3,o.y*CELL+3,CELL-6,CELL-6,4);ctx.fillStyle="#f4d79b";ctx.font="13px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("▲",o.x*CELL+CELL/2,o.y*CELL+CELL/2);});}
    if(food){ctx.textAlign="center";ctx.textBaseline="middle";ctx.font=`${CELL*.88}px "Apple Color Emoji","Segoe UI Emoji",sans-serif`;ctx.fillText(food.emoji,food.x*CELL+CELL/2,food.y*CELL+CELL/2+1);}
    snake.forEach((s,i)=>{
      const x=s.x*CELL+2,y=s.y*CELL+2,w=CELL-4,h=CELL-4;
      ctx.fillStyle=i===0?"#f2cf64":i%2?"#d9b348":"#cba33d";
      roundedRect(x,y,w,h,Math.max(4,CELL*.32));
      if(i===0){
        ctx.fillStyle="#30280f";
        const eye1={x:x+w*.32,y:y+h*.38},eye2={x:x+w*.68,y:y+h*.38};
        ctx.beginPath();ctx.arc(eye1.x,eye1.y,2,0,Math.PI*2);ctx.arc(eye2.x,eye2.y,2,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle="#30280f";ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(x+w*.5,y+h*.53,3,.15,Math.PI-.15);ctx.stroke();
        ctx.fillStyle="#f5df91";ctx.font="12px sans-serif";ctx.fillText("♛",x+w*.5,y-2);
      }
    });
    if(effects.double>0){ctx.strokeStyle="#f2cf64";ctx.lineWidth=2;ctx.strokeRect(3,3,c-6,c-6);}
  }
  function showToast(msg) {
    const el=$("toast");el.textContent=msg;el.classList.remove("hidden");
    el.style.animation="none";void el.offsetWidth;el.style.animation="";
    clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>el.classList.add("hidden"),2700);
  }
  function pauseGame() {
    if(!running)return;paused=!paused;$("pauseOverlay").classList.toggle("hidden",!paused);
    $("pauseBtn").textContent=paused?"▶":"Ⅱ";syncAudio();
  }
  function toggleSound() {
    soundOn=!soundOn;localStorage.setItem("princessSnakeSound",soundOn?"1":"0");
    $("soundBtn").classList.toggle("sound-on",soundOn);
    $("soundBtn").textContent=soundOn?"♫":"♩";
    initAudio();syncAudio();
    showToast(soundOn?"موزیک روشن شد ♫":"موزیک خاموش شد");
  }
  $("startBtn").addEventListener("click",()=>{localStorage.setItem(KEY+"_roundStart",String(bestStored()));startGame();});
  $("againBtn").addEventListener("click",()=>{localStorage.setItem(KEY+"_roundStart",String(bestStored()));startGame();});
  $("homeBtn").addEventListener("click",()=>{showScreen(home);refreshRecords();});
  $("pauseBtn").addEventListener("click",pauseGame);
  $("resumeBtn").addEventListener("click",pauseGame);
  $("howBtn").addEventListener("click",()=>$("howDialog").showModal());
  $("soundBtn").addEventListener("click",toggleSound);
  document.querySelectorAll("[data-dir]").forEach(b=>b.addEventListener("click",()=>setDirection(b.dataset.dir)));
  document.addEventListener("keydown",e=>{
    const k=e.key.toLowerCase(),map={arrowup:"up",w:"up",arrowdown:"down",s:"down",arrowleft:"left",a:"left",arrowright:"right",d:"right"};
    if(map[k]){e.preventDefault();setDirection(map[k]);}
    if(k===" "&&running){e.preventDefault();pauseGame();}
  });
  // Swipe support for mobile.
  let touchStart=null;
  canvas.addEventListener("touchstart",e=>{const t=e.changedTouches[0];touchStart={x:t.clientX,y:t.clientY};},{passive:true});
  canvas.addEventListener("touchend",e=>{
    if(!touchStart)return;const t=e.changedTouches[0],dx=t.clientX-touchStart.x,dy=t.clientY-touchStart.y;
    if(Math.max(Math.abs(dx),Math.abs(dy))>22)setDirection(Math.abs(dx)>Math.abs(dy)?(dx>0?"right":"left"):(dy>0?"down":"up"));
    touchStart=null;
  },{passive:true});
  // Reduce motion is respected for UI; gameplay stays grid-based.
  $("soundBtn").classList.toggle("sound-on",soundOn);$("soundBtn").textContent=soundOn?"♫":"♩";
  // Telegram Mini App setup (safe no-op outside Telegram).
  try{
    const tg=window.Telegram&&window.Telegram.WebApp;
    if(tg){
      tg.ready();tg.expand();
      if(tg.disableVerticalSwipes)tg.disableVerticalSwipes();
      if(tg.setHeaderColor)tg.setHeaderColor("#171918");
      if(tg.setBackgroundColor)tg.setBackgroundColor("#171918");
    }
  }catch(e){}
  refreshRecords();draw();
})();