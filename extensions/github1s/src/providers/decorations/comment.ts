/**
 * @file GitHub1s comment
 * @author netcon
 * Decorate the file with comment
 */
import * as queryString from 'query-string';
import {
	CancellationToken,
	Disposable,
	EventEmitter,
	FileDecoration,
	FileDecorationProvider,
	ProviderResult,
	ThemeColor,
	Uri,
} from 'vscode';

export class GitHub1sCommentDecorationProvider implements FileDecorationProvider, Disposable {
	private static instance: GitHub1sCommentDecorationProvider | null = null;
	private readonly disposable: Disposable;
	private fileHasComments: Map<string, boolean> = new Map<string, boolean>();

	private constructor() {}

	public static getInstance(): GitHub1sCommentDecorationProvider {
		if (GitHub1sCommentDecorationProvider.instance) {
			return GitHub1sCommentDecorationProvider.instance;
		}
		return (GitHub1sCommentDecorationProvider.instance = new GitHub1sCommentDecorationProvider());
	}

	dispose() {
		this.disposable?.dispose();
	}

	// the directory which is submodule will be decorated with this
	private static submoduleDecorationData: FileDecoration = {
		tooltip: 'Commented',
		badge: '💬',
		color: new ThemeColor('github1s.colors.submoduleResourceForeground'),
	};

	updateFileComments(resourceUri: Uri, prNumber: number, fileName: string, hasComments: boolean): void {
		const key = `${prNumber}:${fileName}`;
		const oldValue = this.fileHasComments.get(key);
		if (oldValue !== hasComments) {
			this.fileHasComments.set(`${prNumber}:${fileName}`, hasComments);
			// this._onDidChangeFileDecorations.fire(resourceUri);
		}
	}

	private _onDidChangeFileDecorations = new EventEmitter<undefined>();
	readonly onDidChangeFileDecorations = this._onDidChangeFileDecorations.event;

	updateDecorations() {
		this._onDidChangeFileDecorations.fire(undefined);
	}

	provideFileDecoration(uri: Uri, _token: CancellationToken): ProviderResult<FileDecoration> {
		const query = queryString.parse(uri.query);
		if (query) {
			const key = `${query.prNumber}:${uri.path}`;
			// console.log('### comment provide', key, uri, query)
			if (this.fileHasComments.get(key)) {
				return GitHub1sCommentDecorationProvider.submoduleDecorationData;
			}
		}

		return undefined;
	}
}
