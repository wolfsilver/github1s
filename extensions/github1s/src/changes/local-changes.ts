/**
 * @file Track and display local file changes
 * @author github1s
 */

import * as vscode from 'vscode';
import { GitHub1sFileSystemProvider } from '@/providers/file-system';
import adapterManager from '@/adapters/manager';

let sourceControl: vscode.SourceControl | null = null;
let localChangesGroup: vscode.SourceControlResourceGroup | null = null;

export const initializeLocalChangesTracking = () => {
	const rootUri = vscode.Uri.parse('').with({ scheme: adapterManager.getCurrentScheme() });
	sourceControl = vscode.scm.createSourceControl('github1s-local', 'GitHub1s Local Changes', rootUri);
	sourceControl.inputBox.placeholder = 'Message (press Ctrl+Enter to commit)';

	localChangesGroup = sourceControl.createResourceGroup('localChanges', 'Local Changes');

	// Set up accept input box handler for committing
	sourceControl.acceptInputCommand = {
		command: 'github1s.commitAndPush',
		title: 'Commit and Push',
	};

	// Listen to file system changes
	const fsProvider = GitHub1sFileSystemProvider.getInstance();
	fsProvider.onDidChangeFile(() => {
		updateLocalChanges();
	});

	// Initial update
	updateLocalChanges();
};

export const updateLocalChanges = () => {
	if (!localChangesGroup) {
		return;
	}

	const fsProvider = GitHub1sFileSystemProvider.getInstance();
	const modifiedFiles = fsProvider.getModifiedFiles();
	const deletedFiles = fsProvider.getDeletedFiles();

	const resourceStates: vscode.SourceControlResourceState[] = [];

	// Add modified files
	for (const { uri } of modifiedFiles) {
		const parsedUri = vscode.Uri.parse(uri);
		resourceStates.push({
			resourceUri: parsedUri,
			decorations: {
				tooltip: 'Modified',
			},
		});
	}

	// Add deleted files
	for (const uri of deletedFiles) {
		const parsedUri = vscode.Uri.parse(uri);
		resourceStates.push({
			resourceUri: parsedUri,
			decorations: {
				strikeThrough: true,
				tooltip: 'Deleted',
			},
		});
	}

	localChangesGroup.resourceStates = resourceStates;

	// Update source control count badge
	if (sourceControl) {
		sourceControl.count = resourceStates.length;
	}
};
