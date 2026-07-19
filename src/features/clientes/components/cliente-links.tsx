import { useState } from 'react';
import { ExternalLink, Plus, Trash2, Link2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useClienteDetalhe, useAtualizarCliente } from '../hooks/use-clientes';

type LinkItem = { titulo: string; url: string };

function parseLinks(customFields: unknown): LinkItem[] {
  if (!customFields || typeof customFields !== 'object') return [];
  const raw = (customFields as Record<string, unknown>).links;
  if (!Array.isArray(raw)) return [];
  return raw.filter((l): l is LinkItem =>
    !!l && typeof l === 'object' && typeof (l as LinkItem).titulo === 'string' && typeof (l as LinkItem).url === 'string'
  );
}

export function ClienteLinks({ clienteId }: { clienteId: string }) {
  const { data: cliente, isLoading } = useClienteDetalhe(clienteId);
  const atualizar = useAtualizarCliente(clienteId);
  const [titulo, setTitulo] = useState('');
  const [url, setUrl] = useState('');
  const [adicionando, setAdicionando] = useState(false);

  if (isLoading || !cliente) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const links = parseLinks(cliente.custom_fields);
  const customFields = (cliente.custom_fields && typeof cliente.custom_fields === 'object' ? cliente.custom_fields : {}) as Record<string, unknown>;

  const salvar = async (novos: LinkItem[]) => {
    await atualizar.mutateAsync({ custom_fields: { ...customFields, links: novos } as never });
  };

  const handleAdd = async () => {
    const t = titulo.trim();
    let u = url.trim();
    if (!t || !u) {
      toast.error('Preencha título e URL.');
      return;
    }
    if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
    try {
      new URL(u);
    } catch {
      toast.error('URL inválida.');
      return;
    }
    try {
      await salvar([...links, { titulo: t, url: u }]);
      setTitulo('');
      setUrl('');
      setAdicionando(false);
      toast.success('Link adicionado.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar link.');
    }
  };

  const handleRemove = async (index: number) => {
    try {
      await salvar(links.filter((_, i) => i !== index));
      toast.success('Link removido.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao remover link.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium">Links úteis</h2>
          <p className="text-xs text-muted-foreground">{links.length} {links.length === 1 ? 'link salvo' : 'links salvos'}</p>
        </div>
        {!adicionando && (
          <Button size="sm" onClick={() => setAdicionando(true)}>
            <Plus className="mr-2 h-4 w-4" /> Adicionar link
          </Button>
        )}
      </div>

      {adicionando && (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <Input placeholder="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
            <Input placeholder="https://exemplo.com" value={url} onChange={(e) => setUrl(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => { setAdicionando(false); setTitulo(''); setUrl(''); }}>Cancelar</Button>
              <Button size="sm" onClick={handleAdd} disabled={atualizar.isPending}>
                {atualizar.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Salvar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {links.length === 0 && !adicionando ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-12 text-center">
          <Link2 className="h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">Nenhum link salvo ainda.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {links.map((link, i) => (
            <Card key={`${link.url}-${i}`}>
              <CardContent className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{link.titulo}</p>
                  <p className="truncate text-xs text-muted-foreground">{link.url}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
                    <a href={link.url} target="_blank" rel="noopener noreferrer" aria-label="Abrir link">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleRemove(i)} aria-label="Remover link">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
