// src/components/KPICards.jsx
import React from 'react'
import { PhoneCall, Award, HeartHandshake, CheckCircle2 } from 'lucide-react'

const KPICards = ({ metrics, loading }) => {
  if (loading) {
    return (
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className='bg-[#14161f]/80 border border-slate-800 p-5 rounded-2xl animate-pulse h-32'
          />
        ))}
      </div>
    )
  }

  const {
    total_audits = 0,
    completed_audits = 0,
    average_overall_score = 0,
    average_empathy_score = 0,
    script_compliance_rate = 0,
  } = metrics || {}

  const getScoreTheme = (score) => {
    if (!score)
      return {
        text: 'text-slate-300',
        badge: 'bg-slate-800 border-slate-700 text-slate-300',
      }
    if (score >= 8.0)
      return {
        text: 'text-emerald-300',
        badge: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
      }
    if (score >= 6.0)
      return {
        text: 'text-amber-300',
        badge: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
      }
    return {
      text: 'text-rose-400',
      badge: 'bg-rose-500/15 border-rose-500/30 text-rose-400',
    }
  }

  const scoreTheme = getScoreTheme(average_overall_score)
  const empathyTheme = getScoreTheme(average_empathy_score)

  const cards = [
    {
      title: 'Auditorías Procesadas',
      value: completed_audits,
      subtitle: `de ${total_audits} grabaciones`,
      icon: PhoneCall,
      valColor: 'text-white',
      badgeBg: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300',
    },
    {
      title: 'Calificación Global',
      value: average_overall_score ? `${average_overall_score} / 10` : 'N/A',
      subtitle: 'Evaluación Kuali',
      icon: Award,
      valColor: scoreTheme.text,
      badgeBg: scoreTheme.badge,
    },
    {
      title: 'Índice de Empatía',
      value: average_empathy_score ? `${average_empathy_score} / 10` : 'N/A',
      subtitle: 'Cortesía y tono detectado',
      icon: HeartHandshake,
      valColor: empathyTheme.text,
      badgeBg: empathyTheme.badge,
    },
    {
      title: 'Cumplimiento de Guion',
      value: `${script_compliance_rate}%`,
      subtitle: 'Protocolo de saludo y cierre',
      icon: CheckCircle2,
      valColor:
        script_compliance_rate >= 70 ? 'text-emerald-300' : 'text-amber-300',
      badgeBg:
        script_compliance_rate >= 70
          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
          : 'bg-amber-500/15 border-amber-500/30 text-amber-300',
    },
  ]

  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
      {cards.map((card, idx) => {
        const Icon = card.icon
        return (
          <div
            key={idx}
            className='bg-[#14161f]/95 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-xl hover:border-slate-700 transition-all duration-200'
          >
            <div className='flex items-center justify-between mb-3'>
              <span className='text-xs font-semibold text-slate-300 uppercase tracking-wider'>
                {card.title}
              </span>
              <div className={`p-2 rounded-xl border ${card.badgeBg}`}>
                <Icon className='w-4 h-4' />
              </div>
            </div>
            <div
              className={`text-3xl font-bold tracking-tight ${card.valColor}`}
            >
              {card.value}
            </div>
            <p className='text-xs text-slate-300 font-medium mt-1.5'>
              {card.subtitle}
            </p>
          </div>
        )
      })}
    </div>
  )
}

export default KPICards
