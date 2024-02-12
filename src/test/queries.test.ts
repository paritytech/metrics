import { validate } from "@octokit/graphql-schema";
import { PullRequestListGQL, PullRequestNode } from "../github/types";
import { PULL_REQUEST_LIST_QUERY } from "../github/repository";
describe("Validate Schemas", () => {
  test("PULL_REQUEST_LIST_QUERY", () => {
    expect(validate(PULL_REQUEST_LIST_QUERY)).toEqual([]);
  });
});
