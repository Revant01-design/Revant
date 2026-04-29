import { useState } from "react";
import { Send, CheckCircle2 } from "lucide-react";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import Logo from "../components/Logo";

const TIPOS = [
  { v: "acceso", l: "Acceso", d: "Solicito acceso a los datos personales que tienen sobre mí." },
  { v: "rectificacion", l: "Rectificación", d: "Solicito corregir datos personales inexactos o incompletos." },
  { v: "cancelacion", l: "Cancelación", d: "Solicito eliminar mis datos personales de su base de datos." },
  { v: "oposicion", l: "Oposición", d: "Solicito oponerme al tratamiento de mis datos personales." },
];

export default function ArcoPublic() {
  const [submitted, setSubmitted] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    tipo: "acceso", nombre_completo: "", email: "", telefono: "",
    identificacion_tipo: "INE", identificacion_numero: "", descripcion: "",
  });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/arco", form);
      setSubmitted(data);
    } finally { setLoading(false); }
  };

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v?.target ? v.target.value : v }));

  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="max-w-lg text-center" data-testid="arco-success">
          <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="font-display text-3xl font-bold tracking-tight text-[#0A1A2F] mt-6">Solicitud recibida</h2>
          <p className="mt-2 text-slate-500">Folio: <span className="font-bold text-[#0A1A2F]" data-testid="arco-folio">{submitted.request_id}</span></p>
          <p className="mt-4 text-sm text-slate-500">
            Recibirás respuesta en un plazo máximo de 20 días hábiles, conforme al artículo 32 de la LFPDPPP.
            Hemos enviado una confirmación a <strong>{submitted.email}</strong>.
          </p>
          <a href="/" className="inline-block mt-8 text-sm text-[#0A1A2F] font-semibold underline decoration-[#C9B37E] underline-offset-4">Volver al inicio</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-6 py-5">
          <Logo variant="light" size="sm" />
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[#C9B37E] font-semibold mb-3">LFPDPPP · Derechos ARCO</p>
        <h1 className="font-display text-4xl font-bold tracking-tight text-[#0A1A2F]">Ejercer mis derechos</h1>
        <p className="mt-3 text-slate-500 max-w-2xl">
          Conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares,
          puedes solicitar el <strong>Acceso</strong>, <strong>Rectificación</strong>, <strong>Cancelación</strong> u
          <strong> Oposición</strong> al tratamiento de tus datos personales.
        </p>

        <form onSubmit={submit} className="mt-10 space-y-5" data-testid="arco-form">
          <Field label="Tipo de solicitud">
            <Select value={form.tipo} onValueChange={set("tipo")}>
              <SelectTrigger className="h-11 bg-white" data-testid="arco-tipo"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIPOS.map(t => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500 mt-1.5">{TIPOS.find(t => t.v === form.tipo)?.d}</p>
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nombre completo del titular">
              <Input required value={form.nombre_completo} onChange={set("nombre_completo")} className="h-11" data-testid="arco-nombre" />
            </Field>
            <Field label="Correo electrónico">
              <Input type="email" required value={form.email} onChange={set("email")} className="h-11" data-testid="arco-email" />
            </Field>
            <Field label="Teléfono (opcional)">
              <Input value={form.telefono} onChange={set("telefono")} className="h-11" data-testid="arco-telefono" />
            </Field>
            <Field label="Identificación oficial">
              <div className="grid grid-cols-3 gap-2">
                <Select value={form.identificacion_tipo} onValueChange={set("identificacion_tipo")}>
                  <SelectTrigger className="h-11 bg-white col-span-1" data-testid="arco-id-tipo"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INE">INE</SelectItem>
                    <SelectItem value="Pasaporte">Pasaporte</SelectItem>
                    <SelectItem value="Cédula">Cédula</SelectItem>
                  </SelectContent>
                </Select>
                <Input required value={form.identificacion_numero} onChange={set("identificacion_numero")}
                       placeholder="Número" className="h-11 col-span-2" data-testid="arco-id-num" />
              </div>
            </Field>
          </div>

          <Field label="Descripción de la solicitud">
            <Textarea required rows={5} value={form.descripcion} onChange={set("descripcion")}
                      placeholder="Describe con claridad tu solicitud y los datos a los que se refiere…"
                      data-testid="arco-descripcion" />
          </Field>

          <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
            <p className="text-xs text-slate-500 max-w-md">
              Al enviar declaras bajo protesta de decir verdad ser el titular de los datos o representante legal acreditado.
            </p>
            <Button type="submit" disabled={loading} data-testid="arco-submit"
                    className="h-12 px-6 bg-[#0A1A2F] text-white hover:bg-[#0A1A2F]/90 transition-all duration-200">
              <Send className="w-4 h-4 mr-2" /> {loading ? "Enviando…" : "Enviar solicitud"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-[0.18em] text-slate-500 font-semibold mb-2">{label}</label>
      {children}
    </div>
  );
}
