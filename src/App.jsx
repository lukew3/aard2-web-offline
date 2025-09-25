import { useState, useEffect } from 'react'
import initSqlJs from 'sql.js'
import './App.css'

function App() {
  const [query, setQuery] = useState('')
  const [info, setInfo] = useState('Loading database...')
  const [error, setError] = useState('')
  const [definitions, setDefinitions] = useState([])
  const [wordTitle, setWordTitle] = useState('')
  const [db, setDb] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    loadDatabase()
  }, [])

  const loadDatabase = async () => {
    try {
      setInfo('Fetching wordnet.db...')
      setIsLoading(true)
      setProgress(0)

      const SQL = await initSqlJs({
        // Required to load the wasm binary asynchronously. Of course, you can host it wherever you want
        // You can omit locateFile completely when running in node
        locateFile: file => `https://sql.js.org/dist/${file}`
      });

      const res = await fetch('wordnetFull.db')
      if (!res.ok) throw new Error('Failed to fetch wordnet.db: ' + res.status)

      const contentLength = res.headers.get('content-length')
      const total = contentLength ? parseInt(contentLength, 10) : 0
      let loaded = 0

      const reader = res.body.getReader()
      const chunks = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        chunks.push(value)
        loaded += value.length
        const percent = total > 0 ? Math.min((loaded / total) * 100, 100) : Math.min(loaded / 1000000 * 10, 90)
        setProgress(percent)
      }

      const buffer = new Uint8Array(loaded)
      let offset = 0
      for (const chunk of chunks) {
        buffer.set(chunk, offset)
        offset += chunk.length
      }

      const database = new SQL.Database(buffer)
      setDb(database)
      setInfo('Database loaded.')
      setIsLoading(false)
    } catch (e) {
      setInfo('')
      setError('Error loading database: ' + e.message)
      setIsLoading(false)
      console.error(e)
    }
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!db || !query.trim()) return

    setError('')
    setDefinitions([])
    setWordTitle('')
    setInfo('Searching...')

    try {
      const tableName = 'words'
      const stmtExact = db.prepare(`SELECT word, pos, definition FROM "${tableName}" WHERE lower(word) = $w;`)

      const rows = []
      stmtExact.bind({$w: query.toLowerCase()})
      while(stmtExact.step()){
        rows.push(stmtExact.getAsObject())
      }
      stmtExact.reset()

      setDefinitions(rows)
      setWordTitle(query)
      setInfo('')
      if(rows.length === 0) setInfo('No definitions found')
    } catch(err){
      console.error(err)
      setError('Search error: ' + err.message)
      setInfo('')
    }
  }

  const escapeHtml = (str) => {
    if (str === null || str === undefined) return ''
    return String(str)
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, '&#039;')
  }

  return (
    <div className="container">
      <h1>Exact Word Dictionary (sql.js + wordnet)</h1>
      <p>Type an exact word and press Search. This page loads a generated <code>wordnet.db</code> using sql.js in the browser. After the database has been downloaded, you can continue to use the app offline. Developers: run it from a local or static server (e.g. <code>python -m http.server</code>).</p>
      
      <form onSubmit={handleSearch}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter exact word"
          required
        />
        <button type="submit" disabled={isLoading}>Search</button>
      </form>

      {isLoading && (
        <div className="progress-container">
          <div className="progress-bar">
            <div className="progress-fill" style={{width: `${progress}%`}}></div>
          </div>
          <div className="progress-text">{Math.round(progress)}%</div>
        </div>
      )}

      <div id="info">{info}</div>
      <div id="error" role="alert" aria-live="assertive">{error}</div>
      
      {wordTitle && <h2>{wordTitle}</h2>}
      <ol id="definition" aria-live="polite">
        {definitions.map((def, index) => (
          <li key={index} className="defP">
            <span><strong>{def.pos}.</strong> {escapeHtml(def.definition)}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

export default App