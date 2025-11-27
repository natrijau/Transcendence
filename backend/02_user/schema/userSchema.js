// schema/schema.js

export const userSchema = {
	$id: 'userSchema',
	body: {
		type: 'object',
		required: ['name', 'type', 'status'],
		properties: {
			name: {
				type: 'string',
				minLength: 1,
				maxLength: 64,
				pattern: '^[^<>{}"\'`]*$'
			},
			type: {
				type: 'string',
				enum: ['guest', 'registered']
			},
			status: {
				type: 'string',
				pattern: '^[^<>{}"\'`]*$',
				enum: ['available', 'logged_out', 'pending', 'in_game']
			}
		},
		additionalProperties: false
	}
}

export const updateStatsSchema = {
	$id: 'updateStatsSchema',
	body: {
		type: 'object',
		required: [ 'p1_id', 'p1_type', 'p2_id', 'p2_type', 'winner_id' ],
		properties: {
			p1_id: { type: 'integer' },
			p1_type: {
				type: 'string',
				enum: [ 'registered', 'guest', 'ia' ]
			},
			p2_id: { type: 'integer' },
			p2_type: {
				type: 'string',
				enum: [ 'registered', 'guest', 'ia' ]
			},
			winner_id: { type: 'integer' },
		},
		additionalProperties: false
	}
}