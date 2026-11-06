// Part of the APK.audio project — http://APK.audio — made by Anthony Kuzub
// MIT Licence. Free, for everyone, for ever. Full text in LICENSE at the root.
/* raciApp.js — the RACI editor. The block goes in and out over cad.like.audio/host@1
   (window.APKSoftapp.connectHost, vendor/apk-softapp/); the matrix is APKTable
   'raci-matrix' and the roles APKTable 'raci-roles' (vendor/apk-table/).
   Nothing on the network carries a RACI matrix, so there is no "Discovered":
   a matrix comes from the CAD or from a file.
   bom-fm-3: standalone Save writes the block AND its .ifc twin (APKSoftapp.saveModel; js/raciIfc.js:
   IfcActor per role, IfcTask per deliverable, IfcRelAssignsToActor per cell); Open takes either. */

import { RaciModel, RACI_BLOCK_TYPE } from './raciModel.js';
import { raciToIfc } from './raciIfc.js';

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
    S.describe({
      name: 'RACI Matrix Editor',
      does: 'Says who is Responsible, Accountable, Consulted and Informed for each deliverable, and flags any deliverable with no single Accountable lead.',
      inputs: [
        { name: 'RACI block', from: 'the CAD drawing (raci_matrix block) when opened from the CAD', kind: 'cad' },
        { name: 'Block or model file', from: 'a .json block or the .ifc twin this editor saved, picked with Open', kind: 'file' },
      ],
      outputs: [
        { name: 'RACI block', to: 'the CAD drawing on Save & Return', kind: 'file' },
        { name: '<title>.json + <title>.ifc', to: 'standalone Save: the block and its IFC4X3 twin (IfcActor, IfcTask, IfcRelAssignsToActor)', kind: 'file' },
      ],
      controls: [
        { name: 'Matrix title', how: 'Type in the title box (top bar)' },
        { name: 'Add role', how: 'Type a role name, then + Add Role or Enter' },
        { name: 'Add deliverable', how: '+ Add Deliverable; edit its name in the table' },
        { name: 'Set R / A / C / I', how: 'Click a cell badge to cycle R → A → C → I → -' },
        { name: 'Rename / delete a role or deliverable', how: 'Edit or delete the row in its table' },
        { name: 'Save & Return / Close', how: 'Top-bar buttons: hand the block back to the CAD, or close the editor' },
      ],
      problems: ['file_unreadable', 'bad_json', 'bad_input', 'save_failed'],
    });
    this.initControls();
    this.render();
  }

  handleBlockLoaded(block, meta = {}) {
    if (!this.model.fromBlock(block)) {
      window.APKSoftapp.showProblem('bad_input', {
        subject: meta.title || meta.blockName || 'RACI block',
        detail: 'This is not a RACI matrix: it has no roles or tasks list.',
        fix: ['Open a .json saved by this editor (it has "roles" and "tasks"), or start a new matrix with + Add Role / + Add Deliverable.'],
      });
      return false;
    }
    const tag = document.getElementById('block-tag');
    if (tag && (meta.title || meta.blockName)) tag.textContent = meta.title || meta.blockName;
    this.render();
    return true;
  }

  changed() {
    this.render();
    this.host.changed(this.model.toBlock());
  }

  /** In the CAD: the block goes back (Save & Return). Standalone: the block and its .ifc twin, both or neither. */
  async save() {
    const S = window.APKSoftapp;
    if (window.parent === window) {
      const r = await S.saveModel(this.model, { name: this.model.matrixTitle || 'raci', toIfc: (m) => raciToIfc(m), toJson: (m) => m.toBlock() });
      if (!r.ok && !r.cancelled && r.problem) S.showProblem(r.problem);
      return r;
    }
    try {
      return this.host.save(this.model.toBlock(), { title: this.model.matrixTitle, filename: this.model.matrixTitle });
    } catch (err) {
      S.showProblem('save_failed', { subject: this.model.matrixTitle, detail: err && err.message });
      return null;
    }
  }

  /** Open a .json block or an .ifc this editor saved (an apk.raci/2 matrix). */
  async open() {
    const S = window.APKSoftapp;
    const o = await S.openModel({
      fromIfc: (text, name) => { this.model.loadIfc(text, name); return this.model; },
      fromJson: (data) => {
        if (!this.model.fromBlock(data)) throw new TypeError('this is not a RACI matrix: it has no roles or tasks list');
        return this.model;
      },
    });
    if (!o.ok) {
      if (!o.cancelled && o.problem) S.showProblem(o.problem, { onRetry: () => this.open() });
      return o;
    }
    const tag = document.getElementById('block-tag');
    if (tag) tag.textContent = o.name || 'RACI matrix';
    this.changed();
    return o;
  }

  initControls() {
    document.getElementById('btn-save')?.addEventListener('click', () => this.save());
    document.getElementById('btn-open')?.addEventListener('click', () => this.open());

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
