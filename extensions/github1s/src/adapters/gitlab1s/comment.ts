import { Repository } from '@/repository';
import router from '@/router';
import * as vscode from 'vscode';
import * as queryString from 'query-string';
import { adapterManager } from '..';

let commentId = 1;

class NoteComment implements vscode.Comment {
	id: number;
	label: string | undefined;
	savedBody: string | vscode.MarkdownString; // for the Cancel button
	constructor(
		public body: string | vscode.MarkdownString,
		public mode: vscode.CommentMode,
		public author: vscode.CommentAuthorInformation,
		public parent?: vscode.CommentThread,
		public contextValue?: string
	) {
		this.id = ++commentId;
		this.savedBody = this.body;
	}
}

export function activate(context: vscode.ExtensionContext) {
	// A `CommentController` is able to provide comments for documents.
	const commentController = vscode.comments.createCommentController('github1s-comment', 'gitlab comments');
	context.subscriptions.push(commentController);

	// A `CommentingRangeProvider` controls where gutter decorations that allow adding comments are shown
	commentController.commentingRangeProvider = {
		provideCommentingRanges: (document: vscode.TextDocument, token: vscode.CancellationToken) => {
			debugger;
			const lineCount = document.lineCount;
			renderComments(document);
			return [new vscode.Range(0, 0, lineCount - 1, 0)];
		},
	};

	context.subscriptions.push(
		vscode.commands.registerCommand('github1s.commands.createNote', (reply: vscode.CommentReply) => {
			replyNote(reply);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('github1s.commands.replyNote', (reply: vscode.CommentReply) => {
			replyNote(reply);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('github1s.commands.startDraft', (reply: vscode.CommentReply) => {
			const thread = reply.thread;
			thread.contextValue = 'draft';
			const newComment = new NoteComment(reply.text, vscode.CommentMode.Preview, { name: 'vscode' }, thread);
			newComment.label = 'pending';
			thread.comments = [...thread.comments, newComment];
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('github1s.commands.finishDraft', (reply: vscode.CommentReply) => {
			const thread = reply.thread;

			if (!thread) {
				return;
			}

			thread.contextValue = undefined;
			thread.collapsibleState = vscode.CommentThreadCollapsibleState.Collapsed;
			if (reply.text) {
				const newComment = new NoteComment(reply.text, vscode.CommentMode.Preview, { name: 'vscode' }, thread);
				thread.comments = [...thread.comments, newComment].map((comment) => {
					comment.label = undefined;
					return comment;
				});
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('github1s.commands.deleteNoteComment', (comment: NoteComment) => {
			const thread = comment.parent;
			if (!thread) {
				return;
			}

			thread.comments = thread.comments.filter((cmt) => (cmt as NoteComment).id !== comment.id);

			if (thread.comments.length === 0) {
				thread.dispose();
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('github1s.commands.deleteNote', (thread: vscode.CommentThread) => {
			thread.dispose();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('github1s.commands.cancelsaveNote', (comment: NoteComment) => {
			if (!comment.parent) {
				return;
			}

			comment.parent.comments = comment.parent.comments.map((cmt) => {
				if ((cmt as NoteComment).id === comment.id) {
					cmt.body = (cmt as NoteComment).savedBody;
					cmt.mode = vscode.CommentMode.Preview;
				}

				return cmt;
			});
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('github1s.commands.saveNote', (comment: NoteComment) => {
			if (!comment.parent) {
				return;
			}

			comment.parent.comments = comment.parent.comments.map((cmt) => {
				if ((cmt as NoteComment).id === comment.id) {
					(cmt as NoteComment).savedBody = cmt.body;
					cmt.mode = vscode.CommentMode.Preview;
				}

				return cmt;
			});
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('github1s.commands.editNote', (comment: NoteComment) => {
			if (!comment.parent) {
				return;
			}

			comment.parent.comments = comment.parent.comments.map((cmt) => {
				if ((cmt as NoteComment).id === comment.id) {
					cmt.mode = vscode.CommentMode.Editing;
				}

				return cmt;
			});
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('github1s.commands.dispose', () => {
			commentController.dispose();
		})
	);

	async function replyNote(reply: vscode.CommentReply) {
		const thread = reply.thread;
		const newComment = new NoteComment(
			reply.text,
			vscode.CommentMode.Preview,
			{ name: 'vscode' },
			thread,
			thread.comments.length ? 'canDelete' : undefined
		);
		if (thread.contextValue === 'draft') {
			newComment.label = 'pending';
		}
		const scheme = adapterManager.getCurrentScheme();
		const { repo } = await router.getState();
		debugger;

		const query = queryString.parse(newComment.parent?.uri.query!);
		Repository.getInstance(scheme, repo).addComment(query?.id as string, newComment.body as string, {
			'position[base_sha]': '',
			'position[start_sha]': '',
			'position[head_sha]': '',
			'position[position_type]': 'text',
			'position[new_path]': newComment.parent?.uri.path,
			'position[old_path]': newComment.parent?.uri.path,
			'position[new_line]': thread.range.start.line,
		});

		thread.comments = [...thread.comments, newComment];
	}

	async function renderComments(document: vscode.TextDocument) {
		const scheme = adapterManager.getCurrentScheme();
		const { repo } = await router.getState();

		const query = queryString.parse(document?.uri.query!);

		const list = await Repository.getInstance(scheme, repo).getComment(query?.id as string);
		console.log('###', list);
		debugger;
		list.forEach(
			({ individual_note, notes }) =>
				!individual_note &&
				notes.forEach((comment) => {
					commentController.createCommentThread(
						document.uri,
						new vscode.Range(
							new vscode.Position(comment.position.line_range.start.new_line, 0),
							new vscode.Position(comment.position.line_range.end.new_line, 0)
						),
						[
							{
								body: comment.body,
								mode: 1,
								author: {
									name: comment.author.name,
									iconPath: comment.author.avatar_url,
								},
							},
						]
					);
				})
		);
	}
}
