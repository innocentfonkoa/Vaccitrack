import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend
} from 'recharts'
import type { DashboardUser } from '../data/dashboardBackend'
import { getSubmissionsForDashboard, computeDashboardStats, dashboardSignOut } from '../data/dashboardBackend'
import type { TallySubmission } from '../types'

const GREEN = '#1a6b3c'
const GREEN_LIGHT = '#4caf50'
const GREEN_PALE = '#e8f5e9'
const GREY = '#b0bec5'
const ORANGE = '#f57c00'
const RED = '#d32f2f'

const AGE_COLORS = ['#1a6b3c', '#4caf50', '#81c784', '#a5d6a7', '#c8e6c9']
const CAMPAIGNS = [
  { id: 'measles-2024', name: '2024 Measles Campaign' },
  { id: 'polio-2026', name: '2026 Polio Campaign' }
]

interface Props {
  user: DashboardUser
}

function KPICard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 10, padding: '20px 22px',
      boxShadow: '0 1px 6px rgba(0,0,0,0.07)', flex: 1, minWidth: 140
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: accent ?? '#111', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#aaa', marginTop: 6 }}>{sub}</div>}
    </div>
  )
}

function SectionTitle({ children }: { children: string }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 }}>
      {children}
    </div>
  )
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function DashboardScreen({ user }: Props) {
  const [campaignId, setCampaignId] = useState('measles-2024')
  const [submissions, setSubmissions] = useState<TallySubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [lgaFilter, setLgaFilter] = useState<string>('all')
  const [lastUpdated, setLastUpdated] = useState<string>('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getSubmissionsForDashboard(user, campaignId)
      setSubmissions(data)
      setLastUpdated(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }))
    } catch (e) {
      console.error('Dashboard load error:', e)
    } finally {
      setLoading(false)
    }
  }, [user, campaignId])

  useEffect(() => { load() }, [load])

  // Auto-refresh every 2 minutes
  useEffect(() => {
    const interval = setInterval(load, 2 * 60 * 1000)
    return () => clearInterval(interval)
  }, [load])

  const stats = computeDashboardStats(submissions)

  // Filter submissions by LGA if state staff has selected one
  const filteredSubs = lgaFilter === 'all'
    ? submissions
    : submissions.filter(s => s.lga === lgaFilter)

  const filteredStats = computeDashboardStats(filteredSubs)

  // All LGAs available (for state staff filter)
  const allLGAs = Array.from(new Set(submissions.map(s => s.lga).filter(Boolean))) as string[]

  // Flagged submissions
  const flagged = filteredSubs.filter(s =>
    s.extraction?.confidence === 'low' ||
    (s.extraction?.lowConfidenceFields && s.extraction.lowConfidenceFields.length > 0)
  )

  // Chart data
  const lgaChartData = Object.entries(filteredStats.byLGA)
    .map(([lga, total]) => ({ lga, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)

  const settlementChartData = Object.entries(filteredStats.bySettlement)
    .map(([name, vaccinated]) => ({ name, vaccinated, target: Math.round(vaccinated * 1.3) }))
    .sort((a, b) => b.vaccinated - a.vaccinated)
    .slice(0, 8)

  const ageChartData = [
    { name: '0-dose 9–11m', value: filteredStats.ageBreakdown.zeroDose9to11 },
    { name: '0-dose 12–23m', value: filteredStats.ageBreakdown.zeroDose12to23 },
    { name: 'Other 9–11m', value: filteredStats.ageBreakdown.otherDose9to11 },
    { name: 'Other 12–23m', value: filteredStats.ageBreakdown.otherDose12to23 },
    { name: 'Other 24–59m', value: filteredStats.ageBreakdown.otherDose24to59 }
  ].filter(d => d.value > 0)

  const trendData = filteredStats.trend.map(t => ({ ...t, date: formatDate(t.date) }))

  const coverage = filteredStats.vaccinatedToday > 0
    ? Math.round((filteredStats.vaccinatedToday / (filteredStats.vaccinatedToday * 1.3)) * 100)
    : 0

  const reportingDeadline = '16:00'
  const now = new Date()
  const deadlineHour = parseInt(reportingDeadline)
  const minutesLeft = (deadlineHour * 60) - (now.getHours() * 60 + now.getMinutes())
  const deadlinePassed = minutesLeft < 0

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f0', fontFamily: "'Inter', sans-serif" }}>

      {/* Top bar */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #e8eae8',
        padding: '0 28px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: 56, position: 'sticky', top: 0, zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 7,
            background: GREEN, display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14
          }}>V</div>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#111' }}>VacciTrack</div>
          <div style={{ width: 1, height: 20, background: '#ddd', margin: '0 4px' }} />
          <select
            value={campaignId}
            onChange={e => setCampaignId(e.target.value)}
            style={{ border: 'none', background: 'transparent', fontWeight: 600, fontSize: 14, color: GREEN, cursor: 'pointer', outline: 'none' }}
          >
            {CAMPAIGNS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ fontSize: 12, color: '#888' }}>
            Last updated {lastUpdated || '—'}
            <button onClick={load} style={{ marginLeft: 8, background: 'none', border: 'none', color: GREEN, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              Refresh
            </button>
          </div>
          <div style={{
            fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20,
            background: deadlinePassed ? '#fff0f0' : '#fff8e1',
            color: deadlinePassed ? RED : ORANGE
          }}>
            {deadlinePassed ? 'Reporting closed' : `Deadline ${reportingDeadline} · ${Math.floor(minutesLeft / 60)}h ${minutesLeft % 60}m left`}
          </div>
          <div style={{ fontSize: 13, color: '#555' }}>
            {user.displayName}
            <span style={{ marginLeft: 6, fontSize: 11, background: GREEN_PALE, color: GREEN, padding: '2px 7px', borderRadius: 10, fontWeight: 600 }}>
              {user.role === 'state_staff' ? user.state : user.lga}
            </span>
          </div>
          <button
            onClick={dashboardSignOut}
            style={{ fontSize: 12, color: '#888', background: 'none', border: '1px solid #ddd', borderRadius: 6, padding: '5px 12px', cursor: 'pointer' }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Page header + filters */}
      <div style={{ padding: '24px 28px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111' }}>
              {CAMPAIGNS.find(c => c.id === campaignId)?.name ?? 'Campaign'} — Coverage
            </h1>
            <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
              {user.role === 'state_staff' ? `${user.state} State` : `${user.lga} LGA`} · Today {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          </div>

          {/* LGA filter (state staff only) */}
          {user.role === 'state_staff' && (
            <div style={{ display: 'flex', gap: 10 }}>
              <select
                value={lgaFilter}
                onChange={e => setLgaFilter(e.target.value)}
                style={{ border: '1.5px solid #ddd', borderRadius: 8, padding: '8px 14px', fontSize: 13, background: '#fff', cursor: 'pointer', outline: 'none' }}
              >
                <option value="all">All LGAs</option>
                {allLGAs.map(lga => <option key={lga} value={lga}>{lga}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: '#888', fontSize: 14 }}>
          Loading data…
        </div>
      ) : (
        <div style={{ padding: '0 28px 40px' }}>

          {/* KPI Cards */}
          <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
            <KPICard label="Vaccinated today" value={filteredStats.vaccinatedToday.toLocaleString()} sub="children" accent={GREEN} />
            <KPICard label="Coverage" value={`${coverage}%`} sub="vs yesterday" />
            <KPICard label="Sheets submitted" value={filteredStats.sheetsSubmitted} sub={`across ${Object.keys(filteredStats.byLGA).length} LGA${Object.keys(filteredStats.byLGA).length !== 1 ? 's' : ''}`} />
            <KPICard label="Flagged for review" value={filteredStats.flaggedForReview} sub="low confidence" accent={filteredStats.flaggedForReview > 0 ? ORANGE : '#111'} />
          </div>

          {/* Row: By LGA bar + Flagged */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, marginBottom: 16 }}>

            {/* Tally sheets by LGA */}
            <div style={{ background: '#fff', borderRadius: 10, padding: '20px 22px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>
              <SectionTitle>Tally sheets submitted today — by LGA</SectionTitle>
              {lgaChartData.length === 0 ? (
                <div style={{ color: '#aaa', fontSize: 13, padding: '30px 0' }}>No submissions yet today.</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={lgaChartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="lga" tick={{ fontSize: 11 }} width={100} />
                    <Tooltip formatter={(v) => [`${v} children`, 'Vaccinated']} />
                    <Bar dataKey="total" fill={GREEN} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Flagged for review */}
            <div style={{ background: '#fff', borderRadius: 10, padding: '20px 22px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', overflowY: 'auto', maxHeight: 300 }}>
              <SectionTitle>Flagged for review</SectionTitle>
              {flagged.length === 0 ? (
                <div style={{ color: '#aaa', fontSize: 13 }}>No flagged submissions.</div>
              ) : flagged.map(s => (
                <div key={s.id} style={{
                  borderLeft: `3px solid ${s.extraction?.confidence === 'low' ? RED : ORANGE}`,
                  paddingLeft: 10, marginBottom: 14
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{s.vaccinatorId}</div>
                  <div style={{ fontSize: 12, color: '#555' }}>{s.settlement ?? s.lga} · {s.extraction?.totalVaccinatedToday ?? '?'} children</div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                    Confidence: <span style={{ color: s.extraction?.confidence === 'low' ? RED : ORANGE, fontWeight: 600 }}>{s.extraction?.confidence}</span>
                    {s.extraction?.lowConfidenceFields?.length ? ` · ${s.extraction.lowConfidenceFields.join(', ')}` : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Row: Settlement bar + Age donut */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, marginBottom: 16 }}>

            {/* By settlement */}
            <div style={{ background: '#fff', borderRadius: 10, padding: '20px 22px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>
              <SectionTitle>Vaccinated today — by settlement</SectionTitle>
              {settlementChartData.length === 0 ? (
                <div style={{ color: '#aaa', fontSize: 13, padding: '30px 0' }}>No data yet.</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={settlementChartData} margin={{ left: 0, right: 10 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="vaccinated" name="Vaccinated" fill={GREEN} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="target" name="Target (est.)" fill={GREY} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Age breakdown donut */}
            <div style={{ background: '#fff', borderRadius: 10, padding: '20px 22px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>
              <SectionTitle>Age group breakdown (today)</SectionTitle>
              {ageChartData.length === 0 ? (
                <div style={{ color: '#aaa', fontSize: 13, padding: '30px 0' }}>No data yet.</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={ageChartData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={2}>
                        {ageChartData.map((_, i) => <Cell key={i} fill={AGE_COLORS[i % AGE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v, n) => [`${v} children`, n]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 4 }}>
                    {ageChartData.map((d, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: '#555' }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: AGE_COLORS[i % AGE_COLORS.length], flexShrink: 0 }} />
                        {d.name} — <strong>{d.value}</strong>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 5-day trend */}
          <div style={{ background: '#fff', borderRadius: 10, padding: '20px 22px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>
            <SectionTitle>5-day coverage trend</SectionTitle>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={trendData} margin={{ left: 0, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${v} children`, 'Vaccinated']} />
                <Line type="monotone" dataKey="total" stroke={GREEN} strokeWidth={2.5} dot={{ fill: GREEN, r: 4 }} activeDot={{ r: 6 }} name="Vaccinated" />
              </LineChart>
            </ResponsiveContainer>
          </div>

        </div>
      )}
    </div>
  )
}
