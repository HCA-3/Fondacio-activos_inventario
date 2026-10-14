/**
 * FONDACIO COLOMBIA - SISTEMA DE INVENTARIO
 * Módulo de Diagnóstico de Software, Licenciamiento y Adecuación de Tablets
 * Conectado a la API REST de FastAPI
 */

function initDiagnosticoModule() {
  renderDiagnosticoView();
}

async function renderDiagnosticoView() {
  const container = document.getElementById('view-diagnostico');
  if (!container) return;

  try {
    const assets = await DB.getAssets({ limit: 500 });
    const pcs = assets.filter(a => a.category !== 'tablet' && (a.computerType || '').toUpperCase() !== 'TABLET' && !(a.code && a.code.startsWith('TAB')));
    const tablets = assets.filter(a => a.category === 'tablet' || (a.computerType || '').toUpperCase() === 'TABLET' || (a.code && a.code.startsWith('TAB')));

    const activeLicenses = pcs.filter(a => a.licenseState !== 'NO ACTIVADO').length;
    const inactiveLicenses = pcs.length - activeLicenses;

    container.innerHTML = `
      <!-- Barra Superior de Diagnóstico -->
      <div class="toolbar-card">
        <div class="toolbar-row">
          <div>
            <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--text-main); display: flex; align-items: center; gap: 0.5rem;">
              <i data-lucide="shield-check" style="color: var(--primary-500);"></i>
              Diagnóstico de Software, Licencias y Adecuación Tecnológica
            </h3>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.2rem;">
              Auditoría de sistemas operativos, estado de activación, seguridad Defender, optimización de arranque y mitigación de obsolescencia.
            </p>
          </div>
          <button class="btn btn-primary btn-sm" onclick="exportInventoryToExcel()">
            <i data-lucide="file-spreadsheet"></i>
            <span>Descargar Informe Excel Oficial</span>
          </button>
        </div>
      </div>

      <!-- Tarjetas de Resumen Rápido de Estado -->
      <div class="metrics-grid" style="margin-bottom: 1.5rem;">
        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-title">Licencias Windows PCs</span>
            <div class="metric-icon-wrap icon-green">
              <i data-lucide="key"></i>
            </div>
          </div>
          <div class="metric-value" style="font-size: 1.3rem;">${activeLicenses} / ${pcs.length} Activas</div>
          <div class="metric-footer">
            ${inactiveLicenses > 0 
              ? `<span class="metric-tag warning" style="color: var(--accent-rose); background: #fee2e2;">${inactiveLicenses} Alerta(s)</span> Requiere clave` 
              : '✅ Todos los PCs licenciados'}
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-title">Seguridad & Antivirus</span>
            <div class="metric-icon-wrap icon-blue">
              <i data-lucide="shield"></i>
            </div>
          </div>
          <div class="metric-value" style="font-size: 1.3rem;">100% Protegido</div>
          <div class="metric-footer">
            Microsoft Defender activo en equipos
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-title">Tablets Mitigadas</span>
            <div class="metric-icon-wrap icon-purple">
              <i data-lucide="tablet"></i>
            </div>
          </div>
          <div class="metric-value" style="font-size: 1.3rem;">${tablets.length} Habilitadas</div>
          <div class="metric-footer">
            Evasión de Google Play con Workspace Web
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-title">Red Institucional</span>
            <div class="metric-icon-wrap icon-amber">
              <i data-lucide="wifi"></i>
            </div>
          </div>
          <div class="metric-value" style="font-size: 1.15rem; color: #1565c0;">ALTINET FONDACIO</div>
          <div class="metric-footer">
            Conexión inalámbrica en sedes
          </div>
        </div>
      </div>

      <!-- SECCIÓN 1: COMPUTADORES PORTÁTILES (DIAGNÓSTICO LÓGICO Y SOFTWARE) -->
      <div class="card-panel" style="margin-bottom: 1.5rem;">
        <div class="card-panel-header">
          <div>
            <h3>💻 Diagnóstico de Software y Licenciamiento en PCs</h3>
            <p style="font-size: 0.76rem; color: var(--text-secondary);">Levantamiento detallado de sistema operativo, parches de seguridad y acciones de mantenimiento ejecutadas.</p>
          </div>
        </div>

        <div class="table-responsive">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Equipo / Host</th>
                <th>Sistema Operativo / Build</th>
                <th>Estado de Activación</th>
                <th>Seguridad & Windows Update</th>
                <th>Acción Técnica / Plan</th>
              </tr>
            </thead>
            <tbody>
              ${pcs.length === 0 ? '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No hay computadores registrados.</td></tr>' : ''}
              ${pcs.map(pc => {
                const isKmsError = pc.licenseState === 'NO ACTIVADO';
                return `
                  <tr style="${isKmsError ? 'background: rgba(239, 68, 68, 0.04);' : ''}">
                    <td>
                      <span class="asset-code-badge">${escapeHtml(pc.code)}</span>
                      <div style="font-weight: 700; font-size: 0.82rem; margin-top: 0.2rem;">${escapeHtml(pc.brand || '')} ${escapeHtml(pc.model || '')}</div>
                      <div style="font-size: 0.72rem; color: var(--text-secondary); font-family: monospace;">Host: ${escapeHtml(pc.networkHostname || pc.code)}</div>
                    </td>
                    <td>
                      <div style="font-weight: 600; font-size: 0.8rem; color: #0284c7;">${escapeHtml(pc.os || 'Windows')}</div>
                      <div style="font-size: 0.72rem; color: var(--text-muted);">${escapeHtml(pc.computerType || 'Portátil')}</div>
                    </td>
                    <td>
                      ${isKmsError ? `
                        <span class="status-pill status-baja" style="font-size: 0.72rem;">⚠️ NO ACTIVADO</span>
                        <div style="font-size: 0.7rem; color: var(--accent-rose); font-weight: 600; margin-top: 0.25rem;">
                          ${escapeHtml(pc.licenseAlerts || 'Requiere Clave')}
                        </div>
                      ` : `
                        <span class="status-pill status-operativo" style="font-size: 0.72rem;">✅ ACTIVADO</span>
                        <div style="font-size: 0.72rem; color: var(--text-secondary); margin-top: 0.2rem;">${escapeHtml(pc.licenseType || 'Licencia Digital')}</div>
                      `}
                    </td>
                    <td>
                      <div style="font-size: 0.78rem; font-weight: 500; color: #16a34a;">
                        🛡️ ${escapeHtml(pc.securityStatus || 'Microsoft Defender')}
                      </div>
                      <div style="font-size: 0.72rem; color: var(--text-secondary); margin-top: 0.2rem;">
                        🔄 ${escapeHtml(pc.windowsUpdateStatus || 'Actualizado')}
                      </div>
                    </td>
                    <td>
                      <div style="font-size: 0.74rem; line-height: 1.4; color: ${isKmsError ? '#b91c1c' : '#15803d'}; font-weight: 500;">
                        ${escapeHtml(pc.recommendations || 'Operativo en sede')}
                      </div>
                      <button class="btn btn-sm btn-secondary" onclick="viewHojaDeVida('${pc.id}')" style="margin-top: 0.4rem; padding: 2px 8px; font-size: 0.72rem;">
                        Ver Ficha Técnica
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- SECCIÓN 2: CENSO Y PLAN DE MITIGACIÓN DE OBSOLESCENCIA EN TABLETS -->
      <div class="card-panel" style="margin-bottom: 1.5rem;">
        <div class="card-panel-header">
          <div>
            <h3>📱 Censo de Dispositivos Móviles (Tablets) y Plan de Mitigación</h3>
            <p style="font-size: 0.76rem; color: var(--text-secondary);">
              Estrategia de evasión de ciclo de vida en Android mediante integración directa con Google Workspace.
            </p>
          </div>
          <span class="status-pill status-operativo">${tablets.length} Unidades</span>
        </div>

        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 1rem; margin-bottom: 1.25rem;">
          <h4 style="font-size: 0.88rem; font-weight: 700; color: #166534; margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.4rem;">
            <i data-lucide="check-circle-2"></i>
            Estrategia Técnica de Habilitación Colaborativa:
          </h4>
          <p style="font-size: 0.8rem; color: #14532d; line-height: 1.5;">
            Se configuró un entorno web colaborativo ligero con acceso directo en pantalla principal a <strong>Google Drive, Google Docs y Google Sheets</strong> bajo la <strong>Cuenta Institucional Google Fondacio</strong>, garantizando su uso en talleres pedagógicos, lectura y consulta comunitaria sin requerir renovación forzosa de hardware.
          </p>
        </div>

        <div class="assets-cards-grid" style="grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));">
          ${tablets.length === 0 ? '<p style="color: var(--text-muted); padding: 1rem;">No hay tablets registradas.</p>' : ''}
          ${tablets.map(tab => `
            <div class="asset-card" style="border-top: 3px solid var(--primary-500);">
              <div class="asset-card-top">
                <div>
                  <span class="asset-code-badge">${escapeHtml(tab.code)}</span>
                  <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-main); margin-left: 0.4rem;">${escapeHtml(tab.model)}</span>
                </div>
                <span class="status-pill status-operativo">Habilitada</span>
              </div>

              <div class="asset-card-specs-list" style="margin-top: 0.5rem; font-size: 0.78rem;">
                <div class="spec-line">
                  <span>S.O.:</span>
                  <strong>${escapeHtml(tab.os || 'Android OS')}</strong>
                </div>
                <div class="spec-line">
                  <span>Entorno:</span>
                  <span>Nube / Colaborativo</span>
                </div>
                <div class="spec-line">
                  <span>Sede:</span>
                  <span>${escapeHtml(tab.sede)}</span>
                </div>
                <div class="spec-line">
                  <span>Acceso:</span>
                  <span style="color: #16a34a; font-weight: 600;">Google Drive Web Directo</span>
                </div>
                <div class="spec-line">
                  <span>Uso:</span>
                  <span style="font-size: 0.72rem;">Talleres y lectura comunitaria</span>
                </div>
              </div>

              <div class="asset-card-footer" style="padding-top: 0.6rem; border-top: 1px solid var(--border-subtle);">
                <button class="btn btn-sm btn-primary" onclick="viewHojaDeVida('${tab.id}')" style="width: 100%;">
                  <i data-lucide="file-spreadsheet"></i> Ver Hoja de Vida
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
  } catch (err) {
    console.error('Error al renderizar diagnóstico:', err);
    showToast('Error al cargar diagnóstico: ' + err.message, 'error');
  }
}
