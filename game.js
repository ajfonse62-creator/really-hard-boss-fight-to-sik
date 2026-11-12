// 1. Автозагрузка картинок (любой формат)
function loadImg(el, name, fb) {
    const ex = ['.png', '.jpg', '.jpeg', '.webp', '.PNG', '.JPG'];
    let i = 0;
    function next() {
        if (i >= ex.length) {
            el.removeAttribute('src');
            if (fb) el.classList.add(fb);
            return;
        }
        el.src = name + ex[i++];
    }
    el.onerror = next;
    next();
}
loadImg(document.getElementById('boss-img'), 'boss', null);
loadImg(document.getElementById('soul'), 'soul', null);

// 2. Фон: карусель Джевила + волны Флауи
const bg = document.getElementById('shader-bg');
const ctx = bg.getContext('2d');
function resize() { bg.width = innerWidth; bg.height = innerHeight; }
window.addEventListener('resize', resize);
resize();

let t = 0;
function drawBg() {
    t += 0.025;
    const cx = bg.width / 2, cy = bg.height / 2, maxR = Math.hypot(cx, cy);
    ctx.fillStyle = '#06010d';
    ctx.fillRect(0, 0, bg.width, bg.height);

    for (let r = 7; r > 0; r--) {
        let p = ((r + (t * 1.4) % 1) / 7);
        let rad = Math.pow(p, 1.5) * maxR * 1.2;
        let ang = t * (r % 2 ? 0.5 : -0.5);
        for (let s = 0; s < 10; s++) {
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, rad, (s / 10) * Math.PI * 2 + ang, ((s + 1) / 10) * Math.PI * 2 + ang);
            ctx.fillStyle = (s + r) % 2 ? `rgba(12,4,28,${0.6 * p})` : `rgba(60,18,120,${0.35 * p})`;
            ctx.fill();
        }
    }
    ctx.strokeStyle = 'rgba(190,140,255,0.18)';
    ctx.lineWidth = 2;
    for (let w = 0; w < 3; w++) {
        ctx.beginPath();
        for (let x = 0; x <= bg.width; x += 30) {
            let y = cy + Math.sin(x * 0.015 + t * 1.5 + w) * 75;
            x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    requestAnimationFrame(drawBg);
}
drawBg();

// 3. Переменные и управление
const box = document.getElementById('battle-box');
const soul = document.getElementById('soul');
const diag = document.getElementById('dialogue-box');
const sub = document.getElementById('submenu');
const fg = document.getElementById('fight-minigame');
const cur = document.getElementById('cursor-bar');

let hp = 20, bHp = 120, sX = 128, sY = 85;
let state = 'menu', mult = 1, rage = 1;
let keys = {}, bul = [], haz = [], curX = 0, fInt = null;
let items = [{ n: "Кукуруза (+12 HP)", h: 12 }, { n: "Порох (+20 HP)", h: 20 }];

window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'KeyZ' || e.code === 'Enter') handleActionPress();
});
window.addEventListener('keyup', e => keys[e.code] = false);

function handleActionPress() {
    if (state === 'aim') hitConfirm();
    else if (state === 'def') shoot();
}

// 4. Меню действий
function openMenu(type) {
    if (state !== 'menu') return;
    sub.style.display = 'none';
    fg.style.display = 'none';

    if (type === 'fight') {
        state = 'aim';
        fg.style.display = 'flex';
        curX = 0;
        diag.textContent = "* Нажми ОГОНЬ (Z) в центре жёлтой зоны!";
        fInt = setInterval(() => {
            curX += 6;
            cur.style.left = curX + 'px';
            if (curX >= 274) hitConfirm();
        }, 16);
    } else if (type === 'act') {
        sub.style.display = 'flex';
        sub.innerHTML = `
            <button onclick="doAct('chk')">* Осмотреть</button>
            <button onclick="doAct('foc')">* Фокус (x1.5 урон)</button>
            <button onclick="doAct('tnt')">* Дразнить</button>
        `;
    } else if (type === 'item') {
        if (items.length === 0) { diag.textContent = "* Рюкзак пуст!"; return; }
        sub.style.display = 'flex';
        sub.innerHTML = items.map((it, i) => `<button onclick="useItem(${i})">* ${it.n}</button>`).join('');
    } else if (type === 'mercy') {
        diag.textContent = "* Цветок не принимает пощаду!";
        enemyTurn();
    }
}

function hitConfirm() {
    clearInterval(fInt);
    fg.style.display = 'none';
    let dist = Math.abs(137 - curX);
    let base = curX >= 274 ? 0 : (dist < 18 ? 35 : (dist < 50 ? 20 : 10));
    let dmg = Math.round(base * mult);
    mult = 1;

    if (dmg > 0) {
        bHp = Math.max(0, bHp - dmg);
        document.getElementById('boss-hp-fill').style.width = (bHp / 120 * 100) + '%';
        let bi = document.getElementById('boss-img');
        bi.classList.remove('shake');
        void bi.offsetWidth;
        bi.classList.add('shake');
        diag.textContent = `* Нанесено ${dmg} урона!`;
    } else {
        diag.textContent = "* ПРОМАХ!";
    }

    if (bHp <= 0) {
        state = 'win';
        diag.textContent = "* ПОБЕДА! Босс повержен!";
        document.getElementById('boss-img').style.opacity = '0.2';
        return;
    }
    setTimeout(enemyTurn, 800);
}

function doAct(a) {
    sub.style.display = 'none';
    if (a === 'chk') diag.textContent = `* ЦВЕТОК - HP ${bHp}/120. Сбивай полосы выстрелами!`;
    if (a === 'foc') { mult = 1.5; diag.textContent = "* Прицел наведён! Урон следующей атаки x1.5."; }
    if (a === 'tnt') { rage = 1.35; diag.textContent = "* Босс в ярости! Скорость атак выросла."; }
    setTimeout(enemyTurn, 1000);
}

function useItem(i) {
    sub.style.display = 'none';
    let it = items.splice(i, 1)[0];
    hp = Math.min(20, hp + it.h);
    updHp();
    diag.textContent = `* Использовано: ${it.n}`;
    setTimeout(enemyTurn, 900);
}

// 5. Атака босса и стрельба души
function enemyTurn() {
    state = 'def';
    let step = 0;
    let iv = setInterval(() => {
        step++;
        if (step % 4 === 0) {
            let b = document.createElement('img');
            b.className = 'enemy-bar';
            loadImg(b, 'bar', 'bar-fallback');
            let sx = Math.random() > 0.5 ? 0 : 150;
            b.style.width = '130px'; b.style.left = sx + 'px'; b.style.top = '0px';
            box.appendChild(b);
            haz.push({ el: b, x: sx, y: 0, w: 130, h: 18, vy: 2.8 * rage, brk: true });
        } else {
            let p = document.createElement('div');
            p.className = 'enemy-proj';
            let sx = Math.random() * 265;
            p.style.left = sx + 'px'; p.style.top = '0px';
            box.appendChild(p);
            haz.push({ el: p, x: sx, y: 0, w: 12, h: 12, vy: 3.5 * rage, brk: false });
        }
        if (step >= 14) {
            clearInterval(iv);
            setTimeout(() => {
                if (state === 'win') return;
                state = 'menu';
                diag.textContent = "* Ваш ход!";
                haz.forEach(h => h.el.remove()); haz = [];
                bul.forEach(b => b.el.remove()); bul = [];
            }, 1400);
        }
    }, Math.round(550 / rage));
}

function shoot() {
    if (state !== 'def' || bul.length > 3) return;
    let b = document.createElement('img');
    b.className = 'bullet';
    loadImg(b, 'bullet', 'bullet-fallback');
    b.style.left = (sX + 6) + 'px'; b.style.top = (sY - 18) + 'px';
    box.appendChild(b);
    bul.push({ el: b, x: sX + 6, y: sY - 18 });
}

function updHp() {
    document.getElementById('hp-fill').style.width = (hp / 20 * 100) + '%';
    document.getElementById('hp-text').textContent = `${hp}/20`;
    if (hp <= 0) { alert("GAME OVER!"); location.reload(); }
}

function bind(id, k) {
    let b = document.getElementById(id);
    if (!b) return;
    b.addEventListener('pointerdown', e => { e.preventDefault(); keys[k] = true; });
    b.addEventListener('pointerup', e => { e.preventDefault(); keys[k] = false; });
    b.addEventListener('pointerleave', () => keys[k] = false);
}
bind('btn-up', 'ArrowUp'); bind('btn-down', 'ArrowDown');
bind('btn-left', 'ArrowLeft'); bind('btn-right', 'ArrowRight');

function loop() {
    if (state === 'def') {
        let sp = keys['ShiftLeft'] ? 2 : 3.5;
        if (keys['ArrowLeft'] && sX > 0) sX -= sp;
        if (keys['ArrowRight'] && sX < 248) sX += sp;
        if (keys['ArrowUp'] && sY > 0) sY -= sp;
        if (keys['ArrowDown'] && sY < 168) sY += sp;
        soul.style.left = sX + 'px'; soul.style.top = sY + 'px';

        for (let i = bul.length - 1; i >= 0; i--) {
            bul[i].y -= 7; bul[i].el.style.top = bul[i].y + 'px';
            if (bul[i].y < -25) { bul[i].el.remove(); bul.splice(i, 1); }
        }
        for (let i = haz.length - 1; i >= 0; i--) {
            let h = haz[i]; h.y += h.vy; h.el.style.top = h.y + 'px';
            if (h.brk) {
                for (let j = bul.length - 1; j >= 0; j--) {
                    let b = bul[j];
                    if (b.x < h.x + h.w && b.x + 12 > h.x && b.y < h.y + h.h && b.y + 24 > h.y) {
                        h.el.remove(); haz.splice(i, 1);
                        b.el.remove(); bul.splice(j, 1);
                        break;
                    }
                }
            }
            if (sX < h.x + h.w && sX + 20 > h.x && sY < h.y + h.h && sY + 20 > h.y) {
                hp = Math.max(0, hp - 4); updHp();
                h.el.remove(); haz.splice(i, 1);
            } else if (h.y > 210) {
                h.el.remove(); haz.splice(i, 1);
            }
        }
    }
    requestAnimationFrame(loop);
}
loop();
