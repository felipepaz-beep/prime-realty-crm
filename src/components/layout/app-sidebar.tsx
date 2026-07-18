import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Calendar,
  KanbanSquare,
  Clock,
  Wallet,
  Sparkles,
  MessageCircle,
  BarChart3,
  Search,
  Settings,
  Home,
  User,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

type NavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  soon?: boolean;
};

const workspaceItems: NavItem[] = [
  { title: "Início", url: "/inicio", icon: Home },
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Agenda", url: "/agenda", icon: Calendar },
  { title: "Kanban", url: "/kanban", icon: KanbanSquare },
  { title: "Timeline", url: "/timeline", icon: Clock, soon: true },
];

const toolItems: NavItem[] = [
  { title: "Financeiro", url: "/financeiro", icon: Wallet },
  { title: "IA", url: "/ia", icon: Sparkles },
  { title: "WhatsApp", url: "/whatsapp", icon: MessageCircle },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3 },
  { title: "Pesquisa", url: "/pesquisa", icon: Search, soon: true },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  const renderItem = (item: NavItem) => {
    const isActive = pathname === item.url;
    const Icon = item.icon;
    const content = (
      <SidebarMenuButton
        asChild={!item.soon}
        isActive={isActive}
        tooltip={item.title}
        className="data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
      >
        {item.soon ? (
          <button
            type="button"
            disabled
            className="flex w-full items-center gap-2 opacity-60 cursor-not-allowed"
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && (
              <>
                <span className="truncate">{item.title}</span>
                <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
                  em breve
                </span>
              </>
            )}
          </button>
        ) : (
          <Link to={item.url} className="flex items-center gap-2">
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="truncate">{item.title}</span>}
          </Link>
        )}
      </SidebarMenuButton>
    );
    return <SidebarMenuItem key={item.title}>{content}</SidebarMenuItem>;
  };

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b h-14 flex items-center px-3">
        <Link to="/inicio" className="flex items-center gap-2 font-semibold">
          <div className="h-7 w-7 rounded-md bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground text-xs font-bold">
            C
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm">Corretor CRM</span>
              <span className="text-[10px] text-muted-foreground">Premium</span>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Workspace</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{workspaceItems.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Ferramentas</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{toolItems.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Meu perfil">
              <Link to="/perfil" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {!collapsed && <span>Meu perfil</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton disabled tooltip="Configurações" className="opacity-60">
              <Settings className="h-4 w-4" />
              {!collapsed && <span>Configurações</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
