document.addEventListener('DOMContentLoaded', () => {
  // すべてのコピーボタンを取得
  const copyButtons = document.querySelectorAll('.copy-trigger-btn');

  copyButtons.forEach(copyButton => {
    copyButton.addEventListener('click', () => {
      // 1. ボタンから最も近い親のコンテナ(.code-copy-block)を特定
      const container = copyButton.closest('.code-copy-block');
      
      if (!container) {
        console.error('親コンテナ(.code-copy-block)が見つかりません。');
        return;
      }

      // 2. そのコンテナ内からコピー対象のコード要素を探す
      const codeElement = container.querySelector('.code-to-copy');
      
      if (!codeElement) {
        console.error('コード要素(.code-to-copy)が見つかりません。');
        return;
      }

      // 3. コピー処理を実行
      const codeToCopy = codeElement.textContent;

      navigator.clipboard.writeText(codeToCopy)
        .then(() => {
          // 成功時のフィードバック
          const originalText = copyButton.textContent;
          copyButton.textContent = 'コピー完了!';
          copyButton.disabled = true;

          // 3秒後にボタンの表示を元に戻す
          setTimeout(() => {
            copyButton.textContent = originalText;
            copyButton.disabled = false;
          }, 3000);
        })
        .catch(err => {
          console.error('コピーに失敗しました: ', err);
          alert('コピーに失敗しました。手動でコピーしてください。');
        });
    });
  });
});
