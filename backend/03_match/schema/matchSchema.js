// schema/schema.js

export const registeredMatchSchema = {
	$id: 'registeredMatchSchema',
	body: {
		type: 'object',
		required: [ 'name', 'password' ],
		properties: {
			name: { type: 'string', minLength: 1 },
			password: { type: 'string', minLength: 8 },
		},
		additionalProperties: false,
	},
}

export const matchSchema = {
	$id: 'matchSchema',
	body: {
		type: 'object',
		required: [ 'id', 'p1_id', 'p1_type', 'scoreP1',
			'p2_id', 'p2_type', 'scoreP2', 'created_at' ],
		properties: {
			id: { type: 'integer' },
			p1_id: { type: 'integer' },
			p1_type: {
				type: 'string',
				enum: [ 'registered', 'guest', 'ia' ],
			},
			scoreP1: { type: 'integer', minimum: 0 },
			p2_id: { type: 'integer' },
			p2_type: {
				type: 'string',
				enum: [ 'registered', 'guest', 'ia' ],
			},
			scoreP2: { type: 'integer', minimum: 0 },
			created_at: { type: 'string' },
			tournament_id: { type: 'integer', minimum: 0 }
		},
  	}
}

export const abortSchema = {
	$id: 'abortSchema',
	body: {
		type: 'object',
		required: [ 'user_id', 'user_type' ],
		properties: {
			user_id: { type: 'integer' },
			user_type: {
				type: 'string',
				enum: [ 'registered', 'guest', 'ia' ]
			}
		},
		additionalProperties: false
	}
}

export const tournamentMatchSchema = {
	$id: 'tournamentMatchSchema',
	body: {
		type: 'object',
		required: [ 'player1', 'player2', 'tournamentID' ],
		properties: {
			player1 : {
				type: 'object',
				properties: {
					id: { type: 'integer' },
					type: {
						type: 'string',
						enum: [ 'registered', 'guest', 'ia' ]
					}
				}
			},
			player2: {
				type: 'object',
				properties: {
					id: { type: 'integer' },
					type: {
						type: 'string',
						enum: [ 'registered', 'guest', 'ia' ]
					}
				}
			},
			tournamentID: { type: 'integer' }
		},
		additionalProperties: true,
	}
}