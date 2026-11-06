// Part of the APK.audio project — http://APK.audio — made by Anthony Kuzub
// MIT Licence. Free, for everyone, for ever. Full text in LICENSE at the root.
/* raciIfc.js — THE RACI MATRIX AS IFC ACTORS ASSIGNED TO TASKS (bom-fm-3).

   WRITE raciToIfc(model) — a model of its own (or over the .ifc the matrix was opened from, kept whole):
     IfcWorkSchedule <matrix title>   Identification apk.raci/2 (the projection marker), PLANNED,
                                      CreationDate / StartTime = the matrix's createdOn; declared in the project
       └ one IfcTask per deliverable (IfcRelAssignsToControl), Identification = the task's stable id
     each role                        an IfcActor whose TheActor is an IfcOrganization (Identification = the
                                      role's stable id, Name = the role) with its IfcActorRole: the IfcRoleEnum
                                      word when one fits (PROJECTMANAGER, CLIENT, …), else USERDEFINED + the name
                                      — and assigned to the schedule (IfcRelAssignsToActor, in column order)
     each R / A / C / I               one IfcRelAssignsToActor per role and letter: RelatedObjects = the tasks,
                                      RelatingActor = the role's actor, ActingRole = IfcActorRole(USERDEFINED,
                                      'Responsible' | 'Accountable' | 'Consulted' | 'Informed') — IfcRoleEnum has
                                      no R/A/C/I, so they are USERDEFINED by necessity

   READ  raciFromIfc(text) — the matrix back from an apk.raci/2 schedule.

   GlobalIds come from the stable ids, so renaming a role or a task keeps its GlobalId. Real people's
   names and e-mail addresses are personal data: a role is a role, never a person, in what is written. */
import * as S from './ifc/apk-ifc.mjs';
import { IfcOut, enumv, str, refs, textOf, enumOf, referrers, dateTime } from './ifc/ifcOut.mjs';

export const RACI_PROJECTION = 'apk.raci/2';
export const RACI_WORDS = { R: 'Responsible', A: 'Accountable', C: 'Consulted', I: 'Informed' };
const LETTER = Object.fromEntries(Object.entries(RACI_WORDS).map(([k, v]) => [v, k]));

/* A role name → the IfcRoleEnum word it is, when IFC has one (IFC4X3_ADD2 IfcRoleEnum); else USERDEFINED. */
const ROLE_WORDS = [
  [/sub-?contractor/i, 'SUBCONTRACTOR'], [/contractor|installer/i, 'CONTRACTOR'], [/project manager|\bpm\b/i, 'PROJECTMANAGER'],
  [/construction manager/i, 'CONSTRUCTIONMANAGER'], [/commissioning/i, 'COMMISSIONINGENGINEER'], [/electrical engineer/i, 'ELECTRICALENGINEER'],
  [/mechanical engineer/i, 'MECHANICALENGINEER'], [/structural engineer/i, 'STRUCTURALENGINEER'], [/civil engineer/i, 'CIVILENGINEER'], [/cost engineer|quantity surveyor/i, 'COSTENGINEER'],
  [/facilit/i, 'FACILITIESMANAGER'], [/client|customer/i, 'CLIENT'], [/operator|operations/i, 'BUILDINGOPERATOR'],
  [/owner/i, 'OWNER'], [/architect/i, 'ARCHITECT'], [/consultant/i, 'CONSULTANT'], [/supplier|vendor/i, 'SUPPLIER'],
  [/reseller|dealer/i, 'RESELLER'], [/manufacturer|maker/i, 'MANUFACTURER'], [/engineer/i, 'ENGINEER'],
];
export const IFC_ROLES = ['ARCHITECT', 'BUILDINGOPERATOR', 'BUILDINGOWNER', 'CIVILENGINEER', 'CLIENT', 'COMMISSIONINGENGINEER',
  'CONSTRUCTIONMANAGER', 'CONSULTANT', 'CONTRACTOR', 'COSTENGINEER', 'ELECTRICALENGINEER', 'ENGINEER', 'FACILITIESMANAGER',
  'FIELDCONSTRUCTIONMANAGER', 'MANUFACTURER', 'MECHANICALENGINEER', 'OWNER', 'PROJECTMANAGER', 'RESELLER', 'STRUCTURALENGINEER',
  'SUBCONTRACTOR', 'SUPPLIER', 'USERDEFINED'];

export function ifcRoleFor(name) {
  const hit = ROLE_WORDS.find(([rx]) => rx.test(String(name || '')));
  return hit ? hit[1] : 'USERDEFINED';
}

/* ================================================================== WRITE */

export function raciToIfc(model) {
  const out = model.baseText
    ? IfcOut.over(model.baseText, { strip: RACI_PROJECTION })
    : IfcOut.fresh({ fileName: 'raci.ifc', app: 'EDITORS.RACI', project: model.matrixTitle, scope: `raci/${model.matrixId()}` });
  const R = ['raci', out.projectGid, model.matrixId()];
  const created = dateTime(model.createdOn) || '1970-01-01T00:00:00';
  const schedule = out.rooted('IFCWORKSCHEDULE', [...R, 'schedule'], [model.matrixTitle, null, null, RACI_PROJECTION, created, null,
    'RACI matrix', null, null, created, null, enumv('PLANNED')]);
  out.declare([...R, 'schedule'], [schedule]);

  const taskRef = new Map();
  for (const t of model.tasks) {
    taskRef.set(t.id, out.rooted('IFCTASK', [...R, 'task', t.id], [str(t.task) || t.id, null, null, t.id, null, null, null,
      enumv('F'), null, null, enumv('NOTDEFINED')]));
  }
  if (taskRef.size) out.rooted('IFCRELASSIGNSTOCONTROL', [...R, 'tasks'], [null, null, [...taskRef.values()], null, schedule]);

  for (const role of model.roles) {
    const info = model.roleInfo[role] || {};
    const id = info.id || role;
    const word = IFC_ROLES.includes(info.ifcRole) ? info.ifcRole : ifcRoleFor(role);
    const actorRole = out.add('IFCACTORROLE', [enumv(word), word === 'USERDEFINED' ? role : null, null]);
    const org = out.add('IFCORGANIZATION', [id, role, null, [actorRole], null]);
    const actor = out.rooted('IFCACTOR', [...R, 'role', id], [role, null, null, org]);
    // the role belongs to the matrix even with no letter yet: assigned to the schedule, in column order
    out.rooted('IFCRELASSIGNSTOACTOR', [...R, 'role', id, 'matrix'], ['Role', null, [schedule], null, actor, null]);
    for (const letter of ['R', 'A', 'C', 'I']) {
      const tasks = model.tasks.filter((t) => t.raci[role] === letter).map((t) => taskRef.get(t.id));
      if (!tasks.length) continue;
      out.rooted('IFCRELASSIGNSTOACTOR', [...R, 'role', id, letter], [RACI_WORDS[letter], null, tasks, null, actor,
        out.add('IFCACTORROLE', [enumv('USERDEFINED'), RACI_WORDS[letter], null])]);
    }
  }
  return out.text();
}

/* ================================================================== READ */

/** An IFC text → { matrixTitle, createdOn, roles, roleInfo, tasks } from its apk.raci/2 schedule. */
export function raciFromIfc(input) {
  const file = typeof input === 'string' ? S.parseStep(input) : input;
  const schedule = S.entitiesByType(file, 'IFCWORKSCHEDULE').find((e) => e.args[5] === RACI_PROJECTION);
  if (!schedule) throw new Error('no RACI matrix (an apk.raci/2 IfcWorkSchedule) in this file');
  const controls = referrers(file, 'IFCRELASSIGNSTOCONTROL', 6);
  const tasks = [];
  const byTaskId = new Map();
  for (const rel of controls.get(schedule.id) || []) {
    for (const r of refs(rel.args[4])) {
      const t = file.byId.get(r.id);
      if (!t || t.type !== 'IFCTASK') continue;
      const task = { id: textOf(t.args[5]) || t.args[0], task: textOf(t.args[2]), raci: {} };
      tasks.push(task);
      byTaskId.set(t.id, task);
    }
  }
  const roles = [];
  const roleInfo = {};
  const nameOf = (rel) => {
    const actor = S.deref(file, rel.args[6]);
    const org = actor && S.deref(file, actor.args[5]);
    return [(org && textOf(org.args[1])) || (actor && textOf(actor.args[2])), org];
  };
  const rels = S.entitiesByType(file, 'IFCRELASSIGNSTOACTOR');
  for (const rel of rels) {
    if (!refs(rel.args[4]).some((r) => r.id === schedule.id)) continue;
    const [name, org] = nameOf(rel);
    if (!name || roles.includes(name)) continue;
    roles.push(name);
    const role = org && S.deref(file, refs(org.args[3])[0]);
    roleInfo[name] = { id: (org && textOf(org.args[0])) || name, ifcRole: role ? enumOf(role.args[0]) : 'USERDEFINED' };
  }
  for (const rel of rels) {
    const mine = refs(rel.args[4]).filter((r) => byTaskId.has(r.id));
    if (!mine.length) continue;
    const [name] = nameOf(rel);
    if (!roles.includes(name)) continue;
    const acting = S.deref(file, rel.args[7]);
    const letter = acting && LETTER[textOf(acting.args[1])];
    if (letter) for (const r of mine) byTaskId.get(r.id).raci[name] = letter;
  }
  for (const t of tasks) for (const role of roles) t.raci[role] ||= '-';
  return { matrixTitle: textOf(schedule.args[2]) || 'RACI', createdOn: String(textOf(schedule.args[6])).slice(0, 10), roles, roleInfo, tasks };
}
