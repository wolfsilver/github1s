/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ApolloQueryResult, FetchResult, MutationOptions, NetworkStatus, QueryOptions } from 'apollo-boost';
import * as vscode from 'vscode';
import { AuthenticationError, AuthProvider, GitHubServerType, isSamlError } from '../common/authentication';
import Logger from '../common/logger';
import { Protocol } from '../common/protocol';
import { GitHubRemote, parseRemote, Remote } from '../common/remote';
import { ITelemetry } from '../common/telemetry';
import { PRCommentControllerRegistry } from '../view/pullRequestCommentControllerRegistry';
import { OctokitCommon } from './common';
import { CredentialStore, GitHub } from './credentials';
import {
	AssignableUsersResponse,
	CreatePullRequestResponse,
	FileContentResponse,
	ForkDetailsResponse,
	GetChecksResponse,
	isCheckRun,
	IssuesResponse,
	IssuesSearchResponse,
	ListBranchesResponse,
	MaxIssueResponse,
	MentionableUsersResponse,
	MilestoneIssuesResponse,
	PullRequestParticipantsResponse,
	PullRequestResponse,
	PullRequestsResponse,
	ViewerPermissionResponse,
} from './graphql';
import {
	CheckState,
	IAccount,
	IMilestone,
	Issue,
	PullRequest,
	PullRequestChecks,
	RepoAccessAndMergeMethods,
} from './interface';
import { IssueModel } from './issueModel';
import { LoggingOctokit } from './loggingOctokit';
import { PullRequestModel } from './pullRequestModel';
import defaultSchema from './queries.gql';
import {
	convertRESTPullRequestToRawPullRequest,
	getAvatarWithEnterpriseFallback,
	getOverrideBranch,
	getPRFetchQuery,
	parseGraphQLIssue,
	parseGraphQLPullRequest,
	parseGraphQLViewerPermission,
	parseMilestone,
} from './utils';

export const PULL_REQUEST_PAGE_SIZE = 20;

const GRAPHQL_COMPONENT_ID = 'GraphQL';

export interface ItemsData {
	items: any[];
	hasMorePages: boolean;
}

export interface IssueData extends ItemsData {
	items: IssueModel[];
	hasMorePages: boolean;
}

export interface PullRequestData extends IssueData {
	items: PullRequestModel[];
}

export interface MilestoneData extends ItemsData {
	items: { milestone: IMilestone; issues: IssueModel[] }[];
	hasMorePages: boolean;
}

export interface IMetadata extends OctokitCommon.ReposGetResponseData {
	currentUser: any;
}

export class GitHubRepository implements vscode.Disposable {
	static ID = 'GitHubRepository';
	protected _initialized: boolean = false;
	protected _hub: GitHub | undefined;
	protected _metadata: IMetadata | undefined;
	private _toDispose: vscode.Disposable[] = [];
	public commentsController?: vscode.CommentController;
	public commentsHandler?: PRCommentControllerRegistry;
	private _pullRequestModels = new Map<number, PullRequestModel>();

	private _onDidAddPullRequest: vscode.EventEmitter<PullRequestModel> = new vscode.EventEmitter();
	public readonly onDidAddPullRequest: vscode.Event<PullRequestModel> = this._onDidAddPullRequest.event;

	public get hub(): GitHub {
		if (!this._hub) {
			if (!this._initialized) {
				throw new Error('Call ensure() before accessing this property.');
			} else {
				throw new AuthenticationError('Not authenticated.');
			}
		}
		return this._hub;
	}

	public equals(repo: GitHubRepository): boolean {
		return this.remote.equals(repo.remote);
	}

	get pullRequestModels(): Map<number, PullRequestModel> {
		return this._pullRequestModels;
	}

	public async ensureCommentsController(): Promise<void> {
		try {
			if (this.commentsController) {
				return;
			}

			await this.ensure();
			this.commentsController = vscode.comments.createCommentController(
				`github-browse-${this.remote.normalizedHost}`,
				`GitHub Pull Request for ${this.remote.normalizedHost}`
			);
			this.commentsHandler = new PRCommentControllerRegistry(this.commentsController);
			this._toDispose.push(this.commentsHandler);
			this._toDispose.push(this.commentsController);
		} catch (e) {
			console.log(e);
		}
	}

	dispose() {
		this._toDispose.forEach((d) => d.dispose());
		this._toDispose = [];
		this.commentsController = undefined;
		this.commentsHandler = undefined;
	}

	public get octokit(): LoggingOctokit {
		return this.hub && this.hub.octokit;
	}

	constructor(
		public remote: GitHubRemote,
		public readonly rootUri: vscode.Uri,
		private readonly _credentialStore: CredentialStore,
		private readonly _telemetry: ITelemetry
	) {
		// kick off the comments controller early so that the Comments view is visible and doesn't pop up later in an way that's jarring
		this.ensureCommentsController();
	}

	get authMatchesServer(): boolean {
		if (
			this.remote.githubServerType === GitHubServerType.GitHubDotCom &&
			this._credentialStore.isAuthenticated(AuthProvider.github)
		) {
			return true;
		} else if (
			this.remote.githubServerType === GitHubServerType.Enterprise &&
			this._credentialStore.isAuthenticated(AuthProvider['github-enterprise'])
		) {
			return true;
		} else {
			// Not good. We have a mismatch between auth type and server type.
			return false;
		}
	}

	query = async <T>(query: QueryOptions, ignoreSamlErrors: boolean = false): Promise<ApolloQueryResult<T>> => {
		const gql = this.authMatchesServer && this.hub && this.hub.graphql;
		if (!gql) {
			Logger.debug(`Not available for query: ${query}`, GRAPHQL_COMPONENT_ID);
			return {
				data: null,
				loading: false,
				networkStatus: NetworkStatus.error,
				stale: false,
			} as any;
		}

		let rsp;
		try {
			rsp = await gql.query<T>(query);
		} catch (e) {
			// Some queries just result in SAML errors, and some queries we may not want to retry because it will be too disruptive.
			if (
				!ignoreSamlErrors &&
				e.message?.startsWith('GraphQL error: Resource protected by organization SAML enforcement.')
			) {
				await this._credentialStore.recreate();
				rsp = await gql.query<T>(query);
			} else {
				throw e;
			}
		}
		return rsp;
	};

	mutate = async <T>(mutation: MutationOptions<T>): Promise<FetchResult<T>> => {
		const gql = this.authMatchesServer && this.hub && this.hub.graphql;
		if (!gql) {
			Logger.debug(`Not available for query: ${mutation}`, GRAPHQL_COMPONENT_ID);
			return {
				data: null,
				loading: false,
				networkStatus: NetworkStatus.error,
				stale: false,
			} as any;
		}

		const rsp = await gql.mutate<T>(mutation);
		return rsp;
	};

	get schema() {
		return defaultSchema as any;
	}

	async getMetadata(): Promise<IMetadata> {
		Logger.debug(`Fetch metadata - enter`, GitHubRepository.ID);
		if (this._metadata) {
			Logger.debug(`Fetch metadata ${this._metadata.owner?.login}/${this._metadata.name} - done`, GitHubRepository.ID);
			return this._metadata;
		}
		const { octokit, remote } = await this.ensure();
		const result = await octokit.call(octokit.api.repos.get, {
			owner: remote.owner,
			repo: remote.repositoryName,
		});
		Logger.debug(`Fetch metadata ${remote.owner}/${remote.repositoryName} - done`, GitHubRepository.ID);
		this._metadata = { ...result.data, currentUser: (octokit as any).currentUser } as unknown as IMetadata;
		return this._metadata;
	}

	/**
	 * Resolves remotes with redirects.
	 * @returns
	 */
	async resolveRemote(): Promise<boolean> {
		try {
			const { clone_url } = await this.getMetadata();
			this.remote = GitHubRemote.remoteAsGitHub(
				parseRemote(this.remote.remoteName, clone_url, this.remote.gitProtocol)!,
				this.remote.githubServerType
			);
		} catch (e) {
			Logger.appendLine(`Unable to resolve remote: ${e}`);
			if (isSamlError(e)) {
				return false;
			}
		}
		return true;
	}

	async ensure(): Promise<GitHubRepository> {
		this._initialized = true;

		if (!this._credentialStore.isAuthenticated(this.remote.authProviderId)) {
			// We need auth now. (ex., a PR is already checked out)
			// We can no longer wait until later for login to be done
			await this._credentialStore.create();
			if (!this._credentialStore.isAuthenticated(this.remote.authProviderId)) {
				this._hub = await this._credentialStore.showSignInNotification(this.remote.authProviderId);
			}
		} else {
			this._hub = this._credentialStore.getHub(this.remote.authProviderId);
		}

		return this;
	}

	async getAllPullRequests(page?: number): Promise<PullRequestData | undefined> {
		try {
			Logger.debug(`Fetch all pull requests - enter`, GitHubRepository.ID);
			const { octokit, remote } = await this.ensure();
			const result = await octokit.call(octokit.api.pulls.list, {
				owner: remote.owner,
				repo: remote.repositoryName,
				per_page: PULL_REQUEST_PAGE_SIZE,
				page: page || 1,
			});

			const hasMorePages = !!result.headers.link && result.headers.link.indexOf('rel="next"') > -1;
			if (!result.data) {
				// We really don't expect this to happen, but it seems to (see #574).
				// Log a warning and return an empty set.
				Logger.appendLine(
					`Warning: no result data for ${remote.owner}/${remote.repositoryName} Status: ${result.status}`
				);
				return {
					items: [],
					hasMorePages: false,
				};
			}

			const pullRequests = result.data
				.map((pullRequest) => {
					if (!pullRequest.head.repo) {
						Logger.appendLine('GitHubRepository> The remote branch for this PR was already deleted.');
						return null;
					}

					return this.createOrUpdatePullRequestModel(convertRESTPullRequestToRawPullRequest(pullRequest, this));
				})
				.filter((item) => item !== null) as PullRequestModel[];

			Logger.debug(`Fetch all pull requests - done`, GitHubRepository.ID);
			return {
				items: pullRequests,
				hasMorePages,
			};
		} catch (e) {
			Logger.appendLine(`Fetching all pull requests failed: ${e}`, GitHubRepository.ID);
			if (e.code === 404) {
				// not found
				vscode.window.showWarningMessage(
					`Fetching pull requests for remote '${this.remote.remoteName}' failed, please check if the url ${this.remote.url} is valid.`
				);
			} else {
				throw e;
			}
		}
		return undefined;
	}

	async getLines(sha: string, file: string, lineStart: number, lineEnd: number): Promise<string | undefined> {
		Logger.debug(`Fetch milestones - enter`, GitHubRepository.ID);
		const { query, remote, schema } = await this.ensure();
		const { data } = await query<FileContentResponse>({
			query: schema.GetFileContent,
			variables: {
				owner: remote.owner,
				name: remote.repositoryName,
				expression: `${sha}:${file}`,
			},
		});

		if (!data.repository.object.text) {
			return undefined;
		}

		return data.repository.object.text
			.split('\n')
			.slice(lineStart - 1, lineEnd)
			.join('\n');
	}
}
