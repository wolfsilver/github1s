import { Repository } from '@/repository';
import router from '@/router';
import * as vscode from 'vscode';
import * as queryString from 'query-string';
import { adapterManager } from '..';

let commentId = 1;

let commentMap = new Map();

class NoteComment implements vscode.Comment {
	label: string | undefined;
	savedBody: string | vscode.MarkdownString; // for the Cancel button
	constructor(
		public body: string | vscode.MarkdownString,
		public mode: vscode.CommentMode,
		public author: vscode.CommentAuthorInformation,
		public parent?: vscode.CommentThread,
		public contextValue?: string,
		public discussionId?: number,
		public noteId?: number
	) {
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
			// debugger;
			if (!document.uri.query) {
				return;
			}
			console.log('### activate', document);
			const lineCount = document.lineCount;
			renderComments(document);
			return [new vscode.Range(0, 0, lineCount - 1, 0)];
		},
	};

	context.subscriptions.push(
		vscode.commands.registerCommand('github1s.commands.createNote', (reply: vscode.CommentReply) => {
			createNote(reply);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('github1s.commands.replyNote', (reply: vscode.CommentReply) => {
			replyNote(reply);
		})
	);

	// context.subscriptions.push(
	// 	vscode.commands.registerCommand('github1s.commands.startDraft', (reply: vscode.CommentReply) => {
	// 		const thread = reply.thread;
	// 		thread.contextValue = 'draft';
	// 		const newComment = new NoteComment(reply.text, vscode.CommentMode.Preview, { name: 'vscode' }, thread);
	// 		newComment.label = 'pending';
	// 		thread.comments = [...thread.comments, newComment];
	// 	})
	// );

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
			deleteNote(comment)

			thread.comments = thread.comments.filter((cmt) => (cmt as NoteComment).noteId !== comment.noteId);

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
				if ((cmt as NoteComment).noteId === comment.noteId) {
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
				if ((cmt as NoteComment).noteId === comment.noteId) {
					(cmt as NoteComment).savedBody = cmt.body;
					cmt.mode = vscode.CommentMode.Preview;
					modifyNote(comment)
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
				debugger
				if ((cmt as NoteComment).noteId === comment.noteId) {
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

		const scheme = adapterManager.getCurrentScheme();
		const { repo } = await router.getState();

		const query = queryString.parse(thread?.uri.query!);
						const dataSource = await adapterManager.getAdapter(scheme).resolveDataSource()
		const currentUser = await dataSource.getUserInfo()
	 const note = await	Repository.getInstance(scheme, repo).replyComment(query?.id, thread.comments[0].discussionId, reply.text );
	const newComment = new NoteComment(
			new vscode.MarkdownString(reply.text),
			vscode.CommentMode.Preview,
			{
				name: currentUser.name || currentUser.username,
				iconPath: vscode.Uri.parse(currentUser.avatar_url),
			},
			thread,
			thread.comments.length ? 'canDelete' : undefined,
			thread.comments[0].discussionId,
			note.id
		);
		debugger
		if (thread.contextValue === 'draft') {
			newComment.label = 'pending';
		}
		thread.comments = [...thread.comments, newComment];
	}

	async function modifyNote(comment: NoteComment) {
		const scheme = adapterManager.getCurrentScheme();
		const { repo } = await router.getState();

		const query = queryString.parse(comment.parent?.uri.query!);

		Repository.getInstance(scheme, repo).modifyComment(query?.id, comment.discussionId, comment.noteId, comment.body.value);
	}

	async function deleteNote(comment: NoteComment) {
		const scheme = adapterManager.getCurrentScheme();
		const { repo } = await router.getState();

		const query = queryString.parse(comment.parent?.uri.query!);

		Repository.getInstance(scheme, repo).deleteComment(query?.id, comment.discussionId, comment.noteId);
	}

	async function createNote(reply: vscode.CommentReply) {
		const thread = reply.thread;


		const scheme = adapterManager.getCurrentScheme();
		const { repo } = await router.getState();


		const query = queryString.parse(thread?.uri.query!);
		const baseUri = vscode.Uri.parse(query.base);
		const headUri = vscode.Uri.parse(query.head);
		const mrVersion = await Repository.getInstance(scheme, repo).getMrVersion(query?.id as string);

	 const newC = await	Repository.getInstance(scheme, repo).addComment(query?.id as string, reply.text, ({
			// 'position[base_sha]': '',
			// 'position[start_sha]': '',
			// 'position[head_sha]': '',
			// 'position[position_type]': 'text',
			// 'position[new_path]': newComment.parent?.uri.path,
			// 'position[old_path]': newComment.parent?.uri.path,
			// 'position[new_line]': thread.range.start.line,
			base_sha: mrVersion.base_commit_sha, // baseUri.authority.split('+').pop(),
			start_sha: mrVersion.start_commit_sha, // headUri.authority.split('+').pop(),
			head_sha: mrVersion.head_commit_sha, // headUri.authority.split('+').pop(),
			position_type: 'text', // text or image
			new_path: headUri.path.replace(/^\//, ''),
			old_path: headUri.path.replace(/^\//, ''),
			new_line: reply.thread.range.start.line + 1,
			// old_line: '',
		}));
				const dataSource = await adapterManager.getAdapter(scheme).resolveDataSource()
		const currentUser = await dataSource.getUserInfo()

		const newComment = new NoteComment(
			reply.text,
			vscode.CommentMode.Preview,
			{
				name: currentUser.name || currentUser.username,
				iconPath: vscode.Uri.parse(currentUser.avatar_url),
			},
			thread,
			thread.comments.length ? 'canDelete' : undefined,
			newC.id,
		);

		if (thread.contextValue === 'draft') {
			newComment.label = 'pending';
		}

		thread.comments = [...thread.comments, newComment];
	}

	async function renderComments(document: vscode.TextDocument) {
		const scheme = adapterManager.getCurrentScheme();
		const { repo } = await router.getState();
		const dataSource = await adapterManager.getAdapter(scheme).resolveDataSource()
		const currentUser = await dataSource.getUserInfo()

		const query = queryString.parse(document?.uri.query!);

		const list = await Repository.getInstance(scheme, repo).getComment(query?.id as string);
		console.log('###', list);
		const key = `${query?.id}-${document?.uri.path}`; // TODO 加上 commit hash
		if (commentMap.has(key)) {
			return;
		}
		commentMap.set(key, true);
		// debugger;
		list.forEach(({ id, notes }) => {
			let comments = notes.filter((note) => note.type === 'DiffNote');
			// comments = []

			if (comments.length) {
				if (`/${comments[0].position.new_path}` !== document?.uri.path) {
					return;
				}
				console.log('### document.uri', document.uri);
				const thread = commentController.createCommentThread(
					document.uri,
					new vscode.Range(
						new vscode.Position(comments[0].position.line_range?.start?.new_line ?? comments[0].position.new_line-1, 0),
						new vscode.Position(comments[0].position.line_range?.end?.new_line ?? comments[0].position.new_line-1, 0)
					),
					[]
				);
				thread.collapsibleState = comments.some((c) => c.resolved === false) ? 1 : 0;
				thread.comments = comments.map((comment) => {
					return new NoteComment(
						new vscode.MarkdownString(comment.body),
						vscode.CommentMode.Preview,
						{
							name: comment.author.name,
							iconPath: vscode.Uri.parse(comment.author.avatar_url),
						},
						thread,
						// TODO 当前用户
						comment.author.id === currentUser.id ? 'canDelete' : undefined,
						id,
						comment.id
					);
				});
			}
		});
	}
}
