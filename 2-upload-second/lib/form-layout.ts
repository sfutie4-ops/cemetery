import {workbook} from './model';
export type InputField = {ref: string; label: string; fullLabel?: string; computed?: boolean; type?: 'checkbox' | 'text' | 'date' | 'number' | 'textarea' | 'tel'; options?: string[]; suggestions?:string[]; value?: string | number; bold?: boolean};
const labels: Record<string, Record<string, string>> = {
  'burial permit': {O2: 'Cemetery', O3: 'Classification', O4: 'Applicant name', O5: 'Sitio', O6: 'Barangay', O7: 'Deceased last name', O8: 'Deceased first name', O9: 'Date of death', O10: 'O.R. number', O13: 'Rental years', O14: 'Arrears name', O15: 'Arrears amount', O16: 'Arrears years', O20: 'Discount ID number', O22: 'Senior citizen?', O31: 'Remaining balance', O32: 'Notes'},
  exhumation: {AJ2: 'Cemetery', AJ3: 'Informant name', AJ4: 'Sitio', AJ5: 'Barangay', AJ6: 'Deceased last name', AJ7: 'Deceased first name', AJ8: 'Date of death', AJ9: 'Replacement name', AJ10: 'Replacement death date', AJ11: 'O.R. number'},
  STATEMENT: {P2: 'Cemetery', P3: 'Classification', P4: 'Deceased last name', P5: 'Deceased first name', P6: 'Applicant name', P7: 'Sitio', P8: 'Barangay', P9: 'Include current year 2026', P10: 'Arrears amount', P11: 'Arrears years', P12: 'Advance years', P13: 'O.R. number', P15: 'Balance', P16: 'Due date'},
  TRANSFER: {M2: 'From cemetery', M3: 'To cemetery', M4: 'Deceased last name', M5: 'Deceased first name', M6: 'Informant name', M7: 'Sitio', M8: 'Barangay', M9: 'Date of death', M10: 'O.R. number'},
};
const dateRefs = ['O9', 'O33', 'AJ8', 'AJ10', 'P16', 'M9','PN6','PN12','PN17'];
const numberRefs: Record<string, string[]> = {PROMISSORY:['PN7'],'burial permit': ['O13', 'O15', 'O31'], STATEMENT: ['P9', 'P10', 'P12', 'P15', 'M16', 'M17', 'M18', 'M19']};
export function inputFields(name: string): InputField[] {
  const fields = workbook[name].inputs.filter((field: any) => !field.computed && field.label !== 'Last Updated:').map((field: any) => ({...field,
    fullLabel: field.label==='Sitio'?'Address / location':field.label, label: field.label==='Sitio'?'Address / location':labels[name]?.[field.ref] ?? field.label,
    options: name==='TRANSFER'&&['M2','M3'].includes(field.ref)?undefined:field.options,
    computed: false,
    bold: ['O4','O7','O8','O14','AJ3','AJ6','AJ7','AJ9','P4','P5','P6','M4','M5','M6'].includes(field.ref),
    type: name==='STATEMENT'&&field.ref==='P9' ? 'checkbox' : dateRefs.includes(field.ref) ? 'date' : (numberRefs[name] ?? []).includes(field.ref) ? 'number' : ['O32','PN11'].includes(field.ref) ? 'textarea' : 'text',
  }));
  if(name==='burial permit')fields.splice(fields.findIndex((field:InputField)=>field.ref==='O14')+1,0,{ref:'O33',label:'Arrears date of death',fullLabel:'Date of death of the person named in Arrears name',type:'date',value:''});
  if(name==='TRANSFER')fields.unshift({ref:'M12',label:'Transmittal cemetery',fullLabel:'Choose the Municipal or Aranda transmittal for this entry',type:'text',options:['MUNICIPAL','ARANDA'],value:''});
  if (name === 'STATEMENT') fields.push(
    {ref:'P18',label:'Clerk',type:'text',options:['GENAFER DELA CRUZ','MARVIN MIRALLES'],value:'GENAFER DELA CRUZ',bold:true},
    {ref: 'P17', label: 'Advance until year', type: 'number', computed: true, value: ''},
    {ref: 'M16', label: 'Advance amount', type: 'number', computed: true, value: 0},
    {ref: 'M17', label: '2026 rental amount', type: 'number', computed: true, value: 0},
    {ref: 'M18', label: 'Arrears amount', type: 'number', computed: true, value: 0},
    {ref: 'M19', label: 'Total amount payable', type: 'number', computed: true, value: 0, bold: true},
  );
  fields.splice(fields.findIndex((field:InputField)=>['O4','AJ3','P6','M6','PN3'].includes(field.ref))+1,0,{ref:'PH1',label:'Mobile number',type:'tel',value:''});
  return fields;
}
