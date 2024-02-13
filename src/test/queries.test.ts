import { validate } from "@octokit/graphql-schema";

import PULL_REQUEST_LIST_QUERY from "../github/PullRequestList";

describe("Validate Schemas", () => {
  test("PULL_REQUEST_LIST_QUERY", () => {
    expect(validate(PULL_REQUEST_LIST_QUERY)).toEqual([]);
  });
});
