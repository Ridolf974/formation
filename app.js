let formations = [];
let nextId = 1;

// --- Formation memory via localStorage (name + description) ---
const MEMORY_STORAGE = 'sodia_formation_memory';

function getMemory() {
  try {
    return JSON.parse(localStorage.getItem(MEMORY_STORAGE)) || {};
  } catch { return {}; }
}

function saveFormationName(nom, description) {
  if (!nom) return;
  const memory = getMemory();
  const upper = nom.trim().toUpperCase();
  if (!memory[upper] || description) {
    memory[upper] = description || memory[upper] || '';
    localStorage.setItem(MEMORY_STORAGE, JSON.stringify(memory));
    updateDatalist();
  }
}

function getMemoryDescription(nom) {
  if (!nom) return '';
  return getMemory()[nom.trim().toUpperCase()] || '';
}

function updateDatalist() {
  let datalist = document.getElementById('formation-names-list');
  if (!datalist) {
    datalist = document.createElement('datalist');
    datalist.id = 'formation-names-list';
    document.body.appendChild(datalist);
  }
  const names = Object.keys(getMemory()).sort();
  datalist.innerHTML = names.map(n => '<option value="' + escapeAttr(n) + '">').join('');
}

function onNomChange(id) {
  const nomEl = document.getElementById('nom-' + id);
  if (!nomEl) return;
  const nom = nomEl.value.trim();
  const desc = getMemoryDescription(nom);
  if (desc) {
    const textarea = document.getElementById('desc-' + id);
    const hint = document.getElementById('hint-' + id);
    if (textarea && !textarea.value.trim()) {
      textarea.value = desc;
      hint.style.display = 'block';
      showToast('Description restaurée depuis la mémoire !');
    }
  }
}

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
  var existing = document.getElementById('apikey-modal');
  if (existing) existing.remove();

  var modal = document.createElement('div');
  modal.id = 'apikey-modal';
  modal.className = 'modal-overlay';
  modal.innerHTML =
    '<div class="modal-content">' +
      '<h3>Configuration de la clé API</h3>' +
      '<p>Pour générer des descriptions avec l\'IA, veuillez saisir votre clé API Anthropic.</p>' +
      '<p class="modal-hint">La clé sera sauvegardée dans votre navigateur et ne sera plus demandée.</p>' +
      '<input type="password" id="apikey-input" placeholder="sk-ant-..." autocomplete="off" />' +
      '<div class="modal-error" id="apikey-error" style="display:none;"></div>' +
      '<div class="modal-actions">' +
        '<button class="btn btn-cancel" id="apikey-cancel">Annuler</button>' +
        '<button class="btn btn-confirm" id="apikey-confirm">Valider</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(modal);

  var input = document.getElementById('apikey-input');
  var errorEl = document.getElementById('apikey-error');
  input.focus();

  document.getElementById('apikey-confirm').addEventListener('click', function () {
    var key = input.value.trim();
    if (!key) {
      errorEl.textContent = 'Veuillez saisir une clé API.';
      errorEl.style.display = 'block';
      return;
    }
    saveApiKey(key);
    modal.remove();
    if (onSuccess) onSuccess(key);
  });

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') document.getElementById('apikey-confirm').click();
  });

  document.getElementById('apikey-cancel').addEventListener('click', function () {
    modal.remove();
  });
}

// --- Formations ---

function saveFormationValues() {
  for (var i = 0; i < formations.length; i++) {
    var f = formations[i];
    var nomEl = document.getElementById('nom-' + f.id);
    if (nomEl) {
      f.nom = nomEl.value;
      f.dates = document.getElementById('dates-' + f.id).value;
      f.lieu = document.getElementById('lieu-' + f.id).value;
      f.places = document.getElementById('places-' + f.id).value;
      f.description = document.getElementById('desc-' + f.id).value;
      f.hintVisible = document.getElementById('hint-' + f.id).style.display !== 'none';
    }
  }
}

function ajouterFormation() {
  saveFormationValues();
  var id = nextId++;
  formations.push({ id: id, nom: '', dates: '', lieu: '', places: '10', description: '', hintVisible: false });
  renderFormations();
}

function supprimerFormation(id) {
  saveFormationValues();
  formations = formations.filter(function (f) { return f.id !== id; });
  renderFormations();
}

function renderFormations() {
  var container = document.getElementById('formations-container');
  var html = '';
  for (var i = 0; i < formations.length; i++) {
    var f = formations[i];
    var index = i;
    html += '<div class="formation-card" data-id="' + f.id + '">';

    if (formations.length > 1) {
      html += '<button class="btn-remove" onclick="supprimerFormation(' + f.id + ')" title="Supprimer">&times;</button>';
    }

    html += '<div class="formation-header">' +
      '<div class="formation-number">' + (index + 1) + '</div>' +
      '<h3>Formation ' + (index + 1) + '</h3>' +
    '</div>';

    html += '<div class="form-group">' +
      '<label>Nom de la formation <span class="required">*</span></label>' +
      '<input type="text" id="nom-' + f.id + '" value="' + escapeAttr(f.nom || '') + '" placeholder="ex : PLAIES ET CICATRISATION" list="formation-names-list" autocomplete="off" onchange="onNomChange(' + f.id + ')" />' +
    '</div>';

    html += '<div class="form-row">' +
      '<div class="form-group"><label>Date(s)</label>' +
        '<input type="text" id="dates-' + f.id + '" value="' + escapeAttr(f.dates || '') + '" placeholder="ex : 13/04/26 au 14/04/26" />' +
      '</div>' +
      '<div class="form-group"><label>Lieu</label>' +
        '<input type="text" id="lieu-' + f.id + '" value="' + escapeAttr(f.lieu || '') + '" placeholder="ex : Salle de réunion A" />' +
      '</div>' +
      '<div class="form-group"><label>Nombre de places <span class="required">*</span></label>' +
        '<input type="number" id="places-' + f.id + '" min="1" value="' + escapeAttr(f.places || '10') + '" />' +
      '</div>' +
    '</div>';

    html += '<div class="form-group description-section">' +
      '<label>Description courte</label>' +
      '<div class="description-wrapper">' +
        '<textarea id="desc-' + f.id + '" placeholder="Cliquez sur Générer pour créer une description automatique...">' + escapeHtml(f.description || '') + '</textarea>' +
        '<button class="btn-generate" onclick="genererDescription(' + f.id + ')" id="btn-gen-' + f.id + '">Générer</button>' +
      '</div>' +
      '<div class="description-hint" id="hint-' + f.id + '" style="display:' + (f.hintVisible ? 'block' : 'none') + ';">Description pré-remplie &mdash; modifiable.</div>' +
    '</div>';

    html += '</div>';
  }
  container.innerHTML = html;
}

function escapeAttr(str) {
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// --- AI Description ---

var generatingIds = {};

async function genererDescription(id) {
  if (generatingIds[id]) return;

  var nomEl = document.getElementById('nom-' + id);
  if (!nomEl) return;
  var nom = nomEl.value.trim();
  if (!nom) {
    showToast('Veuillez saisir le nom de la formation.', true);
    return;
  }

  var apiKey = getApiKey();
  if (!apiKey) {
    saveFormationValues();
    showApiKeyModal(function () {
      genererDescription(id);
    });
    return;
  }

  var dates = document.getElementById('dates-' + id).value.trim();
  var lieu = document.getElementById('lieu-' + id).value.trim();
  var btn = document.getElementById('btn-gen-' + id);
  var textarea = document.getElementById('desc-' + id);
  var hint = document.getElementById('hint-' + id);

  generatingIds[id] = true;
  btn.textContent = '...';
  btn.disabled = true;

  try {
    var prompt = 'Tu rédiges une description pour une fiche d\'inscription destinée au personnel soignant (infirmiers, aides-soignants, médecins). Formation : "' + nom + '".' +
      (dates ? ' Date : ' + dates + '.' : '') +
      (lieu ? ' Lieu : ' + lieu + '.' : '') +
      '\n\nÉcris exactement 2 phrases (40 mots max). La 1ère phrase décrit ce que la formation apporte concrètement dans la pratique quotidienne. La 2ème phrase donne envie de s\'inscrire en soulignant le bénéfice pour le soignant et ses patients. Ton professionnel, valorisant, orienté terrain. Tutoie pas. Réponds uniquement avec les 2 phrases.';

    var response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      if (response.status === 401) {
        clearApiKey();
        showToast('Clé API invalide. Veuillez la ressaisir.', true);
        return;
      }
      var errData = await response.json().catch(function () { return {}; });
      throw new Error((errData.error && errData.error.message) || 'Erreur API');
    }

    var data = await response.json();
    var description = data.content[0].text.trim();

    // Re-fetch elements in case DOM changed during async call
    textarea = document.getElementById('desc-' + id);
    hint = document.getElementById('hint-' + id);
    if (textarea) {
      textarea.value = description;
      // Update the formation object too
      for (var i = 0; i < formations.length; i++) {
        if (formations[i].id === id) {
          formations[i].description = description;
          formations[i].hintVisible = true;
          break;
        }
      }
    }
    if (hint) hint.style.display = 'block';
    saveFormationName(nom, description);
    showToast('Description générée avec succès !');
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      showToast('Erreur réseau. Vérifiez votre connexion.', true);
    } else {
      showToast(error.message, true);
    }
  } finally {
    delete generatingIds[id];
    btn = document.getElementById('btn-gen-' + id);
    if (btn) {
      btn.textContent = 'Générer';
      btn.disabled = false;
    }
  }
}

// --- Collect & PDF ---

function collectFormations() {
  var result = [];
  for (var i = 0; i < formations.length; i++) {
    var f = formations[i];
    var nom = document.getElementById('nom-' + f.id).value.trim();
    var dates = document.getElementById('dates-' + f.id).value.trim();
    var lieu = document.getElementById('lieu-' + f.id).value.trim();
    var places = parseInt(document.getElementById('places-' + f.id).value) || 10;
    var description = document.getElementById('desc-' + f.id).value.trim();

    if (!nom) {
      showToast('Veuillez remplir le nom de chaque formation.', true);
      return null;
    }

    result.push({ nom: nom, dates: dates, lieu: lieu, places: places, description: description });
  }
  return result;
}

function genererPDF() {
  saveFormationValues();
  var data = collectFormations();
  if (!data || data.length === 0) return;

  if (!window.jspdf) {
    showToast('Erreur : la librairie PDF ne s\'est pas chargée. Rechargez la page.', true);
    return;
  }

  var jsPDF = window.jspdf.jsPDF;
  var doc = new jsPDF('p', 'mm', 'a4');
  var pageWidth = 210;
  var pageHeight = 297;
  var margin = 18;
  var usableWidth = pageWidth - margin * 2;
  var colN = 12;
  var colNom = 70;
  var colPrenom = 55;
  var rowHeight = 9;
  var footerSpace = 18;
  var maxY = pageHeight - footerSpace;
  var y = margin;

  function addHeader() {
    doc.setFillColor(124, 58, 237);
    doc.rect(0, 0, pageWidth, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('SODIA', margin, 12);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('INSCRIVEZ-VOUS AUX FORMATIONS A VENIR', margin, 22);
  }

  function addFooter() {
    var footerY = pageHeight - 10;
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

  addHeader();
  y = 34;

  for (var fi = 0; fi < data.length; fi++) {
    var formation = data[fi];

    if (fi > 0) {
      checkNewPage(40);
      if (y > 36) {
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.3);
        doc.line(margin + 20, y + 3, pageWidth - margin - 20, y + 3);
        y += 10;
      }
    }

    // Title
    doc.setTextColor(124, 58, 237);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    var titleLines = doc.splitTextToSize(formation.nom.toUpperCase(), usableWidth);
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
      doc.text('Lieu : ' + formation.lieu, margin, y);
      y += 6;
    }

    // Description
    if (formation.description) {
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'italic');
      var descLines = doc.splitTextToSize(formation.description, usableWidth);
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
    var headerY = y + 6;
    doc.text('N\u00B0', margin + 3, headerY);
    doc.text('NOM', margin + colN + 3, headerY);
    doc.text('PR\u00C9NOM', margin + colN + colNom + 3, headerY);
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
    for (var r = 0; r < formation.places; r++) {
      checkNewPage(rowHeight);
      if (r % 2 === 0) {
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
      doc.text(String(r + 1), margin + 3, y + 6);
      y += rowHeight;
    }
  }

  addFooter();
  for (var s = 0; s < data.length; s++) {
    saveFormationName(data[s].nom, data[s].description);
  }
  doc.save('inscriptions-formations-sodia.pdf');
  showToast('PDF téléchargé !');
}

// --- Toast ---

function showToast(message, isError) {
  var existing = document.querySelector('.toast');
  if (existing) existing.remove();

  var toast = document.createElement('div');
  toast.className = 'toast' + (isError ? ' error' : '');
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(function () { toast.classList.add('show'); });

  setTimeout(function () {
    toast.classList.remove('show');
    setTimeout(function () { toast.remove(); }, 300);
  }, 3000);
}

// --- Init ---
document.getElementById('btn-config-api').addEventListener('click', function () {
  showApiKeyModal();
});
updateDatalist();
ajouterFormation();
