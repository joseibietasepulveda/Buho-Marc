import { EMPTY_REPORT_PROFILE, type ReportProfile } from './report-profile';

// Public contact data verified on 2026-10-02. Missing fields remain optional.
export const REPORT_PROFILE_PRESETS: { slug: string; profile: ReportProfile; logoPath?: string; source?: string; aliases?: string[]; names?: string[] }[] = [
  { slug: 'zamora-ip', aliases:['juan-pablo-zamora','zamoraip'], names:['Zamora IP','Juan Pablo Zamora','Juan Pablo Zamora Iturra'], source: 'https://zamoraip.cl/', logoPath: 'public/reports/studios/zamora-ip.png', profile: {
    ...EMPTY_REPORT_PROFILE, studioName: 'Zamora IP', lawyerName: 'Juan Pablo Zamora Iturra',
    email: 'contacto@zamoraip.cl', phone: '+56 9 9169 1577', website: 'https://zamoraip.cl/',
  } },
  { slug: 'fa-abogados', source: 'https://fa.cl/', logoPath: 'public/reports/studios/fa-abogados.png', profile: {
    ...EMPTY_REPORT_PROFILE, studioName: 'Flores Acevedo Abogados',
    address: 'Santiago: Av. Apoquindo 3076, oficina 1002, Las Condes.\nConcepción: Chacabuco 485, oficina 901, Edificio Latincapital.',
    email: 'contacto@fa.cl', phone: 'Santiago: +56 2 2342 3220 · Concepción: +56 41 240 1000', website: 'https://fa.cl/',
  } },
  { slug: 'daniel-morales', logoPath: 'public/reports/studios/de-las-heras.png', profile: {
    ...EMPTY_REPORT_PROFILE, studioName:'De Las Heras Abogados',lawyerName:'Daniel Morales Sorondo',
    headerText:'Guillermo de las Heras de Pablo\nMaría José Colomer Sanhueza\nSebastián de las Heras Skoknic',
    address:'Av. Libertad 1405, oficina 2001, Edificio Torre Coraceros, Viña del Mar, Chile.\nSan Sebastián 2957, piso 1, Las Condes, Chile.',
    phone:'+56 32 254 8597 · +56 9 6901 2814',website:'https://www.delasheras.cl/',
  } },
];
