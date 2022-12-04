/**
 * @file github api auth token manager
 */

import * as vscode from 'vscode';
import { getExtensionContext } from '@/helpers/context';

const GITLAB_OAUTH_TOKEN = 'gitlab-oauth-token';
export interface TokenStatus {
	ratelimitLimit: number;
	ratelimitRemaining: number;
	ratelimitReset: number;
	ratelimitResource: number;
	ratelimitUsed: number;
}
let token: string;
function getToken(): string {
	token = getExtensionContext().globalState.get(GITLAB_OAUTH_TOKEN) || '';
	return token;
}

export default function ifetch(command, params) {
	let [method, url] = command.split(' ');
	Object.keys(params).forEach((el) => {
		url = url.replace(`{${el}}`, params[el]);
	});
	const accessToken = token || getToken();
	if (!accessToken) {
		vscode.commands.executeCommand('gitlab1s.views.settings.focus');
		return { data: null, headers: null };
	}
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
			return { data: null, headers: null };
		});
}
