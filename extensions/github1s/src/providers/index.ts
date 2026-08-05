/**
 * @file register VS Code providers
 * @author netcon
 */

import * as vscode from 'vscode';
import adapterManager from '@/adapters/manager';
import { getExtensionContext } from '@/helpers/context';
import { GitHub1sFileSystemProvider } from './file-system';
import { GitHub1sFileSearchProvider } from './file-search';
import { GitHub1sTextSearchProvider } from './text-search';
import { GitHub1sSubmoduleDecorationProvider } from './decorations/submodule';
import { GitHub1sChangedFileDecorationProvider } from './decorations/changed-file';
import { GitHub1sSourceControlDecorationProvider } from './decorations/source-control';
import { GitHub1sDefinitionProvider } from './definition';
import { GitHub1sReferenceProvider } from './reference';
import { GitHub1sHoverProvider } from './hover';

export const EMPTY_FILE_SCHEME = 'github1s-empty-file';
export const emptyFileUri = vscode.Uri.parse('').with({
	scheme: EMPTY_FILE_SCHEME,
	path: '/empty',
});

/**
 * FileSystemProvider for empty files used in diff views.
 * This handles both text and binary files (like images) properly.
 */
class EmptyFileSystemProvider implements vscode.FileSystemProvider {
	private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
	readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._emitter.event;

	watch(uri: vscode.Uri, options: { recursive: boolean; excludes: string[] }): vscode.Disposable {
		return new vscode.Disposable(() => {});
	}

	stat(uri: vscode.Uri): vscode.FileStat {
		return {
			type: vscode.FileType.File,
			ctime: 0,
			mtime: 0,
			size: 0,
		};
	}

	readDirectory(uri: vscode.Uri): [string, vscode.FileType][] {
		return [];
	}

	createDirectory(uri: vscode.Uri): void {
		throw vscode.FileSystemError.NoPermissions('Cannot create directory in empty file system');
	}

	readFile(uri: vscode.Uri): Uint8Array {
		// Return an empty buffer for both text and binary files
		return new Uint8Array(0);
	}

	writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean; overwrite: boolean }): void {
		throw vscode.FileSystemError.NoPermissions('Cannot write to empty file system');
	}

	delete(uri: vscode.Uri, options: { recursive: boolean }): void {
		throw vscode.FileSystemError.NoPermissions('Cannot delete from empty file system');
	}

	rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean }): void {
		throw vscode.FileSystemError.NoPermissions('Cannot rename in empty file system');
	}
}

export const registerVSCodeProviders = () => {
	const context = getExtensionContext();

	const allSchemes = adapterManager.getAllAdapters().map((item) => item.scheme);

	allSchemes.forEach((scheme) => {
		context.subscriptions.push(
			vscode.workspace.registerFileSystemProvider(scheme, GitHub1sFileSystemProvider.getInstance(), {
				isCaseSensitive: true,
				isReadonly: true,
			}),
			vscode.workspace.registerFileSearchProvider(scheme, GitHub1sFileSearchProvider.getInstance()),
			vscode.workspace.registerTextSearchProvider(scheme, GitHub1sTextSearchProvider.getInstance()),
			vscode.languages.registerDefinitionProvider({ scheme }, GitHub1sDefinitionProvider.getInstance()),
			vscode.languages.registerReferenceProvider({ scheme }, GitHub1sReferenceProvider.getInstance()),
			vscode.languages.registerHoverProvider({ scheme }, GitHub1sHoverProvider.getInstance()),
		);
	});

	context.subscriptions.push(
		vscode.window.registerFileDecorationProvider(GitHub1sSubmoduleDecorationProvider.getInstance()),
		vscode.window.registerFileDecorationProvider(GitHub1sChangedFileDecorationProvider.getInstance()),
		vscode.window.registerFileDecorationProvider(GitHub1sSourceControlDecorationProvider.getInstance()),
		// provider a readonly empty file for diff (supports both text and binary files)
		vscode.workspace.registerFileSystemProvider(EMPTY_FILE_SCHEME, new EmptyFileSystemProvider(), {
			isCaseSensitive: true,
			isReadonly: true,
		}),
	);
};
