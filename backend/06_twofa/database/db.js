import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

const dbFile = '/usr/src/app/data/twofa_db';

async function getDB() {
	return await open({
		filename: dbFile,
		driver: sqlite3.Database
	});
}

export async function initDB(fastify) {
	const db = await getDB();

	db.exec(
		`CREATE TABLE IF NOT EXISTS twofa (
			id INTEGER NOT NULL,
			name TEXT NOT NULL,
			code TEXT NOT NULL
			)
		;`
	);

	db.twofa = {
		table: 'twofa',

		async insert(id, name, code) {
			await db.run(
				`INSERT INTO twofa (id, name, code) VALUES (?, ?, ?)`,
				[ id, name, code ]
			);
		},
		async getCode(id, name) {
			return await db.get(
				`SELECT code FROM twofa  WHERE id = ? AND name = ?`,
				[ id, name ]
			);
		},
		async delete(id) {
			await db.run(
				`DELETE FROM twofa WHERE id = ?`,
				[ id ]
			);
		}
	}

    await fastify.decorate('db', db);

    await fastify.addHook('onClose', async (instance) => {
		await instance.db.close();
	});
}
