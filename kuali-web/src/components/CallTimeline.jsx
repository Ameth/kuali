// src/components/CallTimeline.jsx
import React, { useEffect, useState } from 'react'
import {
  PhoneIncoming,
  PhoneOff,
  PhoneCall,
  PhoneForwarded,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { apiService } from '../services/api'

const CallTimeline = ({ uniqueid }) => {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uniqueid) return
    const fetchTrace = async () => {
      try {
        setLoading(true)
        const data = await apiService.getCallTrace(uniqueid)
        setEvents(data)
      } catch (err) {
        console.error('Error al cargar la traza de la llamada:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchTrace()
  }, [uniqueid])

  if (loading) {
    return (
      <div className='p-4 bg-[#0d0e15] border border-slate-800 rounded-xl animate-pulse'>
        <div className='h-4 bg-slate-800 rounded w-1/3 mb-2'></div>
        <div className='h-3 bg-slate-800/60 rounded w-1/2'></div>
      </div>
    )
  }

  if (!events || events.length === 0) {
    return (
      <div className='p-4 bg-[#0d0e15] border border-slate-800/80 rounded-xl text-slate-500 text-xs text-center'>
        No se registró trazabilidad previa en cola para esta llamada.
      </div>
    )
  }

  // Traducción técnica a lenguaje humano
  const formatEvent = (ev) => {
    const timeStr = new Date(ev.event_timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    const ringSeconds = Math.round((ev.ring_duration_ms || 0) / 1000)

    switch (ev.event_type) {
      case 'ENTERQUEUE':
        return {
          icon: PhoneIncoming,
          color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
          title: 'Ingreso a la cola de atención',
          desc: `La llamada entró a la cola ${ev.queue} y comenzó el tiempo de espera.`,
          time: timeStr,
        }
      case 'RINGNOANSWER':
        return {
          icon: Clock,
          color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
          title: 'Timbrado omitido (No contestó)',
          desc: `Timbró durante ${ringSeconds}s a ${ev.agent_name || 'un asesor'} sin obtener respuesta.`,
          time: timeStr,
        }
      case 'CONNECT':
        return {
          icon: CheckCircle2,
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
          title: 'Llamada atendida',
          desc: `${ev.agent_name || 'El asesor'} contestó tras ${ev.wait_time_seconds}s de espera acumulada.`,
          time: timeStr,
        }
      case 'COMPLETECALLER':
        return {
          icon: PhoneCall,
          color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
          title: 'Llamada finalizada por el cliente',
          desc: `Conversación finalizada con una duración neta de ${ev.talk_time_seconds}s.`,
          time: timeStr,
        }
      case 'COMPLETEAGENT':
        return {
          icon: PhoneCall,
          color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
          title: 'Llamada finalizada por el asesor',
          desc: `${ev.agent_name} colgó la llamada. Duración neta: ${ev.talk_time_seconds}s.`,
          time: timeStr,
        }
      case 'ABANDON':
        return {
          icon: PhoneOff,
          color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
          title: 'Llamada perdida (Abandono)',
          desc: `El cliente colgó tras esperar ${ev.wait_time_seconds}s en cola.`,
          time: timeStr,
        }
      case 'EXITWITHTIMEOUT':
        return {
          icon: AlertCircle,
          color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
          title: 'Desborde por tiempo de espera',
          desc: `La llamada superó el tiempo máximo configurado en la cola sin ser atendida.`,
          time: timeStr,
        }
      default:
        return {
          icon: PhoneForwarded,
          color: 'text-slate-400 bg-slate-800 border-slate-700',
          title: ev.event_type,
          desc: `Evento registrado en cola ${ev.queue}`,
          time: timeStr,
        }
    }
  }

  return (
    <div className='bg-[#0d0e15] border border-slate-800/80 rounded-2xl p-4'>
      <h4 className='text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2'>
        <Clock className='w-3.5 h-3.5 text-cyan-400' />
        <span>Trazabilidad de la llamada en cola</span>
      </h4>
      <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-[1px] before:bg-slate-800">
        {events.map((ev, idx) => {
          const info = formatEvent(ev)
          const Icon = info.icon
          return (
            <div key={idx} className='relative flex items-start gap-3'>
              <div
                className={`absolute -left-6 p-1 rounded-full border ${info.color}`}
              >
                <Icon className='w-3 h-3' />
              </div>
              <div className='flex-1'>
                <div className='flex items-center justify-between'>
                  <span className='text-xs font-medium text-slate-200'>
                    {info.title}
                  </span>
                  <span className='text-[12px] text-slate-500 font-mono'>
                    {info.time}
                  </span>
                </div>
                <p className='text-[11px] text-slate-400 mt-0.5'>{info.desc}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default CallTimeline
