// controllers/controllers.js

import nodemailer from 'nodemailer';
import speakeasy from 'speakeasy';
import { generateJWT } from '../authentication/auth.js';

const secureCookieOptions = {
	httpOnly: true,
	secure: true,
	sameSite: 'none',
};

const secret = speakeasy.generateSecret({ length: 20 });

async function clearCookies(reply) {
	reply.clearCookie('accessToken', { ...secureCookieOptions, path: '/api/twofa/verifycode' })
		.clearCookie('refreshToken', { ...secureCookieOptions, path: '/api/refresh' });
}

async function generateCode() {
	return (speakeasy.totp({
		secret: secret.base32,
		encoding: 'base32'
	}));
}

async function sendMail(name, email, code) {
	const transporter = nodemailer.createTransport({
		service: 'gmail',
		auth: {
			user: process.env.USR_ADDR,
			pass: process.env.APP_PASS
		}
	});

	await transporter.sendMail({
		from: `"2FA Service" <` + process.env.USR_ADDR + `>`,
		to: email,
		subject: `2FA authentification ft_transcendence`,
		text: `Hello ` + name
		+ ",\nPlease enter the code below to achieve your sigin:\n" + code
		+ "\n\nThank you and see you soon on ft_transcendence !"
	});
}

// Route POST pour verifier l'email
export async function sendCode(request, reply) {
	const { db } = request.server;
	const { name, email, id } = request.body;
	const code = await generateCode();

	await sendMail(name, email, code);
	await db.twofa.insert(id, name, code);

	const res = await generateJWT({
		id: id,
		type: 'registered',
		name: name,
		verified: false
	});
	const jsonRes = await res.json();
	const { accessToken } = jsonRes;

	await clearCookies(reply);

	return reply.code(200)
		.send({
			message: 'Pending 2fa verification.',
			accessToken: accessToken
		});
}

// Route POST pour verifier le code généré
export async function verifyCode(request, reply) {
	const { db } = request.server;
	const { code } = request.body;
	const { id, name, type } = request.user;
	const codeToCompare = await db.twofa.getCode(id, name);
	if (codeToCompare === undefined)
		return reply.code(400).send({ error: 'Unauthorized (verifyCode)' });

	if (code !== codeToCompare.code) {
		return reply.code(400).send({error : 'bad code. Retry !'});
	}

	await clearCookies(reply);

	const response = await generateJWT({ 
		id: id,
		type: 'registered',
		name: name,
		verified: true
	});
	const jsonRes = await response.json();
	const { accessToken, refreshToken } = jsonRes;
	
	await fetch('http://user-service:3000/changestatus', {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			name: name,
			id: id,
			status: 'available',
			type: type
		}),
	});

	reply.setCookie('accessToken', accessToken, {
		...secureCookieOptions,
		maxAge: 60 * 15,
		path: '/'
	})
	.setCookie('refreshToken', refreshToken, {
		...secureCookieOptions,
		maxAge: 604800,
		path: '/api/refresh'
	})
	
	await db.twofa.delete(id);

	return reply.code(201)
		.send({
			message: 'User ' + name + ' verified'
		}
	);
}
