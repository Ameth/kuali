// src/components/AuditDetailModal.jsx
import React, { useState, useEffect } from 'react'
import {
  X,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ListChecks,
  FileText,
  User,
  Phone,
  Calendar,
  Clock,
  Tag,
  Activity,
  RefreshCw,
  MessageSquare,
  Headphones,
} from 'lucide-react'
import { apiService } from '../services/api'

const AuditDetailModal = ({ audit, onClose }) => {
  const [fullAudit, setFullAudit] = useState(audit)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchFullData = async () => {
      if (!audit?.id) return
      if (audit.analysis_result && audit.transcription) {
        setFullAudit(audit)
        return
      }

      try {
        setLoading(true)
        const fetchFn =
          apiService.getAudit ||
          apiService.getAuditDetail ||
          apiService.getAuditById
        if (typeof fetchFn === 'function') {
          const detail = await fetchFn(audit.id)
          setFullAudit(detail)
        }
      } catch (err) {
        console.error('Error cargando detalle completo de la auditoría:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchFullData()
  }, [audit])

  if (!audit) return null

  const currentData = fullAudit || audit

  let evaluation = currentData.analysis_result || currentData.evaluation || {}
  if (typeof evaluation === 'string') {
    try {
      evaluation = JSON.parse(evaluation)
    } catch (e) {
      evaluation = {}
    }
  }

  const formatKeyTitle = (key) => {
    const knownKeys = {
      overall_score: 'Calificación general',
      empathy_score: 'Nivel de empatía',
      script_compliance: 'Cumplimiento de guion',
      detected_program: 'Aspecto o servicio detectado',
      agent_strengths: 'Fortalezas del asesor',
      areas_for_improvement: 'Oportunidades de mejora',
      objections_handled: 'Manejo de objeciones y dudas',
      summary: 'Resumen de la conversación',
      customer_sentiment: 'Sentimiento del cliente',
      protocol_adherence: 'Apego a protocolos',
      security_verification: 'Validación de seguridad',
      commercial_closure: 'Cierre comercial',
    }

    if (knownKeys[key]) return knownKeys[key]

    const readable = key.replace(/_/g, ' ').trim()
    return readable.charAt(0).toUpperCase() + readable.slice(1).toLowerCase()
  }

  const scores = []
  const booleans = []
  const chips = []
  const summaries = []
  const lists = []

  Object.entries(evaluation).forEach(([key, val]) => {
    if (val === null || val === undefined) return

    if (typeof val === 'number') {
      scores.push({ key, value: val })
    } else if (typeof val === 'boolean') {
      booleans.push({ key, value: val })
    } else if (Array.isArray(val)) {
      lists.push({ key, items: val })
    } else if (typeof val === 'string') {
      if (val.length > 75) {
        summaries.push({ key, text: val })
      } else {
        chips.push({ key, text: val })
      }
    }
  })

  // Parser para convertir el texto en burbujas de diálogo tipo chat
  const parseDialogue = (rawText) => {
    if (!rawText) return []

    const lines = rawText.split('\n').filter((l) => l.trim() !== '')
    return lines.map((line, index) => {
      const match = line.match(
        /^(Hablante\s*0|Hablante\s*1|Asesor|Cliente|Prospecto|Agente)\s*:\s*(.*)$/i,
      )

      if (match) {
        const speakerRaw = match[1].toLowerCase()
        const isAgent =
          speakerRaw.includes('0') ||
          speakerRaw.includes('asesor') ||
          speakerRaw.includes('agente')

        return {
          id: index,
          speaker: isAgent ? currentData.agent_name || 'Asesor' : 'Cliente',
          isAgent,
          text: match[2].trim(),
        }
      }

      return {
        id: index,
        speaker: 'Diálogo',
        isAgent: index % 2 === 0,
        text: line.trim(),
      }
    })
  }

  const dialogueMessages = parseDialogue(currentData.transcription)

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200'>
      <div className='bg-[#14161f] border border-slate-800 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]'>
        {/* Cabecera */}
        <div className='p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between bg-[#10121a]'>
          <div className='flex items-center gap-3'>
            <div className='p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/10 to-indigo-500/10 border border-cyan-500/20 text-cyan-400'>
              <Sparkles className='w-5 h-5' />
            </div>
            <div>
              <div className='flex items-center gap-2'>
                <h3 className='text-sm sm:text-base font-bold text-white tracking-wide'>
                  Detalle de auditoría
                </h3>
                <span className='text-[10px] font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 px-2 py-0.5 rounded-md font-semibold'>
                  Kuali
                </span>
              </div>
              <p className='text-[11px] text-slate-400 font-mono mt-0.5'>
                Identificador: {currentData.uniqueid || currentData.id}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className='cursor-pointer p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors'
            title='Cerrar ventana'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        {/* Metadatos Generales */}
        <div className='bg-[#0e1017] border-b border-slate-800/60 px-5 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs'>
          <div className='flex items-center gap-2 text-slate-300'>
            <User className='w-4 h-4 text-cyan-400 flex-shrink-0' />
            <div className='truncate'>
              <span className='text-slate-500 text-[10px] block'>Asesor</span>
              <span className='font-semibold'>
                {currentData.agent_name ||
                  (currentData.agent && currentData.agent.name) ||
                  'Asesor asignado'}
              </span>
            </div>
          </div>

          <div className='flex items-center gap-2 text-slate-300'>
            <Phone className='w-4 h-4 text-purple-400 flex-shrink-0' />
            <div className='truncate'>
              <span className='text-slate-500 text-[10px] block'>Teléfono</span>
              <span className='font-mono'>
                {currentData.customer_phone || 'Sin número'}
              </span>
            </div>
          </div>

          <div className='flex items-center gap-2 text-slate-300'>
            <Calendar className='w-4 h-4 text-emerald-400 flex-shrink-0' />
            <div className='truncate'>
              <span className='text-slate-500 text-[10px] block'>Fecha</span>
              <span>
                {currentData.call_date
                  ? new Date(currentData.call_date).toLocaleDateString('es-CO')
                  : 'N/A'}
              </span>
            </div>
          </div>

          <div className='flex items-center gap-2 text-slate-300'>
            <Clock className='w-4 h-4 text-amber-400 flex-shrink-0' />
            <div className='truncate'>
              <span className='text-slate-500 text-[10px] block'>Duración</span>
              <span className='font-mono'>
                {currentData.duration_seconds || 0} segundos
              </span>
            </div>
          </div>
        </div>

        {/* Contenido Dinámico */}
        <div className='p-5 sm:p-6 overflow-y-auto space-y-5'>
          {loading ? (
            <div className='py-16 flex flex-col items-center justify-center gap-3 text-slate-400'>
              <RefreshCw className='w-6 h-6 animate-spin text-cyan-400' />
              <span className='text-xs'>Cargando análisis detallado...</span>
            </div>
          ) : (
            <>
              {/* Calificaciones y Estados */}
              {(scores.length > 0 || booleans.length > 0) && (
                <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
                  {scores.map(({ key, value }) => (
                    <div
                      key={key}
                      className='bg-[#0d0e15] border border-slate-800/80 p-3.5 rounded-2xl'
                    >
                      <span className='text-xs font-medium text-slate-400 block mb-1 truncate'>
                        {formatKeyTitle(key)}
                      </span>
                      <div className='flex items-baseline gap-1'>
                        <span className='text-xl font-bold text-cyan-300 font-mono'>
                          {value}
                        </span>
                        <span className='text-xs text-slate-500 font-mono'>
                          / {value <= 10 ? '10' : '100'}
                        </span>
                      </div>
                    </div>
                  ))}

                  {booleans.map(({ key, value }) => (
                    <div
                      key={key}
                      className='bg-[#0d0e15] border border-slate-800/80 p-3.5 rounded-2xl'
                    >
                      <span className='text-xs font-medium text-slate-400 block mb-1 truncate'>
                        {formatKeyTitle(key)}
                      </span>
                      <div className='flex items-center gap-1.5 mt-1'>
                        {value ? (
                          <>
                            <CheckCircle2 className='w-4 h-4 text-emerald-400 flex-shrink-0' />
                            <span className='text-xs font-semibold text-emerald-400'>
                              Cumplido
                            </span>
                          </>
                        ) : (
                          <>
                            <XCircle className='w-4 h-4 text-rose-400 flex-shrink-0' />
                            <span className='text-xs font-semibold text-rose-400'>
                              No cumplido
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Chips informativos */}
              {chips.length > 0 && (
                <div className='bg-[#0d0e15] border border-slate-800/80 rounded-2xl p-4 flex flex-wrap items-center gap-3'>
                  {chips.map(({ key, text }) => (
                    <div
                      key={key}
                      className='flex items-center gap-2 bg-[#14161f] border border-slate-800 px-3 py-1.5 rounded-xl'
                    >
                      <Tag className='w-3.5 h-3.5 text-cyan-400 flex-shrink-0' />
                      <span className='text-xs font-medium text-slate-400'>
                        {formatKeyTitle(key)}:
                      </span>
                      <span className='text-xs font-semibold text-cyan-300'>
                        {text}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Resumen */}
              {summaries.map(({ key, text }) => (
                <div
                  key={key}
                  className='bg-[#0d0e15] border border-slate-800/80 rounded-2xl p-4 space-y-1.5'
                >
                  <span className='text-xs font-semibold text-slate-300 flex items-center gap-2'>
                    <FileText className='w-4 h-4 text-cyan-400' />
                    {formatKeyTitle(key)}
                  </span>
                  <p className='text-xs sm:text-sm text-slate-300 leading-relaxed font-normal'>
                    {text}
                  </p>
                </div>
              ))}

              {/* Listas estructuradas */}
              {lists.length > 0 && (
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  {lists.map(({ key, items }) => {
                    const isNegative =
                      /improv|error|fall|oportunid|debilid/i.test(key)
                    return (
                      <div
                        key={key}
                        className={`bg-[#0d0e15] border rounded-2xl p-4 flex flex-col ${
                          isNegative
                            ? 'border-amber-900/30 bg-amber-950/5'
                            : 'border-slate-800/80'
                        }`}
                      >
                        <span className='text-xs font-semibold text-white mb-3 flex items-center gap-2'>
                          {isNegative ? (
                            <AlertTriangle className='w-4 h-4 text-amber-400 flex-shrink-0' />
                          ) : (
                            <ListChecks className='w-4 h-4 text-cyan-400 flex-shrink-0' />
                          )}
                          <span>{formatKeyTitle(key)}</span>
                        </span>

                        {items.length === 0 ? (
                          <p className='text-xs text-slate-500 italic'>
                            No se registraron elementos.
                          </p>
                        ) : (
                          <ul className='space-y-2 text-xs text-slate-300 flex-1'>
                            {items.map((item, idx) => (
                              <li key={idx} className='flex items-start gap-2'>
                                <span
                                  className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                                    isNegative ? 'bg-amber-400' : 'bg-cyan-400'
                                  }`}
                                />
                                <span className='leading-relaxed'>{item}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Transcripción interactiva tipo chat */}
              {dialogueMessages.length > 0 && (
                <div className='bg-[#0d0e15] border border-slate-800/80 rounded-2xl p-4 sm:p-5 space-y-3'>
                  <div className='flex items-center justify-between border-b border-slate-800/60 pb-3'>
                    <span className='text-xs font-semibold text-slate-300 flex items-center gap-2'>
                      <MessageSquare className='w-4 h-4 text-cyan-400' />
                      Transcripción del diálogo
                    </span>
                    <span className='text-[11px] text-slate-500'>
                      {dialogueMessages.length} intervenciones
                    </span>
                  </div>

                  <div className='max-h-80 overflow-y-auto space-y-3 pr-1 pt-1'>
                    {dialogueMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${
                          msg.isAgent ? 'items-start' : 'items-end'
                        }`}
                      >
                        <div className='flex items-center gap-1.5 mb-1 px-1'>
                          {msg.isAgent ? (
                            <Headphones className='w-3 h-3 text-cyan-400' />
                          ) : (
                            <User className='w-3 h-3 text-purple-400' />
                          )}
                          <span
                            className={`text-[11px] font-medium ${
                              msg.isAgent ? 'text-cyan-300' : 'text-purple-300'
                            }`}
                          >
                            {msg.speaker}
                          </span>
                        </div>

                        <div
                          className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                            msg.isAgent
                              ? 'bg-[#141824] text-slate-200 border border-cyan-500/20 rounded-tl-sm'
                              : 'bg-[#1a162b] text-slate-200 border border-purple-500/20 rounded-tr-sm'
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default AuditDetailModal
