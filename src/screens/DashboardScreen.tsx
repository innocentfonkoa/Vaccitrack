import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
import type { DashboardUser } from '../data/dashboardBackend'
import { getSubmissionsForDashboard, computeDashboardStats, dashboardSignOut } from '../data/dashboardBackend'
import type { TallySubmission } from '../types'

const GREEN = '#1a6b3c'
const GREEN_PALE = '#e8f5e9'
const ORANGE = '#f57c00'
const RED = '#d32f2f'
const AGE_COLORS = ['#1a6b3c', '#4caf50', '#81c784', '#a5d6a7', '#c8e6c9']
const CAMPAIGNS = [
  { id: 'measles-2024', name: '2024 Measles Campaign' },
  { id: 'polio-2026', name: '2026 Polio Campaign' }
]

const KANO_HIERARCHY: Record<string, string[]> = {
  "Ajingi": ["Ajingi", "Balare", "Chula", "Dabin-Kanawa", "Dundun", "Gafasa", "Gurduba", "Kunkurawa", "Toranke", "Unguwar Bai"],
  "Albasu": ["Albasu Central", "Bataiya", "Daho", "Duja", "Fanda", "Faragai", "Gagarame", "Hungu", "Saya-Saya", "Tsangaya"],
  "Bagwai": ["Bagwai", "Dangada", "Gadanya", "Gogori", "Kiyawa", "Kwajale", "Rimin Dako", "Romo", "Sare-Sare", "Wuro Bagga"],
  "Bebeji": ["Anadariya", "Baguda", "Bebeji", "Damau", "Durmawa", "Gargai", "Gwarmai", "Kofa", "Kuki", "Rahama", "Ranka", "Rantan", "Tariwa", "Wak"],
  "Bichi": ["Badume", "Bichi", "Danzabuwa", "Fagolo", "Kau-Kau", "Kwamarawa", "Kyalli", "Muntsira", "Saye", "Waire", "Yallami"],
  "Bunkure": ["Barkum", "Bono", "Bunkure", "Chirin", "Gafan", "Gurjiya", "Gwamma", "Kulluwa", "Kumurya", "Sanda"],
  "Dala": ["Adakawa", "Bakin Ruwa", "Dala", "Dogon Nama", "Gobirawa", "Gwammaja", "Kabuwaya", "Kantudu", "Kofar Mazugal", "Kofar Ruwa", "Madigawa", "Yalwa"],
  "Dambatta": ["Ajumawa", "Dambatta East", "Dambatta West", "Fagwalawa", "Goron Maje", "Gwanda", "Gwarabjawa", "Kore", "Saidawa", "San San"],
  "Dawakin Kudu": ["Dabar Kwari", "Danbagina", "Dawaki", "Dawakiji", "Dosan", "Gano", "Gurjiya", "Jido", "Tanburawa", "Tsakuwa", "Unguwar Duniya", "Yan Barau", "Yankatsari", "Yargaya", "Zogarawa"],
  "Dawakin Tofa": ["Danguguwa", "Dawaki East", "Dawaki West", "Dawanau", "Ganduje", "Gargari", "Jalli", "Kwa", "Marke", "Tattarawa", "Tumfafi"],
  "Doguwa": ["Dadin Kowa", "Dogon Kawo", "Doguwa", "Falgore", "Maraku", "Riruwai", "Shere", "Tagwaye", "Unguwar Tsohuwa", "Zainabi"],
  "Fagge": ["Fagge A", "Fagge B", "Fagge C", "Fagge D1", "Fagge D2", "Kwachiri", "Rijiyar Lemo", "Sabon Gari East", "Sabon Gari West", "Yammata"],
  "Gabasawa": ["Gabasawa", "Garun Danga", "Joda", "Karmami", "Mekiya", "Tarauni", "Yautar Arewa", "Yautar Kudu", "Yumbu", "Zakirai", "Zugachi"],
  "Garko": ["Dal", "Garin Ali", "Garko", "Gurjiya", "Kafin Malamai", "Katumari", "Kwas", "Raba", "Sarina", "Zakarawa"],
  "Garun Malam": ["Chiromawa", "Dakasoye", "Dorawar Sallau", "Fankurun", "Garun Babba", "Garun Malam", "Jobawa", "Kadawa", "Makwaro", "Yada Kwari"],
  "Gaya": ["Balan", "Gamarya", "Gamoji", "Gaya North", "Gaya South", "Kademi", "Kazurawa", "Maimakawa", "Shagogo", "Wudilawa"],
  "Gezawa": ["Babawa", "Gawo", "Gezawa", "Jogana", "Ketawa", "Mesar Tudu", "Sararin Gezawa", "Tsamiya Babba", "Tumbau", "Wangara", "Zango"],
  "Gwale": ["Dandago", "Diso", "Dorayi", "Galadanchi", "Goron Dutse", "Gwale", "Gyaranya", "Kabuga", "Mandawari", "Sani Mai Nagge"],
  "Gwarzo": ["Getso", "Gwarzo", "Jama'a", "Kara", "Kutama", "Lakwaya", "Madadi", "Mainika", "Sabon Birni", "Unguwar Tudu"],
  "Kabo": ["Dugabau", "Durun", "Gammo", "Garo", "Godiya", "Gude", "Hawaden Galadima", "Kabo", "Kanwa", "Masanawa"],
  "Kano Municipal": ["Chedi", "Dan Agundi", "Gandu Albasa", "Jakara", "Kan Karofi", "Shahuchi", "Sharada", "She She", "Tudun Nufawa", "Tudun Wazurchi", "Yakasai", "Zaitawa", "Zango"],
  "Karaye": ["Daura", "Kafin Dabga", "Kurugu", "Kwanyawa", "Magajin Gari", "Magajin Hajji", "Tudun Kaya", "Turawa", "Yammedi", "Yola"],
  "Kibiya": ["Durba", "Fammar", "Fassi", "Kadigawa", "Kahu", "Kibiya 1", "Kibiya 2", "Nariya", "Tarai", "Unguwar Gai"],
  "Kiru": ["Baawa", "Badafi", "Bargoni", "Bauda", "Dangora", "Dansoshiya", "Dashi", "Galadimawa", "Kiru", "Kogo", "Maraku", "Tsaudawa", "Yako", "Yalwa", "Zuwo"],
  "Kumbotso": ["Chalawa", "Chiranchi", "Dan Maliki", "Danbare", "Garun Gawa", "Kumbotso", "Kureken Sani", "Mariri", "Naibawa", "Panshekara", "Unguwar Rimi"],
  "Kunchi": ["Bumai", "Garun Sheme", "Gwarmai", "Kasuwar Kuka", "Kunchi", "Matan Fada", "Ridawa", "Shamakawa", "Shuwaki", "Yandadi"],
  "Kura": ["Dalili", "Dan Hassan", "Dukawa", "Gundutse", "Karfi", "Kosawa", "Kurun Sumau", "Rigar Duka", "Sarkin Kura", "Tanawa"],
  "Madobi": ["Burji", "Cinkoso", "Galinja", "Gora", "Kafin Agur", "Kanwa", "Kauran Mata", "Kubaraci", "Kwankwaso", "Madobi", "Rikadawa", "Yakun"],
  "Makoda": ["Babbar Ruga", "Durma", "Jibga", "Kadan Dani", "Koguna", "Maitsidau", "Makoda", "Satame", "Tabo", "Tangaji", "Wailare"],
  "Minjibir": ["Azore", "Gandurwawa", "Kantama", "Kunya", "Kuru", "Kwarkiya", "Minjibir", "Sarbi", "Tsakiya", "Tsakuwa", "Wasai"],
  "Nassarawa": ["Dakata", "Gama", "Gawuna", "Giginyu", "Gwagwarwa", "Hotoro North", "Hotoro South", "Kaura Goje", "Kawaji", "Tudun Murtala", "Tudun Wada"],
  "Rano": ["Dawaki", "Lausu", "Madachi", "Rano", "Rurum Sabon Gari", "Rurum Tsohon Gari", "Saji", "Yalwa", "Zinyau", "Zurgu"],
  "Rimin Gado": ["Butu-Butu", "Dawakin Gulu", "Doka Dawa", "Dugurawa", "Gulu", "Jili", "Karofin Yashi", "Rimin Gado", "Sakara Tsa", "Tamawa", "Yalwan Danziyal", "Zango"],
  "Rogo": ["Beli", "Falgore", "Fulatan", "Gwangwan", "Jajaye", "Rogo Ruma", "Rogo Sabon Gari", "Ruwan Bago", "Zarewa", "Zoza"],
  "Shanono": ["Alajawa", "Dutsen Bakoshi", "Faruruwa", "Goron Dutse", "Kadamu", "Kokiya", "Leni", "Shakogi", "Shanono", "Tsaure"],
  "Sumaila": ["Gala", "Gani", "Garfa", "Gediya", "Kanawa", "Magami", "Masu", "Rimi", "Rumo", "Sitti", "Sumaila"],
  "Takai": ["Bagwaro", "Durbunde", "Fajewa", "Falali", "Farun Ruwa", "Kachako", "Karfi", "Kuka", "Takai", "Zuga"],
  "Tarauni": ["Babban Giji", "Darmanawa", "Daurawa", "Gyadi Gyadi Arewa", "Gyadi Gyadi Kudu", "Hotoro", "Tarauni", "Unguwa Uku Cikin Gari", "Unguwa Uku Kauyen Alu", "Unguwar Gano"],
  "Tofa": ["Dindere", "Doka", "Gajida", "Ginsawa", "Janguza", "Jauben Kudu", "Kwami", "Lambu", "Langel", "Tofa", "Unguwar Rimi", "Wangara", "Yalwa Karama", "Yanoko", "Yarimawa"],
  "Tsanyawa": ["Daddarawa", "Dunbulum", "Gozarki", "Gurun", "Kabagiwa", "Tatsan", "Tsanyawa", "Yanganau", "Yankamaye", "Zarogi"],
  "Tudun Wada": ["Baburi", "Burun-Burun", "Dalawa", "Jandutse", "Jita", "Karefa", "Nata-Ala", "Sabon Gari", "Shuwaki", "Tsohon Gari", "Yaryasa"],
  "Ungogo": ["Bachirawa", "Fanisau", "Gayawa", "Kadawa", "Karo", "Rangaza", "Rijiyar Zaki", "Tudun Fulani", "Ungogo", "Yada Kunya", "Zango"],
  "Warawa": ["Amarawa", "Danlasan", "Garin Dau", "Gogel", "Imawa", "Jemagu", "Jigawa", "Juma Galadima", "Katarkawa", "Madari", "Tamburawan Gabas", "Tanagar", "Warawa", "Yan Dala", "Yangizo"],
  "Wudil": ["Achika", "Dagumawa", "Dankaza", "Darki", "Indabo", "Kausani", "Lajawa", "Sabon Gari", "Utai", "Wudil"],
}

function todayStr() { return new Date().toISOString().slice(0, 10) }
function formatDateLabel(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}
function getLast30Days() {
  const days = []
  for (let i = 0; i < 30; i++) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const value = d.toISOString().slice(0, 10)
    days.push({ value, label: i === 0 ? 'Today' : i === 1 ? 'Yesterday' : formatDateLabel(value) })
  }
  return days
}

interface Props { user: DashboardUser }

function KPICard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: '20px 22px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', flex: 1, minWidth: 160 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 800, color: accent ?? '#111', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#aaa', marginTop: 6 }}>{sub}</div>}
    </div>
  )
}

function Card({ title, children, style }: { title: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: '20px 22px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', ...style }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#777', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  )
}

const sel: React.CSSProperties = {
  border: '1.5px solid #ddd', borderRadius: 8, padding: '8px 14px',
  fontSize: 13, background: '#fff', cursor: 'pointer', outline: 'none', fontFamily: 'inherit', minWidth: 130
}

export default function DashboardScreen({ user }: Props) {
  const [campaignId, setCampaignId] = useState('measles-2024')
  const [allSubmissions, setAllSubmissions] = useState<TallySubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState('')
  const [indexErrorUrl, setIndexErrorUrl] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(todayStr())
  const [lgaFilter, setLgaFilter] = useState('all')
  const [wardFilter, setWardFilter] = useState('all')
  const [settlementFilter, setSettlementFilter] = useState('all')

  // LGA list — all Kano LGAs from hardcoded hierarchy
  const allLGAs = Object.keys(KANO_HIERARCHY).sort()
  // Ward list — from selected LGA (or user's LGA for lga_staff)
  const lgaForWards = lgaFilter !== 'all' ? lgaFilter : (user.role === 'lga_staff' ? user.lga ?? '' : '')
  const wardsForLGA = lgaForWards ? (KANO_HIERARCHY[lgaForWards] ?? []).sort() : []
  // Settlement list — from actual submissions for the selected ward
  const settlementsForWard = wardFilter !== 'all'
    ? [...new Set(allSubmissions.filter(s => s.ward === wardFilter).map(s => s.settlement))].sort()
    : []

  const load = useCallback(async () => {
    setLoading(true)
    setIndexErrorUrl(null)
    try {
      const data = await getSubmissionsForDashboard(user, campaignId)
      setAllSubmissions(data)
      setLastUpdated(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }))
    } catch (e: any) {
      const url = e?.message?.match(/https:\/\/[^\s]+/)?.[0]
      if (url) setIndexErrorUrl(url)
      console.error('Dashboard load error:', e)
    } finally { setLoading(false) }
  }, [user, campaignId])

  useEffect(() => { load() }, [load])
  useEffect(() => { const i = setInterval(load, 120000); return () => clearInterval(i) }, [load])
  useEffect(() => { setWardFilter('all'); setSettlementFilter('all') }, [lgaFilter])
  useEffect(() => { setSettlementFilter('all') }, [wardFilter])

  const filtered = allSubmissions.filter(s => {
    const dateMatch = s.submittedAt?.slice(0, 10) === selectedDate
    const lgaMatch = user.role === 'lga_staff' ? s.lga === user.lga : lgaFilter === 'all' || s.lga === lgaFilter
    const wardMatch = wardFilter === 'all' || s.ward === wardFilter
    const settlementMatch = settlementFilter === 'all' || s.settlement === settlementFilter
    return dateMatch && lgaMatch && wardMatch && settlementMatch
  })

  const stats = computeDashboardStats(filtered)
  const flagged = filtered.filter(s => s.extraction?.confidence === 'low' || (s.extraction?.lowConfidenceFields?.length ?? 0) > 0)

  const showByLGA = user.role === 'state_staff' && lgaFilter === 'all'
  const showByWard = !showByLGA && wardFilter === 'all'
  const primaryChartData = (showByLGA
    ? Object.entries(stats.byLGA)
    : showByWard
      ? Object.entries(stats.byWard)
      : Object.entries(stats.bySettlement)
  ).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total).slice(0, 15)
  const primaryLabel = showByLGA ? 'by LGA' : showByWard ? 'by Ward' : 'by Settlement'

  const ageData = [
    { name: '0-dose 9–11m', value: stats.ageBreakdown.zeroDose9to11 },
    { name: '0-dose 12–23m', value: stats.ageBreakdown.zeroDose12to23 },
    { name: 'Other 9–11m', value: stats.ageBreakdown.otherDose9to11 },
    { name: 'Other 12–23m', value: stats.ageBreakdown.otherDose12to23 },
    { name: 'Other 24–59m', value: stats.ageBreakdown.otherDose24to59 }
  ].filter(d => d.value > 0)

  const now = new Date()
  const deadlineMin = 20 * 60 - (now.getHours() * 60 + now.getMinutes())
  const breadcrumb = [user.state, user.role === 'lga_staff' ? user.lga : lgaFilter !== 'all' ? lgaFilter : null, wardFilter !== 'all' ? wardFilter : null].filter(Boolean).join(' → ')

  return (
    <div className="dashboard-root" style={{ minHeight: '100vh', background: '#f0f4f0', fontFamily: "'Inter', -apple-system, sans-serif" }}>

      {/* ── Top bar ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7e5', position: 'sticky', top: 0, zIndex: 100 }}>
        {/* Row 1: branding + campaign */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 28px', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 15, flexShrink: 0 }}>V</div>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#111' }}>VacciTrack</span>
            <div style={{ width: 1, height: 20, background: '#ddd', margin: '0 4px' }} />
            <select value={campaignId} onChange={e => setCampaignId(e.target.value)}
              style={{ border: 'none', background: 'transparent', fontWeight: 600, fontSize: 14, color: GREEN, cursor: 'pointer', outline: 'none' }}>
              {CAMPAIGNS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 12, color: '#888' }}>
              Updated {lastUpdated || '—'}
              <button onClick={load} style={{ marginLeft: 6, background: 'none', border: 'none', color: GREEN, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>↻ Refresh</button>
            </span>
            <div style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20, background: deadlineMin < 0 ? '#fff0f0' : '#fff8e1', color: deadlineMin < 0 ? RED : ORANGE }}>
              {deadlineMin < 0 ? 'Reporting closed' : `Deadline 20:00 · ${Math.floor(deadlineMin / 60)}h ${deadlineMin % 60}m`}
            </div>
          </div>
        </div>
        {/* Row 2: user info */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '6px 28px', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#555' }}>{user.displayName}</span>
          <span style={{ fontSize: 11, background: GREEN_PALE, color: GREEN, padding: '2px 10px', borderRadius: 10, fontWeight: 600 }}>
            {user.role === 'state_staff' ? `${user.state} State` : `${user.lga} LGA`}
          </span>
          <button onClick={dashboardSignOut} style={{ fontSize: 12, color: '#666', background: 'none', border: '1px solid #ddd', borderRadius: 6, padding: '5px 12px', cursor: 'pointer' }}>Sign out</button>
        </div>
      </div>

      {/* Index error banner */}
      {indexErrorUrl && (
        <div style={{ background: '#fff3cd', borderBottom: '1px solid #ffc107', padding: '10px 28px', fontSize: 13, color: '#856404' }}>
          ⚠ A Firestore index is needed to load data.{' '}
          <a href={indexErrorUrl} target="_blank" rel="noreferrer" style={{ color: '#856404', fontWeight: 700, textDecoration: 'underline' }}>
            Click here to create it
          </a>{' '}— wait ~2 minutes then refresh.
        </div>
      )}

      {/* ── Page content ── */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 28px 48px' }}>

        {/* Page header + filters */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111' }}>
              {CAMPAIGNS.find(c => c.id === campaignId)?.name} — Coverage
            </h1>
            <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>{breadcrumb} · {formatDateLabel(selectedDate)}</div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={sel}>
              {getLast30Days().map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
            {user.role === 'state_staff' && (
              <select value={lgaFilter} onChange={e => setLgaFilter(e.target.value)} style={sel}>
                <option value="all">All LGAs</option>
                {allLGAs.map(lga => <option key={lga} value={lga}>{lga}</option>)}
              </select>
            )}
            {(user.role === 'lga_staff' || lgaFilter !== 'all') && wardsForLGA.length > 0 && (
              <select value={wardFilter} onChange={e => setWardFilter(e.target.value)} style={sel}>
                <option value="all">All Wards</option>
                {wardsForLGA.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            )}
            {wardFilter !== 'all' && settlementsForWard.length > 0 && (
              <select value={settlementFilter} onChange={e => setSettlementFilter(e.target.value)} style={sel}>
                <option value="all">All Settlements</option>
                {settlementsForWard.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: '#888', fontSize: 14 }}>Loading…</div>
        ) : (
          <>
            {/* KPI Cards */}
            <div style={{ display: 'flex', gap: 14, marginBottom: 22, flexWrap: 'wrap' }}>
              <KPICard label="Vaccinated" value={stats.vaccinatedToday.toLocaleString()} sub="children" accent={GREEN} />
              <KPICard label="Coverage" value={`${stats.vaccinatedToday > 0 ? Math.min(100, Math.round((stats.vaccinatedToday / (stats.vaccinatedToday * 1.3)) * 100)) : 0}%`} sub="vs target (est.)" />
              <KPICard label="Sheets submitted" value={stats.sheetsSubmitted} sub={primaryLabel} />
              <KPICard label="Flagged for review" value={stats.flaggedForReview} sub="low confidence" accent={stats.flaggedForReview > 0 ? ORANGE : '#111'} />
            </div>

            {filtered.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: 10, padding: 48, textAlign: 'center', color: '#aaa', fontSize: 14 }}>
                No submissions found for {formatDateLabel(selectedDate)}{lgaFilter !== 'all' ? ` · ${lgaFilter}` : ''}{wardFilter !== 'all' ? ` · ${wardFilter}` : ''}.
                {selectedDate === todayStr() ? ' Vaccinators submit throughout the day — check back later.' : ''}
              </div>
            ) : (
              <>
                {/* Charts — fixed 2-column grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <Card title={`Vaccinated today — ${primaryLabel}`}>
                    {primaryChartData.length === 0 ? <div style={{ color: '#aaa', fontSize: 13 }}>No data.</div> : (
                      <ResponsiveContainer width="100%" height={Math.max(200, primaryChartData.length * 30)}>
                        <BarChart data={primaryChartData} layout="vertical" margin={{ left: 8, right: 20, top: 4, bottom: 4 }}>
                          <XAxis type="number" tick={{ fontSize: 11 }} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                          <Tooltip formatter={(v) => [`${v} children`, 'Vaccinated']} />
                          <Bar dataKey="total" fill={GREEN} radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </Card>

                  <Card title="Flagged for review">
                    {flagged.length === 0 ? (
                      <div style={{ color: '#aaa', fontSize: 13 }}>No flagged submissions — all clear.</div>
                    ) : (
                      <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                        {flagged.map(s => (
                          <div key={s.id} style={{ borderLeft: `3px solid ${s.extraction?.confidence === 'low' ? RED : ORANGE}`, paddingLeft: 12, marginBottom: 14 }}>
                            <div style={{ fontSize: 13, fontWeight: 700 }}>Team {s.teamCode}</div>
                            <div style={{ fontSize: 12, color: '#555' }}>{s.lga} · {s.ward} · {s.settlement} · {s.extraction?.totalVaccinatedToday ?? '?'} children</div>
                            <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                              Confidence: <span style={{ color: s.extraction?.confidence === 'low' ? RED : ORANGE, fontWeight: 600 }}>{s.extraction?.confidence}</span>
                              {s.extraction?.lowConfidenceFields?.length ? ` · ${s.extraction.lowConfidenceFields.join(', ')}` : ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>

                  <Card title="Age group breakdown">
                    {ageData.length === 0 ? <div style={{ color: '#aaa', fontSize: 13 }}>No data.</div> : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                        <div style={{ flexShrink: 0 }}>
                          <ResponsiveContainer width={160} height={160}>
                            <PieChart>
                              <Pie data={ageData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} dataKey="value" paddingAngle={2}>
                                {ageData.map((_, i) => <Cell key={i} fill={AGE_COLORS[i % AGE_COLORS.length]} />)}
                              </Pie>
                              <Tooltip formatter={(v, n) => [`${v}`, n]} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                          {ageData.map((d, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#444' }}>
                              <div style={{ width: 12, height: 12, borderRadius: 3, background: AGE_COLORS[i % AGE_COLORS.length], flexShrink: 0 }} />
                              <span style={{ flex: 1 }}>{d.name}</span>
                              <strong>{d.value}</strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>

                  {wardFilter !== 'all' ? (
                    <Card title="Vaccinated — by settlement">
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={Object.entries(stats.bySettlement).map(([name, total]) => ({ name, total }))} margin={{ left: 0, right: 10 }}>
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="total" fill={GREEN} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </Card>
                  ) : (
                    <Card title="Submission summary">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, paddingBottom: 8, borderBottom: '1px solid #f0f0f0', fontWeight: 600, color: '#888' }}>
                          <span>{showByLGA ? 'LGA' : 'Ward'}</span>
                          <span>Children vaccinated</span>
                        </div>
                        {(showByLGA ? Object.entries(stats.byLGA) : Object.entries(stats.byWard))
                          .sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, total]) => (
                            <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                              <span style={{ color: '#555' }}>{name}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 80, height: 6, background: '#f0f0f0', borderRadius: 3, overflow: 'hidden' }}>
                                  <div style={{ width: `${Math.min(100, Math.round((total / stats.vaccinatedToday) * 100))}%`, height: '100%', background: GREEN, borderRadius: 3 }} />
                                </div>
                                <strong style={{ color: GREEN, minWidth: 32, textAlign: 'right' }}>{total}</strong>
                              </div>
                            </div>
                          ))}
                      </div>
                    </Card>
                  )}
                </div>

                {/* Submissions table */}
                <Card title={`All submissions — ${formatDateLabel(selectedDate)} (${filtered.length})`}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                          {['Team', 'Vaccinator', 'Phone', 'Recorder', 'LGA', 'Ward', 'Settlement', 'Male', 'Female', 'Total', 'Status', 'Time'].map(h => (
                            <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, color: '#888', fontWeight: 600, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((s, i) => (
                          <tr key={s.id} style={{ borderBottom: '1px solid #f5f5f5', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                            <td style={{ padding: '9px 12px', fontWeight: 600, whiteSpace: 'nowrap' }}>{s.teamCode}</td>
                            <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>{s.vaccinatorName ?? '—'}</td>
                            <td style={{ padding: '9px 12px', color: '#555', whiteSpace: 'nowrap' }}>{s.phone ?? '—'}</td>
                            <td style={{ padding: '9px 12px', color: '#555', whiteSpace: 'nowrap' }}>{s.recorderName ?? '—'}</td>
                            <td style={{ padding: '9px 12px', color: '#555' }}>{s.lga}</td>
                            <td style={{ padding: '9px 12px', color: '#555' }}>{s.ward}</td>
                            <td style={{ padding: '9px 12px', color: '#555', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.settlement}</td>
                            <td style={{ padding: '9px 12px' }}>{s.extraction?.totalRow?.male ?? '—'}</td>
                            <td style={{ padding: '9px 12px' }}>{s.extraction?.totalRow?.female ?? '—'}</td>
                            <td style={{ padding: '9px 12px', fontWeight: 700, color: GREEN }}>{s.extraction?.totalVaccinatedToday ?? '—'}</td>
                            <td style={{ padding: '9px 12px' }}>
                              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 600, background: s.status === 'synced' ? '#e8f5e9' : s.status === 'needs_review' ? '#fff8e1' : '#f5f5f5', color: s.status === 'synced' ? GREEN : s.status === 'needs_review' ? ORANGE : '#888' }}>
                                {s.status?.replace('_', ' ')}
                              </span>
                            </td>
                            <td style={{ padding: '9px 12px', color: '#888', fontSize: 12, whiteSpace: 'nowrap' }}>
                              {new Date(s.submittedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
