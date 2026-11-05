// Part of the APK.audio project — http://APK.audio — made by Anthony Kuzub
// MIT Licence. Free, for everyone, for ever. Full text in LICENSE at the root.

export const RACI_BLOCK_TYPE = 'raci_matrix';
export const RACI_SEQUENCE = ['-', 'R', 'A', 'C', 'I'];

export class RaciModel {
  constructor(matrixTitle = 'FACILITY-COMMISSIONING-RACI') {
    this.matrixTitle = matrixTitle;
    this.roles = ['Lead AV Engineer', 'Project Manager', 'Field Electrician', 'Client Operations'];
    this.tasks = [
      { task: 'Architectural Schematic Design', raci: { 'Lead AV Engineer': 'R', 'Project Manager': 'A', 'Field Electrician': 'C', 'Client Operations': 'I' } },
      { task: 'Network Switch & IPAM Staging', raci: { 'Lead AV Engineer': 'R', 'Project Manager': 'A', 'Field Electrician': 'I', 'Client Operations': 'C' } },
      { task: 'Conduit & AC Mains Power Drop', raci: { 'Lead AV Engineer': 'C', 'Project Manager': 'A', 'Field Electrician': 'R', 'Client Operations': 'I' } },
      { task: 'Final Acceptance Sign-off', raci: { 'Lead AV Engineer': 'C', 'Project Manager': 'R', 'Field Electrician': 'I', 'Client Operations': 'A' } }
    ];
  }

  addTask(taskName = 'New Engineering Deliverable') {
    const t = { task: taskName, raci: {} };
    this.roles.forEach(r => {
      t.raci[r] = '-';
    });
    this.tasks.push(t);
    return t;
  }

  removeTask(index) {
    if (index >= 0 && index < this.tasks.length) {
      return this.tasks.splice(index, 1)[0];
    }
    return null;
  }

  updateTask(index, newName) {
    if (this.tasks[index]) {
      this.tasks[index].task = newName;
    }
  }

  addRole(roleName = 'New Stakeholder Role') {
    const r = roleName.trim();
    if (r && !this.roles.includes(r)) {
      this.roles.push(r);
      this.tasks.forEach(t => {
        if (!t.raci[r]) t.raci[r] = '-';
      });
    }
  }

  removeRole(roleName) {
    const idx = this.roles.indexOf(roleName);
    if (idx !== -1) {
      this.roles.splice(idx, 1);
      this.tasks.forEach(t => {
        delete t.raci[roleName];
      });
    }
  }

  renameRole(oldName, newName) {
    const n = String(newName || '').trim();
    const idx = this.roles.indexOf(oldName);
    if (idx === -1 || !n || n === oldName || this.roles.includes(n)) return false;
    this.roles[idx] = n;
    this.tasks.forEach(t => {
      t.raci[n] = t.raci[oldName] || '-';
      delete t.raci[oldName];
    });
    return true;
  }

  /** Deliverables with no single Accountable (A) owner. */
  missingAccountable() {
    return this.tasks.filter(t => Object.values(t.raci).filter(v => v === 'A').length === 0).length;
  }

  cycleCell(taskIndex, role) {
    const sequence = RACI_SEQUENCE;
    if (this.tasks[taskIndex]) {
      const cur = this.tasks[taskIndex].raci[role] || '-';
      const nextIdx = (sequence.indexOf(cur) + 1) % sequence.length;
      this.tasks[taskIndex].raci[role] = sequence[nextIdx];
      return sequence[nextIdx];
    }
    return '-';
  }

  setCell(taskIndex, role, value) {
    if (this.tasks[taskIndex]) {
      this.tasks[taskIndex].raci[role] = value;
    }
  }

  toBlock() {
    return {
      type: RACI_BLOCK_TYPE,
      id: `raci_${this.matrixTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      matrixTitle: this.matrixTitle,
      roles: [...this.roles],
      tasks: JSON.parse(JSON.stringify(this.tasks))
    };
  }

  fromBlock(block) {
    if (!block || typeof block !== 'object') return false;
    if (!Array.isArray(block.roles) && !Array.isArray(block.tasks)) return false;
    if (block.matrixTitle) this.matrixTitle = block.matrixTitle;
    if (Array.isArray(block.roles)) {
      this.roles = [...block.roles];
    }
    if (Array.isArray(block.tasks)) {
      this.tasks = JSON.parse(JSON.stringify(block.tasks));
    }
    return true;
  }
}
