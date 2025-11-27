// schema/userInput.js

// modifier le 24/09/2025
export const loginInput = {
	$id: 'loginInput',
	body: {
		type: 'object',
		required: ['name', 'password'],
		properties: {
			name: {
				type: 'string',
				minLength: 1,
				maxLength: 64,
				pattern: '^[^<>{}"\'`]*$'
			},
			password: {
				type: 'string',
				minLength: 8,
				maxLength: 128,
				pattern: '^[^<>{}"\'`]*$'
			},
			tmp : { type: 'boolean' } // facultatif, true si user est P2 pour un match
		},
		additionalProperties: false
	}
}