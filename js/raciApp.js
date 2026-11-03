// Part of the APK.audio project — Anthony Kuzub
// MIT Licence.

export class RaciModel {
  constructor() {
    this.roles = ['Lead AV Engineer', 'Project Manager', 'Field Electrician', 'Client Operations'];
    this.tasks = [
      { task: 'Architectural Schematic Design', raci: { 'Lead AV Engineer': 'R', 'Project Manager': 'A', 'Field Electrician': 'C', 'Client Operations': 'I' } },
      { task: 'Network Switch & IPAM Staging', raci: { 'Lead AV Engineer': 'R', 'Project Manager': 'A', 'Field Electrician': 'I', 'Client Operations': 'C' } },
      { task: 'Conduit & AC Mains Power Drop', raci: { 'Lead AV Engineer': 'C', 'Project Manager': 'A', 'Field Electrician': 'R', 'Client Operations': 'I' } },
      { task: 'Final Acceptance Sign-off', raci: { 'Lead AV Engineer': 'C', 'Project Manager': 'R', 'Field Electrician': 'I', 'Client Operations': 'A' } }
    ];
  }
}
