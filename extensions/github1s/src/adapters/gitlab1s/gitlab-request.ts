/**
 * @file github api auth token manager
 */

import { getExtensionContext } from '@/helpers/context';

const GITLAB_OAUTH_TOKEN = 'gitlab-oauth-token';

let token: string;
function getToken(): string {
	token = getExtensionContext().globalState.get(GITLAB_OAUTH_TOKEN) || '';
	return token;
}

export class GitlabRequest {
	accessToken: string;

	constructor({ auth }) {
		this.accessToken = auth;
	}

	public request(command: string, params: Record<string, string | number>) {
		let [method, url] = command.split(' ');
		Object.keys(params).forEach((el) => {
			url = url.replace(`{${el}}`, `${params[el]}`);
		});
		const accessToken = this.accessToken;
		// if (!accessToken) {
		// 	vscode.commands.executeCommand('gitlab1s.views.settings.focus');
		// 	return { data: null, headers: null };
		// }
		const fetchOptions = accessToken ? { headers: { 'PRIVATE-TOKEN': `${accessToken}` } } : {};
		return fetch(`${GITLAB_DOMAIN}/api/v4` + url, {
			...fetchOptions,
			method,
		})
			.then(async (response) => {
				if (response.status === 200 || response.status === 304) {
					const data = await response.json();
					return { data, headers: response.headers };
				}

				return Promise.reject(response);
			})
			.catch((e) => {
				console.log('####################', e);
				// return { data: null, headers: null };
				return Promise.reject(e);
			});
	}
}

export default function ifetch(command, params) {
	let [method, url] = command.split(' ');
	Object.keys(params).forEach((el) => {
		url = url.replace(`{${el}}`, params[el]);
	});
	const accessToken = token || getToken();
	// if (!accessToken) {
	// 	vscode.commands.executeCommand('gitlab1s.views.settings.focus');
	// 	return { data: null, headers: null };
	// }
	const fetchOptions = accessToken ? { headers: { 'PRIVATE-TOKEN': `${accessToken}` } } : {};
	return fetch(`${GITLAB_DOMAIN}/api/v4` + url, {
		...fetchOptions,
		method,
	})
		.then(async (response) => {
			if (response.status === 401) {
				return { data: null, headers: null };
			}

			const data = await response.json();
			return { data, headers: response.headers };
		})
		.catch((e) => {
			console.log('####################', e);
			return { data: null, headers: null };
		});
}
