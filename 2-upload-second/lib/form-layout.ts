import {workbook} from './model';
export type InputField = {ref: string; label: string; fullLabel?: string; computed?: boolean; type?: 'checkbox' | 'text' | 'date' | 'number' | 'textarea' | 'tel'; options?: string[]; suggestions?:string[]; placeholder?: string; value?: string | number; bold?: boolean};
const labels: Record<string, Record<string, string>> = {
  'burial permit': {O2: 'Cemetery', O3: 'Classification', O4: 'Applicant name', O5: 'Sitio', O6: 'Barangay', O7: 'Deceased last name', O8: 'Deceased first name', O9: 'Date of death', O10: 'O.R. number', O13: 'Rental years', O14: 'Arrears name', O15: 'Arrears amount', O16: 'Arrears years', O20: 'Discount ID number', O22: 'Senior citizen?', O31: 'Remaining balance', O32: 'Notes'},
  exhumation: {AJ2: 'Cemetery', AJ3: 'Informant name', AJ4: 'Sitio', AJ5: 'Barangay', AJ6: 'Deceased last name', AJ7: 'Deceased first name', AJ8: 'Date of death', AJ9: 'Replacement name', AJ10: 'Replacement death date', AJ11: 'O.R. number'},
  STATEMENT: {P2: 'Cemetery', P3: 'Classification', P4: 'Deceased last name', P5: 'Deceased first name', P6: 'Applicant name', P7: 'Sitio', P8: 'Barangay', P9: 'Include current year 2026', P10: 'Arrears amount', P11: 'Arrears years', P12: 'Advance years', P13: 'O.R. number', P15: 'Balance', P16: 'Due date'},
  TRANSFER: {M2: 'From cemetery', M3: 'To cemetery', M4: 'Deceased last name', M5: 'Deceased first name', M6: 'Informant name', M7: 'Sitio', M8: 'Barangay', M9: 'Date of death', M10: 'O.R. number'},
};
const hints: Record<string, string> = {
  O4: 'Full name of applicant', O5: 'Sitio or Purok', O6: 'Barangay', O7: 'Apelyido sang patay', O8: 'Pangalan sang patay', O10: 'O.R. number on the receipt', O13: 'Number of years', O14: 'Name for the arrears', O15: 'Amount, e.g. 500', O16: 'Years, e.g. 2023-2025', O20: 'Senior / PWD ID number', O31: 'Amount, e.g. 250', O32: 'Other notes',
  AJ3: 'Full name of informant', AJ4: 'Sitio or Purok', AJ5: 'Barangay', AJ6: 'Apelyido sang kalkalon', AJ7: 'Ngalan sang kalkalon', AJ9: 'Ngalan sang inugbulos', AJ11: 'O.R. number on the receipt',
  P4: 'Apelyido sang patay', P5: 'Pangalan sang patay', P6: 'Full name of applicant', P7: 'Sitio or Purok', P8: 'Barangay', P10: 'Amount, e.g. 500', P11: 'Years, e.g. 2023-2025', P12: 'Number of years', P13: 'O.R. number on the receipt', P15: 'Amount, e.g. 250',
  M2: 'Cemetery it comes from', M3: 'Cemetery it goes to', M4: 'Apelyido sang patay', M5: 'Pangalan sang patay', M6: 'Full name of informant', M7: 'Sitio or Purok', M8: 'Barangay', M10: 'O.R. number on the receipt',
  PH1: '09XX XXX XXXX', NT1: 'Notes for the transmittal. Not printed on the permit.',
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
  if(['exhumation','STATEMENT','TRANSFER'].includes(name))fields.push({ref:'NT1',label:'Notes',fullLabel:'Notes go to the transmittal notes column and are not printed',type:'textarea',value:''});
  return fields.map((field:InputField)=>({...field,placeholder:hints[field.ref]??field.label}));
}
