// schema/userInput.js

export const registerInput = {
	$id: 'registerInput',
	body: {
		type: 'object',
		required: [ 'name', 'password', 'email' ],
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
			email: {
				type: 'string',
				minLength: 8,
				maxLength: 254,
				format: 'email',
				pattern: '^[^<>{}"\'`]*$'
			},
			tmp : { type: 'boolean' }
		},
		additionalProperties: false
	}
}

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
			tmp : { type: 'boolean' }
		},
		additionalProperties: false
	}
}

export const updateSchema = {
	$id: 'updateSchema',
	body: {
		type: 'object',
		required: ['password', 'toUpdate', 'newValue'],
		properties: {
			password: {
				type: 'string',
				minLength: 8,
				maxLength: 128,
				pattern: '^[^<>{}"\'`]*$'
			},
			toUpdate: {
				type: 'string',
				enum: ['password', 'email']
			},
			newValue: {
				type: 'string',
				minLength: 1,
				maxLength: 254,
				pattern: '^[^<>{}"\'`]*$'
			}
		},
		additionalProperties: false,
	}
}

export const guestTmp = {
	$id: 'guestTmp',
	body: {
		type: 'object',
		properties: {
			tmp : { type: 'boolean' }
		},
		additionalProperties: false
	}
}

export const deleteSchema = {
	$id: 'deleteSchema',
	body: {
		type: 'object',
		required: ['password'],
		properties: {
			password: {
				type: 'string',
				minLength: 8,
				maxLength: 128,
				pattern: '^[^<>{}"\'`]*$'
			},
		},
		additionalProperties: false
	}
}

export const deleteFriendSchema = {
	$id: 'deleteFriendSchema',
	body: {
		type: 'object',
		required: ['id'],
		properties: {
			id: {
				type: 'string',
				pattern: '^[0-9]+$',
				minLength: 1,
				maxLength: 10
			},
		},
		additionalProperties: false
	}
}
