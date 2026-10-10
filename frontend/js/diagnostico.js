/**
 * FONDACIO COLOMBIA - SISTEMA DE INVENTARIO
 * Módulo de Diagnóstico de Software, Licenciamiento y Adecuación de Tablets
 * Reflejo de las hojas 'Software y Mantenimiento' y 'Dispositivos Móviles (Tablets)'
 */

function initDiagnosticoModule() {
  renderDiagnosticoView();
}

function renderDiagnosticoView() {
  const container = document.getElementById('view-diagnostico');
  if (!container) return;

  const assets = DB.getAssets();
  const pcs = assets.filter(a => a.category !== 'tablet' && !a.code.startsWith('TAB'));
  const tablets = assets.filter(a => a.category === 'tablet' || a.code.startsWith('TAB'));

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
          <span>Descargar Informe Excel Completo</span>
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
        <div class="metric-value" style="font-size: 1.3rem;">3 / 4 Activas</div>
        <div class="metric-footer">
          <span class="metric-tag warning" style="color: var(--accent-rose); background: #fee2e2;">1 Alerta KMS</span> PC-02 requiere clave
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
          Microsoft Defender activo en todos los PCs
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-header">
          <span class="metric-title">Tablets Mitigadas</span>
          <div class="metric-icon-wrap icon-purple">
            <i data-lucide="tablet"></i>
          </div>
        </div>
        <div class="metric-value" style="font-size: 1.3rem;">5 / 5 Habilitadas</div>
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
          Conexión inalámbrica segura en sede
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
              <th>Optimización de Inicio & Software</th>
              <th>Acción Técnica / Plan</th>
            </tr>
          </thead>
          <tbody>
            ${pcs.map(pc => {
              const isKmsError = pc.licenseState === 'NO ACTIVADO';
              return `
                <tr style="${isKmsError ? 'background: rgba(239, 68, 68, 0.04);' : ''}">
                  <td>
                    <span class="asset-code-badge">${pc.code}</span>
                    <div style="font-weight: 700; font-size: 0.82rem; margin-top: 0.2rem;">${escapeHtml(pc.brand)} ${escapeHtml(pc.model)}</div>
                    <div style="font-size: 0.72rem; color: var(--text-secondary); font-family: monospace;">Host: ${escapeHtml(pc.networkHostname || pc.code)}</div>
                  </td>
                  <td>
                    <div style="font-weight: 600; font-size: 0.8rem; color: #0284c7;">${escapeHtml(pc.os)}</div>
                    <div style="font-size: 0.72rem; color: var(--text-muted);">Compilación: ${escapeHtml(pc.osBuild || '22H2')}</div>
                    ${pc.osInstallDate ? `<div style="font-size: 0.7rem; color: var(--text-muted);">Instalado: ${escapeHtml(pc.osInstallDate)}</div>` : ''}
                  </td>
                  <td>
                    ${isKmsError ? `
                      <span class="status-pill status-baja" style="font-size: 0.72rem;">⚠️ NO ACTIVADO</span>
                      <div style="font-size: 0.7rem; color: var(--accent-rose); font-weight: 600; margin-top: 0.25rem;">
                        ${escapeHtml(pc.licenseAlerts || 'Error KMS')}
                      </div>
                      <div style="font-size: 0.68rem; color: var(--text-muted);">Clave: ${escapeHtml(pc.licenseKeyPartial || '')}</div>
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
                    <div style="font-size: 0.75rem; color: var(--text-main); font-weight: 500;">
                      ⚡ ${escapeHtml(pc.startupConfig || 'Optimización general')}
                    </div>
                    <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 0.2rem;">
                      📦 ${escapeHtml(pc.installedSoftware || 'Ofimática y Utilidades')}
                    </div>
                  </td>
                  <td>
                    <div style="font-size: 0.74rem; line-height: 1.4; color: ${isKmsError ? '#b91c1c' : '#15803d'}; font-weight: 500;">
                      ${escapeHtml(pc.maintenanceAction || pc.recommendations || 'Operativo')}
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
            Estrategia de evasión de ciclo de vida en Android 5.0 (Lollipop) mediante integración directa con Google Workspace.
          </p>
        </div>
        <span class="status-pill status-operativo">5 Unidades Adecuadas</span>
      </div>

      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 1rem; margin-bottom: 1.25rem;">
        <h4 style="font-size: 0.88rem; font-weight: 700; color: #166534; margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.4rem;">
          <i data-lucide="check-circle-2"></i>
          Estrategia Técnica de Habilitación Colaborativa:
        </h4>
        <p style="font-size: 0.8rem; color: #14532d; line-height: 1.5;">
          Debido a la finalización de ciclo de soporte de Android 5.0 para aplicaciones pesadas de Google Play Store, se configuró un entorno web colaborativo ligero con acceso directo en pantalla principal a <strong>Google Drive, Google Docs y Google Sheets</strong> bajo la <strong>Cuenta Institucional Google Fondacio</strong>, garantizando su uso en talleres pedagógicos, lectura y consulta comunitaria sin requerir renovación forzosa de hardware.
        </p>
      </div>

      <div class="assets-cards-grid" style="grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));">
        ${tablets.map(tab => `
          <div class="asset-card" style="border-top: 3px solid var(--primary-500);">
            <div class="asset-card-top">
              <div>
                <span class="asset-code-badge">${tab.code}</span>
                <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-main); margin-left: 0.4rem;">${escapeHtml(tab.model)}</span>
              </div>
              <span class="status-pill status-operativo">Habilitada</span>
            </div>

            <div class="asset-card-specs-list" style="margin-top: 0.5rem; font-size: 0.78rem;">
              <div class="spec-line">
                <span>S.O.:</span>
                <strong>Android OS 5.0 (Lollipop)</strong>
              </div>
              <div class="spec-line">
                <span>Entorno:</span>
                <span>Nube / Colaborativo</span>
              </div>
              <div class="spec-line">
                <span>Cuenta:</span>
                <span style="font-size: 0.72rem; color: #1565c0;">Google Fondacio</span>
              </div>
              <div class="spec-line">
                <span>Red:</span>
                <span>${escapeHtml(tab.wifiSSID || 'ALTINET FONDACIO')}</span>
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

    <!-- SECCIÓN 3: RENDIMIENTO Y MONITOREO DE ALMACENAMIENTO SSD -->
    <div class="card-panel">
      <div class="card-panel-header">
        <h3>💾 Monitoreo de Espacio y Almacenamiento SSD en Equipos</h3>
      </div>
      <div class="form-grid" style="grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem;">
        ${pcs.map(pc => {
          const usedPct = pc.diskUsagePct ? parseFloat(pc.diskUsagePct) : 50;
          const isHighUsage = usedPct > 75;
          const barColor = isHighUsage ? 'var(--accent-rose)' : usedPct > 50 ? 'var(--accent-amber)' : 'var(--primary-500)';

          return `
            <div style="background: var(--bg-surface-elevated, #f8fafc); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-subtle);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                <span class="asset-code-badge">${pc.code}</span>
                <strong style="font-size: 0.8rem;">${escapeHtml(pc.brand)} ${escapeHtml(pc.model)}</strong>
              </div>
              <div style="font-size: 0.74rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
                ${escapeHtml(pc.disk1Model || 'SSD')}
              </div>
              <div style="background: rgba(0,0,0,0.08); height: 8px; border-radius: 4px; overflow: hidden; margin-bottom: 0.4rem;">
                <div style="width: ${usedPct}%; height: 100%; background: ${barColor}; border-radius: 4px; transition: width 0.3s ease;"></div>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--text-secondary);">
                <span>Usado: <strong>${escapeHtml(pc.diskUsed || '-')}</strong> (${escapeHtml(pc.diskUsagePct || '')})</span>
                <span>Libre: <strong style="color: var(--primary-600);">${escapeHtml(pc.diskFree || '-')}</strong></span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  if (window.lucide) lucide.createIcons();
}
