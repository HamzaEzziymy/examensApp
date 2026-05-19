
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { Head, usePage } from '@inertiajs/react'
import React, { useState, useMemo } from 'react'
import * as XLSX from 'xlsx'
import Header from '../Header'

// ── Capacity bar ──────────────────────────────────────────────────────────
function CapBar({ used, cap }) {
  if (!cap) return <span className="text-xs text-gray-400">{used} etud. / cap: —</span>
  const pct = Math.min(100, Math.round((used / cap) * 100))
  const over = used > cap
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-0.5">
        <span className={over ? 'text-red-600 font-bold' : 'text-gray-600 dark:text-gray-300'}>{used} / {cap}</span>
        <span className={over ? 'text-red-600 font-bold' : pct > 85 ? 'text-amber-600' : 'text-green-600'}>{pct}%</span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
        <div className={'h-full rounded-full transition-all ' + (over ? 'bg-red-500' : pct > 85 ? 'bg-amber-500' : 'bg-green-500')}
          style={{ width: Math.min(100, pct) + '%' }} />
      </div>
      {over && <p className="text-xs text-red-600 font-medium mt-0.5">Depassement — ajoutez une salle</p>}
    </div>
  )
}

const TYPE_COLORS = {
  Normal: 'bg-green-100 text-green-800', Credit: 'bg-blue-100 text-blue-800',
  Anticipe: 'bg-orange-100 text-orange-800', Capitalisation: 'bg-purple-100 text-purple-800',
}

export default function Index({ niveaux = [], sections = [], semestres = [], salles = [] }) {
  const { auth } = usePage().props
  const userFiliere = auth.user_filiere_annee?.id_filiere || 'all'
  const userAnnee   = auth.user_filiere_annee?.id_annee   || 'all'

  // Step 1
  const [filterSection,  setFilterSection]  = useState('')
  const [filterNiveau,   setFilterNiveau]   = useState('')
  const [filterSemestre, setFilterSemestre] = useState('')
  const [loading, setLoading] = useState(false)
  const [modules, setModules] = useState([])
  const [rows,    setRows]    = useState([])
  const [fetched, setFetched] = useState(false)

  // Step 2: module → [{ id_salle, salle }]  (ordered list of salles per module)
  const [moduleSalles, setModuleSalles] = useState({})  // { module_id: [salle, ...] }
  const [manualCaps,   setManualCaps]   = useState({})  // { "moduleId_salleId": number }
  const [activeModuleId, setActiveModuleId] = useState(null)

  // Step 3
  const [sortField, setSortField] = useState('nom')
  const [sortDir,   setSortDir]   = useState('asc')
  const [filename,  setFilename]  = useState('liste_etudiants')
  const [globalAnonymatStart, setGlobalAnonymatStart] = useState(1)

  const filteredSections = useMemo(() =>
    userFiliere === 'all' ? sections : sections.filter(s => String(s.id_filiere) === String(userFiliere))
  , [sections, userFiliere])

  const filteredSemestres = useMemo(() =>
    filterNiveau ? semestres.filter(s => String(s.id_niveau) === String(filterNiveau)) : semestres
  , [semestres, filterNiveau])

  const sortedRows = useMemo(() => {
    if (!rows.length) return []
    return [...rows].sort((a, b) => {
      const av = String(a[sortField] ?? '').toLowerCase()
      const bv = String(b[sortField] ?? '').toLowerCase()
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    })
  }, [rows, sortField, sortDir])

  const studentsByModule = useMemo(() => {
    const map = {}
    modules.forEach(m => { map[m.id] = sortedRows.filter(r => r['module_' + m.id]) })
    return map
  }, [modules, sortedRows])

  // For each module, split students across its assigned salles proportionally
  const moduleDistribution = useMemo(() => {
    const result = {}
    modules.forEach(m => {
      const students = studentsByModule[m.id] || []
      const assignedSalles = moduleSalles[m.id] || []
      if (!assignedSalles.length) {
        result[m.id] = []
        return
      }
      const caps = assignedSalles.map(s => {
        const key = m.id + '_' + s.id_salle
        return manualCaps[key] !== undefined ? parseInt(manualCaps[key]) || 0 : (s.capacite_examens || s.capacite || 0)
      })
      const totalCap = caps.reduce((a, b) => a + b, 0)
      let offset = 0
      result[m.id] = assignedSalles.map((salle, i) => {
        const n = i === assignedSalles.length - 1
          ? students.length - offset
          : totalCap > 0 ? Math.round((caps[i] / totalCap) * students.length) : Math.ceil(students.length / assignedSalles.length)
        const slice = students.slice(offset, offset + n)
        offset += n
        return { salle, students: slice, count: n, cap: caps[i], over: caps[i] > 0 && n > caps[i] }
      })
    })
    return result
  }, [modules, moduleSalles, studentsByModule])

  // Aggregate per salle: collect all students assigned to each salle
  const salleDistribution = useMemo(() => {
    const map = {}  // { id_salle: { salle, students: Map<cne,row>, modules: [] } }
    modules.forEach(m => {
      ;(moduleDistribution[m.id] || []).forEach(({ salle, students }) => {
        if (!map[salle.id_salle]) map[salle.id_salle] = { salle, students: new Map(), modules: [] }
        if (!map[salle.id_salle].modules.find(x => x.id === m.id)) map[salle.id_salle].modules.push(m)
        students.forEach(r => map[salle.id_salle].students.set(r.cne, r))
      })
    })
    return Object.values(map).map(d => ({
      ...d,
      students: [...d.students.values()].sort((a, b) => a.nom.localeCompare(b.nom)),
      count: d.students.size,
      cap: d.salle.capacite_examens || d.salle.capacite || 0,
    }))
  }, [modules, moduleDistribution])

  const hasOver = modules.some(m =>
    (moduleDistribution[m.id] || []).some(d => d.over)
  )
  const allAssigned = modules.every(m => (moduleSalles[m.id] || []).length > 0)
  const canExport = fetched && modules.length > 0 && allAssigned && !hasOver

  // Global anonymat: all students across all salles in order, one continuous sequence
  const totalStudents = salleDistribution.reduce((s, d) => s + d.count, 0)
  const globalAnonymats = useMemo(() => {
    const map = {}
    const start = parseInt(globalAnonymatStart) || 1
    let cur = start
    salleDistribution.forEach(d => {
      d.students.forEach(r => {
        map[r.cne] = cur++
      })
    })
    return map
  }, [salleDistribution, globalAnonymatStart])

  const fetchData = async () => {
    if (!filterNiveau) return
    setLoading(true); setFetched(false); setModuleSalles({}); setManualCaps({}); setActiveModuleId(null); setGlobalAnonymatStart(1)
    try {
      const params = new URLSearchParams({ id_niveau: filterNiveau })
      if (userAnnee !== 'all') params.append('id_annee', userAnnee)
      if (filterSection)       params.append('id_section', filterSection)
      if (filterSemestre)      params.append('id_semestre', filterSemestre)
      const res  = await fetch(route('documents.liste.data') + '?' + params.toString(), {
        headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
      })
      const data = await res.json()
      setModules(data.modules || [])
      setRows(data.rows || [])
      setFetched(true)
    } catch { setModules([]); setRows([]) }
    finally  { setLoading(false) }
  }

  const addSalleToModule = (moduleId, salle) => {
    setModuleSalles(prev => {
      const cur = prev[moduleId] || []
      if (cur.find(s => s.id_salle === salle.id_salle)) return prev
      return { ...prev, [moduleId]: [...cur, salle] }
    })
  }

  const removeSalleFromModule = (moduleId, salleId) => {
    setModuleSalles(prev => ({
      ...prev,
      [moduleId]: (prev[moduleId] || []).filter(s => s.id_salle !== salleId)
    }))
  }

  const handleExport = () => {
    if (!canExport) return
    const wb = XLSX.utils.book_new()

    // One sheet per salle
    salleDistribution.forEach(({ salle, students, modules: salleMods }) => {
      const headers = ['N', 'Anonymat', 'CNE', 'Nom et Prenom', ...salleMods.map(m => m.nom)]
      const data = students.map((r, i) => [
        i + 1, globalAnonymats[r.cne] ?? '', r.cne, r.nom + ' ' + r.prenom,
        ...salleMods.map(m => r['module_' + m.id] || '')
      ])
      const ws = XLSX.utils.aoa_to_sheet([headers, ...data])
      ws['!cols'] = [{ wch: 5 }, { wch: 10 }, { wch: 15 }, { wch: 30 }, ...salleMods.map(() => ({ wch: 18 }))]
      ws['!freeze'] = { xSplit: 4, ySplit: 1 }
      XLSX.utils.book_append_sheet(wb, ws, (salle.nom_salle || 'Salle').slice(0, 31))
    })

    XLSX.writeFile(wb, (filename || 'liste') + '_' + new Date().toISOString().slice(0, 10) + '.xlsx')
  }

  const sc = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500'

  return (
    <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">Documents</h2>}>
      <Head title="Liste Etudiants" />
      <Header />
      <div className="p-4 space-y-5">

        {/* ── Step 1 ── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">1. Charger les etudiants</h2>
            <div className="flex gap-2 text-xs">
              {userFiliere !== 'all' && <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full">Filiere active</span>}
              {userAnnee !== 'all' && <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full">Annee active</span>}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">Section</label>
              <select value={filterSection} onChange={e => { setFilterSection(e.target.value); setFetched(false) }} className={sc}>
                <option value="">Toutes</option>
                {filteredSections.map(s => <option key={s.id_section} value={s.id_section}>{s.nom_section}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">Niveau *</label>
              <select value={filterNiveau} onChange={e => { setFilterNiveau(e.target.value); setFilterSemestre(''); setFetched(false) }} className={sc}>
                <option value="">Selectionner</option>
                {niveaux.map(n => <option key={n.id_niveau} value={n.id_niveau}>{n.nom_niveau}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">Semestre</label>
              <select value={filterSemestre} onChange={e => { setFilterSemestre(e.target.value); setFetched(false) }}
                disabled={!filterNiveau} className={sc + ' disabled:opacity-40 disabled:cursor-not-allowed'}>
                <option value="">{filterNiveau ? 'Tous' : '— Choisir niveau —'}</option>
                {filteredSemestres.map(s => <option key={s.id_semestre} value={s.id_semestre}>{s.nom_semestre}</option>)}
              </select>
            </div>
          </div>
          <button onClick={fetchData} disabled={!filterNiveau || loading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">
            {loading ? 'Chargement...' : fetched ? 'Recharger (' + rows.length + ' etudiants - ' + modules.length + ' modules)' : 'Charger les etudiants'}
          </button>
        </div>

        {fetched && modules.length > 0 && (
          <>
            {/* ── Step 2: Module → Salle assignment ── */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
              <div className="mb-5">
                <h2 className="text-base font-bold text-gray-900 dark:text-white">2. Assigner les salles par module</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Pour chaque module, selectionnez une ou plusieurs salles. Si la capacite est insuffisante, ajoutez une deuxieme salle — les etudiants seront repartis automatiquement.
                </p>
              </div>

              <div className="space-y-3">
                {modules.map(m => {
                  const students = studentsByModule[m.id] || []
                  const assigned = moduleSalles[m.id] || []
                  const dist = moduleDistribution[m.id] || []
                  const totalCap = assigned.reduce((s, sl) => {
                    const key = m.id + '_' + sl.id_salle
                    const cap = manualCaps[key] !== undefined ? parseInt(manualCaps[key]) || 0 : (sl.capacite_examens || sl.capacite || 0)
                    return s + cap
                  }, 0)
                  const hasOverflow = dist.some(d => d.over)
                  const isOk = assigned.length > 0 && !hasOverflow
                  const isOpen = activeModuleId === m.id

                  return (
                    <div key={m.id} className={'rounded-xl border-2 transition-all ' +
                      (hasOverflow ? 'border-red-300' : isOk ? 'border-green-300' : isOpen ? 'border-blue-400' : 'border-gray-200 dark:border-gray-700')}>

                      {/* ── Clickable header ── */}
                      <button onClick={() => setActiveModuleId(isOpen ? null : m.id)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-xl transition-colors">
                        <div className="flex items-center gap-3">
                          {/* Status dot */}
                          <div className={'w-3 h-3 rounded-full flex-shrink-0 ' +
                            (hasOverflow ? 'bg-red-500' : isOk ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-500')} />
                          <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{m.nom}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {students.length} etudiant(s)
                              {assigned.length > 0 && (
                                <span className="ml-2">
                                  {assigned.map(sl => sl.nom_salle).join(', ')}
                                  {totalCap > 0 && <span className={students.length > totalCap ? ' text-red-600 font-medium' : ' text-green-600'}> ({totalCap} places)</span>}
                                </span>
                              )}
                              {!assigned.length && <span className="ml-2 text-amber-500">— Aucune salle assignee</span>}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isOk && <span className="text-green-600 text-xs font-medium">OK</span>}
                          {hasOverflow && <span className="text-red-600 text-xs font-medium">Depassement</span>}
                          <svg className={'w-4 h-4 text-gray-400 transition-transform ' + (isOpen ? 'rotate-180' : '')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>

                      {/* ── Expanded: salle assignment ── */}
                      {isOpen && (
                        <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 pt-3">
                          {/* Assigned salles */}
                          {assigned.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                              {dist.map(({ salle, count, cap, over }) => (
                                <div key={salle.id_salle} className={'flex items-center gap-2 px-3 py-2 rounded-lg border ' +
                                  (over ? 'border-red-400 bg-red-100 dark:bg-red-900/20' : 'border-blue-300 bg-blue-100 dark:bg-blue-900/20')}>
                                  <div>
                                    <p className="text-xs font-semibold text-gray-900 dark:text-white">{salle.nom_salle}</p>
                                    <p className={'text-xs ' + (over ? 'text-red-600 font-bold' : 'text-gray-500')}>{count} / {cap || '?'}</p>
                                  </div>
                                  <input
                                    type="number" min="1" max="9999"
                                    placeholder={String(salle.capacite_examens || salle.capacite || '')}
                                    value={manualCaps[m.id + '_' + salle.id_salle] ?? ''}
                                    onChange={e => setManualCaps(prev => ({ ...prev, [m.id + '_' + salle.id_salle]: e.target.value }))}
                                    className="w-16 px-1.5 py-1 text-xs border border-gray-300 dark:border-gray-500 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500"
                                    title="Capacite manuelle"
                                  />
                                  <button onClick={() => removeSalleFromModule(m.id, salle.id_salle)}
                                    className="text-gray-400 hover:text-red-500">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Add salle */}
                          <div className="flex items-center gap-2">
                            <select
                              defaultValue=""
                              onChange={e => {
                                if (!e.target.value) return
                                const salle = salles.find(s => String(s.id_salle) === e.target.value)
                                if (salle) addSalleToModule(m.id, salle)
                                e.target.value = ''
                              }}
                              className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500">
                              <option value="">+ Ajouter une salle...</option>
                              {salles
                                .filter(s => !assigned.find(a => a.id_salle === s.id_salle))
                                .map(s => (
                                  <option key={s.id_salle} value={s.id_salle}>
                                    {s.nom_salle} (cap: {s.capacite_examens || s.capacite || '—'})
                                  </option>
                                ))}
                            </select>
                            {hasOverflow && <span className="text-xs text-red-600 whitespace-nowrap">Capacite insuffisante</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── Step 3: Export ── */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 flex flex-wrap items-center gap-4">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap">3. Exporter</h2>
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Trier</label>
                <select value={sortField} onChange={e => setSortField(e.target.value)} className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                  <option value="nom">Nom</option>
                  <option value="prenom">Prenom</option>
                  <option value="cne">CNE</option>
                </select>
                <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
                  <button onClick={() => setSortDir('asc')} className={'px-2 py-1.5 text-xs font-medium ' + (sortDir === 'asc' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300')}>ASC</button>
                  <button onClick={() => setSortDir('desc')} className={'px-2 py-1.5 text-xs font-medium ' + (sortDir === 'desc' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300')}>DESC</button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="text" value={filename} onChange={e => setFilename(e.target.value)} placeholder="nom_fichier"
                  className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 w-40" />
                <span className="text-xs text-gray-400">.xlsx</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">Anonymat debut</label>
                <input type="number" min="1" value={globalAnonymatStart}
                  onChange={e => setGlobalAnonymatStart(e.target.value)}
                  className="w-20 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500" />
                {totalStudents > 0 && (
                  <span className="text-xs text-gray-400">
                    {parseInt(globalAnonymatStart) || 1} — {(parseInt(globalAnonymatStart) || 1) + totalStudents - 1}
                  </span>
                )}
              </div>
              <div className="ml-auto flex items-center gap-3">
                {!allAssigned && <span className="text-xs text-amber-600">Assignez toutes les salles</span>}
                {hasOver && <span className="text-xs text-red-600">Corrigez les depassements</span>}
                <button onClick={handleExport} disabled={!canExport}
                  className={'flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-colors ' +
                    (canExport ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed')}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Exporter ({salleDistribution.length} salle(s))
                </button>
              </div>
            </div>

            {/* ── Preview per salle ── */}
            {salleDistribution.map((d, di) => {
              return (
              <div key={di} className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
                <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">{d.salle.nom_salle}
                      <span className="ml-2 text-xs font-normal text-gray-500">({d.count} etudiant(s) / cap: {d.cap || '—'})</span>
                    </h3>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {d.modules.map(m => <span key={m.id} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">{m.nom}</span>)}
                    </div>
                  </div>
                  {d.cap > 0 && <div className="w-28"><CapBar used={d.count} cap={d.cap} /></div>}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400 uppercase w-8">#</th>
                        <th className="px-3 py-2 text-center font-medium text-amber-600 dark:text-amber-400 uppercase whitespace-nowrap bg-amber-50 dark:bg-amber-900/20">Anonymat</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400 uppercase whitespace-nowrap">CNE</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400 uppercase whitespace-nowrap">Nom et Prenom</th>
                        {d.modules.map(m => (
                          <th key={m.id} className="px-3 py-2 text-center font-medium text-gray-500 dark:text-gray-400 uppercase whitespace-nowrap" title={m.nom}>
                            {m.nom.length > 14 ? m.nom.slice(0, 14) + '...' : m.nom}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {d.students.slice(0, 20).map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-3 py-1.5 text-gray-400">{i + 1}</td>
                          <td className="px-3 py-1.5 text-center font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/10 whitespace-nowrap">{globalAnonymats[row.cne] ?? '—'}</td>
                          <td className="px-3 py-1.5 font-mono text-gray-900 dark:text-gray-100 whitespace-nowrap">{row.cne}</td>
                          <td className="px-3 py-1.5 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">{row.nom} {row.prenom}</td>
                          {d.modules.map(m => {
                            const type = row['module_' + m.id] || ''
                            return (
                              <td key={m.id} className="px-3 py-1.5 text-center">
                                {type ? <span className={'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ' + (TYPE_COLORS[type] || 'bg-gray-100 text-gray-600')}>{type === 'Capitalisation' ? 'Cap.' : type === 'Anticipe' ? 'Ant.' : type}</span>
                                      : <span className="text-gray-200 dark:text-gray-700">-</span>}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {d.students.length > 20 && (
                  <div className="px-6 py-2 text-xs text-gray-400 border-t border-gray-200 dark:border-gray-700">
                    ... et {d.students.length - 20} autres (toutes incluses dans l'export)
                  </div>
                )}
              </div>
              )
            })}
          </>
        )}

        {!fetched && !loading && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-12 text-center">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-400 dark:text-gray-500">Selectionnez un niveau et cliquez sur "Charger les etudiants"</p>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  )
}
