import React from 'react'
import './SearchHistory.css'

interface SearchHistoryItem {
  word: string
  timestamp: string
}

interface SearchHistoryProps {
  onWordClick: (word: string) => void
}

const SearchHistory: React.FC<SearchHistoryProps> = ({ onWordClick }) => {
  const [history, setHistory] = React.useState<SearchHistoryItem[]>([])

  React.useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = (): void => {
    try {
      const stored = localStorage.getItem('searchHistory')
      if (stored) {
        const parsedHistory = JSON.parse(stored) as SearchHistoryItem[]
        // Sort by timestamp descending (most recent first)
        const sortedHistory = parsedHistory.sort((a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        setHistory(sortedHistory)
      }
    } catch (error) {
      console.error('Error loading search history:', error)
    }
  }

  const addToHistory = (word: string): void => {
    try {
      const newItem: SearchHistoryItem = {
        word: word.toLowerCase(),
        timestamp: new Date().toISOString()
      }

      const stored = localStorage.getItem('searchHistory')
      let currentHistory: SearchHistoryItem[] = []

      if (stored) {
        currentHistory = JSON.parse(stored) as SearchHistoryItem[]
      }

      // Remove duplicates (same word)
      const filteredHistory = currentHistory.filter(item => item.word !== word.toLowerCase())

      // Add new item at the beginning
      const updatedHistory = [newItem, ...filteredHistory]

      // Keep only the last 50 searches
      const trimmedHistory = updatedHistory.slice(0, 50)

      localStorage.setItem('searchHistory', JSON.stringify(trimmedHistory))
      loadHistory() // Reload to update the display
    } catch (error) {
      console.error('Error saving to search history:', error)
    }
  }

  const clearHistory = (): void => {
    try {
      localStorage.removeItem('searchHistory')
      setHistory([])
    } catch (error) {
      console.error('Error clearing search history:', error)
    }
  }

  const formatDateTime = (timestamp: string): string => {
    const date = new Date(timestamp)
    return date.toLocaleString()
  }

  // Expose addToHistory function globally for App.tsx to use
  React.useEffect(() => {
    (window as any).addToSearchHistory = addToHistory
    return () => {
      delete (window as any).addToSearchHistory
    }
  }, [])

  if (history.length === 0) {
    return null
  }

  return (
    <div className="search-history">
      <div className="search-history-header">
        <h3>Recent Searches</h3>
        <button
          onClick={clearHistory}
          className="clear-history-btn"
          title="Clear search history"
        >
          Clear
        </button>
      </div>
      <div className="search-history-list">
        {history.map((item, index) => (
          <div
            key={`${item.word}-${item.timestamp}`}
            className="search-history-item"
            onClick={() => onWordClick(item.word)}
          >
            <span className="history-word">{item.word}</span>
            <span className="history-timestamp">{formatDateTime(item.timestamp)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default SearchHistory