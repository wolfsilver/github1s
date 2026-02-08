export async function onRequest(context) {
	let [publisher, ...restPartsPath] = context.params.path;
	restPartsPath = restPartsPath.join('/');

	const host = `${publisher}.vscode-unpkg.net`.toLowerCase();
	const target = `https://${host}/${publisher}/${restPartsPath}`;
	const headers = { host };

	const res = await fetch(target, { headers });

	return new Response(res.body, {
		status: res.status,
		statusText: res.statusText,
		headers: res.headers,
	});
}
