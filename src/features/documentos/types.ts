export type DocumentCategory =
  | 'documento_pessoal' | 'rg' | 'cpf' | 'cnh'
  | 'comprovante_renda' | 'comprovante_residencia'
  | 'matricula' | 'contrato' | 'proposta'
  | 'financiamento' | 'escritura' | 'fotos' | 'outros';

export interface DocumentMetadata {
  ocr_text?: string;
  ai_summary?: string;
  signature_request_id?: string;
  whatsapp_sent_at?: string;
  shared_link?: string;
  [key: string]: unknown;
}

export interface ClientDocument {
  id: string;
  owner_id: string;
  client_id: string;
  file_name: string;
  original_name: string;
  storage_path: string;
  mime_type: string;
  extension: string;
  file_size: number;
  category: DocumentCategory;
  description: string | null;
  tags: string[];
  favorite: boolean;
  metadata: DocumentMetadata;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type DocumentInsert = Omit<ClientDocument,
  'id' | 'owner_id' | 'uploaded_by' | 'created_at' | 'updated_at' | 'deleted_at'
>;

export type DocumentUpdate = Partial<Pick<ClientDocument,
  'file_name' | 'category' | 'description' | 'tags' | 'favorite' | 'metadata'
>>;

export interface DocumentFiltros {
  category?: DocumentCategory;
  busca?: string;
  favorite?: boolean;
  ordenarPor?: 'created_at' | 'file_name' | 'file_size' | 'category';
  ordem?: 'asc' | 'desc';
  pagina?: number;
  porPagina?: number;
}

export interface DocumentsPaginados {
  data: ClientDocument[];
  total: number;
  pagina: number;
  porPagina: number;
}

export interface UploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
  documentId?: string;
}

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  documento_pessoal: 'Documento pessoal', rg: 'RG', cpf: 'CPF', cnh: 'CNH',
  comprovante_renda: 'Comprovante de renda', comprovante_residencia: 'Comprovante de residência',
  matricula: 'Matrícula', contrato: 'Contrato', proposta: 'Proposta',
  financiamento: 'Financiamento', escritura: 'Escritura', fotos: 'Fotos', outros: 'Outros',
};

export const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  'documento_pessoal','rg','cpf','cnh','comprovante_renda',
  'comprovante_residencia','matricula','contrato','proposta',
  'financiamento','escritura','fotos','outros',
];

export const MAX_FILE_SIZE = 50 * 1024 * 1024;

export const ALLOWED_MIME_TYPES = [
  'image/jpeg','image/png','image/webp','image/gif','image/heic',
  'application/pdf','application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain','text/csv',
];

export const PREVIEWABLE_TYPES = ['image/jpeg','image/png','image/webp','image/gif','application/pdf'];
export const STORAGE_BUCKET = 'client-documents';
