// Stable mock records shared by the database seed and the offline demo.
const roots = ["ALERCE", "CUMBRES", "ESTERO", "ARRAYÁN", "CALETA", "QUILLAY", "RAULÍ", "LADERA", "VENTISCA", "TRAVESÍA"];
const endings = ["NATURAL", "URBANO", "ANDINO", "PACÍFICO", "VIVO", "AUSTRAL", "ORIGEN", "TALLER"];

function mockRut(number: number) {
  const digits = String(number);
  const sum = Array.from(digits).reverse().reduce((total, digit, index) => total + Number(digit) * (index % 6 + 2), 0);
  const check = 11 - sum % 11;
  return `${digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}-${check === 11 ? "0" : check === 10 ? "K" : check}`;
}

export const expandedDemoBrands = roots.flatMap((root, r) => endings.map((ending, e) => {
  const index = r * endings.length + e;
  return { id: `10000000-0000-4000-8000-${String(7000 + index).padStart(12, "0")}`, code: `BM-${7000 + index}`, name: `${root} ${ending}`, owner: `${root.charAt(0)}${root.slice(1).toLowerCase()} Comercial SpA`, registration: String(1600000 + index), rut: mockRut(77820000 + index), type: index < 50 ? "Denominativa" as const : "Mixta" as const, classes: index % 2 ? [35, 42] : [29, 30, 35] };
}));

export function demoBrandDetails(code: string) {
  const n = Number(code.replace(/\D/g, "")) || 1;
  const day = String(n % 25 + 1).padStart(2, "0");
  return { applicationNumber: String(1700000 + n), filingDate: `${day}/02/2025`, publicationDate: `${day}/05/2025`, expirationDate: `${day}/08/2035`, ownerCountry: "Chile", representativeName: "Araya & Montes Abogados", representativeCountry: "Chile" };
}
