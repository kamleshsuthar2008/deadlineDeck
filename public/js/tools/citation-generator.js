/**
 * DeadlineDeck - Citation Generator Tool Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  await Auth.init(true);

  const form = document.getElementById('citation-form');
  const resultBox = document.getElementById('citation-result-box');
  const resultText = document.getElementById('citation-text');
  const resultLabel = document.getElementById('result-format-label');
  const copyBtn = document.getElementById('btn-copy-cite');
  const sampleBtn = document.getElementById('btn-sample-cite');
  const clearBtn = document.getElementById('btn-clear-cite');

  function generateCitation() {
    const isAPA = document.getElementById('radio-apa').checked;
    const author = document.getElementById('cite-author').value.trim();
    const year = document.getElementById('cite-year').value.trim();
    const title = document.getElementById('cite-title').value.trim();
    const publisher = document.getElementById('cite-publisher').value.trim();
    const url = document.getElementById('cite-url').value.trim();

    let formatted = '';

    if (isAPA) {
      resultLabel.textContent = 'Formatted APA (7th Edition) Reference';
      // Format: Author (Year). Title. Publisher. URL
      formatted = `${author} (${year}). <em>${title}</em>.`;
      if (publisher) formatted += ` ${publisher}.`;
      if (url) formatted += ` ${url}`;
    } else {
      resultLabel.textContent = 'Formatted IEEE Reference';
      // Format: Author, "Title," Publisher, Year. [Online]. Available: URL
      formatted = `${author}, "${title},"`;
      if (publisher) formatted += ` ${publisher},`;
      formatted += ` ${year}.`;
      if (url) formatted += ` [Online]. Available: ${url}`;
    }

    resultText.innerHTML = formatted;
    resultBox.style.display = 'flex';
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    generateCitation();
  });

  sampleBtn.addEventListener('click', () => {
    document.getElementById('cite-author').value = 'Silberschatz, A., Korth, H. F., & Sudarshan, S.';
    document.getElementById('cite-year').value = '2020';
    document.getElementById('cite-title').value = 'Database System Concepts (7th ed.)';
    document.getElementById('cite-publisher').value = 'McGraw-Hill Education';
    document.getElementById('cite-url').value = 'https://www.db-book.com';
    generateCitation();
  });

  clearBtn.addEventListener('click', () => {
    form.reset();
    resultBox.style.display = 'none';
  });

  copyBtn.addEventListener('click', () => {
    // Strip HTML tags for clean clipboard paste
    const plainText = resultText.textContent || resultText.innerText;
    navigator.clipboard.writeText(plainText).then(() => {
      UI.showToast('Reference copied to clipboard.');
    }).catch(() => {
      UI.showToast('Failed to copy. Please select and copy manually.', 'error');
    });
  });
});
