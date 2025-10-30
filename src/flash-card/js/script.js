
/**
 * フラッシュカード初期化
 * - .fc-root ごとに独立動作（複数設置に強い）
 * - A11y: hidden/aria-expanded を同期
 * - モード切替時のシャッフル、フォーカス復元に対応
 */
document.addEventListener('DOMContentLoaded', () => {
  // ページ内すべての .fc-root を初期化
  document.querySelectorAll('.fc-root').forEach((root) => {
    const container = root.querySelector('.fc-card-container');
    const radios = Array.from(root.querySelectorAll('input[name="fc-flashcard-mode"]'));

    if (!container) return;

    // 初期のカード並びを保存（要素参照の配列：イベントリスナは生きたまま）
    const originalOrder = Array.from(container.querySelectorAll('.fc-card'));

    // ユーティリティ: シャッフル（Fisher-Yates）
    const shuffleArray = (arr) => {
      const a = arr.slice(); // 破壊しないコピー
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };

    // ユーティリティ: 並び替え（フォーカス復元に配慮）
    const updateCardDisplay = (cards) => {
      const active = document.activeElement;
      const activeId = active && active.id ? active.id : null;

      // 並び替え
      container.innerHTML = '';
      cards.forEach((c) => container.appendChild(c));

      // フォーカス復元（同一要素がまだDOM上にあれば復元）
      if (active && root.contains(active)) {
        active.focus({ preventScroll: true });
      } else {
        // 代替：最初のトグルボタンにフォーカス
        const firstBtn = container.querySelector('.fc-toggle-answer-btn');
        if (firstBtn) firstBtn.focus({ preventScroll: true });
      }
    };

    // 現在モードの取得
    const getMode = () => {
      const checked = radios.find((r) => r.checked);
      return checked ? checked.value : 'study';
    };

    // 答えの可視状態を hidden / aria-expanded で同期
    const setAnswerVisibility = (answerEl, btnEl, visible) => {
      if (!answerEl || !btnEl) return;
      if (visible) {
        answerEl.removeAttribute('hidden');
        btnEl.setAttribute('aria-expanded', 'true');
        btnEl.textContent = '解答を非表示';
      } else {
        answerEl.setAttribute('hidden', '');
        btnEl.setAttribute('aria-expanded', 'false');
        btnEl.textContent = '解答を表示';
      }
    };

    // モード適用（study: 全表示・ボタン隠す / quiz: 全非表示・ボタン表示）
    const applyMode = (mode) => {
      container.classList.toggle('fc-game-mode-study', mode === 'study');
      container.classList.toggle('fc-game-mode-quiz', mode === 'quiz');

      const cards = Array.from(container.querySelectorAll('.fc-card'));
      cards.forEach((card) => {
        const btn = card.querySelector('.fc-toggle-answer-btn');
        const answerId = btn && btn.getAttribute('aria-controls');
        const answer = answerId ? card.querySelector('#' + CSS.escape(answerId)) : card.querySelector('.fc-answer');

        if (mode === 'study') {
          // 学習モード: 答えをすべて見せる
          setAnswerVisibility(answer, btn, true);
        } else {
          // 出題モード: 答えをすべて隠す
          setAnswerVisibility(answer, btn, false);
        }
      });
    };

    // 初期モード適用（学習モードが既定）
    applyMode(getMode());

    // ラジオ変更 → モード切替＋並び替え
    radios.forEach((radio) => {
      radio.addEventListener('change', (e) => {
        const mode = getMode();

        // 並び順：quiz=シャッフル / study=元に戻す
        if (mode === 'quiz') {
          const shuffled = shuffleArray(originalOrder);
          updateCardDisplay(shuffled);
        } else {
          updateCardDisplay(originalOrder);
        }

        // モード適用（hidden/aria 更新）
        applyMode(mode);
      });
    });

    // クリックイベント委譲（ボタン個別にリスナを付けず、再配置でも安定）
    root.addEventListener('click', (ev) => {
      const btn = ev.target.closest('.fc-toggle-answer-btn');
      if (!btn || !root.contains(btn)) return;

      // quizモード時のみ意味がある（studyではボタン自体が非表示）
      if (!container.classList.contains('fc-game-mode-quiz')) return;

      const answerId = btn.getAttribute('aria-controls');
      // まずは同カード内を探す（同一IDがない場合でも安全）
      let answer = answerId ? btn.closest('.fc-card')?.querySelector('#' + CSS.escape(answerId)) : null;
      if (!answer) {
        // フォールバック: 隣接の .fc-answer
        answer = btn.nextElementSibling && btn.nextElementSibling.classList.contains('fc-answer')
          ? btn.nextElementSibling
          : null;
      }
      if (!answer) return;

      const visible = answer.hasAttribute('hidden') ? false : true;
      setAnswerVisibility(answer, btn, !visible);
    });
  });
});
