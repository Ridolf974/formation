let formations = [];
let nextId = 1;

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

async function genererDescription(id) {
  const nom = document.getElementById(`nom-${id}`).value.trim();
  if (!nom) {
    showToast('Veuillez saisir le nom de la formation.', true);
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
    const response = await fetch('/api/generate-description', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom, dates, lieu }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erreur serveur');
    }

    textarea.value = data.description;
    hint.style.display = 'block';
    showToast('Description générée avec succès !');
  } catch (error) {
    showToast(error.message, true);
  } finally {
    btn.textContent = 'Générer';
    btn.disabled = false;
    btn.classList.remove('loading');
  }
}

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

// Init with one formation
ajouterFormation();
