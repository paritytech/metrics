# GitHub metrics

Get GitHub metrics for a repository or a user.

Supports obtaining metrics from:

- Pull Requests
- Issues

## To start

### Run from CLI

You need to create a [Personal Access Token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens) with the options:
- [ ] repo
  - [x] public_repo

If the repository is private you will need to enable the `repo` option.

Copy `example.env` as `.env` and replace the variables with your own.

> If you want to get a user's related metric, write their username in the `AUTHOR` field, if not, just leave it empty.
> You can get user metrics for more than one repository by filling the `REPO` field with the desired repos separated by a comma (`org/repo1,org/repo2,org/repo3`).

Run:

- `yarn install`
- `yarn run cli`

It will generate two files:
- `report.md`
- `index.html`

### Run as GitHub action

#### Run in this repository

You can use the workflow here: [![Fetch repository metrics](https://github.com/paritytech/metrics/actions/workflows/generate-repo-metrics.yml/badge.svg)](https://github.com/paritytech/metrics/actions/workflows/generate-repo-metrics.yml) <- click here

And select `Run workflow` to run the system in this repository.

After a couple of minutes, the [GitHub action summary](https://github.blog/2022-05-09-supercharging-github-actions-with-job-summaries/) will contain all the results.

You can also use the user metrics workflow here: [![Fetch user metrics](https://github.com/paritytech/metrics/actions/workflows/generate-user-metrics.yml/badge.svg)](https://github.com/paritytech/metrics/actions/workflows/generate-user-metrics.yml)
> You can get user metrics for more than one repository by filling the `REPO` field with the desired repos separated by a comma (`org/repo1,org/repo2,org/repo3`).

#### Install in your own repository

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
        name: Fetch metrics
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
- `repo`: Name of the repository to crawl in `owner/repo`.
  - **Optional**.
  - Default to the repository's name where this action is running.
- `author`: Username of the account to obtain metrics
  - **Optional**: Setting this will only get the user's metrics and not the repository's.

#### Outputs

In the [action's summary](https://github.blog/2022-05-09-supercharging-github-actions-with-job-summaries/), it will publish the markdown file, so be sure to see the `summary` (which is different than the logs).

It will also produce a file with the same content as the summary in a file named `report.md`. Be sure to use this file if you need it for rendering.

It will also output three variables:

- `repo`: The name of the repo in owner/repo pattern.
- `pr-report`: A JSON string with the metrics obtained from the repository PRs.
- `issue-report`: A JSON string with the metrics obtained from the repository issues.

### Publish metrics

The action produces a file `./index.html`. This file contains all the metrics.

You can deploy this site to GitHub pages if you want to have up to date metrics in a site.

```yml
steps:
  - uses: paritytech/metrics@generate-website
    name: Fetch metrics
    id: metric
    with:
      GITHUB_TOKEN: ${{ github.token }}
      owner: paritytech
      repo: metrics
  - name: Setup Pages
    uses: actions/configure-pages@v2
  - name: Upload artifact
    uses: actions/upload-pages-artifact@v1
    with:
      path: ./
  - name: Deploy to GitHub Pages
    id: deployment
    uses: actions/deploy-pages@v1
```
