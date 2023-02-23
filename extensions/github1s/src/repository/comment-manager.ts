/**
 * @file Comment Manager
 * @author netcon
 */

import { reuseable } from '@/helpers/func';
import { Comment } from '@/adapters/types';
import { adapterManager } from '@/adapters';

// manage changed files for a commit
export class CommentManager {
	private static instancesMap = new Map<string, CommentManager>();

	private _pageSize = 100;
	private _currentPage = 1; // page is begin from 1
	private _hasMore = true;
	private _commentsList: Comment[] | null = null;

	public static getInstance(scheme: string, repo: string) {
		const mapKey = `${scheme} ${repo}`;
		if (!CommentManager.instancesMap.has(mapKey)) {
			const manager = new CommentManager(scheme, repo);
			CommentManager.instancesMap.set(mapKey, manager);
		}
		return CommentManager.instancesMap.get(mapKey)!;
	}

	constructor(private _scheme: string, private _repo: string) {}

	getList = async (_iid: string, forceUpdate: boolean = false): Promise<Comment[]> => {
		if (forceUpdate || !this._commentsList) {
			this._currentPage = 1;
			this._commentsList = [];
			await this.loadMore(_iid);
		}
		return this._commentsList;
	};

	loadMore = async (id: string): Promise<Comment[]> => {
		const dataSource = await adapterManager.getAdapter(this._scheme).resolveDataSource();
		const comments = await dataSource.getMrComment(this._repo, id);
		if (!comments) {
			return [];
		}
		this._currentPage += 1;
		this._hasMore = comments.length === this._pageSize;
		(this._commentsList || (this._commentsList = [])).push(...comments);

		return comments;
	};

	hasMore = reuseable(async () => {
		return this._hasMore;
	});

	async setChangedFiles(files: Comment[]) {
		this._commentsList = files;
		this._hasMore = false;
	}
}
