import { useState, useEffect } from 'react'
import initSqlJs from 'sql.js'
import './App.css'

interface Definition {
  word: string
  pos: string
  definition: string
}

interface Database {
  prepare: (sql: string) => Statement
}

interface Statement {
  bind: (params: Record<string, any>) => void
  step: () => boolean
  getAsObject: () => Definition
  reset: () => void
}

function App() {
  const [query, setQuery] = useState<string>('')
  const [info, setInfo] = useState<string>('Loading database...')
  const [error, setError] = useState<string>('')
  const [definitions, setDefinitions] = useState<Definition[]>([])
  const [wordTitle, setWordTitle] = useState<string>('')
  const [db, setDb] = useState<Database | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [progress, setProgress] = useState<number>(0)

  useEffect(() => {
    loadDatabase()
  }, [])

  const loadDatabase = async (): Promise<void> => {
    try {
      setInfo('Fetching wordnet.db...')
      setIsLoading(true)
      setProgress(0)

      const SQL = await initSqlJs({
        // Required to load the wasm binary asynchronously. Of course, you can host it wherever you want
        // You can omit locateFile completely when running in node
        locateFile: (file: string) => `https://sql.js.org/dist/${file}`
      })

      const res = await fetch('wordnetFull.db')
      if (!res.ok) throw new Error('Failed to fetch wordnet.db: ' + res.status)

      const contentLength = res.headers.get('content-length')
      const total = contentLength ? parseInt(contentLength, 10) : 0
      let loaded = 0

      const reader = res.body!.getReader()
      const chunks: Uint8Array[] = []

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
      setDb(database as unknown as Database)
      setInfo('Database loaded.')
      setIsLoading(false)
    } catch (e) {
      setInfo('')
      setError('Error loading database: ' + (e as Error).message)
      setIsLoading(false)
      console.error(e)
    }
  }

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    if (!db || !query.trim()) return

    setError('')
    setDefinitions([])
    setWordTitle('')
    setInfo('Searching...')

    try {
      const tableName = 'words'
      const stmtExact = db.prepare(`SELECT word, pos, definition FROM "${tableName}" WHERE lower(word) = $w;`)

      const rows: Definition[] = []
      stmtExact.bind({$w: query.toLowerCase()})
      while(stmtExact.step()){
        const row = stmtExact.getAsObject() as unknown as Definition
        rows.push(row)
      }
      stmtExact.reset()

      setDefinitions(rows)
      setWordTitle(query)
      setInfo('')
      if(rows.length === 0) setInfo('No definitions found')
    } catch(err){
      console.error(err)
      setError('Search error: ' + (err as Error).message)
      setInfo('')
    }
  }

  const escapeHtml = (str: string | null | undefined): string => {
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
      <nav>
        <h1 id="navTitle">Offline Dictionary</h1>
      </nav>

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
      <div id="definitionList" aria-live="polite">
        {definitions.map((def, index) => (
          <div className="defItem" key={index}>
            <div>{index + 1})</div>
            <div><strong>{def.pos}.</strong> {escapeHtml(def.definition)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App