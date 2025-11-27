// cron/cronFunctions.js

export async function prunePendingRegistered(deletePending) {
	const time = Math.floor( Date.now() / 1000 ) - (15 * 60);
	await deletePending(time);
}