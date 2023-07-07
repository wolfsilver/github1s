/**
 * @file Code Review Manager
 * @author netcon
 */
import * as vscode from 'vscode';
import { reuseable } from '@/helpers/func';
import { ChangedFile, Comment, CodeReview } from '@/adapters/types';
import { adapterManager } from '@/adapters';
import { GitHub1sCommentDecorationProvider } from '@/providers/decorations/comment';

// manage changed files for a code review
class CodeReviewChangedFilesManager {
	private static instancesMap = new Map<string, CodeReviewChangedFilesManager>();

	private _pageSize = 100;
	private _currentPage = 1; // page is begin from 1
	private _hasMore = true;
	private _changedFilesList: ChangedFile[] | null = null;

	public static getInstance(scheme: string, repo: string, codeReviewId: string) {
		const mapKey = `${scheme} ${repo} ${codeReviewId}`;
		if (!CodeReviewChangedFilesManager.instancesMap.has(mapKey)) {
			const manager = new CodeReviewChangedFilesManager(scheme, repo, codeReviewId);
			CodeReviewChangedFilesManager.instancesMap.set(mapKey, manager);
		}
		return CodeReviewChangedFilesManager.instancesMap.get(mapKey)!;
	}

	constructor(private _scheme: string, private _repo: string, private _codeReviewId: string) {}

	getList = reuseable(async (forceUpdate: boolean = false): Promise<ChangedFile[]> => {
		if (forceUpdate || !this._changedFilesList) {
			this._currentPage = 1;
			this._changedFilesList = [];
			await this.loadMore();
		}
		return this._changedFilesList;
	});

	loadMore = reuseable(async (): Promise<ChangedFile[]> => {
		const dataSource = await adapterManager.getAdapter(this._scheme).resolveDataSource();
		const changedFiles = await dataSource.provideCodeReviewChangedFiles(this._repo, this._codeReviewId, {
			pageSize: this._pageSize,
			page: this._currentPage,
		});

		this._currentPage += 1;
		this._hasMore = changedFiles.length === this._pageSize;
		(this._changedFilesList || (this._changedFilesList = [])).push(...changedFiles);

		return changedFiles;
	});

	hasMore = reuseable(async () => {
		return this._hasMore;
	});

	async setChangedFiles(files: ChangedFile[]) {
		this._changedFilesList = files;
		this._hasMore = false;
	}
}

// comment manage
export class CommentManager {
	private static instancesMap = new Map<string, CommentManager>();

	private _pageSize = 100;
	private _currentPage = 1; // page is begin from 1
	private _hasMore = true;
	private _commentsList: Comment[] | null = null;

	public static getInstance(scheme: string, repo: string, codeReviewId: string) {
		const mapKey = `${scheme} ${repo} ${codeReviewId}`;
		if (!CommentManager.instancesMap.has(mapKey)) {
			const manager = new CommentManager(scheme, repo, codeReviewId);
			CommentManager.instancesMap.set(mapKey, manager);
		}
		return CommentManager.instancesMap.get(mapKey)!;
	}

	constructor(private _scheme: string, private _repo: string, private _codeReviewId: string) {}

	getList = reuseable(async (forceUpdate: boolean = false): Promise<Comment[]> => {
		if (forceUpdate || !this._commentsList) {
			this._currentPage = 1;
			this._commentsList = [];
			await this.loadMore();
		}
		return this._commentsList;
	});

	fileHasComments = (notes) => {
		const decorated = GitHub1sCommentDecorationProvider.getInstance();
		const [note] = notes;
		if (note?.position) {
			const isNewFile = !!note.position.new_line;
			decorated.updateFileComments(
				undefined,
				this._codeReviewId,
				`/${isNewFile ? note.position.new_path : note.position.old_path}`,
				true
			);
		}
	};

	loadMore = reuseable(async (): Promise<Comment[]> => {
		const dataSource = await adapterManager.getAdapter(this._scheme).resolveDataSource();
		const comments = await dataSource.getMrComment(this._repo, this._codeReviewId, {
			pageSize: this._pageSize,
			page: this._currentPage,
		});
		if (!comments) {
			return [];
		}
		this._currentPage += 1;
		this._hasMore = comments.length === this._pageSize;
		(this._commentsList || (this._commentsList = [])).push(...comments);
		comments.forEach((note) => {
			this.fileHasComments(note.notes);
		});

		return comments;
	});

	hasMore = reuseable(async () => {
		return this._hasMore;
	});

	async getComment() {
		return this._commentsList;
	}

	async getMrVersion() {
		const dataSource = await adapterManager.getAdapter(this._scheme).resolveDataSource();
		const res = await dataSource.getMrVersion(this._repo, this._codeReviewId);
		return res;
	}

	async addComment(id, body: string, position) {
		const dataSource = await adapterManager.getAdapter(this._scheme).resolveDataSource();
		const res = await dataSource.createComment(this._repo, this._codeReviewId, body, position);
		return res;
	}
	async replyComment(noteId, body: string | vscode.MarkdownString) {
		const dataSource = await adapterManager.getAdapter(this._scheme).resolveDataSource();
		const res = await dataSource.replyComment(this._repo, this._codeReviewId, noteId, body);
		return res;
	}

	async modifyComment(discussionId: number, noteId: number, body: string) {
		const dataSource = await adapterManager.getAdapter(this._scheme).resolveDataSource();
		const res = await dataSource.modifyComment(this._repo, this._codeReviewId,discussionId, noteId, body);
		return res;
	}

	async deleteComment(discussionId: number, noteId: number) {
		const dataSource = await adapterManager.getAdapter(this._scheme).resolveDataSource();
		const res = await dataSource.deleteComment(this._repo, this._codeReviewId, discussionId, noteId);
		return res;
	}
}

export class CodeReviewManager {
	private static instancesMap = new Map<string, CodeReviewManager>();

	private _codeReviewMap = new Map<string, CodeReview>(); // codeReviewId -> CodeReview
	private _codeReviewList: CodeReview[] | null = null;
	private _pageSize = 100;
	private _currentPage = 1; // page number is begin from 1
	private _hasMore = true;

	public static getInstance(scheme: string, repo: string) {
		const mapKey = `${scheme} ${repo}`;
		if (!CodeReviewManager.instancesMap.has(mapKey)) {
			CodeReviewManager.instancesMap.set(mapKey, new CodeReviewManager(scheme, repo));
		}
		return CodeReviewManager.instancesMap.get(mapKey)!;
	}

	private constructor(private _scheme: string, private _repo: string) {}

	getList = reuseable(async (forceUpdate: boolean = false): Promise<CodeReview[]> => {
		if (forceUpdate || !this._codeReviewList) {
			this._currentPage = 1;
			this._codeReviewList = [];
			await this.loadMore();
		}
		return this._codeReviewList;
	});

	getItem = reuseable(async (codeReviewId: string, forceUpdate = false): Promise<CodeReview | null> => {
		if (forceUpdate || !this._codeReviewMap.has(codeReviewId)) {
			const dataSource = await adapterManager.getAdapter(this._scheme).resolveDataSource();
			const codeReview = await dataSource.provideCodeReview(this._repo, codeReviewId);
			codeReview && this._codeReviewMap.set(codeReviewId, codeReview);
			if (codeReview?.files) {
				const manager = CodeReviewChangedFilesManager.getInstance(this._scheme, this._repo, codeReviewId);
				manager.setChangedFiles(codeReview.files);
			}
		}
		return this._codeReviewMap.get(codeReviewId) || null;
	});

	loadMore = reuseable(async (): Promise<CodeReview[]> => {
		const dataSource = await adapterManager.getAdapter(this._scheme).resolveDataSource();
		const queryOptions = { pageSize: this._pageSize, page: this._currentPage };
		const codeReviews = await dataSource.provideCodeReviews(this._repo, queryOptions);

		codeReviews.forEach((codeReview) => {
			this._codeReviewMap.set(codeReview.id, codeReview);
			// directly set changed files if they are in response
			if (codeReview.files) {
				const manager = CodeReviewChangedFilesManager.getInstance(this._scheme, this._repo, codeReview.id);
				manager.setChangedFiles(codeReview.files);
			}
		});
		this._currentPage += 1;
		this._hasMore = codeReviews.length === this._pageSize;
		(this._codeReviewList || (this._codeReviewList = [])).push(...codeReviews);

		return codeReviews;
	});

	hasMore = reuseable(async () => {
		return this._hasMore;
	});

	public getChangedFiles = reuseable(
		async (codeReviewId: string, forceUpdate: boolean = false): Promise<ChangedFile[]> => {
			// debugger;
			// comment
			const comments = CommentManager.getInstance(this._scheme, this._repo, codeReviewId);
			comments.getList();

			const manager = CodeReviewChangedFilesManager.getInstance(this._scheme, this._repo, codeReviewId);
			return manager.getList(forceUpdate);
		}
	);

	public loadMoreChangedFiles = reuseable(async (codeReviewId: string) => {
		const manager = CodeReviewChangedFilesManager.getInstance(this._scheme, this._repo, codeReviewId);
		return manager.loadMore();
	});

	public hasMoreChangedFiles = reuseable((codeReviewId: string) => {
		const manager = CodeReviewChangedFilesManager.getInstance(this._scheme, this._repo, codeReviewId);
		return manager.hasMore();
	});

	public getComment = async (codeReviewId: string) => {
		const comments = CommentManager.getInstance(this._scheme, this._repo, codeReviewId);
		return comments.getList();
	};
	public getMrVersion = async (codeReviewId: string) => {
		const comments = CommentManager.getInstance(this._scheme, this._repo, codeReviewId);
		return comments.getMrVersion();
	};
	public addComment = async (codeReviewId: string, body: string, position) => {
		const comments = CommentManager.getInstance(this._scheme, this._repo, codeReviewId);
		return comments.addComment(codeReviewId, body, position);
	};
	public replyComment = async (codeReviewId: string, noteId: number, body: string | vscode.MarkdownString) => {
		const comments = CommentManager.getInstance(this._scheme, this._repo, codeReviewId);
		return comments.replyComment(noteId, body);
	};
	public modifyComment = async (codeReviewId: string, discussionId: number, noteId: number, body: string) => {
		const comments = CommentManager.getInstance(this._scheme, this._repo, codeReviewId);
		comments.modifyComment(discussionId, noteId, body);
	};

	public deleteComment = async (codeReviewId: string, discussionId: number, noteId: number) => {
		const comments = CommentManager.getInstance(this._scheme, this._repo, codeReviewId);
		comments.deleteComment(discussionId, noteId);
	};
}
