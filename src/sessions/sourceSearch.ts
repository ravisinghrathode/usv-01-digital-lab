import type {Snapshot} from '../dockyard2/domain';
import type {NavigationModule} from '../moduleRegistry';
export type SourceSearchItem={id:string;title:string;meta:string;module:NavigationModule};
export function searchSourceRegister(snapshot:Snapshot,query:string,connected:boolean):SourceSearchItem[]{
 const term=query.toLocaleLowerCase().trim();
 if(!term)return [];
 const label=connected?'Authenticated register':'Illustrative fallback';
 const items:SourceSearchItem[]=[
  ...snapshot.requirements.map(r=>({
    id:'source:requirement:'+r.id,title:r.title,meta:r.id+' · Requirement · '+label,module:'traceability' as NavigationModule
  })),
  ...snapshot.simulations.map(s=>({
    id:'source:simulation:'+s.id,title:s.name,meta:s.id+' · Simulation register · '+label,module:'simulations' as NavigationModule
  })),
  ...snapshot.risks.map(r=>({
    id:'source:risk:'+r.id,title:r.description,meta:r.id+' · Technical risk · '+label,module:'risks-decisions' as NavigationModule
  })),
  ...snapshot.notes.map(n=>({
    id:'source:note:'+n.id,title:n.title,meta:n.id+' · Research note · '+label,module:'knowledge-centre' as NavigationModule
  }))
 ];
 return items.filter(i=>(i.title+' '+i.meta).toLocaleLowerCase().includes(term)).slice(0,30);
}
