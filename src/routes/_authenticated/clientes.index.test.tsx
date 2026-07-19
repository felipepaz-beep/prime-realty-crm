import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createRootRoute,
  createRoute,
  createRouter,
  createMemoryHistory,
  RouterProvider,
  Outlet,
} from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Cliente } from '@/features/clientes/types';

// ---- Mocks ----
const mockClientes: Cliente[] = [
  {
    id: 'cli-1', owner_id: 'u', is_active: true,
    created_at: '', updated_at: '', deleted_at: null,
    nome: 'Ana Souza', telefone: null, whatsapp: '11999990001', email: null,
    cpf: null, data_nascimento: null, cidade: null, estado: null, origem_lead: null,
    status: 'ativo', etapa_funil: 'novo_lead', prioridade: 'media', score: 0, temperatura: 'morno',
    tipo_imovel: null, finalidade: null, faixa_valor_min: null, faixa_valor_max: null,
    bairros_interesse: [], cidades_interesse: [],
    ultimo_contato: null, proximo_followup: null, ultima_visita: null,
    observacoes: null, codigo_imovel: null, forma_pagamento: null,
    valor_negociado: null, previsao_fechamento: null, tags: [], custom_fields: {},
  },
  {
    id: 'cli-2', owner_id: 'u', is_active: true,
    created_at: '', updated_at: '', deleted_at: null,
    nome: 'Bruno Lima', telefone: null, whatsapp: '11999990002', email: null,
    cpf: null, data_nascimento: null, cidade: null, estado: null, origem_lead: null,
    status: 'ativo', etapa_funil: 'qualificacao', prioridade: 'alta', score: 0, temperatura: 'quente',
    tipo_imovel: null, finalidade: null, faixa_valor_min: null, faixa_valor_max: null,
    bairros_interesse: [], cidades_interesse: [],
    ultimo_contato: null, proximo_followup: null, ultima_visita: null,
    observacoes: null, codigo_imovel: null, forma_pagamento: null,
    valor_negociado: null, previsao_fechamento: null, tags: [], custom_fields: {},
  },
];

vi.mock('@/features/clientes/hooks/use-clientes', () => ({
  useClientes: () => ({
    data: { data: mockClientes, total: mockClientes.length, pagina: 1, porPagina: 20 },
    isLoading: false,
    isError: false,
  }),
  useCriarCliente: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRemoverCliente: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

// Avoid pulling supabase/network via form/badge components
vi.mock('@/features/clientes/components/cliente-form', () => ({
  ClienteForm: () => null,
}));

// Import the route AFTER mocks so its module graph gets the mocked hooks
import { Route as ClientesRoute } from '@/routes/_authenticated/clientes.index';

function buildRouter() {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const clientesRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/clientes',
    component: ClientesRoute.options.component!,
  });
  const detailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/clientes/$clienteId',
    component: function Detail() {
      const { clienteId } = detailRoute.useParams();
      return <div data-testid="detail">detalhe:{clienteId}</div>;
    },
  });
  return createRouter({
    routeTree: rootRoute.addChildren([clientesRoute, detailRoute]),
    history: createMemoryHistory({ initialEntries: ['/clientes'] }),
    defaultPreload: false,
  });
}

function renderApp() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = buildRouter();
  return {
    router,
    ...render(
      <QueryClientProvider client={qc}>
        <RouterProvider router={router} />

      </QueryClientProvider>,
    ),
  };
}

describe('Clientes — navegação por linha da tabela', () => {
  beforeEach(() => cleanup());

  it('a linha inteira é clicável (role/cursor) e as células não são links', async () => {
    renderApp();
    const linha = await screen.findByText('Ana Souza');
    const row = linha.closest('tr')!;
    expect(row.className).toMatch(/cursor-pointer/);
    // Nenhum <a> nas células (apenas onClick na row)
    expect(within(row).queryAllByRole('link')).toHaveLength(0);
  });

  it('clicar em qualquer célula da linha navega para /clientes/$clienteId', async () => {
    const user = userEvent.setup();
    const { router } = renderApp();

    const cellCount = 6; // 6 células de conteúdo
    for (let i = 0; i < cellCount; i++) {
      await router.navigate({ to: '/clientes' });
      const linha = await screen.findByText('Bruno Lima');
      const row = linha.closest('tr')!;
      const cells = within(row).getAllByRole('cell');
      await user.click(cells[i]);
      expect(router.state.location.pathname).toBe('/clientes/cli-2');
    }
  });



  it('clicar em "Remover" NÃO navega para a página de detalhe', async () => {
    const user = userEvent.setup();
    const { router } = renderApp();

    const linha = await screen.findByText('Ana Souza');
    const row = linha.closest('tr')!;
    const remover = within(row).getByRole('button', { name: /remover/i });

    // Suprime confirm nativo
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    await user.click(remover);
    expect(router.state.location.pathname).toBe('/clientes');
  });
});
