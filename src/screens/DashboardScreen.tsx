import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import type { DashboardUser } from '../data/dashboardBackend'
import { getSubmissionsForDashboard, computeDashboardStats, dashboardSignOut } from '../data/dashboardBackend'
import type { TallySubmission } from '../types'

const GREEN = '#1a6b3c'
const GREEN_PALE = '#e8f5e9'
const GREY = '#b0bec5'
const ORANGE = '#f57c00'
const RED = '#d32f2f'
const AGE_COLORS = ['#1a6b3c', '#4caf50', '#81c784', '#a5d6a7', '#c8e6c9']
const CAMPAIGNS = [
  { id: 'measles-2024', name: '2024 Measles Campaign' },
  { id: 'polio-2026', name: '2026 Polio Campaign' }
]

function todayStr() { return new Date().toISOString().slice(0, 10) }

function formatDateLabel(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short'
  })
}

function getLast30Days() {
  const days = []
  for (let i = 0; i < 30; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const value = d.toISOString().slice(0, 10)
    const label = i === 0 ? 'Today' : i === 1 ? 'Yesterday' : formatDateLabel(value)
    days.push({ value, label })
  }
  return days
}

interface Props { user: DashboardUser }

function KPICard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 10, padding: '18px 20px',
      boxShadow: '0 1px 6px rgba(0,0,0,0.07)', flex: 1, minWidth: 150
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: accent ?? '#111', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#aaa', marginTop: 5 }}>{sub}</div>}
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: '18px 20px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  )
}

const selectStyle: React.CSSProperties = {
  border: '1.5px solid #ddd', borderRadius: 8, padding: '7px 12px',
  fontSize: 13, background: '#fff', cursor: 'pointer', outline: 'none', fontFamily: 'inherit'
}

export default function DashboardScreen({ user }: Props) {
  const [campaignId, setCampaignId] = useState('measles-2024')
  const [allSubmissions, setAllSubmissions] = useState<TallySubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState('')

  // Filters
  const [selectedDate, setSelectedDate] = useState(todayStr())
  const [lgaFilter, setLgaFilter] = useState('all')
  const [wardFilter, setWardFilter] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getSubmissionsForDashboard(user, campaignId)
      setAllSubmissions(data)
      setLastUpdated(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }))
    } catch (e) { console.error('Dashboard load error:', e) }
    finally { setLoading(false) }
  }, [user, campaignId])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const interval = setInterval(load, 2 * 60 * 1000)
    return () => clearInterval(interval)
  }, [load])

  // Reset ward when LGA changes
  useEffect(() => { setWardFilter('all') }, [lgaFilter])

  // Derive available LGAs and wards from loaded data
  const allLGAs = Array.from(new Set(allSubmissions.map(s => s.lga).filter(Boolean))) as string[]
  const lgaForWards = lgaFilter !== 'all' ? lgaFilter : (user.role === 'lga_staff' ? user.lga : null)
  const allWards = Array.from(new Set(
    allSubmissions
      .filter(s => !lgaForWards || s.lga === lgaForWards)
      .map(s => s.ward).filter(Boolean)
  )) as string[]

  // Apply all filters
  const filtered = allSubmissions.filter(s => {
    const dateMatch = s.submittedAt?.slice(0, 10) === selectedDate
    const lgaMatch = user.role === 'lga_staff'
      ? s.lga === user.lga
      : lgaFilter === 'all' || s.lga === lgaFilter
    const wardMatch = wardFilter === 'all' || s.ward === wardFilter
    return dateMatch && lgaMatch && wardMatch
  })

  const stats = computeDashboardStats(filtered)
  const flagged = filtered.filter(s =>
    s.extraction?.confidence === 'low' ||
    (s.extraction?.lowConfidenceFields && s.extraction.lowConfidenceFields.length > 0)
  )

  // Determine what the primary breakdown chart shows:
  // State staff with no LGA selected → by LGA
  // State staff with LGA selected, or LGA staff → by Ward
  // Ward selected → by Settlement
  const showByLGA = user.role === 'state_staff' && lgaFilter === 'all'
  const showByWard = !showByLGA && wardFilter === 'all'
  const showBySettlement = wardFilter !== 'all'

  const primaryChartData = showByLGA
    ? Object.entries(stats.byLGA).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total).slice(0, 12)
    : showByWard
      ? Object.entries(stats.byWard).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total).slice(0, 12)
      : Object.entries(stats.bySettlement).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total).slice(0, 12)

  const primaryChartLabel = showByLGA ? 'by LGA' : showByWard ? 'by Ward' : 'by Settlement'

  const ageChartData = [
    { name: '0-dose 9–11m', value: stats.ageBreakdown.zeroDose9to11 },
    { name: '0-dose 12–23m', value: stats.ageBreakdown.zeroDose12to23 },
    { name: 'Other 9–11m', value: stats.ageBreakdown.otherDose9to11 },
    { name: 'Other 12–23m', value: stats.ageBreakdown.otherDose12to23 },
    { name: 'Other 24–59m', value: stats.ageBreakdown.otherDose24to59 }
  ].filter(d => d.value > 0)

  const now = new Date()
  const deadlineMinutes = 16 * 60 - (now.getHours() * 60 + now.getMinutes())
  const deadlinePassed = deadlineMinutes < 0
  const days = getLast30Days()

  // Breadcrumb showing current drill-down level
  const breadcrumb = [
    user.state,
    user.role === 'lga_staff' ? user.lga : lgaFilter !== 'all' ? lgaFilter : null,
    wardFilter !== 'all' ? wardFilter : null
  ].filter(Boolean).join(' → ')

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f0', fontFamily: "'Inter', sans-serif" }}>

      {/* Top bar */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #e8eae8',
        padding: '0 24px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: 54,
        position: 'sticky', top: 0, zIndex: 10, flexWrap: 'wrap', gap: 8
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6, background: GREEN,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: 13
          }}>V</div>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#111' }}>VacciTrack</span>
          <div style={{ width: 1, height: 18, background: '#ddd', margin: '0 4px' }} />
          <select value={campaignId} onChange={e => setCampaignId(e.target.value)}
            style={{ border: 'none', background: 'transparent', fontWeight: 600, fontSize: 13, color: GREEN, cursor: 'pointer', outline: 'none' }}>
            {CAMPAIGNS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#888' }}>
            Updated {lastUpdated || '—'}
            <button onClick={load} style={{ marginLeft: 6, background: 'none', border: 'none', color: GREEN, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Refresh</button>
          </span>
          <div style={{
            fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
            background: deadlinePassed ? '#fff0f0' : '#fff8e1',
            color: deadlinePassed ? RED : ORANGE
          }}>
            {deadlinePassed ? 'Reporting closed' : `Deadline 16:00 · ${Math.floor(deadlineMinutes / 60)}h ${deadlineMinutes % 60}m`}
          </div>
          <span style={{ fontSize: 13, color: '#555' }}>
            {user.displayName}
            <span style={{ marginLeft: 6, fontSize: 11, background: GREEN_PALE, color: GREEN, padding: '2px 7px', borderRadius: 10, fontWeight: 600 }}>
              {user.role === 'state_staff' ? `${user.state} State` : `${user.lga} LGA`}
            </span>
          </span>
          <button onClick={dashboardSignOut} style={{
            fontSize: 12, color: '#888', background: 'none',
            border: '1px solid #ddd', borderRadius: 6, padding: '4px 10px', cursor: 'pointer'
          }}>Sign out</button>
        </div>
      </div>

      {/* Page header + filter row */}
      <div style={{ padding: '20px 24px 0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#111' }}>
              {CAMPAIGNS.find(c => c.id === campaignId)?.name} — Coverage
            </h1>
            <div style={{ fontSize: 13, color: '#888', marginTop: 3 }}>
              {breadcrumb} · {formatDateLabel(selectedDate)}
            </div>
          </div>

          {/* Filter controls */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>

            {/* Date */}
            <select value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={selectStyle}>
              {days.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>

            {/* LGA filter — state staff only */}
            {user.role === 'state_staff' && (
              <select value={lgaFilter} onChange={e => setLgaFilter(e.target.value)} style={selectStyle}>
                <option value="all">All LGAs</option>
                {allLGAs.map(lga => <option key={lga} value={lga}>{lga}</option>)}
              </select>
            )}

            {/* Ward filter — always shown; for state staff only when an LGA is selected */}
            {(user.role === 'lga_staff' || lgaFilter !== 'all') && (
              <select value={wardFilter} onChange={e => setWardFilter(e.target.value)} style={selectStyle}>
                <option value="all">All Wards</option>
                {allWards.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: '#888', fontSize: 14 }}>Loading…</div>
      ) : (
        <div style={{ padding: '0 24px 40px' }}>

          {/* KPI Cards */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <KPICard label="Vaccinated" value={stats.vaccinatedToday.toLocaleString()} sub="children" accent={GREEN} />
            <KPICard label="Coverage" value={`${stats.vaccinatedToday > 0 ? Math.min(100, Math.round((stats.vaccinatedToday / (stats.vaccinatedToday * 1.3)) * 100)) : 0}%`} sub="vs target (est.)" />
            <KPICard label="Sheets submitted" value={stats.sheetsSubmitted} sub={primaryChartLabel} />
            <KPICard label="Flagged" value={stats.flaggedForReview} sub="needs review" accent={stats.flaggedForReview > 0 ? ORANGE : '#111'} />
          </div>

          {filtered.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 10, padding: 40, textAlign: 'center', color: '#aaa', fontSize: 14 }}>
              No submissions found for {formatDateLabel(selectedDate)}{lgaFilter !== 'all' ? ` · ${lgaFilter}` : ''}{wardFilter !== 'all' ? ` · ${wardFilter}` : ''}.
            </div>
          ) : (
            <>
              {/* Main charts grid — responsive 2 columns on desktop */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 16 }}>

                {/* Primary breakdown bar chart */}
                <SectionCard title={`Vaccinated today — ${primaryChartLabel}`}>
                  {primaryChartData.length === 0 ? (
                    <div style={{ color: '#aaa', fontSize: 13 }}>No data.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={primaryChartData} layout="vertical" margin={{ left: 8, right: 20 }}>
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                        <Tooltip formatter={(v) => [`${v} children`, 'Vaccinated']} />
                        <Bar dataKey="total" fill={GREEN} radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </SectionCard>

                {/* Flagged for review */}
                <SectionCard title="Flagged for review">
                  {flagged.length === 0 ? (
                    <div style={{ color: '#aaa', fontSize: 13 }}>No flagged submissions.</div>
                  ) : (
                    <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                      {flagged.map(s => (
                        <div key={s.id} style={{ borderLeft: `3px solid ${s.extraction?.confidence === 'low' ? RED : ORANGE}`, paddingLeft: 10, marginBottom: 12 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>Team {s.teamCode}</div>
                          <div style={{ fontSize: 12, color: '#555' }}>{s.ward} · {s.settlement} · {s.extraction?.totalVaccinatedToday ?? '?'} children</div>
                          <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                            Confidence: <span style={{ color: s.extraction?.confidence === 'low' ? RED : ORANGE, fontWeight: 600 }}>{s.extraction?.confidence}</span>
                            {s.extraction?.lowConfidenceFields?.length ? ` · ${s.extraction.lowConfidenceFields.join(', ')}` : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>

                {/* Age breakdown donut */}
                <SectionCard title="Age group breakdown">
                  {ageChartData.length === 0 ? (
                    <div style={{ color: '#aaa', fontSize: 13 }}>No data.</div>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                          <Pie data={ageChartData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={2}>
                            {ageChartData.map((_, i) => <Cell key={i} fill={AGE_COLORS[i % AGE_COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v, n) => [`${v}`, n]} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
                        {ageChartData.map((d, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#555' }}>
                            <div style={{ width: 10, height: 10, borderRadius: 2, background: AGE_COLORS[i % AGE_COLORS.length], flexShrink: 0 }} />
                            {d.name} — <strong>{d.value}</strong>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </SectionCard>

                {/* Settlement bar (shown when a ward is selected) */}
                {wardFilter !== 'all' && (
                  <SectionCard title="Vaccinated — by settlement">
                    {Object.keys(stats.bySettlement).length === 0 ? (
                      <div style={{ color: '#aaa', fontSize: 13 }}>No data.</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={Object.entries(stats.bySettlement).map(([name, total]) => ({ name, total }))} margin={{ left: 0, right: 10 }}>
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="total" name="Vaccinated" fill={GREEN} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </SectionCard>
                )}
              </div>

              {/* Submissions table */}
              <SectionCard title={`All submissions — ${formatDateLabel(selectedDate)}`}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                        {['Team', 'LGA', 'Ward', 'Settlement', 'Male', 'Female', 'Total', 'Confidence', 'Time'].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '6px 10px', fontSize: 11, color: '#888', fontWeight: 600, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(s => (
                        <tr key={s.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                          <td style={{ padding: '8px 10px', fontWeight: 600, whiteSpace: 'nowrap' }}>{s.teamCode}</td>
                          <td style={{ padding: '8px 10px', color: '#555' }}>{s.lga}</td>
                          <td style={{ padding: '8px 10px', color: '#555' }}>{s.ward}</td>
                          <td style={{ padding: '8px 10px', color: '#555' }}>{s.settlement}</td>
                          <td style={{ padding: '8px 10px' }}>{s.extraction?.totalRow?.male ?? '—'}</td>
                          <td style={{ padding: '8px 10px' }}>{s.extraction?.totalRow?.female ?? '—'}</td>
                          <td style={{ padding: '8px 10px', fontWeight: 700, color: GREEN }}>{s.extraction?.totalVaccinatedToday ?? '—'}</td>
                          <td style={{ padding: '8px 10px' }}>
                            <span style={{
                              fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 600,
                              background: s.extraction?.confidence === 'high' ? '#e8f5e9' : s.extraction?.confidence === 'medium' ? '#fff8e1' : '#fff0f0',
                              color: s.extraction?.confidence === 'high' ? GREEN : s.extraction?.confidence === 'medium' ? ORANGE : RED
                            }}>{s.extraction?.confidence}</span>
                          </td>
                          <td style={{ padding: '8px 10px', color: '#888', fontSize: 12, whiteSpace: 'nowrap' }}>
                            {new Date(s.submittedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            </>
          )}
        </div>
      )}
    </div>
  )
}
