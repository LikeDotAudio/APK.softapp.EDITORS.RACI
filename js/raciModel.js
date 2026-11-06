// Part of the APK.audio project — http://APK.audio — made by Anthony Kuzub
// MIT Licence. Free, for everyone, for ever. Full text in LICENSE at the root.

/* bom-fm-3: roles and deliverables carry stable ids (roleInfo[name].id, tasks[].id), so a rename keeps
   their IFC GlobalIds; each role has the IfcRoleEnum word it is (roleInfo[name].ifcRole, USERDEFINED when
   IFC has none). Saved as the raci_matrix block (apk.raci/2) and its .ifc twin (js/raciIfc.js: IfcActor +
   IfcTask + IfcRelAssignsToActor). */
import { raciFromIfc, ifcRoleFor } from './raciIfc.js';

export const RACI_BLOCK_TYPE = 'raci_matrix';
export const RACI_SCHEMA = 'apk.raci/2';
export const RACI_SEQUENCE = ['-', 'R', 'A', 'C', 'I'];
const slug = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-');

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
    this.createdOn = new Date().toISOString().slice(0, 10);   // stored: the twin's CreationDate, so a saved matrix gives the same bytes
    this.roleInfo = {};
    this.baseText = null;
    this.source = null;
    this.ensureIds();
  }

  matrixId() { return `raci_${String(this.matrixTitle).toLowerCase().replace(/[^a-z0-9]/g, '_')}`; }

  /** Every role and task gets a stable id once; a block from before gets them on load. */
  ensureIds() {
    const used = new Set(Object.values(this.roleInfo).map((r) => r.id));
    for (const role of this.roles) {
      const info = (this.roleInfo[role] ||= {});
      if (!info.id) {
        let id = slug(role) || 'role', n = 2;
        while (used.has(id)) id = `${slug(role) || 'role'}-${n++}`;
        info.id = id;
      }
      used.add(info.id);
      info.ifcRole ||= ifcRoleFor(role);
    }
    for (const r of Object.keys(this.roleInfo)) if (!this.roles.includes(r)) delete this.roleInfo[r];
    const taken = new Set(this.tasks.map((t) => t.id).filter(Boolean));
    let n = 1;
    for (const t of this.tasks) {
      if (t.id) continue;
      while (taken.has(`task-${n}`)) n++;
      t.id = `task-${n}`;
      taken.add(t.id);
    }
  }

  addTask(taskName = 'New Engineering Deliverable') {
    const t = { task: taskName, raci: {} };
    this.roles.forEach(r => {
      t.raci[r] = '-';
    });
    this.tasks.push(t);
    this.ensureIds();
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
      this.ensureIds();
    }
  }

  removeRole(roleName) {
    const idx = this.roles.indexOf(roleName);
    if (idx !== -1) {
      this.roles.splice(idx, 1);
      this.tasks.forEach(t => {
        delete t.raci[roleName];
      });
      delete this.roleInfo[roleName];
    }
  }

  renameRole(oldName, newName) {
    const n = String(newName || '').trim();
    const idx = this.roles.indexOf(oldName);
    if (idx === -1 || !n || n === oldName || this.roles.includes(n)) return false;
    this.roles[idx] = n;
    this.roleInfo[n] = { ...(this.roleInfo[oldName] || {}) };   // the id (and so the GlobalId) stays
    delete this.roleInfo[oldName];
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

  /** Open a twin this editor saved (or any .ifc holding an apk.raci/2 matrix): the matrix comes back. */
  loadIfc(text, name = 'raci.ifc') {
    const got = raciFromIfc(text);
    this.matrixTitle = got.matrixTitle;
    if (got.createdOn) this.createdOn = got.createdOn;
    this.roles = got.roles;
    this.roleInfo = got.roleInfo;
    this.tasks = got.tasks;
    this.ensureIds();
    this.baseText = text;
    this.source = { name };
    return got;
  }

  toBlock() {
    return {
      type: RACI_BLOCK_TYPE,
      schema: RACI_SCHEMA,
      id: this.matrixId(),
      matrixTitle: this.matrixTitle,
      createdOn: this.createdOn,
      roles: [...this.roles],
      roleInfo: JSON.parse(JSON.stringify(this.roleInfo)),
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
    this.roleInfo = block.roleInfo && typeof block.roleInfo === 'object' ? JSON.parse(JSON.stringify(block.roleInfo)) : {};
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(block.createdOn || ''))) this.createdOn = block.createdOn;
    this.baseText = null;
    this.ensureIds();
    return true;
  }
}
