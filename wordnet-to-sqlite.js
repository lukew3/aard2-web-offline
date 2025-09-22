const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const cliProgress = require('cli-progress');

// Create/open database
const db = new sqlite3.Database('wordnet.db');

// Create words table if it doesn't exist
db.run(`CREATE TABLE IF NOT EXISTS words (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    word TEXT NOT NULL,
    pos TEXT NOT NULL,
    definition TEXT NOT NULL,
    UNIQUE(word, pos, definition)
)`);

const wordnetData = JSON.parse(fs.readFileSync('wordnet.json', 'utf8'));

// Calculate total number of words to process
let totalWords = 0;
for (const synset in wordnetData.synset) {
    const words = wordnetData.synset[synset].word;
    totalWords += words.length;
}

console.log(`Total words to process: ${totalWords}`);

// Create progress bar
const progressBar = new cliProgress.SingleBar({
    format: 'Progress |{bar}| {percentage}% | {value}/{total} words | ETA: {eta}s',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true
}, cliProgress.Presets.shades_classic);

// Start the progress bar
progressBar.start(totalWords, 0);

// Insert words into database
db.serialize(() => {
    const insertStmt = db.prepare(`INSERT OR IGNORE INTO words (word, pos, definition) VALUES (?, ?, ?)`);
    
    let processedWords = 0;

    // Process each synset
    for (const synset in wordnetData.synset) {
        const words = wordnetData.synset[synset].word;
        const pos = wordnetData.synset[synset].pos;
        const def = wordnetData.synset[synset].gloss;
        
        for (const word of words) {
            insertStmt.run(word, pos, def, function(err) {
                if (err) {
                    console.error(`\nError inserting word "${word}":`, err);
                }
                
                processedWords++;
                progressBar.update(processedWords);
                
                // Check if all words have been processed
                if (processedWords === totalWords) {
                    progressBar.stop();
                    console.log('\nAll words processed successfully');
                    
                    // Finalize the statement
                    insertStmt.finalize((err) => {
                        if (err) {
                            console.error('Error finalizing statement:', err);
                        } else {
                            console.log('Database operations completed');
                        }
                        
                        // Close database when done
                        db.close((err) => {
                            if (err) {
                                console.error('Error closing database:', err);
                            } else {
                                console.log('Database connection closed');
                            }
                        });
                    });
                }
            });
        }
    }
});