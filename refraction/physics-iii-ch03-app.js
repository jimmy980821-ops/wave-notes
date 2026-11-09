(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const lessons = window.opticsLessons;
  const quiz = window.opticsQuiz;
  const chapters = [
    ['basics', '00', '預備課', '從光線、界面和法線開始。讀完這節，你就能看懂後面每一張光路圖。'],
    ['snell', '3-1', '光的折射與司乃耳定律', '先預測光往哪裡彎，再用正弦算角度，最後解釋視深與玻璃板側移。'],
    ['tir', '3-2', '光的全反射', '把入射角一點點推大，觀察折射光何時沿著界面，何時完全反射。'],
    ['color', '3-3', '光的色散與彩虹成因', '追蹤紅光和紫光，釐清「偏折角」與「彩虹角半徑」為何不是同一個角。'],
    ['lens', '3-4', '薄透鏡成像與應用', '從兩條光線找出像，再用公式確認距離、正倒與大小。'],
    ['formulas', '速查', '公式與解題流程', '先確認條件，再代入數值。'],
    ['review', '自測', '章末練習', '這裡有 24 題單選，另有 12 題需要自己畫圖或計算的練習。']
  ];
  const saved = (() => {
    try { return JSON.parse(localStorage.getItem('physics-iii-ch03-v1')) || {}; }
    catch { return {}; }
  })();
  const done = new Set(Array.isArray(saved.done) ? saved.done : []);
  const drafts = saved.drafts && typeof saved.drafts === 'object' ? saved.drafts : {};
  const persist = () => {
    try { localStorage.setItem('physics-iii-ch03-v1', JSON.stringify({ done: [...done], drafts })); }
    catch { /* Reading and grading still work without storage. */ }
  };
  const nav = $('navigation');
  const lesson = $('lesson');
  const practice = $('practice');
  const title = $('lesson-title');
  const letters = 'ABC';
  let current;

  function updateNav() {
    nav.innerHTML = chapters.map(([key, code, label]) =>
      '<a href="#' + key + '"' + (key === current ? ' aria-current="page"' : '') + '><span class="nav-code">' + code +
      '</span><span>' + label + '</span>' + (done.has(key) ? '<span class="nav-state" aria-label="已完成">✓</span>' : '') + '</a>').join('');
    const count = chapters.slice(0, 5).filter(([key]) => done.has(key)).length;
    $('meter').value = count;
    $('progress-label').textContent = '已完成 ' + count + '／5 節';
  }

  function renderPage(moveFocus = false) {
    const requested = location.hash.slice(1);
    const index = Math.max(0, chapters.findIndex(([key]) => key === requested));
    const [key, code, label, lede] = chapters[index];
    current = key;
    $('section-code').textContent = index === 0 ? '第三章 · 從零開始' : index < 5 ? '第三章 · ' + code : '第三章 · 複習';
    title.textContent = label;
    $('lesson-lede').textContent = lede;
    lesson.innerHTML = lessons[key].content;
    if (key === 'formulas') lesson.insertAdjacentHTML('afterbegin', formulaTable());
    if (key === 'review') lesson.insertAdjacentHTML('beforeend', '<details><summary>展開資料來源</summary>' + lessons.sources.content + '</details>');
    for (const table of lesson.querySelectorAll('table')) {
      const wrapper = document.createElement('div');
      wrapper.className = 'table-wrap';
      table.before(wrapper);
      wrapper.append(table);
    }
    if (key === 'basics' || key === 'snell' || key === 'tir') buildLab(key, refractionLab);
    if (key === 'color') buildLab(key, rainbowLab);
    if (key === 'lens') buildLab(key, lensLab);
    $('lesson-footer').hidden = index >= 5;
    $('complete').checked = done.has(key);
    $('pager').innerHTML = (index ? '<a class="button secondary" href="#' + chapters[index - 1][0] + '">← 上一節</a>' : '<span></span>') +
      (index < 4 ? '<a class="button" href="#' + chapters[index + 1][0] + '">下一節 →</a>' : '<a class="button" href="#review">章末練習 →</a>');
    updateNav();
    renderQuiz(key);
    if (moveFocus) {
      title.focus({ preventScroll: true });
      window.scrollTo(0, 0);
    }
  }

  function formulaTable() {
    return '<div class="table-wrap"><table><thead><tr><th>公式</th><th>使用條件</th></tr></thead><tbody>' +
      '<tr><td>n = c/v；v = fλ</td><td>靜止界面兩側同一束光頻率不變；n 越大，速率與波長越小。</td></tr>' +
      '<tr><td>n₁ sin i = n₂ sin t</td><td>角度從法線量；1 是入射側，2 是透射側。</td></tr>' +
      '<tr><td>sin θc = n₂/n₁</td><td>只在 n₁ &gt; n₂ 時有臨界角；i &gt; θc 才是全反射。</td></tr>' +
      '<tr><td>視深 ≈ 真深 × n觀察側/n物體側</td><td>平界面、小角度、單一物體側介質。</td></tr>' +
      '<tr><td>側移 = d sin(i−t)/cos t</td><td>平行板兩側同介質，i ≥ t，d 是垂直厚度。</td></tr>' +
      '<tr><td>1/f = 1/p + 1/q；m = −q/p</td><td>薄透鏡、近軸光線；f 正為會聚，q 正為實像，m 正為正立（真實物體）。</td></tr></tbody></table></div>';
  }

  function renderQuiz(key) {
    const questions = key === 'review' ? Object.values(quiz).flat() : quiz[key];
    if (!questions) { practice.replaceChildren(); return; }
    const mode = key === 'review' ? '章末單選測驗' : '本節小測';
    const answers = Array.isArray(drafts[key]?.answers) ? drafts[key].answers.slice(0, questions.length) : [];
    let graded = drafts[key]?.graded === true && questions.every((_, i) => Number.isInteger(answers[i]));
    practice.innerHTML = '<section class="quiz"><h2>' + mode + ' · ' + questions.length + ' 題</h2><form></form></section>';
    const form = practice.querySelector('form');
    questions.forEach(([question, choices], i) => {
      const field = document.createElement('fieldset');
      const legend = document.createElement('legend');
      legend.textContent = (i + 1) + '. ' + question;
      field.append(legend);
      choices.forEach((choice, j) => {
        const label = document.createElement('label');
        label.className = 'option';
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'quiz-' + i;
        radio.value = j;
        radio.checked = answers[i] === j;
        label.append(radio, document.createTextNode(letters[j] + '．' + choice));
        field.append(label);
      });
      field.insertAdjacentHTML('beforeend', '<p class="feedback" hidden></p>');
      form.append(field);
    });
    form.insertAdjacentHTML('beforeend', '<p class="alert" role="alert"></p><div class="scoreline"><button type="submit">送出作答</button><button type="button" class="secondary retry" hidden>重新作答</button><output aria-live="polite"></output></div>');
    const alert = form.querySelector('.alert');
    const fields = [...form.querySelectorAll('fieldset')];
    const score = form.querySelector('output');
    const submit = form.querySelector('[type="submit"]');
    const retry = form.querySelector('.retry');
    const store = () => { drafts[key] = { answers, graded }; persist(); };
    function refreshQuiz() {
      let correct = 0;
      fields.forEach((field, i) => {
        field.disabled = graded;
        const note = field.querySelector('.feedback');
        note.hidden = !graded;
        if (!graded) return;
        const right = answers[i] === questions[i][2];
        correct += Number(right);
        note.classList.toggle('wrong', !right);
        note.textContent = (right ? '答對' : '答錯') + ' · 正確答案 ' + letters[questions[i][2]] + '。' + questions[i][3];
      });
      score.textContent = graded ? '答對 ' + correct + '／' + questions.length + ' 題' : '';
      retry.hidden = !graded;
      submit.hidden = graded;
    }
    form.addEventListener('change', e => {
      if (graded || e.target.type !== 'radio') return;
      answers[Number(e.target.name.slice(5))] = Number(e.target.value);
      alert.textContent = '';
      store();
    });
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (graded) return;
      const missing = questions.findIndex((_, i) => !Number.isInteger(answers[i]));
      if (missing !== -1) {
        alert.textContent = '還有題目未作答，先完成第 ' + (missing + 1) + ' 題。';
        fields[missing].querySelector('input').focus();
        return;
      }
      graded = true;
      store();
      refreshQuiz();
      retry.focus();
    });
    retry.addEventListener('click', () => {
      graded = false;
      answers.length = 0;
      form.reset();
      for (const input of form.querySelectorAll('input')) input.checked = false;
      store();
      refreshQuiz();
      fields[0].querySelector('input').focus();
    });
    refreshQuiz();
  }

  const rad = Math.PI / 180;
  const fmt = (n, digits = 1) => Number(n.toFixed(digits)).toString();
  const line = (x1, y1, x2, y2, style = '') => '<path d="M' + x1 + ' ' + y1 + 'L' + x2 + ' ' + y2 + '" ' + style + '/>';
  const text = (x, y, label, options = '') => '<text x="' + x + '" y="' + y + '" ' + options + '>' + label + '</text>';
  const ray = (a, b, color = 'green', dashed = false) => line(...a, ...b, 'stroke="' + (color === 'green' ? '#00766b' : '#ad4b20') + '" stroke-width="3"' +
    (dashed ? ' stroke-dasharray="6 5"' : ' marker-end="url(#ray-' + color + ')"'));
  const svgFrame = inner => '<defs><marker id="ray-green" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#00766b"/></marker>' +
    '<marker id="ray-orange" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#ad4b20"/></marker>' +
    '<clipPath id="optic-plot"><rect x="12" y="8" width="576" height="284"/></clipPath></defs>' +
    '<g fill="#182622" font-family="system-ui,sans-serif" font-size="19">' + inner + '</g>';
  const range = (name, label, min, max, step, value) => '<label><span class="range-heading"><span>' + label +
    '</span><span class="range-value" data-value-for="' + name + '" aria-hidden="true"></span></span><input name="' + name +
    '" type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + value + '"></label>';
  const select = (name, label, values, initial) => '<label>' + label + '<select name="' + name + '">' + values.map(([value, text]) => '<option value="' + value + '"' + (value === initial ? ' selected' : '') + '>' + text + '</option>').join('') + '</select></label>';
  const materials = [[1, '空氣 · 1.00'], [4 / 3, '水 · 1.33'], [1.5, '玻璃 · 1.50'], [2.42, '鑽石 · 2.42']];

  function buildLab(key, factory) {
    const section = document.createElement('section');
    section.className = 'lab';
    const config = factory(key);
    section.innerHTML = '<h2>' + config.title + '</h2><figure><svg viewBox="0 0 600 300" role="img" aria-label="' + config.title + '"></svg><figcaption>' +
      config.caption + '</figcaption></figure><div class="lab-controls">' + config.controls + '</div>' +
      (config.presets ? '<div class="lab-presets" role="group" aria-label="實驗預設值">' + config.presets.buttons.map(label =>
        '<button type="button" class="secondary">' + label + '</button>').join('') + '</div>' : '') +
      '<p class="readout" aria-live="polite"></p>';
    lesson.querySelector('h3')?.before(section);
    if (!section.isConnected) lesson.append(section);
    const controls = Object.fromEntries([...section.querySelectorAll('input, select')].map(node => [node.name, node]));
    const svg = section.querySelector('svg');
    const status = section.querySelector('.readout');
    const presetRow = section.querySelector('.lab-presets');
    const buttons = [...(presetRow?.querySelectorAll('button') ?? [])];
    const readControls = () => Object.fromEntries(Object.entries(controls).map(([name, node]) => [name, +node.value]));
    let exactValue = null;
    const draw = () => {
      const values = readControls();
      if (config.presets) {
        const { name, values: presetsFor } = config.presets;
        if (exactValue !== null) values[name] = exactValue;
        const presets = presetsFor(values);
        presetRow.hidden = !presets;
        if (presets) buttons.forEach((button, i) => button.setAttribute('aria-pressed', String(Math.abs(values[name] - presets[i]) < 1e-9)));
      }
      for (const [name, unit] of Object.entries(config.units ?? {})) {
        const reading = (exactValue !== null ? '約 ' : '') + fmt(values[name]) + unit;
        section.querySelector('[data-value-for="' + name + '"]').textContent = reading;
        controls[name].setAttribute('aria-valuetext', reading);
      }
      const [markup, message] = config.draw(values);
      svg.innerHTML = svgFrame(markup);
      status.textContent = message;
    };
    buttons.forEach((button, i) => button.addEventListener('click', () => {
      const { name, values: presetsFor } = config.presets;
      const target = presetsFor(readControls())?.[i];
      if (target === undefined) return;
      controls[name].value = target;
      // The thumb snaps to its native step, but the critical-angle model uses the exact value.
      exactValue = Math.abs(+controls[name].value - target) > 1e-9 ? target : null;
      draw();
    }));
    section.addEventListener('input', () => { exactValue = null; draw(); });
    draw();
  }

  function refractionLab(key) {
    const tir = key === 'tir';
    return {
      title: tir ? '實驗｜找出全反射的分界' : '實驗｜光往法線哪一邊彎？',
      caption: '綠：入射與折射光。橘：反射光。虛線：法線。角度從法線量；光線粗細不代表亮度。',
      units: { i: '°' },
      presets: {
        name: 'i', buttons: ['臨界角前 1°', '臨界角', '臨界角後 1°'],
        values: ({ n1, n2 }) => {
          if (n1 <= n2) return null;
          const critical = Math.asin(n2 / n1) / rad;
          return [Math.round((critical - 1) * 10) / 10, critical, Math.round((critical + 1) * 10) / 10];
        }
      },
      controls: select('n1', '入射介質 n₁', materials, tir ? 1.5 : 1) +
        select('n2', '第二介質 n₂', materials, tir ? 1 : 4 / 3) + range('i', '入射角 i', 0, 85, 0.1, 45),
      draw({ n1, n2, i }) {
        const theta = i * rad;
        const s = n1 * Math.sin(theta) / n2;
        const total = s > 1 + 1e-9;
        const grazing = n1 > n2 && Math.abs(s - 1) < 1e-9;
        const t = total ? NaN : grazing ? Math.PI / 2 : Math.asin(s);
        const O = [300, 150];
        const a = [300 - 128 * Math.sin(theta), 150 - 128 * Math.cos(theta)];
        const r = [300 + 128 * Math.sin(theta), 150 - 128 * Math.cos(theta)];
        const T = [300 + 128 * Math.sin(t), 150 + 128 * Math.cos(t)];
        const critical = n1 > n2 ? Math.asin(n2 / n1) / rad : null;
        const arc = (start, end, radius, label) => {
          if (end - start < 14) return '';
          const point = (angle, d) => [300 + d * Math.cos(angle * rad), 150 + d * Math.sin(angle * rad)];
          const [x, y] = point((start + end) / 2, radius + 14);
          return '<path d="M' + point(start, radius).join(' ') + 'A' + radius + ' ' + radius + ' 0 0 1 ' +
            point(end, radius).join(' ') + '" fill="none" stroke="#53635d"/>' +
            text(x, y, label, 'text-anchor="middle" dominant-baseline="middle" font-style="italic"');
        };
        const diagram = '<rect width="600" height="150" fill="#f8faf4"/><rect y="150" width="600" height="150" fill="#e5eee9"/>' +
          line(18, 150, 582, 150, 'stroke="#53635d" stroke-width="2"') +
          line(300, 15, 300, 285, 'stroke="#53635d" stroke-dasharray="5 5"') +
          text(20, 36, '入射側 n₁ = ' + fmt(n1, 2)) + text(20, 278, '第二介質 n₂ = ' + fmt(n2, 2)) +
          ray(a, O) + (i !== 0 && n1 !== n2 ? ray(O, r, 'orange') : '') + (total ? '' : ray(O, T)) +
          arc(-90 - i, -90, 41, 'i') + (n1 !== n2 ? arc(-90, -90 + i, 41, 'r') : '') +
          (total ? '' : arc(90 - t / rad, 90, 41, 't')) +
          '<circle cx="300" cy="150" r="4" fill="#182622"/>';
        const direction = i === 0 ? '正入射，方向不偏折' : n1 === n2 ? '折射率相同，方向不變' :
          grazing ? '臨界情況，折射方向沿界面' : total ? '全反射，沒有穿入第二介質的折射光' :
          n1 < n2 ? '折射光靠近法線' : '折射光遠離法線';
        return [diagram, 'i = ' + fmt(i) + '° · ' + (total ? 'sin t = ' + fmt(s, 3) + ' > 1' : 't = ' + fmt(t / rad) + '°') +
          (critical === null ? ' · 無臨界角' : ' · θc ≈ ' + fmt(critical) + '°') + ' · ' + direction];
      }
    };
  }

  const spectrum = [
    [650, 1.331, '#bf312b', '紅'], [610, 1.332, '#d05c2c', '橙'], [580, 1.333, '#a78300', '黃'],
    [540, 1.335, '#407b38', '綠'], [490, 1.337, '#237a8e', '青'], [460, 1.339, '#435aa3', '藍'],
    [410, 1.343, '#754397', '紫']
  ];
  function rainbowLab() {
    return {
      title: '實驗｜從反太陽方向量彩虹',
      caption: '每一條弧代表一種色光的典型觀察角。位置對應角半徑，不是水滴的大小。',
      controls: select('bounces', '水滴內反射次數', [[1, '1 次 · 主虹'], [2, '2 次 · 副虹']], 1) +
        select('color', '標記色光', spectrum.map(([w, , , label]) => [w, label + '光 · ' + w + ' nm']), 650),
      draw({ bounces, color }) {
        const radius = n => {
          const i = Math.acos(Math.sqrt((n * n - 1) / (bounces * (bounces + 2))));
          const r = Math.asin(Math.sin(i) / n);
          const deviation = (bounces * Math.PI + 2 * i - 2 * (bounces + 1) * r) / rad;
          return bounces === 1 ? 180 - deviation : deviation - 180;
        };
        const entry = spectrum.find(([w]) => w === color);
        const angle = radius(entry[1]);
        const x = 300;
        const y = 263;
        const scale = 4;
        const arcs = spectrum.map(([, n, hue]) => {
          const r = radius(n) * scale;
          return '<path d="M' + (x - r) + ' ' + y + 'a' + r + ' ' + r + ' 0 0 1 ' + 2 * r + ' 0" fill="none" stroke="' + hue + '" stroke-width="2.5"/>';
        }).join('');
        const direction = 28 * rad;
        const endpoint = [x + angle * scale * Math.sin(direction), y - angle * scale * Math.cos(direction)];
        return [arcs + line(x, y, ...endpoint, 'stroke="#43534c" stroke-dasharray="6 4" stroke-width="2"') +
          '<circle cx="' + endpoint[0] + '" cy="' + endpoint[1] + '" r="6" fill="' + entry[2] + '" stroke="white" stroke-width="2"/>' +
          '<circle cx="300" cy="263" r="4" fill="#182622"/>' + text(300, 289, '反太陽方向', 'text-anchor="middle"'),
        (bounces === 1 ? '主虹 · 外紅內紫' : '副虹 · 外紫內紅') + ' · ' + entry[3] + '光角半徑約 ' + fmt(angle) + '°'];
      }
    };
  }

  function lensLab() {
    return {
      title: '實驗｜移動物體，找出像在哪裡',
      caption: '綠色光線先平行光軸；橘色光線穿過光心。虛線是反向延長線，只有實線是實際光路。',
      units: { p: ' cm' },
      presets: { name: 'p', buttons: ['½ f', 'f', '1½ f', '2f'], values: ({ type }) => type === 1 ? [5, 10, 15, 20] : null },
      controls: select('type', '透鏡類型', [[1, '會聚 · f = +10 cm'], [-1, '發散 · f = −10 cm']], 1) +
        range('p', '物距 p', 3.5, 35, 0.5, 15),
      draw({ type, p }) {
        const f = type * 10;
        const q = p === f ? Infinity : 1 / (1 / f - 1 / p);
        const m = -q / p;
        const center = 300;
        const axis = 150;
        const scale = 7;
        const height = 32;
        const obj = [center - p * scale, axis - height];
        const endX = 573;
        const yAt = (x, from, slope) => from[1] + (x - from[0]) * slope;
        const greenStart = [center, axis - height];
        const greenSlope = height / (f * scale);
        const orangeSlope = height / (p * scale);
        const image = [center + q * scale, axis - m * height];
        const visible = Number.isFinite(q) && image[0] >= 20 && image[0] <= 580 && image[1] >= 17 && image[1] <= 285;
        const label = visible ? (q > 0 ? '實像' : '虛像') : '';
        const focus = Math.abs(f) * scale;
        const dash = 'stroke="#53635d" stroke-width="2" stroke-dasharray="5 4"';
        const objectRay = line(obj[0], axis, ...obj, 'stroke="#182622" stroke-width="4"');
        let inner = line(14, axis, 586, axis, 'stroke="#53635d" stroke-width="1.5"') +
          line(center, 27, center, 270, 'stroke="#53635d" stroke-width="3"') +
          [center - focus, center + focus].map(x => line(x, axis - 5, x, axis + 5, 'stroke="#53635d" stroke-width="2"') + text(x, axis + 26, 'F', 'text-anchor="middle"')).join('') +
          text(center, axis + 26, 'O', 'text-anchor="middle"') + '<g clip-path="url(#optic-plot)">' +
          (q < 0 ? line(...greenStart, ...image, dash) + line(...obj, ...image, dash) : '') +
          ray(obj, greenStart) + ray(greenStart, [endX, yAt(endX, greenStart, greenSlope)]) +
          ray(obj, [endX, yAt(endX, obj, orangeSlope)], 'orange') + objectRay;
        if (visible) inner += line(image[0], axis, ...image, q > 0 ? 'stroke="#182622" stroke-width="4"' : dash) +
          '<circle cx="' + image[0] + '" cy="' + image[1] + '" r="5" fill="#182622"/>';
        inner += '</g>' + text(obj[0], obj[1] - 9, '物', 'text-anchor="middle"');
        if (visible) inner += text(image[0], image[1] < axis ? image[1] - 10 : image[1] + 22, label, 'text-anchor="middle"');
        const size = Math.abs(Math.abs(m) - 1) < 1e-9 ? '等大' : Math.abs(m) > 1 ? '放大' : '縮小';
        return [inner, 'p = ' + fmt(p) + ' cm · ' + (Number.isFinite(q) ?
          'q = ' + fmt(q) + ' cm · m = ' + fmt(m, 2) + ' · ' + (q > 0 ? '倒立' + size + '實像' : '正立' + size + '虛像') + (visible ? '' : '（像在圖框外）') :
          'p = f，出射光平行 · 沒有有限距離的像')];
      }
    };
  }

  $('complete').addEventListener('change', e => {
    if (e.target.checked) done.add(current); else done.delete(current);
    persist();
    updateNav();
  });
  window.addEventListener('hashchange', () => renderPage(true));
  renderPage();
})();
