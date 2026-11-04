// Part of the APK.audio project — http://APK.audio — made by Anthony Kuzub
// MIT Licence. Free, for everyone, for ever. Full text in LICENSE at the root.

import { RaciModel } from './raciModel.js';
import { BlockBridge } from './blockBridge.js';

export { RaciModel };

export class RaciApp {
  constructor() {
    this.model = new RaciModel();
    this.bridge = new BlockBridge({
      name: 'RACI Matrix Editor',
      type: 'raci_matrix',
      onBlockLoaded: (b, m) => this.handleBlockLoaded(b, m),
      onBlockChanged: () => this.render()
    });

    this.tableHeader = document.getElementById('raci-table-header');
    this.tableBody = document.getElementById('raci-table-body');
    this.initControls();
    this.render();
    this.autoConnect();
  }

  async autoConnect() {
    const discovered = await this.bridge.fetchDiscoveredProject();
    if (discovered && discovered.raci && discovered.raci.length > 0) {
      this.model.fromBlock(discovered.raci[0]);
      this.render();
    }
  }

  handleBlockLoaded(block, meta) {
    if (block) {
      this.model.fromBlock(block);
      this.render();
    }
  }

  initControls() {
    const btnSave = document.getElementById('btn-save');
    if (btnSave) {
      btnSave.addEventListener('click', () => {
        this.bridge.saveBlock(this.model.toBlock(), { name: this.model.matrixTitle });
      });
    }

    const btnOpen = document.getElementById('btn-open');
    if (btnOpen) {
      btnOpen.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (evt) => {
            try {
              const data = JSON.parse(evt.target.result);
              this.model.fromBlock(data);
              this.render();
            } catch (err) {
              alert('Invalid block file: ' + err.message);
            }
          };
          reader.readAsText(file);
        };
        input.click();
      });
    }

    const btnClose = document.getElementById('btn-close');
    if (btnClose) {
      btnClose.addEventListener('click', () => this.bridge.close());
    }

    const btnDiscovered = document.getElementById('btn-discovered');
    if (btnDiscovered) {
      btnDiscovered.addEventListener('click', async () => {
        const disc = await this.bridge.fetchDiscoveredProject();
        if (disc && disc.raci && disc.raci.length > 0) {
          this.model.fromBlock(disc.raci[0]);
          this.render();
        } else {
          alert('No RACI blocks found in current discovered project.');
        }
      });
    }

    const btnAddTask = document.getElementById('btn-add-task');
    if (btnAddTask) {
      btnAddTask.addEventListener('click', () => {
        this.model.addTask();
        this.render();
        this.bridge.notifyChanged();
      });
    }

    const btnAddRole = document.getElementById('btn-add-role');
    const inputRole = document.getElementById('input-new-role');
    if (btnAddRole && inputRole) {
      const doAddRole = () => {
        const val = inputRole.value.trim();
        if (val) {
          this.model.addRole(val);
          inputRole.value = '';
          this.render();
          this.bridge.notifyChanged();
        }
      };
      btnAddRole.addEventListener('click', doAddRole);
      inputRole.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') doAddRole();
      });
    }

    const propTitle = document.getElementById('prop-title');
    if (propTitle) {
      propTitle.addEventListener('input', (e) => {
        this.model.matrixTitle = e.target.value;
        this.bridge.notifyChanged();
      });
    }
  }

  render() {
    const propTitle = document.getElementById('prop-title');
    if (propTitle) {
      propTitle.value = this.model.matrixTitle;
    }

    this.renderTelemetry();
    this.renderHeader();
    this.renderBody();
  }

  renderTelemetry() {
    let missingA = 0;
    this.model.tasks.forEach(t => {
      const aCount = Object.values(t.raci).filter(v => v === 'A').length;
      if (aCount === 0) missingA++;
    });

    const badge = document.getElementById('telemetry-badge');
    if (badge) {
      if (missingA === 0) {
        badge.textContent = `All ${this.model.tasks.length} Deliverables Have Designated Accountable (A) Owners`;
        badge.style.color = '#4ADE80';
      } else {
        badge.textContent = `⚠️ ${missingA} Deliverable(s) Missing Single Accountable (A) Lead!`;
        badge.style.color = '#EF4444';
      }
    }
  }

  renderHeader() {
    if (!this.tableHeader) return;
    let html = `
      <tr>
        <th style="width: 35%;">Deliverable Milestone / Engineering Task</th>
    `;

    this.model.roles.forEach(role => {
      html += `
        <th style="text-align: center; min-width: 120px;">
          <div style="display: flex; align-items: center; justify-content: center; gap: 4px;">
            <span>${role}</span>
            <button class="btn-remove-role" data-role="${role}" title="Remove Role" style="background: none; border: none; color: #888888; cursor: pointer; font-size: 11px;">×</button>
          </div>
        </th>
      `;
    });

    html += `
        <th style="width: 5%; text-align: center;">Act</th>
      </tr>
    `;
    this.tableHeader.innerHTML = html;

    this.tableHeader.querySelectorAll('.btn-remove-role').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const r = e.target.dataset.role;
        this.model.removeRole(r);
        this.render();
        this.bridge.notifyChanged();
      });
    });
  }

  renderBody() {
    if (!this.tableBody) return;
    this.tableBody.innerHTML = '';

    const badgeClass = (val) => {
      switch (val) {
        case 'R': return 'raci-badge badge-r';
        case 'A': return 'raci-badge badge-a';
        case 'C': return 'raci-badge badge-c';
        case 'I': return 'raci-badge badge-i';
        default: return 'raci-badge badge-empty';
      }
    };

    this.model.tasks.forEach((t, tIdx) => {
      const tr = document.createElement('tr');

      let cells = `
        <td class="inline-cell" contenteditable="true" data-tidx="${tIdx}">${t.task}</td>
      `;

      this.model.roles.forEach(r => {
        const val = t.raci[r] || '-';
        cells += `
          <td style="text-align: center;">
            <button class="${badgeClass(val)}" data-tidx="${tIdx}" data-role="${r}" title="Click to cycle (R → A → C → I → -)">
              ${val}
            </button>
          </td>
        `;
      });

      cells += `
        <td style="text-align: center;">
          <button class="btn-delete" data-tidx="${tIdx}" title="Delete Task">✕</button>
        </td>
      `;

      tr.innerHTML = cells;
      this.tableBody.appendChild(tr);
    });

    this.tableBody.querySelectorAll('[contenteditable=true]').forEach(cell => {
      cell.addEventListener('blur', (e) => {
        const tIdx = parseInt(e.target.dataset.tidx, 10);
        this.model.updateTask(tIdx, e.target.innerText.trim());
        this.renderTelemetry();
        this.bridge.notifyChanged();
      });
    });

    this.tableBody.querySelectorAll('.raci-badge').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tIdx = parseInt(e.target.dataset.tidx, 10);
        const role = e.target.dataset.role;
        this.model.cycleCell(tIdx, role);
        this.render();
        this.bridge.notifyChanged();
      });
    });

    this.tableBody.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tIdx = parseInt(e.target.dataset.tidx, 10);
        this.model.removeTask(tIdx);
        this.render();
        this.bridge.notifyChanged();
      });
    });
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    new RaciApp();
  });
}
