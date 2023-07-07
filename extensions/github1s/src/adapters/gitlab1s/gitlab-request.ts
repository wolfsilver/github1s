/**
 * @file github api auth token manager
 */
import { getExtensionContext } from '@/helpers/context';
import { reuseable } from '@/helpers/func';
import { GitLabTokenManager } from './token';

const GITLAB_OAUTH_TOKEN = 'gitlab-oauth-token';

let token: string;
function getToken(): string {
	token = getExtensionContext().globalState.get(GITLAB_OAUTH_TOKEN) || '';
	return token;
}

export class GitlabRequest {
	accessToken: string;

	constructor({ accessToken }) {
		this.accessToken = accessToken;
	}

	getObject = (obj, base = '') => {
		let value: string[] = [];
		Object.keys(obj).forEach((el) => {
			if (typeof obj[el] === 'object') {
				value.push(
					...Object.keys(obj[el]).reduce((pre, item) => {
						if (typeof obj[el][item] === 'object') {
							pre.push(this.getObject(obj[el][item], `${el}[${item}]`));
							return pre;
						}
						const key = base ? `${base}[${el}][${item}]` : `${el}[${item}]`;
						pre.push(`${key}=${obj[el][item]}`);
						return pre;
					}, [] as string[])
				);
				return;
			}
			const key = base ? `${base}[${el}]` : `${el}`;
			value.push(`${key}=${obj[el]}`);
		});
		return value.join('&');
	};

	getFormData = (obj, base = '', formData = new URLSearchParams()) => {
		Object.keys(obj).forEach((el) => {
			const key = base ? `${base}[${el}]` : `${el}`;

			if (typeof obj[el] === 'object') {
				this.getFormData(obj[el], key, formData)
				// value.push(
				// 	...Object.keys(obj[el]).reduce((pre, item) => {
				// 		if (typeof obj[el][item] === 'object') {
				// 			pre.push(this.getObject(obj[el][item], `${el}[${item}]`));
				// 			return pre;
				// 		}
				// 		const key = base ? `${base}[${el}][${item}]` : `${el}[${item}]`;
				// 		pre.push(`${key}=${obj[el][item]}`);
				// 		return pre;
				// 	}, [] as string[])
				// );
				return;
			}
			formData.append(key, obj[el])
			// value.push(`${key}=${obj[el]}`);
		});
		return formData;
	};

	public request = reuseable((command: string, params: Record<string, string | number | boolean | undefined>, data?: Record<string, string | number | boolean | undefined>) => {
		let [method, url] = command.split(' ');
		Object.keys(params).forEach((el) => {
			let value = params[el];
			if (typeof params[el] === 'object') {
				value = this.getObject(params[el], el);
			}
			url = url.replace(`{${el}}`, `${value}`);
		});
		const fetchOptions = GitLabTokenManager.getInstance().getHeader(this.accessToken);

		const body = data ? this.getFormData(data) : undefined;
		return fetch(`${GITLAB_DOMAIN}/api/v4` + url, {
			...fetchOptions,
			method,
			body,
		}).then(async (response) => {
			const data = await response.json();
			if (response.status >= 400) {
				return Promise.reject({
					status: response.status,
					data,
				});
			}

			if (response.status === 200 || response.status === 201 || response.status === 304) {
				return { data, headers: response.headers };
			}
			return Promise.reject({ data, headers: response.headers });
		});
	});
}
