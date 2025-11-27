

export async function pruneRevokedAccess(eraseRevokedAccess) {
    const time = Math.floor( Date.now() / 1000 );
    await eraseRevokedAccess(time);
}