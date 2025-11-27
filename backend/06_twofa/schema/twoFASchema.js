// schema/twoFASchema.js

export const sendSchema = {
	$id: 'sendSchema',
	body: {
		type: 'object',
		required: [ 'id', 'name', 'email' ],
		properties: {
			id: { type: 'integer' },
			name: { type: 'string', minLength: 1 },
			email: { type: 'string', minLength: 3 }
		},
		additionalProperties: false
	}
}

export const verifySchema = {
	$id: 'verifySchema',
	body: {
		type: 'object',
		required: [ 'code' ],
		properties: {
			code: { type: 'string' },
		},
		additionalProperties: false
	}
}