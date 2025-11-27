import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

// Chemin vers le fichier de base de données SQLite
const dbFile = '/usr/src/app/data/tournament_db';
// Fonction pour obtenir une instance de la base de données
async function getDB() {
	if (!dbFile)
		throw new Error('Database file path is not defined');
	if (typeof dbFile !== 'string')
		throw new Error('Database file path must be a string');
	//console.log('Opening database user at:', dbFile);
	return open({
		filename: dbFile,
		driver: sqlite3.Database
	});
}

export { getDB };