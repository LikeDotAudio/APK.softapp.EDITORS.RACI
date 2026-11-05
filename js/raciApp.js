// Part of the APK.audio project — http://APK.audio — made by Anthony Kuzub
// MIT Licence. Free, for everyone, for ever. Full text in LICENSE at the root.
/* raciApp.js — the RACI editor. The block goes in and out over cad.like.audio/host@1
   (window.APKSoftapp.connectHost, vendor/apk-softapp/); the matrix is APKTable
   'raci-matrix' and the roles APKTable 'raci-roles' (vendor/apk-table/).
   Nothing on the network carries a RACI matrix, so there is no "Discovered":
   a matrix comes from the CAD or from a file. */

import { RaciModel, RACI_BLOCK_TYPE } from './raciModel.js';

export { RaciModel };

const BADGE = { R: 'raci-badge badge-r', A: 'raci-badge badge-a', C: 'raci-badge badge-c', I: 'raci-badge badge-i' };

export class RaciApp {
  constructor() {
    this.model = new RaciModel();
    const S = window.APKSoftapp;
    S.inheritTheme();
    this.matrixHost = document.getElementById('raci-table');
    this.rolesHost = document.getElementById('raci-roles');
    this.host = S.connectHost({
      editor: 'RACI Matrix Editor',
      blockType: RACI_BLOCK_TYPE,
      onLoad: (b, m) => this.handleBlockLoaded(b, m),
      onRequest: () => this.model.toBlock(),
    });
    this.initControls();
    this.render();
  }

  handleBlockLoaded(block, meta = {}) {
    if (!this.model.fromBlock(block)) return;
    const tag = document.getElementById('block-tag');
    if (tag && (meta.title || meta.blockName)) tag.textContent = meta.title || meta.blockName;
    this.render();
  }

  changed() {
    this.render();
    this.host.changed(this.model.toBlock());
  }

  initControls() {
    document.getElementById('btn-save')?.addEventListener('click', () => {
      this.host.save(this.model.toBlock(), { title: this.model.matrixTitle, filename: this.model.matrixTitle });
    });

    document.getElementById('btn-open')?.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            this.handleBlockLoaded(JSON.parse(evt.target.result), { title: file.name });
            this.host.changed(this.model.toBlock());
          } catch (err) {
            alert('Invalid block file: ' + err.message);
          }
        };
        reader.readAsText(file);
      };
      input.click();
    });

    document.getElementById('btn-close')?.addEventListener('click', () => this.host.close());

    document.getElementById('btn-add-task')?.addEventListener('click', () => {
      this.model.addTask();
      this.changed();
    });

    const btnAddRole = document.getElementById('btn-add-role');
    const inputRole = document.getElementById('input-new-role');
    if (btnAddRole && inputRole) {
      const doAddRole = () => {
        const val = inputRole.value.trim();
        if (val) {
          this.model.addRole(val);
          inputRole.value = '';
          this.changed();
        }
      };
      btnAddRole.addEventListener('click', doAddRole);
      inputRole.addEventListener('keydown', (e) => { if (e.key === 'Enter') doAddRole(); });
    }

    document.getElementById('prop-title')?.addEventListener('input', (e) => {
      this.model.matrixTitle = e.target.value;
      this.host.changed(this.model.toBlock());
    });
  }

  render() {
    const propTitle = document.getElementById('prop-title');
    if (propTitle && propTitle !== document.activeElement) propTitle.value = this.model.matrixTitle;
    this.renderTelemetry();
    this.renderMatrix();
    this.renderRoles();
  }

  renderTelemetry() {
    const missingA = this.model.missingAccountable();
    const badge = document.getElementById('telemetry-badge');
    if (!badge) return;
    if (missingA === 0) {
      badge.textContent = `All ${this.model.tasks.length} Deliverables Have Designated Accountable (A) Owners`;
      badge.setAttribute('data-apk-state', 'good');
    } else {
      badge.textContent = `⚠️ ${missingA} Deliverable(s) Missing Single Accountable (A) Lead!`;
      badge.setAttribute('data-apk-state', 'dead');
    }
  }

  badge(tIdx, role) {
    const val = this.model.tasks[tIdx]?.raci[role] || '-';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = BADGE[val] || 'raci-badge badge-empty';
    btn.title = 'Click to cycle (R → A → C → I → -)';
    btn.textContent = val;
    btn.addEventListener('click', () => { this.model.cycleCell(tIdx, role); this.changed(); });
    return btn;
  }

  renderMatrix() {
    const columns = [{ key: 'task', label: 'Deliverable Milestone / Engineering Task' }];
    this.model.roles.forEach((role, r) => {
      columns.push({ key: `r${r}`, label: role, align: 'center', render: (_v, _row, t) => this.badge(t, role) });
    });
    const rows = this.model.tasks.map((t) => {
      const row = { task: t.task };
      this.model.roles.forEach((role, r) => { row[`r${r}`] = t.raci[role] || '-'; });
      return row;
    });
    this.matrixTable = window.APKTable.create(this.matrixHost, {
      id: 'raci-matrix',
      columns,
      rows,
      onEdit: (t, key, value) => { if (key === 'task') { this.model.updateTask(t, String(value).trim()); this.changed(); } },
      onDelete: (t) => { this.model.removeTask(t); this.changed(); },
      empty: 'No deliverables yet.',
    });
  }

  renderRoles() {
    this.rolesTable = window.APKTable.create(this.rolesHost, {
      id: 'raci-roles',
      toolbar: false,
      columns: [{ key: 'role', label: 'Role' }],
      rows: this.model.roles.map((role) => ({ role })),
      onEdit: (r, key, value) => {
        if (!this.model.renameRole(this.model.roles[r], value)) { this.render(); return; }
        this.changed();
      },
      onDelete: (r) => { this.model.removeRole(this.model.roles[r]); this.changed(); },
      empty: 'No roles yet.',
    });
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    new RaciApp();
  });
}
