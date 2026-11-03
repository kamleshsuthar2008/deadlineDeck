/**
 * DeadlineDeck - Marks and Percentage Calculator Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  await Auth.init(true);

  setupSingleCalculator();
  setupTargetCalculator();
});

function setupSingleCalculator() {
  const obtainedInput = document.getElementById('calc-obtained');
  const maxInput = document.getElementById('calc-maximum');
  const resultDisplay = document.getElementById('single-pct-result');

  function calculate() {
    const obtained = Number(obtainedInput.value) || 0;
    const max = Number(maxInput.value) || 0;

    if (max <= 0) {
      resultDisplay.textContent = 'Invalid maximum';
      resultDisplay.style.color = 'var(--status-coral-text)';
      return;
    }

    const pct = Math.round((obtained / max) * 1000) / 10;
    resultDisplay.textContent = `${pct.toFixed(1)}%`;
    resultDisplay.style.color = 'var(--accent)';
  }

  obtainedInput.addEventListener('input', calculate);
  maxInput.addEventListener('input', calculate);
  calculate();
}

function setupTargetCalculator() {
  const internalScoreInput = document.getElementById('tgt-internal-pct');
  const internalWeightInput = document.getElementById('tgt-internal-weight');
  const desiredGradeInput = document.getElementById('tgt-desired-grade');

  const resultDisplay = document.getElementById('tgt-score-result');
  const breakdownSub = document.getElementById('tgt-breakdown-sub');

  function calculateTarget() {
    const internalScore = Number(internalScoreInput.value) || 0;
    const internalWeight = Number(internalWeightInput.value) || 0;
    const desiredGrade = Number(desiredGradeInput.value) || 0;

    if (internalWeight <= 0 || internalWeight >= 100) {
      resultDisplay.textContent = 'Invalid weight';
      resultDisplay.style.color = 'var(--status-coral-text)';
      return;
    }

    const examWeight = 100 - internalWeight;
    const internalContribution = (internalScore * internalWeight) / 100;
    const pointsNeeded = desiredGrade - internalContribution;

    breakdownSub.textContent = `Internal contribution: ${internalContribution.toFixed(1)} pts. Final exam weight: ${examWeight}%.`;

    if (pointsNeeded <= 0) {
      resultDisplay.textContent = '0.0% (Already achieved)';
      resultDisplay.style.color = 'var(--status-teal-text)';
      return;
    }

    const requiredExamPct = Math.round((pointsNeeded / examWeight) * 1000) / 10;

    if (requiredExamPct > 100) {
      resultDisplay.textContent = `${requiredExamPct.toFixed(1)}% (Impossible)`;
      resultDisplay.style.color = 'var(--status-coral-text)';
    } else {
      resultDisplay.textContent = `${requiredExamPct.toFixed(1)}%`;
      resultDisplay.style.color = 'var(--status-teal-text)';
    }
  }

  internalScoreInput.addEventListener('input', calculateTarget);
  internalWeightInput.addEventListener('input', calculateTarget);
  desiredGradeInput.addEventListener('input', calculateTarget);
  calculateTarget();
}
