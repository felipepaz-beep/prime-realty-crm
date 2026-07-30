import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  Phone,
  Upload,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Search,
  Filter,
  ExternalLink,
  RefreshCw,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useFollowups, useRegistrarContato } from "@/features/clientes/hooks/use-clientes";
import { ETAPA_FUNIL_LABELS, PRIORIDADE_LABELS } from "@/features/clientes/constants";
import { supabase } from "@/integrations/supabase/client";
import type { Cliente, ClienteEtapaFunil, ClientePrioridade } from "@/features/clientes/types";

export const Route = createFileRoute("/_authenticated/followup")({
  head: () => ({
    meta: [{ title: "Follow-up — Corretor CRM" }, { name: "robots", content: "noindex" }],
  }),
  component: FollowupPage,
});

type StatusFollowup = "ATRASADO" | "HOJE" | "EM_DIA" | "ENCERRADO";

function calcularStatus(cliente: Cliente): StatusFollowup {
  const encerradas: ClienteEtapaFunil[] = ["fechado_ganho", "fechado_perdido"];
  if (encerradas.includes(cliente.etapa_funil)) return "ENCERRADO";
  if (!cliente.proximo_followup) return "ATRASADO";
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const proximo = new Date(cliente.proximo_followup + "T00:00:00");
  if (proximo < hoje) return "ATRASADO";
  if (proximo.toDateString() === hoje.toDateString()) return "HOJE";
  return "EM_DIA";
}

function calcularDiasSemContato(ultimo_contato: string | null): number | null {
  if (!ultimo_contato) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const ultimo = new Date(ultimo_contato + "T00:00:00");
  return Math.floor((hoje.getTime() - ultimo.getTime()) / 86_400_000);
}

const STATUS_CONFIG: Record<
  StatusFollowup,
  { label: string; cor: string; borda: string; icone: React.ComponentType<{ className?: string }> }
> = {
  ATRASADO: {
    label: "Atrasado",
    cor: "bg-destructive/10 text-destructive border-destructive/30",
    borda: "border-l-destructive",
    icone: AlertCircle,
  },
  HOJE: {
    label: "Hoje",
    cor: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-400/30",
    borda: "border-l-yellow-400",
    icone: Clock,
  },
  EM_DIA: {
    label: "Em dia",
    cor: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-400/30",
    borda: "border-l-emerald-500",
    icone: CheckCircle2,
  },
  ENCERRADO: {
    label: "Encerrado",
    cor: "bg-muted text-muted-foreground border-border",
    borda: "border-l-muted-foreground/20",
    icone: XCircle,
  },
};

// Mapeamento planilha → CRM
const ETAPA_MAP: Record<string, ClienteEtapaFunil> = {
  "novo lead": "novo_lead",
  "em atendimento": "contato_iniciado",
  "visita agendada": "visita_agendada",
  "proposta enviada": "proposta",
  negociação: "negociacao",
  negociacao: "negociacao",
  fechado: "fechado_ganho",
  perdido: "fechado_perdido",
};

const PRIORIDADE_MAP: Record<string, ClientePrioridade> = {
  alta: "alta",
  média: "media",
  media: "media",
  baixa: "baixa",
};

function normalizarTelefone(raw: unknown): string {
  if (!raw) return "";
  const s = String(raw).replace(/\D/g, "");
  if (s.length >= 10) return s;
  return String(raw).trim();
}

function parseDataExcel(valor: unknown): string | null {
  if (!valor) return null;
  if (valor instanceof Date) return valor.toISOString().split("T")[0];
  if (typeof valor === "number") {
    // Excel serial date
    const d = new Date(Math.round((valor - 25569) * 86400 * 1000));
    return d.toISOString().split("T")[0];
  }
  const s = String(valor).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.split("T")[0];
  return null;
}

interface RowImport {
  nome: string;
  whatsapp: string;
  origem_lead: string;
  etapa_funil: ClienteEtapaFunil;
  codigo_imovel: string | null;
  faixa_valor_min: number | null;
  ultimo_contato: string | null;
  followup_intervalo_dias: number;
  proximo_followup: string | null;
  prioridade: ClientePrioridade;
  observacoes: string | null;
  status: string;
}

function parsePlanilha(buffer: ArrayBuffer): RowImport[] {
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const ws = wb.Sheets["Follow-up"];
  if (!ws) throw new Error('Aba "Follow-up" não encontrada na planilha.');
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null });

  const resultado: RowImport[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i] as unknown[];
    const nome = r[0] ? String(r[0]).trim() : "";
    if (!nome || nome === "-----" || nome === "---") continue;

    const etapaRaw = String(r[3] ?? "")
      .trim()
      .toLowerCase();
    const etapa: ClienteEtapaFunil = ETAPA_MAP[etapaRaw] ?? "novo_lead";
    const prioridadeRaw = String(r[11] ?? "")
      .trim()
      .toLowerCase();
    const prioridade: ClientePrioridade = PRIORIDADE_MAP[prioridadeRaw] ?? "alta";

    const ultimoContato = parseDataExcel(r[6]);
    const intervalo = Math.round(Number(r[7]) || 4);

    let proximoFollowup: string | null = null;
    if (ultimoContato) {
      const d = new Date(ultimoContato + "T12:00:00");
      d.setDate(d.getDate() + intervalo);
      proximoFollowup = d.toISOString().split("T")[0];
    }

    const encerradas: ClienteEtapaFunil[] = ["fechado_ganho", "fechado_perdido"];
    const status = encerradas.includes(etapa)
      ? etapa === "fechado_ganho"
        ? "ganho"
        : "perdido"
      : "ativo";

    resultado.push({
      nome,
      whatsapp: normalizarTelefone(r[1]),
      origem_lead: String(r[2] ?? "").trim() || "Outro",
      etapa_funil: etapa,
      codigo_imovel: r[4] ? String(r[4]).trim() : null,
      faixa_valor_min: r[5] ? Number(r[5]) : null,
      ultimo_contato: ultimoContato,
      followup_intervalo_dias: intervalo,
      proximo_followup: proximoFollowup,
      prioridade,
      observacoes: r[12] ? String(r[12]).trim() : null,
      status,
    });
  }
  return resultado;
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────
function FollowupPage() {
  const { data: clientes = [], isLoading, refetch } = useFollowups();
  const registrar = useRegistrarContato();

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<StatusFollowup[]>([]);
  const [filtroPrioridade, setFiltroPrioridade] = useState<ClientePrioridade[]>([]);
  const [mostrarEncerrados, setMostrarEncerrados] = useState(false);
  const [ordenacao, setOrdenacao] = useState<{ campo: string; dir: "asc" | "desc" }>({
    campo: "proximo_followup",
    dir: "asc",
  });

  // Import
  const [importAberto, setImportAberto] = useState(false);
  const [importRows, setImportRows] = useState<RowImport[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importErro, setImportErro] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Derivados
  const comStatus = clientes.map((c) => ({
    ...c,
    _status: calcularStatus(c),
    _dias: calcularDiasSemContato(c.ultimo_contato),
  }));

  const stats = {
    ATRASADO: comStatus.filter((c) => c._status === "ATRASADO").length,
    HOJE: comStatus.filter((c) => c._status === "HOJE").length,
    EM_DIA: comStatus.filter((c) => c._status === "EM_DIA").length,
    ENCERRADO: comStatus.filter((c) => c._status === "ENCERRADO").length,
  };

  const filtrados = comStatus.filter((c) => {
    if (!mostrarEncerrados && c._status === "ENCERRADO") return false;
    if (filtroStatus.length > 0 && !filtroStatus.includes(c._status)) return false;
    if (filtroPrioridade.length > 0 && !filtroPrioridade.includes(c.prioridade)) return false;
    if (busca) {
      const q = busca.toLowerCase();
      return (
        c.nome.toLowerCase().includes(q) ||
        (c.whatsapp ?? "").includes(q) ||
        (c.codigo_imovel ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const ordenados = [...filtrados].sort((a, b) => {
    const campo = ordenacao.campo;
    const dir = ordenacao.dir === "asc" ? 1 : -1;
    if (campo === "proximo_followup") {
      const va = a.proximo_followup ?? "9999-12-31";
      const vb = b.proximo_followup ?? "9999-12-31";
      return va < vb ? -dir : va > vb ? dir : 0;
    }
    if (campo === "_dias") return ((a._dias ?? -1) - (b._dias ?? -1)) * dir;
    const va = String((a as Record<string, unknown>)[campo] ?? "");
    const vb = String((b as Record<string, unknown>)[campo] ?? "");
    return va.localeCompare(vb) * dir;
  });

  const toggleOrdem = (campo: string) => {
    setOrdenacao((prev) =>
      prev.campo === campo
        ? { campo, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { campo, dir: "asc" },
    );
  };

  const handleContactarHoje = useCallback(
    async (id: string, nome: string) => {
      try {
        await registrar.mutateAsync({ id });
        toast.success(`Contato registrado para ${nome}`);
      } catch {
        toast.error("Erro ao registrar contato");
      }
    },
    [registrar],
  );

  // Import handlers
  const handleArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportErro("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const rows = parsePlanilha(ev.target!.result as ArrayBuffer);
        setImportRows(rows);
        setImportAberto(true);
      } catch (err) {
        setImportErro(err instanceof Error ? err.message : "Erro ao ler planilha");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const handleImportar = async () => {
    if (importRows.length === 0) return;
    setImportLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const ownerId = userData.user?.id;
      if (!ownerId) throw new Error("Usuário não autenticado");

      const payload = importRows.map((r) => ({
        ...r,
        owner_id: ownerId,
        temperatura: "morno",
        score: 0,
        bairros_interesse: [],
        cidades_interesse: [],
        tags: [],
        custom_fields: {},
      }));

      const CHUNK = 50;
      for (let i = 0; i < payload.length; i += CHUNK) {
        const { error } = await supabase
          .from("clients")
          .insert(payload.slice(i, i + CHUNK) as never);
        if (error) throw error;
      }

      toast.success(`${importRows.length} clientes importados com sucesso!`);
      setImportAberto(false);
      setImportRows([]);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro na importação");
    } finally {
      setImportLoading(false);
    }
  };

  const OrdIcon = ({ campo }: { campo: string }) => {
    if (ordenacao.campo !== campo) return null;
    return ordenacao.dir === "asc" ? (
      <ChevronUp className="h-3 w-3" />
    ) : (
      <ChevronDown className="h-3 w-3" />
    );
  };

  const formatarData = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div>
            <h1 className="text-xl font-semibold">Follow-up</h1>
            <p className="text-sm text-muted-foreground">Controle de contatos e lembretes</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleArquivo}
            />
            <Button size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4 mr-1.5" />
              Importar planilha
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 px-6 py-3 border-b shrink-0">
          {(["ATRASADO", "HOJE", "EM_DIA", "ENCERRADO"] as StatusFollowup[]).map((s) => {
            const cfg = STATUS_CONFIG[s];
            const Icon = cfg.icone;
            return (
              <button
                key={s}
                onClick={() =>
                  setFiltroStatus((prev) =>
                    prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
                  )
                }
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-muted/50 ${filtroStatus.includes(s) ? "ring-2 ring-primary" : ""}`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="font-medium">{stats[s]}</span>
                <span className="text-muted-foreground">{cfg.label}</span>
              </button>
            );
          })}
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-2 px-6 py-2 border-b shrink-0">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Nome, WhatsApp ou imóvel…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <Filter className="h-3.5 w-3.5 mr-1.5" />
                Prioridade
                {filtroPrioridade.length > 0 && (
                  <Badge className="ml-1.5 h-4 px-1 text-xs">{filtroPrioridade.length}</Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Prioridade</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(["alta", "media", "baixa"] as ClientePrioridade[]).map((p) => (
                <DropdownMenuCheckboxItem
                  key={p}
                  checked={filtroPrioridade.includes(p)}
                  onCheckedChange={(v) =>
                    setFiltroPrioridade((prev) => (v ? [...prev, p] : prev.filter((x) => x !== p)))
                  }
                >
                  {PRIORIDADE_LABELS[p]}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant={mostrarEncerrados ? "secondary" : "ghost"}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setMostrarEncerrados((v) => !v)}
          >
            {mostrarEncerrados ? "Ocultar encerrados" : "Ver encerrados"}
          </Button>

          <span className="ml-auto text-xs text-muted-foreground">
            {ordenados.length} cliente{ordenados.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Tabela */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="p-6 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : ordenados.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-16">
              <CheckCircle2 className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">Nenhum cliente encontrado</p>
              {clientes.length === 0 && (
                <Button className="mt-4" size="sm" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-1.5" />
                  Importar planilha
                </Button>
              )}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background border-b z-10">
                <tr className="text-muted-foreground text-xs">
                  <th className="text-left px-4 py-2 font-medium w-[200px]">
                    <button className="flex items-center gap-1" onClick={() => toggleOrdem("nome")}>
                      Nome <OrdIcon campo="nome" />
                    </button>
                  </th>
                  <th className="text-left px-3 py-2 font-medium">WhatsApp</th>
                  <th className="text-left px-3 py-2 font-medium">Etapa</th>
                  <th className="text-left px-3 py-2 font-medium">Imóvel</th>
                  <th className="text-left px-3 py-2 font-medium">
                    <button
                      className="flex items-center gap-1"
                      onClick={() => toggleOrdem("ultimo_contato")}
                    >
                      Último contato <OrdIcon campo="ultimo_contato" />
                    </button>
                  </th>
                  <th className="text-center px-3 py-2 font-medium">Intervalo</th>
                  <th className="text-left px-3 py-2 font-medium">
                    <button
                      className="flex items-center gap-1"
                      onClick={() => toggleOrdem("proximo_followup")}
                    >
                      Próximo F/U <OrdIcon campo="proximo_followup" />
                    </button>
                  </th>
                  <th className="text-center px-3 py-2 font-medium">
                    <button
                      className="flex items-center gap-1 mx-auto"
                      onClick={() => toggleOrdem("_dias")}
                    >
                      Dias s/ contato <OrdIcon campo="_dias" />
                    </button>
                  </th>
                  <th className="text-center px-3 py-2 font-medium">Status</th>
                  <th className="text-center px-3 py-2 font-medium">Prioridade</th>
                  <th className="text-right px-4 py-2 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {ordenados.map((c) => {
                  const cfg = STATUS_CONFIG[c._status];
                  const Icon = cfg.icone;
                  const encerrado = c._status === "ENCERRADO";
                  return (
                    <tr
                      key={c.id}
                      className={`border-b border-l-2 hover:bg-muted/30 transition-colors ${cfg.borda} ${encerrado ? "opacity-50" : ""}`}
                    >
                      <td className="px-4 py-2.5 font-medium max-w-[200px] truncate">
                        <Link
                          to="/clientes/$clienteId"
                          params={{ clienteId: c.id }}
                          className="hover:underline text-foreground"
                        >
                          {c.nome}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {c.whatsapp ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <a
                                href={`https://wa.me/${c.whatsapp.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline"
                              >
                                <Phone className="h-3 w-3" />
                                {c.whatsapp}
                              </a>
                            </TooltipTrigger>
                            <TooltipContent>Abrir no WhatsApp</TooltipContent>
                          </Tooltip>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs text-muted-foreground">
                          {ETAPA_FUNIL_LABELS[c.etapa_funil] ?? c.etapa_funil}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground text-xs font-mono">
                        {c.codigo_imovel || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {formatarData(c.ultimo_contato)}
                      </td>
                      <td className="px-3 py-2.5 text-center text-muted-foreground">
                        {c.followup_intervalo_dias}d
                      </td>
                      <td className="px-3 py-2.5">
                        {c.proximo_followup ? (
                          <span
                            className={
                              c._status === "ATRASADO"
                                ? "text-destructive font-medium"
                                : c._status === "HOJE"
                                  ? "text-yellow-600 dark:text-yellow-400 font-medium"
                                  : "text-muted-foreground"
                            }
                          >
                            {formatarData(c.proximo_followup)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {c._dias !== null ? (
                          <span
                            className={
                              c._dias > 10
                                ? "text-destructive font-medium"
                                : "text-muted-foreground"
                            }
                          >
                            {c._dias}d
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.cor}`}
                        >
                          <Icon className="h-3 w-3" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span
                          className={`text-xs font-medium ${
                            c.prioridade === "alta"
                              ? "text-orange-600 dark:text-orange-400"
                              : c.prioridade === "media"
                                ? "text-muted-foreground"
                                : "text-muted-foreground/60"
                          }`}
                        >
                          {PRIORIDADE_LABELS[c.prioridade]}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1.5">
                          {!encerrado && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs"
                                  disabled={registrar.isPending}
                                  onClick={() => handleContactarHoje(c.id, c.nome)}
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                  Contactei hoje
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                Registra hoje como último contato e recalcula próximo follow-up
                              </TooltipContent>
                            </Tooltip>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" asChild>
                                <Link to="/clientes/$clienteId" params={{ clienteId: c.id }}>
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </Link>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Ver cliente</TooltipContent>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal de importação */}
      <Dialog open={importAberto} onOpenChange={setImportAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Importar planilha de Follow-up</DialogTitle>
            <DialogDescription>
              Foram encontrados <strong>{importRows.length}</strong> clientes válidos na planilha.
              Todos os dados serão preservados.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {importErro && (
              <div className="text-sm text-destructive bg-destructive/10 rounded p-3">
                {importErro}
              </div>
            )}

            <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total de clientes</span>
                <strong>{importRows.length}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ativos</span>
                <span>{importRows.filter((r) => r.status === "ativo").length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fechados</span>
                <span>{importRows.filter((r) => r.status === "ganho").length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Perdidos</span>
                <span>{importRows.filter((r) => r.status === "perdido").length}</span>
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto rounded border text-xs">
              <table className="w-full">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-medium">Nome</th>
                    <th className="text-left p-2 font-medium">Etapa</th>
                    <th className="text-left p-2 font-medium">Próximo F/U</th>
                  </tr>
                </thead>
                <tbody>
                  {importRows.slice(0, 20).map((r, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2 truncate max-w-[120px]">{r.nome}</td>
                      <td className="p-2 text-muted-foreground">
                        {ETAPA_FUNIL_LABELS[r.etapa_funil]}
                      </td>
                      <td className="p-2 text-muted-foreground">
                        {r.proximo_followup
                          ? new Date(r.proximo_followup + "T00:00:00").toLocaleDateString("pt-BR")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                  {importRows.length > 20 && (
                    <tr>
                      <td colSpan={3} className="p-2 text-center text-muted-foreground">
                        ... e mais {importRows.length - 20}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setImportAberto(false);
                setImportRows([]);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleImportar} disabled={importLoading || importRows.length === 0}>
              {importLoading ? "Importando…" : `Importar ${importRows.length} clientes`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
