/**
 * DeadlineDeck - Word and Character Counter Tool
 */

document.addEventListener('DOMContentLoaded', async () => {
  await Auth.init(true);

  const textarea = document.getElementById('text-input');
  const targetInput = document.getElementById('input-target-words');
  const clearBtn = document.getElementById('btn-clear-text');

  function analyzeText() {
    const text = textarea.value;

    // Characters with spaces
    const charsWithSpaces = text.length;

    // Characters without spaces
    const charsNoSpaces = text.replace(/\s/g, '').length;

    // Words
    const words = text.trim() ? text.trim().split(/\s+/).filter(Boolean) : [];
    const wordCount = words.length;

    // Paragraphs
    const paragraphs = text.split(/\n+/).filter(p => p.trim().length > 0);
    const paragraphCount = paragraphs.length;

    // Approximate reading time (200 words per minute)
    const readingMinutes = Math.ceil(wordCount / 200);

    // Target calculation
    const target = Number(targetInput.value) || 500;
    const pct = target > 0 ? Math.min(Math.round((wordCount / target) * 100), 100) : 0;

    // DOM updates
    document.getElementById('cnt-words').textContent = wordCount;
    document.getElementById('cnt-chars-spaces').textContent = charsWithSpaces;
    document.getElementById('cnt-chars-nospaces').textContent = charsNoSpaces;
    document.getElementById('cnt-paragraphs').textContent = paragraphCount;
    document.getElementById('cnt-reading-time').textContent = `${readingMinutes} min`;

    document.getElementById('target-stat-text').textContent = `${wordCount} / ${target} words (${pct}%)`;
    document.getElementById('target-bar-fill').style.width = `${pct}%`;
  }

  textarea.addEventListener('input', analyzeText);
  targetInput.addEventListener('input', analyzeText);

  clearBtn.addEventListener('click', () => {
    textarea.value = '';
    analyzeText();
    textarea.focus();
  });

  analyzeText();
});
