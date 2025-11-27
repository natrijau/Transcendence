// schema/sessionInput.js

export const generateSchema = {
	$id: 'sessionInput',
	body: {
		type: 'object',
		required: [ 'name', 'type', 'id', 'verified' ],
		properties: {
			name: { type: 'string' },
			id: { type: 'integer' },
			type: {
				type: 'string',
				enum: [ 'guest', 'registered' ]
			},
			token: { type: 'string' },
			verified: { type: 'boolean' }
		},
		additionalProperties: false
	}
}