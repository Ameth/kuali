// src/components/AuditDetailModal.jsx
import React, { useEffect, useState, useMemo } from 'react'
import {
  X,
  Award,
  HeartHandshake,
  CheckCircle2,
  XCircle,
  ThumbsUp,
  AlertTriangle,
  HelpCircle,
  Sparkles,
  User,
  Headphones,
  MessageSquare,
} from 'lucide-react'
import { apiService } from '../services/api'

const AuditDetailModal = ({ auditId, onClose }) => {
  const [audit, setAudit] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!auditId) return

    const fetchDetail = async () => {
      try {
        setLoading(true)
        const data = await apiService.getAuditDetail(auditId)
        setAudit(data)
      } catch (err) {
        console.error('Error cargando detalle de auditoría:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDetail()
  }, [auditId])

  // Parser para transformar el texto en diálogo tipo chat
  const chatMessages = useMemo(() => {
    if (!audit?.transcription) return []

    const lines = audit.transcription
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    const messages = []

    lines.forEach((line, index) => {
      const match = line.match(
        /^(Hablante\s*\d+|Speaker\s*\d+|Cliente|Asesor):\s*(.*)/i,
      )
      if (match) {
        const speakerRaw = match[1].toLowerCase()
        const text = match[2]
        const isAgent =
          speakerRaw.includes('0') || speakerRaw.includes('asesor')

        messages.push({
          id: index,
          speaker: isAgent
            ? audit.agent_name || 'Asesor'
            : 'Cliente / Prospecto',
          role: isAgent ? 'agent' : 'customer',
          text: text,
        })
      } else {
        if (messages.length > 0) {
          messages[messages.length - 1].text += ` ${line}`
        } else {
          messages.push({
            id: index,
            speaker: 'Conversación',
            role: 'agent',
            text: line,
          })
        }
      }
    })

    return messages
  }, [audit])

  if (!auditId) return null

  const analysis = audit?.analysis_result || {}

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto'>
      <div className='relative w-full max-w-4xl bg-[#14161f] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-6 max-h-[92vh] flex flex-col'>
        {/* Cabecera */}
        <div className='flex items-center justify-between p-5 sm:p-6 border-b border-slate-800/80 bg-[#10121a]'>
          <div className='flex items-center gap-3.5'>
            <div className='p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20'>
              <Sparkles className='w-5 h-5 text-cyan-400' />
            </div>
            <div>
              <h3 className='text-lg font-bold text-white tracking-tight'>
                Auditoría Kuali QA
              </h3>
              <p className='text-xs text-slate-400 font-mono mt-0.5'>
                ID Grabación: {audit?.uniqueid || auditId}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className='cursor-pointer p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        {/* Contenido */}
        <div className='p-6 overflow-y-auto space-y-6 flex-1 text-slate-200 text-sm'>
          {loading ? (
            <div className='py-24 text-center text-slate-300 animate-pulse text-base'>
              Kuali está cargando el análisis de calidad...
            </div>
          ) : !audit ? (
            <div className='py-24 text-center text-rose-400 text-base'>
              No se pudo cargar la información de esta auditoría.
            </div>
          ) : (
            <>
              {/* Tarjetas Superiores */}
              <div className='grid grid-cols-2 sm:grid-cols-4 gap-3.5'>
                <div className='bg-[#0d0e15] border border-slate-800 p-4 rounded-2xl'>
                  <div className='flex items-center gap-1.5 text-xs text-slate-400 mb-1'>
                    <User className='w-4 h-4 text-cyan-400' />
                    <span>Asesor</span>
                  </div>
                  <div className='font-semibold text-white truncate text-base'>
                    {audit.agent_name}
                  </div>
                  <span className='text-xs text-cyan-400/90 font-mono'>
                    Ext: {audit.agent_extension || 'N/A'}
                  </span>
                </div>

                <div className='bg-[#0d0e15] border border-slate-800 p-4 rounded-2xl'>
                  <div className='flex items-center gap-1.5 text-xs text-slate-400 mb-1'>
                    <Award className='w-4 h-4 text-emerald-400' />
                    <span>Calificación</span>
                  </div>
                  <div className='text-xl font-bold text-emerald-300 font-mono'>
                    {audit.overall_score !== null
                      ? `${audit.overall_score} / 10`
                      : 'N/A'}
                  </div>
                </div>

                <div className='bg-[#0d0e15] border border-slate-800 p-4 rounded-2xl'>
                  <div className='flex items-center gap-1.5 text-xs text-slate-400 mb-1'>
                    <HeartHandshake className='w-4 h-4 text-cyan-400' />
                    <span>Empatía</span>
                  </div>
                  <div className='text-xl font-bold text-cyan-300 font-mono'>
                    {audit.empathy_score !== null
                      ? `${audit.empathy_score} / 10`
                      : 'N/A'}
                  </div>
                </div>

                <div className='bg-[#0d0e15] border border-slate-800 p-4 rounded-2xl'>
                  <div className='flex items-center gap-1.5 text-xs text-slate-400 mb-1'>
                    <CheckCircle2 className='w-4 h-4 text-purple-400' />
                    <span>Guion</span>
                  </div>
                  <div className='text-sm font-semibold mt-1'>
                    {audit.script_compliance ? (
                      <span className='text-emerald-300 inline-flex items-center gap-1.5'>
                        <CheckCircle2 className='w-4 h-4' /> Cumplido
                      </span>
                    ) : (
                      <span className='text-rose-400 inline-flex items-center gap-1.5'>
                        <XCircle className='w-4 h-4' /> Incompleto
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Programa de Interés */}
              {audit.detected_program && (
                <div className='bg-[#0d0e15] border border-slate-800 p-4 rounded-2xl flex items-center justify-between'>
                  <span className='text-xs font-semibold text-slate-300 uppercase tracking-wider'>
                    Programa consultado por prospecto:
                  </span>
                  <span className='text-sm font-semibold text-cyan-200 bg-cyan-950/60 border border-cyan-800/60 px-3.5 py-1.5 rounded-xl'>
                    {audit.detected_program}
                  </span>
                </div>
              )}

              {/* Resumen Ejecutivo */}
              {analysis.summary && (
                <div className='bg-[#0d0e15] border border-slate-800 p-5 rounded-2xl'>
                  <h4 className='text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2.5'>
                    Resumen Ejecutivo de la Conversación
                  </h4>
                  <p className='text-slate-100 leading-relaxed text-sm'>
                    {analysis.summary}
                  </p>
                </div>
              )}

              {/* Fortalezas y Áreas de Mejora */}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='bg-emerald-950/20 border border-emerald-900/40 p-5 rounded-2xl'>
                  <h4 className='text-xs font-semibold uppercase tracking-wider text-emerald-300 mb-3 flex items-center gap-2'>
                    <ThumbsUp className='w-4 h-4 text-emerald-400' /> Fortalezas
                    del Asesor
                  </h4>
                  <ul className='space-y-2.5'>
                    {analysis.agent_strengths?.length > 0 ? (
                      analysis.agent_strengths.map((str, idx) => (
                        <li
                          key={idx}
                          className='text-slate-100 flex items-start gap-2.5 leading-relaxed text-sm'
                        >
                          <span className='text-emerald-400 font-bold text-base leading-none mt-0.5'>
                            •
                          </span>
                          <span>{str}</span>
                        </li>
                      ))
                    ) : (
                      <li className='text-slate-400 text-sm'>
                        Sin fortalezas registradas.
                      </li>
                    )}
                  </ul>
                </div>

                <div className='bg-amber-950/20 border border-amber-900/40 p-5 rounded-2xl'>
                  <h4 className='text-xs font-semibold uppercase tracking-wider text-amber-300 mb-3 flex items-center gap-2'>
                    <AlertTriangle className='w-4 h-4 text-amber-400' />{' '}
                    Oportunidades de Mejora
                  </h4>
                  <ul className='space-y-2.5'>
                    {analysis.areas_for_improvement?.length > 0 ? (
                      analysis.areas_for_improvement.map((area, idx) => (
                        <li
                          key={idx}
                          className='text-slate-100 flex items-start gap-2.5 leading-relaxed text-sm'
                        >
                          <span className='text-amber-400 font-bold text-base leading-none mt-0.5'>
                            •
                          </span>
                          <span>{area}</span>
                        </li>
                      ))
                    ) : (
                      <li className='text-slate-400 text-sm'>
                        Sin observaciones de mejora.
                      </li>
                    )}
                  </ul>
                </div>
              </div>

              {/* Manejo de Objeciones */}
              {analysis.objections_handled?.length > 0 && (
                <div className='bg-cyan-950/20 border border-cyan-900/40 p-5 rounded-2xl'>
                  <h4 className='text-xs font-semibold uppercase tracking-wider text-cyan-300 mb-3 flex items-center gap-2'>
                    <HelpCircle className='w-4 h-4 text-cyan-400' /> Manejo de
                    Dudas y Objeciones
                  </h4>
                  <ul className='space-y-2.5'>
                    {analysis.objections_handled.map((obj, idx) => (
                      <li
                        key={idx}
                        className='text-slate-100 flex items-start gap-2.5 leading-relaxed text-sm'
                      >
                        <span className='text-cyan-400 font-bold text-base leading-none mt-0.5'>
                          •
                        </span>
                        <span>{obj}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Transcripción estilo Chat */}
              <div className='border border-slate-800 rounded-2xl p-5 bg-[#0d0e15]'>
                <div className='flex items-center justify-between mb-4 pb-3 border-b border-slate-800/70'>
                  <h4 className='text-sm font-semibold uppercase tracking-wider text-slate-200 flex items-center gap-2'>
                    <MessageSquare className='w-4 h-4 text-cyan-400' />
                    Transcripción de la Conversación
                  </h4>
                  <span className='text-xs text-slate-400 font-medium'>
                    {chatMessages.length} intervenciones registradas
                  </span>
                </div>

                <div className='space-y-4 max-h-[420px] overflow-y-auto pr-2'>
                  {chatMessages.length === 0 ? (
                    <div className='text-center py-8 text-slate-500 font-mono text-sm'>
                      No hay transcripción disponible para esta llamada.
                    </div>
                  ) : (
                    chatMessages.map((msg) => {
                      const isAgent = msg.role === 'agent'
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isAgent ? 'items-start' : 'items-end'}`}
                        >
                          <div className='flex items-center gap-1.5 mb-1 px-1'>
                            {isAgent ? (
                              <Headphones className='w-4 h-4 text-cyan-400' />
                            ) : (
                              <User className='w-4 h-4 text-indigo-400' />
                            )}
                            <span
                              className={`text-xs font-bold tracking-tight ${isAgent ? 'text-cyan-300' : 'text-indigo-300'}`}
                            >
                              {msg.speaker}
                            </span>
                          </div>

                          <div
                            className={`max-w-[88%] sm:max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-md ${
                              isAgent
                                ? 'bg-[#182030] text-slate-100 border border-cyan-800/50 rounded-tl-sm'
                                : 'bg-[#1c1829] text-slate-100 border border-indigo-800/50 rounded-tr-sm'
                            }`}
                          >
                            <p className='whitespace-pre-wrap font-normal'>
                              {msg.text}
                            </p>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default AuditDetailModal
