/* Mock data for the static-mvp version of Revant.
 * Persisted in localStorage so Vercel deployment retains demo state per browser.
 */

const today = new Date();
const addDays = (d) => {
  const x = new Date(today);
  x.setDate(x.getDate() + d);
  return x.toISOString().slice(0, 10);
};

export const SEED_USERS = [
  { user_id: "user_admin", email: "admin@revant.mx", password: "Revant2026!", name: "Admin Demo", role: "admin", picture: null },
  { user_id: "user_jorge", email: "jorge.tenant@revant.mx", password: "Inquilino2026!", name: "Jorge Hernández", role: "inquilino", picture: null },
];

const IMG_A = "https://images.pexels.com/photos/16110999/pexels-photo-16110999.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";
const IMG_B = "https://images.pexels.com/photos/2462015/pexels-photo-2462015.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

export const SEED_PROPERTIES = [
  { property_id: "prop_01", nombre: "Torre Reforma 124", direccion: "Av. Paseo de la Reforma 124, Cuauhtémoc", ciudad: "CDMX", tipo: "Departamento", monto_renta: 38500, imagen: IMG_A, ocupada: true },
  { property_id: "prop_02", nombre: "Polanco Lofts 8B", direccion: "Horacio 815, Polanco", ciudad: "CDMX", tipo: "Loft", monto_renta: 45000, imagen: IMG_B, ocupada: true },
  { property_id: "prop_03", nombre: "Roma Norte 33", direccion: "Colima 412, Roma Norte", ciudad: "CDMX", tipo: "Casa", monto_renta: 32000, imagen: IMG_A, ocupada: true },
  { property_id: "prop_04", nombre: "San Pedro Garza 9", direccion: "Calzada del Valle 215", ciudad: "Monterrey", tipo: "Departamento", monto_renta: 28500, imagen: IMG_B, ocupada: true },
  { property_id: "prop_05", nombre: "Condesa Studios 4A", direccion: "Amsterdam 89, Condesa", ciudad: "CDMX", tipo: "Estudio", monto_renta: 22000, imagen: IMG_A, ocupada: true },
  { property_id: "prop_06", nombre: "Santa Fe Vista", direccion: "Vasco de Quiroga 3000", ciudad: "CDMX", tipo: "Departamento", monto_renta: 41000, imagen: IMG_B, ocupada: false },
];

export const SEED_CONTRACTS = [
  { contract_id: "ct_01", inquilino_nombre: "Jorge Hernández", inquilino_email: "jorge.tenant@revant.mx", property_id: "prop_01", propiedad_nombre: "Torre Reforma 124", monto_renta: 38500, fecha_inicio: addDays(-200), fecha_vencimiento: addDays(18), estatus: "pagado", firmado: true, firmado_at: addDays(-200), signature_image: null },
  { contract_id: "ct_02", inquilino_nombre: "María González", inquilino_email: "maria.tenant@revant.mx", property_id: "prop_02", propiedad_nombre: "Polanco Lofts 8B", monto_renta: 45000, fecha_inicio: addDays(-120), fecha_vencimiento: addDays(210), estatus: "pendiente", firmado: true, firmado_at: addDays(-120), signature_image: null },
  { contract_id: "ct_03", inquilino_nombre: "Carlos Ramírez", inquilino_email: "carlos.tenant@revant.mx", property_id: "prop_03", propiedad_nombre: "Roma Norte 33", monto_renta: 32000, fecha_inicio: addDays(-300), fecha_vencimiento: addDays(60), estatus: "atrasado", firmado: true, firmado_at: addDays(-300), signature_image: null },
  { contract_id: "ct_04", inquilino_nombre: "Ana Patricia López", inquilino_email: "ana.tenant@revant.mx", property_id: "prop_04", propiedad_nombre: "San Pedro Garza 9", monto_renta: 28500, fecha_inicio: addDays(-80), fecha_vencimiento: addDays(20), estatus: "pagado", firmado: true, firmado_at: addDays(-80), signature_image: null },
  { contract_id: "ct_05", inquilino_nombre: "Luis Mendoza", inquilino_email: "luis.tenant@revant.mx", property_id: "prop_05", propiedad_nombre: "Condesa Studios 4A", monto_renta: 22000, fecha_inicio: addDays(-400), fecha_vencimiento: addDays(15), estatus: "pendiente", firmado: false, firmado_at: null, signature_image: null },
];
