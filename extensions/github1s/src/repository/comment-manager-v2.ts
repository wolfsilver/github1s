/**
 * @file Code Review Manager
 * @author netcon
 */

import { reuseable } from '@/helpers/func';
import { Comment } from '@/adapters/types';
import { adapterManager } from '@/adapters';

// manage changed files for a code review
class CodeReviewChangedFilesManager {
	private static instancesMap = new Map<string, CodeReviewChangedFilesManager>();

	private _pageSize = 100;
	private _currentPage = 1; // page is begin from 1
	private _hasMore = true;
	private _changedFilesList: Comment[] | null = null;

	public static getInstance(scheme: string, repo: string, codeReviewId: string) {
		const mapKey = `${scheme} ${repo} ${codeReviewId}`;
		if (!CodeReviewChangedFilesManager.instancesMap.has(mapKey)) {
			const manager = new CodeReviewChangedFilesManager(scheme, repo, codeReviewId);
			CodeReviewChangedFilesManager.instancesMap.set(mapKey, manager);
		}
		return CodeReviewChangedFilesManager.instancesMap.get(mapKey)!;
	}

	constructor(private _scheme: string, private _repo: string, private _codeReviewId: string) {}

	getList = reuseable(async (forceUpdate: boolean = false): Promise<Comment[]> => {
		if (forceUpdate || !this._changedFilesList) {
			this._currentPage = 1;
			this._changedFilesList = [];
			await this.loadMore();
		}
		return this._changedFilesList;
	});

	loadMore = reuseable(async (): Promise<Comment[]> => {
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

	async setChangedFiles(files: Comment[]) {
		this._changedFilesList = files;
		this._hasMore = false;
	}
}

export class CommentManager {
	private static instancesMap = new Map<string, CommentManager>();

	private _codeReviewMap = new Map<string, Comment>(); // codeReviewId -> Comment
	private _codeReviewList: Comment[] | null = null;
	private _pageSize = 100;
	private _currentPage = 1; // page number is begin from 1
	private _hasMore = true;

	public static getInstance(scheme: string, repo: string) {
		const mapKey = `${scheme} ${repo}`;
		if (!CommentManager.instancesMap.has(mapKey)) {
			CommentManager.instancesMap.set(mapKey, new CommentManager(scheme, repo));
		}
		return CommentManager.instancesMap.get(mapKey)!;
	}

	private constructor(private _scheme: string, private _repo: string) {}

	getList = reuseable(async (forceUpdate: boolean = false): Promise<Comment[]> => {
		if (forceUpdate || !this._codeReviewList) {
			this._currentPage = 1;
			this._codeReviewList = [];
			await this.loadMore();
		}
		return this._codeReviewList;
	});

	getItem = reuseable(async (codeReviewId: string, forceUpdate = false): Promise<Comment | null> => {
		if (forceUpdate || !this._codeReviewMap.has(codeReviewId)) {
			const dataSource = await adapterManager.getAdapter(this._scheme).resolveDataSource();
			const codeReview = await dataSource.getMrComment(this._repo, codeReviewId);
			codeReview && this._codeReviewMap.set(codeReviewId, codeReview);
			if (codeReview?.files) {
				const manager = CodeReviewChangedFilesManager.getInstance(this._scheme, this._repo, codeReviewId);
				manager.setChangedFiles(codeReview.files);
			}
		}
		return this._codeReviewMap.get(codeReviewId) || null;
	});

	loadMore = reuseable(async (): Promise<Comment[]> => {
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

	public getChangedFiles = reuseable(async (codeReviewId: string, forceUpdate: boolean = false): Promise<Comment[]> => {
		const manager = CodeReviewChangedFilesManager.getInstance(this._scheme, this._repo, codeReviewId);
		return manager.getList(forceUpdate);
	});

	public loadMoreChangedFiles = reuseable(async (codeReviewId: string) => {
		const manager = CodeReviewChangedFilesManager.getInstance(this._scheme, this._repo, codeReviewId);
		return manager.loadMore();
	});

	public hasMoreChangedFiles = reuseable((codeReviewId: string) => {
		const manager = CodeReviewChangedFilesManager.getInstance(this._scheme, this._repo, codeReviewId);
		return manager.hasMore();
	});
}
