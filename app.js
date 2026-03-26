let formations = [];
let nextId = 1;

// --- API Key management via localStorage ---
const API_KEY_STORAGE = 'sodia_anthropic_api_key';

function getApiKey() {
  return localStorage.getItem(API_KEY_STORAGE);
}

function saveApiKey(key) {
  localStorage.setItem(API_KEY_STORAGE, key);
}

function clearApiKey() {
  localStorage.removeItem(API_KEY_STORAGE);
}

function showApiKeyModal(onSuccess) {
  // Remove existing modal if any
  const existing = document.getElementById('apikey-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'apikey-modal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content">
      <h3>Configuration de la clé API</h3>
      <p>Pour générer des descriptions avec l'IA, veuillez saisir votre clé API Anthropic.</p>
      <p class="modal-hint">La clé sera sauvegardée dans votre navigateur et ne sera plus demandée.</p>
      <input type="password" id="apikey-input" placeholder="sk-ant-..." autocomplete="off" />
      <div class="modal-error" id="apikey-error" style="display:none;"></div>
      <div class="modal-actions">
        <button class="btn btn-cancel" id="apikey-cancel">Annuler</button>
        <button class="btn btn-confirm" id="apikey-confirm">Valider</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const input = document.getElementById('apikey-input');
  const errorEl = document.getElementById('apikey-error');
  input.focus();

  document.getElementById('apikey-confirm').addEventListener('click', () => {
    const key = input.value.trim();
    if (!key) {
      errorEl.textContent = 'Veuillez saisir une clé API.';
      errorEl.style.display = 'block';
      return;
    }
    saveApiKey(key);
    modal.remove();
    if (onSuccess) onSuccess(key);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('apikey-confirm').click();
  });

  document.getElementById('apikey-cancel').addEventListener('click', () => {
    modal.remove();
  });
}

// --- Formations ---

function ajouterFormation() {
  const id = nextId++;
  formations.push({ id });
  renderFormations();
}

function supprimerFormation(id) {
  formations = formations.filter((f) => f.id !== id);
  renderFormations();
}

function renderFormations() {
  const container = document.getElementById('formations-container');
  container.innerHTML = formations
    .map(
      (f, index) => `
    <div class="formation-card" data-id="${f.id}">
      ${
        formations.length > 1
          ? `<button class="btn-remove" onclick="supprimerFormation(${f.id})" title="Supprimer">&times;</button>`
          : ''
      }
      <div class="formation-header">
        <div class="formation-number">${index + 1}</div>
        <h3>Formation ${index + 1}</h3>
      </div>

      <div class="form-group">
        <label>Nom de la formation <span class="required">*</span></label>
        <input type="text" id="nom-${f.id}" placeholder="ex : PLAIES ET CICATRISATION" />
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Date(s)</label>
          <input type="text" id="dates-${f.id}" placeholder="ex : 13/04/26 au 14/04/26" />
        </div>
        <div class="form-group">
          <label>Lieu</label>
          <input type="text" id="lieu-${f.id}" placeholder="ex : Salle de réunion A" />
        </div>
        <div class="form-group">
          <label>Nombre de places <span class="required">*</span></label>
          <input type="number" id="places-${f.id}" min="1" value="10" />
        </div>
      </div>

      <div class="form-group description-section">
        <label>Description courte</label>
        <div class="description-wrapper">
          <textarea id="desc-${f.id}" placeholder="Cliquez sur Générer pour créer une description automatique..."></textarea>
          <button class="btn-generate" onclick="genererDescription(${f.id})" id="btn-gen-${f.id}">Générer</button>
        </div>
        <div class="description-hint" id="hint-${f.id}" style="display:none;">Description pré-remplie &mdash; modifiable.</div>
      </div>
    </div>
  `
    )
    .join('');
}

// --- AI Description ---

async function genererDescription(id) {
  const nom = document.getElementById(`nom-${id}`).value.trim();
  if (!nom) {
    showToast('Veuillez saisir le nom de la formation.', true);
    return;
  }

  let apiKey = getApiKey();
  if (!apiKey) {
    showApiKeyModal((key) => {
      // Retry after key is entered
      genererDescription(id);
    });
    return;
  }

  const dates = document.getElementById(`dates-${id}`).value.trim();
  const lieu = document.getElementById(`lieu-${id}`).value.trim();
  const btn = document.getElementById(`btn-gen-${id}`);
  const textarea = document.getElementById(`desc-${id}`);
  const hint = document.getElementById(`hint-${id}`);

  btn.textContent = '...';
  btn.disabled = true;
  btn.classList.add('loading');

  try {
    const prompt = `Tu es un expert en formation professionnelle. Rédige une description courte et professionnelle (2-3 phrases maximum) pour une formation intitulée "${nom}".${dates ? ` Elle se déroule le ${dates}.` : ''}${lieu ? ` Lieu : ${lieu}.` : ''}

La description doit :
- Expliquer brièvement les objectifs et le contenu de la formation
- Être rédigée dans un style professionnel et engageant
- Être en français
- Ne pas dépasser 3 phrases

Réponds uniquement avec la description, sans guillemets ni préambule.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        clearApiKey();
        showToast('Clé API invalide. Veuillez la ressaisir.', true);
        return;
      }
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error?.message || 'Erreur API');
    }

    const data = await response.json();
    textarea.value = data.content[0].text.trim();
    hint.style.display = 'block';
    showToast('Description générée avec succès !');
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      showToast('Erreur réseau. Vérifiez votre connexion.', true);
    } else {
      showToast(error.message, true);
    }
  } finally {
    btn.textContent = 'Générer';
    btn.disabled = false;
    btn.classList.remove('loading');
  }
}

// --- Collect & PDF ---

function collectFormations() {
  const result = [];
  for (const f of formations) {
    const nom = document.getElementById(`nom-${f.id}`).value.trim();
    const dates = document.getElementById(`dates-${f.id}`).value.trim();
    const lieu = document.getElementById(`lieu-${f.id}`).value.trim();
    const places = parseInt(document.getElementById(`places-${f.id}`).value) || 10;
    const description = document.getElementById(`desc-${f.id}`).value.trim();

    if (!nom) {
      showToast('Veuillez remplir le nom de chaque formation.', true);
      return null;
    }

    result.push({ nom, dates, lieu, places, description });
  }
  return result;
}

function genererPDF() {
  const data = collectFormations();
  if (!data || data.length === 0) return;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 18;
  const usableWidth = pageWidth - margin * 2;

  data.forEach((formation, formationIndex) => {
    if (formationIndex > 0) doc.addPage();

    let y = margin;

    // Header bar
    doc.setFillColor(124, 58, 237);
    doc.rect(0, 0, pageWidth, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('SODIA', margin, 12);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text("Feuille d'inscription aux formations", margin, 20);

    y = 38;

    // Formation title
    doc.setTextColor(124, 58, 237);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    const titleLines = doc.splitTextToSize(formation.nom.toUpperCase(), usableWidth);
    doc.text(titleLines, margin, y);
    y += titleLines.length * 7 + 4;

    // Info line
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const infoParts = [];
    if (formation.dates) infoParts.push(`Date(s) : ${formation.dates}`);
    if (formation.lieu) infoParts.push(`Lieu : ${formation.lieu}`);
    infoParts.push(`Places : ${formation.places}`);
    doc.text(infoParts.join('    |    '), margin, y);
    y += 8;

    // Description
    if (formation.description) {
      doc.setDrawColor(124, 58, 237);
      doc.setLineWidth(0.5);
      doc.line(margin, y, margin, y + 2);

      doc.setTextColor(60, 60, 60);
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'italic');
      const descLines = doc.splitTextToSize(formation.description, usableWidth - 6);
      doc.text(descLines, margin + 4, y + 4);
      y += descLines.length * 4.5 + 10;
    }

    // Separator
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    // Table header
    const colN = 12;
    const colNom = 70;
    const colPrenom = 55;
    const colSignature = usableWidth - colN - colNom - colPrenom;
    const rowHeight = 9;

    doc.setFillColor(245, 243, 239);
    doc.rect(margin, y, usableWidth, rowHeight, 'F');

    doc.setTextColor(80, 80, 80);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');

    const headerY = y + 6;
    doc.text('N°', margin + 3, headerY);
    doc.text('NOM', margin + colN + 3, headerY);
    doc.text('PRÉNOM', margin + colN + colNom + 3, headerY);
    doc.text('SIGNATURE', margin + colN + colNom + colPrenom + 3, headerY);

    // Header borders
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.rect(margin, y, usableWidth, rowHeight);
    doc.line(margin + colN, y, margin + colN, y + rowHeight);
    doc.line(margin + colN + colNom, y, margin + colN + colNom, y + rowHeight);
    doc.line(margin + colN + colNom + colPrenom, y, margin + colN + colNom + colPrenom, y + rowHeight);

    y += rowHeight;

    // Rows
    const maxRows = Math.min(formation.places, Math.floor((pageHeight - y - 25) / rowHeight));

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    for (let i = 0; i < maxRows; i++) {
      const rowY = y + i * rowHeight;
      const textY = rowY + 6;

      if (i % 2 === 0) {
        doc.setFillColor(252, 252, 252);
        doc.rect(margin, rowY, usableWidth, rowHeight, 'F');
      }

      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.15);
      doc.rect(margin, rowY, usableWidth, rowHeight);
      doc.line(margin + colN, rowY, margin + colN, rowY + rowHeight);
      doc.line(margin + colN + colNom, rowY, margin + colN + colNom, rowY + rowHeight);
      doc.line(
        margin + colN + colNom + colPrenom,
        rowY,
        margin + colN + colNom + colPrenom,
        rowY + rowHeight
      );

      doc.setTextColor(150, 150, 150);
      doc.text(String(i + 1), margin + 3, textY);
    }

    // Footer
    const footerY = pageHeight - 12;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

    doc.setTextColor(160, 160, 160);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text('SODIA - Feuille d\'inscription', margin, footerY);
    doc.text(`Page ${formationIndex + 1} / ${data.length}`, pageWidth - margin, footerY, {
      align: 'right',
    });
  });

  doc.save('inscriptions-formations-sodia.pdf');
  showToast('PDF téléchargé !');
}

// --- Toast ---

function showToast(message, isError = false) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${isError ? 'error' : ''}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('show'));

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Init
document.getElementById('btn-config-api').addEventListener('click', function () {
  showApiKeyModal();
});
ajouterFormation();
