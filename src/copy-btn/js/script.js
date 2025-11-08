/**
 * @fileoverview
 * フラッシュカード機能の初期化スクリプト。
 * ページ内の .fc-root 要素ごとに独立して動作し、
 * モード切替（学習/出題）に応じた表示制御、シャッフル、アクセシビリティ（A11y）、
 * およびフォーカスの自動管理を提供します。
 */

document.addEventListener('DOMContentLoaded', () => {
    // ページ内のすべてのフラッシュカードセット（.fc-root）を初期化
    document.querySelectorAll('.fc-root').forEach((root, rootIndex) => {
        const container = root.querySelector('.fc-card-container');
        const radios = Array.from(root.querySelectorAll('input[name="fc-flashcard-mode"]'));

        if (!container) {
            console.warn('Flashcard: .fc-card-container not found in root element.', root);
            return;
        }

        /**
         * @type {HTMLElement[]} 初期のカード並び（要素参照の配列）。イベントリスナは生きたまま。
         */
        const originalOrder = Array.from(container.querySelectorAll('.fc-card'));

        // --- ID 自動生成と A11y 関連付け ---

        // HTML側で手動設定の手間を省くため、実行時にIDを動的に生成し関連付ける。
        originalOrder.forEach((card, cardIndex) => {
            const btn = card.querySelector('.fc-toggle-answer-btn');
            const answer = card.querySelector('.fc-answer');

            if (btn && answer) {
                // fc-rootインデックスとカードインデックスに基づきユニークIDを生成
                const uniqueId = `fc-answer-${rootIndex}-${cardIndex}`;

                // 解答要素にIDを設定
                if (!answer.id) answer.setAttribute('id', uniqueId);

                // ボタンの aria-controls にIDを設定
                if (!btn.getAttribute('aria-controls')) {
                    btn.setAttribute('aria-controls', answer.id || uniqueId);
                }
            }
        });

        // --- ユーティリティ関数 ---

        /**
         * 配列をシャッフルする（Fisher-Yatesアルゴリズム）。
         * @param {Array} arr シャッフル対象の配列。
         * @returns {Array} シャッフルされた新しい配列。
         */
        const shuffleArray = (arr) => {
            const a = arr.slice(); // 非破壊的なコピー
            for (let i = a.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [a[i], a[j]] = [a[j], a[i]];
            }
            return a;
        };

        /**
         * カードコンテナ内の要素を並び替え、フォーカスを復元または移動する。
         * @param {HTMLElement[]} cards 再配置するカード要素の配列。
         */
        const updateCardDisplay = (cards) => {
            const activeElement = document.activeElement;

            // 既存の子要素をすべて削除し、新しい順序で再配置
            container.innerHTML = '';
            cards.forEach((c) => container.appendChild(c));

            // フォーカス復元: 並び替え前にフォーカスされていた要素がまだDOM上にあれば復元
            if (activeElement instanceof HTMLElement && root.contains(activeElement)) {
                activeElement.focus({ preventScroll: true });
            } else {
                // 代替: 最初のトグルボタンにフォーカスを移動（A11y対応）
                const firstBtn = container.querySelector('.fc-toggle-answer-btn');
                if (firstBtn) firstBtn.focus({ preventScroll: true });
            }
        };

        /**
         * 現在選択されているフラッシュカードのモードを取得する。
         * @returns {'study' | 'quiz'} 現在のモード。未選択の場合は 'study' を返す。
         */
        const getMode = () => {
            const checked = radios.find((r) => r.checked);
            return checked ? checked.value : 'study';
        };

        /**
         * 解答の可視状態（hidden属性）とボタンのA11y状態（aria-expanded）を同期する。
         * @param {HTMLElement | null} answerEl 解答要素（.fc-answer）。
         * @param {HTMLElement | null} btnEl トグルボタン（.fc-toggle-answer-btn）。
         * @param {boolean} visible 解答を表示するかどうか。
         */
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

        /**
         * モードに応じた表示設定を一括適用する。
         * @param {'study' | 'quiz'} mode 適用するモード。
         */
        const applyMode = (mode) => {
            container.classList.toggle('fc-game-mode-study', mode === 'study');
            container.classList.toggle('fc-game-mode-quiz', mode === 'quiz');

            const cards = Array.from(container.querySelectorAll('.fc-card'));
            cards.forEach((card) => {
                const btn = card.querySelector('.fc-toggle-answer-btn');
                const answerId = btn && btn.getAttribute('aria-controls');
                // IDがない場合もフォールバックとして .fc-answer を探す
                const answer = answerId ? card.querySelector('#' + CSS.escape(answerId)) : card.querySelector('.fc-answer');

                if (mode === 'study') {
                    // 学習モード: 答えをすべて表示
                    setAnswerVisibility(answer, btn, true);
                } else {
                    // 出題モード: 答えをすべて非表示
                    setAnswerVisibility(answer, btn, false);
                }
            });
        };

        // --- 初期化実行 ---

        // 初期モード適用（HTMLのchecked状態に基づいて適用）
        applyMode(getMode());

        // --- イベントリスナ ---

        // ラジオボタン変更イベント: モード切替と並び替えを実行
        radios.forEach((radio) => {
            radio.addEventListener('change', () => {
                const mode = getMode();

                // 並び替え: quizならシャッフル、studyなら元の順序に戻す
                const newOrder = mode === 'quiz' ? shuffleArray(originalOrder) : originalOrder;
                updateCardDisplay(newOrder);

                // モード適用（hidden/aria-expandedの更新）
                applyMode(mode);
            });
        });

        // クリックイベント委譲: 解答トグルボタンの処理
        root.addEventListener('click', (ev) => {
            const btn = ev.target.closest('.fc-toggle-answer-btn');

            // クリック対象がボタンでない、または現在のフラッシュカードセット外なら無視
            if (!btn || !root.contains(btn)) return;

            // studyモードではボタンが非表示になっているはずだが、念のためquizモードでのみ実行
            if (!container.classList.contains('fc-game-mode-quiz')) return;

            const answerId = btn.getAttribute('aria-controls');
            let answer = null;

            if (answerId) {
                // 1. aria-controlsのIDで対応する解答要素を検索
                answer = root.querySelector('#' + CSS.escape(answerId));
            }

            // IDが見つからない場合のフォールバック（隣接要素）
            if (!answer) {
                answer = btn.nextElementSibling && btn.nextElementSibling.classList.contains('fc-answer')
                    ? btn.nextElementSibling
                    : null;
            }

            if (!answer) return;

            // 現在の表示状態を反転させて適用
            const isHidden = answer.hasAttribute('hidden');
            setAnswerVisibility(answer, btn, isHidden);
        });
    });
});
