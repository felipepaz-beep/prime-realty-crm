import { supabase } from '@/integrations/supabase/client';
import { TimelineService } from '@/features/clientes/services/timeline.service';
import type { ClientDocument, DocumentFiltros, DocumentInsert, DocumentsPaginados, DocumentUpdate } from '../types';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE, STORAGE_BUCKET } from '../types';

const TABLE = 'client_documents';

export interface ValidationResult { valid: boolean; error?: string; }

export function validarArquivo(file: File): ValidationResult {
  if (file.size === 0) return { valid: false, error: 'O arquivo está vazio.' };
  if (file.size > MAX_FILE_SIZE) return { valid: false, error: `O arquivo excede o limite de 50MB (${formatarTamanho(file.size)}).` };
  if (!ALLOWED_MIME_TYPES.includes(file.type)) return { valid: false, error: `Tipo de arquivo não permitido: ${file.type || 'desconhecido'}.` };
  if (!file.name || file.name.trim().length === 0) return { valid: false, error: 'Nome do arquivo inválido.' };
  return { valid: true };
}

export function formatarTamanho(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(0)} KB`;
  return `${bytes} B`;
}

function getExtension(fileName: string): string {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

function buildStoragePath(ownerId: string, clientId: string, fileName: string): string {
  const timestamp = Date.now();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 100);
  return `${ownerId}/${clientId}/${timestamp}_${safeName}`;
}

export async function listarDocumentos(clientId: string, filtros: DocumentFiltros = {}): Promise<DocumentsPaginados> {
  const { category, busca, favorite, ordenarPor = 'created_at', ordem = 'desc', pagina = 1, porPagina = 20 } = filtros;
  let query = supabase.from(TABLE).select('*', { count: 'exact' }).eq('client_id', clientId).is('deleted_at', null);
  if (category) query = query.eq('category', category);
  if (favorite !== undefined) query = query.eq('favorite', favorite);
  if (busca) query = query.or(`file_name.ilike.%${busca}%,original_name.ilike.%${busca}%,description.ilike.%${busca}%`);
  const inicio = (pagina - 1) * porPagina;
  const { data, error, count } = await query.order(ordenarPor, { ascending: ordem === 'asc' }).range(inicio, inicio + porPagina - 1);
  if (error) throw error;
  return { data: (data ?? []) as ClientDocument[], total: count ?? 0, pagina, porPagina };
}

export async function buscarDocumentoPorId(id: string): Promise<ClientDocument> {
  const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).is('deleted_at', null).single();
  if (error) throw error;
  return data as ClientDocument;
}

export async function gerarSignedUrl(storagePath: string, expiresIn = 3600): Promise<string> {
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(storagePath, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

export interface UploadOptions {
  clientId: string; file: File; category?: string; description?: string; onProgress?: (progress: number) => void;
}

export async function uploadDocumento(options: UploadOptions): Promise<ClientDocument> {
  const { clientId, file, category = 'outros', description, onProgress } = options;
  const validation = validarArquivo(file);
  if (!validation.valid) throw new Error(validation.error);
  const { data: sessionData } = await supabase.auth.getUser();
  const ownerId = sessionData.user?.id;
  if (!ownerId) throw new Error('Usuário não autenticado.');
  const storagePath = buildStoragePath(ownerId, clientId, file.name);
  onProgress?.(10);
  const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, file, { cacheControl: '3600', upsert: false });
  if (uploadError) throw new Error(`Erro no upload: ${uploadError.message}`);
  onProgress?.(70);
  const payload = {
    client_id: clientId, file_name: file.name, original_name: file.name,
    storage_path: storagePath, mime_type: file.type || 'application/octet-stream',
    extension: getExtension(file.name), file_size: file.size,
    category: category as ClientDocument['category'], description: description ?? null,
    tags: [], favorite: false, metadata: {},
  };
  const { data, error: dbError } = await supabase.from(TABLE).insert({ ...payload, owner_id: ownerId, uploaded_by: ownerId } as never).select('*').single();
  if (dbError) {
    await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
    throw new Error(`Erro ao salvar documento: ${dbError.message}`);
  }
  onProgress?.(100);
  const documento = data as ClientDocument;
  TimelineService.documentoAnexado(clientId, documento.file_name, storagePath);
  return documento;
}

export async function atualizarDocumento(id: string, payload: DocumentUpdate): Promise<ClientDocument> {
  const { data, error } = await supabase.from(TABLE).update(payload as never).eq('id', id).select('*').single();
  if (error) throw error;
  const doc = data as ClientDocument;
  if (payload.file_name) TimelineService.documentoAnexado(doc.client_id, doc.file_name, doc.storage_path);
  return doc;
}

export async function toggleFavorito(id: string, favorite: boolean): Promise<ClientDocument> {
  const { data, error } = await supabase.from(TABLE).update({ favorite } as never).eq('id', id).select('*').single();
  if (error) throw error;
  return data as ClientDocument;
}

export async function removerDocumento(id: string): Promise<void> {
  const doc = await buscarDocumentoPorId(id);
  const { error } = await supabase.from(TABLE).update({ deleted_at: new Date().toISOString() } as never).eq('id', id);
  if (error) throw error;
  TimelineService.documentoRemovido(doc.client_id, doc.file_name);
}

export async function restaurarDocumento(id: string): Promise<ClientDocument> {
  const { data, error } = await supabase.from(TABLE).update({ deleted_at: null } as never).eq('id', id).select('*').single();
  if (error) throw error;
  const doc = data as ClientDocument;
  TimelineService.documentoAnexado(doc.client_id, `${doc.file_name} (restaurado)`, doc.storage_path);
  return doc;
}

export async function downloadDocumento(doc: ClientDocument): Promise<void> {
  const url = await gerarSignedUrl(doc.storage_path, 60);
  const a = document.createElement('a');
  a.href = url; a.download = doc.original_name; a.click();
}
