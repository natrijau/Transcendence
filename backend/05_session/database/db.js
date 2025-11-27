//./database/db.js

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const dbFile = '/usr/src/app/data/session_db';

async function getDB() {
	return await open({
		filename: dbFile,
		driver: sqlite3.Database
	});
}

export async function initDB(fastify) {
	const db = await getDB();

	await db.exec(`
		CREATE TABLE IF NOT EXISTS refresh (
			jwti TEXT NOT NULL,
			user_id	INTEGER NOT NULL
		);

		CREATE TABLE IF NOT EXISTS revoked_access (
			jwti TEXT NOT NULL,
			exp INTEGER NOT NULL
		);
	`);

	db.refresh = {
		async insert(jwti, user_id) {
    		await db.run(`INSERT INTO refresh(jwti, user_id) VALUES(?, ?)`,
        		[ jwti, user_id ]);
		},
		async get(jwti, user_id) {
			return await db.get(`SELECT * FROM refresh WHERE jwti = ? AND user_id = ?`,
				[ jwti, user_id ]);
		},
		async erase(jwti, user_id) {
			await db.run(`DELETE FROM refresh WHERE jwti = ? AND user_id = ?`,
				[ jwti, user_id ]);
		}
	};

	db.revokedAccess = {
		async insert(jwti, exp) {
    		await db.run(`INSERT INTO revoked_access(jwti, exp) VALUES(?, ?)`,
        		[ jwti, exp ]);	
		},
		async get(jwti) {
			return await db.get(`SELECT * FROM revoked_access WHERE jwti = ?`,
				[ jwti ]);
		},
		// cron
		async erase(exp) {
			await db.run(`DELETE FROM revoked_access WHERE exp <= ?`,
				[ exp ]);
		}
	}

    await fastify.decorate('db', db);
	
    await fastify.addHook('onClose', async (instance) => {
		//console.log("Database closed")
		await instance.db.close();
	});
}