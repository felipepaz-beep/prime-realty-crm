import { useState, useCallback, useRef } from 'react';
import { Upload, Search, Star, StarOff, Download, Pencil, Trash2, FileText, Image, File, LayoutGrid, List, X, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useDocumentos, useAtualizarDocumento, useToggleFavorito, useRemoverDocumento, useDownloadDocumento } from '../hooks/use-documents';
import { uploadDocumento, formatarTamanho, validarArquivo } from '../services/document.service';
import { DOCUMENT_CATEGORIES, DOCUMENT_CATEGORY_LABELS, PREVIEWABLE_TYPES } from '../types';
import type { ClientDocument, DocumentCategory, DocumentFiltros, UploadProgress } from '../types';

function FileIcon({ mimeType, className }: { mimeType: string; className?: string }) {
  if (mimeType.startsWith('image/')) return <Image className={className} />;
  if (mimeType === 'application/pdf') return <FileText className={className} />;
  return <File className={className} />;
}

function PreviewImage({ storagePath, alt }: { storagePath: string; alt: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const loaded = useRef(false);
  if (!loaded.current) {
    loaded.current = true;
    import('@/integrations/supabase/client').then(({ supabase }) => {
      supabase.storage.from('client-documents').createSignedUrl(storagePath, 300)
        .then(({ data }) => data && setSrc(data.signedUrl));
    });
  }
  if (!src) return <Image className="h-10 w-10 text-muted-foreground/40 animate-pulse" />;
  return <img src={src} alt={alt} className="h-full w-full object-cover" />;
}

interface DocCardProps {
  doc: ClientDocument; view: 'grid' | 'list';
  onDownload: (doc: ClientDocument) => void; onFavoritar: (doc: ClientDocument) => void;
  onEditar: (doc: ClientDocument) => void; onRemover: (doc: ClientDocument) => void; onPreview: (doc: ClientDocument) => void;
}

function DocCard({ doc, view, onDownload, onFavoritar, onEditar, onRemover, onPreview }: DocCardProps) {
  const isImage = doc.mime_type.startsWith('image/');
  const canPreview = PREVIEWABLE_TYPES.includes(doc.mime_type);
  if (view === 'list') {
    return (
      <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/40 group border border-transparent hover:border-border transition-all">
        <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0">
          <FileIcon mimeType={doc.mime_type} className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{doc.file_name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-muted-foreground">{DOCUMENT_CATEGORY_LABELS[doc.category]}</span>
            <span className="text-[10px] text-muted-foreground">{formatarTamanho(doc.file_size)}</span>
            <span className="text-[10px] text-muted-foreground">{new Date(doc.created_at).toLocaleDateString('pt-BR')}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onFavoritar(doc)}>
            {doc.favorite ? <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" /> : <StarOff className="h-3.5 w-3.5" />}
          </Button>
          {canPreview && <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onPreview(doc)}><FileText className="h-3.5 w-3.5" /></Button>}
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onDownload(doc)}><Download className="h-3.5 w-3.5" /></Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-7 w-7"><Pencil className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem onClick={() => onEditar(doc)}>Editar</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onRemover(doc)} className="text-destructive focus:text-destructive">Remover</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  }
  return (
    <div className="group border rounded-lg overflow-hidden bg-card hover:shadow-md transition-all hover:-translate-y-0.5">
      <div className="h-28 bg-muted flex items-center justify-center cursor-pointer relative" onClick={() => canPreview && onPreview(doc)}>
        {isImage ? <PreviewImage storagePath={doc.storage_path} alt={doc.file_name} /> : <FileIcon mimeType={doc.mime_type} className="h-10 w-10 text-muted-foreground/40" />}
        {doc.favorite && <Star className="absolute top-2 right-2 h-3.5 w-3.5 text-amber-500 fill-amber-500" />}
      </div>
      <div className="p-2.5">
        <p className="text-xs font-medium truncate" title={doc.file_name}>{doc.file_name}</p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-muted-foreground">{formatarTamanho(doc.file_size)}</span>
          <Badge variant="secondary" className="text-[9px] h-4 px-1">{DOCUMENT_CATEGORY_LABELS[doc.category]}</Badge>
        </div>
        <div className="flex items-center gap-1 mt-2">
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onFavoritar(doc)}>
            {doc.favorite ? <Star className="h-3 w-3 text-amber-500 fill-amber-500" /> : <StarOff className="h-3 w-3" />}
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onDownload(doc)}><Download className="h-3 w-3" /></Button>
          <Button size="icon" variant="ghost" className="h-6 w-6 ml-auto" onClick={() => onEditar(doc)}><Pencil className="h-3 w-3" /></Button>
          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => onRemover(doc)}><Trash2 className="h-3 w-3" /></Button>
        </div>
      </div>
    </div>
  );
}

function DropZone({ onFiles, disabled }: { onFiles: (files: File[]) => void; disabled?: boolean }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) onFiles(files);
  }, [onFiles]);
  return (
    <div onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={cn('border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
        dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30',
        disabled && 'opacity-50 cursor-not-allowed')}>
      <Upload className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
      <p className="text-sm font-medium">Arraste arquivos aqui ou clique para selecionar</p>
      <p className="text-xs text-muted-foreground mt-1">PDF, imagens, Word, Excel · Máx. 50MB por arquivo</p>
      <input ref={inputRef} type="file" multiple className="hidden"
        onChange={(e) => { const files = Array.from(e.target.files ?? []); if (files.length) onFiles(files); e.target.value = ''; }} />
    </div>
  );
}

function EditModal({ doc, onClose, onSave, isLoading }: { doc: ClientDocument | null; onClose: () => void; onSave: (id: string, payload: { file_name: string; category: DocumentCategory; description: string }) => void; isLoading: boolean }) {
  const [nome, setNome] = useState(doc?.file_name ?? '');
  const [cat, setCat] = useState<DocumentCategory>(doc?.category ?? 'outros');
  const [desc, setDesc] = useState(doc?.description ?? '');
  if (!doc) return null;
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Editar documento</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><label className="text-xs text-muted-foreground">Nome</label><Input value={nome} onChange={(e) => setNome(e.target.value)} className="mt-1" /></div>
          <div>
            <label className="text-xs text-muted-foreground">Categoria</label>
            <Select value={cat} onValueChange={(v) => setCat(v as DocumentCategory)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{DOCUMENT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{DOCUMENT_CATEGORY_LABELS[c]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><label className="text-xs text-muted-foreground">Descrição</label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} className="mt-1" /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>Cancelar</Button>
          <Button onClick={() => onSave(doc.id, { file_name: nome, category: cat, description: desc })} disabled={isLoading || !nome.trim()}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ClienteDocumentos({ clienteId }: { clienteId: string }) {
  const [view, setView] = useState<'grid' | 'list'>('list');
  const [busca, setBusca] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<DocumentCategory | ''>('');
  const [editando, setEditando] = useState<ClientDocument | null>(null);
  const [uploads, setUploads] = useState<UploadProgress[]>([]);

  const filtros: DocumentFiltros = { busca: busca || undefined, category: categoriaFiltro || undefined, ordenarPor: 'created_at', ordem: 'desc', porPagina: 50 };

  const { data, isLoading, isError } = useDocumentos(clienteId, filtros);
  const atualizar = useAtualizarDocumento(clienteId);
  const toggleFav = useToggleFavorito(clienteId);
  const remover = useRemoverDocumento(clienteId);
  const download = useDownloadDocumento();
  const documentos = data?.data ?? [];

  const handleFiles = useCallback(async (files: File[]) => {
    const base = uploads.length;
    const novos: UploadProgress[] = files.map((file) => ({ file, progress: 0, status: 'pending' }));
    setUploads((prev) => [...prev, ...novos]);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const validation = validarArquivo(file);
      if (!validation.valid) {
        setUploads((prev) => prev.map((u, idx) => idx === base + i ? { ...u, status: 'error', error: validation.error } : u));
        toast.error(`${file.name}: ${validation.error}`); continue;
      }
      setUploads((prev) => prev.map((u, idx) => idx === base + i ? { ...u, status: 'uploading' } : u));
      try {
        await uploadDocumento({ clientId: clienteId, file, onProgress: (p) => setUploads((prev) => prev.map((u, idx) => idx === base + i ? { ...u, progress: p } : u)) });
        setUploads((prev) => prev.map((u, idx) => idx === base + i ? { ...u, status: 'done', progress: 100 } : u));
        toast.success(`${file.name} enviado!`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro no upload';
        setUploads((prev) => prev.map((u, idx) => idx === base + i ? { ...u, status: 'error', error: msg } : u));
        toast.error(`${file.name}: ${msg}`);
      }
    }
    setTimeout(() => setUploads([]), 3000);
  }, [clienteId, uploads.length]);

  const handleEditar = useCallback(async (id: string, payload: { file_name: string; category: DocumentCategory; description: string }) => {
    await atualizar.mutateAsync({ id, payload });
    toast.success('Documento atualizado!'); setEditando(null);
  }, [atualizar]);

  const handleFavoritar = useCallback(async (doc: ClientDocument) => {
    await toggleFav.mutateAsync({ id: doc.id, favorite: !doc.favorite });
    toast.success(doc.favorite ? 'Removido dos favoritos.' : 'Adicionado aos favoritos!');
  }, [toggleFav]);

  const handleRemover = useCallback(async (doc: ClientDocument) => {
    if (!confirm(`Remover "${doc.file_name}"?`)) return;
    await remover.mutateAsync(doc.id); toast.success('Documento removido.');
  }, [remover]);

  const handleDownload = useCallback(async (doc: ClientDocument) => { await download.mutateAsync(doc); }, [download]);

  const handlePreview = useCallback(async (doc: ClientDocument) => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data } = await supabase.storage.from('client-documents').createSignedUrl(doc.storage_path, 300);
      if (data?.signedUrl) window.open(data.signedUrl, '_blank');
    } catch { toast.error('Não foi possível abrir o documento.'); }
  }, []);

  return (
    <div className="space-y-4">
      <DropZone onFiles={handleFiles} disabled={uploads.some((u) => u.status === 'uploading')} />

      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map((u, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
              <FileIcon mimeType={u.file.type} className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{u.file.name}</p>
                {u.status === 'error' ? <p className="text-[10px] text-destructive">{u.error}</p> : <Progress value={u.progress} className="h-1 mt-1" />}
              </div>
              {u.status === 'done' && <Check className="h-4 w-4 text-emerald-500 shrink-0" />}
              {u.status === 'error' && <X className="h-4 w-4 text-destructive shrink-0" />}
              {u.status === 'uploading' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar documento..." className="pl-9 h-8 text-sm" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <Select value={categoriaFiltro || 'all'} onValueChange={(v) => setCategoriaFiltro(v === 'all' ? '' : v as DocumentCategory)}>
          <SelectTrigger className="h-8 w-48 text-sm"><SelectValue placeholder="Todas as categorias" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {DOCUMENT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{DOCUMENT_CATEGORY_LABELS[c]}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1 ml-auto">
          <Button size="icon" variant={view === 'list' ? 'default' : 'ghost'} className="h-8 w-8" onClick={() => setView('list')}><List className="h-4 w-4" /></Button>
          <Button size="icon" variant={view === 'grid' ? 'default' : 'ghost'} className="h-8 w-8" onClick={() => setView('grid')}><LayoutGrid className="h-4 w-4" /></Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
      ) : isError ? (
        <p className="text-sm text-destructive text-center py-8">Erro ao carregar documentos.</p>
      ) : documentos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <FileText className="h-10 w-10 text-muted-foreground/30" />
          <div>
            <p className="text-sm font-medium">Nenhum documento encontrado</p>
            <p className="text-xs text-muted-foreground mt-1">{busca ? 'Tente outro termo.' : 'Envie o primeiro documento acima.'}</p>
          </div>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {documentos.map((doc) => <DocCard key={doc.id} doc={doc} view="grid" onDownload={handleDownload} onFavoritar={handleFavoritar} onEditar={setEditando} onRemover={handleRemover} onPreview={handlePreview} />)}
        </div>
      ) : (
        <div className="space-y-1">
          {documentos.map((doc) => <DocCard key={doc.id} doc={doc} view="list" onDownload={handleDownload} onFavoritar={handleFavoritar} onEditar={setEditando} onRemover={handleRemover} onPreview={handlePreview} />)}
        </div>
      )}

      {documentos.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">{documentos.length} documento{documentos.length !== 1 ? 's' : ''} · {data?.total ?? 0} total</p>
      )}

      <EditModal doc={editando} onClose={() => setEditando(null)} onSave={handleEditar} isLoading={atualizar.isPending} />
    </div>
  );
}
