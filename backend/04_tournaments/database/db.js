// database/db.js

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const dbFile = '/usr/src/app/data/tournament_db';

async function getDB() {
    return await open({
        filename: dbFile,
        driver: sqlite3.Database
    });
}

export async function initDB(fastify) {
    const db = await getDB();

    await db.exec(`

		CREATE TABLE IF NOT EXISTS tournament (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			creatorId INTEGER NOT NULL,
			status TEXT DEFAULT 'waiting',
			matchs TEXT DEFAULT '',
			players TEXT DEFAULT '',
			rounds INTEGER DEFAULT 1,
			nbPlayersTotal INTEGER NOT NULL,
			remainingPlaces INTEGER NOT NULL,
			created_at TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS history (
			id INTEGER NOT NULL,
			matchs TEXT,
			players TEXT,
			ranking TEXT,
			winnerID INTEGER default NULL,
			winnerType TEXT default NULL,
			ended_at TEXT,
			created_at TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS round (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			tournament_id	INTEGER NOT NULL,
			round INTEGER NOT NULL,
			matchs TEXT DEFAULT '',
			players	TEXT DEFAULT '',
			statut TEXT DEFAULT 'started'
		);
	`);

    db.tournament = {
        table: 'tournament',

        // getTournament('id', id)
        async get(column, value) {
            return (await db.get(
                `SELECT * FROM ${this.table} WHERE ${column} = ?`,
                [ value ]
            ));
        },
        // createTournamentRow
        async insert(nbPlayersTotal, creatorId) {
            const time = Math.floor(Date.now() / 1000);

            const result = await db.run(
		        `INSERT INTO tournament (created_at, nbPlayersTotal,
                remainingPlaces, creatorId)
		        VALUES (?, ?, ?, ?)`,
		        [time, nbPlayersTotal, nbPlayersTotal, creatorId]
	        );
            return (await this.get('id', result.lastID));
        },
		async  setMatches(id, matchesString) {
			await db.run(`UPDATE tournament SET matchs = ? WHERE id = ?`, [matchesString, id]);
			return (await this.get('id', id));
		},
        // startTournamentInternal('status', 'started', id)
        // addMatchesStringToTournament('matchs', matchesString, id)
        async update(column, value, id) {
			const tournament = (await this.get('id', id));
			if (!tournament)
				return null;

			// Mettre à jour la colonne
			await db.run(`UPDATE ${this.table} SET ${column} = ? WHERE id = ?`, [value, id]);

			// Retourner le tournoi mis à jour
			return (await this.get('id', id));
        },
        // addPlayerToTournament
        async addPlayer(tournamentID, playerStr) {
            const newPlayers = (await db.get(
                `SELECT players FROM ${this.table} WHERE id = ?`,
                [ tournamentID ]
            )).players + playerStr;
            await db.run(
                `UPDATE ${this.table} SET players = ?,
                remainingPlaces = (remainingPlaces - 1) WHERE id = ?`,
                [ newPlayers, tournamentID ]
            );
            return (await this.get('id', tournamentID));
        },
        // updateMatchesAndPlaces
        async updateMatchesAndPlaces(tournamentID, newMatches, newPlayers) {
            await db.run(
                `UPDATE ${this.table} SET matches = ?,
                nbPlayersTotal = nbPlayersTotal - 1,
                players = ? WHERE id = ?`,
                [newMatches, newPlayers, tournamentID]
            );
            return await this.get('id', tournamentID);
        },
        async delete(column, value) {
            await db.run(
                `DELETE FROM ${this.table} WHERE ${column} = ?`,
                [ value ]
            );
        }
    }

    db.history = {
        table: 'history',

        // getTournamentsWonByUser(winnerId) // utile ?
            // a l'origine: tournament
        async get(column, value) {
            return (await db.all(
                `SELECT * FROM ${this.table} WHERE ${column} = ?`,
                [ value ]
            ));
        },
        async insert(id, matchesStr, playersStr) {
            const time = Math.floor(Date.now() / 1000);

            await db.run(
                `INSERT INTO history (id, matchs, players, created_at)
                VALUES (?, ?, ?, ?)`,
                [id, matchesStr, playersStr, time]
            );
            return await this.get('id', id);
        },
        // setTournamentWinner(column = 'winnerID', value = winnerID, id = id)
        async update(column, value, id) {
            const tournament = await this.get('id', id); // utile ?
            if (!tournament /*|| tournament.status !== 'waiting'*/)
		        return null;

            await db.run(
                `UPDATE ${this.table} SET ${column} = ? WHERE id = ?`,
                [ value, id ]);
            return await this.get('id', id);
        },
		async addMatchesAndPlayers(tournamentId, matchesString, playersString){
			const time = Math.floor(Date.now() / 1000);
			await db.run(
				`INSERT INTO history (id, matchs, players, created_at)
				VALUES (?, ?, ?, ?)`,
				[tournamentId, matchesString, playersString, time]
			);
			return await this.get('id', tournamentId);
		}
    }

    db.round = {
        table: 'round',

        // getRoundTable
        async get(tournamentID, roundNumber) {
            return (await db.get(
                `SELECT * FROM ${this.table} WHERE tournament_id = ? AND round = ?`,
                [ tournamentID, roundNumber ]
            ));
        },
        // addDataRoundTable
        async insert(tournamentID, roundNumber, matchesStr, playersStr) {
            await db.run(
                `INSERT INTO round (tournament_id, round, matchs, players)
                VALUES (?, ?, ?, ?)`,
                [tournamentID, roundNumber, matchesStr, playersStr]
            );
            return await this.get(tournamentID, roundNumber);
        },
		async updateRoundData(tournamentID, roundNumber, matchsStr, playersStr) {
            await db.run(
                `UPDATE ${this.table} SET matchs = ?, players = ? WHERE tournament_id = ? AND round = ?`,
                [matchsStr, playersStr, tournamentID, roundNumber]
            );
            return await this.get(tournamentID, roundNumber);
        },
		async finishRound(tournamentID, roundNumber) {
			await db.run(
				`UPDATE ${this.table} SET statut = 'finished' WHERE tournament_id = ? AND round = ?`,
				[ tournamentID, roundNumber ]
			);
			return await this.get(tournamentID, roundNumber);
		},
        async delete(column, value) {
            await db.run(
                `DELETE FROM ${this.table} WHERE ${column} = ?`,
                [ value ]
            );
        }
	}

	await fastify.decorate('db', db);

	await fastify.addHook('onClose', async (instance) => {
		await instance.db.close();
	});
}