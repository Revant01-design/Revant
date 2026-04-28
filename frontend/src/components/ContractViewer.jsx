import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { ShieldCheck, FileText, Loader2, Check } from "lucide-react";
import { api, fmtMXN, fmtDate } from "../lib/api";
import { toast } from "sonner";

export default function ContractViewer({ contract, open, onOpenChange, onSigned }) {
  const [signing, setSigning] = useState(false);
  const [agree, setAgree] = useState(false);
  if (!contract) return null;

  const handleSign = async () => {
    if (!agree) { toast.error("Debes aceptar los términos para firmar."); return; }
    setSigning(true);
    try {
      await new Promise(r => setTimeout(r, 1200)); // simulación validación
      const { data } = await api.post(`/contracts/${contract.contract_id}/sign`);
      toast.success("Contrato firmado exitosamente");
      onSigned?.(data);
      onOpenChange(false);
    } catch {
      toast.error("Error al firmar el contrato");
    } finally { setSigning(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="contract-viewer">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-2xl tracking-tight text-[#031433]">
            <FileText className="w-5 h-5 text-[#D3A154]" />
            Contrato de Arrendamiento
          </DialogTitle>
          <DialogDescription className="text-xs uppercase tracking-wider text-slate-500">
            ID: {contract.contract_id} · Conforme al Código Civil Federal de México
          </DialogDescription>
        </DialogHeader>

        <div className="bg-slate-50 border border-slate-200 rounded-md p-6 space-y-4 text-sm leading-relaxed text-[#031433]">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-semibold">Cláusulas principales</p>
          <p>
            En la Ciudad de México, en la fecha {fmtDate(contract.fecha_inicio)}, comparecen por una parte
            <strong> REVANT S.A.P.I. de C.V. </strong> en su carácter de <em>ARRENDADOR</em>, y por la otra parte
            <strong> {contract.inquilino_nombre} </strong> en su carácter de <em>ARRENDATARIO</em>, para celebrar
            el presente contrato bajo las siguientes cláusulas:
          </p>

          <div className="grid grid-cols-2 gap-x-6 gap-y-3 py-3 border-y border-slate-200">
            <Field label="Inmueble">{contract.propiedad_nombre}</Field>
            <Field label="Arrendatario">{contract.inquilino_nombre}</Field>
            <Field label="Renta mensual">{fmtMXN(contract.monto_renta)}</Field>
            <Field label="Vigencia">{fmtDate(contract.fecha_inicio)} → {fmtDate(contract.fecha_vencimiento)}</Field>
          </div>

          <p>
            <strong>PRIMERA.</strong> El ARRENDADOR otorga en arrendamiento al ARRENDATARIO el inmueble descrito,
            destinándose única y exclusivamente para uso habitacional.
          </p>
          <p>
            <strong>SEGUNDA.</strong> El ARRENDATARIO se obliga a pagar mensualmente la renta de
            <strong> {fmtMXN(contract.monto_renta)} </strong> dentro de los primeros cinco días naturales del mes,
            mediante transferencia electrónica.
          </p>
          <p>
            <strong>TERCERA.</strong> El presente contrato se rige por la Ley Federal de Protección de Datos Personales
            en Posesión de los Particulares (LFPDPPP) y demás disposiciones aplicables.
          </p>
        </div>

        {/* Signature simulation */}
        <div className="border-2 border-dashed border-slate-300 bg-slate-50 rounded-md p-6 text-center" data-testid="signature-area">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 mb-3">Firma del Arrendatario</p>
          {contract.firmado ? (
            <div>
              <p className="font-signature text-3xl text-[#031433] mb-2" data-testid="signature-text">
                {contract.inquilino_nombre}
              </p>
              <p className="text-xs text-emerald-700 inline-flex items-center gap-1">
                <Check className="w-3 h-3" /> Firmado el {fmtDate(contract.firmado_at)}
              </p>
            </div>
          ) : (
            <p className="text-slate-400 italic text-sm py-6">Pendiente de firma digital</p>
          )}
        </div>

        {!contract.firmado && (
          <div className="space-y-4">
            <label className="flex items-start gap-3 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                className="mt-1 accent-[#D3A154]"
                data-testid="agree-terms"
              />
              <span>
                He leído y acepto los términos del contrato. Reconozco que esta firma digital tiene la misma validez
                jurídica que una firma autógrafa conforme al artículo 89 del Código de Comercio.
              </span>
            </label>

            <Button
              data-testid="sign-contract-btn"
              onClick={handleSign}
              disabled={signing || !agree}
              className="w-full h-12 bg-[#D3A154] text-[#031433] hover:bg-[#D3A154]/90 font-semibold transition-all duration-200"
            >
              {signing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Validando firma…</>
              ) : (
                <><ShieldCheck className="w-4 h-4 mr-2" /> Firmar Contrato Digitalmente</>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">{label}</p>
      <p className="text-sm font-medium text-[#031433]">{children}</p>
    </div>
  );
}
