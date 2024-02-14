# GitHub metrics

Get GitHub metrics for a repository.

Supports obtaining metrics from:

- Pull Requests

## To start

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

## Inputs

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
