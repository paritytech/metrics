# GitHub metrics

Get GitHub metrics for a repository.

Supports obtaining metrics from:

- Pull Requests

## To start

### Run from CLI

Copy `example.env` as `.env` and replace the variables with your own.

Run:

- `yarn install`
- `yarn run cli`

It will generate a file named `report.md` as the output.

### Run as GitHub action

Install this action in your repository:

```yml
name: Fetch metrics

on:
  workflow_dispatch:
  schedule:
    - cron: "0 12 1 * *"

jobs:
  get_metrics:
    runs-on: ubuntu-latest
    name: Get repository metrics
    steps:
      - uses: paritytech/metrics@main
        name: Fetch polkadot-fellows/runtimes metrics
        with:
          GITHUB_TOKEN: ${{ github.token }}
          owner: paritytech
          repo: metrics
```

#### Inputs

- `GITHUB_TOKEN`: Token to access the repo.
  - If the repo is public, or is the same repo where the action is being executed, you can use `${{ github.token }}`
  - If the repo is big (more than 700 PRs), or it is a different private repo you need to use a [Personal Access Token](https://github.com/settings/tokens) with `public_repo` enabled.
    - This is required because the action's token will hit it's limit before finishing crawling the repository data.
- `owner`: Name of the owner of the repository.
  - **Optional**.
  - Defaults to the owner/organization who is running the action.
- `repo`: Name of the repository to crawl.
  - **Optional**.
  - Default to the repository's name where this action is running.

#### Outputs

In the [action's summary](https://github.blog/2022-05-09-supercharging-github-actions-with-job-summaries/), it will publish the markdown file, so be sure to see the `summary` (which is different than the logs).
