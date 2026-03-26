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

function saveFormationValues() {
  for (const f of formations) {
    const nomEl = document.getElementById(`nom-${f.id}`);
    if (nomEl) {
      f.nom = nomEl.value;
      f.dates = document.getElementById(`dates-${f.id}`).value;
      f.lieu = document.getElementById(`lieu-${f.id}`).value;
      f.places = document.getElementById(`places-${f.id}`).value;
      f.description = document.getElementById(`desc-${f.id}`).value;
      f.hintVisible = document.getElementById(`hint-${f.id}`).style.display !== 'none';
    }
  }
}

function ajouterFormation() {
  saveFormationValues();
  const id = nextId++;
  formations.push({ id, nom: '', dates: '', lieu: '', places: '10', description: '', hintVisible: false });
  renderFormations();
}

function supprimerFormation(id) {
  saveFormationValues();
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
        <input type="text" id="nom-${f.id}" value="${escapeAttr(f.nom || '')}" placeholder="ex : PLAIES ET CICATRISATION" />
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Date(s)</label>
          <input type="text" id="dates-${f.id}" value="${escapeAttr(f.dates || '')}" placeholder="ex : 13/04/26 au 14/04/26" />
        </div>
        <div class="form-group">
          <label>Lieu</label>
          <input type="text" id="lieu-${f.id}" value="${escapeAttr(f.lieu || '')}" placeholder="ex : Salle de réunion A" />
        </div>
        <div class="form-group">
          <label>Nombre de places <span class="required">*</span></label>
          <input type="number" id="places-${f.id}" min="1" value="${escapeAttr(f.places || '10')}" />
        </div>
      </div>

      <div class="form-group description-section">
        <label>Description courte</label>
        <div class="description-wrapper">
          <textarea id="desc-${f.id}" placeholder="Cliquez sur Générer pour créer une description automatique...">${escapeHtml(f.description || '')}</textarea>
          <button class="btn-generate" onclick="genererDescription(${f.id})" id="btn-gen-${f.id}">Générer</button>
        </div>
        <div class="description-hint" id="hint-${f.id}" style="display:${f.hintVisible ? 'block' : 'none'};">Description pré-remplie &mdash; modifiable.</div>
      </div>
    </div>
  `
    )
    .join('');
}

function escapeAttr(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
    const prompt = `Tu rédiges une description pour une fiche d'inscription destinée au personnel soignant (infirmiers, aides-soignants, médecins). Formation : "${nom}".${dates ? ` Date : ${dates}.` : ''}${lieu ? ` Lieu : ${lieu}.` : ''}

Écris exactement 2 phrases (40 mots max). La 1ère phrase décrit ce que la formation apporte concrètement dans la pratique quotidienne. La 2ème phrase donne envie de s'inscrire en soulignant le bénéfice pour le soignant et ses patients. Ton professionnel, valorisant, orienté terrain. Tutoie pas. Réponds uniquement avec les 2 phrases.`;

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

  if (!window.jspdf) {
    showToast('Erreur : la librairie PDF ne s\'est pas chargée. Rechargez la page.', true);
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 18;
  const usableWidth = pageWidth - margin * 2;

  const colN = 12;
  const colNom = 70;
  const colPrenom = 55;
  const rowHeight = 9;
  const footerSpace = 18;
  const maxY = pageHeight - footerSpace;

  function addHeader() {
    doc.setFillColor(124, 58, 237);
    doc.rect(0, 0, pageWidth, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('SODIA', margin, 12);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text("Feuille d'inscription aux formations", margin, 20);
  }

  function addFooter() {
    const footerY = pageHeight - 10;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);
    doc.setTextColor(160, 160, 160);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text('SODIA - Feuille d\'inscription', margin, footerY);
  }

  function checkNewPage(needed) {
    if (y + needed > maxY) {
      addFooter();
      doc.addPage();
      addHeader();
      y = 34;
    }
  }

  let y = margin;
  addHeader();
  y = 34;

  data.forEach((formation, formationIndex) => {
    // Estimate space needed for header info (title + date + lieu + desc + table header + at least 1 row)
    const minNeeded = 40;
    if (formationIndex > 0) {
      checkNewPage(minNeeded);
      if (y > 36) {
        // Separator line between formations
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.3);
        doc.line(margin + 20, y + 3, pageWidth - margin - 20, y + 3);
        y += 10;
      }
    }

    // Formation title
    doc.setTextColor(124, 58, 237);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    const titleLines = doc.splitTextToSize(formation.nom.toUpperCase(), usableWidth);
    doc.text(titleLines, margin, y);
    y += titleLines.length * 6 + 2;

    // Date
    if (formation.dates) {
      doc.setTextColor(40, 40, 40);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text(formation.dates, margin, y);
      y += 6;
    }

    // Lieu
    if (formation.lieu) {
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Lieu : ${formation.lieu}`, margin, y);
      y += 6;
    }

    // Description
    if (formation.description) {
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'italic');
      const descLines = doc.splitTextToSize(formation.description, usableWidth);
      doc.text(descLines, margin, y + 1, { align: 'justify', maxWidth: usableWidth });
      y += descLines.length * 5 + 3;
    }

    y += 2;

    // Table header
    checkNewPage(rowHeight * 2);
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
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.rect(margin, y, usableWidth, rowHeight);
    doc.line(margin + colN, y, margin + colN, y + rowHeight);
    doc.line(margin + colN + colNom, y, margin + colN + colNom, y + rowHeight);
    doc.line(margin + colN + colNom + colPrenom, y, margin + colN + colNom + colPrenom, y + rowHeight);
    y += rowHeight;

    // Rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    for (let i = 0; i < formation.places; i++) {
      checkNewPage(rowHeight);
      if (i % 2 === 0) {
        doc.setFillColor(252, 252, 252);
        doc.rect(margin, y, usableWidth, rowHeight, 'F');
      }
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.15);
      doc.rect(margin, y, usableWidth, rowHeight);
      doc.line(margin + colN, y, margin + colN, y + rowHeight);
      doc.line(margin + colN + colNom, y, margin + colN + colNom, y + rowHeight);
      doc.line(margin + colN + colNom + colPrenom, y, margin + colN + colNom + colPrenom, y + rowHeight);
      doc.setTextColor(150, 150, 150);
      doc.text(String(i + 1), margin + 3, y + 6);
      y += rowHeight;
    }
  });

  addFooter();

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
