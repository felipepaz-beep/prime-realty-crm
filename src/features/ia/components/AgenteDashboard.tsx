
// src/features/ia/components/AgenteDashboard.tsx
// Painel visual do Agente de IA — mostra pendentes, sugestões e follow-ups

import { useState } from 'react'
import { runWhatsAppAgent, AgentRunResult, AgentSuggestion } from '../services/whatsapp-agent'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Bot, MessageSquare, Clock, UserPlus, RefreshCw, Copy, CheckCheck } from 'lucide-react'
import { toast } from 'sonner'

export function AgenteDashboard() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AgentRunResult | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  async function rodarAgente() {
    setLoading(true)
    try {
      const res = await runWhatsAppAgent()
      setResult(res)
      toast.success(`Agente concluído — ${res.pendingChats.length} pendentes encontrados`)
    } catch (e: any) {
      toast.error(`Erro ao rodar agente: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  async function copiarResposta(suggestion: AgentSuggestion) {
    await navigator.clipboard.writeText(suggestion.suggestedReply)
    setCopiedId(suggestion.chatId)
    toast.success('Resposta copiada!')
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Agente de IA — WhatsApp</h1>
            <p className="text-sm text-muted-foreground">
              Analisa suas conversas e sugere respostas automaticamente
            </p>
          </div>
        </div>

        <Button onClick={rodarAgente} disabled={loading} size="lg">
          {loading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analisando...</>
          ) : (
            <><RefreshCw className="w-4 h-4 mr-2" />Rodar Agente</>
          )}
        </Button>
      </div>

      {/* Stats rápidos */}
      {result && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{result.pendingChats.length}</p>
                <p className="text-xs text-muted-foreground">Pendentes de resposta</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <Clock className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{result.followUpCandidates.length}</p>
                <p className="text-xs text-muted-foreground">Para follow-up</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <UserPlus className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{result.newClientsCreated}</p>
                <p className="text-xs text-muted-foreground">Clientes criados no CRM</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Estado vazio */}
      {!result && !loading && (
        <Card className="border-dashed">
          <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
            <Bot className="w-12 h-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">
              Clique em "Rodar Agente" para analisar suas conversas do WhatsApp
            </p>
            <p className="text-xs text-muted-foreground">
              O agente vai identificar quem está esperando resposta, sugerir textos e atualizar o CRM
            </p>
          </CardContent>
        </Card>
      )}

      {/* Conversas pendentes */}
      {result && result.pendingChats.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Aguardando sua resposta
          </h2>
          {result.pendingChats.map((item) => (
            <Card key={item.chatId} className="border-orange-200 dark:border-orange-900">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{item.contactName}</CardTitle>
                    <p className="text-sm text-muted-foreground">{item.contactPhone}</p>
                  </div>
                  <Badge variant="outline" className="text-orange-600 border-orange-300">
                    <Clock className="w-3 h-3 mr-1" />
                    {item.hoursWaiting}h esperando
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Última mensagem */}
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Última mensagem do contato:</p>
                  <p className="text-sm">"{item.context}"</p>
                </div>

                {/* Sugestão da IA */}
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-primary font-medium flex items-center gap-1">
                      <Bot className="w-3 h-3" /> Sugestão do Agente
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs"
                      onClick={() => copiarResposta(item)}
                    >
                      {copiedId === item.chatId ? (
                        <><CheckCheck className="w-3 h-3 mr-1" />Copiado</>
                      ) : (
                        <><Copy className="w-3 h-3 mr-1" />Copiar</>
                      )}
                    </Button>
                  </div>
                  <p className="text-sm">{item.suggestedReply}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Follow-ups */}
      {result && result.followUpCandidates.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Follow-up sugerido
          </h2>
          {result.followUpCandidates.map((item, i) => (
            <Card key={i} className="border-blue-200 dark:border-blue-900">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{item.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{item.phone}</p>
                  </div>
                  <Badge variant="outline" className="text-blue-600 border-blue-300">
                    {item.daysSinceContact} dias sem contato
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-blue-600 font-medium flex items-center gap-1">
                      <Bot className="w-3 h-3" /> Mensagem sugerida
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs"
                      onClick={async () => {
                        await navigator.clipboard.writeText(item.message)
                        toast.success('Mensagem copiada!')
                      }}
                    >
                      <Copy className="w-3 h-3 mr-1" />Copiar
                    </Button>
                  </div>
                  <p className="text-sm">{item.message}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Erros */}
      {result && result.errors.length > 0 && (
        <Card className="border-red-200">
          <CardContent className="pt-4">
            <p className="text-sm font-medium text-red-600 mb-2">Avisos do agente:</p>
            {result.errors.map((e, i) => (
              <p key={i} className="text-xs text-muted-foreground">• {e}</p>
            ))}
          </CardContent>
        </Card>
      )}

    </div>
  )
}
