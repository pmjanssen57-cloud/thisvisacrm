
(function () {
  const root = document.getElementById('smc-experience-calculator');
  if (!root) return;

  const wageTable = [
    { start: '2020-02-24', end: '2021-07-18', rates: {'1':25.50,'1.1':28.05,'1.2':30.60,'1.5':38.25,'2':51.00,'3':76.50} },
    { start: '2021-07-19', end: '2022-10-23', rates: {'1':27.00,'1.1':29.70,'1.2':32.40,'1.5':40.50,'2':54.00,'3':81.00} },
    { start: '2022-10-24', end: '2023-02-26', rates: {'1':27.76,'1.1':30.53,'1.2':33.31,'1.5':41.64,'2':55.52,'3':83.82} },
    { start: '2023-02-27', end: '2024-02-27', rates: {'1':29.66,'1.1':32.62,'1.2':35.59,'1.5':44.49,'2':59.32,'3':88.98} },
    { start: '2024-02-28', end: '2025-08-17', rates: {'1':31.61,'1.1':34.77,'1.2':37.93,'1.5':47.41,'2':63.22,'3':94.83} },
    { start: '2025-08-18', end: '2026-03-08', rates: {'1':33.56,'1.1':36.91,'1.2':40.27,'1.5':50.34,'2':67.12,'3':100.68} },
    { start: '2026-03-09', end: null, rates: {'1':35.00,'1.1':38.50,'1.2':42.00,'1.5':52.50,'2':70.00,'3':105.00} }
  ];

  const THI_LOGO_DATA_URL = "data:image/png;base64,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";
  const THI_CONTACT = {
    phone: '+64 9 486 9574',
    sms: '+64 21 357 436',
    email: 'immigration@turnerhopkins.co.nz',
    address: 'Level 1, Strand Plaza, 1–7 The Strand, Takapuna, Auckland 0622, New Zealand',
    website: 'www.turnerhopkinsimmigration.co.nz'
  };
  let lastAssessment = null;
  let lastSettings = null;

  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const DAYS_PER_MONTH = 365.2425 / 12;

  const $ = (selector, base = root) => base.querySelector(selector);
  const $$ = (selector, base = root) => Array.from(base.querySelectorAll(selector));

  function parseDate(value) {
    if (!value) return null;
    const [y, m, d] = value.split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(Date.UTC(y, m - 1, d));
  }

  function formatDate(date) {
    if (!date) return '—';
    return date.toISOString().slice(0, 10);
  }

  function addDays(date, days) {
    const next = new Date(date.getTime());
    next.setUTCDate(next.getUTCDate() + days);
    return next;
  }

  function addMonths(date, months) {
    const d = new Date(date.getTime());
    const day = d.getUTCDate();
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + months);
    const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    d.setUTCDate(Math.min(day, lastDay));
    return d;
  }

  function daysBetween(start, endExclusive) {
    if (!start || !endExclusive || endExclusive <= start) return 0;
    return Math.round((endExclusive - start) / MS_PER_DAY);
  }

  function monthsApprox(days) {
    return days / DAYS_PER_MONTH;
  }

  function fmtMonths(days) {
    const months = monthsApprox(days);
    return `${months.toFixed(1)} months (${days} days)`;
  }

  function money(value) {
    if (value === null || value === undefined || Number.isNaN(value)) return '—';
    return `$${Number(value).toFixed(2)}`;
  }

  function maxDate(a, b) {
    if (!a) return b;
    if (!b) return a;
    return a > b ? a : b;
  }

  function minDate(a, b) {
    if (!a) return b;
    if (!b) return a;
    return a < b ? a : b;
  }

  function rangesOverlap(a, b) {
    return a.start < b.end && b.start < a.end;
  }

  function subtractSegments(baseSegments, subtractingSegments) {
    let output = baseSegments.slice();
    subtractingSegments.forEach(sub => {
      const next = [];
      output.forEach(seg => {
        if (!rangesOverlap(seg, sub)) {
          next.push(seg);
          return;
        }
        if (seg.start < sub.start) {
          next.push({ start: seg.start, end: minDate(seg.end, sub.start), source: seg.source });
        }
        if (sub.end < seg.end) {
          next.push({ start: maxDate(seg.start, sub.end), end: seg.end, source: seg.source });
        }
      });
      output = next.filter(s => daysBetween(s.start, s.end) > 0);
    });
    return output;
  }

  function isSkillLevel13(level) {
    return ['1', '2', '3'].includes(String(level));
  }

  function isSkillLevel45OrNon(level) {
    return ['4', '5', 'non'].includes(String(level));
  }

  function hourlyRate(payType, payAmount, hours) {
    const amount = Number(payAmount);
    const weeklyHours = Number(hours);
    if (!amount || amount <= 0) return null;
    if (payType === 'salary') {
      if (!weeklyHours || weeklyHours <= 0) return null;
      return amount / (weeklyHours * 52);
    }
    return amount;
  }

  function findWageRate(thresholdDate, multiplier) {
    if (!thresholdDate) return null;
    const key = String(Number(multiplier));
    for (const row of wageTable) {
      const start = parseDate(row.start);
      const end = row.end ? addDays(parseDate(row.end), 1) : null;
      if (thresholdDate >= start && (!end || thresholdDate < end)) {
        return row.rates[key] ?? null;
      }
    }
    return null;
  }

  function thresholdDateFor(rowStart, rowVisaGrant, globalVisaGrant) {
    const visa = rowVisaGrant || globalVisaGrant;
    if (visa && rowStart && visa <= rowStart && addMonths(visa, 5) >= rowStart) {
      return { date: visa, reason: 'work visa grant date used because it was within five months before this period started' };
    }
    return { date: rowStart, reason: 'employment period start date used' };
  }

  function getSettings() {
    return {
      applicationDate: parseDate($('#applicationDate').value),
      pathway: $('#pathway').value,
      estimateApplicationDate: $('#estimateApplicationDate') ? $('#estimateApplicationDate').checked : false,
      globalVisaGrantDate: parseDate($('#globalVisaGrantDate').value),
      currentAnzsco: $('#currentAnzsco').value.trim(),
      currentSkillLevel: $('#currentSkillLevel').value,
      currentHourly: hourlyRate($('#currentPayType').value, $('#currentPayAmount').value, $('#currentHours').value),
      currentHours: Number($('#currentHours').value || 0),
      currentEmploymentStart: parseDate($('#currentEmploymentStart').value),
      isAmber: $('#isAmber').checked,
      isRed: $('#isRed').checked,
      isTradesList: $('#isTradesList').checked,
      employerAccredited: $('#employerAccredited').checked,
      fullTimeCurrent: $('#fullTimeCurrent').checked,
      genuineCurrent: $('#genuineCurrent').checked,
      baseSkillPoints: Number($('#baseSkillPoints').value || 0),
      incomeMultiplier: $('#incomeMultiplier').value ? Number($('#incomeMultiplier').value) : null,
      qualificationDate: parseDate($('#qualificationDate').value),
      qualificationLevel: $('#qualificationLevel').value ? Number($('#qualificationLevel').value) : null,
      qualificationRelevant: $('#qualificationRelevant').checked
    };
  }

  function getMultiplier(settings, skillLevel) {
    if (settings.pathway === 'swe') return settings.isAmber ? 1.2 : 1.1;
    if (settings.pathway === 'trades') return 1;
    if (settings.pathway === 'points') {
      if (settings.incomeMultiplier) return settings.incomeMultiplier;
      return isSkillLevel13(skillLevel) ? 1 : 1.5;
    }
    return 1;
  }

  function getRows() {
    return $$('.smc-period-row').map((tr, index) => {
      const payType = $('.period-pay-type', tr).value;
      const payAmount = $('.period-pay-amount', tr).value;
      const hours = $('.period-hours', tr).value;

      return {
        index,
        label: $('.period-label', tr).value || `Period ${index + 1}`,
        start: parseDate($('.period-start', tr).value),
        endInclusive: parseDate($('.period-end', tr).value),
        ongoing: $('.period-ongoing', tr) ? $('.period-ongoing', tr).checked : false,
        country: $('.period-country', tr).value,
        anzsco: $('.period-anzsco', tr).value.trim(),
        skillLevel: $('.period-skill-level', tr).value,
        payType,
        payAmount: Number(payAmount || 0),
        hours: Number(hours || 0),
        hourly: hourlyRate(payType, payAmount, hours),
        visaGrant: parseDate($('.period-visa-grant', tr).value),
        lawful: $('.period-lawful', tr).checked,
        direct: $('.period-direct', tr).checked,
        selfEmployed: $('.period-self', tr).checked,
        contract: $('.period-contract', tr).checked,
        payChanged: $('.period-pay-changed', tr) ? $('.period-pay-changed', tr).value === 'yes' : false,
        postQualification: $('.period-post-qualification', tr).checked
      };
    });
  }

  function clipToWindow(row, applicationDate, windowMonths) {
    if (!row.start || !applicationDate) return null;
    let rowEndInclusive = row.endInclusive;
    if (row.ongoing && (!rowEndInclusive || rowEndInclusive < applicationDate)) {
      rowEndInclusive = addDays(applicationDate, -1);
    }
    if (!rowEndInclusive) return null;
    const rowEndExclusive = addDays(rowEndInclusive, 1);
    const windowStart = addMonths(applicationDate, -windowMonths);
    const start = maxDate(row.start, windowStart);
    const end = minDate(rowEndExclusive, applicationDate);
    if (end <= start) return null;
    return { start, end };
  }

  function nzSkilledCheck(row, settings, windowMonths) {
    const reasons = [];
    if (!settings.applicationDate) reasons.push('Missing application date.');
    if (!row.start || (!row.endInclusive && !row.ongoing)) reasons.push('Missing period start or end date.');
    if (row.endInclusive && row.start && row.endInclusive < row.start) reasons.push('End date is before start date.');
    if (row.country !== 'nz') reasons.push('Not New Zealand work experience.');
    if (row.hours < 30) reasons.push('Fewer than 30 hours per week.');
    if (!row.lawful) reasons.push('Work not declared lawful.');
    if (settings.pathway === 'swe' && !isSkillLevel13(row.skillLevel)) reasons.push('Skilled Work Experience pathway requires ANZSCO skill level 1–3.');
    if (settings.pathway === 'trades' && !isSkillLevel13(row.skillLevel)) reasons.push('Trades pathway requires ANZSCO skill level 1–3.');
    if (settings.pathway === 'trades' && !settings.isTradesList) reasons.push('Current occupation is not marked as being on the Trades and Technician list.');
    if ((settings.pathway === 'swe' || settings.pathway === 'trades') && !row.direct) reasons.push('Not declared directly relevant.');
    if (settings.pathway === 'trades' && !row.postQualification) reasons.push('Not declared post-qualification.');
    if (settings.pathway === 'trades' && settings.qualificationDate && row.start < settings.qualificationDate) reasons.push('Period starts before relevant qualification completion date.');
    if (settings.pathway === 'swe' && settings.isRed) reasons.push('Red List occupation cannot use the Skilled Work Experience pathway.');
    if (settings.pathway === 'trades' && settings.isRed) reasons.push('Red List occupation cannot use the Trades and Technician pathway.');
    if (settings.pathway === 'points' && !(isSkillLevel13(row.skillLevel) || isSkillLevel45OrNon(row.skillLevel))) reasons.push('Missing or unsupported ANZSCO skill level.');

    const clipped = clipToWindow(row, settings.applicationDate, windowMonths);
    if (!clipped) reasons.push(`No overlap with the ${windowMonths}-month look-back window.`);

    const multiplier = getMultiplier(settings, row.skillLevel);
    const t = thresholdDateFor(row.start, row.visaGrant, settings.globalVisaGrantDate);
    const requiredRate = findWageRate(t.date, multiplier);

    if (requiredRate === null) reasons.push('No SMC wage threshold found for the threshold date.');
    if (row.hourly === null) reasons.push('Missing or invalid pay amount / hours.');
    if (row.payChanged) reasons.push('Pay changed during this period. Split it into separate periods for each pay rate before calculating.');
    if (requiredRate !== null && row.hourly !== null && row.hourly < requiredRate) {
      reasons.push(`Below required ${multiplier}x SMC threshold.`);
    }

    const countedDays = reasons.length ? 0 : daysBetween(clipped.start, clipped.end);
    return {
      row,
      clipped,
      thresholdDate: t.date,
      thresholdReason: t.reason,
      multiplier,
      requiredRate,
      actualHourly: row.hourly,
      countedDays,
      counted: countedDays > 0,
      reasons
    };
  }

  function directRelevantCheck(row, settings, windowMonths, nzSegmentsAlreadyUsed) {
    const reasons = [];
    if (!settings.applicationDate) reasons.push('Missing application date.');
    if (!row.start || (!row.endInclusive && !row.ongoing)) reasons.push('Missing period start or end date.');
    if (row.endInclusive && row.start && row.endInclusive < row.start) reasons.push('End date is before start date.');
    if (row.hours < 30) reasons.push('Fewer than 30 hours per week.');
    if (!isSkillLevel13(row.skillLevel)) reasons.push('Directly relevant experience must be in an ANZSCO skill level 1–3 role.');
    if (!row.direct) reasons.push('Not declared directly relevant.');
    if (row.payChanged) reasons.push('Pay changed during this period. Split it into separate periods for each pay rate before calculating.');
    if (row.selfEmployed) reasons.push('Self-employment cannot be counted for the directly relevant work experience component.');
    if (settings.pathway === 'swe' && settings.isAmber && row.country !== 'nz') {
      reasons.push('Amber List Skilled Work Experience pathway requires the 3 years directly relevant experience to be in New Zealand.');
    }
    if (settings.pathway === 'trades') {
      if (!row.postQualification) reasons.push('Not declared post-qualification.');
      if (settings.qualificationDate && row.start < settings.qualificationDate) reasons.push('Period starts before relevant qualification completion date.');
    }

    const clipped = clipToWindow(row, settings.applicationDate, windowMonths);
    if (!clipped) reasons.push(`No overlap with the ${windowMonths}-month directly relevant experience window.`);

    let segments = [];
    if (!reasons.length) {
      segments = [{ start: clipped.start, end: clipped.end, source: row }];
      segments = subtractSegments(segments, nzSegmentsAlreadyUsed);
    }

    const countedDays = segments.reduce((sum, seg) => sum + daysBetween(seg.start, seg.end), 0);
    if (!reasons.length && countedDays === 0) reasons.push('This period has already been allocated to the NZ skilled work experience component.');

    return {
      row,
      clipped,
      segments,
      countedDays: reasons.length ? 0 : countedDays,
      counted: !reasons.length && countedDays > 0,
      reasons
    };
  }

  function requiredDays(months) {
    return Math.round(months * DAYS_PER_MONTH);
  }

  function assessmentForPoints(settings, rows) {
    const windows = [
      { points: 1, months: 12, windowMonths: 24 },
      { points: 2, months: 18, windowMonths: 36 },
      { points: 3, months: 24, windowMonths: 48 }
    ];

    const resultsByWindow = windows.map(w => {
      const checks = rows.map(row => nzSkilledCheck(row, settings, w.windowMonths));
      const totalDays = checks.reduce((sum, c) => sum + c.countedDays, 0);
      return { ...w, checks, totalDays, meets: totalDays >= requiredDays(w.months) };
    });

    const best = resultsByWindow.slice().reverse().find(r => r.meets) || resultsByWindow[0];
    const experiencePoints = best.meets ? best.points : 0;
    const totalPoints = settings.baseSkillPoints + experiencePoints;

    const warnings = [];
    if (!settings.applicationDate) warnings.push('Add an intended residence application date.');
    if (!settings.employerAccredited) warnings.push('Current employer is not marked as accredited.');
    if (!settings.genuineCurrent) warnings.push('Current employment is not declared genuine.');
    if (!settings.fullTimeCurrent || settings.currentHours < 30) warnings.push('Current role may not meet the full-time requirement.');
    if (settings.isRed) warnings.push('Red List occupation is only available through the Points-based pathway, which is the selected pathway.');

    return {
      pathwayName: 'Points-based pathway',
      status: totalPoints >= 6 ? 'pass' : 'fail',
      headline: totalPoints >= 6 ? 'Potentially reaches 6 points' : 'Does not appear to reach 6 points from the entered information',
      kpis: [
        ['Base skill category points', settings.baseSkillPoints],
        ['NZ work experience points', experiencePoints],
        ['Indicative total points', totalPoints],
        ['Best countable NZ experience', fmtMonths(best.totalDays)]
      ],
      warnings,
      tables: resultsByWindow,
      best
    };
  }

  function assessmentForSWE(settings, rows) {
    const nzChecks = rows.map(row => nzSkilledCheck(row, settings, 48));
    const nzSegments = nzChecks
      .filter(c => c.counted && c.clipped)
      .map(c => ({ start: c.clipped.start, end: c.clipped.end, source: c.row }));
    const nzDays = nzChecks.reduce((sum, c) => sum + c.countedDays, 0);

    const directChecks = rows.map(row => directRelevantCheck(row, settings, 120, nzSegments));
    const directDays = directChecks.reduce((sum, c) => sum + c.countedDays, 0);

    const warnings = [];
    if (!settings.applicationDate) warnings.push('Add an intended residence application date.');
    if (settings.isRed) warnings.push('Red List occupation cannot use this pathway.');
    if (!isSkillLevel13(settings.currentSkillLevel)) warnings.push('Current employment must be ANZSCO skill level 1–3.');
    if (!settings.employerAccredited) warnings.push('Current employer is not marked as accredited.');
    if (!settings.genuineCurrent) warnings.push('Current employment is not declared genuine.');
    if (!settings.fullTimeCurrent || settings.currentHours < 30) warnings.push('Current role may not meet the full-time requirement.');

    const meetsNZ = nzDays >= requiredDays(24);
    const meetsDirect = directDays >= requiredDays(36);
    const status = warnings.some(w => w.includes('cannot use')) ? 'fail' : (meetsNZ && meetsDirect ? 'pass' : 'fail');

    return {
      pathwayName: 'Skilled Work Experience pathway',
      status,
      headline: status === 'pass' ? 'Potentially meets the work-experience components' : 'Does not appear to meet the work-experience components yet',
      kpis: [
        ['NZ skilled experience required', '24 months / prior 48 months'],
        ['Countable NZ skilled experience', fmtMonths(nzDays)],
        ['Directly relevant experience required', '36 months / prior 120 months'],
        ['Countable directly relevant experience', fmtMonths(directDays)]
      ],
      warnings,
      nzChecks,
      directChecks,
      meetsNZ,
      meetsDirect
    };
  }

  function assessmentForTrades(settings, rows) {
    const nzChecks = rows.map(row => nzSkilledCheck(row, settings, 36));
    const nzSegments = nzChecks
      .filter(c => c.counted && c.clipped)
      .map(c => ({ start: c.clipped.start, end: c.clipped.end, source: c.row }));
    const nzDays = nzChecks.reduce((sum, c) => sum + c.countedDays, 0);

    const directChecks = rows.map(row => directRelevantCheck(row, settings, 120, nzSegments));
    const directDays = directChecks.reduce((sum, c) => sum + c.countedDays, 0);

    const warnings = [];
    if (!settings.applicationDate) warnings.push('Add an intended residence application date.');
    if (settings.isRed) warnings.push('Red List occupation cannot use this pathway.');
    if (!settings.isTradesList) warnings.push('Current occupation is not marked as being on the Trades and Technician list.');
    if (!isSkillLevel13(settings.currentSkillLevel)) warnings.push('Current employment must be ANZSCO skill level 1–3.');
    if (!settings.qualificationDate) warnings.push('Add a relevant qualification completion date.');
    if (!settings.qualificationLevel || settings.qualificationLevel < 4) warnings.push('Qualification must be level 4 or higher.');
    if (!settings.qualificationRelevant) warnings.push('Qualification is not marked as relevant to the current role.');
    if (!settings.employerAccredited) warnings.push('Current employer is not marked as accredited.');
    if (!settings.genuineCurrent) warnings.push('Current employment is not declared genuine.');
    if (!settings.fullTimeCurrent || settings.currentHours < 30) warnings.push('Current role may not meet the full-time requirement.');

    const meetsNZ = nzDays >= requiredDays(18);
    const meetsDirect = directDays >= requiredDays(30);
    const hasBlockingWarning = warnings.some(w =>
      w.includes('cannot use') ||
      w.includes('not marked as being on the Trades') ||
      w.includes('level 4') ||
      w.includes('not marked as relevant')
    );
    const status = hasBlockingWarning ? 'fail' : (meetsNZ && meetsDirect ? 'pass' : 'fail');

    return {
      pathwayName: 'Trades and Technician pathway',
      status,
      headline: status === 'pass' ? 'Potentially meets the work-experience components' : 'Does not appear to meet the work-experience components yet',
      kpis: [
        ['NZ skilled experience required', '18 months / prior 36 months'],
        ['Countable NZ skilled experience', fmtMonths(nzDays)],
        ['Directly relevant experience required', '30 months / prior 120 months'],
        ['Countable directly relevant experience', fmtMonths(directDays)]
      ],
      warnings,
      nzChecks,
      directChecks,
      meetsNZ,
      meetsDirect
    };
  }

  function plainText(value) {
    const div = document.createElement('div');
    div.innerHTML = String(value ?? '');
    return div.textContent || div.innerText || '';
  }

  function renderPdfActions() {
    return `
      <div class="smc-pdf-actions smc-email-actions">
        <label class="smc-email-result-label">
          Email address for your results
          <input type="email" id="smc-results-email" placeholder="you@example.com" autocomplete="email" required>
        </label>
        <button type="button" class="smc-button smc-button-secondary" id="smc-email-results">Email my results</button>
        <p class="smc-pdf-note" id="smc-email-status">We will email your indicative summary to you and notify Turner Hopkins Immigration Specialists that the calculator has been completed.</p>
      </div>
    `;
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
  }

  function serialiseForEmail(value) {
    return JSON.parse(JSON.stringify(value || null));
  }

  function buildClientResultSummary(assessment, settings) {
    if (!assessment) return 'No assessment result is available.';
    const lines = [];
    lines.push(`Pathway assessed: ${assessment.pathwayName || 'SMC work experience'}`);
    lines.push(`Application date used: ${formatDate(settings && settings.applicationDate)}`);
    if (assessment.headline) lines.push(`Result: ${assessment.headline}`);
    if (Array.isArray(assessment.kpis) && assessment.kpis.length) {
      lines.push('');
      lines.push('Key indicators:');
      assessment.kpis.forEach(([label, value]) => lines.push(`- ${label}: ${value}`));
    }
    if (Array.isArray(assessment.warnings) && assessment.warnings.length) {
      lines.push('');
      lines.push('Items that may need review:');
      assessment.warnings.forEach((warning) => lines.push(`- ${warning}`));
    }
    return lines.join('\n');
  }

  async function emailResultSummary(button) {
    const input = $('#smc-results-email');
    const status = $('#smc-email-status');
    const recipientEmail = String(input && input.value || '').trim();
    if (!recipientEmail || !isValidEmail(recipientEmail)) {
      if (status) status.textContent = 'Please enter a valid email address before sending your results.';
      if (input) input.focus();
      return;
    }
    if (!lastAssessment || !lastSettings) {
      if (status) status.textContent = 'Please calculate your result before emailing it.';
      return;
    }
    const original = button ? button.textContent : '';
    if (button) {
      button.disabled = true;
      button.textContent = 'Sending results...';
    }
    if (status) status.textContent = 'Sending your result summary...';

    try {
      const response = await fetch('/.netlify/functions/smc-calculator', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          recipientEmail,
          payload: {
            assessment: serialiseForEmail(lastAssessment),
            settings: serialiseForEmail(lastSettings),
            rows: serialiseForEmail(getRows()),
            summaryText: buildClientResultSummary(lastAssessment, lastSettings),
            calculatorVersion: 'v0.13.22',
            sourceUrl: window.location.href,
            submittedAt: new Date().toISOString()
          }
        })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.ok) throw new Error(body.error || 'The result email could not be sent.');
      if (status) status.textContent = 'Done — your indicative results have been emailed. Please check your inbox and junk folder.';
      if (input) input.value = recipientEmail;
    } catch (error) {
      console.error(error);
      if (status) status.textContent = error.message || 'Sorry, the result email could not be sent. Please try again.';
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = original;
      }
      postSmcEmbedHeight();
    }
  }

  function wireResultEmailButton() {
    const button = $('#smc-email-results');
    if (button) button.addEventListener('click', () => emailResultSummary(button));
  }

  function postSmcEmbedHeight() {
    try {
      const height = Math.max(root.scrollHeight, document.documentElement.scrollHeight, document.body.scrollHeight);
      window.parent.postMessage({ type: 'THIS_SMC_CALCULATOR_HEIGHT', source: 'this-crm-smc-calculator', height }, '*');
    } catch {}
  }

  function loadJsPDF() {
    return new Promise((resolve, reject) => {
      if (window.jspdf && window.jspdf.jsPDF) {
        resolve(window.jspdf.jsPDF);
        return;
      }

      const existing = document.querySelector('script[data-smc-jspdf="true"]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.jspdf.jsPDF), { once: true });
        existing.addEventListener('error', () => reject(new Error('Unable to load the PDF library.')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
      script.async = true;
      script.setAttribute('data-smc-jspdf', 'true');
      script.onload = () => {
        if (window.jspdf && window.jspdf.jsPDF) resolve(window.jspdf.jsPDF);
        else reject(new Error('PDF library loaded but was not available.'));
      };
      script.onerror = () => reject(new Error('Unable to load the PDF library.'));
      document.head.appendChild(script);
    });
  }

  function getAssessmentDetailGroups(assessment, settings) {
    if (settings.pathway === 'points') {
      const bestChecks = assessment.best && assessment.best.checks ? assessment.best.checks : [];
      const windowSummaries = assessment.tables ? assessment.tables.map(t =>
        `${t.points} point check: ${fmtMonths(t.totalDays)} counted against ${t.months} months required in the prior ${t.windowMonths} months.`
      ) : [];
      return [
        { title: 'Points-based experience windows', lines: windowSummaries },
        { title: 'Period details from best/selected window', checks: bestChecks, type: 'nz' }
      ];
    }

    return [
      { title: 'NZ skilled work experience component', checks: assessment.nzChecks || [], type: 'nz' },
      { title: 'Directly relevant work experience component', checks: assessment.directChecks || [], type: 'direct' }
    ];
  }

  function describeNzCheckForPdf(c) {
    const parts = [];
    const row = c.row || {};
    parts.push(`${row.label || 'Employment period'}: ${formatDate(row.start)} to ${formatDate(row.endInclusive)}`);
    if (c.clipped) {
      parts.push(`counting window ${formatDate(c.clipped.start)} to ${formatDate(addDays(c.clipped.end, -1))}`);
    }
    parts.push(c.counted ? `Counted: ${fmtMonths(c.countedDays)}` : `Excluded: ${fmtMonths(c.countedDays)}`);
    parts.push(`required ${money(c.requiredRate)} (${c.multiplier}x SMC), actual ${money(c.actualHourly)}`);
    if (c.thresholdDate) parts.push(`threshold date ${formatDate(c.thresholdDate)}`);
    if (c.reasons && c.reasons.length) parts.push(`Reason(s): ${c.reasons.join('; ')}`);
    return parts.join(' — ');
  }

  function describeDirectCheckForPdf(c) {
    const row = c.row || {};
    const parts = [];
    parts.push(`${row.label || 'Employment period'}: ${formatDate(row.start)} to ${formatDate(row.endInclusive)}`);
    if (c.segments && c.segments.length) {
      const segs = c.segments.map(s => `${formatDate(s.start)} to ${formatDate(addDays(s.end, -1))}`).join(', ');
      parts.push(`counted segment(s): ${segs}`);
    }
    parts.push(c.counted ? `Counted: ${fmtMonths(c.countedDays)}` : `Excluded: ${fmtMonths(c.countedDays)}`);
    if (c.reasons && c.reasons.length) parts.push(`Reason(s): ${c.reasons.join('; ')}`);
    return parts.join(' — ');
  }

  function downloadPdfReport(assessment, settings, button) {
    const originalText = button ? button.textContent : '';
    if (button) {
      button.disabled = true;
      button.textContent = 'Preparing PDF...';
    }

    loadJsPDF()
      .then(jsPDF => {
        const doc = new jsPDF({ unit: 'pt', format: 'a4' });
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const margin = 44;
        const contentW = pageW - margin * 2;
        let y = 42;

        const colour = {
          dark: [0, 59, 61],
          green: [75, 220, 154],
          muted: [95, 111, 137],
          border: [197, 228, 219],
          panel: [246, 251, 249],
          danger: [155, 44, 29],
          warning: [138, 98, 0],
          success: [11, 104, 74],
          black: [31, 41, 55]
        };

        function setText(rgb) {
          doc.setTextColor(rgb[0], rgb[1], rgb[2]);
        }

        function ensureSpace(height) {
          if (y + height <= pageH - 56) return;
          addFooter();
          doc.addPage();
          y = 42;
        }

        function addFooter() {
          const pages = doc.internal.getNumberOfPages();
          doc.setPage(pages);
          doc.setDrawColor(colour.border[0], colour.border[1], colour.border[2]);
          doc.line(margin, pageH - 42, pageW - margin, pageH - 42);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.5);
          setText(colour.muted);
          doc.text('Generated by the SMC Work Experience Calculator. Indicative only — not immigration advice.', margin, pageH - 26);
          doc.text(`Page ${pages}`, pageW - margin, pageH - 26, { align: 'right' });
        }

        function addWrapped(text, x, width, size = 10.5, style = 'normal', rgb = colour.black, lineGap = 4) {
          doc.setFont('helvetica', style);
          doc.setFontSize(size);
          setText(rgb);
          const lines = doc.splitTextToSize(plainText(text), width);
          const lineHeight = size + lineGap;
          ensureSpace(lines.length * lineHeight + 2);
          doc.text(lines, x, y);
          y += lines.length * lineHeight;
        }

        function addSection(title) {
          ensureSpace(34);
          y += y > 80 ? 12 : 0;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(14);
          setText(colour.dark);
          doc.text(title, margin, y);
          y += 10;
          doc.setDrawColor(colour.border[0], colour.border[1], colour.border[2]);
          doc.line(margin, y, pageW - margin, y);
          y += 14;
        }

        function addKV(label, value) {
          ensureSpace(26);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9.5);
          setText(colour.muted);
          doc.text(plainText(label), margin, y);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10.5);
          setText(colour.black);
          const valueLines = doc.splitTextToSize(plainText(value), contentW - 170);
          doc.text(valueLines, margin + 170, y);
          y += Math.max(17, valueLines.length * 14);
        }

        function addPill(text, rgb) {
          const label = plainText(text);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9.5);
          const textW = doc.getTextWidth(label);
          doc.setFillColor(255, 255, 255);
          doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
          doc.roundedRect(margin, y - 13, textW + 18, 22, 10, 10, 'S');
          setText(rgb);
          doc.text(label, margin + 9, y + 1);
          y += 24;
        }

        function addPanel(callback) {
          const startY = y;
          callback();
          const endY = y;
          doc.setFillColor(colour.panel[0], colour.panel[1], colour.panel[2]);
          doc.setDrawColor(colour.border[0], colour.border[1], colour.border[2]);
          doc.roundedRect(margin - 10, startY - 14, contentW + 20, endY - startY + 18, 12, 12, 'FD');
          // redraw on top by rerunning callback in overlay mode is overkill; instead panels are used sparingly below.
        }

        // Header
        try {
          doc.addImage(THI_LOGO_DATA_URL, 'PNG', margin, y, 154, 67);
        } catch (e) {
          // Continue without logo if the browser/pdf library cannot embed it.
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        setText(colour.dark);
        doc.text('SMC Work Experience Estimate', pageW - margin, y + 22, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        setText(colour.muted);
        doc.text(`Generated ${new Date().toLocaleDateString('en-NZ')}`, pageW - margin, y + 42, { align: 'right' });

        y += 88;
        doc.setDrawColor(colour.border[0], colour.border[1], colour.border[2]);
        doc.line(margin, y, pageW - margin, y);
        y += 26;

        const statusColour = assessment.status === 'pass' ? colour.success : (assessment.status === 'fail' ? colour.danger : colour.warning);
        addPill(assessment.status === 'pass' ? 'Indicative pass' : 'May need review', statusColour);

        addWrapped(assessment.headline, margin, contentW, 15, 'bold', colour.dark, 4);
        y += 6;

        addSection('Assessment summary');
        addKV('Pathway assessed', assessment.pathwayName);
        addKV('Application date used', formatDate(settings.applicationDate));
        assessment.kpis.forEach(([label, value]) => addKV(label, value));

        const current = currentEmploymentCheck(settings);
        if (current) {
          addSection('Current wage indication');
          addKV('Estimated current hourly rate', money(current.actualHourly));
          addKV('Required hourly rate', `${money(current.requiredRate)} (${current.multiplier}x SMC)`);
          addKV('Threshold date used', formatDate(current.thresholdDate));
          addKV('Result', current.meets ? 'Current wage appears to meet the selected pathway threshold.' : 'Current wage does not appear to meet the selected pathway threshold.');
        }

        const groups = getAssessmentDetailGroups(assessment, settings);
        groups.forEach(group => {
          addSection(group.title);
          if (group.lines && group.lines.length) {
            group.lines.forEach(line => {
              addWrapped(`• ${line}`, margin, contentW, 10.2, 'normal', colour.black, 4);
            });
          }
          if (group.checks && group.checks.length) {
            group.checks.forEach(c => {
              const text = group.type === 'direct' ? describeDirectCheckForPdf(c) : describeNzCheckForPdf(c);
              addWrapped(`• ${text}`, margin, contentW, 9.7, 'normal', colour.black, 4);
              y += 2;
            });
          }
        });

        if (assessment.warnings && assessment.warnings.length) {
          addSection('Warnings and manual review');
          assessment.warnings.forEach(w => addWrapped(`• ${w}`, margin, contentW, 10.2, 'normal', colour.black, 4));
        } else {
          addSection('What may still need to be checked');
        }

        addWrapped('• ANZSCO substantial match.', margin, contentW, 10.2, 'normal', colour.black, 4);
        addWrapped('• Direct relevance of work experience to current skilled employment.', margin, contentW, 10.2, 'normal', colour.black, 4);
        addWrapped('• Genuine employment and evidence quality.', margin, contentW, 10.2, 'normal', colour.black, 4);

        addSection('How Turner Hopkins Immigration Specialists can help');
        addWrapped(
          'Turner Hopkins Immigration Specialists can review your circumstances, test the relevant Skilled Migrant Category pathway, identify evidence gaps, and help prepare a strategy for your residence application. A full assessment can consider issues this calculator cannot decide, including ANZSCO substantial match, direct relevance, employment evidence, and Immigration New Zealand risk points.',
          margin,
          contentW,
          10.5,
          'normal',
          colour.black,
          4
        );

        addSection('Contact details');
        addKV('Phone', THI_CONTACT.phone);
        addKV('Mobile / SMS', THI_CONTACT.sms);
        addKV('Email', THI_CONTACT.email);
        addKV('Website', THI_CONTACT.website);
        addKV('Address', THI_CONTACT.address);

        addSection('Important disclaimer');
        addWrapped(
          'This calculator provides an indication only. It estimates potentially claimable work experience using the information entered and the background wage/date rules built into the tool. It is not immigration advice, does not guarantee eligibility, and does not replace a full assessment of evidence, genuine employment, ANZSCO substantial match, or whether Immigration New Zealand would accept the claimed work experience as directly relevant.',
          margin,
          contentW,
          9.8,
          'normal',
          colour.black,
          4
        );

        addFooter();
        const filenameDate = new Date().toISOString().slice(0, 10);
        doc.save(`SMC-work-experience-estimate-${filenameDate}.pdf`);
      })
      .catch(err => {
        console.error(err);
        alert('Sorry, the PDF could not be prepared. Please check your internet connection and try again.');
      })
      .finally(() => {
        if (button) {
          button.disabled = false;
          button.textContent = originalText;
        }
      });
  }

  function currentEmploymentCheck(settings) {
    if (!settings.currentEmploymentStart || !settings.currentHourly) return null;
    const multiplier = settings.pathway === 'swe'
      ? (settings.isAmber ? 1.2 : 1.1)
      : settings.pathway === 'trades'
        ? 1
        : (settings.incomeMultiplier || (isSkillLevel13(settings.currentSkillLevel) ? 1 : 1.5));

    const t = thresholdDateFor(settings.currentEmploymentStart, null, settings.globalVisaGrantDate);
    const requiredRate = findWageRate(t.date, multiplier);
    return {
      multiplier,
      thresholdDate: t.date,
      requiredRate,
      actualHourly: settings.currentHourly,
      meets: requiredRate !== null && settings.currentHourly >= requiredRate,
      reason: t.reason
    };
  }

  function renderAssessment(assessment, settings) {
    const statusClass = assessment.status === 'pass' ? 'smc-pass' : assessment.status === 'fail' ? 'smc-fail' : 'smc-review';
    const current = currentEmploymentCheck(settings);

    let html = `
      <div class="smc-result-banner ${statusClass}">
        <span class="smc-pill ${statusClass}">${assessment.status === 'pass' ? 'Indicative pass' : 'May need review'}</span>
        <h3>${assessment.headline}</h3>
        <p class="smc-muted">
          Pathway assessed: <strong>${assessment.pathwayName}</strong>. Application date used:
          <strong>${formatDate(settings.applicationDate)}</strong>.
        </p>

        <div class="smc-kpis">
          ${assessment.kpis.map(([label, value]) => `
            <div class="smc-kpi"><strong>${value}</strong><span>${label}</span></div>
          `).join('')}
        </div>
    `;

    if (current) {
      html += `
        <p>
          <span class="smc-pill ${current.meets ? 'smc-pass' : 'smc-fail'}">Current wage ${current.meets ? 'meets' : 'does not meet'}</span>
          Estimated current hourly rate: <strong>${money(current.actualHourly)}</strong>.
          Required: <strong>${money(current.requiredRate)}</strong> (${current.multiplier}x SMC) using threshold date
          <strong>${formatDate(current.thresholdDate)}</strong>.
        </p>
      `;
    }

    if (assessment.warnings && assessment.warnings.length) {
      html += `
        <h4>Things that may need review</h4>
        <ul class="smc-list">
          ${assessment.warnings.map(w => `<li>${escapeHtml(w)}</li>`).join('')}
          <li>What may still need to be checked for ANZSCO substantial match, direct relevance, genuine employment, and evidence quality.</li>
        </ul>
      `;
    } else {
      html += `
        <h4>What may still need to be checked</h4>
        <ul class="smc-list">
          <li>ANZSCO substantial match.</li>
          <li>Direct relevance of work experience to current skilled employment.</li>
          <li>Genuine employment and evidence quality.</li>
        </ul>
      `;
    }

    html += renderPdfActions();

    html += `</div>`;

    if (settings.pathway === 'points') {
      assessment.tables.forEach(t => {
        html += renderNzTable(
          `Points-based check: ${t.points} experience point${t.points > 1 ? 's' : ''} — ${t.months} months required in prior ${t.windowMonths} months`,
          t.checks
        );
      });
    } else {
      html += renderNzTable('NZ skilled work experience component', assessment.nzChecks);
      html += renderDirectTable('Directly relevant work experience component', assessment.directChecks);
    }

    $('#smc-results').innerHTML = html;
    lastAssessment = assessment;
    lastSettings = settings;
    wireResultEmailButton();
    postSmcEmbedHeight();
  }

  function renderNzTable(title, checks) {
    return `
      <div class="smc-card">
        <h3>${title}</h3>
        <table class="smc-detail-table">
          <thead>
            <tr>
              <th>Period</th>
              <th>Threshold date</th>
              <th>Required / actual</th>
              <th>Counted time</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            ${checks.map(c => `
              <tr>
                <td>
                  <strong>${escapeHtml(c.row.label)}</strong><br>
                  ${formatDate(c.row.start)} to ${c.row.ongoing ? "current / projected to application date" : formatDate(c.row.endInclusive)}
                  ${c.clipped ? `<br><span class="smc-small">Clipped to ${formatDate(c.clipped.start)} – ${formatDate(addDays(c.clipped.end, -1))}</span>` : ''}
                </td>
                <td>
                  ${formatDate(c.thresholdDate)}<br>
                  <span class="smc-small">${escapeHtml(c.thresholdReason || '')}</span>
                </td>
                <td>
                  Required: <strong>${money(c.requiredRate)}</strong> (${c.multiplier}x)<br>
                  Actual: <strong>${money(c.actualHourly)}</strong>
                </td>
                <td>${fmtMonths(c.countedDays)}</td>
                <td>
                  <span class="smc-pill ${c.counted ? 'smc-pass' : 'smc-fail'}">${c.counted ? 'Counted' : 'Excluded'}</span>
                  ${c.reasons.length ? `<ul class="smc-list">${c.reasons.map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ul>` : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderDirectTable(title, checks) {
    return `
      <div class="smc-card">
        <h3>${title}</h3>
        <table class="smc-detail-table">
          <thead>
            <tr>
              <th>Period</th>
              <th>Counted segments</th>
              <th>Counted time</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            ${checks.map(c => `
              <tr>
                <td>
                  <strong>${escapeHtml(c.row.label)}</strong><br>
                  ${formatDate(c.row.start)} to ${c.row.ongoing ? "current / projected to application date" : formatDate(c.row.endInclusive)}
                </td>
                <td>
                  ${c.segments && c.segments.length
                    ? c.segments.map(s => `${formatDate(s.start)} – ${formatDate(addDays(s.end, -1))}`).join('<br>')
                    : '—'}
                </td>
                <td>${fmtMonths(c.countedDays)}</td>
                <td>
                  <span class="smc-pill ${c.counted ? 'smc-pass' : 'smc-fail'}">${c.counted ? 'Counted' : 'Excluded'}</span>
                  ${c.reasons.length ? `<ul class="smc-list">${c.reasons.map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ul>` : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function addPeriodRow(data = {}) {
    const list = $('#periodRows');
    const index = $$('.smc-period-row').length + 1;
    const card = document.createElement('article');
    card.className = 'smc-period-row';
    card.innerHTML = `
      <div class="smc-period-card-head">
        <div>
          <div class="smc-period-kicker">Work / pay period</div>
          <h4>${escapeHtml(data.label || `Period ${index}`)}</h4>
        </div>
        <button type="button" class="smc-remove">Remove</button>
      </div>

      <div class="smc-period-guidance">
        <strong>Why this matters:</strong> your work experience can usually only be counted from the date your pay met the required wage rate.
        If your pay increased or decreased during a job, add each pay rate as a separate period.
      </div>

      <div class="smc-period-fields">
        <section class="smc-period-section smc-period-section-dates">
          <div class="smc-period-section-title">Dates and visa timing</div>
          <div class="smc-period-grid smc-period-grid-4">
            <label>Period label
              <input class="period-label" type="text" value="${escapeHtml(data.label || `Period ${index}`)}" placeholder="e.g. ABC Ltd - first pay rate">
            </label>
            <label>Start date of this pay period
              <input class="period-start" type="date" value="${escapeHtml(data.start || '')}">
              <span class="smc-field-help">Use the date this pay rate started, not necessarily the date you first joined the employer.</span>
            </label>
            <label>End date of this pay period
              <input class="period-end" type="date" value="${escapeHtml(data.end || '')}">
              <span class="smc-field-help">If this pay rate changed, end this period the day before the new rate began.</span>
            </label>
            <label>Work visa grant date for this period
              <input class="period-visa-grant" type="date" value="${escapeHtml(data.visaGrant || '')}">
              <span class="smc-field-help">Leave blank to use the default visa grant date, if one was entered.</span>
            </label>
          </div>
        </section>

        <section class="smc-period-section">
          <div class="smc-period-section-title">Role details</div>
          <div class="smc-period-grid smc-period-grid-3">
            <label>Country
              <select class="period-country">
                <option value="nz" ${data.country !== 'overseas' ? 'selected' : ''}>New Zealand</option>
                <option value="overseas" ${data.country === 'overseas' ? 'selected' : ''}>Overseas</option>
              </select>
            </label>
            <label>ANZSCO code
              <input class="period-anzsco" type="text" value="${escapeHtml(data.anzsco || '')}" placeholder="e.g. 351311">
              <span class="smc-field-help">Leave blank if you are not sure.</span>
            </label>
            <label>Skill level
              <select class="period-skill-level">
                ${['1','2','3','4','5','non'].map(v => `<option value="${v}" ${(data.skillLevel || '3') === v ? 'selected' : ''}>${v === 'non' ? 'Not in ANZSCO / not sure' : `Skill level ${v}`}</option>`).join('')}
              </select>
            </label>
          </div>
        </section>

        <section class="smc-period-section">
          <div class="smc-period-section-title">Pay at the start of this period</div>
          <div class="smc-period-grid smc-period-grid-4">
            <label>How were you paid?
              <select class="period-pay-type">
                <option value="hourly" ${data.payType !== 'salary' ? 'selected' : ''}>Hourly rate</option>
                <option value="salary" ${data.payType === 'salary' ? 'selected' : ''}>Annual salary</option>
              </select>
            </label>
            <label>Pay at start of this period
              <input class="period-pay-amount" type="number" min="0" step="0.01" value="${escapeHtml(data.payAmount || '')}" placeholder="e.g. 33.00">
              <span class="smc-field-help">Enter the hourly rate or annual salary that applied on the start date above.</span>
            </label>
            <label>Guaranteed hours per week
              <input class="period-hours" type="number" min="0" step="0.1" value="${escapeHtml(data.hours || '40')}">
            </label>
            <label>Did your pay change before this period ended?
              <select class="period-pay-changed">
                <option value="no" ${data.payChanged ? '' : 'selected'}>No</option>
                <option value="yes" ${data.payChanged ? 'selected' : ''}>Yes — I should split this period</option>
              </select>
              <span class="smc-field-help">If yes, add another period starting from the date your pay changed.</span>
            </label>
          </div>
        </section>

        <section class="smc-period-section">
          <div class="smc-period-section-title">Declarations</div>
          <p class="smc-muted smc-compact">Tick only what applies. If you are unsure, leave it unticked and we can review it with you.</p>
          <div class="smc-period-checks">
            <label class="smc-check"><input class="period-lawful" type="checkbox" ${data.lawful === false ? '' : 'checked'}><span>Lawful work</span></label>
            <label class="smc-check"><input class="period-direct" type="checkbox" ${data.direct === false ? '' : 'checked'}><span>Directly relevant</span></label>
            <label class="smc-check"><input class="period-self" type="checkbox" ${data.selfEmployed ? 'checked' : ''}><span>Self-employed</span></label>
            <label class="smc-check"><input class="period-contract" type="checkbox" ${data.contract ? 'checked' : ''}><span>Contract for services</span></label>
            <label class="smc-check"><input class="period-post-qualification" type="checkbox" ${data.postQualification === false ? '' : 'checked'}><span>Post-qualification</span></label>
          </div>
        </section>
      </div>
    `;
    list.appendChild(card);
  }

  function updateConditionalFields() {
    const pathway = $('#pathway').value;
    $$('.smc-conditional').forEach(el => {
      const showFor = el.getAttribute('data-show-for');
      const shouldShow = showFor === pathway || (pathway === 'all' && (showFor === 'points' || showFor === 'trades'));
      el.style.display = shouldShow ? '' : 'none';
      if (shouldShow && el.tagName && el.tagName.toLowerCase() === 'details') {
        el.open = pathway === showFor;
      }
    });
    refreshReviewSummary();
  }

  function calculate() {
    let settings = getSettings();
    const rows = getRows();

    if (!rows.length) {
      $('#smc-results').innerHTML = `
        <div class="smc-result-banner smc-fail">
          <h3>Add at least one employment period</h3>
          <p class="smc-muted">Add at least one work period so the calculator can estimate your claimable experience.</p>
        </div>
      `;
      showStep(3);
      return;
    }

    if (settings.estimateApplicationDate) {
      const estimate = estimateEarliestApplicationDate(settings, rows);
      renderEstimatedApplicationDateResult(estimate, settings, rows);
      return;
    }

    if (!settings.applicationDate) {
      $('#smc-results').innerHTML = `
        <div class="smc-result-banner smc-fail">
          <h3>Add an intended residence application date</h3>
          <p class="smc-muted">If you are unsure, select “estimate the earliest date I may be able to apply” in Step 1.</p>
        </div>
      `;
      showStep(1);
      return;
    }

    if (settings.pathway === 'all') {
      const assessments = [
        makeAssessmentForPathway('points', settings, rows),
        makeAssessmentForPathway('swe', settings, rows),
        makeAssessmentForPathway('trades', settings, rows)
      ];
      renderAllAssessments(assessments, settings);
      return;
    }

    const packaged = makeAssessmentForPathway(settings.pathway, settings, rows);
    renderAssessment(packaged.assessment, packaged.settings);
  }



  function addYears(date, years) {
    return addMonths(date, years * 12);
  }

  function hasAssessmentMet(packaged) {
    const a = packaged.assessment;
    if (!a) return false;
    if (packaged.pathway === 'points') {
      const total = Number((a.kpis.find(k => k[0] === 'Indicative total points') || [null, 0])[1]) || 0;
      return total >= 6;
    }
    return a.status === 'pass';
  }

  function estimateEarliestApplicationDateForPathway(pathway, baseSettings, rows) {
    const today = new Date();
    const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const latest = addYears(start, 6);

    // Search day-by-day for precision. This is lightweight for a six-year window.
    for (let d = start; d <= latest; d = addDays(d, 1)) {
      const testSettings = { ...baseSettings, pathway, applicationDate: d, estimateApplicationDate: false };
      const packaged = makeAssessmentForPathway(pathway, testSettings, rows);
      if (hasAssessmentMet(packaged)) {
        return { date: d, packaged };
      }
    }

    return { date: null, packaged: makeAssessmentForPathway(pathway, { ...baseSettings, pathway, applicationDate: latest }, rows) };
  }

  function estimateEarliestApplicationDate(baseSettings, rows) {
    const pathways = baseSettings.pathway === 'all'
      ? ['points', 'swe', 'trades']
      : [baseSettings.pathway];

    const estimates = pathways.map(pathway => ({
      pathway,
      ...estimateEarliestApplicationDateForPathway(pathway, baseSettings, rows)
    }));

    const successful = estimates.filter(e => e.date);
    successful.sort((a, b) => a.date - b.date);

    return {
      estimates,
      best: successful[0] || null
    };
  }

  function makeAssessmentForPathway(pathway, baseSettings, rows) {
    const settings = { ...baseSettings, pathway };
    let assessment;
    if (pathway === 'points') assessment = assessmentForPoints(settings, rows);
    if (pathway === 'swe') assessment = assessmentForSWE(settings, rows);
    if (pathway === 'trades') assessment = assessmentForTrades(settings, rows);
    return { pathway, settings, assessment };
  }

  function rankAssessment(packaged) {
    const a = packaged.assessment;
    if (!a) return -9999;
    let score = a.status === 'pass' ? 1000 : 0;
    if (packaged.pathway === 'swe') score += 30;
    if (packaged.pathway === 'trades') score += 20;
    if (packaged.pathway === 'points') score += 10;

    if (packaged.pathway === 'points') {
      const total = Number((a.kpis.find(k => k[0] === 'Indicative total points') || [null, 0])[1]) || 0;
      score += total * 12;
    } else {
      const nzText = String((a.kpis[1] || [null, '0'])[1]);
      const directText = String((a.kpis[3] || [null, '0'])[1]);
      const nzMonths = Number((nzText.match(/[\d.]+/) || ['0'])[0]);
      const directMonths = Number((directText.match(/[\d.]+/) || ['0'])[0]);
      score += nzMonths + directMonths;
    }
    return score;
  }


  function renderEstimatedApplicationDateResult(estimate, baseSettings, rows) {
    if (!estimate.best) {
      const latestText = 'six years from today';
      $('#smc-results').innerHTML = `
        <div class="smc-result-banner smc-fail">
          <span class="smc-pill smc-fail">No estimated date found</span>
          <h3>No pathway clearly reaches the required experience within ${latestText}</h3>
          <p class="smc-muted">
            Based on the information entered, the calculator could not identify an earliest application date.
            Check that current work is marked as ongoing where applicable, and that each pay change has been split into a separate work/pay period.
          </p>
          ${renderEstimatePathwayList(estimate.estimates)}
        </div>
      `;
      lastAssessment = null;
      lastSettings = null;
      return;
    }

    const best = estimate.best;
    const detailSettings = { ...best.packaged.settings, applicationDate: best.date, estimateApplicationDate: false };
    const detailPackaged = makeAssessmentForPathway(best.pathway, detailSettings, rows);

    let html = `
      <div class="smc-result-banner smc-pass">
        <span class="smc-pill smc-pass">Estimated earliest date</span>
        <h3>You may be able to apply from ${formatDate(best.date)}</h3>
        <p class="smc-muted">
          This is an indicative earliest date based on the work/pay periods entered, any current/ongoing period, and the selected pathway option.
          It is not a guarantee of eligibility.
        </p>

        <div class="smc-kpis">
          <div class="smc-kpi"><strong>${formatDate(best.date)}</strong><span>Estimated earliest application date</span></div>
          <div class="smc-kpi"><strong>${detailPackaged.assessment.pathwayName}</strong><span>Most promising pathway</span></div>
          <div class="smc-kpi"><strong>${rows.filter(r => r.ongoing).length}</strong><span>Current / ongoing period${rows.filter(r => r.ongoing).length === 1 ? '' : 's'} used</span></div>
          <div class="smc-kpi"><strong>Indicative only</strong><span>Subject to review</span></div>
        </div>

        ${renderEstimatePathwayList(estimate.estimates)}

        <div class="smc-info-panel">
          <strong>Please note:</strong> the estimated date assumes the information entered remains accurate, including pay rate, hours, visa status,
          role, and employment conditions. If anything changes, the estimated date should be recalculated.
        </div>

        ${renderPdfActions()}
      </div>
    `;

    html += renderAssessmentDetailsOnly(detailPackaged.assessment, detailPackaged.settings);
    $('#smc-results').innerHTML = html;

    lastAssessment = detailPackaged.assessment;
    lastSettings = detailPackaged.settings;
    wireResultEmailButton();
    postSmcEmbedHeight();
  }

  function renderEstimatePathwayList(estimates) {
    return `
      <div class="smc-pathway-overview">
        ${estimates.map(e => {
          const assessment = e.packaged.assessment;
          const ok = Boolean(e.date);
          return `
            <article class="smc-pathway-card ${ok ? 'smc-pass' : 'smc-fail'}">
              <span class="smc-pill ${ok ? 'smc-pass' : 'smc-fail'}">${ok ? 'Estimated date found' : 'No date found'}</span>
              <h4>${escapeHtml(assessment.pathwayName)}</h4>
              <p class="smc-muted smc-compact">
                ${ok ? `Estimated earliest date: ${formatDate(e.date)}` : 'No clear estimated date within six years based on the information entered.'}
              </p>
            </article>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderAllAssessments(packagedAssessments, baseSettings) {
    const sorted = packagedAssessments.slice().sort((a, b) => rankAssessment(b) - rankAssessment(a));
    const best = sorted[0];
    const bestStatus = best.assessment.status === 'pass' ? 'smc-pass' : 'smc-review';

    let html = `
      <div class="smc-result-banner ${bestStatus}">
        <span class="smc-pill ${best.assessment.status === 'pass' ? 'smc-pass' : 'smc-review'}">
          ${best.assessment.status === 'pass' ? 'Most promising pathway found' : 'May need review'}
        </span>
        <h3>${best.assessment.status === 'pass' ? 'One or more pathways may be worth reviewing' : 'No pathway clearly meets the entered work-experience information yet'}</h3>
        <p class="smc-muted">
          The calculator checked the Points-based, Skilled Work Experience, and Trades and Technician pathways using the same information entered.
          The detailed calculation below is shown for the most promising pathway: <strong>${best.assessment.pathwayName}</strong>.
        </p>

        <div class="smc-pathway-overview">
          ${packagedAssessments.map(pkg => renderPathwayCard(pkg)).join('')}
        </div>

        <p class="smc-best-detail-note">
          Your PDF will use the most promising pathway shown in detail below. Your result is still an indication only and may need review for ANZSCO occupation match, direct relevance, genuine employment, and evidence quality.
        </p>

        ${renderPdfActions()}
      </div>
    `;

    html += renderAssessmentDetailsOnly(best.assessment, best.settings);
    $('#smc-results').innerHTML = html;

    lastAssessment = best.assessment;
    lastSettings = best.settings;
    wireResultEmailButton();
    postSmcEmbedHeight();
  }

  function renderPathwayCard(pkg) {
    const a = pkg.assessment;
    const statusClass = a.status === 'pass' ? 'smc-pass' : 'smc-fail';
    const summaryKpis = a.kpis.slice(0, 4);
    return `
      <article class="smc-pathway-card ${statusClass}">
        <span class="smc-pill ${statusClass}">${a.status === 'pass' ? 'Potentially meets' : 'May need review'}</span>
        <h4>${escapeHtml(a.pathwayName)}</h4>
        <p class="smc-muted smc-compact">${escapeHtml(a.headline)}</p>
        <div class="smc-kpis">
          ${summaryKpis.map(([label, value]) => `
            <div class="smc-kpi"><strong>${value}</strong><span>${label}</span></div>
          `).join('')}
        </div>
      </article>
    `;
  }

  function renderAssessmentDetailsOnly(assessment, settings) {
    let html = '';
    if (settings.pathway === 'points') {
      assessment.tables.forEach(t => {
        html += renderNzTable(
          `Detailed check: ${t.points} experience point${t.points > 1 ? 's' : ''} — ${t.months} months required in prior ${t.windowMonths} months`,
          t.checks
        );
      });
    } else {
      html += renderNzTable('Detailed NZ skilled work experience component', assessment.nzChecks);
      html += renderDirectTable('Detailed directly relevant work experience component', assessment.directChecks);
    }
    return html;
  }

  function showStep(step) {
    const target = Number(step);
    $$('.smc-step').forEach(el => {
      el.classList.toggle('is-active', Number(el.getAttribute('data-step')) === target);
    });
    $$('.smc-step-tab').forEach(el => {
      el.classList.toggle('is-active', Number(el.getAttribute('data-step-tab')) === target);
    });
    if (target === 4) refreshReviewSummary();
    const formTop = $('#smc-form');
    if (formTop && formTop.scrollIntoView) {
      formTop.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    window.setTimeout(postSmcEmbedHeight, 80);
  }

  function refreshReviewSummary() {
    const box = $('#smc-review-summary');
    if (!box) return;

    const settings = getSettings();
    const rows = getRows();
    const nzRows = rows.filter(r => r.country === 'nz').length;
    const overseasRows = rows.filter(r => r.country === 'overseas').length;
    const missingDates = rows.filter(r => !r.start || (!r.endInclusive && !r.ongoing)).length;
    const ongoingRows = rows.filter(r => r.ongoing).length;
    const missingPay = rows.filter(r => !r.hourly).length;
    const payChangedRows = rows.filter(r => r.payChanged).length;
    const pathwayLabel = {
      all: 'All likely SMC work experience pathways',
      points: 'Points-based pathway only',
      swe: 'Skilled Work Experience pathway only',
      trades: 'Trades and Technician pathway only'
    }[settings.pathway] || settings.pathway;

    const prompts = [];
    if (!settings.estimateApplicationDate && !settings.applicationDate) prompts.push('You have not entered an application date. Select the estimate option or add a date.');
    if (settings.estimateApplicationDate && !ongoingRows) prompts.push('You asked for an estimated application date. Mark any current job/pay period as current/ongoing so the calculator can project forward.');
    if (!settings.currentAnzsco) prompts.push('Your current ANZSCO code has not been entered. We may need to review your occupation.');
    if (settings.currentSkillLevel === 'non') prompts.push('Your current ANZSCO skill level is marked as not in ANZSCO / not sure. We may need to check this.');
    if (!settings.currentHourly) prompts.push('Your current pay amount is missing or cannot be converted to an hourly rate.');
    if (!rows.length) prompts.push('You have not added any work periods yet.');
    if (missingDates) prompts.push(`${missingDates} work period${missingDates > 1 ? 's are' : ' is'} missing a start or end date.`);
    if (missingPay) prompts.push(`${missingPay} work period${missingPay > 1 ? 's have' : ' has'} missing or invalid pay information.`);
    if (payChangedRows) prompts.push(`${payChangedRows} work period${payChangedRows > 1 ? 's show' : ' shows'} a pay change. Please split each pay rate into a separate period for a more accurate result.`);
    if (settings.pathway === 'trades' && !settings.qualificationDate) prompts.push('You selected the Trades and Technician pathway, but have not entered your qualification completion date.');
    if (settings.pathway === 'all' && !settings.qualificationDate) prompts.push('The Trades and Technician pathway can be checked more accurately if you enter your relevant qualification completion date.');

    box.innerHTML = `
      <div class="smc-review-grid">
        <div class="smc-review-item"><strong>${settings.estimateApplicationDate ? 'To be estimated' : formatDate(settings.applicationDate)}</strong><span>Application date used</span></div>
        <div class="smc-review-item"><strong>${escapeHtml(pathwayLabel)}</strong><span>Pathway check selected</span></div>
        <div class="smc-review-item"><strong>${rows.length}</strong><span>Work period${rows.length === 1 ? '' : 's'} entered</span></div>
        <div class="smc-review-item"><strong>${nzRows}</strong><span>New Zealand work period${nzRows === 1 ? '' : 's'}</span></div>
        <div class="smc-review-item"><strong>${overseasRows}</strong><span>Overseas work period${overseasRows === 1 ? '' : 's'}</span></div>
        <div class="smc-review-item"><strong>${settings.currentHourly ? money(settings.currentHourly) : '—'}</strong><span>Estimated current hourly rate</span></div>
        <div class="smc-review-item"><strong>${ongoingRows}</strong><span>Current / ongoing period${ongoingRows === 1 ? '' : 's'}</span></div>
      </div>
      ${prompts.length ? `
        <div class="smc-info-panel">
          <strong>Before calculating, please note:</strong>
          <ul class="smc-list">${prompts.map(p => `<li>${escapeHtml(p)}</li>`).join('')}</ul>
        </div>
      ` : `
        <div class="smc-info-panel">
          <strong>Ready to calculate:</strong> the key fields are complete. Your result will still be an indication only and may need review for occupation match, evidence, and direct relevance.
        </div>
      `}
    `;
  }


  function resetForm() {
    $('#smc-form').reset();
    $('#periodRows').innerHTML = '';
    addPeriodRow();
    updateConditionalFields();
    $('#smc-results').innerHTML = '';
    const today = new Date();
    $('#applicationDate').value = today.toISOString().slice(0, 10);
    $('#pathway').value = 'all';
    if ($('#estimateApplicationDate')) $('#estimateApplicationDate').checked = false;
    if ($('#applicationDate')) $('#applicationDate').disabled = false;
    showStep(1);
    refreshReviewSummary();
  }

  function loadExample() {
    $('#applicationDate').value = '2027-03-14';
    $('#pathway').value = 'all';
    if ($('#estimateApplicationDate')) $('#estimateApplicationDate').checked = false;
    if ($('#applicationDate')) $('#applicationDate').disabled = false;
    $('#globalVisaGrantDate').value = '2023-01-14';
    $('#currentAnzsco').value = '313112';
    $('#currentSkillLevel').value = '2';
    $('#currentPayType').value = 'hourly';
    $('#currentPayAmount').value = '33.00';
    $('#currentHours').value = '40';
    $('#currentEmploymentStart').value = '2023-06-13';
    $('#isAmber').checked = false;
    $('#isRed').checked = false;
    $('#isTradesList').checked = false;
    $('#employerAccredited').checked = true;
    $('#fullTimeCurrent').checked = true;
    $('#genuineCurrent').checked = true;

    $('#periodRows').innerHTML = '';
    addPeriodRow({
      label: 'NZ skilled pay period 1',
      start: '2023-06-13',
      end: '2025-06-12',
      country: 'nz',
      anzsco: '313112',
      skillLevel: '2',
      payType: 'hourly',
      payAmount: '33.00',
      hours: '40',
      lawful: true,
      direct: true,
      postQualification: true
    });
    addPeriodRow({
      label: 'Overseas directly relevant period',
      start: '2020-01-01',
      end: '2023-01-01',
      country: 'overseas',
      anzsco: '313112',
      skillLevel: '2',
      payType: 'hourly',
      payAmount: '20.00',
      hours: '40',
      lawful: true,
      direct: true,
      postQualification: true
    });
    updateConditionalFields();
    showStep(4);
    refreshReviewSummary();
    calculate();
  }

  $('#addPeriod').addEventListener('click', () => {
    addPeriodRow();
    refreshReviewSummary();
  });
  $('#resetForm').addEventListener('click', resetForm);
  $('#smc-load-example').addEventListener('click', loadExample);
  $('#pathway').addEventListener('change', updateConditionalFields);
  if ($('#estimateApplicationDate')) {
    $('#estimateApplicationDate').addEventListener('change', () => {
      const dateField = $('#applicationDate');
      if (dateField) {
        dateField.disabled = $('#estimateApplicationDate').checked;
        if ($('#estimateApplicationDate').checked) dateField.value = '';
      }
      refreshReviewSummary();
    });
  }
  $('#smc-form').addEventListener('submit', (event) => {
    event.preventDefault();
    showStep(4);
    calculate();
  });

  $$('.smc-next-step').forEach(button => {
    button.addEventListener('click', () => showStep(button.getAttribute('data-next-step')));
  });
  $$('.smc-prev-step').forEach(button => {
    button.addEventListener('click', () => showStep(button.getAttribute('data-prev-step')));
  });
  $$('.smc-step-tab').forEach(button => {
    button.addEventListener('click', () => showStep(button.getAttribute('data-step-tab')));
  });

  $('#smc-form').addEventListener('input', refreshReviewSummary);
  $('#smc-form').addEventListener('change', refreshReviewSummary);

  $('#periodRows').addEventListener('click', (event) => {
    if (event.target.classList.contains('smc-remove')) {
      event.target.closest('.smc-period-row').remove();
      refreshReviewSummary();
    }
  });

  const today = new Date();
  $('#applicationDate').value = today.toISOString().slice(0, 10);
  $('#pathway').value = 'all';
  addPeriodRow();
  updateConditionalFields();
  refreshReviewSummary();
  window.addEventListener('load', postSmcEmbedHeight);
  window.addEventListener('resize', postSmcEmbedHeight);
  window.setTimeout(postSmcEmbedHeight, 250);
})();
