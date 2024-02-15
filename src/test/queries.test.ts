import { validate } from "@octokit/graphql-schema";

import ISSUE_LIST_QUERY from "../github/queries/IssueList";
import PULL_REQUEST_LIST_QUERY from "../github/queries/PullRequestList";

describe("Validate Schemas", () => {
  test("PULL_REQUEST_LIST_QUERY", () => {
    expect(validate(PULL_REQUEST_LIST_QUERY)).toEqual([]);
  });

  test("ISSUE_LIST_QUERY", () => {
    expect(validate(ISSUE_LIST_QUERY)).toEqual([]);
  });
});
