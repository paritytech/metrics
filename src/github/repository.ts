import { PullRequest } from "@octokit/webhooks-types";

import { ActionLogger, GitHubClient } from "./types";

/** API class that uses the default token to access the data from the pull request and the repository */
export class RepositoryApi {
    constructor(
        private readonly api: GitHubClient,
        private readonly logger: ActionLogger,
        private readonly repo: { owner: string, repo: string }
    ) { }

    async getPullRequests() {
        const pullRequests = await this.api.paginate(this.api.rest.pulls.list,{...this.repo, state: "all", });
        console.log(pullRequests);
        return pullRequests;
    }
}
